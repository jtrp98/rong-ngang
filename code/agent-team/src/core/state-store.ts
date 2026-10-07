// BE-007 — runtime state store v2 (DES-007 + design\data-model.md §state): state ต่อ task/session แยกจาก project state (REQ-010/020)
// เขียน atomic (tmp + rename) ทุก transition · run.json เสีย/ผิดรูป → *.corrupt-<ts> + ปฏิเสธ resume (fail-closed)
// resume reconcile = เอกสารชนะ (AC-003/AC-034) · step/attempt/sessionId/fixRounds อยู่ใน state เท่านั้น ไม่ลง module docs (AC-065)
// API เดียวสำหรับ BE-008/011/019/021/022/023 — ชื่อ/ชนิด field ตรงตัว data-model (ห้ามเปลี่ยน)
import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { assertModuleName, assertNoTraversal } from "./knowledge-paths.ts";
import type { KNOWN_GATES, KNOWN_ROLES, RegistryConfig } from "./config.ts";
import type { PlanIndex, PlanRow } from "./plan-parser.ts";

export type Role = (typeof KNOWN_ROLES)[number]; // 1 ใน 12 role — ชื่อ/ชนิดตรงตัว (data-model)
export type GateId = (typeof KNOWN_GATES)[number]; // key ใน gates.yaml (config validate ครบ 7 จุดแล้ว)

export type RunMode = "resume" | "new-work";
export type RunStatus = "queued" | "running" | "idle" | "waiting-on-human" | "stopped" | "failed" | "completed";
export type PlanFormat = "v2" | "legacy" | "none";
export type Step = "waiting-deps" | "runnable" | "execution" | "awaiting-review" | "review" | "awaiting-qa" | "qa" | "verified" | "held";
export type HoldReason =
  | "audit-violation" | "dep-error" | "plan-error" | "design-change" | "requirement-change" | "reopen-needed"
  | "blocked" | "invalid-handoff" | "crash-limit" | "context-error" | "status-conflict" | "gate";
export type SessionKind = "change" | "execution" | "review" | "qa" | "feature-qa" | "security" | "record-only";
export type FeatureQaStatus = "not-ready" | "queued" | "running" | "pass" | "fail";
export type OutputState = "DONE" | "PASS" | "FAIL" | "BLOCKED" | "NEEDS_DESIGN_CHANGE" | "NEEDS_REQUIREMENT_CHANGE" | "NEEDS_HUMAN";
export type Severity = "Critical" | "Important" | "Minor";

export interface ConfigSnapshot {
  routing: string; tiers: string; camps: string; gates: string; // "sha256:..." — ผลจาก config.ts configSnapshot()
}

export interface Blocker {
  type: "design" | "requirement" | "environment" | "dependency" | "access" | "other";
  task: string; reference: string | null; reason: string;
}
export interface ReviewFinding {
  id: string; severity: Severity; task: string; location: string; problem: string; reference: string;
}
export interface QaDefect {
  id: string; task: string | null; severity: Severity; expected: string; actual: string;
  reproduce: { tp: string | null; steps: string }; evidence: string[];
}

export interface HandoffV2 {
  role: Role; module: string; sessionId: string; outputState: OutputState;
  result: string; changedDocs: string[]; changedCode: string[]; evidence: string[]; nextRole: Role | "none";
  questionsForHuman: { gate: GateId | "none"; question: string; owner: string; touchesSchemaOrContract: boolean | null }[];
  blocker: Blocker | null; impactedTasks: string[] | null; // PM ใน change chain
  decision: { action: "amend" | "create"; module: string; reason: string } | null; // BA งานใหม่ (AC-018)
  review: { roundFile: string; perTask: { task: string; verdict: "PASS" | "FAIL" }[]; findings: ReviewFinding[] } | null;
  qa: {
    roundFile: string; checks: { command: string; exitCode: number; logRef: string }[];
    perTask: { task: string; verdict: "verified" | "blocked" }[]; defects: QaDefect[];
  } | null;
  featureQa: { phase: string; roundFile: string; flows: { flow: string; ref: string; result: "PASS" | "FAIL" }[]; defects: QaDefect[] } | null;
  security: { findings: { id: string; severity: Severity; ref: string }[] } | null;
  securityGate: { phase: string; reason: string }[] | null; // qa/feature-qa เท่านั้น → 🔒 (DES-019 §write-back, R23/G2-f) — BE-022 อ่านตอน resume
}

export interface TaskRuntime {
  taskId: string; owner: Role; planPhase: string; group: string | null;
  step: Step;
  hold: { reason: HoldReason; ref: string | null; prevStep: string } | null;
  attempt: number; fixRounds: number; crashRestarts: number; // attempt = execution session ที่ dispatch แล้ว — runtime เท่านั้น ไม่ลง docs
  currentSessionId: string | null; sessionIds: string[]; touchedFiles: string[];
  lastVerdict: { source: "review" | "qa" | "feature-qa"; verdict: "PASS" | "FAIL" | "verified" | "blocked"; ref: string; sessionId: string } | null;
  defectPacket: string | null; // path ใต้ defects/ (DES-019)
  humanActions: { action: "retry"; by: string; note: string | null; at: string }[];
}

export interface SessionRecord {
  sessionId: string; seq: number; // sessionId = "s-<seq>-<4 hex>"
  kind: SessionKind; role: Role; taskIds: string[]; planPhase: string | null; attempt: number;
  camp: string; model: string; effort: string | null; tier: string | null;
  modelBasis: string; effortBasis: string; basisReason: string; // AC-005
  packetPath: string; rolePromptHash: string; cliVersion: string | null; // packetPath = "sessions/<sid>/packet.json"
  pid: number | null; cliSessionId: string | null;
  claim: string[]; contextFiles: string[]; // DES-021 / DES-020 (AC-047)
  priorSession: { sessionId: string; touchedFiles: string[] } | null;
  startedAt: string; endedAt: string | null; exitCode: number | null; // ISO
  outcome: "completed" | "gate-raised" | "failed" | "timeout" | "interrupted" | "crashed" | null;
  handoff: HandoffV2 | null; logsPath: string;
  writeAudit: {
    mode: "git" | "manifest"; partial: boolean; diffApprox: boolean; changed: string[]; touchedFiles: string[];
    violations: { kind: "write" | "unclaimed-write" | "status-write" | "git-commit-off" | "git-ref"; path: string | null; detail: string; suspects: string[] }[];
    gitRefs: { repoTop: string; before: string; after: string }[];
  }; // DES-006/016/021
}

export interface GateRecord {
  gateId: GateId; sessionId: string | null; // null = structural/doc trigger
  scope: "task" | "phase" | "module"; taskIds: string[]; phase: string | null; // AC-072
  question: string; owner: { name: string }; status: "open" | "answered";
  answeredBy: string | null; answeredAt: string | null; answer: string | null; note: string | null;
  recordSessionId: string | null; // session record-only (OQ-D3)
}

export interface PhaseRuntime {
  featureQa: FeatureQaStatus; featureQaSessionId: string | null; cleared: boolean; hold: object | null;
}

export interface RunJson {
  runId: string; module: string; mode: RunMode;
  status: RunStatus; planFormat: PlanFormat;
  scheduler: RegistryConfig["scheduler"]; // สำเนา registry.scheduler ตอนสร้าง run (freeze — BE-001)
  newWorkText: string | null; // new-work (REQ-007)
  createdAt: string; updatedAt: string; // ISO
  configSnapshot: ConfigSnapshot; // freeze (DES-007) — resume ใช้ค่าที่ snapshot ไว้ ไม่อ่าน config ใหม่
  gitPolicy: {
    rootKind: "knowledge" | "target"; name: string; path: string; gituse: boolean; basis: "target" | "knowledge" | "default";
    repo: boolean; repoTop: string | null; commitAllowed: boolean; auditMode: "git" | "manifest"; warning: string | null;
  }[]; // freeze (DES-015, AC-026/029/031) — การ derive ยังไม่ทำใน BE-007 (REQ-009 → backlog BL-017)
  tasks: Record<string, TaskRuntime>;
  phases: Record<string, PhaseRuntime>;
  sessions: SessionRecord[];
  gateLog: GateRecord[]; // append-only (DES-008)
}

export class StateError extends Error {
  constructor(
    readonly kind: "missing" | "corrupt" | "exists" | "invalid",
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = "StateError";
  }
}

const RUN_MODES = ["resume", "new-work"] as const;
const RUN_STATUSES = ["queued", "running", "idle", "waiting-on-human", "stopped", "failed", "completed"] as const;
const PLAN_FORMATS = ["v2", "legacy", "none"] as const;
const STEPS: readonly string[] = [
  "waiting-deps", "runnable", "execution", "awaiting-review", "review", "awaiting-qa", "qa", "verified", "held",
];

// --- paths — โครง <orchestratorHome>\state\ ตาม DES-007 ---
export interface StatePaths {
  stateDir: string;
  runsDir: string;
  modulesDir: string;
  routerLog: string;
  runDir(runId: string): string;
  runJsonPath(runId: string): string;
  sessionDir(runId: string, sessionId: string): string;
  defectsDir(runId: string): string;
  pointerPath(module: string): string;
}

export function statePaths(home: string): StatePaths {
  const stateDir = path.join(home, "state");
  const runsDir = path.join(stateDir, "runs");
  const modulesDir = path.join(stateDir, "modules");
  const runDir = (runId: string): string => {
    assertNoTraversal(runId, "runId");
    return path.join(runsDir, runId);
  };
  return {
    stateDir,
    runsDir,
    modulesDir,
    routerLog: path.join(stateDir, "router.log"),
    runDir,
    runJsonPath: (runId) => path.join(runDir(runId), "run.json"),
    sessionDir: (runId, sessionId) => {
      assertNoTraversal(sessionId, "sessionId");
      return path.join(runDir(runId), "sessions", sessionId);
    },
    defectsDir: (runId) => path.join(runDir(runId), "defects"),
    pointerPath: (module) => {
      assertModuleName(module);
      return path.join(modulesDir, `${module}.json`);
    },
  };
}

// --- id ---
const pad = (n: number, w: number): string => String(n).padStart(w, "0");
const hex4 = (): string => randomBytes(2).toString("hex");

// runId = r-<YYYYMMDD-HHmmss>-<4 hex> · sessionId = s-<seq>-<4 hex> (data-model)
export function newRunId(now: Date = new Date()): string {
  return `r-${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}-`
    + `${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}-${hex4()}`;
}
export function newSessionId(seq: number): string {
  if (!Number.isInteger(seq) || seq < 0) throw new StateError("invalid", `seq ต้องเป็น int ≥ 0 — ได้รับ ${seq}`, "");
  return `s-${seq}-${hex4()}`;
}

// --- atomic write + quarantine ---
// atomic (DES-007 — tmp + rename ทุก transition): ผู้อ่านเห็นได้เฉพาะเนื้อหาเก่าหรือใหม่เต็มไฟล์ ไม่มีครึ่งไฟล์แม้ตายกลางทาง
function writeJsonAtomic(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${hex4()}`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tmp, file);
}

// ไฟล์เสีย → ย้ายเก็บเป็น <name>.corrupt-<ts> (ไม่ลบ — ให้คนตรวจก่อนตัดสิน — DES-007)
function quarantine(file: string): string {
  const base = `${file}.corrupt-${Date.now()}`;
  let target = base;
  let n = 0;
  while (existsSync(target)) target = `${base}-${++n}`;
  renameSync(file, target);
  return target;
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

// ตรวจรูป run.json แบบ fail-closed (top-level + invariant ที่ store ยึด) — ผิดรูป = เสีย เหมือน parse ไม่ผ่าน
function runJsonProblems(v: unknown): string[] {
  if (!isObj(v)) return ["root ต้องเป็น object"];
  const p: string[] = [];
  for (const k of ["runId", "module", "createdAt", "updatedAt"] as const) {
    if (!isStr(v[k]) || (v[k] as string).trim() === "") p.push(`${k} ต้องเป็น string ไม่ว่าง`);
  }
  if (!(RUN_MODES as readonly string[]).includes(v.mode as string)) p.push(`mode ผิด: ${JSON.stringify(v.mode)}`);
  if (!(RUN_STATUSES as readonly string[]).includes(v.status as string)) p.push(`status ผิด: ${JSON.stringify(v.status)}`);
  if (!(PLAN_FORMATS as readonly string[]).includes(v.planFormat as string)) p.push(`planFormat ผิด: ${JSON.stringify(v.planFormat)}`);
  const cs = v.configSnapshot;
  if (!isObj(cs) || !["routing", "tiers", "camps", "gates"].every((k) => isStr(cs[k]))) {
    p.push("configSnapshot ต้องมี routing/tiers/camps/gates เป็น string (freeze — DES-007)");
  }
  if (!isObj(v.scheduler)) p.push("scheduler ต้องเป็น object (สำเนา registry.scheduler ตอนสร้าง run)");
  if (!Array.isArray(v.gitPolicy)) p.push("gitPolicy ต้องเป็น list (freeze — DES-015)");
  if (!isObj(v.tasks)) {
    p.push("tasks ต้องเป็น map (TaskRuntime ต่อ task id)");
  } else {
    for (const [id, t] of Object.entries(v.tasks)) {
      if (!isObj(t) || !isStr(t.taskId) || !(STEPS as readonly string[]).includes(t.step as string)
        || !isInt(t.attempt) || !isInt(t.fixRounds) || !isInt(t.crashRestarts)) {
        p.push(`tasks[${id}] ต้องเป็น TaskRuntime (taskId: string, step: enum, attempt/fixRounds/crashRestarts: int)`);
      }
    }
  }
  if (!isObj(v.phases)) p.push("phases ต้องเป็น map (ต่อ phase)");
  if (!Array.isArray(v.sessions)) {
    p.push("sessions ต้องเป็น list");
  } else {
    v.sessions.forEach((s, i) => {
      if (!isObj(s) || !isStr(s.sessionId) || !isInt(s.seq) || !isStr(s.startedAt)
        || !(s.endedAt === null || isStr(s.endedAt)) || !(s.handoff === null || isObj(s.handoff))) {
        p.push(`sessions[${i}] ต้องมี sessionId: string, seq: int, startedAt: ISO, endedAt: ISO|null, handoff: object|null`);
      }
    });
  }
  if (!Array.isArray(v.gateLog)) {
    p.push("gateLog ต้องเป็น list (append-only — DES-008)");
  } else {
    v.gateLog.forEach((g, i) => {
      if (!isObj(g) || !isStr(g.gateId) || !["open", "answered"].includes(g.status as string)) {
        p.push(`gateLog[${i}] ต้องมี gateId: string, status: open|answered`);
      }
    });
  }
  return p;
}

// --- create / load / save / update ---
export interface CreateRunInit {
  module: string;
  mode: RunMode;
  planFormat: PlanFormat;
  scheduler: RegistryConfig["scheduler"];
  newWorkText: string | null;
  configSnapshot: ConfigSnapshot;
  runId?: string;
  gitPolicy?: RunJson["gitPolicy"];
  tasks?: RunJson["tasks"];
  phases?: RunJson["phases"];
}

// สร้าง run ใหม่ + โครงไดเรกทอรี (sessions/, defects/) + pointer ชี้ run นี้ — transition แรกของ module
export function createRun(home: string, init: CreateRunInit): RunJson {
  assertModuleName(init.module);
  const runId = init.runId ?? newRunId();
  const paths = statePaths(home);
  const dir = paths.runDir(runId);
  if (existsSync(dir)) {
    // ไม่สร้างทับ — run เดิมหรือซาก run.json เสียต้องให้คนตัดสินก่อน (DES-007)
    throw new StateError("exists", `run มีอยู่แล้ว — ห้ามสร้างทับ: ${dir}`, dir);
  }
  mkdirSync(path.join(dir, "sessions"), { recursive: true });
  mkdirSync(paths.defectsDir(runId), { recursive: true });
  const nowIso = new Date().toISOString();
  const run: RunJson = {
    runId,
    module: init.module,
    mode: init.mode,
    status: "queued",
    planFormat: init.planFormat,
    scheduler: init.scheduler,
    newWorkText: init.newWorkText,
    createdAt: nowIso,
    updatedAt: nowIso,
    configSnapshot: init.configSnapshot,
    gitPolicy: init.gitPolicy ?? [],
    tasks: init.tasks ?? {},
    phases: init.phases ?? {},
    sessions: [],
    gateLog: [],
  };
  const problems = runJsonProblems(run);
  if (problems.length > 0) throw new StateError("invalid", `run.json ผิดรูปก่อนเขียน: ${problems[0]}`, paths.runJsonPath(runId));
  writeJsonAtomic(paths.runJsonPath(runId), run);
  setPointer(home, init.module, runId);
  return run;
}

// โหลด run.json — เสีย/ผิดรูป → quarantine + ปฏิเสธ resume (fail-closed, DES-007)
// ไม่พบ → StateError missing: ไม่มี pointer/run → derive จากเอกสาร (ตัวนับเริ่ม 0 — ข้อจำกัดที่ design ประกาศ)
export function loadRun(home: string, runId: string): RunJson {
  const file = statePaths(home).runJsonPath(runId);
  if (!existsSync(file)) {
    throw new StateError("missing", `ไม่พบ run.json: ${file} — ไม่มี pointer/run → derive จากเอกสาร (ตัวนับเริ่ม 0 — DES-007)`, file);
  }
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    quarantine(file);
    throw new StateError("corrupt", `run.json parse ไม่ผ่าน — ย้ายเก็บเป็น run.json.corrupt-<ts> + ปฏิเสธ resume (DES-007)`, file);
  }
  const problems = runJsonProblems(value);
  if (problems.length > 0) {
    quarantine(file);
    throw new StateError("corrupt", `run.json ผิดรูป (${problems[0]}) — ย้ายเก็บ + ปฏิเสธ resume (fail-closed)`, file);
  }
  return value as RunJson;
}

// บันทึก transition — atomic + updatedAt ใหม่ทุกครั้ง · ต้องมี run.json อยู่ก่อน (สร้าง = createRun เท่านั้น — ไม่ฟื้นของเสีย)
export function saveRun(home: string, run: RunJson): RunJson {
  const file = statePaths(home).runJsonPath(run.runId);
  if (!existsSync(file)) {
    throw new StateError("missing", `บันทึกไม่ได้ — ไม่พบ run.json ของ ${run.runId} (สร้างใหม่ด้วย createRun เท่านั้น)`, file);
  }
  const out: RunJson = { ...run, updatedAt: new Date().toISOString() };
  const problems = runJsonProblems(out);
  if (problems.length > 0) throw new StateError("invalid", `ปฏิเสธบันทึก — run.json ผิดรูป: ${problems[0]}`, file);
  writeJsonAtomic(file, out);
  return out;
}

// load → แก้ → save ใน transition เดียว (ทางเขียน state ทางเดียว — DES-007)
export function updateRun(home: string, runId: string, fn: (run: RunJson) => RunJson): RunJson {
  const updated = fn(loadRun(home, runId));
  if (updated.runId !== runId) {
    throw new StateError("invalid", `transition เปลี่ยน runId (${runId} → ${updated.runId}) — ห้าม`, "");
  }
  return saveRun(home, updated);
}

// --- pointer ต่อ module → {currentRunId} (DES-007) ---
export function getPointer(home: string, module: string): string | null {
  const file = statePaths(home).pointerPath(module);
  if (!existsSync(file)) return null;
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    quarantine(file);
    return null; // pointer เสีย = ไม่มี (ตัวนับเริ่ม 0 — ข้อจำกัดที่ design ประกาศ) · ไฟล์เสียเก็บไว้ให้คนดู
  }
  if (!isObj(value) || Object.keys(value).length !== 1 || !isStr(value.currentRunId) || value.currentRunId.trim() === "") {
    quarantine(file);
    return null;
  }
  return value.currentRunId;
}

export function setPointer(home: string, module: string, runId: string): void {
  assertModuleName(module);
  assertNoTraversal(runId, "runId");
  writeJsonAtomic(statePaths(home).pointerPath(module), { currentRunId: runId });
}

// --- sessions ---
// โฟลเดอร์ session (packet.json, snapshot.json, preimage\, diff.patch, session.log — DES-007) — ไฟล์ย่อยเป็นของ dispatch/audit
export function ensureSessionDir(home: string, runId: string, sessionId: string): string {
  const dir = statePaths(home).sessionDir(runId, sessionId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export interface OpenSession {
  runId: string;
  session: SessionRecord;
}

// SessionRecord ที่ endedAt = null — driver เรียกตอน orchestrator start เพื่อ kill/restart (ตัว kill = BE-011)
// run ที่ parse ไม่ผ่าน → ข้ามโดยไม่แตะไฟล์ (quarantine เป็นของ loadRun/resume เท่านั้น — กันเก็บไฟล์ corrupt ซ้ำหลายฉบับ)
export function findOpenSessions(home: string, runId?: string): OpenSession[] {
  const paths = statePaths(home);
  const ids = runId !== undefined ? [runId] : existsSync(paths.runsDir) ? readdirSync(paths.runsDir).sort() : [];
  const out: OpenSession[] = [];
  for (const id of ids) {
    const file = paths.runJsonPath(id);
    if (!existsSync(file)) continue;
    let run: RunJson | null = null;
    try {
      const value: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (runJsonProblems(value).length === 0) run = value as RunJson;
    } catch {
      run = null;
    }
    if (!run) continue;
    for (const s of run.sessions) if (s.endedAt === null) out.push({ runId: id, session: s });
  }
  return out.sort((a, b) => a.runId.localeCompare(b.runId) || a.session.seq - b.session.seq);
}

// --- router.log (root ของ state — DES-007) — append ท้ายไฟล์ (log ไม่ใช่ transition ที่ต้อง atomic) ---
export function appendRouterLog(home: string, line: string): void {
  const file = statePaths(home).routerLog;
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, line.endsWith("\n") ? line : `${line}\n`, "utf8");
}

// --- resume reconcile (DES-007 §Resume) ---
export interface ReconcileOptions {
  // rule ของ satisfied(dep) ที่อ่านจาก plan เพียงอย่างเดียวไม่ได้ — uxui-designer = gate 3 answered · test-planner = มีแถว TP (DES-001)
  // driver (BE-011) ผ่าน rule ครบเข้ามาได้ · default = verified ใน plan + anchor ⇔ phase cleared (DES-019)
  depsSatisfied?: (dep: PlanRow, plan: PlanIndex) => boolean;
}

// pure: ไม่แตะดิสก์ คืน run.json ฉบับ reconcile แล้ว (caller saveRun เอง) · run.status/createdAt ไม่แตะ (transition ของ driver — DES-001)
// เอกสารชนะ (AC-003/AC-034): Status = verified ใน plan → step verified เสมอ
export function reconcileRun(run: RunJson, plan: PlanIndex, opts: ReconcileOptions = {}): RunJson {
  const out = structuredClone(run);
  const byId = new Map(plan.rows.map((r) => [r.id, r]));
  const planIds = new Set(plan.rows.map((r) => r.id));

  const satisfied = (dep: PlanRow): boolean => {
    if (opts.depsSatisfied) return opts.depsSatisfied(dep, plan);
    // anchor (Owner qa-engineer) ⇔ phase cleared (DES-019) · อื่น = Status(d) = verified ใน plan (DES-001)
    if (dep.owner === "qa-engineer") return out.phases[dep.phase]?.cleared === true;
    return dep.status === "verified";
  };

  // (1) task เพิ่ม — แถวใหม่ใน plan → TaskRuntime ใหม่ ตัวนับเริ่ม 0 · seed step ตาม DES-001 (runnable ⇔ pending + deps satisfied)
  for (const row of plan.rows) {
    if (out.tasks[row.id]) continue;
    const depsOk = row.depends.every((d) => {
      const dep = byId.get(d);
      return dep !== undefined && satisfied(dep);
    });
    out.tasks[row.id] = {
      taskId: row.id,
      owner: row.owner as Role, // mirror เอกสาร — owner แปลกก็ถูก parser แจ้ง (plan-owner-unknown) และ driver hold ก่อน dispatch
      planPhase: row.phase,
      group: null, // Session group อ่านจาก task file — ให้ driver ตั้งผ่าน updateRun (BE-011)
      step: row.status === "pending" && depsOk ? "runnable" : "waiting-deps", // Status ผิดรูป → ไม่เปิดรัน (fail-closed)
      hold: null,
      attempt: 0, fixRounds: 0, crashRestarts: 0,
      currentSessionId: null, sessionIds: [], touchedFiles: [],
      lastVerdict: null, defectPacket: null, humanActions: [],
    };
  }

  // (2) Status เอกสารชนะ (DES-007 §Resume — AC-034/AC-003)
  for (const row of plan.rows) {
    const t = out.tasks[row.id];
    if (row.status === "verified") {
      // verified ใน plan → step verified เสมอ + ปลด hold ใด ๆ (เอกสารชนะ)
      t.step = "verified";
      t.hold = null;
      continue;
    }
    if (row.status === "blocked") {
      // plan blocked → ต้องหยุด (hold.reason "blocked" — enum ใน data-model) แม้ runtime กำลังเดิน
      const prev = t.hold?.prevStep ?? t.step;
      if (!(t.hold?.reason === "blocked" && t.step === "held")) t.hold = { reason: "blocked", ref: null, prevStep: prev };
      t.step = "held";
      continue;
    }
    // pending (หรือ Status ผิดรูป — parser แจ้งแล้ว): run.json ว่า verified แต่เอกสารไม่ verified → ห้ามนับต่อ — hold ให้ตัดสินใหม่
    if (t.step === "verified") {
      t.step = "held";
      t.hold = { reason: "reopen-needed", ref: null, prevStep: "verified" };
    }
  }

  // (3) task ลด — ไม่มีใน plan แล้ว → ถอดจาก tasks{} (เอกสารชนะ · ประวัติ session คงใน sessions[])
  for (const id of Object.keys(out.tasks)) if (!planIds.has(id)) delete out.tasks[id];

  // (4) phases — คงค่าข้าม resume (ฐาน satisfied(anchor) — DES-019) · เพิ่ม = init ตาม data-model · ลด = ถอด
  const planPhases = new Set(plan.phases.map((p) => p.label));
  for (const key of Object.keys(out.phases)) if (!planPhases.has(key)) delete out.phases[key];
  for (const label of planPhases) {
    if (!isObj(out.phases[label])) out.phases[label] = { featureQa: "not-ready", featureQaSessionId: null, cleared: false, hold: null };
  }

  // (5) gate — สถานะล่าสุดต่อ gateId (append-only) · answered → ปลด hold "gate" กลับ prevStep (DES-007 §Resume)
  const latestGate = new Map<string, GateRecord>();
  for (const g of out.gateLog) latestGate.set(g.gateId, g);
  for (const t of Object.values(out.tasks)) {
    if (t.hold?.reason === "gate" && t.hold.ref && latestGate.get(t.hold.ref)?.status === "answered") {
      t.step = (STEPS as readonly string[]).includes(t.hold.prevStep) ? (t.hold.prevStep as Step) : "waiting-deps";
      t.hold = null;
    }
  }
  // open → hold เฉพาะ task ใน scope (task นอก scope เดินต่อ — DES-008) · verified ไม่ hold ย้อน (เอกสารชนะ)
  // hold อื่น (เช่น crash-limit) มาก่อน — ไม่ทับ
  for (const g of out.gateLog) {
    if (g.status !== "open") continue;
    for (const t of Object.values(out.tasks)) {
      if (t.step === "verified") continue;
      const inScope = g.scope === "module"
        || (g.scope === "phase" && t.planPhase === g.phase)
        || (g.scope === "task" && g.taskIds.includes(t.taskId));
      if (!inScope) continue;
      if (t.hold && t.hold.reason !== "gate") continue;
      if (!(t.hold?.reason === "gate" && t.hold.ref === g.gateId)) {
        t.hold = { reason: "gate", ref: g.gateId, prevStep: t.hold?.prevStep ?? t.step };
      }
      t.step = "held";
    }
  }

  out.updatedAt = new Date().toISOString();
  return out;
}

// securityGate จาก handoff ทั้งหมด — BE-022 เทียบกับ ## Phases ตอน resume (mark ที่ยังไม่อยู่ใน doc → เขียนซ้ำ; DES-007 §🔒)
export function collectSecurityGates(run: RunJson): { phase: string; reason: string; sessionId: string; seq: number }[] {
  const out: { phase: string; reason: string; sessionId: string; seq: number }[] = [];
  for (const s of run.sessions) {
    for (const g of s.handoff?.securityGate ?? []) {
      out.push({ phase: g.phase, reason: g.reason, sessionId: s.sessionId, seq: s.seq });
    }
  }
  return out.sort((a, b) => a.seq - b.seq);
}
