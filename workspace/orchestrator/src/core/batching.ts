// BE-021 — batching + packet ของ review wave / QA round / Feature QA / security stage / defect packet (DES-019)
// ตัวรวม task ต่อ session ที่ scheduler (BE-011) เรียกใช้ — ไม่มี loop ไม่มี I/O (scheduling loop + เขียน state = BE-011)
// ตัดสินจาก state + ขนาด diff (numstat 2 คอลัมน์แรกของ diff.patch — BE-008) + config scheduler (BE-001 — freeze ใน run.json)
// กฎตายตัว: DES-019 §Rule review wave ข้อ 1–5 (AC-051) · §Rule QA round ข้อ 1–4 (AC-054/AC-061 + quiesce ข้อ 3) ·
// §Feature QA (anchor — taskIds = [anchor], Depends โดยนัยไม่รวม dependents ตรง/ทอด) ·
// §Security stage (นิยาม 🔒 3 แหล่ง — AC-080/AC-079) · §Defect packet (AC-055 — packet ล้วน finding ตาม data-model,
// ไม่มี conversation/reasoning/log ของ reviewer/QA — ผู้รับ fix packet ได้เฉพาะ packet + task file + REQ/DES ที่อ้าง)
import { FORBIDDEN_OWNERS } from "./plan-parser.ts";
import { newSessionId } from "./state-store.ts";
import type { HandoffV2, ReviewFinding, QaDefect, SessionRecord } from "./state-store.ts";
import type { PacketV2 } from "./contract/types.ts";
import type { RouterConfig, RouterTask } from "./router.ts";

export class BatchError extends Error {
  constructor(
    readonly subject: string,
    readonly problems: string[],
  ) {
    super(`batching ปฏิเสธ (fail-closed — DES-019): ${subject}: ${problems[0] ?? "-"}`);
    this.name = "BatchError";
  }
}

// task ฝั่ง batching = RouterTask (BE-019 — driver join แถว plan แล้ว) + ขนาด diff ของงานที่เขียน (BE-008)
export interface BatchTask extends RouterTask {
  // added+deleted รวมกับจำนวนไฟล์จาก numstat — null = diff วัดไม่ได้ → ถือเป็น "ใหญ่" (แยก session — DES-019 §Errors)
  size: { lines: number; files: number } | null;
}

// ผลลัพธ์รวมของ batching (Expected Output ของ BE-021) — driver แปลงเป็น dispatch + packet ต่อ (BE-011)
export interface BatchDispatch {
  kind: "review" | "qa" | "feature-qa" | "security";
  taskIds: string[];
  phase: string;
  // qa เท่านั้น — DES-019 QA ข้อ 3: BE-011 ห้ามเริ่ม execution ใหม่บน root จน QA round จบ (QA จบ → เดินต่อ)
  quiesce?: boolean;
  // review เท่านั้น — session ของตัวเองเพราะ "ใหญ่"/security-sensitive (DES-019 ข้อ 2, AC-051)
  solo?: boolean;
}

// wave ของ review — ต่อยอด BatchDispatch ด้วยตัวเลขที่ gate ข้อ 4 ใช้ (driver ไม่ต้องคำนวณซ้ำ)
export interface ReviewWave extends BatchDispatch {
  kind: "review";
  diffLines: number; // diff รวมของ wave — เพดาน reviewWave.maxDiffLines (AC-051)
  solo: boolean;
}

// --- review wave — DES-019 §Rule ข้อ 2 + §Errors (AC-051) ---
export function isLargeTask(t: BatchTask, cfg: RouterConfig): boolean {
  if (t.securitySensitive) return true; // Security-sensitive: yes ใน task file (DES-014) — session ของตัวเองเสมอ
  if (t.size === null) return true; // diff วัดไม่ได้ → ถือเป็น "ใหญ่" (นับเกิน = ปลอดภัย — DES-021/019)
  return t.size.lines > cfg.largeTask.diffLines || t.size.files > cfg.largeTask.files;
}

// ข้อ 1+3: ผู้สมัคร = awaiting-review ของ phase เดียว · ที่ไม่ใหญ่เรียงตามลำดับแถวตาราง Tasks (driver ส่งมาตามลำดับ —
// ฟังก์ชันคงลำดับเดิม) แล้ว pack ทีละตัว — task ที่จะทำ wave เกินเพดานเริ่ม wave ใหม่ (AC-051: ไม่มี wave ใดเกินเพดาน)
export function batchReviewWaves(phase: string, candidates: readonly BatchTask[], cfg: RouterConfig): ReviewWave[] {
  const problems: string[] = [];
  for (const t of candidates) {
    if (t.planPhase !== phase) problems.push(`task ${t.taskId} planPhase "${t.planPhase}" ≠ phase ของ wave "${phase}" (ข้อ 1 — จัดกลุ่มตาม Phase)`);
    if (t.step !== "awaiting-review") problems.push(`task ${t.taskId} step "${t.step}" ≠ awaiting-review (ข้อ 1 — ผู้สมัคร)`);
    if (t.hold?.reason === "plan-error") problems.push(`task ${t.taskId} เป็นแถว R24 (plan-error) — ห้ามเข้า wave (AC-079)`);
  }
  if (problems.length > 0) throw new BatchError("review wave", problems);

  const waves: ReviewWave[] = [];
  let cur: BatchTask[] = [];
  let curLines = 0;
  const flush = (): void => {
    if (cur.length === 0) return;
    waves.push({ kind: "review", taskIds: cur.map((t) => t.taskId), phase, diffLines: curLines, solo: false });
    cur = [];
    curLines = 0;
  };
  for (const t of candidates) {
    // task เดี่ยวที่ diff เกินเพดาน wave ของตัวเอง → แยกเหมือน "ใหญ่" — wave ห้ามเกินเพดาน (AC-051) จึง pack ไม่ได้เลย
    const overWave = t.size !== null && t.size.lines > cfg.reviewWave.maxDiffLines;
    if (isLargeTask(t, cfg) || overWave) {
      flush();
      waves.push({ kind: "review", taskIds: [t.taskId], phase, diffLines: t.size?.lines ?? 0, solo: true });
      continue;
    }
    if (cur.length > 0 && (cur.length + 1 > cfg.reviewWave.maxTasks || curLines + t.size!.lines > cfg.reviewWave.maxDiffLines)) flush();
    cur.push(t);
    curLines += t.size!.lines;
  }
  flush();
  return waves;
}

// ข้อ 4: เปิด wave ของ phase P เมื่อมี slot ว่าง และ (ไม่มี task ของ P ที่ runnable/execution เหลือ หรือ wave เต็ม)
export interface WaveGate {
  freeSlots: number; // slot ว่าง (maxParallelSessions − session active — BE-011 นับจาก SessionRecord)
  remainingBusy: number; // task ของ phase ที่ยัง step runnable/execution
}
export function reviewWaveOpen(gate: WaveGate, wave: ReviewWave, cfg: RouterConfig): boolean {
  if (gate.freeSlots < 1) return false;
  if (gate.remainingBusy === 0) return true;
  // wave เต็ม = ครบเพดาน (หรือ solo — session ของตัวเองตามข้อ 2 รอเพิ่มไม่ได้อยู่แล้ว — ตีความ รายงาน handoff)
  return wave.solo || wave.taskIds.length >= cfg.reviewWave.maxTasks || wave.diffLines >= cfg.reviewWave.maxDiffLines;
}

// --- QA round — DES-019 §Rule QA round ข้อ 1–4 (AC-054, AC-061, quiesce) ---
export interface QaRoundInput {
  phase: string;
  candidates: readonly BatchTask[]; // awaiting-qa ของ phase — รวมทุกตัว ณ ตอนเปิด (ไม่มีเพดานจำนวน — ข้อ 1)
  tpReady: boolean; // ไม่มี task ของ test-planner ที่ยังไม่ DONE — เช่น มีแถว TP ของ phase ใน test-plan\index.md (AC-061 · rule satisfied ของ DES-001)
  freeSlots: number; // เงื่อนไขเปิด "เหมือน wave ข้อ 4"
  remainingBusy: number;
  activeExecutions: number; // quiesce — execution session ที่ยังรันอยู่ ต้อง = 0 ก่อนเปิด (รอตัวที่รันอยู่จบ — ข้อ 3)
}
// คืน null = ยังไม่เปิด round (wave ว่าง / ยังมี execution / TP ไม่พร้อม / ไม่มี slot) — driver รอ tick ถัดไป
export function batchQaRound(input: QaRoundInput): BatchDispatch | null {
  const problems: string[] = [];
  for (const t of input.candidates) {
    if (t.planPhase !== input.phase) problems.push(`task ${t.taskId} planPhase "${t.planPhase}" ≠ phase ของ round "${input.phase}" (ข้อ 1)`);
    if (t.step !== "awaiting-qa") problems.push(`task ${t.taskId} step "${t.step}" ≠ awaiting-qa (ข้อ 1 — ผู้สมัคร)`);
    if (t.hold?.reason === "plan-error") problems.push(`task ${t.taskId} เป็นแถว R24 (plan-error) — ห้ามเข้า round (AC-079)`);
  }
  if (problems.length > 0) throw new BatchError("qa round", problems);
  if (input.candidates.length === 0) return null; // wave ว่าง → ไม่เปิด (DES-019 §Errors)
  if (!input.tpReady) return null; // ข้อ 2 — มี task ของ test-planner ที่ยังไม่ DONE → ยังไม่เปิด (AC-061)
  if (input.freeSlots < 1) return null; // ข้อ 4 — ไม่มี slot
  // ข้อ 4 — QA round รวมทุกตัว ณ ตอนเปิดและไม่มีเพดาน จึงไม่มีทาง "เต็ม" ที่รอไม่ได้ — ต้องรอ runnable/execution หมดก่อน
  if (input.remainingBusy > 0) return null;
  if (input.activeExecutions > 0) return null; // quiesce ข้อ 3 — รอตัวที่รันอยู่จบก่อน (shared checks ต้องเห็นไฟล์สมบูรณ์)
  // ข้อ 4: หลาย task = 1 session (AC-054) — perTask รายงานแยกใน handoff qa (data-model) ตัดสินโดย BE-019
  return { kind: "qa", taskIds: input.candidates.map((t) => t.taskId), phase: input.phase, quiesce: true };
}

// --- Feature QA / anchor — DES-019 §Feature QA (R8/R18) ---
// Depends โดยนัยของ anchor = task อื่นใน phase ยกเว้น dependents ของ anchor (ตรง/ทอด) — dependents = งานหลัง Feature QA
// ไม่ผูกขั้นหน้า มิฉะนั้น anchor ↔ dependent เป็นวงวน (ส่ง BE-011 ใช้เป็น satisfied ฝั่ง R8) · บวก Depends ที่เขียนแยกตาม R8
export function anchorImplicitDepends(anchorId: string, tasks: Record<string, RouterTask>): string[] {
  const anchor = tasks[anchorId];
  if (!anchor || anchor.owner !== "qa-engineer") {
    throw new BatchError("anchor", [`"${anchorId}" ไม่ใช่ anchor (Owner qa-engineer) — DES-019 §Feature QA`]);
  }
  // ชุด dependents ตรง/ทอด (เดิน reversed Depends — เรียงลูกเสมอเพื่อ deterministic)
  const rev = new Map<string, string[]>();
  for (const [id, t] of Object.entries(tasks)) {
    for (const d of t.depends) rev.set(d, [...(rev.get(d) ?? []), id]);
  }
  const dep = new Set<string>([anchorId]);
  const q = [anchorId];
  while (q.length) {
    const x = q.shift()!;
    for (const d of [...(rev.get(x) ?? [])].sort()) {
      if (dep.has(d)) continue;
      dep.add(d);
      q.push(d);
    }
  }
  return Object.keys(tasks)
    .filter((id) => id !== anchorId && tasks[id]!.planPhase === anchor.planPhase && !dep.has(id))
    .sort();
}

// R18: dispatch feature-qa — taskIds = [anchor] (ไม่มี anchor = ว่าง) · เงื่อนไขเปิด (phase verified ครบ ไม่นับ
// anchor + dependents) ตัดสินที่ router applyR18 (BE-019) — ที่นี่คือรูป dispatch ที่ BE-011 แปลงเป็น session
export function featureQaDispatch(phase: string, anchorId: string | null): BatchDispatch {
  return { kind: "feature-qa", taskIds: anchorId === null ? [] : [anchorId], phase };
}

// --- security stage — DES-019 §Security stage (OQ-20, AC-080, AC-079) ---
// นิยาม 🔒 ของ phase จาก 3 แหล่ง — อย่างใดอย่างหนึ่งจริง = phase มี 🔒
export interface LockSources {
  phase: string;
  phaseRowLocked: boolean; // แถว Phase ใน ## Phases มี 🔒 (PM หรือ R23 เขียน — BE-022)
  securitySensitive: boolean; // task ใดใน phase มี Security-sensitive: yes ใน task file (DES-014)
  securityGatePhases: readonly string[]; // phase ที่ handoff.securityGate ชี้ (sessions[] — collectSecurityGates BE-007)
}
export function phaseLocked(src: LockSources): boolean {
  return src.phaseRowLocked || src.securitySensitive || src.securityGatePhases.includes(src.phase);
}

// claim ของ security stage (ไม่ใช่ task — ห้าม claim code) — DES-019 §Security stage
export const SECURITY_CLAIM: readonly string[] = ["security.md"];

export interface SecurityStageInput {
  phase: string;
  ordered: boolean; // R19 สั่งแล้ว (หลัง Feature QA PASS = หลัง QA ของทุก task ใน phase — AC-080) — batching ไม่เปิดเอง
  cleared: boolean; // phase cleared แล้ว — 🔒 ที่เพิ่มหลัง cleared ไม่เปิดย้อน (แสดงบน dashboard)
  locked: boolean; // ผล phaseLocked — ไม่มี 🔒 → ไม่มี session
  tasks: Record<string, RouterTask>; // ทั้ง module — คัด phase เอง (กันแถวเยื้อง phase เข้า taskIds)
}
// 1 session ต่อ phase · taskIds = task verified ของ phase ไม่รวมแถว R24 (Owner reviewer/security — AC-079/AC-080 · plan-error)
export function planSecurityStage(input: SecurityStageInput): BatchDispatch | null {
  if (!input.ordered) return null; // เปิดโดย R19 เท่านั้น
  if (input.cleared) return null; // 🔒 หลัง cleared ไม่เปิดย้อน
  if (!input.locked) return null; // ไม่มี 🔒 → ไม่มี session
  const taskIds = Object.values(input.tasks)
    .filter((t) => t.planPhase === input.phase && t.step === "verified")
    .filter((t) => !(FORBIDDEN_OWNERS as readonly string[]).includes(t.owner) && t.hold?.reason !== "plan-error")
    .map((t) => t.taskId)
    .sort();
  return { kind: "security", taskIds, phase: input.phase };
}

// --- session id ของ dispatch (AC-040/AC-049/AC-053) ---
// reviewer/QA/fix ต้องได้ session ใหม่ไม่ซ้ำ implementer/reviewer — ผ่าน newSessionId (BE-007) แล้วตรวจไม่ชนชุดที่มีอยู่
// (ชน = สุ่ม hex ใหม่ — hex4 สั้น ชนได้ในทางทฤษฎี; ครบ 100 ครั้งยังชน → ปฏิเสธ fail-closed)
export function newDispatchSessionIds(count: number, startSeq: number, used: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(count) || count < 0) problems.push(`count ต้องเป็น int ≥ 0 — ได้รับ ${count}`);
  if (!Number.isInteger(startSeq) || startSeq < 0) problems.push(`startSeq ต้องเป็น int ≥ 0 — ได้รับ ${startSeq}`);
  if (problems.length > 0) throw new BatchError("session id", problems);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let id = newSessionId(startSeq + i);
    for (let tries = 0; used.has(id) && tries < 100; tries++) id = newSessionId(startSeq + i);
    if (used.has(id)) throw new BatchError("session id", [`สุ่ม sessionId ไม่ซ้ำกับ session ที่มีอยู่ได้ — seq ${startSeq + i}`]);
    out.push(id);
  }
  return out;
}

// --- reviewInput ต่อ task (DES-019 §Reviewer packet — AC-049/AC-052) ---
export type ReviewTaskInput = NonNullable<PacketV2["reviewInput"]>["tasks"][number];
// changedFiles = touchedFiles ตั้งแต่ review รอบก่อนของ task (union ตามลำดับ seq — ไม่มี review session = ทุก session) ·
// diffPath = sessions/<sid>/diff.patch ของ execution session ล่าสุด (DES-021) — patch เดี่ยวต่อ task ตาม design ·
// testFiles = คัดจาก changedFiles โดย driver (แหล่ง derive ไม่ pin ใน design — BE-011 ส่งค่ามา) ·
// ผลลัพธ์ไม่มี field conversation/reasoning/log ของ implementer ใด (AC-049/AC-053 — รูปตายตัว data-model)
export function reviewInputForTask(taskId: string, sessions: readonly SessionRecord[], testFiles: readonly string[] = []): ReviewTaskInput {
  const mine = sessions.filter((s) => s.taskIds.includes(taskId)).sort((a, b) => a.seq - b.seq);
  const lastReview = [...mine].reverse().find((s) => s.kind === "review");
  const since = lastReview ? mine.filter((s) => s.seq > lastReview.seq) : mine;
  const changedFiles: string[] = [];
  for (const s of since) {
    for (const f of s.writeAudit.touchedFiles) if (!changedFiles.includes(f)) changedFiles.push(f);
  }
  const lastExec = [...mine].reverse().find((s) => s.kind === "execution");
  return { taskId, changedFiles, diffPath: lastExec ? `sessions/${lastExec.sessionId}/diff.patch` : null, testFiles: [...testFiles] };
}

// --- defect packet (DES-019 §Defect packet — AC-055) ---
export type DefectPacketJson = NonNullable<PacketV2["defectPacket"]>; // {taskId, source, roundFile, findings} — data-model verbatim

// path ใต้ run dir — รูปเดียวกับ packetPath ("sessions/<sid>/packet.json" — SessionRecord) คือ "defects/<taskId>-<fixRound>.json"
export function defectPacketPath(taskId: string, fixRound: number): string {
  const problems: string[] = [];
  if (taskId.trim() === "") problems.push("taskId ว่าง");
  if (!Number.isInteger(fixRound) || fixRound < 1) problems.push(`fixRound ต้องเป็น int ≥ 1 — ได้รับ ${fixRound}`);
  if (problems.length > 0) throw new BatchError("defect packet", problems);
  return `defects/${taskId}-${fixRound}.json`;
}

// ประกอบจาก handoff ที่ผ่าน schema แล้ว (BE-006) เฉพาะ finding ของ task นั้น — R4 ส่งไปกับ fix session ของ owner
// คืน null = ไม่มี finding ของ task (หรือ handoff ไม่มี block ของ source) — ไม่สร้าง packet ลอย ๆ
// findings คงรูป ReviewFinding/QaDefect verbatim (field ครบตาม AC-055 โดย schema รับประกัน — validate.ts ตรวจ ≥ 1 ต่อ packet)
export function buildDefectPacket(input: {
  taskId: string;
  source: "review" | "qa" | "feature-qa";
  fixRound: number; // ครั้งที่ fix (fixRounds หลัง R4 bump — ≥ 1) — ตั้งชื่อไฟล์ <taskId>-<fixRound>.json
  handoff: HandoffV2;
}): DefectPacketJson | null {
  const { taskId, source, fixRound, handoff } = input;
  const problems: string[] = [];
  if (taskId.trim() === "") problems.push("taskId ว่าง");
  if (!Number.isInteger(fixRound) || fixRound < 1) problems.push(`fixRound ต้องเป็น int ≥ 1 — ได้รับ ${fixRound}`);
  if (problems.length > 0) throw new BatchError("defect packet", problems);

  let findings: (ReviewFinding | QaDefect)[];
  let roundFile: string;
  if (source === "review") {
    if (!handoff.review) return null;
    findings = handoff.review.findings.filter((f) => f.task === taskId);
    roundFile = handoff.review.roundFile;
  } else if (source === "qa") {
    if (!handoff.qa) return null;
    findings = handoff.qa.defects.filter((d) => d.task === taskId);
    roundFile = handoff.qa.roundFile;
  } else {
    if (!handoff.featureQa) return null;
    // defect task = null (ไม่ระบุ task — R20) ไม่เข้า packet ของ task ใด ๆ
    findings = handoff.featureQa.defects.filter((d) => d.task === taskId);
    roundFile = handoff.featureQa.roundFile;
  }
  if (findings.length === 0) return null;
  return { taskId, source, roundFile, findings };
}
