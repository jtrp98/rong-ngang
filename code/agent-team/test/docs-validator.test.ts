// BE-018 — validator v2 (DES-014 §Validator Rev 10/12): module vs row issue, TP/REV/QA tables, real module
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertModuleDocs, inspectPlan, isRowIssue, validateModuleDocs } from "../src/core/docs-validator.ts";
import { TASK_FILE_HEADINGS } from "../src/core/plan-parser.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be018-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;

const TASK = "# T\n\n" + TASK_FILE_HEADINGS.map((h) => `## ${h}\n\nx\n`).join("\n");
const HEAD = "| Task | Name | Owner | Phase | Depends | Status |\n|---|---|---|---|---|---|\n";
const PH = "## Phases\n\n| Phase | ชื่อ | Tasks | หมายเหตุ |\n|---|---|---|---|\n| 1 | a | BE-001, BE-002 | — |\n\n## Waiting on Human\n\n| # | q | o | d | b |\n|---|---|---|---|---|\n\n";

function mk(rows: string, files: Record<string, string> = {}): string {
  const m = path.join(tmp, `m${++n}`);
  mkdirSync(path.join(m, "plan"), { recursive: true });
  writeFileSync(path.join(m, "plan", "index.md"), `# P\n\n${PH}## Tasks\n\n${HEAD}${rows}`);
  for (const id of ["be-001", "be-002"]) writeFileSync(path.join(m, "plan", `${id}.md`), TASK);
  for (const [f, c] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(m, f)), { recursive: true });
    writeFileSync(path.join(m, f), c);
  }
  return m;
}
const ROWS = "| BE-001 | a | backend-engineer | 1 | — | pending |\n| BE-002 | b | backend-engineer | 1 | BE-001 | pending |\n";
const REAL = path.resolve(import.meta.dirname, "..", "..", "..", "knowledge", "agent-team");

test("module v2 ถูกต้อง → ไม่มี issue", () => {
  const m = mk(ROWS);
  assert.deepEqual(validateModuleDocs(m), []);
  assert.equal(inspectPlan(m)!.format, "v2");
});

test("issue แถว (Owner reviewer, Depends เสีย, multi-anchor) ไม่ทำให้ assertModuleDocs ล้ม แต่รายงาน task id", () => {
  const m = mk("| BE-001 | a | reviewer | 1 | BE-099 | pending |\n| BE-002 | b | qa-engineer | 1 | — | pending |\n");
  const issues = validateModuleDocs(m);
  assert.ok(issues.length >= 2 && issues.every(isRowIssue));
  assert.ok(issues.some((i) => i.reason === "owner:reviewer" && i.taskIds!.includes("BE-001")));
  assert.ok(issues.some((i) => i.kind === "plan-depends-missing" && i.taskIds![0] === "BE-001"));
  assert.doesNotThrow(() => assertModuleDocs(m));
  const m2 = mk("| BE-001 | a | qa-engineer | 1 | — | pending |\n| BE-002 | b | qa-engineer | 1 | — | pending |\n");
  const mi = validateModuleDocs(m2).find((i) => i.kind === "plan-multi-anchor")!;
  assert.deepEqual([mi.reason, mi.taskIds, mi.level], ["multi-anchor", ["BE-001", "BE-002"], "row"]);
  assert.doesNotThrow(() => assertModuleDocs(m2));
});

test("issue ระดับ module (header ผิด) → assertModuleDocs ล้ม", () => {
  const m = mk(ROWS);
  writeFileSync(path.join(m, "plan", "index.md"), "## Tasks\n\n| Task | Depends | Status |\n|---|---|---|\n| BE-001 | — | pending |\n| BE-002 | — | pending |\n");
  const i = validateModuleDocs(m).find((x) => x.kind === "plan-header-invalid")!;
  assert.equal(isRowIssue(i), false);
  assert.throws(() => assertModuleDocs(m), /plan-header-invalid/);
});

test("task file มี Status: / ขาดหัวข้อ → issue แถวพร้อม task id (AC-038)", () => {
  const m = mk(ROWS, { "plan/be-001.md": TASK + "\nStatus: pending\n", "plan/be-002.md": TASK.replace("## Handoff", "## Other") });
  const issues = validateModuleDocs(m);
  assert.ok(issues.some((i) => i.kind === "task-file-status-field" && i.taskIds![0] === "BE-001"));
  assert.ok(issues.some((i) => i.kind === "task-file-heading-missing" && i.reason === "missing:Handoff" && i.taskIds![0] === "BE-002"));
});

test("legacy plan: ไม่บังคับรูป v2 กับ task file/ตารางอื่น, ไม่ใช่ issue, needsMigration", () => {
  const m = mk(ROWS);
  writeFileSync(path.join(m, "plan", "index.md"), "## Tasks\n\n| Task | Name | Status |\n|---|---|---|\n| BE-001 | a | pending |\n| BE-002 | b | pending |\n");
  writeFileSync(path.join(m, "plan", "be-001.md"), "old\n");
  assert.deepEqual(validateModuleDocs(m), []);
  assert.equal(inspectPlan(m)!.needsMigration, true);
});

test("ตาราง TP/REV/QA: ถูกรูปผ่าน · header ผิด/ไม่มีตาราง/id แถวผิด → module issue", () => {
  const ok = mk(ROWS, {
    "review/index.md": "## Findings\n\n| ID | Task | Severity | ไฟล์ |\n|---|---|---|---|\n| REV-001 | BE-001 | Minor | round-1.md |\n",
    "review/round-1.md": "r\n",
    "qa/index.md": "| Round | Tasks |\n|---|---|\n| 1 | BE-001 |\n\n| ID | Task | Severity | ไฟล์ |\n|---|---|---|---|\n| [QA-001](round-1.md) | BE-001 | Minor | round-1.md |\n",
    "qa/round-1.md": "r\n",
    "test-plan/index.md": "| TP | Phase | REQ/AC | ไฟล์ |\n|---|---|---|---|\n| TP-001 | 1 | AC-001 | tp-001.md |\n",
  });
  const bad = (i: { kind: string }) => i.kind === "plan-table-malformed";
  assert.deepEqual(validateModuleDocs(ok).filter(bad), []);

  writeFileSync(path.join(ok, "review", "index.md"), "| ID | Task | Sev | ไฟล์ |\n|---|---|---|---|\n| REV-001 | BE-001 | Minor | round-1.md |\n");
  writeFileSync(path.join(ok, "qa", "index.md"), "| Round | Tasks |\n|---|---|\n| 1 | BE-001 |\n");
  writeFileSync(path.join(ok, "test-plan", "index.md"), "| TP | Phase | REQ/AC | ไฟล์ |\n|---|---|---|---|\n| QA-009 | 1 | AC-001 | x.md |\n");
  const by = Object.fromEntries(validateModuleDocs(ok).filter(bad).map((i) => [i.location, [i.reason, i.level]]));
  assert.deepEqual(by["review/index.md"], ["header", "module"]);
  assert.deepEqual(by["qa/index.md"], ["table-missing", "module"]);
  assert.equal(by["test-plan/index.md"]![0], "row:3");
  assert.throws(() => assertModuleDocs(ok), /plan-table-malformed/);
});

test("two-way rule หมวด round ตาม DES-014:25 — ไฟล์ในคอลัมน์ ไฟล์ = การอ้างอิงที่ถูกต้อง (REV-021)", () => {
  const reviewIndex = (pads: number): string =>
    "## Rounds\n\n| Round | Tasks | Verdict | ไฟล์ |\n|---|---|---|---|\n| 1 | BE-001 | FAIL | round-1.md |\n\n" +
    "## Findings\n\n| ID | Task | Severity | ไฟล์ |\n|---|---|---|---|\n| REV-001 | BE-001 | Minor | round-1.md |\n\n" +
    "pad ".repeat(pads);
  const files = (pads: number): Record<string, string> => ({
    "review/index.md": reviewIndex(pads),
    "review/round-1.md": "x".repeat(3 * 1024), // budget(index) = 3072×0.75×1 + 2 KB = 4352 B
    "qa/index.md":
      "| Round | Tasks | Status | ไฟล์ |\n|---|---|---|---|\n| 1 | BE-001 | ✅ Verified | round-1.md |\n\n" +
      "| ID | Task | Severity | ไฟล์ |\n|---|---|---|---|\n| QA-001 | BE-001 | Minor | round-1.md |\n",
    "qa/round-1.md": "r\n",
    "test-plan/index.md": "| TP | Phase | REQ/AC | ไฟล์ |\n|---|---|---|---|\n| TP-001 | 1 | AC-001 | round-1.md |\n",
    "test-plan/round-1.md": "r\n",
  });
  // index ~2.6 KB > งบ 2 KB — ผ่านได้เพราะ budget นับ round-1.md (ถ้านับ 0 ไฟล์จะเหลืองบ 2 KB แล้ว flag เท็จ)
  const m = mk(ROWS, files(600));
  const no = (i: { kind: string }) => i.kind === "file-not-in-index" || i.kind === "index-over-budget";
  assert.deepEqual(validateModuleDocs(m).filter(no), []);
  assert.doesNotThrow(() => assertModuleDocs(m));
  // นับ referenced ถูกตัว: index เกินงบจริง → over-budget พร้อมข้อความระบุจำนวนไฟล์ที่นับได้ (1 ไฟล์)
  const m2 = mk(ROWS, files(1500));
  const over = validateModuleDocs(m2).filter((i) => i.kind === "index-over-budget" && i.file.endsWith(path.join("review", "index.md")));
  assert.equal(over.length, 1);
  assert.ok(over[0]!.message.includes("(1 ไฟล์)"), over[0]!.message);
});

test("two-way rule หมวด round — fail-closed คงเดิม: ไม่ถูกอ้างในคอลัมน์ ไฟล์ → issue · index ชี้ไฟล์ที่หาย → issue", () => {
  const m = mk(ROWS, {
    "review/index.md":
      "| ID | Task | Severity | ไฟล์ |\n|---|---|---|---|\n| REV-001 | BE-001 | Minor | round-1.md |\n| REV-002 | BE-002 | Minor | round-9.md |\n\n" +
      "## Change Log\n\n- 2026-10-06 — ดู round-2.md\n", // prose ไม่นับเป็นการอ้างอิง (เคส qa\round-3.md จริง — REV-024)
    "review/round-1.md": "r\n",
    "review/round-2.md": "orphan\n", // มีบนดิสก์แต่ไม่ปรากฏในคอลัมน์ ไฟล์ ของตารางใด
  });
  const issues = validateModuleDocs(m);
  assert.ok(issues.some((i) => i.kind === "file-not-in-index" && i.file.endsWith("round-2.md")));
  assert.ok(issues.some((i) => i.kind === "index-row-no-file" && i.message.includes("round-9")));
  assert.throws(() => assertModuleDocs(m), /file-not-in-index/);
});

test("รันกับ knowledge\\agent-team\\ จริง → ไม่มี issue ด้านรูป plan", { skip: !existsSync(REAL) }, () => {
  const issues = validateModuleDocs(REAL).filter((i) => /^(plan-|task-file-)/.test(i.kind));
  assert.deepEqual(issues.map((i) => `${i.kind} ${i.location} ${i.reason} ${i.taskIds}`), []);
});
