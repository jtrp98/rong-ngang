// BE-022 — Status write-back ของ orchestrator (DES-007 §Status write-back + §🔒 write-back — Rev 11, R23)
// โหมด orchestrated เท่านั้น (solo: qa-engineer เขียน Status เอง — DES-013) · ค่าที่เขียนได้มีแค่ verified/blocked (AC-073)
// ขั้นตอนต่อการเขียนหนึ่งครั้ง (DES-007): อ่านไฟล์ → หาแถวด้วย Task id / Phase label → ตรวจค่าเดิมตรงที่ runtime คาด
//   → แทนเฉพาะ cell (ไบต์อื่นเท่าเดิม) → tmp + rename (atomic) → อ่านซ้ำยืนยัน → self-write journal {path, sha256, at, decisionRuleId}
// fail-closed: แถวหาย / ค่าเดิมไม่ตรง / ค่านอก pending|verified|blocked / แถวผิดรูป → ปฏิเสธเฉพาะแถวนั้น
//   (hold `status-conflict` เป็นหน้าที่ driver — writer รายงานผล per row และไม่แตะ run.json เอง)
// 🔒 (R23 — G2-f): เพิ่ม `🔒 security gate` ในคอลัมน์ หมายเหตุ ของแถว Phase ใน ## Phases — เพิ่มอย่างเดียว ไม่ลบ/ไม่แก้ข้อความอื่น
//   · มี 🔒 อยู่แล้ว → no-op · หาแถว Phase ไม่เจอ → ไม่เขียน + แจ้ง dashboard (ไม่ hold — R19 ยังเห็นจาก sessions[].handoff.securityGate)
// มี session active ที่ claim ครอบ plan/index.md → เลื่อนทั้งชุดจน session จบ (DES-021 §Permissions) — ตรวจด้วย claimsOverlap
// resume reconcile (DES-007 §Resume/§🔒): marksFromRun(run) → mark ที่ยังไม่อยู่ใน doc เขียนซ้ำ · เขียน atomic + no-op เมื่อค่าตรงอยู่แล้ว
//   ทำให้ kill กลางเขียน (ได้ก่อน/หลัง rename เท่านั้น) reconcile ตอน resume แล้วได้ผลเดียวกัน
// journal hash มาจากการอ่านซ้ำเท่านั้น — อ่านซ้ำไม่ผ่าน = ไม่ลง journal (กัน journal ปิดตา violation ของ BE-008 finishSessionAudit)
// จับคู่แถว/ค่า cell ใช้กติกาเดียวกับ plan-parser (splitRow/unwrap/firstTable) เพื่อให้ audit (parsePlanIndex) เห็นตรงกับสิ่งที่เขียน
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assertModuleName } from "./knowledge-paths.ts";
import { STATUS_VALUES, parsePlanIndex, splitRow, type TaskStatus } from "./plan-parser.ts";
import { claimsOverlap } from "./session-audit.ts";
import { collectSecurityGates, type RunJson } from "./state-store.ts";

export type WriteValue = "verified" | "blocked"; // AC-073 — 2 ค่าเท่านั้น (ไม่เขียน pending — DES-007)

// expectedCurrent = ค่า Status ที่ runtime เห็นใน plan ตอนตัดสิน (PlanRow.status จาก BE-018) — ใช้ยืนยันว่าไฟล์
// ยังเป็นเอกสารชุดเดียวกับที่ Decision อ้าง · null = ตอนตัดสินค่าผิดรูปอยู่แล้ว → ปฏิเสธ (fail-closed)
export interface StatusWriteItem {
  taskId: string;
  value: WriteValue;
  expectedCurrent: TaskStatus | null;
}
export interface SecurityMarkItem { phase: string; reason: string }

export interface ActiveClaim { sessionId: string; claim: readonly string[] } // session ที่ endedAt = null (driver คัดจาก run.json)

export interface StatusWriteInput {
  planPath: string; // abs — จาก resolveDocPath(docsRoot, layout, module, { unit: "plan-index" })
  module: string;
  ruleId: string; // decisionRuleId ลง journal (เช่น "R6"/"R19" — Decision.ruleId ที่ emit รายการนี้)
  statusWrites?: readonly StatusWriteItem[];
  securityMarks?: readonly SecurityMarkItem[];
  activeSessions?: readonly ActiveClaim[];
  journalPath?: string; // abs — <home>\state\runs\<runId>\status-journal.jsonl (append-only, 1 JSON ต่อบรรทัด)
  now?: Date;
}

export type StatusWriteOutcome =
  | { kind: "applied"; taskId: string; from: TaskStatus; to: WriteValue }
  | { kind: "no-op"; taskId: string; to: WriteValue; detail: string } // cell มีค่าเป้าหมายอยู่แล้ว — ไม่เขียน ไม่ลง journal
  | {
      kind: "conflict"; taskId: string;
      reason: "row-missing" | "value-mismatch" | "row-malformed";
      expectedCurrent: TaskStatus | null; actual: string | null;
      detail: string; // → driver hold `status-conflict` + แจ้ง dashboard (DES-007)
    }
  | { kind: "rejected"; taskId: string; detail: string }; // อินพุตผิด contract (value ไม่ใช่ verified/blocked / expectedCurrent ไม่ผ่าน 3 ค่า)

export type SecurityMarkOutcome =
  | { kind: "applied"; phase: string }
  | { kind: "no-op"; phase: string } // มี 🔒 อยู่แล้ว → no-op (DES-007)
  | { kind: "missing-phase"; phase: string; detail: string }; // หาแถว Phase ไม่เจอ → ไม่เขียน + แจ้ง dashboard (ไม่ hold — DES-007)

export interface StatusWriteJournal { path: string; sha256: string; at: string; decisionRuleId: string } // DES-021 ข้อ 4

export interface StatusWriteResult {
  deferred: boolean; deferReason: string | null; // เลื่อนทั้งชุด — driver เรียกซ้ำหลัง session ที่ claim plan จบ
  statusWrites: StatusWriteOutcome[];
  securityMarks: SecurityMarkOutcome[];
  journal: StatusWriteJournal[]; // คืนให้ driver ส่งต่อ BE-008 (journal: [{path, hash}]) — เขียนเมื่อ verify ผ่านเท่านั้น
  journalPersisted: boolean; // journalPath ให้มาและ append สำเร็จ (ไม่มีการเขียน = true · false → driver ต้องตามขึ้นเอง)
  verify: "ok" | "skipped" | "failed"; // อ่านซ้ำยืนยัน — failed = ไฟล์ไม่ตรงที่เขียน ไม่ลง journal
  notes: string[];
}

export class StatusWriterError extends Error {
  constructor(
    readonly kind: "missing" | "invalid" | "write" | "verify",
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = "StatusWriterError";
  }
}

const MARK_TEXT = "🔒 security gate"; // ข้อความตรงตาม DES-007 §🔒 (template plan-index.md คอลัมน์ หมายเหตุ)
const NOTE_COL = 3; // คอลัมน์ หมายเหตุ ของตาราง Phases — parser อ่าน c[3] + template `| Phase | ชื่อ | Tasks | หมายเหตุ |`

// เหมือน unwrap ใน plan-parser (ไม่ export) — จับคู่แถว/ค่าให้ตรงกับสิ่งที่ parser + audit เห็นเป๊ะ
const unwrap = (s: string): string => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").trim();
const isTableLine = (l: string): boolean => l.trimStart().startsWith("|");
const isSep = (cells: string[]): boolean => cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));

// แยกบรรทัดโดยเก็บตัวคั่น (\r\n หรือ \n) เดิมไว้ — index คู่ = เนื้อบรรทัด, index คี่ = ตัวคั่น (คง EOL ของไฟล์เป๊ะ)
function splitKeepEol(text: string): string[] {
  return text.split(/(\r?\n)/);
}

// ขอบเขต section `## <name>` บน parts (เทียบ prefix ไม่สนตัวพิมพ์ — รูปเดียวกับ section() ใน plan-parser) · null ถ้าไม่มี
function sectionBounds(parts: string[], name: string): { start: number; end: number } | null {
  const want = name.toLowerCase();
  let start = -1;
  for (let i = 0; i < parts.length; i += 2) {
    const l = parts[i] ?? "";
    if (/^##\s/.test(l) && l.replace(/^##\s+/, "").trim().toLowerCase().startsWith(want)) { start = i; break; }
  }
  if (start < 0) return null;
  let end = parts.length;
  for (let j = start + 2; j < parts.length; j += 2) {
    if (/^##\s/.test(parts[j] ?? "")) { end = j; break; }
  }
  return { start, end };
}

interface TableLines { headerIndex: number; headerCells: string[]; rowIndexes: number[] }

// ตารางแรกใน section (แถวติดกันหลัง header — ข้ามแถวคั่น) — รูปเดียวกับ firstTable() ใน plan-parser แต่คืน index บรรทัดจริง
function firstTableLines(parts: string[], from: number, to: number): TableLines | null {
  let headerIndex = -1;
  for (let i = from; i < to; i += 2) {
    if (isTableLine(parts[i] ?? "")) { headerIndex = i; break; }
  }
  if (headerIndex < 0) return null;
  const headerCells = splitRow(parts[headerIndex]!).map(unwrap);
  const rowIndexes: number[] = [];
  for (let i = headerIndex + 2; i < to; i += 2) {
    const l = parts[i] ?? "";
    if (!isTableLine(l)) break;
    if (isSep(splitRow(l))) continue;
    rowIndexes.push(i);
  }
  return { headerIndex, headerCells, rowIndexes };
}

// ช่วง [start, end) ของ cell ที่ k ในบรรทัดตาราง — รับเฉพาะรูป `| … | … |` เต็ม (ผิดรูป → null → ปฏิเสธแถวนั้น)
function cellSpan(line: string, k: number): [number, number] | null {
  const t = line.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return null;
  const lead = line.length - line.trimStart().length;
  const pipes: number[] = [];
  for (let i = 0; i < t.length; i++) if (t[i] === "|") pipes.push(i);
  if (pipes.length < k + 2) return null;
  return [lead + pipes[k]! + 1, lead + pipes[k + 1]!];
}

// กรอบ path ที่ claim ของ session อาจครอบ plan/index.md — โมดูลสัมพัทธ์ (claim `plan/**` ของ PM/reviewer/QA),
// รูป prefixed ตาม writeScope.allow (routing.yaml — `knowledge/<module>/…` ทั้งฉบับ placeholder และตัวจริง)
// เทียบด้วย claimsOverlap (DES-021 ข้อ 2 — overlap แบบ prefix) กับ claim ทั้งสองรูปที่ระบบใช้จริง
function planClaimFrames(module: string): string[] {
  return [
    "plan/index.md",
    `${module}/plan/index.md`,
    "knowledge/<module>/plan/index.md",
    `knowledge/${module}/plan/index.md`,
  ];
}

// session แรกที่ claim ครอบ plan/index.md — มี → เลื่อนทั้งชุด (DES-021 §Permissions: "เลื่อนจน session จบ")
function planClaimedBy(activeSessions: readonly ActiveClaim[], module: string): string | null {
  for (const s of activeSessions) {
    for (const frame of planClaimFrames(module)) {
      if (claimsOverlap([frame], s.claim)) return s.sessionId;
    }
  }
  return null;
}

// เขียน Status + 🔒 ลง plan/index.md — คำสั่งหนึ่งครั้ง = ไฟล์เดียว เขียน atomic ครั้งเดียว (statusWrites ที่
// ผ่านตรวจ + securityMarks เขียนพร้อมกัน) · แถวใดผิดเงื่อนไขถูกปฏิเสธเฉพาะแถว ไม่บล็อกแถวอื่น (AC-056 — localized)
export function applyStatusWrites(input: StatusWriteInput): StatusWriteResult {
  assertModuleName(input.module);
  if (!path.isAbsolute(input.planPath)) {
    throw new StatusWriterError("invalid", `planPath ต้องเป็น absolute path — ได้รับ ${JSON.stringify(input.planPath)}`, input.planPath);
  }
  const statusWrites = input.statusWrites ?? [];
  const securityMarks = input.securityMarks ?? [];
  const result: StatusWriteResult = {
    deferred: false, deferReason: null, statusWrites: [], securityMarks: [],
    journal: [], journalPersisted: true, verify: "skipped", notes: [],
  };
  if (statusWrites.length === 0 && securityMarks.length === 0) return result;

  // เลื่อนทั้งชุด — มี session active ที่ claim ครอบ plan/index.md (DES-021 §Permissions · DES-007)
  const claimer = planClaimedBy(input.activeSessions ?? [], input.module);
  if (claimer !== null) {
    result.deferred = true;
    result.deferReason = `session ${claimer} claim ครอบ plan/index.md อยู่ — เลื่อนจน session จบ (DES-021 §Permissions)`;
    return result;
  }

  if (!existsSync(input.planPath)) {
    throw new StatusWriterError("missing", `ไม่พบ plan/index.md: ${input.planPath}`, input.planPath);
  }
  let text: string;
  try {
    text = readFileSync(input.planPath, "utf8");
  } catch (e) {
    throw new StatusWriterError("invalid", `อ่าน plan/index.md ไม่ได้: ${(e as Error).message}`, input.planPath);
  }
  const parts = splitKeepEol(text);

  // --- โครงตาราง Tasks + คอลัมน์ Status (รูปผิด = เขียนไม่ได้ทั้งไฟล์ — fail-closed) ---
  const tasksSec = sectionBounds(parts, "Tasks");
  if (!tasksSec) {
    throw new StatusWriterError("invalid", `ไม่มีหัวข้อ ## Tasks ใน ${input.planPath} — เขียน Status ไม่ได้ (fail-closed)`, input.planPath);
  }
  const tasksTable = firstTableLines(parts, tasksSec.start + 2, tasksSec.end);
  if (!tasksTable) {
    throw new StatusWriterError("invalid", `ไม่มีตารางใน ## Tasks ของ ${input.planPath} — เขียน Status ไม่ได้ (fail-closed)`, input.planPath);
  }
  const statusCol = tasksTable.headerCells.map((c) => c.toLowerCase()).indexOf("status");
  if (statusCol < 0) {
    throw new StatusWriterError("invalid", "ตาราง Tasks ไม่มีคอลัมน์ Status — เขียน Status ไม่ได้ (fail-closed)", input.planPath);
  }

  // --- ตัดสินทีละแถว บนสำเนา in-memory — แถวที่ผ่านแก้ parts ทันที (แถวท้ายเห็นค่าล่าสุด) ---
  const rowIds = new Map<number, string>();
  const taskRowHits = (id: string): number[] =>
    tasksTable.rowIndexes.filter((i) => unwrap(splitRow(parts[i] ?? "")[0] ?? "") === id);

  for (const w of statusWrites) {
    const id = w.taskId;
    if (w.value !== "verified" && w.value !== "blocked") {
      result.statusWrites.push({ kind: "rejected", taskId: id, detail: `value ${JSON.stringify(String(w.value))} ไม่ใช่ verified|blocked — เขียนได้แค่ 2 ค่า (AC-073 · DES-007)` });
      continue;
    }
    if (w.expectedCurrent === null || !(STATUS_VALUES as readonly string[]).includes(w.expectedCurrent)) {
      result.statusWrites.push({
        kind: "conflict", taskId: id, reason: "value-mismatch", expectedCurrent: w.expectedCurrent ?? null, actual: null,
        detail: "expectedCurrent ไม่ผ่าน pending|verified|blocked — ตรวจ \"ค่าเดิมตรงที่ runtime คาด\" ไม่ได้ (fail-closed — DES-007)",
      });
      continue;
    }
    const hits = taskRowHits(id);
    if (hits.length === 0) {
      result.statusWrites.push({
        kind: "conflict", taskId: id, reason: "row-missing", expectedCurrent: w.expectedCurrent, actual: null,
        detail: `ไม่พบแถว ${id} ในตาราง Tasks — ไม่เขียน + hold status-conflict (DES-007)`,
      });
      continue;
    }
    if (hits.length > 1) {
      result.statusWrites.push({
        kind: "conflict", taskId: id, reason: "row-malformed", expectedCurrent: w.expectedCurrent, actual: null,
        detail: `task id ${id} ปรากฏ ${hits.length} แถวในตาราง — ปฏิเสธ (fail-closed; parser แจ้ง plan-duplicate-id)`,
      });
      continue;
    }
    const lineIndex = hits[0]!;
    const line = parts[lineIndex] ?? "";
    const cells = splitRow(line);
    const span = cellSpan(line, statusCol);
    if (cells.length !== tasksTable.headerCells.length || span === null) {
      result.statusWrites.push({
        kind: "conflict", taskId: id, reason: "row-malformed", expectedCurrent: w.expectedCurrent, actual: cells[statusCol] ?? null,
        detail: `แถว ${id} ผิดรูป (${cells.length} cell / ตารางมี ${tasksTable.headerCells.length} · ต้องเป็น |…| ครบท้าย) — ปฏิเสธ (fail-closed)`,
      });
      continue;
    }
    const rawCell = cells[statusCol] ?? "";
    const actual = unwrap(rawCell);
    if (!(STATUS_VALUES as readonly string[]).includes(actual)) {
      result.statusWrites.push({
        kind: "conflict", taskId: id, reason: "value-mismatch", expectedCurrent: w.expectedCurrent, actual: rawCell,
        detail: `ค่า Status ปัจจุบัน ${JSON.stringify(rawCell)} ไม่ผ่าน pending|verified|blocked — ปฏิเสธ (fail-closed)`,
      });
      continue;
    }
    if (actual !== w.expectedCurrent) {
      result.statusWrites.push({
        kind: "conflict", taskId: id, reason: "value-mismatch", expectedCurrent: w.expectedCurrent, actual: rawCell,
        detail: `ค่าเดิม ${JSON.stringify(rawCell)} ไม่ตรงที่ runtime คาด (${w.expectedCurrent}) — ไม่เขียน + hold status-conflict (DES-007)`,
      });
      continue;
    }
    if (actual === w.value) {
      // cell มีค่าเป้าหมายอยู่แล้ว (เช่น kill หลัง rename ก่อน journal) — no-op เพื่อให้ resume reconcile ได้ผลเดียวกับเขียนครั้งแรก
      result.statusWrites.push({ kind: "no-op", taskId: id, to: w.value, detail: `Status ของ ${id} เป็น ${w.value} อยู่แล้ว — no-op (idempotent)` });
      continue;
    }
    parts[lineIndex] = line.slice(0, span[0]) + ` ${w.value} ` + line.slice(span[1]);
    result.statusWrites.push({ kind: "applied", taskId: id, from: actual, to: w.value });
  }

  // --- 🔒 ในแถว Phase (R23) — เพิ่มอย่างเดียว · มีอยู่แล้ว → no-op · หาแถวไม่เจอ → missing-phase (แจ้ง dashboard ไม่ hold) ---
  const phSec = sectionBounds(parts, "Phases");
  const phTable = phSec ? firstTableLines(parts, phSec.start + 2, phSec.end) : null;
  for (const m of securityMarks) {
    if (!phTable || phTable.headerCells.length < NOTE_COL + 1) {
      result.securityMarks.push({ kind: "missing-phase", phase: m.phase, detail: phSec ? "ตาราง ## Phases ผิดรูป (คอลัมน์ไม่ครบ 4: Phase|ชื่อ|Tasks|หมายเหตุ) — ไม่เขียน (fail-closed)" : "ไม่มี ## Phases ใน plan — ไม่เขียน + แจ้ง dashboard (ไม่ hold — DES-007)" });
      continue;
    }
    const hits = phTable.rowIndexes.filter((i) => unwrap(splitRow(parts[i] ?? "")[0] ?? "") === m.phase);
    if (hits.length === 0) {
      result.securityMarks.push({ kind: "missing-phase", phase: m.phase, detail: `ไม่พบแถว Phase ${JSON.stringify(m.phase)} ใน ## Phases — ไม่เขียน + แจ้ง dashboard (ไม่ hold — DES-007)` });
      continue;
    }
    if (hits.length > 1) {
      result.securityMarks.push({ kind: "missing-phase", phase: m.phase, detail: `ป้าย Phase ${JSON.stringify(m.phase)} ซ้ำ ${hits.length} แถว — ปฏิเสธ (fail-closed)` });
      continue;
    }
    const lineIndex = hits[0]!;
    const line = parts[lineIndex] ?? "";
    if (line.includes("🔒")) {
      // เกณฑ์ "มีอยู่แล้ว" ตรงกับ parser (locked = แถวมี 🔒 ที่ cell ใดก็ได้) — ไม่ซ้ำ/ไม่ลบ (DES-007)
      result.securityMarks.push({ kind: "no-op", phase: m.phase });
      continue;
    }
    const cells = splitRow(line);
    const span = cellSpan(line, NOTE_COL);
    if (cells.length !== phTable.headerCells.length || span === null) {
      result.securityMarks.push({ kind: "missing-phase", phase: m.phase, detail: `แถว Phase ${JSON.stringify(m.phase)} ผิดรูป (${cells.length} cell / ตารางมี ${phTable.headerCells.length}) — ไม่เขียน (fail-closed)` });
      continue;
    }
    const cur = (cells[NOTE_COL] ?? "").trim();
    const next = cur === "" ? MARK_TEXT : `${cur} ${MARK_TEXT}`; // เพิ่มอย่างเดียว — ไม่ลบข้อความเดิมใน cell
    parts[lineIndex] = line.slice(0, span[0]) + ` ${next} ` + line.slice(span[1]);
    result.securityMarks.push({ kind: "applied", phase: m.phase });
  }

  const changed = result.statusWrites.some((o) => o.kind === "applied") || result.securityMarks.some((o) => o.kind === "applied");
  if (!changed) return result; // ไม่มีอะไรเขียน — ไม่มี tmp ไม่มี journal

  // --- tmp + rename (atomic — DES-007) ---
  const nextText = parts.join("");
  const tmp = `${input.planPath}.tmp-${process.pid}-${randomBytes(2).toString("hex")}`;
  try {
    writeFileSync(tmp, nextText, "utf8");
    renameSync(tmp, input.planPath);
  } catch (e) {
    try { rmSync(tmp, { force: true }); } catch { /* ลบซากไม่ได้ — ปล่อยให้เห็นบนดิสก์ */ }
    throw new StatusWriterError("write", `เขียน plan/index.md ไม่สำเร็จ (tmp + rename): ${(e as Error).message}`, input.planPath);
  }

  // --- อ่านซ้ำยืนยัน (byte เท่า + parse ระดับแถวด้วย parser เดียวกับ audit) ---
  let backHash = "";
  try {
    const buf = readFileSync(input.planPath);
    backHash = createHash("sha256").update(buf).digest("hex");
    if (buf.toString("utf8") !== nextText) {
      result.verify = "failed";
      result.notes.push("อ่านซ้ำไม่ตรงกับเนื้อหาที่เขียน — ไม่ลง journal (hash ต้องมาจากของจริง) — ตรวจไฟล์ก่อนเดินต่อ");
      return result;
    }
  } catch (e) {
    result.verify = "failed";
    result.notes.push(`อ่านซ้ำยืนยันไม่ได้: ${(e as Error).message} — ไม่ลง journal`);
    return result;
  }
  const parsed = parsePlanIndex(nextText, input.planPath);
  const rowById = new Map(parsed.rows.map((r) => [r.id, r]));
  const phaseByLabel = new Map(parsed.phases.map((p) => [p.label, p]));
  for (const o of result.statusWrites) {
    if (o.kind !== "applied") continue;
    if (rowById.get(o.taskId)?.status !== o.to) {
      result.verify = "failed";
      result.notes.push(`อ่านซ้ำ: Status ของ ${o.taskId} ไม่ใช่ ${o.to} — ไม่ลง journal`);
    }
  }
  for (const o of result.securityMarks) {
    if (o.kind !== "applied") continue;
    if (phaseByLabel.get(o.phase)?.locked !== true) {
      result.verify = "failed";
      result.notes.push(`อ่านซ้ำ: แถว Phase ${JSON.stringify(o.phase)} ไม่มี 🔒 — ไม่ลง journal`);
    }
  }
  if (result.verify === "failed") return result;

  // --- self-write journal (DES-021 ข้อ 4) — บันทึกหลังยืนยันเท่านั้น · driver ส่ง {path, hash} ต่อให้ BE-008 ---
  const entry: StatusWriteJournal = {
    path: input.planPath,
    sha256: backHash,
    at: (input.now ?? new Date()).toISOString(),
    decisionRuleId: input.ruleId,
  };
  result.journal.push(entry);
  if (input.journalPath !== undefined) {
    try {
      mkdirSync(path.dirname(input.journalPath), { recursive: true });
      appendFileSync(input.journalPath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (e) {
      result.journalPersisted = false;
      result.notes.push(`บันทึก self-write journal ลง ${input.journalPath} ไม่สำเร็จ: ${(e as Error).message} — plan เขียนสำเร็จ (sha256 ${backHash.slice(0, 12)}…) — driver ต้องบันทึก result.journal ต่อเอง (DES-007)`);
    }
  }
  result.verify = "ok";
  return result;
}

// resume reconcile (DES-007 §Resume/§🔒): securityGate ทั้งหมดใน run → securityMarks · dedupe ต่อ phase
// (mark ซ้ำเป็น no-op อยู่แล้ว) — reason แรกตามลำดับ seq ชนะ (ไว้ log/dashboard)
export function marksFromRun(run: RunJson): SecurityMarkItem[] {
  const out = new Map<string, SecurityMarkItem>();
  for (const g of collectSecurityGates(run)) {
    if (!out.has(g.phase)) out.set(g.phase, { phase: g.phase, reason: g.reason });
  }
  return [...out.values()];
}
