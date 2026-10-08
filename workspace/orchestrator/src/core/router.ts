// BE-019 — deterministic router (DES-018 ตาราง R1–R24): route(event, tasks, config) → Decision
// pure function — ไม่มี I/O / ไม่เรียก LLM / ไม่ import camp adapter (AC-067/AC-069) · เขียนไฟล์เป็นงาน scheduler (DES-001)
// localized (AC-070/AC-056): handoff decision แตะเฉพาะ taskId ใน event (+ dependents เมื่อ hold) —
// batch ที่ task หนึ่ง FAIL task อื่นไปตาม verdict ของตัวเอง · ตัดสินจาก state + เอกสารล้วน ไม่ถาม model
// ตัวนับ (DES-018 §ตัวนับ): fixRounds ตัวเดียวต่อ task (review+QA+Feature-QA — R4/R5) · crashRestarts แยก (R16/R17) ·
// retry ของคนไม่ reset (R22) · limit จาก scheduler (BE-001) · §Severity: blocking = Critical|Important (Minor → backlog)
// input: handoff-v2 ที่ผ่าน schema แล้ว (BE-006 handoffProblems → event.handoffInvalid) — router กันชั้นที่สอง (R15 fail-closed)
// task input = TaskRuntime (BE-007) join แถว plan/task file โดย driver (BE-011) — TaskRuntime ใน data-model ไม่แตะ
import { allowedStatesFor } from "./contract/types.ts";
import { ROLES } from "./plan-parser.ts";
import type { RegistryConfig } from "./config.ts";
import type {
  FeatureQaStatus, GateId, HandoffV2, HoldReason, OutputState, Role, SessionKind, Severity, Step, TaskRuntime,
} from "./state-store.ts";

export type RouterConfig = RegistryConfig["scheduler"]; // limit จาก scheduler (BE-001 — freeze ใน run.json)

// TaskRuntime + ข้อมูลแถว plan/task file ที่ router ใช้ (driver join จาก plan-parser — BE-011)
export interface RouterTask extends TaskRuntime {
  depends: string[]; // Depends จากแถว plan — R8/R9 + คำนวณ dependents
  securitySensitive: boolean; // task file — ส่วนหนึ่งของนิยาม 🔒 (DES-019 §Security stage — แสดงบน dashboard)
}

export type RouterEventKind =
  | "handoff" | "crash" | "timeout" | "interrupted" | "plan-changed" | "gate-answered" | "human-retry";

// สถานะ phase ที่ router อ่าน (driver ป้อนจาก run.json phases{} + plan ## Phases + task files + securityGate ใน sessions[])
export interface RouterPhaseInfo {
  locked: boolean; // มี 🔒 (## Phases มี 🔒 ∨ Security-sensitive ∨ securityGate — DES-019 §Security stage)
  cleared: boolean; // phase cleared — satisfied(anchor) (DES-019)
  featureQa: FeatureQaStatus; // กัน R18 dispatch ซ้ำ (queued/running/pass → ไม่คิวใหม่)
  hold: string | null; // reason ของ phases[phase].hold (เช่น feature-qa-unattributed — R20) — ไม่ว่าง → ไม่เปิด R18
}

// event ของ orchestrator (DES-018 §Inputs/Outputs) — field เสริมเป็นข้อมูลที่ driver มีอยู่แล้วใน SessionRecord/run.json
export interface RouterEvent {
  kind: RouterEventKind;
  sessionId: string;
  taskIds: string[];
  handoff?: HandoffV2 | null; // kind = handoff — ผ่าน schema แล้ว (BE-006)
  sessionKind?: SessionKind | null; // จาก SessionRecord.kind — ขาด → derive จาก role/taskIds (ตีความ — รายงาน handoff)
  sessionRole?: Role | null; // จาก SessionRecord.role — ใช้ตอน re-dispatch (R16)
  handoffInvalid?: string[] | null; // problems จาก handoffProblems (BE-006) — ไม่ว่าง → R15 ทันที (AC-068)
  auditSuspects?: string[] | null; // writeAudit.violations[].suspects รวม (DES-021) — R1/R2
  gateId?: GateId | null; // kind = gate-answered — gate ที่เพิ่งถูกตอบ
  phases?: Record<string, RouterPhaseInfo>; // สถานะ phase — R8 (anchor), R18, R19
}

// --- Decision (DES-018 §Inputs/Outputs) — field ตาม sketch + ส่วนที่ task BE-019/design บังคับให้รายงาน ---
export interface RouterTransition {
  taskId: string;
  step: Step;
  hold?: TaskRuntime["hold"]; // มี key (รวม null) = driver ตั้ง/ล้าง · ไม่มี key = คงเดิม
}
export interface RouterDispatch { kind: SessionKind; role: Role; taskIds: string[] }
export interface RouterStatusWrite { taskId: string; value: "verified" | "blocked" } // AC-073 — 2 ค่าเท่านั้น
export interface RouterSecurityMark { phase: string; reason: string }
export interface RouterGate {
  gateId: GateId;
  scope: "task" | "phase" | "module"; // DES-008 §scope (AC-072)
  taskIds: string[];
  phase: string | null;
  question: string;
  owner: string | null; // null = driver เติมจาก gates.yaml (owner_default) — R5/R7/R21 เป็น gate ของระบบ
}
export interface RouterCounter { taskId: string; fixRounds: number; crashRestarts: number } // delta ที่ scheduler ต้องบวก
export interface RouterPhaseHold { phase: string; reason: string } // → phases[phase].hold (R20 — hold ระดับ phase)

export interface Decision {
  ruleId: string; // แถวหลักที่ตัดสิน event นี้ ("R1"…"R24") — log แต่ละบรรทัดมี ruleId ของผลตัวเอง
  transitions: RouterTransition[];
  dispatch: RouterDispatch[];
  statusWrites: RouterStatusWrite[];
  securityMarks: RouterSecurityMark[];
  gates: RouterGate[];
  counters: RouterCounter[]; // (เพิ่มจาก sketch) R4 fixRounds+1 / R16 crashRestarts+1 — scheduler บวกตาม
  phaseHolds: RouterPhaseHold[]; // (เพิ่ม) R20 — hold ระดับ phase ไม่ได้แทะด้วย transitions ต่อ task
  phaseCleared: string[]; // (เพิ่ม) R19/R21 — phases[phase].cleared = true
  log: string[]; // (เพิ่ม — BE-019 Scope) 1 บรรทัด {ruleId, taskId, from, to, reason} ต่อผล — scheduler เขียน router.log
}

export interface RouteOptions {
  // rule satisfied(dep) เต็มของ DES-001 (uxui-designer = gate 3 answered · test-planner = มีแถว TP ของ phase)
  // — driver ผ่าน rule ครบเข้ามาได้ · default: step verified · anchor (Owner qa-engineer) ⇔ phases[phase].cleared (DES-019)
  depsSatisfied?: (dep: RouterTask, tasks: Record<string, RouterTask>) => boolean;
}

const BLOCKING: readonly Severity[] = ["Critical", "Important"];
const ANCHOR: Role = "qa-engineer";
const GATE4: GateId = "qa-critical"; // fail ครั้งที่ 3 / Critical (R5/R7 — DES-008)
const GATE5: GateId = "security-finding"; // R21 — scope phase (DES-008)
const OUTPUT_STATES: readonly OutputState[] = [
  "DONE", "PASS", "FAIL", "BLOCKED", "NEEDS_DESIGN_CHANGE", "NEEDS_REQUIREMENT_CHANGE", "NEEDS_HUMAN",
];
const KINDS: readonly SessionKind[] = ["change", "execution", "review", "qa", "feature-qa", "security", "record-only"];
const STEPS: readonly Step[] = [
  "waiting-deps", "runnable", "execution", "awaiting-review", "review", "awaiting-qa", "qa", "verified", "held",
];

// record-only หลัง gate answered → role เจ้าของเอกสารที่เกี่ยว (DES-008 OQ-D3 ยกตัวอย่าง business-choice → business-analyst;
// ที่เหลือ map ตามเจ้าของเอกสารของ gate นั้น — ตีความ รายงาน handoff)
const GATE_RECORD_ROLE: Record<GateId, Role> = {
  "business-choice": "business-analyst",
  "schema-breaking": "system-analyst",
  "ux-signoff": "uxui-designer",
  "qa-critical": "qa-engineer",
  "security-finding": "security",
  "deploy-real": "devops",
  "release-cut": "project-manager",
};

const isRole = (v: string): v is Role => (ROLES as readonly string[]).includes(v);

// kind ของ session — event.sessionKind มาก่อน · ขาด → derive (record-only = taskIds ว่าง · role → kind ตรงตาราง)
function deriveSessionKind(event: RouterEvent, h: HandoffV2): SessionKind | null {
  if (event.sessionKind !== undefined && event.sessionKind !== null) {
    return (KINDS as readonly string[]).includes(event.sessionKind) ? event.sessionKind : null;
  }
  if (event.taskIds.length === 0) return "record-only";
  switch (h.role) {
    case "reviewer": return "review";
    case "security": return "security";
    case "business-analyst": case "system-analyst": case "project-manager": return "change";
    case "qa-engineer": return h.featureQa !== null ? "feature-qa" : "qa";
    default: return "execution";
  }
}

// --- สะสมผล (mutable ภายใน — คืน Decision ครั้งเดียว ตายตัว) ---
interface Work {
  ruleId: string;
  transitions: Map<string, RouterTransition>;
  dispatch: RouterDispatch[];
  statusWrites: Map<string, RouterStatusWrite>;
  securityMarks: RouterSecurityMark[];
  gates: RouterGate[];
  counters: Map<string, RouterCounter>;
  phaseHolds: RouterPhaseHold[];
  phaseCleared: string[];
  log: string[];
}

interface Ctx {
  event: RouterEvent;
  tasks: Record<string, RouterTask>;
  config: RouterConfig;
  opts: RouteOptions;
  steps: Map<string, Step>; // working copy — transition ใน decision เดียวกันเห็นกันเอง
  holds: Map<string, TaskRuntime["hold"]>; // working copy ของ hold
  W: Work;
}

// บันทึก transition + log line (DES-018 §log: {ruleId, taskId, from, to, reason})
function go(c: Ctx, ruleId: string, taskId: string, to: Step, reason: string, hold?: TaskRuntime["hold"]): void {
  const from = c.steps.get(taskId) ?? "?";
  c.steps.set(taskId, to);
  c.holds.set(taskId, hold === undefined ? c.holds.get(taskId) ?? null : hold);
  const t: RouterTransition = { taskId, step: to };
  if (hold !== undefined) t.hold = hold;
  c.W.transitions.set(taskId, t);
  c.W.log.push(JSON.stringify({ ruleId, taskId, from, to, reason }));
}

function bump(c: Ctx, taskId: string, field: "fixRounds" | "crashRestarts", reason: string, ruleId: string): void {
  const cur = c.W.counters.get(taskId) ?? { taskId, fixRounds: 0, crashRestarts: 0 };
  cur[field] += 1;
  c.W.counters.set(taskId, cur);
  c.W.log.push(JSON.stringify({ ruleId, taskId, from: "", to: `${field}+1`, reason }));
}

function holdTask(c: Ctx, ruleId: string, taskId: string, reason: HoldReason, ref: string | null, why: string): void {
  const cur = c.holds.get(taskId);
  const prevStep = cur?.prevStep ?? c.steps.get(taskId) ?? "waiting-deps";
  go(c, ruleId, taskId, "held", why, { reason, ref, prevStep });
}

// ปลด hold กลับ step เดิม (prevStep ผิดรูป → waiting-deps — เดียวกับ reconcileRun)
function release(c: Ctx, ruleId: string, taskId: string, why: string): void {
  const prev = c.holds.get(taskId)?.prevStep;
  const to: Step = prev && (STEPS as readonly string[]).includes(prev) ? (prev as Step) : "waiting-deps";
  go(c, ruleId, taskId, to, why, null);
}

// dependents แบบทอด (ตรง/ทอด — DES-019) — คืน map dependent → root แรกที่ดึงเข้ามา (deterministic: roots เรียงก่อน)
function dependentsOf(c: Ctx, roots: Iterable<string>): Map<string, string> {
  const rev = new Map<string, string[]>();
  for (const [id, t] of Object.entries(c.tasks)) {
    for (const d of t.depends) rev.set(d, [...(rev.get(d) ?? []), id]);
  }
  const out = new Map<string, string>();
  const queue = [...roots].sort();
  for (const root of queue) {
    const seen = new Set<string>([root]);
    const q = [root];
    while (q.length) {
      const x = q.shift()!;
      for (const dep of [...(rev.get(x) ?? [])].sort()) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        if (!out.has(dep)) out.set(dep, root);
        q.push(dep);
      }
    }
  }
  return out;
}

function satisfied(c: Ctx, depId: string): boolean {
  const dep = c.tasks[depId];
  if (!dep) return false; // อ้าง id ที่ไม่มี → ไม่ satisfied (R9 จัดการ hold)
  if (c.opts.depsSatisfied) return c.opts.depsSatisfied(dep, c.tasks);
  // default ของ design (DES-001 — เจ้าของยืนยัน 2026-10-05): verified · anchor ⇔ phase cleared (DES-019)
  if (dep.owner === ANCHOR) return c.event.phases?.[dep.planPhase]?.cleared === true;
  return (c.steps.get(dep.taskId) ?? dep.step) === "verified";
}

// task id รากของ chain (สำหรับ taskIds ของ change dispatch — packet ต้องมี task id อย่างน้อย 1)
function chainRoot(c: Ctx, reason: "design-change" | "requirement-change", fallback: string | null): string {
  const held = Object.keys(c.tasks).filter((id) => c.holds.get(id)?.reason === reason).sort();
  return held[0] ?? fallback ?? "";
}

// phase ร่วมของ task ใน event (qa round / security stage อยู่ phase เดียวกัน — DES-019) — ขัดกัน → null
function sessionPhase(c: Ctx): string | null {
  const ps = [...new Set(c.event.taskIds.map((id) => c.tasks[id]?.planPhase).filter((p): p is string => !!p))];
  return ps.length === 1 ? ps[0]! : null;
}

// --- R15 — hold invalid-handoff (handoff เสีย / ขัดกันเอง) + แจ้ง dashboard (AC-068) ---
function r15(c: Ctx, problems: string[]): void {
  c.W.ruleId = "R15";
  for (const id of c.event.taskIds) {
    if (!c.tasks[id]) continue;
    holdTask(c, "R15", id, "invalid-handoff", problems[0] ?? "invalid", problems[0] ?? "handoff ไม่ผ่านตรวจ");
  }
  c.W.log.push(JSON.stringify({ ruleId: "R15", taskId: "", from: "", to: "", reason: problems.join(" · ") }));
}

// --- R24 — แถว Owner reviewer/security (AC-079) / anchor > 1 ต่อ phase → hold plan-error แถวนั้น + dependents ---
// คืน true เมื่อมีการ hold ใหม่ (event ของแถวนั้นจะไม่ถูกประมวลผล verdict ต่อ — ไม่ dispatch)
function scanPlanError(c: Ctx, only: Set<string> | null): boolean {
  const flagged = new Map<string, string>(); // taskId → ref
  const consider = (id: string): boolean => c.tasks[id] !== undefined && (only === null || only.has(id));
  for (const id of Object.keys(c.tasks)) {
    const t = c.tasks[id]!;
    if (consider(id) && (t.owner === "reviewer" || t.owner === "security")) flagged.set(id, `owner:${t.owner}`);
  }
  const byPhase = new Map<string, string[]>();
  for (const id of Object.keys(c.tasks)) {
    if (!consider(id) || c.tasks[id]!.owner !== ANCHOR) continue;
    const p = c.tasks[id]!.planPhase;
    byPhase.set(p, [...(byPhase.get(p) ?? []), id]);
  }
  for (const ids of byPhase.values()) {
    if (ids.length > 1) for (const id of ids.sort()) flagged.set(id, "multi-anchor");
  }
  // แถวที่เคยถูก hold plan-error และบัดนี้สะอาดทั้งสาย (plan ถูกแก้ — plan-changed) → ปลดกลับ step เดิม
  if (only === null) {
    const stillBad = dependentsOf(c, flagged.keys()); // dependent ของรากที่ยังผิด — คง hold
    for (const [id, h] of c.holds) {
      if (h?.reason !== "plan-error" || flagged.has(id) || stillBad.has(id)) continue;
      release(c, "R24", id, "แถว plan แก้แล้ว — ปลด hold plan-error");
    }
  }
  if (flagged.size === 0) return false;
  const deps = dependentsOf(c, flagged.keys());
  let held = false;
  const all = new Map<string, string | null>([...[...flagged.keys()].map((id) => [id, flagged.get(id) ?? null] as const),
    ...[...deps].map(([id, root]) => [id, flagged.get(root) ?? null] as const)]);
  for (const [id, ref] of [...all].sort((a, b) => a[0].localeCompare(b[0]))) {
    const cur = c.holds.get(id);
    if (cur && cur.reason !== "plan-error") continue; // hold อื่นครอบอยู่ — ไม่ทับ (task อื่นเดินต่อแบบ R9)
    if (cur?.reason === "plan-error") continue; // คงเดิม — ไม่ log ซ้ำ
    holdTask(c, "R24", id, "plan-error", ref, `plan-error (${ref ?? "?"}) — ห้าม dispatch แถวนี้ + dependents (AC-079)`);
    held = true;
  }
  return held;
}

// --- R9 — Depends อ้าง id ไม่มี / วงวน (AC-039) → hold dep-error task ในวง + dependents (plan-changed เท่านั้น) ---
function depProblems(c: Ctx): Map<string, string> {
  const ids = new Set(Object.keys(c.tasks));
  const bad = new Map<string, string>();
  for (const [id, t] of Object.entries(c.tasks)) {
    const missing = t.depends.filter((d) => !ids.has(d));
    if (missing.length) bad.set(id, `missing:${missing.sort().join(",")}`);
  }
  const onCycle = (start: string): boolean => {
    const stack = [...(c.tasks[start]?.depends ?? [])];
    const visited = new Set<string>();
    while (stack.length) {
      const x = stack.pop()!;
      if (x === start) return true;
      if (!ids.has(x) || visited.has(x)) continue;
      visited.add(x);
      stack.push(...(c.tasks[x]?.depends ?? []));
    }
    return false;
  };
  for (const id of Object.keys(c.tasks)) if (!bad.has(id) && onCycle(id)) bad.set(id, "cycle");
  return bad;
}

function scanDepError(c: Ctx, problems: Map<string, string>): boolean {
  // ปลด hold dep-error ที่หายทั้งสาย (plan แก้แล้ว) — dependent ของรากที่ยังผิดคง hold
  const stillBad = dependentsOf(c, problems.keys());
  for (const [id, h] of c.holds) {
    if (h?.reason !== "dep-error" || problems.has(id) || stillBad.has(id)) continue;
    release(c, "R9", id, "Depends แก้แล้ว — ปลด hold dep-error");
  }
  if (problems.size === 0) return false;
  const deps = dependentsOf(c, problems.keys());
  const all = new Map<string, string | null>([
    ...[...problems.keys()].map((id) => [id, problems.get(id) ?? null] as const),
    ...[...deps].map(([id, root]) => [id, problems.get(root) ?? null] as const),
  ]);
  let held = false;
  for (const [id, ref] of [...all].sort((a, b) => a[0].localeCompare(b[0]))) {
    const cur = c.holds.get(id);
    if (cur && cur.reason !== "dep-error") continue;
    if (cur?.reason === "dep-error") continue;
    holdTask(c, "R9", id, "dep-error", ref, `dep-error (${ref ?? "?"}) — Depends อ้าง id ไม่มี/วงวน (AC-039)`);
    held = true;
  }
  return held;
}

// --- R8 — DAG ordering: Depends ครบ → runnable / ไม่ครบ → waiting-deps (DES-001 — ทุก tick) ---
function applyR8(c: Ctx): void {
  for (const [id, t] of Object.entries(c.tasks)) {
    const s = c.steps.get(id)!;
    if (s !== "waiting-deps" && s !== "runnable") continue;
    if (t.owner === ANCHOR) continue; // anchor เดินด้วย R18/R19/R20 เท่านั้น — satisfied(anchor) = phase cleared ไม่ใช่ Depends
    if (c.holds.get(id)) continue; // hold ใด ๆ ครอบ — ไม่แตะ (ปลดด้วย rule ของมันเอง)
    if (t.currentSessionId !== null) continue; // active — ไม่แตะ
    const want: Step = t.depends.every((d) => satisfied(c, d)) ? "runnable" : "waiting-deps";
    if (s !== want) go(c, "R8", id, want, want === "runnable" ? "Depends ครบ — runnable (DES-001)" : "Depends ไม่ครบ — waiting-deps");
  }
}

// --- R4/R5 — fail ที่ระบุ task: นับ fix round ตัวเดียว → เกิน limit = gate 4 หยุดที่คน (AC-071/AC-076) ---
// statusWrite blocked เฉพาะแหล่ง QA/Feature-QA (R4 verbatim: "(QA/Feature-QA) Status blocked") — review FAIL ไม่เขียน Status
function fixOrGate(c: Ctx, t: RouterTask, source: "review" | "qa" | "feature-qa"): void {
  const id = t.taskId;
  if (t.fixRounds < c.config.fixRoundLimit) {
    // R4 — fixRounds++ · execution session ใหม่ + defect packet (packet สร้างโดย BE-021 จาก handoff)
    c.W.ruleId = "R4";
    bump(c, id, "fixRounds", `fix round ${t.fixRounds + 1}/${c.config.fixRoundLimit} (${source} FAIL ระบุ task)`, "R4");
    go(c, "R4", id, "execution", `fix session ใหม่ + defect packet (fixRounds ${t.fixRounds + 1}/${c.config.fixRoundLimit})`, null);
    c.W.dispatch.push({ kind: "execution", role: t.owner, taskIds: [id] });
    if (source !== "review") c.W.statusWrites.set(id, { taskId: id, value: "blocked" });
  } else {
    // R5 — fixRounds == limit: ไม่ dispatch · hold + gate 4 qa-critical (fail ครั้งที่ 3 — DES-008)
    c.W.ruleId = "R5";
    holdTask(c, "R5", id, "gate", GATE4, `fail ครั้งที่ ${t.fixRounds + 1} (fixRounds ${t.fixRounds} == limit ${c.config.fixRoundLimit}) — gate 4 รอคน`);
    if (source !== "review") c.W.statusWrites.set(id, { taskId: id, value: "blocked" });
    c.W.gates.push({
      gateId: GATE4, scope: "task", taskIds: [id], phase: t.planPhase,
      question: `task ${id} fail ครบ fixRoundLimit (${c.config.fixRoundLimit}) จาก ${source} — ตัดสิน: กด retry หรือให้ PM replan`,
      owner: null,
    });
  }
}

// --- R7 — QA defect Critical → Status blocked + gate 4 ทันที (เด่นกว่า R4 — ไม่ส่ง fix ก่อนคนตัดสิน) ---
// เรียก "แทน" R4/R6 ของ task นั้น (ผู้เรียกเช็คชุด Critical ก่อน loop perTask) — ไม่นับ fixRounds
function r7(c: Ctx, t: RouterTask, defectId: string): void {
  const id = t.taskId;
  holdTask(c, "R7", id, "gate", GATE4, `QA defect ${defectId} Critical — gate 4 ทันที`);
  c.W.statusWrites.set(id, { taskId: id, value: "blocked" });
  c.W.gates.push({
    gateId: GATE4, scope: "task", taskIds: [id], phase: t.planPhase,
    question: `QA defect ${defectId} severity Critical ที่ task ${id} — ต้องตัดสินก่อนเดินต่อ (gate 4)`, owner: null,
  });
}

// --- R12 — NEEDS_HUMAN → gate ตาม questionsForHuman[].gate · SA gate none → 2/1 ตาม touchesSchemaOrContract (AC-078) ---
function r12(c: Ctx, h: HandoffV2, evTasks: string[]): void {
  const phase = sessionPhase(c);
  for (const q of h.questionsForHuman) {
    const gateId: GateId = q.gate === "none"
      ? h.role === "system-analyst"
        ? q.touchesSchemaOrContract === true ? "schema-breaking" : "business-choice"
        : "business-choice" // DES-008 Fallback — ไม่ระบุ gate = business-choice (gate 1)
      : q.gate;
    const scope: RouterGate["scope"] = evTasks.length > 0 ? "task" : "module"; // change chain ก่อนมี plan = module (DES-008)
    c.W.gates.push({ gateId, scope, taskIds: [...evTasks], phase, question: q.question, owner: q.owner });
    if (scope !== "task") continue;
    const deps = dependentsOf(c, evTasks);
    for (const id of [...evTasks, ...deps.keys()].sort()) {
      if (!c.tasks[id]) continue;
      holdTask(c, "R12", id, "gate", gateId, `NEEDS_HUMAN — gate ${gateId} (owner ${q.owner})`);
    }
  }
}

// --- R14 — BLOCKED → hold blocked ไม่นับรอบ ---
function r14(c: Ctx, h: HandoffV2, evTasks: string[], ruleId = "R14"): void {
  c.W.ruleId = ruleId;
  const ref = h.blocker?.reference ?? null;
  for (const id of evTasks) {
    if (!c.tasks[id]) continue;
    holdTask(c, ruleId, id, "blocked", ref, `BLOCKED (${h.blocker?.type ?? "?"}) — hold ไม่นับรอบ`);
  }
}

// --- R13 — PM DONE ใน change chain (R10/R11 คิว SA → PM → R13) ---
function r13(c: Ctx, h: HandoffV2): void {
  const impacted = [...new Set(h.impactedTasks ?? [])];
  for (const id of impacted) {
    const t = c.tasks[id];
    if (!t) continue;
    if (c.steps.get(id) === "verified") {
      holdTask(c, "R13", id, "reopen-needed", null, `อยู่ใน impactedTasks แต่ verified — hold reopen-needed (R13)`);
      continue;
    }
    if (t.currentSessionId !== null) continue; // active — ไม่ dispatch ทับ
    go(c, "R13", id, "execution", `PM replan — session ใหม่ (ไม่นับรอบ — R13)`, null);
    c.W.dispatch.push({ kind: "execution", role: t.owner, taskIds: [id] });
  }
  // task ต้นเรื่อง/dependent ที่โดน hold design/requirement-change และไม่อยู่ใน impact → กลับ step เดิม
  for (const [id, h0] of c.holds) {
    if (h0?.reason !== "design-change" && h0?.reason !== "requirement-change") continue;
    if (impacted.includes(id)) continue;
    release(c, "R13", id, "task ต้นเรื่องนอก impact — กลับ step เดิม (R13)");
  }
}

// --- R18 — Feature QA: ทุก task ใน phase verified (ไม่นับ anchor + dependents ของ anchor — DES-019) และไม่มีแถว
// hold plan-error → คิว feature-qa (taskIds = anchor · ไม่มี anchor = ว่าง) · เปิดเมื่อ featureQa not-ready|fail และ phase ไม่ถูก hold
function applyR18(c: Ctx, phases: string[]): void {
  for (const p of phases) {
    const info = c.event.phases?.[p];
    if (info?.hold) continue; // phase ถูก hold (เช่น feature-qa-unattributed — R20) — ไม่เปิด
    if (c.W.phaseHolds.some((h) => h.phase === p)) continue; // hold phase ที่ decision เดียวกันเพิ่ง emit (R20) — ไม่เปิด
    const fq = info?.featureQa ?? "not-ready";
    if (fq !== "not-ready" && fq !== "fail") continue;
    const ids = Object.keys(c.tasks).filter((id) => c.tasks[id]!.planPhase === p).sort();
    if (ids.some((id) => c.holds.get(id)?.reason === "plan-error")) continue; // ไม่มีแถว hold plan-error ใน phase
    const anchors = ids.filter((id) => c.tasks[id]!.owner === ANCHOR);
    const anchorDeps = dependentsOf(c, anchors); // dependents ของ anchor = งานหลัง Feature QA — R18 ไม่รอ
    const mustVerify = ids.filter((id) => !anchors.includes(id) && !anchorDeps.has(id));
    if (!mustVerify.every((id) => c.steps.get(id) === "verified")) continue;
    const anchorId = anchors[0] ?? null;
    // anchor พร้อมเมื่อ Depends โดยนัย (task อื่นใน phase — เช็คด้านบน) **และ** ที่เขียน explicit ครบด้วย (DES-019 §anchor "+ที่เขียน — R8")
    // — phase ที่มีแต่ anchor (เช่น plan จริง phase 6) ต้องรอ Depends ของ anchor เอง ไม่เปิดว่างเปล่า
    if (anchorId && !c.tasks[anchorId]!.depends.every((dep) => satisfied(c, dep))) continue;
    c.W.dispatch.push({ kind: "feature-qa", role: "qa-engineer", taskIds: anchorId ? [anchorId] : [] });
    c.W.log.push(JSON.stringify({
      ruleId: "R18", taskId: anchorId ?? "", from: "", to: "dispatch:feature-qa",
      reason: `phase ${p} verified ครบ (ไม่นับ anchor + dependents ของ anchor) — คิว feature-qa`,
    }));
    if (anchorId && !c.holds.get(anchorId) && c.steps.get(anchorId) !== "qa") {
      go(c, "R18", anchorId, "qa", `feature-qa session ของ phase ${p} — step qa ระหว่างรัน (DES-019)`);
    }
  }
}

// --- ประมวล handoff (kind handoff) — ตาราง R1–R23 ตาม kind/state ---
function handleHandoff(c: Ctx): void {
  const h = c.event.handoff;
  const evTasks = c.event.taskIds.filter((id) => c.tasks[id] !== undefined);

  // R15 — ตรวจกันชั้นที่สอง (input ปกติผ่าน schema มาแล้ว — BE-006; ที่นี่ fail-closed ตาม R15)
  const problems: string[] = [];
  if (c.event.handoffInvalid && c.event.handoffInvalid.length > 0) problems.push(...c.event.handoffInvalid);
  if (!h || !h.outputState) {
    problems.push("handoff ไม่มี outputState");
  } else {
    const state = h.outputState as OutputState;
    if (!(OUTPUT_STATES as readonly string[]).includes(state)) {
      problems.push(`outputState ${JSON.stringify(state)} นอกชุด 7 ค่า`);
    } else if (!isRole(h.role)) {
      problems.push(`role ${JSON.stringify(h.role)} ไม่รู้จัก`);
    } else {
      const kind = deriveSessionKind(c.event, h);
      if (!kind) problems.push(`sessionKind ${JSON.stringify(c.event.sessionKind)} ไม่รู้จัก`);
      else if (!allowedStatesFor(kind, h.role).includes(state)) {
        problems.push(`outputState ${state} นอกชุดของ kind "${kind}" (ตาราง DES-018)`);
      } else {
        // verdict ขัดกันเอง / ขัด §Severity → R15 (DES-018 §Severity + §รูป blocker)
        if (kind === "review" && h.review) {
          const blocking = new Map<string, number>();
          for (const f of h.review.findings) {
            if (BLOCKING.includes(f.severity)) blocking.set(f.task, (blocking.get(f.task) ?? 0) + 1);
          }
          for (const p of h.review.perTask) {
            const n = blocking.get(p.task) ?? 0;
            if (p.verdict === "FAIL" && n < 1) problems.push(`review perTask FAIL ที่ ${p.task} แต่ไม่มี finding Critical|Important — ขัด §Severity`);
            if (p.verdict === "PASS" && n > 0) problems.push(`review perTask PASS ที่ ${p.task} แต่มี finding Critical|Important — ขัด §Severity`);
          }
        }
        if (kind === "qa" && h.qa) {
          const blockingDefects = new Set(h.qa.defects.filter((d) => BLOCKING.includes(d.severity) && d.task).map((d) => d.task as string));
          for (const p of h.qa.perTask) {
            if (p.verdict === "verified" && blockingDefects.has(p.task)) {
              problems.push(`qa perTask verified ที่ ${p.task} แต่มี defect Critical|Important — verdict ขัด §Severity`);
            }
          }
        }
        if (kind === "feature-qa" && h.featureQa) {
          const anyFail = h.featureQa.flows.some((f) => f.result === "FAIL");
          if (state === "PASS" && anyFail) problems.push("featureQa มี flow FAIL แต่ outputState PASS — ขัดกันเอง");
          if (state === "FAIL" && !anyFail) problems.push("featureQa ไม่มี flow FAIL แต่ outputState FAIL — ขัดกันเอง");
        }
        // R23 — securityGate.phase ≠ phase ของ session → R15
        if ((kind === "qa" || kind === "feature-qa") && h.securityGate && h.securityGate.length > 0) {
          const p = sessionPhase(c);
          if (p) for (const g of h.securityGate) {
            if (g.phase !== p) problems.push(`securityGate.phase "${g.phase}" ≠ phase ของ session "${p}" — R15 (R23)`);
          }
        }
      }
    }
  }
  if (problems.length > 0) return r15(c, problems);

  const state = (h!.outputState ?? "BLOCKED") as OutputState;
  const kind = deriveSessionKind(c.event, h!)!;
  const role = h!.role;

  // R23 — securityGate ไม่ว่าง (G2-f) → securityMarks ประมวลร่วมกับแถวของ outputState — ไม่ hold ไม่นับรอบ
  if ((kind === "qa" || kind === "feature-qa") && h!.securityGate && h!.securityGate.length > 0) {
    for (const g of h!.securityGate) {
      c.W.securityMarks.push({ phase: g.phase, reason: g.reason });
      c.W.log.push(JSON.stringify({ ruleId: "R23", taskId: "", from: "", to: `securityMark:${g.phase}`, reason: g.reason }));
    }
  }

  const suspects = c.event.auditSuspects ?? [];
  if (suspects.length > 0) {
    // R2 — audit violation: hold ทุก suspect ไม่นับรอบ (DES-018 แถว R2 · DES-021 §4 · QA-010)
    c.W.ruleId = "R2";
    const matched = [...new Set(suspects)].filter((id) => !!c.tasks[id]);
    if (matched.length > 0) {
      for (const id of matched) {
        holdTask(c, "R2", id, "audit-violation", null, "write audit พบ violation — hold ไม่นับรอบ");
      }
    } else {
      c.W.log.push(JSON.stringify({ ruleId: "R2", taskId: "", from: "", to: "held", reason: `write audit พบ violation — suspects [${suspects.join(", ")}] ไม่อยู่ใน tasks` }));
    }
    return;
  }

  switch (kind) {
    case "execution": {
      if (state === "DONE") {
        // R1 — execution DONE + audit สะอาด → awaiting-review
        c.W.ruleId = "R1";
        for (const id of evTasks) go(c, "R1", id, "awaiting-review", "DONE + audit สะอาด — รอ review wave");
      } else if (state === "BLOCKED") r14(c, h!, evTasks);
      else if (state === "NEEDS_DESIGN_CHANGE") {
        // R10 — hold design-change + dependents · คิว change: SA → PM → R13
        c.W.ruleId = "R10";
        const b = h!.blocker!;
        const roots = evTasks.length > 0 ? evTasks : c.tasks[b.task] ? [b.task] : [];
        const deps = dependentsOf(c, roots);
        for (const id of [...roots, ...deps.keys()].sort()) holdTask(c, "R10", id, "design-change", b.reference, `NEEDS_DESIGN_CHANGE (${b.reference}) — hold + dependents`);
        c.W.dispatch.push({ kind: "change", role: "system-analyst", taskIds: [b.task] });
      } else if (state === "NEEDS_REQUIREMENT_CHANGE") {
        // R11 — hold requirement-change · คิว BA ก่อนเสมอ (AC-063)
        c.W.ruleId = "R11";
        const b = h!.blocker!;
        const roots = evTasks.length > 0 ? evTasks : c.tasks[b.task] ? [b.task] : [];
        const deps = dependentsOf(c, roots);
        for (const id of [...roots, ...deps.keys()].sort()) holdTask(c, "R11", id, "requirement-change", b.reference, `NEEDS_REQUIREMENT_CHANGE (${b.reference}) — hold + dependents`);
        c.W.dispatch.push({ kind: "change", role: "business-analyst", taskIds: [b.task] });
      } else {
        // R12 — NEEDS_HUMAN
        c.W.ruleId = "R12";
        r12(c, h!, evTasks);
      }
      break;
    }
    case "change": {
      if (state === "DONE") {
        if (role === "project-manager") {
          c.W.ruleId = "R13";
          r13(c, h!);
        } else if (role === "business-analyst") {
          // R11 — คิว BA ก่อนเสมอ → nextRole ของ BA (SA|PM|none) — เฉพาะเมื่ออยู่ใน requirement chain
          const chain = Object.values(c.tasks).some((t) => c.holds.get(t.taskId)?.reason === "requirement-change");
          if (chain) {
            c.W.ruleId = "R11";
            const root = chainRoot(c, "requirement-change", evTasks[0] ?? h!.blocker?.task ?? null);
            if (h!.nextRole === "system-analyst") {
              c.W.dispatch.push({ kind: "change", role: "system-analyst", taskIds: [root] });
            } else if (h!.nextRole === "none") {
              // BA เก็บงานได้เอง (amend REQ จบ ไม่ต้อง SA/PM) — ปลด hold ของ chain กลับ step เดิม (ตีความ — รายงาน handoff)
              for (const [id, h0] of c.holds) {
                if (h0?.reason === "requirement-change") release(c, "R11", id, "BA ปิด requirement chain (nextRole none) — กลับ step เดิม");
              }
            } else {
              // nextRole PM (หรือ role แปลก) → PM ตัดสินท้าย chain เสมอ (SA ตามด้วย PM — R11)
              c.W.dispatch.push({ kind: "change", role: "project-manager", taskIds: [root] });
            }
          } else {
            // BA DONE นอก chain (งานใหม่ REQ-007/DES-010) — ไม่มีแถว R ครอบ → fallback R15 (event ไม่ตรงแถวใด)
            r15(c, ["change DONE ไม่มี chain ที่ตรงแถว R10–R13 (งานใหม่ให้ driver เดินตาม DES-010 นอก router)"]);
          }
        } else if (role === "system-analyst") {
          // R10/R11 — SA ตามด้วย PM เสมอ
          const design = Object.values(c.tasks).some((t) => c.holds.get(t.taskId)?.reason === "design-change");
          const req = Object.values(c.tasks).some((t) => c.holds.get(t.taskId)?.reason === "requirement-change");
          if (design || req) {
            c.W.ruleId = design ? "R10" : "R11";
            c.W.dispatch.push({ kind: "change", role: "project-manager", taskIds: [chainRoot(c, design ? "design-change" : "requirement-change", evTasks[0] ?? h!.blocker?.task ?? null)] });
          } else {
            r15(c, ["change DONE ไม่มี chain ที่ตรงแถว R10–R13"]);
          }
        } else {
          r15(c, [`role ${role} ไม่ใช่ BA/SA/PM แต่ kind change`]);
        }
      } else if (state === "BLOCKED") r14(c, h!, evTasks);
      else if (state === "NEEDS_REQUIREMENT_CHANGE") {
        // SA รายงาน NRC กลาง chain — R11 คิว BA ต่อ
        c.W.ruleId = "R11";
        const b = h!.blocker!;
        const roots = evTasks.length > 0 ? evTasks : c.tasks[b.task] ? [b.task] : [];
        const deps = dependentsOf(c, roots);
        for (const id of [...roots, ...deps.keys()].sort()) holdTask(c, "R11", id, "requirement-change", b.reference, `NEEDS_REQUIREMENT_CHANGE (${b.reference}) — คิว BA ก่อนเสมอ (AC-063)`);
        c.W.dispatch.push({ kind: "change", role: "business-analyst", taskIds: [b.task] });
      } else {
        c.W.ruleId = "R12";
        r12(c, h!, evTasks);
      }
      break;
    }
    case "review": {
      if (state === "PASS" || state === "FAIL") {
        if (!h!.review) return r15(c, ["kind review แต่ไม่มี review block — ขัดกันเอง"]);
        // R3/R4/R5 — ต่อ task ตาม verdict ของตัวเอง (AC-056 — localized)
        c.W.ruleId = "R3";
        const seen = new Set<string>();
        for (const p of h!.review.perTask) {
          const t = c.tasks[p.task];
          if (!t || seen.has(p.task)) continue;
          seen.add(p.task);
          if (p.verdict === "PASS") {
            go(c, "R3", p.task, "awaiting-qa", "review perTask PASS — รอ QA round");
          } else {
            fixOrGate(c, t, "review");
          }
        }
      } else if (state === "BLOCKED") r14(c, h!, evTasks);
      else r12(c, h!, evTasks); // NEEDS_HUMAN
      break;
    }
    case "qa": {
      if (state === "PASS" || state === "FAIL") {
        if (!h!.qa) return r15(c, ["kind qa แต่ไม่มี qa block — ขัดกันเอง"]);
        const qa = h!.qa;
        // R7 — defect Critical → gate 4 ทันที (เด่นกว่า R4/R6 — เช็คก่อน loop perTask)
        const critical = new Set(qa.defects.filter((d) => d.severity === "Critical" && d.task && c.tasks[d.task]).map((d) => d.task as string));
        c.W.ruleId = "R6";
        const seen = new Set<string>();
        for (const p of qa.perTask) {
          const t = c.tasks[p.task];
          if (!t || seen.has(p.task)) continue;
          seen.add(p.task);
          if (critical.has(p.task)) {
            c.W.ruleId = "R7";
            r7(c, t, qa.defects.find((d) => d.task === p.task && d.severity === "Critical")?.id ?? "QA-???");
          } else if (p.verdict === "verified") {
            // R6 — Status verified (คัดจาก verdict — DES-007) · unlock dependents (applyR8 บน working steps)
            go(c, "R6", p.task, "verified", "qa perTask verified");
            c.W.statusWrites.set(p.task, { taskId: p.task, value: "verified" });
          } else {
            // R4/R5 — QA blocked ระบุ task (ruleId ตั้งใน fixOrGate)
            fixOrGate(c, t, "qa");
          }
        }
        // Critical defect ของ task ที่ perTask ไม่ได้พูดถึง — R7 จับตรง ๆ (ไม่ผ่าน R4)
        for (const id of [...critical].sort()) {
          if (!seen.has(id)) r7(c, c.tasks[id]!, qa.defects.find((d) => d.task === id && d.severity === "Critical")?.id ?? "QA-???");
        }
      } else if (state === "BLOCKED") r14(c, h!, evTasks);
      else r12(c, h!, evTasks);
      break;
    }
    case "feature-qa": {
      if (!h!.featureQa) return r15(c, ["kind feature-qa แต่ไม่มี featureQa block — ขัดกันเอง"]);
      const fq = h!.featureQa;
      const phase = c.tasks[evTasks[0] ?? ""]?.planPhase ?? fq.phase;
      if (state === "PASS") {
        // R19 — anchor Status verified · phase มี 🔒 → คิว security (stage ท้าย phase — AC-080) · ไม่มี → phase cleared
        c.W.ruleId = "R19";
        const anchorId = evTasks[0];
        if (anchorId && c.tasks[anchorId]) {
          go(c, "R19", anchorId, "verified", "Feature QA PASS — anchor verified (R19)");
          c.W.statusWrites.set(anchorId, { taskId: anchorId, value: "verified" });
        }
        if (phase) {
          if (c.event.phases?.[phase]?.locked) {
            const members = Object.keys(c.tasks)
              .filter((id) => c.tasks[id]!.planPhase === phase && c.steps.get(id) === "verified" && c.holds.get(id)?.reason !== "plan-error")
              .sort();
            c.W.dispatch.push({ kind: "security", role: "security", taskIds: members });
            c.W.log.push(JSON.stringify({
              ruleId: "R19", taskId: "", from: "", to: "dispatch:security",
              reason: `phase ${phase} มี 🔒 — คิว security หลัง Feature QA PASS (stage ท้าย phase — AC-080)`,
            }));
          } else {
            c.W.phaseCleared.push(phase);
            c.W.log.push(JSON.stringify({ ruleId: "R19", taskId: "", from: "", to: "phase-cleared", reason: `phase ${phase} ไม่มี 🔒 — cleared (R19)` }));
          }
        }
      } else if (state === "FAIL") {
        const attributed = [...new Set(fq.defects.filter((d) => d.task && c.tasks[d.task]).map((d) => d.task as string))];
        if (attributed.length > 0) {
          // R4/R5 — Feature QA FAIL ระบุ task + anchor blocked / step waiting-deps (DES-019 §anchor)
          for (const id of attributed) fixOrGate(c, c.tasks[id]!, "feature-qa");
          if (c.tasks[evTasks[0] ?? ""]) {
            const anchorId = evTasks[0]!;
            if (!attributed.includes(anchorId)) {
              go(c, "R4", anchorId, "waiting-deps", "Feature QA FAIL — anchor รอ phase ใหม่ (satisfied(anchor) = phase cleared)");
              c.W.statusWrites.set(anchorId, { taskId: anchorId, value: "blocked" });
            }
          }
        } else {
          // R20 — FAIL ไม่ระบุ task: hold phase feature-qa-unattributed · fixRounds คงเดิม (AC-077)
          c.W.ruleId = "R20";
          c.W.phaseHolds.push({ phase, reason: "feature-qa-unattributed" });
          c.W.log.push(JSON.stringify({ ruleId: "R20", taskId: "", from: "", to: `phase-hold:${phase}`, reason: "Feature QA FAIL ไม่ระบุ task — hold phase (AC-077)" }));
          const anchorId = evTasks[0];
          if (anchorId && c.tasks[anchorId]) {
            holdTask(c, "R20", anchorId, "gate", phase, "Feature QA FAIL ไม่ระบุ task — anchor blocked / step held (ref = phase)");
            c.W.statusWrites.set(anchorId, { taskId: anchorId, value: "blocked" });
          }
        }
      } else if (state === "BLOCKED") r14(c, h!, evTasks);
      else r12(c, h!, evTasks);
      break;
    }
    case "security": {
      const phase = sessionPhase(c);
      if (state === "PASS") {
        // R21 — security PASS → phase cleared
        c.W.ruleId = "R21";
        if (phase) {
          c.W.phaseCleared.push(phase);
          c.W.log.push(JSON.stringify({ ruleId: "R21", taskId: "", from: "", to: "phase-cleared", reason: `security PASS — phase ${phase} cleared (R21)` }));
        }
      } else if (state === "FAIL") {
        const blocking = (h!.security?.findings ?? []).filter((f) => BLOCKING.includes(f.severity));
        if (blocking.length > 0) {
          // R21 — FAIL มี Critical|Important → gate 5 (scope phase — DES-008) · ไม่ cleared
          c.W.ruleId = "R21";
          c.W.gates.push({
            gateId: GATE5, scope: "phase", taskIds: [], phase,
            question: `security พบ finding ${blocking.map((f) => f.id).join(", ")} severity Critical|Important ใน phase ${phase ?? "?"} — gate 5`,
            owner: null,
          });
        } else {
          // FAIL มีแค่ Minor → non-blocking (Minor → backlog — §Severity) → phase cleared
          c.W.ruleId = "R21";
          if (phase) {
            c.W.phaseCleared.push(phase);
            c.W.log.push(JSON.stringify({ ruleId: "R21", taskId: "", from: "", to: "phase-cleared", reason: `security FAIL เฉพาะ Minor (→ backlog) — phase ${phase} cleared (R21)` }));
          }
        }
      } else if (state === "BLOCKED") r14(c, h!, evTasks);
      else r12(c, h!, evTasks);
      break;
    }
    case "record-only": {
      // record-only จดคำตอบ gate ลงเอกสาร — ไม่ขยับ state งาน (R22/DES-008)
      c.W.ruleId = "R22";
      c.W.log.push(JSON.stringify({ ruleId: "R22", taskId: "", from: "", to: "", reason: `record-only ${state} — จดเอกสารแล้ว ไม่แตะ state งาน` }));
      break;
    }
  }
}

// --- ประมวล crash/timeout/interrupted — R16/R17 (AC-075) ---
function handleCrash(c: Ctx): void {
  const evTasks = c.event.taskIds.filter((id) => c.tasks[id] !== undefined);
  const kind: SessionKind = c.event.sessionKind ?? "execution";
  const first = evTasks.map((id) => c.tasks[id]!).find(Boolean);
  const role: Role | null = c.event.sessionRole
    ?? (kind === "review" ? "reviewer"
      : kind === "qa" || kind === "feature-qa" ? "qa-engineer"
        : kind === "security" ? "security"
          : first?.owner ?? null);
  const under = evTasks.filter((id) => c.tasks[id]!.crashRestarts < c.config.crashRestartLimit);
  for (const id of evTasks) {
    if (under.includes(id)) {
      // R16 — crashRestarts++ · session ใหม่ + priorSession.touchedFiles (driver แนบ) · fixRounds คงเดิม
      bump(c, id, "crashRestarts", `crash/timeout/interrupted — restart ${c.tasks[id]!.crashRestarts + 1}/${c.config.crashRestartLimit}`, "R16");
      go(c, "R16", id, "execution", "session ใหม่ + priorSession.touchedFiles — ไม่ revert ไฟล์ ไม่นับ fix round", null);
    } else {
      // R17 — crash ครบ limit → hold crash-limit (AC-075)
      holdTask(c, "R17", id, "crash-limit", null, `crash ครบ crashRestartLimit (${c.config.crashRestartLimit}) — hold (AC-075)`);
      c.W.ruleId = "R17";
    }
  }
  if (under.length > 0) {
    if (c.W.ruleId === "R8") c.W.ruleId = "R16";
    if (role) {
      // session ใหม่แทนที่ session ที่ล่อ — dispatch เดียวครบ task ที่ยัง restart ได้ (wave/round รวมกลุ่มเดิม)
      c.W.dispatch.push({ kind, role, taskIds: under });
    } else {
      c.W.log.push(JSON.stringify({ ruleId: "R16", taskId: "", from: "", to: "", reason: "ไม่ทราบ role ของ session เดิม — ไม่ re-dispatch (driver ต้องส่ง sessionRole)" }));
    }
  }
}

// --- ประมวล gate-answered / human-retry — R22 ---
function handleGate(c: Ctx): void {
  c.W.ruleId = "R22";
  if (c.event.kind === "gate-answered") {
    const gateId = c.event.gateId;
    if (!gateId) {
      r15(c, ["gate-answered ไม่ระบุ gateId"]);
      return;
    }
    // record-only ไปยัง role เจ้าของเอกสาร — จดคำตอบลงเอกสาร (DES-008 OQ-D3) · taskIds ว่างได้
    c.W.dispatch.push({ kind: "record-only", role: GATE_RECORD_ROLE[gateId], taskIds: [] });
    for (const [id, h0] of c.holds) {
      if (h0?.reason !== "gate" || h0.ref !== gateId) continue;
      if (gateId === GATE4) {
        // gate 4 → ค้างจนคนกด retry (DES-009) หรือ PM replan — ไม่ปลดด้วยคำตอบ gate
        c.W.log.push(JSON.stringify({ ruleId: "R22", taskId: id, from: "held", to: "held", reason: "gate 4 ตอบแล้ว — ค้างจนคนกด retry หรือ PM replan" }));
        continue;
      }
      release(c, "R22", id, `gate ${gateId} answered — กลับ step เดิม`);
    }
  } else {
    // human-retry — ปลด hold gate 4 ของ task ที่ระบุ · retry ของคนไม่ reset ตัวนับ — fail ถัดไปเข้า R5 (DES-018 §ตัวนับ)
    for (const id of c.event.taskIds) {
      const h0 = c.holds.get(id);
      if (!c.tasks[id] || h0?.reason !== "gate" || h0.ref !== GATE4) continue;
      release(c, "R22", id, "คนกด retry — กลับ step เดิม (ตัวนับคงเดิม)");
    }
  }
}

// --- ทางเข้าเดียว: route(event, tasks, config) → Decision (pure) ---
export function route(event: RouterEvent, tasks: Record<string, RouterTask>, config: RouterConfig, opts: RouteOptions = {}): Decision {
  const c: Ctx = {
    event, tasks, config, opts,
    steps: new Map(Object.entries(tasks).map(([id, t]) => [id, t.step])),
    holds: new Map(Object.entries(tasks).map(([id, t]) => [id, t.hold ?? null])),
    W: {
      ruleId: "R8", transitions: new Map(), dispatch: [], statusWrites: new Map(), securityMarks: [], gates: [],
      counters: new Map(), phaseHolds: [], phaseCleared: [], log: [],
    },
  };

  if (event.kind === "handoff") {
    // R24 ก่อนเสมอ — event ของแถว plan-error ไม่ถูกตัดสินด้วย verdict (ไม่ dispatch — AC-079)
    const evSet = new Set(event.taskIds.filter((id) => tasks[id]));
    scanPlanError(c, evSet.size > 0 ? evSet : null);
    if ([...evSet].some((id) => c.holds.get(id)?.reason === "plan-error")) {
      c.W.ruleId = "R24";
    } else {
      handleHandoff(c);
    }
  } else if (event.kind === "crash" || event.kind === "timeout" || event.kind === "interrupted") {
    handleCrash(c);
  } else if (event.kind === "gate-answered" || event.kind === "human-retry") {
    handleGate(c);
  } else if (event.kind === "plan-changed") {
    // tick ที่ plan เปลี่ยน — ตรวจทั้ง module: R24 → R9 → (R8/R18 ท้ายรวม)
    const heldPlanError = scanPlanError(c, null);
    const heldDep = scanDepError(c, depProblems(c));
    c.W.ruleId = heldPlanError ? "R24" : heldDep ? "R9" : "R8";
  }

  // R8 — DAG ordering ทุก tick (DES-001: tick = ทุก event) — ทำงานบน working steps (R6 unlock / R13 release เห็นผลทันที)
  applyR8(c);

  // R18 — เปิด Feature QA ของ phase ที่เกี่ยว (plan-changed = ทุก phase)
  const tickPhases = event.kind === "plan-changed"
    ? [...new Set(Object.values(tasks).map((t) => t.planPhase))].sort()
    : [...new Set(event.taskIds.map((id) => tasks[id]?.planPhase).filter((p): p is string => !!p))].sort();
  if (event.kind !== "crash" && event.kind !== "timeout" && event.kind !== "interrupted") applyR18(c, tickPhases);

  const counters = [...c.W.counters.values()].sort((a, b) => a.taskId.localeCompare(b.taskId));
  return {
    ruleId: c.W.ruleId,
    transitions: [...c.W.transitions.values()],
    dispatch: c.W.dispatch,
    statusWrites: [...c.W.statusWrites.values()],
    securityMarks: c.W.securityMarks,
    gates: c.W.gates,
    counters,
    phaseHolds: c.W.phaseHolds,
    phaseCleared: c.W.phaseCleared,
    log: c.W.log,
  };
}
