// BE-008 — node:test: write scope + session audit ด้วย path claim (DES-006/021)
// ครอบ AC-007 (นอก allow) · AC-043 (สอง session ไม่ชน → attribution ถูก) · AC-052 (reviewer แตะ codeRoots) ·
// AC-060 (test-planner แตะ qa\/codeRoots) · AC-073 (Status column) · AC-066 (snapshot รอด restart) ·
// journal ของ orchestrator (BE-022) ไม่เป็น violation · fixture ทั้งหมดใน os.tmpdir — git ใน test เป็น
// read-only (--no-index) หรือ stub เท่านั้น ไม่แตะ repo จริง
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import type { Role } from "../src/core/state-store.ts";
import {
  ClaimError,
  SessionAuditError,
  claimsOverlap,
  defaultGitRunner,
  finishSessionAudit,
  resolveClaim,
  startSessionAudit,
  universalDenyReason,
  type AuditOptions,
  type AuditRoot,
  type DenyPaths,
  type GitRunner,
  type PatternScope,
} from "../src/core/session-audit.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be008-"));
const home = path.join(tmp, "home"); // orchestrator home — universal deny (DES-006)
const docsRoot = path.join(tmp, "docs");
const codeRoot = path.join(tmp, "code");
const packRoot = path.join(tmp, "pack");
const MODULE = "agent-team";
const IGNORE = ["node_modules/**", ".git/**"];
const LAYOUT = "split" as const;

const PLAN_REL = path.join(MODULE, "plan", "index.md");
const planPath = (): string => path.join(docsRoot, PLAN_REL);

const ROOTS: AuditRoot[] = [
  { rootKind: "knowledge", name: "knowledge", path: docsRoot, auditMode: "manifest", repoTop: null },
  { rootKind: "target", name: "target", path: codeRoot, auditMode: "manifest", repoTop: null },
];
const SCOPE: PatternScope = { docsRoot, codeRoots: [codeRoot], packRoot, module: MODULE, docsLayout: LAYOUT };
const DENY_PATHS: DenyPaths = { orchestratorHome: home, staConfigPath: path.resolve(home, "..", "sta-config.json") };

// allow ตรงตาม routing.yaml (DES-006)
const ENGINEER_ALLOW = ["codeRoots/**"];
const REVIEWER_ALLOW = ["knowledge/<module>/review/**"];
const TESTPLANNER_ALLOW = ["knowledge/<module>/test-plan/**"];
const QA_ALLOW = ["knowledge/<module>/qa/**", "knowledge/<module>/plan/index.md"];
const PM_ALLOW = ["knowledge/<module>/plan/**"];

let seq = 0;
const nextSid = (): string => `s-${++seq}-be08`;

interface Opts extends Omit<AuditOptions, "role" | "allow" | "deny"> {
  role: Role;
  allow: string[];
  deny: string[];
}

function opts(sid: string, claim: string[], allow: string[], role: Role, over: Partial<Opts> = {}): Opts {
  return {
    home,
    runId: "r-20261006-0000-be08",
    sessionId: sid,
    roots: ROOTS,
    docsRoot,
    docsLayout: LAYOUT,
    module: MODULE,
    packRoot,
    claim,
    manifestIgnore: IGNORE,
    preimageMaxMB: 50,
    role,
    allow,
    deny: [],
    ...over,
  };
}

// ตาราง Tasks รูป v2 ตรง header ที่ BE-018 parse ได้ — Status เป็นคอลัมน์สุดท้าย
const planText = (rows: string[]): string =>
  `# plan\n\n## Tasks\n\n| Task | Name | Owner | Phase | Depends | Status |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
const PENDING = "| BE-001 | config store | backend-engineer | p1 | - | pending |";

function writeRepo(files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(tmp, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

// เดินไฟล์จริงของ fixture — stub ใช้แทน `git ls-files -co --exclude-standard` (ไม่เรียก git จริง)
const fakeLs = (root: string): string[] => {
  const out: string[] = [];
  const walk = (rel: string): void => {
    const abs = rel === "" ? root : path.join(root, rel);
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const r = rel === "" ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) walk(r);
      else if (e.isFile()) out.push(r);
    }
  };
  walk("");
  return out.sort();
};

// --- resolveClaim (DES-021 ข้อ 1) ---

test("resolveClaim: ไม่ระบุ Write paths → claim = allow ของ role (role-allow)", () => {
  for (const allow of [ENGINEER_ALLOW, REVIEWER_ALLOW, QA_ALLOW]) {
    const r = resolveClaim({ writePaths: null, allow, deny: [], scope: SCOPE, denyPaths: DENY_PATHS });
    assert.deepEqual(r.claim, allow);
    assert.equal(r.basis, "role-allow");
  }
  const r2 = resolveClaim({ writePaths: [], allow: PM_ALLOW, deny: [], scope: SCOPE, denyPaths: DENY_PATHS });
  assert.equal(r2.basis, "role-allow");
});

test("resolveClaim: Write paths ใต้ allow → task-write-paths · นอก allow/`..`/absolute/glob นอกรูป → ClaimError (plan-error)", () => {
  const ok = resolveClaim({
    writePaths: ["agent-team/src/core/session-audit.ts", "agent-team/test/session-audit.test.ts"],
    allow: ENGINEER_ALLOW,
    deny: [],
    scope: SCOPE,
    denyPaths: DENY_PATHS,
  });
  assert.equal(ok.basis, "task-write-paths");
  assert.deepEqual(ok.claim, ["agent-team/src/core/session-audit.ts", "agent-team/test/session-audit.test.ts"]);

  // ตรงกับ task file ของ BE-008 — claim สัมพัทธ์รากที่ PM เสนอ (base ใด resolve ใต้ allow ได้ = ผ่าน)
  assert.equal(
    resolveClaim({ writePaths: ["agent-team/**"], allow: ENGINEER_ALLOW, deny: [], scope: SCOPE, denyPaths: DENY_PATHS }).basis,
    "task-write-paths",
  );

  for (const bad of [
    "code/secret.ts", // reviewer ไม่มีสิทธิ์ code
    "../outside.ts", // traversal
    path.resolve(codeRoot, "abs.ts"), // absolute
    "a/*/b.ts", // glob นอกสองรูปที่รับ
    "src/**/x.ts", // ** กลาง path
    "**", // ไม่มี dir
  ]) {
    assert.throws(
      () => resolveClaim({ writePaths: [bad], allow: bad === "code/secret.ts" ? REVIEWER_ALLOW : ENGINEER_ALLOW, deny: [], scope: SCOPE, denyPaths: DENY_PATHS }),
      ClaimError,
      bad,
    );
  }
});

test("resolveClaim: claim ที่ resolve ได้เพียงที่ติด universal deny → ClaimError · allow รูปไม่รู้จัก → SessionAuditError (fail-closed)", () => {
  // packRoot ใน orchestrator home (misconfig) + allow <packRoot>/** — ไม่มี candidate ที่สะอาด → plan-error
  const scopeInHome: PatternScope = { ...SCOPE, packRoot: path.join(home, "pack"), codeRoots: [] };
  assert.throws(
    () => resolveClaim({ writePaths: ["x.md"], allow: ["<packRoot>/**"], deny: [], scope: scopeInHome, denyPaths: DENY_PATHS }),
    ClaimError,
  );
  // claim = allow (role-allow) ก็ตรวจรูป allow — รูปแปลกต้องแตกก่อนใช้
  assert.throws(
    () => resolveClaim({ writePaths: null, allow: ["weird/**"], deny: [], scope: SCOPE, denyPaths: DENY_PATHS }),
    SessionAuditError,
  );
});

// --- overlap แบบ prefix (DES-021 ข้อ 2 — ให้ scheduler BE-011) ---

test("claimsOverlap: prefix ทั้งสองทาง/เท่ากัน/ไฟล์ใน dir ชน · พี่น้องไม่ชน", () => {
  assert.equal(claimsOverlap(["mod-a/**"], ["mod-b/**"]), false);
  assert.equal(claimsOverlap(["mod-a/**"], ["mod-a/1.txt"]), true);
  assert.equal(claimsOverlap(["mod-a/1.txt"], ["mod-a/**"]), true);
  assert.equal(claimsOverlap(["mod-a/1.txt"], ["mod-a/1.txt"]), true);
  assert.equal(claimsOverlap(["mod-a/**"], ["mod-a2/**"]), false); // prefix ต้องตัดที่ segment
  assert.equal(claimsOverlap(["src/core/x.ts"], ["src"]), true);
  assert.equal(claimsOverlap([], ["mod-a/**"]), false);
});

// --- attribution (DES-021 ข้อ 4) + diff (ข้อ 6) ---

test("AC-043: สอง session claim ไม่ชนเขียนพร้อมกัน → attribution ถูก (ไฟล์ของอีก session ข้าม)", () => {
  writeRepo({ "code/mod-a/keep.txt": "a\n", "code/mod-b/keep.txt": "b\n" });
  const sidA = nextSid();
  const sidB = nextSid();
  const claimA = ["mod-a/**"];
  const claimB = ["mod-b/**"];
  assert.equal(claimsOverlap(claimA, claimB), false); // scheduler เริ่มคู่นี้พร้อมกันได้
  startSessionAudit(opts(sidA, claimA, ENGINEER_ALLOW, "backend-engineer"));
  startSessionAudit(opts(sidB, claimB, ENGINEER_ALLOW, "frontend-engineer"));
  writeFileSync(path.join(codeRoot, "mod-a", "1.txt"), "1\n"); // ของ A
  writeFileSync(path.join(codeRoot, "mod-b", "2.txt"), "2\n"); // ของ B
  const ra = finishSessionAudit({ ...opts(sidA, claimA, ENGINEER_ALLOW, "backend-engineer"), activeSessions: [{ sessionId: sidB, claim: claimB }] });
  const rb = finishSessionAudit({ ...opts(sidB, claimB, ENGINEER_ALLOW, "frontend-engineer"), activeSessions: [{ sessionId: sidA, claim: claimA }] });
  assert.deepEqual(ra.writeAudit.touchedFiles, [path.join(codeRoot, "mod-a", "1.txt")]);
  assert.deepEqual(rb.writeAudit.touchedFiles, [path.join(codeRoot, "mod-b", "2.txt")]);
  assert.deepEqual(ra.writeAudit.violations, []);
  assert.deepEqual(rb.writeAudit.violations, []);
  assert.deepEqual(ra.writeAudit.changed.sort(), [path.join(codeRoot, "mod-a", "1.txt"), path.join(codeRoot, "mod-b", "2.txt")]);
  assert.deepEqual(ra.writeAudit.gitRefs, []);
});

test("นอก claim ใน allow → unclaimed-write + suspects รวมตัวเอง · diff.patch มี numstat (git --no-index จริง read-only) + approx", () => {
  writeRepo({ "code/agent-team/src/a.ts": "a\n" });
  const sid = nextSid();
  const claim = ["agent-team/src/**"];
  startSessionAudit(opts(sid, claim, ENGINEER_ALLOW, "backend-engineer"));
  writeFileSync(path.join(codeRoot, "agent-team", "src", "a.ts"), "a\nb\n"); // ใต้ claim
  writeFileSync(path.join(codeRoot, "stray.ts"), "s\n"); // ใต้ allow แต่นอก claim
  const res = finishSessionAudit(opts(sid, claim, ENGINEER_ALLOW, "backend-engineer"));
  assert.deepEqual(res.writeAudit.touchedFiles, [path.join(codeRoot, "agent-team", "src", "a.ts")]);
  assert.equal(res.writeAudit.violations.length, 1);
  const v = res.writeAudit.violations[0]!;
  assert.equal(v.kind, "unclaimed-write");
  assert.equal(v.path, path.join(codeRoot, "stray.ts"));
  assert.deepEqual(v.suspects, [sid]); // session นี้เป็น suspect เอง (fail-closed)
  // diff.patch — ไฟล์ที่มี pre-image ได้ numstat จาก git จริง (read-only) · ไฟล์เกิดใหม่ไม่มี pre-image → approx
  const patch = readFileSync(path.join(home, "state", "runs", "r-20261006-0000-be08", "sessions", sid, "diff.patch"), "utf8");
  // --no-index จริง: คอลัมน์ path เป็นรูป "old" => "new" — ตัวเลข 2 คอลัมน์แรกคือขนาดที่ BE-021 ใช้
  assert.match(patch, /^1\t0\t.+a\.ts/m);
  assert.match(patch, /# approx: .*stray\.ts/);
  assert.equal(res.writeAudit.diffApprox, true);
});

test("AC-007/AC-052: reviewer แตะ codeRoots → violation kind write + suspects", () => {
  const sid = nextSid();
  startSessionAudit(opts(sid, REVIEWER_ALLOW, REVIEWER_ALLOW, "reviewer"));
  writeFileSync(path.join(codeRoot, "agent-team", "src", "hack.ts"), "h\n");
  const res = finishSessionAudit(opts(sid, REVIEWER_ALLOW, REVIEWER_ALLOW, "reviewer"));
  assert.deepEqual(res.writeAudit.touchedFiles, []);
  assert.equal(res.writeAudit.violations.length, 1);
  const v = res.writeAudit.violations[0]!;
  assert.equal(v.kind, "write");
  assert.match(v.detail, /นอก writeScope\.allow/);
  assert.equal(v.path, path.join(codeRoot, "agent-team", "src", "hack.ts"));
  assert.deepEqual(v.suspects, [sid]);
});

test("AC-060: test-planner แตะ qa\\ และ codeRoots → violation ทั้งสอง path", () => {
  const sid = nextSid();
  startSessionAudit(opts(sid, TESTPLANNER_ALLOW, TESTPLANNER_ALLOW, "test-planner"));
  writeRepo({ "docs/agent-team/qa/round-1.md": "qa\n" });
  writeFileSync(path.join(codeRoot, "tp.ts"), "t\n");
  const res = finishSessionAudit(opts(sid, TESTPLANNER_ALLOW, TESTPLANNER_ALLOW, "test-planner"));
  assert.equal(res.writeAudit.violations.length, 2);
  assert.ok(res.writeAudit.violations.every((v) => v.kind === "write"));
  assert.deepEqual(
    res.writeAudit.violations.map((v) => v.path).sort(),
    [path.join(codeRoot, "tp.ts"), path.join(docsRoot, MODULE, "qa", "round-1.md")], // sort แบบ lexicographic — code < docs
  );
});

test("universal deny: ไฟล์ใต้ orchestrator home → kind write (ไม่มีข้อยกเว้น — risk #14) · เหตุผลระบุ path", () => {
  const workRoot = path.join(home, "work"); // ราก target ที่ทับ orchestrator home (ต้องห้าม — DES-006)
  const roots: AuditRoot[] = [
    { rootKind: "knowledge", name: "knowledge", path: docsRoot, auditMode: "manifest", repoTop: null },
    { rootKind: "target", name: "t", path: workRoot, auditMode: "manifest", repoTop: null },
  ];
  mkdirSync(workRoot, { recursive: true });
  const sid = nextSid();
  startSessionAudit({ ...opts(sid, ["x.ts"], ENGINEER_ALLOW, "backend-engineer"), roots });
  writeFileSync(path.join(workRoot, "evil.ts"), "e\n");
  const res = finishSessionAudit({ ...opts(sid, ["x.ts"], ENGINEER_ALLOW, "backend-engineer"), roots });
  assert.equal(res.writeAudit.violations.length, 1);
  const v = res.writeAudit.violations[0]!;
  assert.equal(v.kind, "write");
  assert.match(v.detail, /orchestrator home/);
  // unit: ครบทั้ง 3 รูป universal deny
  assert.match(universalDenyReason(path.join(home, "state", "x.json"), DENY_PATHS)!, /orchestrator home/);
  assert.match(universalDenyReason(path.join(home, "..", "sta-config.json"), DENY_PATHS)!, /sta-config/);
  assert.match(universalDenyReason(path.join(codeRoot, ".git", "hooks", "x"), DENY_PATHS)!, /\.git/);
  assert.equal(universalDenyReason(path.join(codeRoot, "ok.ts"), DENY_PATHS), null);
});

// --- status column (AC-073 — DES-021 ข้อ 5) ---

test("AC-073: qa-engineer เปลี่ยน Status แถวเดิม → status-write", () => {
  writeRepo({ "docs/agent-team/plan/index.md": planText([PENDING]) });
  const sid = nextSid();
  startSessionAudit(opts(sid, QA_ALLOW, QA_ALLOW, "qa-engineer"));
  writeFileSync(planPath(), planText([PENDING.replace("pending", "verified")]));
  const res = finishSessionAudit(opts(sid, QA_ALLOW, QA_ALLOW, "qa-engineer"));
  const sv = res.writeAudit.violations.filter((v) => v.kind === "status-write");
  assert.equal(sv.length, 1);
  assert.match(sv[0]!.detail, /BE-001: Status pending → verified/);
  assert.equal(sv[0]!.path, planPath());
});

test("AC-073: PM เพิ่มแถวใหม่ pending ผ่าน · verified/ค่านอกชุด/role อื่นเพิ่มแถว/ลบแถว → status-write", () => {
  // PM + แถวใหม่ pending = โอเค (แตะ plan/index.md ใต้ claim → touched)
  writeRepo({ "docs/agent-team/plan/index.md": planText([PENDING]) });
  let sid = nextSid();
  startSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  writeFileSync(planPath(), planText([PENDING, "| BE-009 | new task | project-manager | p1 | - | pending |"]));
  let res = finishSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  assert.equal(res.writeAudit.violations.length, 0);
  assert.deepEqual(res.writeAudit.touchedFiles, [planPath()]);

  // PM เพิ่มแถว verified → ต้อง pending เท่านั้น
  sid = nextSid();
  startSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  writeFileSync(planPath(), planText([PENDING, "| BE-010 | new task | project-manager | p1 | - | verified |"]));
  res = finishSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  assert.match(res.writeAudit.violations.find((v) => v.kind === "status-write")!.detail, /ต้อง pending/);

  // ค่านอก pending|verified|blocked → violation
  sid = nextSid();
  startSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  writeFileSync(planPath(), planText([PENDING, "| BE-011 | new task | project-manager | p1 | - | done |"]));
  res = finishSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  assert.match(res.writeAudit.violations.find((v) => v.kind === "status-write")!.detail, /นอก pending\|verified\|blocked/);

  // role อื่นเพิ่มแถว → violation (เฉพาะ PM เพิ่มแถวได้)
  sid = nextSid();
  startSessionAudit(opts(sid, QA_ALLOW, QA_ALLOW, "qa-engineer"));
  writeFileSync(planPath(), planText([PENDING, "| BE-012 | new task | qa-engineer | p1 | - | pending |"]));
  res = finishSessionAudit(opts(sid, QA_ALLOW, QA_ALLOW, "qa-engineer"));
  assert.match(res.writeAudit.violations.find((v) => v.kind === "status-write")!.detail, /เฉพาะ PM/);

  // ลบแถวเดิม → fail-closed
  sid = nextSid();
  startSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  writeFileSync(planPath(), planText([]));
  res = finishSessionAudit(opts(sid, PM_ALLOW, PM_ALLOW, "project-manager"));
  assert.match(res.writeAudit.violations.find((v) => v.kind === "status-write")!.detail, /ถูกลบ/);
});

test("journal ของ orchestrator (BE-022) ครอบ plan/index.md → ไม่เป็น violation ทั้ง unclaimed-write และ status-write · hash ไม่ตรงยังโดน", () => {
  writeRepo({ "docs/agent-team/plan/index.md": planText([PENDING]) });
  const sid = nextSid();
  startSessionAudit(opts(sid, QA_ALLOW, QA_ALLOW, "qa-engineer"));
  const after = planText([PENDING.replace("pending", "verified")]);
  writeFileSync(planPath(), after);
  const hash = (s: string): string => createHash("sha256").update(s).digest("hex");
  // journal hash ตรง → orchestrator เขียนเอง — ข้าม (AC-073 "audit ไม่พบ agent session ใดเขียน Status")
  const res = finishSessionAudit({
    ...opts(sid, QA_ALLOW, QA_ALLOW, "qa-engineer"),
    journal: [{ path: planPath(), hash: hash(after) }],
  });
  assert.deepEqual(res.writeAudit.violations, []);
  assert.deepEqual(res.writeAudit.touchedFiles, []); // ไม่ใช่ของ session นี้
  assert.ok(res.writeAudit.changed.includes(planPath()));
  // journal hash ไม่ตรง (มีคนแก้ต่อหลัง orchestrator) → fail-closed ยังตัดสินตามปกติ
  const sid2 = nextSid();
  startSessionAudit(opts(sid2, QA_ALLOW, QA_ALLOW, "qa-engineer"));
  writeFileSync(planPath(), planText([PENDING])); // เนื้อหาต่างจากตอน start → hash ไม่ตรง journal ใด
  const res2 = finishSessionAudit({
    ...opts(sid2, QA_ALLOW, QA_ALLOW, "qa-engineer"),
    journal: [{ path: planPath(), hash: hash("เนื้อเดิม") }],
  });
  assert.ok(res2.writeAudit.violations.some((v) => v.kind === "status-write"));
});

// --- snapshot persist (AC-066) ---

test("AC-066: snapshot รอด restart → finish หลัง 'crash' ให้ touchedFiles ค้าง · snapshot.json = {path → sha256}", () => {
  writeRepo({ "code/agent-team/src/keep.ts": "k\n" });
  const sid = nextSid();
  const o = opts(sid, ["agent-team/src/**"], ENGINEER_ALLOW, "backend-engineer");
  const start = startSessionAudit(o);
  assert.equal(start.partial, false);
  const snapshotFile = path.join(home, "state", "runs", o.runId, "sessions", sid, "snapshot.json");
  assert.ok(existsSync(snapshotFile));
  const snap = JSON.parse(readFileSync(snapshotFile, "utf8")) as Record<string, string>;
  assert.ok(snap[path.join(codeRoot, "agent-team", "src", "keep.ts")]);
  assert.ok(Object.values(snap).every((v) => /^[0-9a-f]{64}$/.test(v)));
  // session เดิม crash — ไม่มี finish — เขียนไฟล์ใต้ claim ต่อ แล้ว "restart" เรียก finish กับ snapshot ที่ persist ไว้
  writeFileSync(path.join(codeRoot, "agent-team", "src", "keep.ts"), "k2\n");
  const res = finishSessionAudit(o); // snapshotPath default = ไฟล์เดิมบนดิสก์
  assert.deepEqual(res.writeAudit.touchedFiles, [path.join(codeRoot, "agent-team", "src", "keep.ts")]);
  assert.deepEqual(res.writeAudit.violations, []);
});

// --- โหมด git (argv array เท่านั้น) + fallback manifest (DES-006) ---

test("git mode: ls-files ผ่าน argv array (stub ไม่แตะ repo จริง) → mode git · git ล้ม → fallback manifest + partial", () => {
  const gitRoot = path.join(tmp, "gitroot");
  writeRepo({ "gitroot/src/a.ts": "a\n", "gitroot/untracked.txt": "u\n" });
  // ทุก root ของ run เป็น git mode → mode ของ session = "git" (root ใด fallback → ทั้ง session เป็น manifest — DES-006)
  const roots: AuditRoot[] = [
    { rootKind: "knowledge", name: "knowledge", path: docsRoot, auditMode: "git", repoTop: docsRoot },
    { rootKind: "target", name: "t", path: gitRoot, auditMode: "git", repoTop: gitRoot },
  ];
  // stub จำลอง `git ls-files -co --exclude-standard`: เดินไฟล์จริงของ fixture รากนั้น (ไม่เรียก git จริง)
  const calls: string[][] = [];
  const stub: GitRunner = (args, cwd) => {
    calls.push([...args]);
    if (args[0] === "-C") return { status: 0, stdout: fakeLs(cwd).join("\n") };
    return { status: 1, stdout: "1\t1\tstub" }; // git diff --no-index (exit 1 = มีความต่าง)
  };
  const sid = nextSid();
  const o = { ...opts(sid, ["src/**"], ENGINEER_ALLOW, "backend-engineer"), roots, gitRunner: stub };
  startSessionAudit(o);
  assert.deepEqual(calls[0], ["-C", docsRoot, "ls-files", "-co", "--exclude-standard"]);
  assert.deepEqual(calls[1], ["-C", gitRoot, "ls-files", "-co", "--exclude-standard"]);
  writeFileSync(path.join(gitRoot, "src", "a.ts"), "a2\n");
  const res = finishSessionAudit(o);
  assert.equal(res.writeAudit.mode, "git");
  assert.equal(res.writeAudit.partial, false);
  assert.deepEqual(res.writeAudit.touchedFiles, [path.join(gitRoot, "src", "a.ts")]);
  assert.deepEqual(res.writeAudit.violations, []);
  assert.ok(calls.some((c) => c[0] === "diff" && c[1] === "--no-index" && c[2] === "--numstat"));
  assert.ok(existsSync(path.join(home, "state", "runs", o.runId, "sessions", sid, "diff.patch")));

  // git ล้มกลาง run → manifest ของรากนั้น + partial + note (DES-006)
  const sid2 = nextSid();
  const o2 = { ...opts(sid2, ["src/**"], ENGINEER_ALLOW, "backend-engineer"), roots, gitRunner: () => ({ status: 128, stdout: "" }) };
  startSessionAudit(o2);
  writeFileSync(path.join(gitRoot, "src", "a.ts"), "a3\n");
  const res2 = finishSessionAudit(o2);
  assert.equal(res2.writeAudit.mode, "manifest");
  assert.equal(res2.writeAudit.partial, true);
  assert.ok(res2.notes.some((n) => /fallback manifest/.test(n)));
  assert.deepEqual(res2.writeAudit.touchedFiles, [path.join(gitRoot, "src", "a.ts")]);
});

// --- กิ่ง fallback `git diff HEAD` (ไม่มี pre-image — DES-021 ข้อ 6: diffApprox true + ครอบ untracked) ---

test("กิ่ง git diff HEAD: ไฟล์ใต้ claim เกินเพดาน pre-image → numstat จาก diff HEAD + diffApprox: true เสมอ", () => {
  const gitRoot2 = path.join(tmp, "gitroot2");
  writeRepo({ "gitroot2/src/tracked.ts": "a\n" });
  const roots: AuditRoot[] = [
    { rootKind: "knowledge", name: "knowledge", path: docsRoot, auditMode: "git", repoTop: docsRoot },
    { rootKind: "target", name: "t", path: gitRoot2, auditMode: "git", repoTop: gitRoot2 },
  ];
  // stub จำลอง git อ่านอย่างเดียวทั้งชุด (รูป argv: ["-C", <path>, <cmd>, …]): ls-files -co = ไฟล์จริงของ
  // fixture · ls-files --others = ไม่มี untracked · diff HEAD = numstat ของไฟล์ tracked ที่แก้ (ไม่เรียก git จริง)
  const stub: GitRunner = (args, cwd) => {
    if (args[0] === "-C" && args[2] === "ls-files") {
      if (args[3] === "--others") return { status: 0, stdout: "" };
      return { status: 0, stdout: fakeLs(cwd).join("\n") };
    }
    if (args[0] === "-C" && args[2] === "diff") return { status: 0, stdout: "2\t1\tsrc/tracked.ts" };
    return { status: 1, stdout: "1\t1\tstub" }; // git diff --no-index (exit 1 = มีความต่าง)
  };
  const sid = nextSid();
  const o = { ...opts(sid, ["src/**"], ENGINEER_ALLOW, "backend-engineer"), roots, gitRunner: stub, preimageMaxMB: 0 };
  startSessionAudit(o);
  writeFileSync(path.join(gitRoot2, "src", "tracked.ts"), "a2\nb2\nc2\n");
  const res = finishSessionAudit(o);
  assert.deepEqual(res.writeAudit.touchedFiles, [path.join(gitRoot2, "src", "tracked.ts")]);
  assert.equal(res.writeAudit.diffApprox, true); // แม้ diff HEAD สำเร็จ — ไม่มี pre-image = ไม่แม่นยำ (นับเกิน = ปลอดภัย)
  const patch = readFileSync(path.join(home, "state", "runs", o.runId, "sessions", sid, "diff.patch"), "utf8");
  assert.match(patch, /^2\t1\tsrc\/tracked\.ts$/m); // numstat จาก git diff HEAD ยังปรากฏ
  assert.doesNotMatch(patch, /# approx: .*tracked\.ts/);
});

test("กิ่ง git diff HEAD: ไฟล์ใหม่ (untracked) ถูกนับใน diff.patch — ไม่หายเงียบจาก numstat", () => {
  const gitRoot3 = path.join(tmp, "gitroot3");
  writeRepo({ "gitroot3/src/keep.ts": "k\n" });
  const roots: AuditRoot[] = [
    { rootKind: "knowledge", name: "knowledge", path: docsRoot, auditMode: "git", repoTop: docsRoot },
    { rootKind: "target", name: "t", path: gitRoot3, auditMode: "git", repoTop: gitRoot3 },
  ];
  // git diff HEAD จริงไม่แสดง untracked — stub คืน stdout ว่างตามจริง · ls-files --others คืนไฟล์ใหม่
  const stub: GitRunner = (args, cwd) => {
    if (args[0] === "-C" && args[2] === "ls-files") {
      if (args[3] === "--others") return { status: 0, stdout: "src/added.md" };
      return { status: 0, stdout: fakeLs(cwd).join("\n") };
    }
    if (args[0] === "-C" && args[2] === "diff") return { status: 0, stdout: "" };
    return { status: 1, stdout: "1\t1\tstub" };
  };
  const sid = nextSid();
  const o = { ...opts(sid, ["src/**"], ENGINEER_ALLOW, "backend-engineer"), roots, gitRunner: stub };
  startSessionAudit(o);
  writeFileSync(path.join(gitRoot3, "src", "added.md"), "หนึ่ง\nสอง\n"); // ไฟล์ใหม่ใน session — ไม่มี pre-image โดยธรรมชาติ
  const res = finishSessionAudit(o);
  assert.deepEqual(res.writeAudit.touchedFiles, [path.join(gitRoot3, "src", "added.md")]);
  assert.equal(res.writeAudit.diffApprox, true);
  const patch = readFileSync(path.join(home, "state", "runs", o.runId, "sessions", sid, "diff.patch"), "utf8");
  assert.match(patch, /^2\t0\tsrc\/added\.md$/m); // นับทุกบรรทัดเป็น added — ขนาดไม่ต่ำกว่าจริง
  assert.match(patch, /# approx: .*added\.md/); // มีหมายเหตุ approx กำกับ
});

// --- เพดาน pre-image (DES-021 ข้อ 3) ---

test("เพดาน preimageMaxMB 0 → ไฟล์ใต้ claim ไม่มี pre-image (diffApprox) แต่ plan/index.md เก็บ pre-image เสมอ", () => {
  writeRepo({ "code/agent-team/src/b.ts": "b\n", "docs/agent-team/plan/index.md": planText([PENDING]) });
  const sid = nextSid();
  const o = opts(sid, ["agent-team/src/**"], ENGINEER_ALLOW, "backend-engineer", { preimageMaxMB: 0 });
  startSessionAudit(o);
  const preDir = path.join(home, "state", "runs", o.runId, "sessions", sid, "preimage");
  assert.ok(existsSync(path.join(preDir, "root-0", PLAN_REL))); // plan/index.md — เสมอ ไม่อยู่ใต้เพดาน
  assert.equal(existsSync(path.join(preDir, "root-1", "agent-team", "src", "b.ts")), false);
  writeFileSync(path.join(codeRoot, "agent-team", "src", "b.ts"), "b2\n");
  const res = finishSessionAudit(o);
  assert.deepEqual(res.writeAudit.touchedFiles, [path.join(codeRoot, "agent-team", "src", "b.ts")]);
  assert.equal(res.writeAudit.diffApprox, true);
  const patch = readFileSync(path.join(home, "state", "runs", o.runId, "sessions", sid, "diff.patch"), "utf8");
  assert.match(patch, /# approx: .*b\.ts/);
});

// --- fail-closed อื่น ---

test("finish ไม่มี snapshot.json → SessionAuditError (fail-closed) · snapshot ผิดรูป → SessionAuditError", () => {
  const sid = nextSid();
  assert.throws(
    () => finishSessionAudit({ ...opts(sid, [], ENGINEER_ALLOW, "backend-engineer"), snapshotPath: path.join(tmp, "no-such.json") }),
    /ไม่พบ snapshot\.json/,
  );
  const bad = path.join(tmp, "bad-snapshot.json");
  writeFileSync(bad, '{"a": 1}');
  assert.throws(
    () => finishSessionAudit({ ...opts(sid, [], ENGINEER_ALLOW, "backend-engineer"), snapshotPath: bad }),
    /ผิดรูป/,
  );
  // docsRoot ไม่อยู่ใน roots → ปฏิเสธทั้ง start และ finish (audit มองไม่เห็น plan/index.md)
  const noDocs: AuditRoot[] = [ROOTS[1]!];
  assert.throws(() => startSessionAudit({ ...opts(sid, [], ENGINEER_ALLOW, "backend-engineer"), roots: noDocs }), /docsRoot/);
  assert.throws(() => finishSessionAudit({ ...opts(sid, [], ENGINEER_ALLOW, "backend-engineer"), roots: noDocs }), /docsRoot/);
});

test("defaultGitRunner: argv array ไม่มี shell — git diff --no-index อ่านอย่างเดียวกับไฟล์จริง", () => {
  const a = path.join(tmp, "g1.txt");
  const b = path.join(tmp, "g2.txt");
  writeFileSync(a, "1\n");
  writeFileSync(b, "1\n2\n");
  const r = defaultGitRunner()(["diff", "--no-index", "--numstat", a, b], tmp);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^1\t0\t/m); // เก็บ 1 แถว ลบ 0 — numstat ของ git จริง
});

test("cleanup fixture", () => {
  rmSync(tmp, { recursive: true, force: true });
  assert.equal(existsSync(tmp), false);
});
