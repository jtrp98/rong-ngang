// BE-001 — validator โครงเอกสาร split layout (DES-014): index↔ไฟล์ สองทาง + size budget ต่อหน่วย + สูตร budget ของ index
// อ่านอย่างเดียว — คืนรายการ issue ทั้งหมด; ผู้เรียกตัดสินปฏิเสธ/หยุดรอคน (fail-closed)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const KB = 1024;

interface Category {
  dir: string;
  unitFile: RegExp; // ชื่อไฟล์ที่นับเป็น unit
  rowId: (firstCell: string) => string | null; // id จากเซลล์แรกของแถวตาราง index (null = ไม่ใช่แถว unit)
  unitBudgetKB: number;
}

const baseId = (file: string): string => file.replace(/\.md$/i, "").toLowerCase();
const roundId = (s: string): string | null => {
  const m = /round[-\s]?(\d+)/i.exec(s);
  return m ? `round-${m[1]}` : null;
};
const matchId = (re: RegExp) => (s: string): string | null => (re.test(s) ? s.toLowerCase() : null);

export const CATEGORIES: Category[] = [
  { dir: "requirement", unitFile: /^req-\d+\.md$/i, rowId: matchId(/^req-\d+$/i), unitBudgetKB: 4 },
  { dir: "design", unitFile: /^des-\d+\.md$/i, rowId: matchId(/^des-\d+$/i), unitBudgetKB: 8 },
  { dir: "plan", unitFile: /^[a-z]+-\d+\.md$/i, rowId: matchId(/^[a-z]+-\d+$/i), unitBudgetKB: 4 },
  { dir: "open-questions", unitFile: /^oq-.+\.md$/i, rowId: matchId(/^oq-[\w-]+$/i), unitBudgetKB: 4 },
  { dir: "test-plan", unitFile: /^round-\d+\.md$/i, rowId: roundId, unitBudgetKB: 10 },
  { dir: "review", unitFile: /^round-\d+\.md$/i, rowId: roundId, unitBudgetKB: 10 },
  { dir: "qa", unitFile: /^round-\d+\.md$/i, rowId: roundId, unitBudgetKB: 10 },
];
// ไฟล์ non-unit ที่ DES-014 กำหนดงบไว้
const FIXED_BUDGET_KB: Record<string, number> = { "requirement/scope.md": 12, "design/data-model.md": 15 };

export interface DocIssue {
  kind: "index-missing" | "file-not-in-index" | "index-row-no-file" | "unit-over-budget" | "index-over-budget";
  file: string;
  message: string;
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
    // ตัด markdown ห่อ: [text](link) · `code` · **bold**
    const clean = cell.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").trim();
    if (clean && !/^:?-+:?$/.test(clean)) out.push(clean);
  }
  return out;
}

export function validateModuleDocs(moduleDir: string): DocIssue[] {
  const issues: DocIssue[] = [];
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
    const rowIds = new Set(firstCells(indexText).map(cat.rowId).filter((x): x is string => x !== null));
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

// run หยุดรอคนเมื่อมี issue (DES-014 Fallback)
export function assertModuleDocs(moduleDir: string): void {
  const issues = validateModuleDocs(moduleDir);
  if (issues.length > 0) {
    throw new Error(`โครงเอกสารไม่ผ่าน (${issues.length} ข้อ):\n${issues.map((i) => `- [${i.kind}] ${i.file} — ${i.message}`).join("\n")}`);
  }
}
