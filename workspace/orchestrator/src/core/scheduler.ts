// BE-011 — DAG scheduler (DES-001 §DAG scheduler): คำนวณ dispatch ต่อ tick แบบ pure — ไม่มี I/O ไม่ spawn ไม่เรียก LLM (AC-067)
// driver (BE-011) ป้อน run.json + แถว plan (join RouterTask แล้ว) เข้าที่นี่เพื่อได้ลำดับ dispatch deterministic:
//   เพดาน session ทุก kind ทุก module ≤ scheduler.maxParallelSessions — เกิน → คิว (AC-045) ·
//   ลำดับคิว: fix/restart session ของ task เดิมมาก่อน (dispatch จาก Decision ของ router — driver คิวไว้หน้า) แล้ว
//   Phase น้อยก่อน → ลำดับแถวในตาราง (deterministic — DES-001) ·
//   session group OQ-12: default ไม่รวม (AC-041) — รวมเมื่อ Owner/Phase เดียวกัน + ไม่มี Depends ระหว่างสมากิก + ทุกตัว runnable ใน tick เดียว ·
//   review wave / QA round ใช้ batching (BE-021) — freeSlots/remainingBusy/activeExecutions/tpReady เป็น input ที่ที่นี่คำนวณจาก run.json
// plan legacy (ไม่มี Depends — DES-001 กรณี 3): ธง needsMigration + dispatch ทีละ session ต่อ module (serial — AC-074)
// นิยาม phase 🔒 3 แหล่ง (DES-019 §Security stage) + satisfied(dep) เต็มของ DES-001 — anchor ⇔ phase cleared (DES-019 / Rev 12)
import * as path from "node:path";
import { anchorImplicitDepends, batchQaRound, batchReviewWaves, reviewWaveOpen, type BatchDispatch, type BatchTask, type ReviewWave } from "./batching.ts";
import type { RouterConfig, RouterPhaseInfo, RouterTask } from "./router.ts";
import { claimsOverlap } from "./session-audit.ts";
import { collectSecurityGates, type RunJson, type SessionKind, type SessionRecord, type TaskRuntime } from "./state-store.ts";
import { splitRow, type PlanIndex } from "./plan-parser.ts";

export type { BatchDispatch };

// --- ลำดับแถว plan (ตาราง Tasks = ลำดับแถวตาม DES-001 ข้อ (3) ของคิว) ---
export function rowOrder(plan: PlanIndex | null): Map<string, number> {
  const out = new Map<string, number>();
  if (plan) for (const [i, r] of plan.rows.entries()) out.set(r.id, i);
  return out;
}

// --- session active / เพดาน (AC-045) ---
export function activeSessions(run: RunJson): SessionRecord[] {
  return run.sessions.filter((s) => s.endedAt === null);
}

// slot ว่างตามเพดาน session (input freeSlots ของ batching — DES-019 ข้อ 4)
export function freeSlots(run: RunJson): number {
  return Math.max(0, run.scheduler.maxParallelSessions - activeSessions(run).length);
}

// slot ว่างที่ใช้ dispatch ได้ — plan legacy เดิน serial ต่อ module เสมอ (DES-001 กรณี 3, AC-074)
export function dispatchCap(run: RunJson): number {
  const cap = run.planFormat === "legacy" ? 1 : run.scheduler.maxParallelSessions;
  return Math.max(0, cap - activeSessions(run).length);
}

export function claimCollides(active: readonly SessionRecord[], claim: readonly string[]): boolean {
  return active.some((s) => claimsOverlap(s.claim, claim));
}

// --- phase 🔒 / สถานะ phase ที่ router อ่าน (RouterPhaseInfo — BE-019) ---
// locked = แถว ## Phases มี 🔒 ∨ task ใน phase มี Security-sensitive: yes ∨ securityGate ใน sessions[] (DES-019 §Security stage)
export function phaseInfos(run: RunJson, plan: PlanIndex | null, tasks: Record<string, RouterTask>): Record<string, RouterPhaseInfo> {
  const gatePhases = new Set(collectSecurityGates(run).map((g) => g.phase));
  const labels = new Set<string>([
    ...Object.values(tasks).map((t) => t.planPhase),
    ...(plan?.phases.map((p) => p.label) ?? []),
    ...Object.keys(run.phases),
    ...gatePhases, // phase ที่ securityGate ชี้ (sessions[] — DES-019 §Security stage)
  ]);
  labels.delete("");
  const out: Record<string, RouterPhaseInfo> = {};
  for (const label of labels) {
    const row = plan?.phases.find((p) => p.label === label);
    const sensitive = Object.values(tasks).some((t) => t.planPhase === label && t.securitySensitive);
    const rt = run.phases[label];
    out[label] = {
      locked: (row?.locked ?? false) || sensitive || gatePhases.has(label),
      cleared: rt?.cleared ?? false,
      featureQa: rt?.featureQa ?? "not-ready",
      hold: rt !== undefined && rt.hold !== null && typeof rt.hold === "object" && "reason" in rt.hold
        ? String((rt.hold as { reason: unknown }).reason)
        : null,
    };
  }
  return out;
}

// --- คิว execution — step runnable · ไม่มี hold · ไม่ active · ไม่ใช่ anchor (anchor เดินด้วย R18/R19 — DES-019) ---
export function orderedRunnable(run: RunJson, tasks: Record<string, RouterTask>, order: Map<string, number>): RouterTask[] {
  const rank = (phase: string): number => {
    const n = Number(phase);
    return Number.isFinite(n) && phase.trim() !== "" ? n : Number.MAX_SAFE_INTEGER;
  };
  return Object.values(tasks)
    .filter((t) => t.step === "runnable" && t.hold === null && t.currentSessionId === null && t.owner !== "qa-engineer")
    .sort((a, b) =>
      rank(a.planPhase) - rank(b.planPhase)
      || (order.get(a.taskId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.taskId) ?? Number.MAX_SAFE_INTEGER)
      || a.taskId.localeCompare(b.taskId));
}

export interface ExecDispatch { kind: "execution"; role: RouterTask["owner"]; taskIds: string[]; note: string | null }

// session group (OQ-12 — AC-041): ตรวจเชิงกลไก — Owner เดียวกัน, Phase เดียวกัน, ไม่มี Depends ระหว่างสมากิก,
// ทุกตัว runnable ใน tick เดียวกัน → packet เดียว taskIds[] · ไม่ผ่าน → แยกทีละ task + หมายเหตุ (note → dashboard/log)
export function groupExecutions(candidates: readonly RouterTask[]): ExecDispatch[] {
  const out: ExecDispatch[] = [];
  const groups = new Map<string, RouterTask[]>();
  for (const t of candidates) {
    if (t.group === null || t.group.trim() === "") out.push({ kind: "execution", role: t.owner, taskIds: [t.taskId], note: null });
    else groups.set(t.group, [...(groups.get(t.group) ?? []), t]);
  }
  for (const key of [...groups.keys()].sort()) {
    const members = groups.get(key)!.slice().sort((a, b) => a.taskId.localeCompare(b.taskId));
    const ids = new Set(members.map((m) => m.taskId));
    const sameOwner = members.every((m) => m.owner === members[0]!.owner);
    const samePhase = members.every((m) => m.planPhase === members[0]!.planPhase);
    const noInternalDep = members.every((m) => !m.depends.some((d) => ids.has(d)));
    const allRunnable = members.every((m) => m.step === "runnable" && m.hold === null && m.currentSessionId === null);
    if (sameOwner && samePhase && noInternalDep && allRunnable) {
      out.push({ kind: "execution", role: members[0]!.owner, taskIds: members.map((m) => m.taskId), note: null });
    } else {
      for (const m of members) {
        out.push({ kind: "execution", role: m.owner, taskIds: [m.taskId], note: `session group "${key}" แยกทีละ task — ตรวจเชิงกลไกไม่ผ่าน (OQ-12/AC-041)` });
      }
    }
  }
  return out;
}

// --- ขนาด diff ของ task ล่าสุด (numstat ใน diff.patch ของ execution session ล่าสุด — BE-008/BE-021) ---
export interface DiffSize { lines: number; files: number }

export function diffSizeOf(diffPatchText: string | null): DiffSize | null {
  if (diffPatchText === null) return null; // วัดไม่ได้ → ถือเป็น "ใหญ่" (DES-019 §Errors — นับเกิน = ปลอดภัย)
  let lines = 0;
  let files = 0;
  for (const l of diffPatchText.split(/\r?\n/)) {
    if (l === "" || l.startsWith("#")) continue; // หัวกำกับ/บรรทัด approx ของ BE-008
    const m = /^(\d+|-)\t(\d+|-)\t/.exec(l);
    if (!m) continue;
    files += 1;
    lines += m[1] === "-" ? 0 : Number(m[1]); // "-" = binary — นับ 0 บรรทัด (ขนาดไม่ต่ำกว่าจริงในทางปฏิบัติ — ไฟล์นับแล้ว)
  }
  return { lines, files };
}

export function sizeOf(run: RunJson, taskId: string, sessionDiffPath: (sessionId: string) => string, readText: (abs: string) => string | null): DiffSize | null {
  const mine = run.sessions.filter((s) => s.taskIds.includes(taskId) && s.kind === "execution").sort((a, b) => a.seq - b.seq);
  const last = mine[mine.length - 1];
  if (!last) return null; // ยังไม่เคยมี execution — วัดไม่ได้ (ถือเป็น "ใหญ่" — DES-019 §Errors)
  return diffSizeOf(readText(sessionDiffPath(last.sessionId)));
}

// --- re-dispatch task ที่กลับ "step เดิม" แล้วแต่ไม่มี session — hold ถูกปลดโดยคำตอบ gate/retry (R22 — DES-008):
// step execution/review/qa + hold null + ไม่มี session → dispatch session ชนิดเดิมต่อ (ตีความ — รายงาน handoff)
export function orderedResumable(run: RunJson, tasks: Record<string, RouterTask>, order: Map<string, number>): { kind: "execution" | "review" | "qa"; role: RouterTask["owner"]; taskId: string; phase: string }[] {
  const kindOf = (step: string): "execution" | "review" | "qa" | null =>
    step === "execution" ? "execution" : step === "review" ? "review" : step === "qa" ? "qa" : null;
  const rank = (phase: string): number => {
    const n = Number(phase);
    return Number.isFinite(n) && phase.trim() !== "" ? n : Number.MAX_SAFE_INTEGER;
  };
  return Object.values(tasks)
    .filter((t) => t.hold === null && t.currentSessionId === null && t.owner !== "qa-engineer" && kindOf(t.step) !== null)
    .sort((a, b) =>
      rank(a.planPhase) - rank(b.planPhase)
      || (order.get(a.taskId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.taskId) ?? Number.MAX_SAFE_INTEGER)
      || a.taskId.localeCompare(b.taskId))
    .map((t) => {
      const kind = kindOf(t.step)!;
      return { kind, role: (kind === "review" ? "reviewer" : kind === "qa" ? "qa-engineer" : t.owner) as RouterTask["owner"], taskId: t.taskId, phase: t.planPhase };
    });
}

// --- review wave (DES-019 §Rule ข้อ 1–5 — AC-051): ผู้สมัคร = awaiting-review ของ phase เดียว
// เรียงผู้สมัครตามลำดับแถวในตาราง Tasks ก่อนเรียก batchReviewWaves (ข้อ 3 — order = rowOrder ที่ driver ส่งมา
// REV-046: ลำดับ id ≠ ลำดับแถว — batching pack ตามลำดับที่ได้รับ จึงต้องเรียงที่นี่ที่เดียว) —
// id ที่ไม่มีใน plan (ไม่ควรเกิด) ไปท้ายด้วย tiebreak เดิมเพื่อความ deterministic
export function reviewDispatches(
  run: RunJson,
  tasks: Record<string, RouterTask>,
  cfg: RouterConfig,
  sizes: (taskId: string) => DiffSize | null,
  order: Map<string, number>,
): ReviewWave[] {
  if (dispatchCap(run) < 1) return [];
  const rank = (taskId: string): number => order.get(taskId) ?? Number.MAX_SAFE_INTEGER;
  const byPhase = new Map<string, RouterTask[]>();
  for (const t of Object.values(tasks).sort((a, b) => rank(a.taskId) - rank(b.taskId) || a.taskId.localeCompare(b.taskId))) {
    if (t.step !== "awaiting-review" || t.currentSessionId !== null) continue;
    if (t.hold !== null) continue; // hold ใด ๆ ครอบ — ไม่เข้า wave
    byPhase.set(t.planPhase, [...(byPhase.get(t.planPhase) ?? []), t]);
  }
  // remainingBusy = task ของ phase ที่ยัง runnable/execution (ข้อ 4 — เปิดเมื่อหมดหรือ wave เต็ม)
  const remainingBusy = (phase: string): number =>
    Object.values(tasks).filter((t) => t.planPhase === phase && (t.step === "runnable" || t.step === "execution")).length;
  const out: ReviewWave[] = [];
  for (const phase of [...byPhase.keys()].sort()) {
    const candidates: BatchTask[] = (byPhase.get(phase) ?? []).map((t) => ({ ...t, size: sizes(t.taskId) }));
    let waves: ReviewWave[];
    try {
      waves = batchReviewWaves(phase, candidates, cfg);
    } catch {
      continue; // BatchError (fail-closed ของ BE-021) — ไม่เปิด wave ของ phase นี้ (driver log แทน)
    }
    for (const w of waves) {
      if (!reviewWaveOpen({ freeSlots: dispatchCap(run), remainingBusy: remainingBusy(phase) }, w, cfg)) continue;
      out.push(w);
    }
  }
  return out;
}

// --- QA round (DES-019 §Rule QA — AC-054/AC-061 + quiesce ข้อ 3): ทีละ 1 round (phase น้อยก่อน) ---
export function qaDispatch(
  run: RunJson,
  tasks: Record<string, RouterTask>,
  tpReady: (phase: string) => boolean,
): BatchDispatch | null {
  if (dispatchCap(run) < 1) return null;
  const active = activeSessions(run);
  const byPhase = new Map<string, RouterTask[]>();
  for (const t of Object.values(tasks).sort((a, b) => a.taskId.localeCompare(b.taskId))) {
    if (t.step !== "awaiting-qa" || t.currentSessionId !== null || t.hold !== null) continue;
    byPhase.set(t.planPhase, [...(byPhase.get(t.planPhase) ?? []), t]);
  }
  for (const phase of [...byPhase.keys()].sort()) {
    const candidates: BatchTask[] = (byPhase.get(phase) ?? []).map((t) => ({ ...t, size: null })); // QA ไม่ใช้ขนาด
    const activeExecutions = active.filter((s) => s.kind === "execution" && s.taskIds.some((id) => tasks[id]?.planPhase === phase)).length;
    const remainingBusy = Object.values(tasks)
      .filter((t) => t.planPhase === phase && (t.step === "runnable" || t.step === "execution")).length;
    const d = batchQaRound({
      phase, candidates, tpReady: tpReady(phase), freeSlots: dispatchCap(run), remainingBusy, activeExecutions,
    });
    if (d !== null) return d;
  }
  return null;
}

// --- tpReady — DES-019 QA ข้อ 2: phase มี task ของ test-planner ที่ยังไม่ DONE → ยังไม่เปิด ---
export function tpReadyOf(tasks: Record<string, RouterTask>, phase: string): boolean {
  return !Object.values(tasks).some((t) => t.owner === "test-planner" && t.planPhase === phase && t.step !== "verified");
}

// --- satisfied(dep) เต็มของ DES-001 — ใช้เป็น opts.depsSatisfied ของ router + reconcileRun (BE-007) ---
export interface SatisfiedCtx {
  clearedPhases: ReadonlySet<string>; // run.json phases[].cleared — satisfied(anchor) ⇔ phase cleared (DES-019)
  tpPhases: ReadonlySet<string>; // แถว TP ของ phase ใน test-plan\index.md (satisfied(test-planner))
  uxuiAnswered: (taskId: string) => boolean; // gate 3 (ux-signoff) answered ครอบ task นั้น (DES-001)
}
export function depsSatisfiedFull(dep: Pick<TaskRuntime, "owner" | "planPhase" | "taskId" | "step">, ctx: SatisfiedCtx): boolean {
  if (dep.owner === "qa-engineer") return ctx.clearedPhases.has(dep.planPhase); // amendment Rev 11/12
  if (dep.owner === "test-planner") return ctx.tpPhases.has(dep.planPhase);
  if (dep.owner === "uxui-designer") return ctx.uxuiAnswered(dep.taskId);
  return dep.step === "verified"; // เสร็จจริง = verified (OQ-10, AC-044)
}

// แถว TP ต่อ phase จาก test-plan\index.md (รูปตาราง `TP | Phase | REQ/AC | ไฟล์` — DES-019 §Test Planner)
export function tpPhasesOf(text: string | null): Set<string> {
  const out = new Set<string>();
  if (text === null) return out;
  for (const l of text.split(/\r?\n/)) {
    if (!l.trimStart().startsWith("|")) continue;
    const cells = splitRow(l);
    if (/^TP-\d+$/i.test(cells[0] ?? "")) out.add((cells[1] ?? "").trim());

  }
  return out;
}

// gate 3 answered ครอบ task (scope task + taskIds รวม id · scope module ครอบทั้ง module) — DES-001
// อินสแตนซ์ล่าสุดที่ครอบ task นี้เป็นตัวตัดสิน (last-wins ต่อขอบเขต — กติกาเดียวกับ answerGate/BE-009)
export function uxuiAnsweredOf(run: RunJson, taskId: string): boolean {
  let latest: RunJson["gateLog"][number] | null = null;
  for (const g of run.gateLog) {
    if (g.gateId !== "ux-signoff") continue;
    if (!(g.scope === "module" || g.taskIds.includes(taskId))) continue;
    latest = g;
  }
  return latest !== null && latest.status === "answered";
}

// Depends โดยนัยของ anchor (BE-021) — driver ใช้ตอนตรวจ deadlock/อธิบายบน dashboard (การ dispatch เป็นของ router R18)
export { anchorImplicitDepends };

// kind ของ dispatch → step ที่ task เดินเมื่อ session เริ่ม (DES-001/019 — driver ใช้ตอน start session)
export function stepForKind(kind: SessionKind): TaskRuntime["step"] | null {
  switch (kind) {
    case "execution": return "execution";
    case "review": return "review";
    case "qa": return "qa";
    default: return null; // change/feature-qa/security/record-only — step เป็นของ Decision ของ router
  }
}
