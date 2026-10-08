// BE-022 — node:test: Status write-back + 🔒 write-back ของ orchestrator (DES-007 §Status write-back/§🔒, R23)
// ครอบ AC-073 (ค่าที่เขียนได้มีแค่ verified/blocked · ค่าเดิมไม่ตรง → status-conflict) · AC-056 (task PASS เขียนทันที
// ไม่รอ task FAIL) · ความถูกต้อง byte-level (แก้เฉพาะ cell เป้าหมาย) · atomic tmp+rename · self-write journal ที่
// BE-008 ใช้ข้าม (audit ไม่นับเป็น violation) · 🔒 เพิ่มอย่างเดียว ไม่ลบ/ไม่ซ้ำ · kill กลางเขียน → resume reconcile ได้ผลเดียว
// fixture ทั้งหมดอยู่ใน os.tmpdir — ห้ามแตะ plan จริงระหว่าง test · audit ใช้ fixture roots (manifest) ไม่แตะ repo จริง
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, after } from "node:test";

import { parsePlanIndex } from "../src/core/plan-parser.ts";
import { finishSessionAudit, startSessionAudit, type AuditRoot } from "../src/core/session-audit.ts";
import { createRun, loadRun, saveRun, type HandoffV2, type RunJson, type SessionRecord } from "../src/core/state-store.ts";
import {
  StatusWriterError,
  applyStatusWrites,
  marksFromRun,
  type ActiveClaim,
  type SecurityMarkItem,
  type StatusWriteItem,
} from "../src/core/status-writer.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be022-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
const fresh = (name: string): string => {
  const dir = path.join(tmp, `${name}-${++n}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};
const writeDoc = (dir: string, text: string): string => {
  const file = path.join(dir, "plan-index.md");
  writeFileSync(file, text);
  return file;
};
const readDoc = (file: string): string => readFileSync(file, "utf8");
const sha256 = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");

// --- fixture plan v2 (รูปตรง template plan-index.md) ---
const PHASE_ROW = "| 1 | โครง state | BE-001, BE-002 | — |";
const PHASE_ROW_LOCKED = "| 1 | โครง state | BE-001, BE-002 | — 🔒 security gate |";
const ROW_A = "| BE-001 | config store | backend-engineer | 1 | — | pending |";
const ROW_A_VERIFIED = "| BE-001 | config store | backend-engineer | 1 | — | verified |";
const ROW_A_BLOCKED = "| BE-001 | config store | backend-engineer | 1 | — | blocked |";
const ROW_B = "| BE-002 | plan parser | backend-engineer | 1 | BE-001 | pending |";
const ROW_B_BLOCKED = "| BE-002 | plan parser | backend-engineer | 1 | BE-001 | blocked |";
const planDoc = (rows: string[], phaseRow = PHASE_ROW, eol = "\n"): string =>
  [
    "# agent-team — Plan Index", "",
    "## Phases", "",
    "| Phase | ชื่อ | Tasks | หมายเหตุ |", "|---|---|---|---|", phaseRow, "",
    "## Waiting on Human", "",
    "| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |", "|---|---|---|---|---|", "",
    "## Tasks", "",
    "| Task | Name | Owner | Phase | Depends | Status |", "|---|---|---|---|---|---|",
    ...rows, "",
  ].join(eol);
const noPhasesDoc = (rows: string[]): string =>
  ["# agent-team — Plan Index", "", "## Tasks", "", "| Task | Name | Owner | Phase | Depends | Status |", "|---|---|---|---|---|---|", ...rows, ""].join("\n");

const MODULE = "agent-team";
const verifyOk = (file: string): { task: string; phase: string } => {
  const p = parsePlanIndex(readDoc(file));
  assert.deepEqual(p.issues, []);
  return { task: p.rows[0]!.status ?? "", phase: p.phases[0]!.locked ? "locked" : "unlocked" };
};
const noTmpLeftover = (dir: string): void => {
  const left = readdirSync(dir).filter((f) => f.includes(".tmp-"));
  assert.deepEqual(left, [], "ต้องไม่เหลือไฟล์ tmp จากการเขียน atomic");
};
const statusWrite = (taskId: string, value: "verified" | "blocked", expectedCurrent: "pending" | "verified" | "blocked" | null): StatusWriteItem =>
  ({ taskId, value, expectedCurrent });

// --- 1. Status verified — เปลี่ยนเฉพาะ cell นั้น ไบต์อื่นเท่าเดิม + journal (AC-073/AC-056) ---
test("verified → เปลี่ยนเฉพาะ cell Status ของแถวนั้น ไบต์อื่นเท่าเดิม + journal บันทึกไฟล์และคืนค่า", () => {
  const dir = fresh("status-ok");
  const file = writeDoc(dir, planDoc([ROW_A, ROW_B]));
  const jPath = path.join(dir, "state", "runs", "r-be22", "status-journal.jsonl");

  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R6",
    statusWrites: [statusWrite("BE-001", "verified", "pending")],
    journalPath: jPath,
  });

  assert.equal(res.deferred, false);
  assert.equal(res.verify, "ok");
  assert.deepEqual(res.statusWrites, [{ kind: "applied", taskId: "BE-001", from: "pending", to: "verified" }]);
  assert.deepEqual(res.securityMarks, []);
  assert.equal(readDoc(file), planDoc([ROW_A_VERIFIED, ROW_B]), "ไบต์อื่นต้องเท่าเดิม (แก้เฉพาะ cell Status ของ BE-001)");
  assert.deepEqual(verifyOk(file), { task: "verified", phase: "unlocked" });
  noTmpLeftover(dir);
  assert.equal(res.journalPersisted, true);
  assert.deepEqual(res.journal, [{ path: file, sha256: sha256(file), at: res.journal[0]!.at, decisionRuleId: "R6" }]);
  // journal ลงไฟล์ 1 บรรทัด ตรงรูป {path, sha256, at, decisionRuleId} (DES-021 ข้อ 4)
  const lines = readFileSync(jPath, "utf8").trimEnd().split("\n");
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]!), res.journal[0]);
});

// --- 2. AC-056 localized — task PASS เขียนทันที แม้อีกแถว conflict ---
test("task PASS เขียนทันทีไม่รอ task FAIL — แถว conflict ไม่บล็อกแถวอื่นในคำสั่งเดียว", () => {
  const dir = fresh("localized");
  const file = writeDoc(dir, planDoc([ROW_A, ROW_B]));

  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R6",
    statusWrites: [statusWrite("BE-001", "verified", "pending"), statusWrite("BE-002", "blocked", "verified")], // BE-002 ค่าเดิมไม่ตรง
  });

  assert.deepEqual(
    res.statusWrites.map((o) => o.kind),
    ["applied", "conflict"],
  );
  assert.equal(res.statusWrites[1]!.kind === "conflict" ? res.statusWrites[1]!.reason : "", "value-mismatch");
  assert.equal(readDoc(file), planDoc([ROW_A_VERIFIED, ROW_B]), "BE-001 เขียนแล้ว · BE-002 คงเดิม");
});

// --- 3. fail-closed — ค่าเดิมไม่ตรง / แถวหาย / ค่านอก 3 ค่า / แถวผิดรูป / คำสั่ง pending (AC-073) ---
test("conflict/rejected ทุกกิ่ง — ไฟล์ไม่ถูกแตะ ไม่มี journal (hold status-conflict เป็นของ driver)", () => {
  const dir = fresh("conflicts");
  const rows = [
    ROW_A,
    ROW_B,
    "| BE-003 | router | backend-engineer | 1 | BE-002 | in-progress |", // ค่านอก 3 ค่า
    "| BE-004 | audit | backend-engineer | 1 | BE-002 | pending", // ผิดรูป — ไม่มี | ท้ายแถว
  ];
  const file = writeDoc(dir, planDoc(rows));
  const before = readDoc(file);

  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R6",
    statusWrites: [
      statusWrite("BE-001", "verified", "blocked"), // ค่าเดิมไม่ตรงที่ runtime คาด
      statusWrite("BE-099", "verified", "pending"), // แถวหาย
      statusWrite("BE-003", "verified", "pending"), // doc เปลี่ยนเป็นค่านอก 3 ค่าหลังตัดสิน
      statusWrite("BE-004", "verified", "pending"), // แถวผิดรูป
      statusWrite("BE-002", "verified", null), // expectedCurrent null = ตอนตัดสินค่าผิดรูป
      { taskId: "BE-001", value: "pending" as "verified", expectedCurrent: "pending" }, // ห้ามเขียน pending (AC-073)
    ],
  });

  assert.deepEqual(
    res.statusWrites.map((o) => (o.kind === "conflict" ? `conflict:${o.reason}` : o.kind)),
    ["conflict:value-mismatch", "conflict:row-missing", "conflict:value-mismatch", "conflict:row-malformed", "conflict:value-mismatch", "rejected"],
  );
  assert.deepEqual(res.journal, []);
  assert.equal(res.verify, "skipped");
  assert.equal(readDoc(file), before, "ทุกแถวถูกปฏิเสธ — ไฟล์ต้องเท่าเดิมทุกไบต์");
  noTmpLeftover(dir);
});

test("task id ซ้ำในตาราง → ปฏิเสธแถวนั้น (fail-closed ตรงกับ plan-duplicate-id ของ parser)", () => {
  const dir = fresh("dup");
  const file = writeDoc(dir, planDoc([ROW_A, ROW_A, ROW_B]));
  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R6",
    statusWrites: [statusWrite("BE-001", "verified", "pending")],
  });
  assert.deepEqual(res.statusWrites, [{
    kind: "conflict", taskId: "BE-001", reason: "row-malformed", expectedCurrent: "pending", actual: null,
    detail: res.statusWrites[0]!.kind === "conflict" ? res.statusWrites[0]!.detail : "",
  }]);
  assert.equal(readDoc(file), planDoc([ROW_A, ROW_A, ROW_B]));
});

// --- 4. เลื่อนเมื่อมี session active ที่ claim ครอบ plan/index.md (DES-021 §Permissions) ---
test("claim plan/** active → เลื่อนทั้งชุด ไฟล์ไม่เปลี่ยน · claim ที่ไม่ครอบ plan → เขียนปกติ", () => {
  const dir = fresh("defer");
  const file = writeDoc(dir, planDoc([ROW_A]));
  const deferCases: ActiveClaim[] = [
    { sessionId: "s-1", claim: ["plan/**"] }, // โมดูลสัมพัทธ์
    { sessionId: "s-2", claim: ["knowledge/<module>/plan/**"] }, // allow รูป prefixed (placeholder)
    { sessionId: "s-3", claim: ["knowledge/agent-team/plan/index.md"] }, // allow รูป prefixed (ตัวจริง)
    { sessionId: "s-4", claim: ["agent-team/plan/**"] }, // plain สัมพัทธ์ docsRoot
  ];
  for (const active of deferCases) {
    const res = applyStatusWrites({
      planPath: file, module: MODULE, ruleId: "R6",
      statusWrites: [statusWrite("BE-001", "verified", "pending")],
      activeSessions: [active, { sessionId: "s-other", claim: ["codeRoots/**"] }],
    });
    assert.equal(res.deferred, true, `claim ${active.claim[0]} ต้องเลื่อน`);
    assert.match(res.deferReason ?? "", /s-\d/);
    assert.deepEqual(res.statusWrites, []);
    assert.deepEqual(res.journal, []);
  }
  assert.equal(readDoc(file), planDoc([ROW_A]), "เลื่อน = ไฟล์เท่าเดิมทุกไบต์");
  // claim ที่ไม่ครอบ plan → เขียนได้
  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R6",
    statusWrites: [statusWrite("BE-001", "verified", "pending")],
    activeSessions: [{ sessionId: "s-qa", claim: ["agent-team/qa/**"] }, { sessionId: "s-fe", claim: ["codeRoots/**"] }],
  });
  assert.equal(res.deferred, false);
  assert.equal(res.verify, "ok");
  assert.equal(readDoc(file), planDoc([ROW_A_VERIFIED]));
});

// --- 5. journal + BE-008 — audit ไม่นับการเขียนของ orchestrator เป็น violation (AC-073) ---
const AUDIT_ROOTS = (docsRoot: string, codeRoot: string): AuditRoot[] => [
  { rootKind: "knowledge", name: "knowledge", path: docsRoot, auditMode: "manifest", repoTop: null },
  { rootKind: "target", name: "target", path: codeRoot, auditMode: "manifest", repoTop: null },
];
const QA_ALLOW = ["knowledge/<module>/qa/**", "knowledge/<module>/plan/index.md"]; // ตรง routing.yaml

test("journal ถูกบันทึกและ finishSessionAudit ไม่นับเป็น violation · ไม่มี journal → status-write", () => {
  // session ที่ 1 — orchestrator เขียน + journal → audit สะอาด
  const root1 = fresh("audit-j");
  const docs1 = path.join(root1, "docs");
  const plan1 = path.join(docs1, MODULE, "plan", "index.md");
  mkdirSync(path.dirname(plan1), { recursive: true });
  mkdirSync(path.join(root1, "code"));
  writeFileSync(plan1, planDoc([ROW_A]));
  const base1 = {
    home: root1, runId: "r-be22-a", roots: AUDIT_ROOTS(docs1, path.join(root1, "code")), docsRoot: docs1,
    docsLayout: "split" as const, module: MODULE, packRoot: root1,
    manifestIgnore: ["node_modules/**", ".git/**"], preimageMaxMB: 50,
  };
  const s1 = "s-1-be22";
  startSessionAudit({ ...base1, sessionId: s1, claim: [`${MODULE}/qa/**`] });
  const jPath = path.join(root1, "state", "runs", "r-be22-a", "status-journal.jsonl");
  const res = applyStatusWrites({
    planPath: plan1, module: MODULE, ruleId: "R6",
    statusWrites: [statusWrite("BE-001", "verified", "pending")], journalPath: jPath,
  });
  assert.equal(res.verify, "ok");
  const fin1 = finishSessionAudit({
    ...base1, sessionId: s1, claim: [`${MODULE}/qa/**`], role: "qa-engineer", allow: QA_ALLOW, deny: [],
    journal: res.journal.map((j) => ({ path: j.path, hash: j.sha256 })),
  });
  assert.deepEqual(fin1.writeAudit.violations, [], "การเขียนที่ journal ครอบ (path+hash) ต้องไม่เป็น violation");

  // session ที่ 2 — สำเนาเดียวกันแต่ไม่ส่ง journal → audit ต้องจับ status-write (control)
  const root2 = fresh("audit-c");
  const docs2 = path.join(root2, "docs");
  const plan2 = path.join(docs2, MODULE, "plan", "index.md");
  mkdirSync(path.dirname(plan2), { recursive: true });
  mkdirSync(path.join(root2, "code"));
  writeFileSync(plan2, planDoc([ROW_A]));
  const base2 = {
    home: root2, runId: "r-be22-b", roots: AUDIT_ROOTS(docs2, path.join(root2, "code")), docsRoot: docs2,
    docsLayout: "split" as const, module: MODULE, packRoot: root2,
    manifestIgnore: ["node_modules/**", ".git/**"], preimageMaxMB: 50,
  };
  const s2 = "s-2-be22";
  startSessionAudit({ ...base2, sessionId: s2, claim: [`${MODULE}/qa/**`] });
  applyStatusWrites({ planPath: plan2, module: MODULE, ruleId: "R6", statusWrites: [statusWrite("BE-001", "verified", "pending")] });
  const fin2 = finishSessionAudit({
    ...base2, sessionId: s2, claim: [`${MODULE}/qa/**`], role: "qa-engineer", allow: QA_ALLOW, deny: [],
  });
  assert.ok(
    fin2.writeAudit.violations.some((v) => v.kind === "status-write"),
    "ไม่มี journal → การเขียน Status ต้องโดนจับเป็น status-write",
  );
});

// --- 6. 🔒 ในแถว Phase (R23) — เพิ่มอย่างเดียว ไบต์อื่นเท่าเดิม ไม่ซ้ำ · หาแถวไม่เจอ → missing-phase ไม่ hold ---
test("securityMarks → เพิ่ม 🔒 security gate ในคอลัมน์ หมายเหตุ · เขียนซ้ำ → no-op · label แปลก → missing-phase", () => {
  const dir = fresh("marks");
  const file = writeDoc(dir, planDoc([ROW_A]));

  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R23",
    securityMarks: [{ phase: "1", reason: "QA พบจุด security gate" }, { phase: "1", reason: "ซ้ำในคำสั่งเดียว" }, { phase: "9", reason: "ไม่มี phase นี้" }],
  });
  assert.deepEqual(
    res.securityMarks.map((o) => o.kind),
    ["applied", "no-op", "missing-phase"],
  );
  assert.equal(res.verify, "ok");
  assert.equal(readDoc(file), planDoc([ROW_A], PHASE_ROW_LOCKED), "ไบต์อื่นเท่าเดิม — แก้เฉพาะ cell หมายเหตุ ของแถว Phase");
  assert.deepEqual(verifyOk(file), { task: "pending", phase: "locked" });

  // เขียนซ้ำ (resume reconcile) → no-op ทั้งหมด ไฟล์คงเดิมทุกไบต์
  const again = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R23",
    securityMarks: [{ phase: "1", reason: "QA พบจุด security gate" }],
  });
  assert.deepEqual(again.securityMarks, [{ kind: "no-op", phase: "1" }]);
  assert.equal(again.verify, "skipped");
  assert.equal(readDoc(file), planDoc([ROW_A], PHASE_ROW_LOCKED));
});

test("แถว Phase ที่มี 🔒 อยู่แล้ว → no-op · ไม่มี ## Phases → missing-phase แต่ Status ยังเขียนได้", () => {
  const locked = writeDoc(fresh("locked"), planDoc([ROW_A], PHASE_ROW_LOCKED));
  const res1 = applyStatusWrites({
    planPath: locked, module: MODULE, ruleId: "R23",
    securityMarks: [{ phase: "1", reason: "x" }],
  });
  assert.deepEqual(res1.securityMarks, [{ kind: "no-op", phase: "1" }]);
  assert.equal(readDoc(locked), planDoc([ROW_A], PHASE_ROW_LOCKED), "ไม่ซ้ำ — 🔒 ต้องมีอันเดียว");

  const noPh = writeDoc(fresh("noph"), noPhasesDoc([ROW_A]));
  const res2 = applyStatusWrites({
    planPath: noPh, module: MODULE, ruleId: "R23",
    statusWrites: [statusWrite("BE-001", "verified", "pending")],
    securityMarks: [{ phase: "1", reason: "x" }],
  });
  assert.deepEqual(res2.statusWrites.map((o) => o.kind), ["applied"]);
  assert.deepEqual(res2.securityMarks, [{ kind: "missing-phase", phase: "1", detail: res2.securityMarks[0]!.kind === "missing-phase" ? res2.securityMarks[0]!.detail : "" }]);
  assert.equal(readDoc(noPh), noPhasesDoc([ROW_A_VERIFIED]));
});

// --- 7. kill กลางเขียน → resume reconcile ได้ผลเดียว (marksFromRun + atomic) ---
const SNAP = { routing: "sha256:a", tiers: "sha256:b", camps: "sha256:c", gates: "sha256:d" };
const SCHED = {
  maxParallelSessions: 1, fixRoundLimit: 2, crashRestartLimit: 1,
  reviewWave: { maxTasks: 4, maxDiffLines: 400 }, largeTask: { diffLines: 300, files: 8 },
};
const handoff = (over: Partial<HandoffV2> = {}): HandoffV2 => ({
  role: "qa-engineer", module: MODULE, sessionId: "s-1-be22", outputState: "PASS",
  result: "—", changedDocs: [], changedCode: [], evidence: [], nextRole: "none",
  questionsForHuman: [], blocker: null, impactedTasks: null, decision: null,
  review: null, qa: null, featureQa: null, security: null, securityGate: null, ...over,
});
const mkSession = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  sessionId: "s-1-be22", seq: 1, kind: "qa", role: "qa-engineer", taskIds: ["BE-001"], planPhase: "1", attempt: 1,
  camp: "claude", model: "m", effort: null, tier: null, modelBasis: "role-default", effortBasis: "role-default", basisReason: "—",
  packetPath: "sessions/s-1-be22/packet.json", rolePromptHash: "sha256:rp", cliVersion: null,
  pid: null, cliSessionId: null, claim: [], contextFiles: [], priorSession: null,
  startedAt: "2026-10-06T00:00:00.000Z", endedAt: null, exitCode: 0, outcome: "completed",
  handoff: null, logsPath: "sessions/s-1-be22/session.log",
  writeAudit: { mode: "manifest", partial: false, diffApprox: false, changed: [], touchedFiles: [], violations: [], gitRefs: [] },
  ...over,
});
const runWithGates = (): { home: string; run: RunJson } => {
  const home = fresh("run-home");
  const run = createRun(home, { module: MODULE, mode: "new-work", planFormat: "v2", scheduler: SCHED, newWorkText: null, configSnapshot: SNAP });
  run.sessions.push(mkSession({
    handoff: handoff({
      securityGate: [{ phase: "1", reason: "QA พบจุด security gate" }, { phase: "1", reason: "ซ้ำ" }, { phase: "9", reason: "phase ที่ไม่มีจริง" }],
    }),
  }));
  saveRun(home, run);
  return { home, run: loadRun(home, run.runId) };
};

test("kill กลางเขียน → resume reconcile ได้ผลเดียว: เขียนก่อนตาย vs ตายก่อนเขียน → bytes เท่ากัน · ไม่ซ้ำ", () => {
  const { home, run } = runWithGates();
  const marks: SecurityMarkItem[] = marksFromRun(run);
  assert.deepEqual(marks, [{ phase: "1", reason: "QA พบจุด security gate" }, { phase: "9", reason: "phase ที่ไม่มีจริง" }], "dedupe ต่อ phase (seq แรกชนะ)");

  const fileA = writeDoc(fresh("resume-a"), planDoc([ROW_A])); // path A — เขียนสำเร็จก่อนตาย
  const fileB = writeDoc(fresh("resume-b"), planDoc([ROW_A])); // path B — ตายก่อนเขียน (ไฟล์เดิม)
  const resA = applyStatusWrites({ planPath: fileA, module: MODULE, ruleId: "R23", securityMarks: marks });
  assert.deepEqual(resA.securityMarks.map((o) => o.kind), ["applied", "missing-phase"]);
  const resB = applyStatusWrites({ planPath: fileB, module: MODULE, ruleId: "R23", securityMarks: marks }); // resume ทำซ้ำ
  assert.deepEqual(resB.securityMarks.map((o) => o.kind), ["applied", "missing-phase"]);
  assert.equal(readDoc(fileA), readDoc(fileB), "resume reconcile ต้องได้ผลเดียวกับเขียนครั้งแรก (ทุกไบต์)");
  assert.equal(readDoc(fileA), planDoc([ROW_A], PHASE_ROW_LOCKED));

  // resume ซ้ำอีกหลังเขียนสำเร็จแล้ว → no-op ทั้งหมด (idempotent)
  const resAgain = applyStatusWrites({ planPath: fileA, module: MODULE, ruleId: "R23", securityMarks: marks });
  assert.deepEqual(resAgain.securityMarks.map((o) => o.kind), ["no-op", "missing-phase"]);
  assert.equal(resAgain.journal.length, 0);
  assert.equal(readDoc(fileA), planDoc([ROW_A], PHASE_ROW_LOCKED));
});

test("Status write-back หลังตาย: cell เป็นค่าเป้าหมายอยู่แล้ว + expectedCurrent ตรง → no-op ไม่เขียนซ้ำ", () => {
  const file = writeDoc(fresh("status-idem"), planDoc([ROW_A]));
  applyStatusWrites({ planPath: file, module: MODULE, ruleId: "R6", statusWrites: [statusWrite("BE-001", "verified", "pending")] });
  const before = readDoc(file);
  const res = applyStatusWrites({ planPath: file, module: MODULE, ruleId: "R6", statusWrites: [statusWrite("BE-001", "verified", "verified")] });
  assert.deepEqual(res.statusWrites, [{ kind: "no-op", taskId: "BE-001", to: "verified", detail: res.statusWrites[0]!.kind === "no-op" ? res.statusWrites[0]!.detail : "" }]);
  assert.equal(res.journal.length, 0, "no-op ไม่ลง journal — ไฟล์ไม่เปลี่ยน");
  assert.equal(readDoc(file), before);
});

// --- 8. CRLF + คำสั่งรวม (Status + 🔒) — atomic เขียนครั้งเดียว journal เดียว ---
test("ไฟล์ CRLF — ตัวคั่นบรรทัดคงเดิมทุกไบต์ (แก้เฉพาะ cell เป้าหมาย)", () => {
  const file = writeDoc(fresh("crlf"), planDoc([ROW_A, ROW_B], PHASE_ROW, "\r\n"));
  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R19",
    statusWrites: [statusWrite("BE-001", "verified", "pending")],
    securityMarks: [{ phase: "1", reason: "Feature QA PASS + securityGate" }],
  });
  assert.equal(res.verify, "ok");
  assert.equal(readDoc(file), planDoc([ROW_A_VERIFIED, ROW_B], PHASE_ROW_LOCKED, "\r\n"));
  assert.equal(res.journal.length, 1);
  assert.equal(res.journal[0]!.decisionRuleId, "R19");
});

test("คำสั่งรวม Status + 🔒 = เขียน atomic ครั้งเดียว ไม่เหลือ tmp · ไฟล์ผิดรูปโครง → StatusWriterError", () => {
  const file = writeDoc(fresh("combined"), planDoc([ROW_A]));
  const res = applyStatusWrites({
    planPath: file, module: MODULE, ruleId: "R6",
    statusWrites: [statusWrite("BE-001", "verified", "pending")],
    securityMarks: [{ phase: "1", reason: "x" }],
  });
  assert.equal(res.verify, "ok");
  assert.equal(readDoc(file), planDoc([ROW_A_VERIFIED], PHASE_ROW_LOCKED));
  noTmpLeftover(path.dirname(file));

  // fail-closed ระดับไฟล์ — throw ให้ driver จัดการ (แจ้ง dashboard ระดับ module)
  const missing = path.join(fresh("err-missing"), "nope.md");
  assert.throws(() => applyStatusWrites({ planPath: missing, module: MODULE, ruleId: "R6", statusWrites: [statusWrite("BE-001", "verified", "pending")] }),
    (e: unknown) => e instanceof StatusWriterError && e.kind === "missing");
  assert.throws(() => applyStatusWrites({ planPath: "plan/index.md", module: MODULE, ruleId: "R6", statusWrites: [statusWrite("BE-001", "verified", "pending")] }),
    (e: unknown) => e instanceof StatusWriterError && e.kind === "invalid");
  const noTasks = writeDoc(fresh("err-notasks"), "# plan\n\nเนื้อหาอื่น\n");
  assert.throws(() => applyStatusWrites({ planPath: noTasks, module: MODULE, ruleId: "R6", statusWrites: [statusWrite("BE-001", "verified", "pending")] }),
    (e: unknown) => e instanceof StatusWriterError && e.kind === "invalid");
  const noStatusCol = writeDoc(fresh("err-nostatus"), "# plan\n\n## Tasks\n\n| Task | Name | Owner |\n|---|---|---|\n| BE-001 | x | backend-engineer |\n");
  assert.throws(() => applyStatusWrites({ planPath: noStatusCol, module: MODULE, ruleId: "R6", statusWrites: [statusWrite("BE-001", "verified", "pending")] }),
    (e: unknown) => e instanceof StatusWriterError && e.kind === "invalid");
  // คำสั่งว่าง → ไม่แตะไฟล์
  const untouched = writeDoc(fresh("empty"), planDoc([ROW_A]));
  const resEmpty = applyStatusWrites({ planPath: untouched, module: MODULE, ruleId: "R6" });
  assert.deepEqual(resEmpty.statusWrites, []);
  assert.equal(resEmpty.verify, "skipped");
  assert.equal(readDoc(untouched), planDoc([ROW_A]));
  assert.ok(!existsSync(`${untouched}.tmp-0`));
});
