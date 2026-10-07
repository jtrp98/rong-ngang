// BE-011 — terminal entry src/main.ts (DES-001/015 — REV-045): args รูป <knowledge> <target> <module>
// --date YYYY-MM-DD [--resume] · ปฏิเสธ run: args ไม่ครบ / --date หาย / config ไม่ผ่าน / path ไม่มีจริง
// (fail-closed พร้อม path — DES-015) · เริ่ม/resume เรียก driver ถูก — fake adapter เท่านั้น (ห้าม spawn CLI จริง)
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { KNOWN_GATES, type AppConfig, type CampProfile, type CampsConfig, type GatesConfig, type RegistryConfig, type RoutingConfig, type TiersConfig } from "../src/core/config.ts";
import type { CampAdapter, CampDispatch, CampOutcome, CampSessionHandle } from "../src/core/contract/camp-adapter.ts";
import type { HandoffV2, SessionKind } from "../src/core/state-store.ts";
import { main } from "../src/main.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be011-main-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

let roundN = 0;

// --- fake adapter — outcome canned ทันที (ไม่มี process จริง) — โครงเดียวกับ driver.test.ts ---
class FakeAdapter implements CampAdapter {
  readonly camp = "claude" as const;
  readonly profile: CampProfile = {
    command: "fake-cli", headlessArgs: ["-p"], modelFlag: "--model", schemaFlag: null,
    rolePromptFlag: "--append-system-prompt-file", briefChannel: "stdin",
  };
  dispatched: CampDispatch[] = [];

  constructor(private responder: (req: CampDispatch, nth: number) => CampOutcome) {}

  dispatch(req: CampDispatch): CampSessionHandle {
    const nth = this.dispatched.push(req) - 1;
    return { pid: 40000 + nth, outcome: Promise.resolve(this.responder(req, nth)), kill: () => {} };
  }
}

const out = (req: CampDispatch, over: Partial<HandoffV2>): CampOutcome => ({
  exitCode: 0,
  handoffRaw: JSON.stringify({
    role: req.packet.role, module: req.packet.module, sessionId: req.packet.sessionId, outputState: "DONE",
    result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none",
    questionsForHuman: [], blocker: null, impactedTasks: null, decision: null,
    review: null, qa: null, featureQa: null, security: null, securityGate: null, ...over,
  } satisfies HandoffV2),
  cliSessionId: null, cliVersion: "1.0.0", logsPath: null, failure: null,
});

const DEFAULT = (req: CampDispatch): CampOutcome => {
  const k = req.packet.kind;
  if (k === "review") {
    return out(req, { outputState: "PASS", review: { roundFile: `review/round-${++roundN}.md`, perTask: req.packet.taskIds.map((t) => ({ task: t, verdict: "PASS" as const })), findings: [] } });
  }
  if (k === "qa") {
    return out(req, {
      outputState: "PASS",
      qa: { roundFile: `qa/round-${++roundN}.md`, checks: [{ command: "npm test", exitCode: 0, logRef: "sessions/x/session.log" }], perTask: req.packet.taskIds.map((t) => ({ task: t, verdict: "verified" as const })), defects: [] },
    });
  }
  if (k === "feature-qa") {
    return out(req, { outputState: "PASS", featureQa: { phase: req.packet.planPhase ?? "1", roundFile: `qa/fqa-${++roundN}.md`, flows: [{ flow: "flow", ref: "AC-057", result: "PASS" as const }], defects: [] } });
  }
  if (k === "security") return out(req, { outputState: "PASS", security: { findings: [] } });
  return out(req, {}); // execution DONE
};

// --- fixture config — รูปเดียวกับ driver.test.ts (config ฉีดเข้า main — ไม่อ่าน config จริงของเครื่อง) ---
const ROUTES: RoutingConfig = {
  defaultCamp: "claude",
  role_routes: {
    "business-analyst": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/requirement/**", "knowledge/<module>/index.md"], deny: [] } },
    "system-analyst": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/design/**"], deny: [] } },
    "project-manager": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/plan/**"], deny: [] } },
    "test-planner": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/test-plan/**"], deny: [] } },
    "backend-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["codeRoots/**"], deny: [] } },
    "frontend-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["codeRoots/**"], deny: [] } },
    "reviewer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/review/**"], deny: [] } },
    "qa-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/qa/**", "knowledge/<module>/plan/index.md"], deny: [] } },
    "security": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/security.md"], deny: [] } },
  },
};
const TIERS: TiersConfig = {
  role_defaults: {
    "business-analyst": "T3", "system-analyst": "T2", "project-manager": "T2", "test-planner": "T3",
    "backend-engineer": "T5", "frontend-engineer": "T5", "reviewer": "T3", "qa-engineer": "T3", "security": "T2",
  },
  tiers: {
    T1: { reserved: true, camps: {} },
    T2: { reserved: false, camps: { claude: { model: "opus", effort: "high" } } },
    T3: { reserved: false, camps: { claude: { model: "opus", effort: "medium" } } },
    T5: { reserved: false, camps: { claude: { model: "sonnet", effort: "medium" } } },
  },
};
const CAMPS: CampsConfig = {
  defaults: { timeoutSec: 60, retryOnCrash: 0 },
  camps: {
    claude: { command: "fake-cli", headlessArgs: ["-p"], modelFlag: "--model", schemaFlag: null, rolePromptFlag: "--append-system-prompt-file", briefChannel: "stdin" },
    codex: { command: "fake-codex", headlessArgs: ["--json"], modelFlag: "-m", schemaFlag: null, rolePromptFlag: null, briefChannel: "packet-file" },
    antigravity: { command: "fake-agy", headlessArgs: ["-p"], modelFlag: "--model", schemaFlag: null, rolePromptFlag: null, briefChannel: "packet-file" },
  },
};
const GATES: GatesConfig = {
  owner_default: { name: "jtrp98" },
  gates: Object.fromEntries(KNOWN_GATES.map((g, i) => [g, {
    staGate: i + 1,
    trigger: g === "ux-signoff" || g === "deploy-real" || g === "release-cut" ? "structural" as const : "handoff" as const,
    owner: "owner_default",
  }])) as GatesConfig["gates"],
  channels: [],
};

// --- fixture module docs (split layout — ไฟล์บริบทตามตาราง DES-020) ---
const taskFile = (id: string, o: { security?: boolean } = {}): string => [
  "# T", "",
  "## Goal", "", "g", "",
  "## References", "", "- none", "",
  "## Scope", "",
  `- Write paths: \`codeRoots/${id.toLowerCase()}/**\``,
  "- Security-sensitive: " + (o.security === true ? "yes" : "no") + " (task file — DES-014)", "",
  "## Out of Scope", "", "x", "",
  "## Expected Output", "", "x", "",
  "## Acceptance", "", "- x", "",
  "## Dependencies", "", "- x", "",
  "## Handoff", "", "- DONE", "",
].join("\n");

const v2Plan = (rows: string[]): string => {
  const cells = (row: string): string[] => row.split("|").map((c) => c.trim());
  const labels = [...new Set(rows.map((r) => cells(r)[4] ?? ""))].filter((p) => p !== "").sort((a, b) => Number(a) - Number(b));
  const phaseRows = labels.map((p) =>
    `| ${p} | phase ${p} | ${rows.filter((r) => cells(r)[4] === p).map((r) => cells(r)[1]).join(", ")} | — |`);
  return [
    "# Plan", "",
    "## Phases", "",
    "| Phase | ชื่อ | Tasks | หมายเหตุ |", "|---|---|---|---|", ...phaseRows, "",
    "## Waiting on Human", "",
    "| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |", "|---|---|---|---|---|", "",
    "## Tasks", "",
    "| Task | Name | Owner | Phase | Depends | Status |", "|---|---|---|---|---|---|",
    ...rows, "",
  ].join("\n");
};

// วงจรครบ 2 phase (SEC-001 🔒 + anchor ต่อ phase) — จบ completed ได้ตาม DES-001
const FULL_ROWS = [
  "| BE-100 | base | backend-engineer | 1 | — | pending |",
  "| QA-100 | anchor1 | qa-engineer | 1 | BE-100 | pending |",
  "| SEC-001 | sens | backend-engineer | 2 | — | pending |",
  "| QA-200 | anchor2 | qa-engineer | 2 | SEC-001 | pending |",
];

interface World {
  home: string;
  adapter: FakeAdapter;
  config: AppConfig;
}

let worldN = 0;

function mkMainWorld(o: { staKnowledgePath?: string } = {}): World {
  worldN += 1;
  const root = path.join(tmp, `m${worldN}`);
  const home = path.join(root, "home");
  const docsRoot = path.join(root, "knowledge");
  const codeRoot = path.join(root, "target");
  const packRoot = path.join(root, "pack");
  const agents = path.join(packRoot, ".claude", "agents");
  const configDir = path.join(home, "config");
  const moduleDir = path.join(docsRoot, "alpha");
  mkdirSync(agents, { recursive: true });
  mkdirSync(configDir, { recursive: true });
  mkdirSync(codeRoot, { recursive: true });
  for (const sub of ["plan", "design", "requirement", "review"]) mkdirSync(path.join(moduleDir, sub), { recursive: true });
  for (const role of Object.keys(ROUTES.role_routes)) {
    writeFileSync(path.join(agents, `${role}.md`), `---\nname: ${role}\ntools: Read, Write, Edit, Glob, Grep, Bash\n---\n\nRole ${role} body.\n`);
  }
  for (const f of ["routing.yaml", "tiers.yaml", "camps.yaml", "gates.yaml"]) writeFileSync(path.join(configDir, f), `# fixture ${f}\n`);
  writeFileSync(path.join(moduleDir, "design", "index.md"), "# D\n\n| ID | ชื่อ | Traces | ไฟล์ |\n|---|---|---|---|\n| DES-901 | x | REQ-001 | des-901.md |\n");
  writeFileSync(path.join(moduleDir, "design", "data-model.md"), "dm\n");
  writeFileSync(path.join(moduleDir, "design", "des-901.md"), "d901\n");
  writeFileSync(path.join(moduleDir, "requirement", "index.md"), "# R\n\n| REQ | ชื่อ | Status | AC ids | ไฟล์ |\n|---|---|---|---|---|\n| REQ-001 | r | confirmed | AC-001 | req-001.md |\n");
  writeFileSync(path.join(moduleDir, "requirement", "scope.md"), "s\n");
  writeFileSync(path.join(moduleDir, "requirement", "req-001.md"), "r1\n");
  writeFileSync(path.join(moduleDir, "review", "index.md"), "# V\n\n| ID | task | severity | ไฟล์ |\n|---|---|---|---|\n| REV-001 | BE-100 | Important | round-1.md |\n");
  writeFileSync(path.join(moduleDir, "review", "round-1.md"), "round 1\n");
  writeFileSync(path.join(moduleDir, "security.md"), "sec\n");
  writeFileSync(path.join(moduleDir, "plan", "index.md"), v2Plan(FULL_ROWS));
  for (const id of ["BE-100", "QA-100", "QA-200"]) writeFileSync(path.join(moduleDir, "plan", `${id.toLowerCase()}.md`), taskFile(id));
  writeFileSync(path.join(moduleDir, "plan", "sec-001.md"), taskFile("SEC-001", { security: true })); // 🔒 phase 2 — security stage หลัง Feature QA (AC-080)

  const registry: RegistryConfig = {
    project: "t", docsLayout: "split", packRoot, rolePromptRoot: agents, templatesRoot: path.join(packRoot, "templates"),
    orchestratorHome: home, ui: { host: "127.0.0.1", port: 7800, openBrowser: false },
    scheduler: {
      maxParallelSessions: 3, fixRoundLimit: 2, crashRestartLimit: 1,
      reviewWave: { maxTasks: 4, maxDiffLines: 800 }, largeTask: { diffLines: 400, files: 10 },
    },
    audit: { manifestIgnore: ["node_modules/**", ".git/**"], preimageMaxMB: 20 },
  };
  const config: AppConfig = {
    orchestratorHome: home, configDir, staConfigPath: path.join(root, "sta-config.json"),
    registry, routing: ROUTES, tiers: TIERS, camps: CAMPS, gates: GATES,
    sta: {
      main_root: root,
      knowledge_roots: [{ name: "k", path: o.staKnowledgePath ?? docsRoot, targets: [{ name: "t", path: codeRoot }] }],
    },
  };
  return { home, adapter: new FakeAdapter((req) => DEFAULT(req)), config };
}

const ARGS = ["k", "t", "alpha", "--date", "2026-10-06"];
const collect = (): { lines: string[]; out: (line: string) => void } => {
  const lines: string[] = [];
  return { lines, out: (l: string): void => void lines.push(l) };
};

// --- args ไม่ครบ / flag แปลก / --date หาย → usage + ปฏิเสธ (ไม่แตะ config ไม่แตะ state) ---
test("main: args ไม่ครบ / --date หาย / arg ไม่รู้จัก → usage + ปฏิเสธ (ระบบไม่เดาวันที่)", async () => {
  const w = mkMainWorld();
  const a = collect();
  const noArgs = await main({ argv: [], config: w.config, adapters: { claude: w.adapter }, out: a.out });
  assert.equal(noArgs.code, 1);
  assert.ok(a.lines.some((l) => l.startsWith("usage:")), "พิมพ์ usage");

  const b = collect();
  const noDate = await main({ argv: ["k", "t", "alpha"], config: w.config, adapters: { claude: w.adapter }, out: b.out });
  assert.equal(noDate.code, 1);
  assert.ok(b.lines.some((l) => l.includes("--date") && l.includes("ไม่เดาวันที่")));

  const c = collect();
  const badFlag = await main({ argv: [...ARGS, "--wat"], config: w.config, adapters: { claude: w.adapter }, out: c.out });
  assert.equal(badFlag.code, 1);
  assert.ok(c.lines.some((l) => l.includes("arg ไม่รู้จัก: --wat")));
  assert.equal(existsSync(path.join(w.home, "state")), false, "ยังไม่มี state ใดเกิดขึ้น");
});

// --- path ไม่มีจริง → ปฏิเสธ run พร้อม path ก่อนแตะ state (DES-015 fail-closed — REV-045) ---
test("main: path ของ knowledge root ไม่มีจริง → ปฏิเสธ run พร้อม path · ไม่เขียน state", async () => {
  const missing = path.join(tmp, `m${worldN + 1}-ไม่มีจริง`);
  const w = mkMainWorld({ staKnowledgePath: missing });
  const a = collect();
  const res = await main({ argv: ARGS, config: w.config, adapters: { claude: w.adapter }, out: a.out });
  assert.equal(res.code, 1);
  assert.ok(a.lines.some((l) => l.includes("ปฏิเสธ run") && l.includes(missing)), `ต้องรายงาน path: ${a.lines.join(" | ")}`);
  assert.equal(res.driver, null);
  assert.equal(existsSync(path.join(w.home, "state")), false, "ไม่สร้าง run/state");
  assert.equal(w.adapter.dispatched.length, 0, "ไม่มี dispatch");
});

// --- เริ่ม run ใหม่ผ่าน driver — fake adapter เท่านั้น (ไม่ spawn CLI) · วงจรเดินจน completed ---
test("main: เริ่ม run ใหม่ → driver วิ่งครบวงจรด้วย fake adapter (ไม่มี spawn จริง) → completed", async () => {
  const w = mkMainWorld();
  const a = collect();
  const res = await main({ argv: ARGS, config: w.config, adapters: { claude: w.adapter }, out: a.out });
  assert.equal(res.code, 0);
  assert.ok(res.driver !== null && res.driver.run !== null);
  const run = res.driver!.run!;
  assert.equal(run.status, "completed");
  assert.equal(run.module, "alpha");
  const kinds = new Set<SessionKind>(w.adapter.dispatched.map((r) => r.packet.kind));
  for (const k of ["execution", "review", "qa", "feature-qa", "security"] as const satisfies readonly SessionKind[]) {
    assert.ok(kinds.has(k), `ต้องมี dispatch ชนิด ${k} ผ่าน adapter (fake)`);
  }
  assert.ok(a.lines.some((l) => l.startsWith("เริ่ม run ") && l.includes("k → target t")), `บรรทัดเริ่ม run: ${a.lines[0] ?? "-"}`);
  assert.ok(a.lines.some((l) => l.includes("สถานะ completed")));
  assert.ok(existsSync(path.join(w.home, "state", "modules", "alpha.json")), "pointer ต่อ module ถูกสร้าง");
});

// --- resume — ไม่มี pointer → ปฏิเสธ · หลัง start → run เดิม (pointer) ---
test("main: resume ไม่มี pointer → ปฏิเสธ · resume หลัง start → run เดิมตาม pointer", async () => {
  const w = mkMainWorld();
  const a = collect();
  const noPointer = await main({ argv: [...ARGS, "--resume"], config: w.config, adapters: { claude: w.adapter }, out: a.out });
  assert.equal(noPointer.code, 1);
  assert.ok(a.lines.some((l) => l.includes("ไม่มี pointer")), `ต้องปฏิเสธด้วยข้อความ pointer: ${a.lines.join(" | ")}`);

  const b = collect();
  const started = await main({ argv: ARGS, config: w.config, adapters: { claude: w.adapter }, out: b.out });
  assert.equal(started.code, 0);
  const c = collect();
  const resumed = await main({ argv: [...ARGS, "--resume"], config: w.config, adapters: { claude: w.adapter }, out: c.out });
  assert.equal(resumed.code, 0);
  assert.equal(resumed.driver!.run!.runId, started.driver!.run!.runId, "resume โหลด run เดิมจาก pointer");
  assert.ok(c.lines.some((l) => l.startsWith("resume run ")));
  assert.equal(w.adapter.dispatched.filter((r) => r.packet.kind === "execution").length, FULL_ROWS.filter((r) => !r.includes("qa-engineer")).length, "execution ไม่ถูก dispatch ซ้ำหลัง completed");
});
