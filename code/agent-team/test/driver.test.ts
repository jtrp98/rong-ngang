// BE-011 — Pipeline driver integration (DES-001/007/018/019) — node:test + fake CampAdapter + fake clock (ห้าม spawn CLI จริง)
// Acceptance ของ BE-011: วงจรต่อเนื่อง เริ่ม run → execution → review wave → QA round → fix → verified (AC-057 · satisfied(anchor))
// · gate hold/answer (AC-013/072/078) · kill-restart resume (AC-066/AC-003) · cap concurrency (AC-045) · DAG (AC-043/AC-044)
// · session policy (AC-040/041/042) · design chain (AC-062/064) · crash limit (AC-075) · legacy (AC-074) · Depends แก้สด (AC-037)
// · dep-error/plan-error + dependents (AC-039/AC-079) · security stage หลัง Feature QA (AC-080) · audit → R2 · ไม่ถาม LLM (AC-067)
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { KNOWN_GATES, type AppConfig, type CampProfile, type CampsConfig, type GatesConfig, type RegistryConfig, type RoutingConfig, type TiersConfig } from "../src/core/config.ts";
import type { CampAdapter, CampDispatch, CampOutcome, CampSessionHandle } from "../src/core/contract/camp-adapter.ts";
import type { HandoffV2 } from "../src/core/state-store.ts";
import { PipelineDriver, type DriverOptions } from "../src/core/driver.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be011-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

let roundN = 0;

// --- fake adapter — canned outcome ต่อ dispatch, "hold" = ค้างจน release/kill ---
class FakeAdapter implements CampAdapter {
  readonly camp = "claude" as const;
  readonly profile: CampProfile = {
    command: "fake-cli", headlessArgs: ["-p"], modelFlag: "--model", schemaFlag: null,
    rolePromptFlag: "--append-system-prompt-file", briefChannel: "stdin",
  };
  dispatched: CampDispatch[] = [];
  killed: string[] = [];
  private resolvers = new Map<number, (o: CampOutcome) => void>();

  constructor(private responder: (req: CampDispatch, nth: number) => CampOutcome | "hold") {}

  dispatch(req: CampDispatch): CampSessionHandle {
    const nth = this.dispatched.push(req) - 1;
    const r = this.responder(req, nth);
    const pid = 40000 + nth; // pid ปลอม — ไม่มีอยู่จริง → resume ข้าม kill ได้
    if (r === "hold") {
      return {
        pid,
        outcome: new Promise<CampOutcome>((resolve) => {
          this.resolvers.set(nth, resolve);
        }),
        kill: (reason: string) => {
          this.killed.push(reason);
          this.release(nth, { exitCode: null, handoffRaw: null, cliSessionId: null, cliVersion: null, logsPath: null, failure: "interrupted" });
        },
      };
    }
    return { pid, outcome: Promise.resolve(r), kill: (reason: string) => this.killed.push(reason) };
  }

  release(nth: number, outcome: CampOutcome): void {
    const res = this.resolvers.get(nth);
    if (res !== undefined) {
      this.resolvers.delete(nth);
      res(outcome);
    }
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

const pass = (o: CampOutcome): CampOutcome => o;
type Behavior = (req: CampDispatch, nth: number) => CampOutcome | "hold";

const DEFAULT: Behavior = (req) => {
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
  if (k === "change") return out(req, { outputState: "DONE", impactedTasks: req.packet.role === "project-manager" ? [] : null });
  return out(req, {}); // execution DONE
};

// --- fixture config (BE-001 รูปเดียวกับ config\*.yaml จริง — ย่อเฉพาะ role ที่แผนผู้ใช้) ---
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

// --- fixture module docs (split layout) ---
const taskFile = (id: string, o: { writePaths?: string; security?: boolean; group?: string } = {}): string => {
  const wp = o.writePaths ?? `codeRoots/${id.toLowerCase()}/**`;
  return [
    "# T", "",
    "## Goal", "", "g", "",
    "## References", "", "- none", "",
    "## Scope", "",
    "- Write paths: `" + wp + "`",
    "- Security-sensitive: " + (o.security === true ? "yes" : "no") + " (task file — DES-014)",
    ...(o.group !== undefined ? ["- Session group: " + o.group] : []),
    "", "## Out of Scope", "", "x", "",
    "## Expected Output", "", "x", "",
    "## Acceptance", "", "- x", "",
    "## Dependencies", "", "- x", "",
    "## Handoff", "", "- DONE", "",
  ].join("\n");
};

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

interface World {
  root: string;
  home: string;
  docsRoot: string;
  codeRoot: string;
  planPath: string;
  adapter: FakeAdapter;
  config: AppConfig;
  now: () => Date;
  setBehavior: (b: Behavior) => void;
  driver: (over?: Partial<DriverOptions>) => PipelineDriver;
  runDir: (d: PipelineDriver) => string;
}

let worldN = 0;

function mkWorld(o: { maxParallel?: number; fixRoundLimit?: number; crashRestartLimit?: number; behavior?: Behavior } = {}): World {
  worldN += 1;
  const root = path.join(tmp, `w${worldN}`);
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
  mkdirSync(path.join(moduleDir, "plan"), { recursive: true });
  mkdirSync(path.join(moduleDir, "design"), { recursive: true });
  mkdirSync(path.join(moduleDir, "requirement"), { recursive: true });
  mkdirSync(path.join(moduleDir, "review"), { recursive: true });
  for (const role of Object.keys(ROUTES.role_routes)) {
    writeFileSync(path.join(agents, `${role}.md`), `---\nname: ${role}\ntools: Read, Write, Edit, Glob, Grep, Bash\n---\n\nRole ${role} body.\n`);
  }
  for (const f of ["routing.yaml", "tiers.yaml", "camps.yaml", "gates.yaml"]) writeFileSync(path.join(configDir, f), `# fixture ${f}\n`);
  // ไฟล์บริบทตามตาราง DES-020 — qa ใช้ design/data-model · SA/PM ใช้ design + requirement
  writeFileSync(path.join(moduleDir, "design", "index.md"), "# D\n\n| ID | ชื่อ | Traces | ไฟล์ |\n|---|---|---|---|\n| DES-901 | x | REQ-001 | des-901.md |\n");
  writeFileSync(path.join(moduleDir, "design", "data-model.md"), "dm\n");
  writeFileSync(path.join(moduleDir, "design", "des-901.md"), "d901\n");
  writeFileSync(path.join(moduleDir, "requirement", "index.md"), "# R\n\n| REQ | ชื่อ | Status | AC ids | ไฟล์ |\n|---|---|---|---|---|\n| REQ-001 | r | confirmed | AC-001 | req-001.md |\n");
  writeFileSync(path.join(moduleDir, "requirement", "scope.md"), "s\n");
  writeFileSync(path.join(moduleDir, "requirement", "req-001.md"), "r1\n");
  // ตาราง finding ของ review (DES-020) — defect packet ของ fix session resolve REV-001 จาก index นี้
  writeFileSync(path.join(moduleDir, "review", "index.md"), "# V\n\n| ID | task | severity | ไฟล์ |\n|---|---|---|---|\n| REV-001 | BE-100 | Important | round-1.md |\n");
  writeFileSync(path.join(moduleDir, "review", "round-1.md"), "round 1\n");
  writeFileSync(path.join(moduleDir, "security.md"), "sec\n");

  const registry: RegistryConfig = {
    project: "t", docsLayout: "split", packRoot, rolePromptRoot: agents, templatesRoot: path.join(packRoot, "templates"),
    orchestratorHome: home, ui: { host: "127.0.0.1", port: 7800, openBrowser: false },
    scheduler: {
      maxParallelSessions: o.maxParallel ?? 3, fixRoundLimit: o.fixRoundLimit ?? 2, crashRestartLimit: o.crashRestartLimit ?? 1,
      reviewWave: { maxTasks: 4, maxDiffLines: 800 }, largeTask: { diffLines: 400, files: 10 },
    },
    audit: { manifestIgnore: ["node_modules/**", ".git/**"], preimageMaxMB: 20 },
  };
  const config: AppConfig = {
    orchestratorHome: home, configDir, staConfigPath: path.join(root, "sta-config.json"),
    registry, routing: ROUTES, tiers: TIERS, camps: CAMPS, gates: GATES,
    sta: { main_root: root, knowledge_roots: [{ name: "k", path: docsRoot, targets: [{ name: "t", path: codeRoot }] }] },
  };

  let clock = 0;
  const now = (): Date => new Date(Date.UTC(2026, 9, 6, 0, 0, clock++));
  let behavior: Behavior = o.behavior ?? DEFAULT;
  const adapter = new FakeAdapter((req, nth) => behavior(req, nth));
  const planPath = path.join(moduleDir, "plan", "index.md");

  const writeTasks = (tasks: Record<string, string>): void => {
    for (const [id, body] of Object.entries(tasks)) writeFileSync(path.join(moduleDir, "plan", `${id.toLowerCase()}.md`), body);
  };

  const w: World = {
    root, home, docsRoot, codeRoot, planPath, adapter, config,
    now,
    setBehavior: (b) => {
      behavior = b;
    },
    driver: (over: Partial<DriverOptions> = {}) =>
      new PipelineDriver({
        config, selection: { knowledge: "k", target: "t" }, module: "alpha",
        dateFromUser: "2026-10-06", adapters: { claude: adapter }, now, ...over,
      }),
    runDir: (d: PipelineDriver) => path.join(home, "state", "runs", d.run!.runId),
  };
  void writeTasks;
  (w as World & { writeTasks?: typeof writeTasks }).writeTasks = writeTasks;
  return w as World & { writeTasks: typeof writeTasks };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
};

const kindSeq = (d: PipelineDriver): string[] =>
  (d.run?.sessions ?? []).slice().sort((a, b) => a.seq - b.seq).map((s) => `${s.kind}:${s.taskIds.join("+")}`);

const execSessions = (d: PipelineDriver) => (d.run?.sessions ?? []).filter((s) => s.kind === "execution");
const sessionOf = (d: PipelineDriver, kind: string, taskId: string) =>
  (d.run?.sessions ?? []).find((s) => s.kind === kind && s.taskIds.includes(taskId));

// plan module ครบวงจร 2 phase — phase 2 มี Security-sensitive + FE dependent ของ anchor (ทดสอบ cleared + ไม่ deadlock)
const FULL_ROWS = [
  "| BE-100 | base | backend-engineer | 1 | — | pending |",
  "| BE-101 | dep | backend-engineer | 1 | BE-100 | pending |",
  "| QA-100 | anchor1 | qa-engineer | 1 | BE-101 | pending |",
  "| SEC-001 | sens | backend-engineer | 2 | — | pending |",
  "| QA-200 | anchor2 | qa-engineer | 2 | SEC-001 | pending |",
  "| FE-300 | post | frontend-engineer | 2 | QA-200 | pending |",
];

function writeFullModule(w: World & { writeTasks: (t: Record<string, string>) => void }): void {
  writeFileSync(w.planPath, v2Plan(FULL_ROWS));
  w.writeTasks({
    "BE-100": taskFile("BE-100"), "BE-101": taskFile("BE-101"),
    "QA-100": taskFile("QA-100"), "SEC-001": taskFile("SEC-001", { security: true }),
    "QA-200": taskFile("QA-200"), "FE-300": taskFile("FE-300"),
  });
}

// --- AC-043 + AC-040: task อิสระสองตัวถูก dispatch พร้อมกัน — session แยก id ไม่ซ้ำ ---
test("AC-043/AC-040: สอง task ไม่ขึ้นต่อกัน → execution สอง session พร้อมกัน, id ต่อ task ไม่ซ้ำ", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| BE-200 | b | backend-engineer | 1 | — | pending |"]));
  w.setBehavior((req) => (req.packet.kind === "execution" ? "hold" : DEFAULT(req))); // ค้างทั้งคู่ — พิสูจน์ running พร้อมกัน
  const d = w.driver();
  d.start();
  await flush();
  const execs = execSessions(d);
  assert.equal(execs.length, 2); // ทั้งคู่ active พร้อมกัน (ไม่รอกันจบ)
  assert.deepEqual(execs.map((s) => s.taskIds), [["BE-100"], ["BE-200"]]);
  assert.equal(new Set(execs.map((s) => s.sessionId)).size, 2); // AC-040 — id ไม่ซ้ำ
  assert.equal(d.run!.tasks["BE-100"]!.currentSessionId, execs.find((s) => s.taskIds[0] === "BE-100")!.sessionId);
  assert.equal(d.run!.tasks["BE-200"]!.currentSessionId, execs.find((s) => s.taskIds[0] === "BE-200")!.sessionId);
  assert.equal(d.run!.status, "running");
  for (let i = 0; i < w.adapter.dispatched.length; i++) w.adapter.release(i, out(w.adapter.dispatched[i]!, {}));
  await d.settle();
  assert.equal(d.run!.tasks["BE-100"]!.step, "verified"); // ปลดแล้ว pipeline เดินต่อจนครบ (ไม่มี anchor → ไม่มี Feature QA)
});

// --- AC-045: เพดาน session — เกิน → คิว, เริ่มเมื่อมีที่ว่าง ---
test("AC-045: cap 2 กับ 3 task runnable → 2 ตัวรัน 1 ตัวคิว · ตัวใดจบ → คิวเริ่ม", async () => {
  const w = mkWorld({ maxParallel: 2 });
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({
    "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200"), "BE-300": taskFile("BE-300"),
  });
  writeFileSync(w.planPath, v2Plan([
    "| BE-100 | a | backend-engineer | 1 | — | pending |",
    "| BE-200 | b | backend-engineer | 1 | — | pending |",
    "| BE-300 | c | backend-engineer | 1 | — | pending |",
  ]));
  const holds: number[] = [];
  w.setBehavior((req, nth) => (req.packet.kind === "execution" && holds.filter((h) => h <= nth).length < 2 ? "hold" : DEFAULT(req, nth)));
  const d = w.driver();
  d.start();
  await flush();
  assert.equal(d.activeCount, 2); // เพดาน 2
  assert.equal(d.run!.tasks["BE-300"]!.step, "runnable"); // คิว — ยังไม่ได้ session
  const first = w.adapter.dispatched.findIndex((r) => r.packet.kind === "execution");
  w.adapter.release(first, out(w.adapter.dispatched[first]!, {})); // ตัวแรกจบ
  await flush();
  assert.ok(execSessions(d).some((s) => s.taskIds.includes("BE-300")), "คิวเริ่มเมื่อมีที่ว่าง");
  // ปลดที่เหลือให้หมด
  for (let i = 0; i < w.adapter.dispatched.length; i++) w.adapter.release(i, out(w.adapter.dispatched[i]!, {}));
  await d.settle();
});

// --- AC-044: FE รอ BE verified — task อื่นรันระหว่างนั้นได้ ---
test("AC-044: FE ที่ Depends ถึง BE ไม่ถูก dispatch จน BE verified · task อื่นรันระหว่างนั้น", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({
    "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200"), "FE-100": taskFile("FE-100"),
  });
  writeFileSync(w.planPath, v2Plan([
    "| BE-100 | a | backend-engineer | 1 | — | pending |",
    "| BE-200 | b | backend-engineer | 1 | — | pending |",
    "| FE-100 | c | frontend-engineer | 1 | BE-100 | pending |",
  ]));
  const d = w.driver();
  d.start();
  await d.settle();
  const order = w.adapter.dispatched.map((r) => `${r.packet.kind}:${r.packet.taskIds.join("+")}`);
  const feIdx = order.findIndex((x) => x.startsWith("execution:FE-100"));
  const qaIdx = order.findIndex((x) => x.startsWith("qa:"));
  assert.ok(qaIdx >= 0 && feIdx > qaIdx, `FE-100 ต้องหลัง qa ของ BE-100 — ลำดับ: ${order.join(" | ")}`);
  assert.equal(execSessions(d).filter((s) => s.taskIds.includes("FE-100")).length, 1, "FE-100 ได้ execution เพียงครั้งเดียว");
  assert.equal(d.run!.tasks["BE-100"]!.step, "verified");
});

// --- วงจรต่อเนื่องครบ (AC-057 + satisfied(anchor) + AC-080 + status write-back + journal + router.log + AC-067) ---
test("วงจรครบ: execution → review wave → QA round → verified → Feature QA → security (🔒) → cleared → completed", async () => {
  const w = mkWorld();
  writeFullModule(w as World & { writeTasks: (t: Record<string, string>) => void });
  const d = w.driver();
  d.start();
  const run = await d.settle();

  assert.equal(run!.status, "completed");
  assert.equal(run!.phases["1"]!.cleared, true);
  assert.equal(run!.phases["2"]!.cleared, true);
  assert.ok(Object.values(run!.tasks).every((t) => t.step === "verified"), "ทุก task verified (รวม anchor + FE dependent ของ anchor — ไม่ deadlock)");

  // plan/index.md — orchestrator เขียน Status เอง (AC-073)
  const planText = readFileSync(w.planPath, "utf8");
  for (const id of ["BE-100", "BE-101", "QA-100", "SEC-001", "QA-200", "FE-300"]) {
    assert.ok(new RegExp(`\\| ${id} \\|.*\\| verified \\|`).test(planText), `${id} ต้อง verified ใน plan`);
  }
  // self-write journal (DES-021 ข้อ 4)
  const journal = readFileSync(path.join(w.runDir(d), "status-journal.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { decisionRuleId: string });
  assert.ok(journal.some((j) => j.decisionRuleId === "R6"));
  assert.ok(journal.some((j) => j.decisionRuleId === "R19"));

  // Feature QA เปิดเองเมื่อ phase verified ครบ (AC-057) · security stage หลัง Feature QA PASS เท่านั้น (AC-080)
  const seq = kindSeq(d);
  const fqa1 = seq.findIndex((s) => s.startsWith("feature-qa:QA-100"));
  const fqa2 = seq.findIndex((s) => s.startsWith("feature-qa:QA-200"));
  const sec = seq.findIndex((s) => s.startsWith("security:"));
  assert.ok(fqa1 >= 0 && fqa2 >= 0 && sec >= 0, `ต้องมี feature-qa 2 phase + security — ${seq.join(" | ")}`);
  assert.ok(fqa2 < sec, "security ต้องหลัง Feature QA ของ phase 2");
  const secSession = (run!.sessions ?? []).find((s) => s.kind === "security");
  assert.deepEqual([...secSession!.taskIds].sort(), ["QA-200", "SEC-001"]); // task verified ของ phase
  assert.equal(d.run!.tasks["QA-100"]!.lastVerdict!.source, "feature-qa");

  // anchor ได้ execution ไม่ได้ — เดินด้วย R18 (DES-019)
  assert.equal(execSessions(d).some((s) => s.taskIds.includes("QA-100")), false);

  // AC-067 + router.log — ทุกบรรทัดเป็นกฎตายตัว ไม่มีขั้นถาม LLM
  const log = readFileSync(path.join(w.home, "state", "router.log"), "utf8").trim().split("\n");
  const allowed = new Set([...Array.from({ length: 24 }, (_, i) => `R${i + 1}`), "dispatch", "run-status", "gate-answered", "resume"]);
  for (const line of log) {
    const rec = JSON.parse(line) as { ruleId: string };
    assert.ok(allowed.has(rec.ruleId), `ruleId แปลก: ${rec.ruleId}`);
    assert.ok(!/llm|ถาม model/i.test(line));
  }
});

// --- review wave + AC-042 (reviewer = 1 wave) + reviewInput ---
test("review wave: สอง task awaiting-review → session เดียว taskIds ครบ + reviewInput ต่อ task (AC-042/AC-051)", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| BE-200 | b | backend-engineer | 1 | — | pending |"]));
  const d = w.driver();
  d.start();
  await d.settle();
  const reviews = (d.run?.sessions ?? []).filter((s) => s.kind === "review");
  assert.equal(reviews.length, 1); // wave เดียว — reviewer session ต่อ module ทีละตัว
  assert.deepEqual([...reviews[0]!.taskIds].sort(), ["BE-100", "BE-200"]);
  const req = w.adapter.dispatched.find((r) => r.packet.kind === "review")!;
  assert.equal(req.packet.reviewInput!.tasks.length, 2);
  assert.deepEqual(req.packet.reviewInput!.tasks.map((t) => t.taskId).sort(), ["BE-100", "BE-200"]);
  assert.ok(req.packet.readSections.some((p) => p.includes("be-100.md")), "packet แนบ task file ของ wave (DES-020)");
});

// --- REV-046: driver ส่งลำดับแถว plan (rowOrder) เข้า reviewDispatches — wave pack ตามตาราง ไม่ใช่ id ---
test("review wave เรียงตามลำดับแถว plan ไม่ใช่ taskId (REV-046) — BE-200 (แถวแรก) ก่อน BE-100", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, v2Plan(["| BE-200 | b | backend-engineer | 1 | — | pending |", "| BE-100 | a | backend-engineer | 1 | — | pending |"]));
  const d = w.driver();
  d.start();
  await d.settle();
  const review = (d.run?.sessions ?? []).find((s) => s.kind === "review");
  assert.ok(review !== undefined, "wave เดียวรวมสอง task");
  assert.deepEqual(review!.taskIds, ["BE-200", "BE-100"]); // ตามลำดับแถวในตาราง — localeCompare จะให้ ["BE-100","BE-200"]
});

// --- QA round — รวมผู้สมัคร ณ ตอนเปิด, หลัง execution ใน phase จบ (quiesce — DES-019 ข้อ 3) ---
test("QA round: เปิดหลัง execution ใน phase จบ — รวม awaiting-qa ทั้งหมด ณ ตอนนั้น (AC-042/AC-054)", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| BE-200 | b | backend-engineer | 1 | — | pending |"]));
  const holdExec: number[] = [];
  w.setBehavior((req, nth) => {
    if (req.packet.kind === "execution" && nth === 0) {
      holdExec.push(nth);
      return "hold"; // BE-100 ค้าง — BE-200 เดินก่อน
    }
    return DEFAULT(req, nth);
  });
  const d = w.driver();
  d.start();
  await flush();
  assert.equal((d.run?.sessions ?? []).some((s) => s.kind === "qa"), false, "ยังมี execution ใน phase — ยังไม่เปิด round");
  w.adapter.release(0, out(w.adapter.dispatched[0]!, {}));
  await d.settle();
  const qa = (d.run?.sessions ?? []).find((s) => s.kind === "qa");
  assert.ok(qa !== undefined);
  assert.deepEqual([...qa!.taskIds].sort(), ["BE-100", "BE-200"]); // รวมทุกตัว ณ ตอนเปิด
  assert.equal(d.run!.tasks["BE-100"]!.step, "verified");
  assert.equal(d.run!.tasks["BE-200"]!.step, "verified");
});

// --- AC-062 + AC-064: design chain (SA → PM → dispatch ใหม่) + task นอก impact รันต่อ ---
test("AC-062/AC-064: NEEDS_DESIGN_CHANGE → hold + SA → PM → impacted dispatch ใหม่ · task นอก impact ไม่หยุด", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| BE-200 | b | backend-engineer | 1 | — | pending |"]));
  let be100Exec = 0;
  w.setBehavior((req, nth) => {
    if (req.packet.kind === "execution" && req.packet.taskIds.includes("BE-100")) {
      be100Exec += 1;
      if (be100Exec === 1) {
        return out(req, { outputState: "NEEDS_DESIGN_CHANGE", blocker: { type: "design", task: "BE-100", reference: "DES-901", reason: "contract ขัด" } });
      }
      return out(req, {}); // ครั้งถัดไป (หลัง PM replan) ทำงานสำเร็จ — กัน chain วนไม่จบ
    }
    if (req.packet.kind === "execution" && req.packet.taskIds.includes("BE-200")) return "hold"; // ค้างระหว่าง chain
    if (req.packet.kind === "change" && req.packet.role === "system-analyst") return out(req, { outputState: "DONE" });
    if (req.packet.kind === "change" && req.packet.role === "project-manager") return out(req, { outputState: "DONE", impactedTasks: ["BE-100"] });
    return DEFAULT(req, nth);
  });
  const d = w.driver();
  d.start();
  await flush();
  const sa = sessionOf(d, "change", "BE-100");
  assert.ok(sa !== undefined && sa!.role === "system-analyst");
  // R10 hold ลง router.log (หลังจากนั้น R13 อาจปลดแล้ว — BE-100 อยู่ใน impactedTasks)
  const log = readFileSync(path.join(w.home, "state", "router.log"), "utf8");
  assert.ok(log.includes('"ruleId":"R10"') && log.includes("DES-901") && log.includes("NEEDS_DESIGN_CHANGE"), "R10 — hold design-change (ref DES-id) ลง router.log");
  const be200 = execSessions(d).find((s) => s.taskIds.includes("BE-200"));
  assert.ok(be200 !== undefined && be200!.endedAt === null, "AC-064 — task นอก impact ยัง running");
  await flush();
  await flush();
  const pm = (d.run?.sessions ?? []).find((s) => s.kind === "change" && s.role === "project-manager");
  assert.ok(pm !== undefined, "SA DONE → PM (R10)");
  await flush();
  const execsBE100 = execSessions(d).filter((s) => s.taskIds.includes("BE-100"));
  assert.equal(execsBE100.length, 2, "PM DONE impactedTasks → session ใหม่ (R13)");
  assert.equal(d.run!.tasks["BE-100"]!.attempt, 2);
  assert.equal(d.run!.tasks["BE-100"]!.fixRounds, 0, "R13 ไม่นับรอบ");
  w.adapter.release(1, out(w.adapter.dispatched[1]!, {})); // ปลด BE-200
  await d.settle();
  assert.equal(d.run!.tasks["BE-100"]!.step, "verified");
});

// --- gate NEEDS_HUMAN + answer + record-only (AC-013/AC-072/AC-078) ---
test("gate: NEEDS_HUMAN → hold + waiting-on-human · answer → ปลด + record-only session + task เดินต่อ", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |"]));
  let execN = 0;
  w.setBehavior((req) => {
    if (req.packet.kind === "execution") {
      execN += 1;
      if (execN === 1) {
        return out(req, { outputState: "NEEDS_HUMAN", questionsForHuman: [{ gate: "business-choice", question: "เลือกแผนไหน", owner: "jtrp98", touchesSchemaOrContract: null }] });
      }
      return out(req, {}); // ครั้งถัดไป (หลังตอบ gate) ทำงานสำเร็จ
    }
    return DEFAULT(req);
  });
  const d = w.driver();
  d.start();
  await flush();
  const gate = d.openGates().find((g) => g.gateId === "business-choice");
  assert.ok(gate !== undefined);
  assert.equal(gate!.owner.name, "jtrp98"); // owner จาก gates.yaml (AC-015)
  assert.equal(gate!.scope, "task");
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "gate");
  assert.equal(d.run!.status, "waiting-on-human");
  d.answerGate("business-choice", { answeredBy: "jtrp98", answer: "ทำตามแผนเดิม" });
  await flush();
  assert.equal(d.openGates().length, 0);
  const recordOnly = (d.run?.sessions ?? []).find((s) => s.kind === "record-only");
  assert.ok(recordOnly !== undefined, "R22 — record-only จดคำตอบ (OQ-D3)");
  assert.equal(recordOnly!.role, "business-analyst");
  assert.ok(execSessions(d).length >= 2, "task กลับ step เดิม (execution) แล้ว re-dispatch");
  await d.settle();
  assert.equal(d.run!.tasks["BE-100"]!.step, "verified");
  assert.equal(d.run!.status, "completed");
});

// --- gate 4 (R5): review FAIL ครบ fixRoundLimit — answer ไม่ปลด, humanRetry ปลด (AC-071/AC-076) ---
test("gate 4: review FAIL ครบ limit → hold qa-critical · answerGate ไม่ปลด · humanRetry ปลด (ตัวนับคงเดิม)", async () => {
  const w = mkWorld({ fixRoundLimit: 1 });
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |"]));
  const failReview = (req: CampDispatch): CampOutcome =>
    out(req, {
      outputState: "FAIL",
      review: {
        roundFile: "review/round-1.md", perTask: [{ task: "BE-100", verdict: "FAIL" }],
        findings: [{ id: "REV-001", severity: "Important", task: "BE-100", location: "a.ts:1", problem: "p", reference: "DES-901" }],
      },
    });
  w.setBehavior((req, nth) => (req.packet.kind === "review" ? failReview(req) : DEFAULT(req, nth)));
  const d = w.driver();
  d.start();
  await flush();
  assert.equal(d.run!.tasks["BE-100"]!.fixRounds, 1, "R4 — fix round แรก");
  assert.ok(existsSync(path.join(w.runDir(d), "defects", "BE-100-1.json")), "defect packet ของ fix session (AC-055)");
  await flush();
  await flush();
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "gate"); // R5 — fail ครั้งที่ 2 == limit
  assert.equal(d.run!.tasks["BE-100"]!.hold!.ref, "qa-critical");
  assert.ok(d.openGates().some((g) => g.gateId === "qa-critical"));
  assert.equal(d.run!.status, "waiting-on-human");
  assert.equal(d.run!.tasks["BE-100"]!.fixRounds, 1, "R5 ไม่นับรอบเกิน limit");
  d.answerGate("qa-critical", { answeredBy: "jtrp98", answer: "รับทราบ" });
  await flush();
  assert.equal(d.run!.tasks["BE-100"]!.hold!.ref, "qa-critical", "gate 4 ตอบแล้วยังค้าง — รอ retry (R22)");
  const reviewsBeforeRetry = (d.run?.sessions ?? []).filter((s) => s.kind === "review").length;
  d.humanRetry(["BE-100"], { by: "jtrp98", note: "แก้ตาม review แล้ว" });
  await flush();
  // R22 — task กลับ "step เดิม" (= review จุดที่ fail) → review session ใหม่
  assert.ok((d.run?.sessions ?? []).filter((s) => s.kind === "review").length > reviewsBeforeRetry, "retry → session ใหม่ของ step เดิม");
  assert.equal(d.run!.tasks["BE-100"]!.fixRounds, 1, "retry ของคนไม่ reset ตัวนับ");
  await d.settle();
  // review FAIL อีกครั้งหลัง retry — ครบ limit แล้ว → R5 hold gate 4 ซ้ำ (retry ไม่ reset ตัวนับ)
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "gate");
  assert.equal(d.run!.tasks["BE-100"]!.hold!.ref, "qa-critical");
});

// --- AC-075: crash → R16 restart — crash ซ้ำครบ limit → R17 hold crash-limit ---
test("AC-075: crash แรก → R16 session ใหม่ + priorSession · crash ซ้ำ → R17 hold crash-limit (fixRounds ไม่ขยับ)", async () => {
  const w = mkWorld({ crashRestartLimit: 1 });
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |"]));
  w.setBehavior((req, nth) => (req.packet.kind === "execution"
    ? { exitCode: 1, handoffRaw: null, cliSessionId: null, cliVersion: null, logsPath: null, failure: "crash" }
    : DEFAULT(req, nth)));
  const d = w.driver();
  d.start();
  await flush();
  assert.equal(d.run!.tasks["BE-100"]!.crashRestarts, 1, "R16 — restart 1 ครั้ง");
  assert.equal(d.run!.tasks["BE-100"]!.fixRounds, 0, "crash ไม่นับ fix round");
  assert.equal(execSessions(d).length, 2, "session ใหม่แทนที่ตัวล่ม");
  const restarted = execSessions(d)[1]!;
  assert.deepEqual(restarted.priorSession, { sessionId: execSessions(d)[0]!.sessionId, touchedFiles: [] });
  await flush();
  await flush();
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "crash-limit", "R17 — crash ครบ limit");
  assert.equal(d.run!.status, "waiting-on-human");
  assert.equal(d.run!.tasks["BE-100"]!.fixRounds, 0, "AC-075 — fixRounds ไม่เพิ่มจากการ crash");
});

// --- AC-066: kill-restart — resume แล้ว session ใหม่ + priorSession.touchedFiles · ไฟล์ไม่ถูก revert ---
test("AC-066: ปิด orchestrator ขณะรัน → เปิดใหม่ resume — session ใหม่พร้อมรายชื่อไฟล์เดิม ไม่ revert", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |"]));
  const keep = path.join(w.codeRoot, "be-100");
  mkdirSync(keep, { recursive: true });
  let execN = 0;
  w.setBehavior((req) => {
    if (req.packet.kind === "execution") {
      execN += 1;
      writeFileSync(path.join(keep, "keep.ts"), `export const n = ${execN};\n`); // agent เขียนไฟล์ระหว่าง session
      return execN === 1 ? "hold" : out(req, {}); // ครั้งแรกค้าง (ถูก kill ตอน resume) · ครั้งถัดไปสำเร็จ
    }
    return DEFAULT(req);
  });
  const a = w.driver();
  a.start();
  await flush();
  const oldSid = execSessions(a)[0]!.sessionId;
  void oldSid;
  // "ปิด orchestrator" — ทิ้ง driver A ไว้ (session ค้างใน run.json แบบ endedAt = null)
  const b = w.driver();
  b.start(); // pointer มีอยู่ → resume (AC-003 — ไม่พิมพ์บริบทซ้ำ)
  await flush();
  const old = (b.run?.sessions ?? []).find((s) => s.sessionId === execSessions(a)[0]!.sessionId)!;
  assert.equal(old.endedAt !== null, true);
  assert.equal(old.outcome, "interrupted");
  const fresh = execSessions(b).find((s) => s.sessionId !== old.sessionId)!;
  assert.ok(fresh !== undefined, "resume → session ใหม่");
  assert.equal(b.run!.tasks["BE-100"]!.crashRestarts, 1);
  assert.deepEqual(fresh.priorSession!.sessionId, old.sessionId);
  assert.ok(fresh.priorSession!.touchedFiles.some((f) => f.endsWith("keep.ts")), "packet มีรายชื่อไฟล์ที่ session ก่อนแก้");
  assert.ok(existsSync(path.join(keep, "keep.ts")), "ไฟล์ไม่ถูก revert (AC-066)");
  await b.settle();
  assert.equal(b.run!.tasks["BE-100"]!.step, "verified"); // วิ่งต่อจนครบ (ไม่มี anchor → Feature QA ของ phase เดียว)
});

// --- AC-003: resume กลาง review — วิ่งต่อจากขั้นล่าสุดโดยไม่มีบริบทใหม่ ---
test("AC-003: resume กลาง review wave — review session ใหม่ (R16) แล้ววิ่งต่อจน verified", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |"]));
  let reviews = 0;
  w.setBehavior((req, nth) => (req.packet.kind === "review" && reviews++ === 0 ? "hold" : DEFAULT(req, nth)));
  const a = w.driver();
  a.start();
  await flush();
  assert.equal(a.run!.tasks["BE-100"]!.step, "review");
  const b = w.driver(); // เปิดใหม่ — ไม่มีอาร์กิวเมนต์บริบทเพิ่ม
  b.start();
  await b.settle();
  assert.equal(b.run!.tasks["BE-100"]!.step, "verified"); // QA round เดินต่อเอง
  const reviewSessions = (b.run?.sessions ?? []).filter((s) => s.kind === "review");
  assert.equal(reviewSessions.length, 2);
  assert.ok(reviewSessions[1]!.priorSession !== null, "R16 — review session ใหม่แทนตัวถูก kill");
});

// --- AC-074: legacy plan — ธง needsMigration + serial (ไม่มี task ถูก dispatch พร้อมกัน) ---
test("AC-074: plan legacy → needsMigration + dispatch ทีละ session (serial)", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, "# P\n\n## Tasks\n\n| Task | Name | Owner | Status |\n|---|---|---|---|\n| BE-100 | a | backend-engineer | pending |\n| BE-200 | b | backend-engineer | pending |\n");
  w.setBehavior((req, nth) => (req.packet.kind === "execution" && nth === 0 ? "hold" : DEFAULT(req, nth))); // ค้างตัวแรก — พิสูจน์ serial
  const d = w.driver();
  d.start();
  await flush();
  assert.equal(d.needsMigration, true);
  assert.ok(d.dashboardNotes.some((n) => n.includes("migrate")));
  assert.equal(d.activeCount, 1, "legacy — ทีละ session เท่านั้น");
  assert.equal((d.run?.sessions ?? []).filter((s) => s.endedAt === null).length, 1);
  assert.equal((d.run?.sessions ?? []).length, 1, "ยังไม่ dispatch ตัวที่สองขนานกัน");
  w.adapter.release(0, out(w.adapter.dispatched[0]!, {}));
  await d.settle();
  assert.equal(d.run!.tasks["BE-100"]!.step, "verified");
  assert.equal(d.run!.tasks["BE-200"]!.step, "verified");
});

// --- AC-037: แก้ Depends ใน plan อย่างเดียว → runnable เปลี่ยน (tick ผ่าน fs.watch/refresh) ---
test("AC-037: แก้ Depends อย่างเดียว → waiting-deps → runnable และถูก dispatch (ไม่แตะ task file)", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-101": taskFile("BE-101") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| BE-101 | b | backend-engineer | 1 | BE-100 | pending |"]));
  w.setBehavior((req, nth) => (req.packet.kind === "execution" && nth === 0 ? "hold" : DEFAULT(req, nth)));
  const d = w.driver();
  d.start();
  await flush();
  assert.equal(d.run!.tasks["BE-101"]!.step, "waiting-deps");
  const planText = readFileSync(w.planPath, "utf8").replace("| BE-101 | b | backend-engineer | 1 | BE-100 | pending |", "| BE-101 | b | backend-engineer | 1 | — | pending |");
  writeFileSync(w.planPath, planText); // แก้ Depends อย่างเดียว (เหมือน fs.watch ตรวจเจอ)
  d.refresh();
  await flush();
  assert.ok(execSessions(d).some((s) => s.taskIds.includes("BE-101")), "BE-101 ถูก dispatch หลัง Depends ครบ");
  w.adapter.release(0, out(w.adapter.dispatched[0]!, {}));
  await d.settle();
  assert.equal(d.run!.tasks["BE-101"]!.step, "verified");
});

// --- AC-039 + AC-079: Depends หาย / owner ห้าม / owner แปลก / multi-anchor — hold + dependents, task อื่นเดินต่อ ---
test("AC-039/AC-079: dep-error + plan-error (owner reviewer, owner แปลก, multi-anchor) → hold แถว + dependents · BE ปกติเดินต่อ", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({
    "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200"), "BE-300": taskFile("BE-300"),
  });
  writeFileSync(w.planPath, v2Plan([
    "| BE-100 | a | backend-engineer | 1 | BE-999 | pending |", // Depends อ้าง id ที่ไม่มี
    "| BE-300 | c | backend-engineer | 1 | BE-100 | pending |", // dependent
    "| BE-200 | b | backend-engineer | 1 | — | pending |",
    "| BAD-1 | r | reviewer | 2 | — | pending |", // owner ห้าม (AC-079)
    "| WIZ-1 | w | wizard | 2 | — | pending |", // owner ไม่รู้จัก (issue ของ BE-018)
    "| QA-101 | x | qa-engineer | 9 | — | pending |", // multi-anchor
    "| QA-102 | y | qa-engineer | 9 | — | pending |",
  ]));
  const d = w.driver();
  d.start();
  await flush();
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "dep-error");
  assert.equal(d.run!.tasks["BE-300"]!.hold!.reason, "dep-error", "dependent ถูก hold ตาม (AC-039)");
  assert.equal(d.run!.tasks["BAD-1"]!.hold!.reason, "plan-error");
  assert.equal(d.run!.tasks["BAD-1"]!.hold!.ref, "owner:reviewer");
  assert.equal(d.run!.tasks["WIZ-1"]!.hold!.reason, "plan-error");
  assert.equal(d.run!.tasks["QA-101"]!.hold!.ref, "multi-anchor");
  assert.equal(d.run!.tasks["QA-102"]!.hold!.ref, "multi-anchor");
  assert.ok(d.planIssues.some((i) => i.kind === "plan-depends-missing"));
  assert.ok(d.planIssues.some((i) => i.kind === "plan-owner-unknown"));
  assert.ok(d.dashboardNotes.some((n) => n.includes("BAD-1") || n.includes("WIZ-1")), "เตือนพร้อม task id (AC-079)");
  assert.ok(execSessions(d).some((s) => s.taskIds.includes("BE-200")), "task อื่นเดินต่อ");
  await d.settle();
  assert.equal(d.run!.tasks["BE-200"]!.step, "verified");
});

// --- R2: execution DONE แต่ audit พบ unclaimed-write → hold audit-violation (suspect เป็น task) ---
test("R2: เขียนนอก claim → audit violation → hold audit-violation ทุก suspect · task อื่นเดินต่อ", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| BE-200 | b | backend-engineer | 1 | — | pending |"]));
  w.setBehavior((req, nth) => {
    if (req.packet.kind === "execution" && req.packet.taskIds.includes("BE-100")) {
      writeFileSync(path.join(w.codeRoot, "outside.txt"), "no claim\n"); // นอก claim ทุก claim
      // ค้างจน BE-200 จบก่อน (suspects ของ audit = session ทุกตัวที่ active ทับช่วง — fail-closed ตาม DES-021)
      return nth === 0 ? "hold" : out(req, {});
    }
    return DEFAULT(req, nth);
  });
  const d = w.driver();
  d.start();
  await flush();
  w.adapter.release(0, out(w.adapter.dispatched[0]!, {}));
  await d.settle();
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "audit-violation");
  assert.equal(d.run!.tasks["BE-100"]!.step, "held");
  assert.equal(d.run!.tasks["BE-200"]!.step, "verified", "task อื่นเดินต่อ (localized — AC-070)");
});

// --- R20: Feature QA FAIL ไม่ระบุ task → hold phase + anchor held + Status blocked ---
test("R20: Feature QA FAIL ไม่ระบุ task → hold phase feature-qa-unattributed + anchor held + waiting-on-human", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "QA-100": taskFile("QA-100") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| QA-100 | x | qa-engineer | 1 | BE-100 | pending |"]));
  w.setBehavior((req) => {
    if (req.packet.kind === "feature-qa") {
      return out(req, { outputState: "FAIL", featureQa: { phase: "1", roundFile: "qa/fqa.md", flows: [{ flow: "f", ref: "AC-057", result: "FAIL" }], defects: [] } });
    }
    return DEFAULT(req);
  });
  const d = w.driver();
  d.start();
  await d.settle();
  assert.equal(d.run!.phases["1"]!.hold !== null, true, "hold phase (AC-077)");
  assert.equal(d.run!.tasks["QA-100"]!.hold!.reason, "gate");
  assert.equal(d.run!.tasks["QA-100"]!.hold!.ref, "1");
  assert.equal(d.run!.status, "waiting-on-human");
  const planText = readFileSync(w.planPath, "utf8");
  assert.ok(/\| QA-100 \|.*\| blocked \|/.test(planText), "anchor Status blocked");
  assert.equal(d.run!.tasks["BE-100"]!.fixRounds, 0, "R20 ไม่นับ fix round");
});

// --- stop(): kill session ค้าง — ไม่ re-dispatch, status stopped ---
test("stop: kill session ที่รันค้าง → outcome interrupted · ไม่ re-dispatch · status stopped", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100"), "BE-200": taskFile("BE-200") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |", "| BE-200 | b | backend-engineer | 1 | — | pending |"]));
  w.setBehavior((req, nth) => (req.packet.kind === "execution" && nth === 0 ? "hold" : DEFAULT(req, nth)));
  const d = w.driver();
  d.start();
  await flush();
  const sessionsBefore = (d.run?.sessions ?? []).length;
  d.stop("ผู้ใช้สั่งหยุด");
  await flush();
  assert.equal(d.run!.status, "stopped");
  assert.equal(w.adapter.killed.length, 1);
  const held = execSessions(d).find((s) => s.endedAt !== null);
  assert.ok(held !== undefined && held!.outcome === "interrupted");
  assert.equal((d.run?.sessions ?? []).length, sessionsBefore, "ไม่มี session ใหม่หลัง stop");
});

// --- AC-041: session group — ตรวจเชิงกลไกผ่าน → packet เดียวสอง task ---
test("AC-041: session group ผ่านเกณฑ์ OQ-12 → packet เดียว taskIds ครบ · default = task เดียวต่อ packet", async () => {
  const w = mkWorld();
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({
    "BE-100": taskFile("BE-100", { group: "g1" }),
    "BE-200": taskFile("BE-200", { group: "g1" }),
    "BE-300": taskFile("BE-300"),
  });
  writeFileSync(w.planPath, v2Plan([
    "| BE-100 | a | backend-engineer | 1 | — | pending |",
    "| BE-200 | b | backend-engineer | 1 | — | pending |",
    "| BE-300 | c | backend-engineer | 1 | — | pending |",
  ]));
  const d = w.driver();
  d.start();
  await d.settle();
  const grouped = execSessions(d).find((s) => s.taskIds.length === 2);
  assert.ok(grouped !== undefined, "group g1 → packet เดียว");
  assert.deepEqual([...grouped!.taskIds].sort(), ["BE-100", "BE-200"]);
  assert.equal(d.run!.tasks["BE-100"]!.attempt, 1);
  assert.equal(d.run!.tasks["BE-200"]!.attempt, 1);
  assert.equal(d.run!.tasks["BE-300"]!.attempt, 1);
});

// --- QA-009: handoff ใน result envelope ของ CLI (claude -p --output-format json → structured_output) ---
// รูปตรงกับที่ CLI จริงคืน (round 18): {type:"result", …, structured_output:{…handoff…}} — ชื่อ field มาจาก
// CampOutcome.structuredOutputField (ความรู้ต่อ camp — ไม่ hardcode ใน driver) · unwrap ก่อน candidates เดิม
const outRaw = (raw: unknown, field: string | null): CampOutcome => ({
  exitCode: 0,
  handoffRaw: JSON.stringify(raw),
  structuredOutputField: field,
  cliSessionId: null, cliVersion: "2.1.292", logsPath: null, failure: null,
});

const singleTaskWorld = (behavior: Behavior) => {
  const w = mkWorld({ behavior });
  (w as World & { writeTasks: (t: Record<string, string>) => void }).writeTasks({ "BE-100": taskFile("BE-100") });
  writeFileSync(w.planPath, v2Plan(["| BE-100 | a | backend-engineer | 1 | — | pending |"]));
  return w;
};

test("QA-009: handoff ใน result envelope (structured_output — field จาก camp) → driver unwrap ผ่าน · task เดินต่อ ไม่ R15", async () => {
  const w = singleTaskWorld((req) => {
    if (req.packet.kind === "execution") {
      const good: unknown = JSON.parse(out(req, {}).handoffRaw!); // handoff ถูกต้องตาม packet ของ session นี้
      return outRaw({ type: "result", subtype: "success", is_error: false, session_id: req.packet.sessionId, result: "ok", structured_output: good }, "structured_output");
    }
    return DEFAULT(req);
  });
  const d = w.driver();
  d.start();
  await d.settle();
  const s = sessionOf(d, "execution", "BE-100")!;
  assert.equal(s.outcome, "completed");
  assert.equal(s.handoff?.result, "ok", "handoff จาก structured_output เข้า SessionRecord.handoff");
  assert.equal(d.run!.tasks["BE-100"]!.hold, null, "ไม่ R15 — ต่างจากรอบ 18");
  assert.ok(kindSeq(d).some((k) => k.startsWith("review:BE-100")), "flow หลัง session เดินต่อ (review wave)");
});

test("QA-009: structured_output เสีย → R15 hold invalid-handoff (fail-closed คงเดิม)", async () => {
  const w = singleTaskWorld((req) => {
    if (req.packet.kind === "execution") {
      const good = JSON.parse(out(req, {}).handoffRaw!) as Record<string, unknown>;
      return outRaw({ type: "result", subtype: "success", is_error: false, session_id: req.packet.sessionId, structured_output: { ...good, sessionId: "s-9-ffff" } }, "structured_output");
    }
    return DEFAULT(req);
  });
  const d = w.driver();
  d.start();
  await d.settle();
  assert.equal(sessionOf(d, "execution", "BE-100")!.outcome, "failed");
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "invalid-handoff");
});

test("QA-009: camp ไม่ประกาศ field + fenced JSON ใน string field (fallback เดิม DES-012) → ยังผ่าน (backward compatible)", async () => {
  const w = singleTaskWorld((req) => {
    if (req.packet.kind === "execution") {
      const good = JSON.parse(out(req, {}).handoffRaw!) as Record<string, unknown>;
      return outRaw({ type: "result", result: "```json\n" + JSON.stringify(good, null, 2) + "\n```" }, null);
    }
    return DEFAULT(req);
  });
  const d = w.driver();
  d.start();
  await d.settle();
  const s = sessionOf(d, "execution", "BE-100")!;
  assert.equal(s.outcome, "completed");
  assert.equal(s.handoff?.result, "ok");
  assert.equal(d.run!.tasks["BE-100"]!.hold, null);
});

test("QA-009: envelope ไม่มี structured_output + ไม่มี fenced → ปฏิเสธ R15 (candidates เดิมก็ไม่ผ่าน — fail-closed)", async () => {
  const w = singleTaskWorld((req) => {
    if (req.packet.kind === "execution") {
      return outRaw({ type: "result", subtype: "success", is_error: false, session_id: req.packet.sessionId, result: "DONE — handoff หาย" }, "structured_output");
    }
    return DEFAULT(req);
  });
  const d = w.driver();
  d.start();
  await d.settle();
  assert.equal(sessionOf(d, "execution", "BE-100")!.outcome, "failed");
  assert.equal(d.run!.tasks["BE-100"]!.hold!.reason, "invalid-handoff");
});
