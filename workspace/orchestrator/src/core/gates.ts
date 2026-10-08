// BE-009 — gate evaluator + GateRecord ต่อ scope (DES-008): ประตูคนทั้ง 7 บังคับโดย state machine ไม่ใช่ความหวังว่า agent จะหยุดเอง (REQ-006)
// trigger 3 ชั้น — (a) handoff: outputState NEEDS_HUMAN + questionsForHuman (mirror R12 — AC-078: SA gate "none" → 2/1) และ
// Decision ของ router R5/R7/R12/R21 (BE-019); (b) structural: ux-signoff / deploy-real / release-cut; (c) doc: แถวค้างใน `## Waiting on Human`
// GateRecord append-only — เปิด = push แถว status "open" · ตอบ = lifecycle ของแถวเดียวกัน open → answered
// (gateLog ไม่ลบแถว ไม่แก้คำถาม/owner/scope ย้อนหลัง — เหตุผลใน answerGate)
// ทุก function pure บน RunJson — caller เขียนลง gateLog ผ่าน state-store (updateRun/saveRun) เอง เหมือน reconcileRun (BE-007)
// owner ของ GateRecord มาจาก gates.yaml เสมอ (AC-015 — แก้ config มีผล) ไม่ใช่ค่าที่ agent เสนอใน handoff
// scope (AC-072): task = hold task + dependents ตาม Depends · phase · module — task นอก scope เดินต่อ · dispatch ใน scope ถูกบล็อก (AC-013)
// ตอบ gate → ปลด hold เฉพาะ task ที่ถูก hold ด้วย gate นั้น (ไม่ทั้ง run) · gate 4 qa-critical ค้างจนคนกด retry/PM replan (R22 — BE-019)
// record-only หลังตอบ → role เจ้าของเอกสาร (OQ-D3) — map เดียวกับ GATE_RECORD_ROLE ของ router (BE-019)
import { KNOWN_GATES, type GatesConfig } from "./config.ts";
import type { WaitingRow } from "./plan-parser.ts";
import type { Decision } from "./router.ts";
import type { GateId, GateRecord, HandoffV2, Role, RunJson, Step, TaskRuntime } from "./state-store.ts";

export class GateError extends Error {
  constructor(
    readonly kind:
      | "unknown-gate" // gate id นอก 7 จุด — gate คง 7 (OQ-19)
      | "empty-question" // คำถามว่าง — GateRecord ต้องระบุคำถามตรงตัว (AC-014)
      | "empty-answer" // คำตอบว่าง → ไม่รับ (DES-008)
      | "empty-answeredBy" // ผู้ตอบไม่พิมพ์/ยืนยันชื่อ — ระบบไม่เขียนชื่อแทน (AC-016)
      | "not-open" // ไม่มี record open ของ gate นี้ — ตอบซ้ำ/ตอบ gate ที่ไม่เปิด
      | "invalid-scope", // scope ขัดกับ taskIds/phase (fail-closed — รูปผิดไม่เปิด)
    message: string,
  ) {
    super(message);
    this.name = "GateError";
  }
}

// proposal ที่ evaluator ตัดสิน — driver/API นำไป openGate · field ตรง GateRecord (data-model) ยกเว้น owner
// ซึ่ง openGate resolve จาก gates.yaml เสมอ (AC-015)
export interface GateProposal {
  gateId: GateId;
  sessionId: string | null; // null = structural/doc trigger (data-model)
  scope: "task" | "phase" | "module";
  taskIds: string[];
  phase: string | null;
  question: string; // คำถามถ้อยคำตรงตัวจาก agent (AC-014) หรือข้อความมาตรฐานของระบบ (structural/doc)
}

// --- owner (AC-015) ---
// gates.yaml `owner: owner_default` เป็น string อ้าง block owner_default (ไม่ใช่ yaml alias) — resolve ที่นี่ที่เดียว
// แก้ owner_default.name หรือระบุ owner ตรงต่อ gate ใน config → GateRecord ที่เปิดหลังจากนั้นใช้ค่าใหม่
export function gateOwner(gates: GatesConfig, gateId: GateId): string {
  requireKnownGate(gateId);
  const def = gates.gates[gateId];
  if (!def) throw new GateError("unknown-gate", `gate "${gateId}" ไม่มีใน gates.yaml — human gate ต้องครบ 7 จุด (fail-closed)`);
  return def.owner === "owner_default" ? gates.owner_default.name : def.owner;
}

function requireKnownGate(gateId: GateId): GateId {
  if (!(KNOWN_GATES as readonly string[]).includes(gateId)) {
    throw new GateError("unknown-gate", `gate ${JSON.stringify(gateId)} นอกชุด 7 จุด — gate คง 7 (OQ-19, AC-078)`);
  }
  return gateId;
}

// --- trigger (a) handoff — mirror R12 ของ router (BE-019) สำหรับ driver/API ที่ประเมิน handoff ตรง ๆ ---
// ทางเลือกหนึ่งต่อ event: orchestrated mode ใช้ routerGateProposals(Decision) — อย่าเรียกสองทางกับ event เดียวกัน (gate ซ้ำ)
export function handoffGateProposals(
  handoff: HandoffV2,
  session: { taskIds: string[]; phase: string | null }, // taskIds ของ session — ว่าง = change chain ก่อนมี plan → scope module (DES-008)
): GateProposal[] {
  if (handoff.outputState !== "NEEDS_HUMAN") return []; // handoff trigger เฉพาะ NEEDS_HUMAN (DES-008 (a))
  const scope: GateProposal["scope"] = session.taskIds.length > 0 ? "task" : "module"; // เดียวกับ R12
  return handoff.questionsForHuman.map((q) => {
    const gateId: GateId = q.gate === "none"
      ? handoff.role === "system-analyst"
        ? q.touchesSchemaOrContract === true ? "schema-breaking" : "business-choice" // AC-078 — mapping เดียวกับ R12
        : "business-choice" // DES-008 Fallback — คำถามไม่ระบุ gate = gate 1 (ครอบคลุม material business choice)
      : requireKnownGate(q.gate); // fail-closed ชั้นที่สอง — ส่วนใหญ่ schema (BE-006) กรองไปแล้ว
    return { gateId, sessionId: handoff.sessionId, scope, taskIds: [...session.taskIds], phase: session.phase, question: q.question };
  });
}

// --- trigger (a) ผ่าน router — R5 (fail ครบ limit) / R7 (Critical) / R12 (NEEDS_HUMAN) / R21 (security) ปล่อยทาง Decision.gates ---
export function routerGateProposals(decision: Decision, sessionId: string): GateProposal[] {
  return decision.gates.map((g) => ({
    gateId: requireKnownGate(g.gateId),
    sessionId,
    scope: g.scope,
    taskIds: [...g.taskIds],
    phase: g.phase,
    question: g.question,
  }));
}

// --- trigger (b) structural — ไม่มี agent ตั้งคำถาม → ข้อความมาตรฐานระบุ gate/จุดตัดสิน (sessionId null ตาม data-model) ---
export const STRUCTURAL_QUESTIONS = {
  "ux-signoff": "UX artifact รอ sign-off — ยืนยันก่อนเริ่ม frontend ที่พึ่ง artifact (gate 3)",
  "deploy-real": "ยืนยันก่อน devops execute deploy จริง — แยก prepare → gate → execute (gate 6)",
  "release-cut": "ยืนยัน Release Scope ที่ PM เสนอ ก่อนเริ่ม build phase แรก (gate 7)",
} as const;

// ux-signoff = scope task ของ uxui-designer → FE ที่ Depends ถึงรอ (DES-008) — hold dependents ผ่าน opts ของ openGate
export function uxSignoffProposal(taskIds: string[], phase: string | null = null): GateProposal {
  return { gateId: "ux-signoff", sessionId: null, scope: "task", taskIds: [...taskIds], phase, question: STRUCTURAL_QUESTIONS["ux-signoff"] };
}
export function deployRealProposal(phase: string): GateProposal {
  return { gateId: "deploy-real", sessionId: null, scope: "phase", taskIds: [], phase, question: STRUCTURAL_QUESTIONS["deploy-real"] };
}
export function releaseCutProposal(): GateProposal {
  return { gateId: "release-cut", sessionId: null, scope: "module", taskIds: [], phase: null, question: STRUCTURAL_QUESTIONS["release-cut"] };
}

// --- trigger (c) doc — แถวค้างใน `## Waiting on Human` (แถวปิดแล้วถูกย้ายออกจากตาราง = ไม่เจอ) ---
// แถวไม่ระบุ gate id → business-choice (gate 1 — DES-008 Fallback) · คอลัมน์ "ขวาง task" ว่าง/"ทั้งหมด" = ทั้ง module (DES-008 (c))
export function docGateProposals(waiting: readonly WaitingRow[], phaseOf?: (taskId: string) => string | null): GateProposal[] {
  return waiting.map((row) => {
    const question = `Waiting on Human #${row.n}: ${row.decision}`
      + (row.options !== "" && row.options !== "—" ? ` (ตัวเลือก: ${row.options})` : "");
    if (row.blocks.length === 0) {
      return { gateId: "business-choice" as GateId, sessionId: null, scope: "module" as const, taskIds: [], phase: null, question };
    }
    const phases = [...new Set(row.blocks.map((id) => phaseOf?.(id) ?? null).filter((p): p is string => p !== null))];
    return {
      gateId: "business-choice" as GateId, sessionId: null, scope: "task" as const,
      taskIds: [...row.blocks], phase: phases.length === 1 ? phases[0]! : null, question,
    };
  });
}

// --- เปิด gate — append GateRecord (append-only) + hold task ใน scope (+dependents ตาม Depends) ---
// ประเมินซ้ำด้วย proposal เดิม (เช่น doc trigger ทุก tick) → ไม่ append ซ้ำ (appended: false) แต่ hold ยังถูก apply กับ task ใหม่ที่เข้า scope
// ไม่แตะ run.status — waiting-on-human เป็น transition ของ driver (DES-001) ใช้ shouldWaitOnHuman ช่วยตัดสิน
export function openGate(
  run: RunJson,
  proposal: GateProposal,
  gates: GatesConfig,
  opts: { dependentsOf?: (roots: readonly string[]) => string[] } = {},
): { run: RunJson; record: GateRecord; appended: boolean } {
  requireKnownGate(proposal.gateId);
  if (proposal.question.trim() === "") {
    throw new GateError("empty-question", "คำถามว่าง — GateRecord ต้องระบุคำถามตรงตัว (AC-014)");
  }
  // scope ต้องสอดคล้อง taskIds/phase — รูปผิดไม่เปิด (fail-closed)
  if (proposal.scope === "task" && proposal.taskIds.length === 0) {
    throw new GateError("invalid-scope", `scope "task" ต้องมี taskIds ≥ 1`);
  }
  if (proposal.scope === "phase" && (proposal.phase === null || proposal.phase.trim() === "")) {
    throw new GateError("invalid-scope", `scope "phase" ต้องระบุ phase`);
  }
  if (proposal.scope === "module" && (proposal.taskIds.length > 0 || proposal.phase !== null)) {
    throw new GateError("invalid-scope", `scope "module" ครอบทั้ง module — taskIds ต้องว่างและ phase เป็น null`);
  }

  const out = structuredClone(run);
  const ownerName = gateOwner(gates, proposal.gateId);

  // dedupe — open ล่าสุดของ gateId นี้เหมือนเดิมทุกอย่าง (รวม owner ปัจจุบัน) = instance เดียวกัน ไม่ append ซ้ำ
  const latest = latestGateRecord(out, proposal.gateId);
  const identical = latest !== undefined && latest.status === "open"
    && latest.scope === proposal.scope
    && latest.phase === proposal.phase
    && latest.question === proposal.question
    && latest.sessionId === proposal.sessionId
    && latest.owner.name === ownerName
    && [...latest.taskIds].sort().join("\n") === [...proposal.taskIds].sort().join("\n");

  let record: GateRecord;
  if (latest !== undefined && identical) {
    record = latest;
  } else {
    record = {
      gateId: proposal.gateId,
      sessionId: proposal.sessionId,
      scope: proposal.scope,
      taskIds: [...proposal.taskIds],
      phase: proposal.phase,
      question: proposal.question,
      owner: { name: ownerName },
      status: "open",
      answeredBy: null, answeredAt: null, answer: null, note: null, recordSessionId: null,
    };
    out.gateLog.push(record); // append-only — ไม่แก้แถวเดิม
  }
  applyGateHolds(out, record, opts.dependentsOf);
  return { run: out, record, appended: !identical };
}

// hold ใน scope — กติกาเดียวกับ reconcileRun §5 (BE-007): verified ไม่ hold ย้อน (เอกสารชนะ) · hold อื่นไม่ทับ ·
// hold ด้วย gate เดียวกันอยู่แล้ว = คง prevStep เดิม · dependents (scope task) ถูก hold ตาม Depends (DES-008)
function applyGateHolds(run: RunJson, record: GateRecord, dependentsOf?: (roots: readonly string[]) => string[]): void {
  const inScope = (id: string, t: TaskRuntime): boolean =>
    record.scope === "module"
    || (record.scope === "phase" && t.planPhase === record.phase)
    || (record.scope === "task" && record.taskIds.includes(id));
  const targets = new Set<string>(Object.keys(run.tasks).filter((id) => inScope(id, run.tasks[id]!)));
  if (record.scope === "task" && dependentsOf) {
    for (const id of dependentsOf(record.taskIds)) {
      const t = run.tasks[id];
      if (t && !targets.has(id)) targets.add(id); // dependent อาจอยู่ phase อื่น — scope task ครอบตาม Depends
    }
  }
  for (const id of [...targets].sort()) {
    const t = run.tasks[id]!;
    if (t.step === "verified") continue;
    if (t.hold && t.hold.reason !== "gate") continue;
    if (!(t.hold?.reason === "gate" && t.hold.ref === record.gateId)) {
      t.hold = { reason: "gate", ref: record.gateId, prevStep: t.hold?.prevStep ?? t.step };
    }
    t.step = "held";
  }
}

// --- ตอบ gate — เติม field คำตอบลง record open เดิม (lifecycle ของแถวเดียวกัน open → answered) + ปลด hold ตาม gate นั้น ---
// การตีความ "GateRecord append-only ห้ามแก้ย้อนหลัง" (DES-008): gateLog ไม่ลบแถวและไม่แก้เนื้อหา audit (คำถาม/owner/scope/taskIds)
// ย้อนหลัง — แต่การตอบคือ lifecycle ของแถวเดียวกัน (field คำตอบ nullable ไว้ล่วงหน้าใน data-model) เพราะ reconcileRun §5 ของ
// BE-007 re-hold จาก "ทุก" แถว open ใน gateLog — ถ้าตอบด้วยการ append แถวใหม่แล้วปล่อยแถว open เดิม งานจะถูก hold ซ้ำหลัง resume
// answeredBy = ชื่อที่ผู้ตอบพิมพ์/ยืนยันเอง ตามที่พิมพ์ (AC-016 — ระบบไม่เขียน/ไม่แต่งชื่อแทน) · คำตอบว่าง → ไม่รับ (DES-008)
// answeredAt = นาฬิกาเครื่อง (inject opts.now ได้เพื่อ deterministic test) · recordSessionId = session record-only ที่จะจดคำตอบ (OQ-D3 — solo mode ไม่มี)
// เมื่อ gateId เปิดหลาย instance ซ้อน — ตอบแถว open ล่าสุด (last-wins ต่อ gateId — กติกาเดียวกับ reconcileRun §5 / R22)
export function answerGate(
  run: RunJson,
  gateId: GateId,
  input: { answeredBy: string; answer: string; note?: string | null; recordSessionId?: string | null },
  opts: { now?: Date } = {},
): { run: RunJson; record: GateRecord } {
  requireKnownGate(gateId);
  if (typeof input.answeredBy !== "string" || input.answeredBy.trim() === "") {
    throw new GateError("empty-answeredBy", "answeredBy ว่าง — ผู้ตอบต้องพิมพ์/ยืนยันชื่อตัวเอง (AC-016 — ระบบไม่เขียนชื่อแทน)");
  }
  if (typeof input.answer !== "string" || input.answer.trim() === "") {
    throw new GateError("empty-answer", "คำตอบว่าง → ไม่รับ (DES-008)");
  }
  let idx = -1;
  for (let i = run.gateLog.length - 1; i >= 0; i--) {
    if (run.gateLog[i]!.gateId === gateId) { idx = i; break; }
  }
  const open = idx >= 0 ? run.gateLog[idx] : undefined;
  if (!open || open.status !== "open") {
    throw new GateError("not-open", `gate "${gateId}" ไม่มี record open — ตอบได้เฉพาะ gate ที่เปิดอยู่`);
  }

  const out = structuredClone(run);
  const record = out.gateLog[idx]!; // ตำแหน่งเดียวกับ open ใน run — แก้สำเนาเท่านั้น (run ต้นฉบับไม่ถูกแตะ)
  record.status = "answered";
  record.answeredBy = input.answeredBy;
  record.answeredAt = (opts.now ?? new Date()).toISOString();
  record.answer = input.answer;
  record.note = input.note ?? null;
  record.recordSessionId = input.recordSessionId ?? null;

  // ปลด hold เฉพาะ task ที่ถูก hold ด้วย gate นี้ — คือ task ใน scope ของมัน (AC-072 — ไม่ทั้ง run)
  // กลับ prevStep (ผิดรูป → waiting-deps) เหมือน release ของ router/reconcile
  // gate 4 (qa-critical) ไม่ปลดด้วยคำตอบ — ค้างจนคนกด retry หรือ PM replan (R22 — BE-019)
  if (gateId !== "qa-critical") {
    for (const t of Object.values(out.tasks)) {
      if (t.hold?.reason !== "gate" || t.hold.ref !== gateId) continue;
      const prev = t.hold.prevStep;
      t.step = (STEPS as readonly string[]).includes(prev) ? (prev as Step) : "waiting-deps";
      t.hold = null;
    }
  }
  return { run: out, record };
}

const STEPS: readonly string[] = [
  "waiting-deps", "runnable", "execution", "awaiting-review", "review", "awaiting-qa", "qa", "verified", "held",
];

// --- อ่านสถานะ gate ---
// record ล่าสุดต่อ gateId (last-wins — กติกาเดียวกับ reconcileRun §5 ของ BE-007) ที่ยัง open
export function openGateRecords(run: RunJson): GateRecord[] {
  const latest = new Map<GateId, GateRecord>();
  for (const g of run.gateLog) latest.set(g.gateId, g);
  return [...latest.values()].filter((g) => g.status === "open").sort((a, b) => a.gateId.localeCompare(b.gateId));
}

// record ล่าสุดของ gateId (open หรือ answered) — API (BE-015) ใช้แสดงคำถาม/คำตอบปัจจุบัน
export function latestGateRecord(run: RunJson, gateId: GateId): GateRecord | undefined {
  for (let i = run.gateLog.length - 1; i >= 0; i--) {
    if (run.gateLog[i]!.gateId === gateId) return run.gateLog[i];
  }
  return undefined;
}

// dispatch ชุดนี้โดน open gate ไหนบล็อก — null = เดินได้ (AC-072/AC-013)
// scope module → บล็อกทุก dispatch รวม taskIds ว่าง ("ไม่มี dispatch ใหม่จนตอบ" — AC-013)
// scope task/phase → บล็อกผ่าน hold ของ task (open เปิด hold ใน scope + dependents ไว้แล้ว; resume มี reconcileRun คงไว้)
export function dispatchBlocker(run: RunJson, taskIds: readonly string[]): GateRecord | null {
  const open = openGateRecords(run);
  const moduleGate = open.find((g) => g.scope === "module");
  if (moduleGate) return moduleGate;
  for (const id of taskIds) {
    const t = run.tasks[id];
    if (!t || t.hold?.reason !== "gate") continue;
    const g = open.find((rec) => rec.gateId === t.hold!.ref);
    if (g) return g;
  }
  return null;
}

// run.status = waiting-on-human เฉพาะเมื่อ scope module หรือไม่มี task ใดเดินได้ (DES-008) — helper ให้ driver (BE-011)
// ตัดสิน (gates.ts ไม่แตะ run.status เอง — transition ของ driver ตาม DES-001)
// "เดินได้" = task ยังไม่ถูก hold และ (มี session ค้าง active ∨ step เข้าคิว dispatch ได้) ∨ feature-qa ของ phase ค้าง queued/running
const QUEUEABLE: readonly string[] = ["runnable", "awaiting-review", "awaiting-qa"];
export function shouldWaitOnHuman(run: RunJson): boolean {
  if (openGateRecords(run).some((g) => g.scope === "module")) return true;
  const taskCanMove = Object.values(run.tasks).some((t) =>
    t.hold === null && (t.currentSessionId !== null || QUEUEABLE.includes(t.step)));
  const phaseBusy = Object.values(run.phases).some((p) => p.featureQa === "queued" || p.featureQa === "running");
  return !taskCanMove && !phaseBusy;
}

// --- record-only หลังตอบ (OQ-D3) — dispatch ไป role เจ้าของเอกสารเพื่อจด who/when ลงเอกสาร ---
// map เดียวกับ GATE_RECORD_ROLE ใน router.ts (BE-019) — router ไม่ export จึงคุมไว้ที่นี่ด้วย (solo mode ไม่มี record-only run — DES-008)
const RECORD_ROLE: Record<GateId, Role> = {
  "business-choice": "business-analyst",
  "schema-breaking": "system-analyst",
  "ux-signoff": "uxui-designer",
  "qa-critical": "qa-engineer",
  "security-finding": "security",
  "deploy-real": "devops",
  "release-cut": "project-manager",
};
export function gateRecordRole(gateId: GateId): Role {
  return RECORD_ROLE[requireKnownGate(gateId)];
}

// ผู้ตอบไม่ใช่ owner ที่ผูกไว้ → UI แจ้งเตือน แต่ยังบันทึกได้ถ้าผู้ตอบยืนยันชื่อตัวเอง (DES-008 §Permissions/States/Errors)
export function ownerMismatchWarning(record: GateRecord, answeredBy: string): string | null {
  return answeredBy.trim() !== "" && answeredBy.trim() !== record.owner.name
    ? `ผู้ตอบ "${answeredBy}" ไม่ใช่เจ้าของ gate นี้ (${record.owner.name}) — บันทึกได้เมื่อผู้ตอบยืนยันชื่อตัวเอง`
    : null;
}
