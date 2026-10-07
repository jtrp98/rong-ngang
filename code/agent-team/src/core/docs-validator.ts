// BE-001 — validator โครงเอกสาร split layout (DES-014): index↔ไฟล์ สองทาง + size budget ต่อหน่วย + สูตร budget ของ index
// อ่านอย่างเดียว — คืนรายการ issue ทั้งหมด; ผู้เรียกตัดสินปฏิเสธ/หยุดรอคน (fail-closed)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parsePlanIndex, parseTaskFile, splitRow, type PlanIndex, type PlanIssue, type PlanIssueKind } from "./plan-parser.ts";

const KB = 1024;

interface Category {
  dir: string;
  unitFile: RegExp; // ชื่อไฟล์ที่นับเป็น unit
  rowId: (cell: string) => string | null; // id จากเซลล์ของตาราง index (null = ไม่ใช่การอ้างอิง unit)
  unitBudgetKB: number;
  fileColumn?: boolean; // index อ้างไฟล์ unit ผ่านคอลัมน์ `ไฟล์` ของตาราง ไม่ใช่เซลล์แรก (DES-014:25 · DES-020:16 — REV-021)
}

const baseId = (file: string): string => file.replace(/\.md$/i, "").toLowerCase();
const roundId = (s: string): string | null => {
  const m = /round[-\s]?(\d+)/i.exec(s);
  return m ? `round-${m[1]}` : null;
};
const matchId = (re: RegExp) => (s: string): string | null => (re.test(s) ? s.toLowerCase() : null);
// ตัด markdown ห่อ: [text](link) · `code` · **bold**
const cleanCell = (c: string): string => c.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").trim();

export const CATEGORIES: Category[] = [
  { dir: "requirement", unitFile: /^req-\d+\.md$/i, rowId: matchId(/^req-\d+$/i), unitBudgetKB: 4 },
  { dir: "design", unitFile: /^des-\d+\.md$/i, rowId: matchId(/^des-\d+$/i), unitBudgetKB: 8 },
  { dir: "plan", unitFile: /^[a-z]+-\d+\.md$/i, rowId: matchId(/^[a-z]+-\d+$/i), unitBudgetKB: 4 },
  { dir: "open-questions", unitFile: /^oq-.+\.md$/i, rowId: matchId(/^oq-[\w-]+$/i), unitBudgetKB: 4 },
  { dir: "test-plan", unitFile: /^round-\d+\.md$/i, rowId: roundId, unitBudgetKB: 10, fileColumn: true },
  { dir: "review", unitFile: /^round-\d+\.md$/i, rowId: roundId, unitBudgetKB: 10, fileColumn: true },
  { dir: "qa", unitFile: /^round-\d+\.md$/i, rowId: roundId, unitBudgetKB: 10, fileColumn: true },
];
// ไฟล์ non-unit ที่ DES-014 กำหนดงบไว้
const FIXED_BUDGET_KB: Record<string, number> = { "requirement/scope.md": 12, "design/data-model.md": 15 };

type BaseKind = "index-missing" | "file-not-in-index" | "index-row-no-file" | "unit-over-budget" | "index-over-budget";
// BE-018: issue มี 2 ระดับ — module (หยุด run: assertModuleDocs) · row (hold แถว + dependents, run เดินต่อ — R9/R24)
export interface DocIssue {
  kind: BaseKind | PlanIssueKind;
  file: string;
  message: string;
  level?: "module" | "row"; // ไม่ระบุ = module
  location?: string;
  reason?: string;
  taskIds?: string[];
}

const fromPlan = (i: PlanIssue): DocIssue => ({ kind: i.kind, file: i.file, message: i.message, level: i.level, location: i.location, reason: i.reason, taskIds: i.taskIds });
export const isRowIssue = (i: DocIssue): boolean => i.level === "row";

// ตาราง finding/TP ของ index (DES-014): หา table ที่ cell แรกของ header = first แล้วเทียบ header + รูป id ของแถว
const INDEX_TABLES: Record<string, { header: string[]; id: RegExp }> = {
  "test-plan": { header: ["TP", "Phase", "REQ/AC", "ไฟล์"], id: /^TP-\d+$/i },
  review: { header: ["ID", "Task", "Severity", "ไฟล์"], id: /^REV-\d+$/i },
  qa: { header: ["ID", "Task", "Severity", "ไฟล์"], id: /^QA-\d+$/i },
};
function checkIndexTable(cat: string, indexFile: string, text: string): DocIssue[] {
  const spec = INDEX_TABLES[cat];
  if (!spec) return [];
  const ls = text.split(/\r?\n/);
  const bad = (reason: string, message: string): DocIssue =>
    ({ kind: "plan-table-malformed", file: indexFile, message, level: "module", location: `${cat}/index.md`, reason, taskIds: [] });
  for (let i = 0; i < ls.length; i++) {
    if (!ls[i]!.trimStart().startsWith("|") || (i > 0 && ls[i - 1]!.trimStart().startsWith("|"))) continue;
    const header = splitRow(ls[i]!).map(cleanCell);
    if (header[0]?.toLowerCase() !== spec.header[0]!.toLowerCase()) continue;
    if (header.length !== spec.header.length || !spec.header.every((h, k) => h.toLowerCase() === header[k]!.toLowerCase())) {
      return [bad("header", `ตารางใน ${cat}/index.md ต้องมี header \`${spec.header.join(" | ")}\` — พบ \`${header.join(" | ")}\``)];
    }
    const out: DocIssue[] = [];
    for (let k = i + 1; k < ls.length && ls[k]!.trimStart().startsWith("|"); k++) {
      const cells = splitRow(ls[k]!).map(cleanCell);
      if (cells.every((c) => /^:?-+:?$/.test(c)) || /^(—|–|-|)$/.test(cells[0] ?? "")) continue;
      if (cells.length !== spec.header.length || !spec.id.test(cells[0]!)) {
        out.push(bad(`row:${k + 1}`, `แถวบรรทัด ${k + 1} ของ ${cat}/index.md ไม่ตรงรูป ${spec.header.join(" | ")} (id: ${spec.id})`));
      }
    }
    return out;
  }
  return [bad("table-missing", `${cat}/index.md ไม่มีตาราง \`${spec.header.join(" | ")}\` (DES-014)`)];
}

// อ่านรูป plan อย่างเดียว (flag needsMigration, แถว, phases) — ผู้เรียกใช้ตัดสิน hold/dispatch
export function inspectPlan(moduleDir: string): PlanIndex | null {
  const f = path.join(moduleDir, "plan", "index.md");
  return existsSync(f) ? parsePlanIndex(readFileSync(f, "utf8"), f) : null;
}

// budget(index) = (median ขนาดไฟล์ย่อยที่ index ระบุ × 0.75) × จำนวนไฟล์ + 2 KB
export function indexBudgetBytes(referencedSizes: number[]): number {
  if (referencedSizes.length === 0) return 2 * KB;
  const sorted = [...referencedSizes].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return median * 0.75 * sorted.length + 2 * KB;
}

function firstCells(indexText: string): string[] {
  const out: string[] = [];
  for (const line of indexText.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|")) continue;
    const cell = line.trim().replace(/^\|/, "").split("|")[0] ?? "";
    const name = cleanCell(cell);
    if (name && !/^:?-+:?$/.test(name)) out.push(name);
  }
  return out;
}

// REV-021: index ของ test-plan/review/qa ชี้ไฟล์ round ผ่านคอลัมน์ `ไฟล์` ของตาราง (DES-014:25 · DES-020:16 "round file ที่แถวระบุ")
// — ค่าในคอลัมน์นั้นของทุกตาราง (Rounds/Findings/TP) นับเป็นการอ้างอิงที่ถูกต้องเท่ากับ id ในเซลล์แรก
// อ่านเฉพาะเซลล์ในตาราง (prose เช่น Change Log ไม่นับ) — ไฟล์ที่ไม่ปรากฏทางใดเลยยังเป็น issue ตาม fail-closed เดิม
function fileColumnCells(indexText: string): string[] {
  const ls = indexText.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    if (!ls[i]!.trimStart().startsWith("|") || (i > 0 && ls[i - 1]!.trimStart().startsWith("|"))) continue;
    const col = splitRow(ls[i]!).map(cleanCell).findIndex((h) => h === "ไฟล์");
    if (col < 0) continue;
    for (let k = i + 1; k < ls.length && ls[k]!.trimStart().startsWith("|"); k++) {
      const cells = splitRow(ls[k]!).map(cleanCell);
      if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // แถวคั่น header
      const v = cells[col];
      if (v) out.push(v);
    }
  }
  return out;
}

export function validateModuleDocs(moduleDir: string): DocIssue[] {
  const issues: DocIssue[] = [];
  // plan v2 (BE-018): v2 ตรวจเต็ม · legacy (`needsMigration`) ตรวจ index ตามที่อ่านได้ แต่ไม่บังคับรูป v2 กับ task file/ตารางหมวดอื่น
  const plan = inspectPlan(moduleDir);
  if (plan) issues.push(...plan.issues.map(fromPlan));
  const v2 = plan?.format === "v2";
  for (const cat of CATEGORIES) {
    const dir = path.join(moduleDir, cat.dir);
    if (!existsSync(dir)) continue; // หมวดที่ module ไม่มี (เช่น test-plan ไม่ trigger) ข้ามได้
    const indexFile = path.join(dir, "index.md");
    if (!existsSync(indexFile)) {
      issues.push({ kind: "index-missing", file: indexFile, message: `หมวด ${cat.dir} ไม่มี index.md (แหล่งรายชื่อไฟล์เดียว — DES-014)` });
      continue;
    }
    const files = readdirSync(dir).filter((f) => f !== "index.md" && statSync(path.join(dir, f)).isFile());
    const indexText = readFileSync(indexFile, "utf8");
    const units = files.filter((f) => cat.unitFile.test(f));
    // id อ้างอิงจาก index: เซลล์แรกของแถว (ทุกหมวด) + คอลัมน์ `ไฟล์` เฉพาะหมวด round (REV-021 — DES-014:25)
    const rowIds = new Set(firstCells(indexText).map(cat.rowId).filter((x): x is string => x !== null));
    if (cat.fileColumn) {
      for (const cell of fileColumnCells(indexText)) {
        const id = cat.rowId(cell);
        if (id) rowIds.add(id);
      }
    }
    const unitIds = new Set(units.map(baseId));

    for (const f of units) {
      const file = path.join(dir, f);
      if (!rowIds.has(baseId(f))) {
        issues.push({ kind: "file-not-in-index", file, message: `id "${baseId(f)}" มีไฟล์แต่ไม่อยู่ใน ${indexFile}` });
      }
      const size = statSync(file).size;
      if (size > cat.unitBudgetKB * KB) {
        issues.push({ kind: "unit-over-budget", file, message: `ขนาด ${size} B เกินงบ ${cat.unitBudgetKB} KB` });
      }
    }
    for (const id of rowIds) {
      if (!unitIds.has(id)) {
        issues.push({ kind: "index-row-no-file", file: indexFile, message: `index ระบุ id "${id}" แต่ไม่มีไฟล์ใน ${dir}` });
      }
    }
    for (const f of files) {
      const budget = FIXED_BUDGET_KB[`${cat.dir}/${f}`];
      if (budget === undefined) continue;
      const size = statSync(path.join(dir, f)).size;
      if (size > budget * KB) issues.push({ kind: "unit-over-budget", file: path.join(dir, f), message: `ขนาด ${size} B เกินงบ ${budget} KB` });
    }

    // "ไฟล์ย่อยที่ index ระบุ" = unit ที่มีแถวใน index + ไฟล์อื่นที่ index อ้างชื่อ (เช่น data-model.md, scope.md)
    if (v2) issues.push(...checkIndexTable(cat.dir, indexFile, indexText));
    if (v2 && cat.dir === "plan") {
      for (const f of units) {
        const id = baseId(f).toUpperCase();
        issues.push(...parseTaskFile(readFileSync(path.join(dir, f), "utf8"), id, path.join(dir, f)).issues.map(fromPlan));
      }
    }

    const lower = indexText.toLowerCase();
    const referenced = files.filter((f) => (cat.unitFile.test(f) ? rowIds.has(baseId(f)) : lower.includes(f.toLowerCase())));
    const budget = indexBudgetBytes(referenced.map((f) => statSync(path.join(dir, f)).size));
    const indexSize = statSync(indexFile).size;
    if (indexSize > budget) {
      issues.push({ kind: "index-over-budget", file: indexFile, message: `index ${indexSize} B เกินสูตร budget ${Math.round(budget)} B (${referenced.length} ไฟล์)` });
    }
  }
  return issues;
}

// run หยุดรอคนเมื่อมี issue ระดับ module (DES-014 Fallback) — issue ระดับแถวไม่หยุดทั้ง run (hold แถวผ่าน isRowIssue)
export function assertModuleDocs(moduleDir: string): void {
  const issues = validateModuleDocs(moduleDir).filter((i) => !isRowIssue(i));
  if (issues.length > 0) {
    throw new Error(`โครงเอกสารไม่ผ่าน (${issues.length} ข้อ):\n${issues.map((i) => `- [${i.kind}] ${i.file} — ${i.message}`).join("\n")}`);
  }
}
