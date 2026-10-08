// BE-018 — plan v2 parser (DES-014): v2/legacy, Depends, Owner, anchor, task file
import test from "node:test";
import assert from "node:assert/strict";
import { parsePlanIndex, parseTaskFile, TASK_FILE_HEADINGS } from "../src/core/plan-parser.ts";

const HEAD = "| Task | Name | Owner | Phase | Depends | Status |\n|---|---|---|---|---|---|\n";
const PHASES = "## Phases\n\n| Phase | ชื่อ | Tasks | หมายเหตุ |\n|---|---|---|---|\n| 1 | a | BE-001 | — |\n| 2 | b | BE-002 | 🔒 security gate |\n\n";
const WAIT = "## Waiting on Human\n\n| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |\n|---|---|---|---|---|\n| 1 | q | a/b | owner | BE-002 |\n\n";
const plan = (rows: string, extra = PHASES + WAIT): string => `# P\n\n${extra}## Tasks\n\n${HEAD}${rows}\n## Sequencing Notes\n\nx\n`;
const kinds = (t: string) => parsePlanIndex(t).issues.map((i) => i.kind);

test("v2: 6 คอลัมน์ผ่าน — rows/phases/waiting ถูกอ่าน (AC-036)", () => {
  const p = parsePlanIndex(plan("| BE-001 | a | backend-engineer | 1 | — | pending |\n| BE-002 | b | setup | 2 | BE-001, BE-001 | verified |\n"));
  assert.equal(p.format, "v2");
  assert.equal(p.needsMigration, false);
  assert.deepEqual(p.issues, []);
  assert.deepEqual(p.rows.map((r) => [r.id, r.owner, r.phase, r.depends, r.status]), [
    ["BE-001", "backend-engineer", "1", [], "pending"],
    ["BE-002", "setup", "2", ["BE-001", "BE-001"], "verified"],
  ]);
  assert.deepEqual(p.phases.map((x) => [x.label, x.tasks, x.locked]), [["1", ["BE-001"], false], ["2", ["BE-002"], true]]);
  assert.deepEqual(p.waiting.map((w) => [w.n, w.blocks]), [["1", ["BE-002"]]]);
});

test("header v2 ผิด (มี Depends แต่ไม่ครบ/สลับ) → module issue + ไม่ใช้แถว", () => {
  const t = "## Tasks\n\n| Task | Name | Owner | Depends | Phase | Status |\n|---|---|---|---|---|---|\n| BE-001 | a | setup | — | 1 | pending |\n";
  const p = parsePlanIndex(t);
  assert.equal(p.format, "invalid");
  assert.deepEqual(p.rows, []);
  assert.equal(p.issues[0]!.kind, "plan-header-invalid");
  assert.equal(p.issues[0]!.level, "module");
  assert.equal(parsePlanIndex("# no tasks\n").issues[0]!.kind, "plan-section-missing");
});

test("legacy (ไม่มี Depends) → needsMigration, อ่าน Task+Status, ไม่มี issue (AC-074)", () => {
  const p = parsePlanIndex("## Tasks\n\n| Task | Name | Owner | Phase | Status |\n|---|---|---|---|---|\n| BE-001 | a | setup | 1 | verified |\n");
  assert.equal(p.format, "legacy");
  assert.equal(p.needsMigration, true);
  assert.deepEqual(p.issues, []);
  assert.deepEqual(p.rows.map((r) => [r.id, r.status, r.depends]), [["BE-001", "verified", []]]);
  // legacy ที่มี Owner reviewer ยังเป็น issue แถว (DES-001)
  const l2 = parsePlanIndex("## Tasks\n\n| Task | Owner | Status |\n|---|---|---|\n| X-1 | reviewer | pending |\n");
  assert.equal(l2.issues[0]!.reason, "owner:reviewer");
});

test("Status นอก 3 ค่า → issue แถว, status = null (ไม่ใช้ค่า)", () => {
  const p = parsePlanIndex(plan("| BE-001 | a | setup | 1 | — | done |\n| BE-002 | b | setup | 2 | — | pending |\n"));
  const i = p.issues.find((x) => x.kind === "plan-status-invalid")!;
  assert.deepEqual([i.level, i.taskIds], ["row", ["BE-001"]]);
  assert.equal(p.rows[0]!.status, null);
  assert.equal(p.rows[1]!.status, "pending");
});

test("Depends เสีย: id ไม่มี / รูปผิด / วงวน / อ้างตัวเอง → issue แถว (AC-039)", () => {
  const p = parsePlanIndex(plan(
    "| BE-001 | a | setup | 1 | BE-099 | pending |\n| BE-002 | b | setup | 2 | BE-003 | pending |\n| BE-003 | c | setup | 2 | BE-002 | pending |\n| BE-004 | d | setup | 2 | BE-004 | pending |\n| BE-005 | e | setup | 2 | BE-002 | pending |\n| BE-006 | f | setup | 2 | foo bar | pending |\n"));
  const by = (k: string) => p.issues.filter((i) => i.kind === k).flatMap((i) => i.taskIds).sort();
  assert.deepEqual(by("plan-depends-missing"), ["BE-001"]);
  assert.equal(p.issues.find((i) => i.kind === "plan-depends-missing")!.reason, "missing:BE-099");
  assert.deepEqual(by("plan-depends-cycle"), ["BE-002", "BE-003", "BE-004"]); // BE-005 พึ่งวงแต่ไม่อยู่ในวง
  assert.deepEqual(by("plan-depends-malformed"), ["BE-006"]);
  assert.ok(p.issues.every((i) => i.level === "row"));
});

test("Owner reviewer/security → issue แถว + task id (AC-079); role แปลกก็ issue", () => {
  const p = parsePlanIndex(plan("| BE-001 | a | reviewer | 1 | — | pending |\n| BE-002 | b | security | 2 | — | pending |\n| BE-003 | c | intern | 2 | — | pending |\n| BE-004 | d | devops | 2 | — | pending |\n"));
  const forb = p.issues.filter((i) => i.kind === "plan-owner-forbidden");
  assert.deepEqual(forb.map((i) => [i.reason, i.taskIds, i.level]), [["owner:reviewer", ["BE-001"], "row"], ["owner:security", ["BE-002"], "row"]]);
  assert.equal(p.issues.filter((i) => i.kind === "plan-owner-unknown").length, 1);
  assert.equal(p.format, "v2"); // issue แถวไม่ทำให้ module ล้ม
  assert.equal(p.rows.length, 4);
});

test("qa-engineer > 1 ใน phase → multi-anchor ระบุทั้งสอง; 1 ต่อ phase ผ่าน", () => {
  const p = parsePlanIndex(plan("| QA-001 | a | qa-engineer | 1 | — | pending |\n| QA-002 | b | qa-engineer | 1 | — | pending |\n| QA-003 | c | qa-engineer | 2 | — | pending |\n"));
  const m = p.issues.filter((i) => i.kind === "plan-multi-anchor");
  assert.equal(m.length, 1);
  assert.deepEqual([m[0]!.reason, m[0]!.taskIds, m[0]!.level], ["multi-anchor", ["QA-001", "QA-002"], "row"]);
  assert.deepEqual(kinds(plan("| QA-001 | a | qa-engineer | 1 | — | pending |\n| QA-003 | c | qa-engineer | 2 | — | pending |\n")), []);
});

test("แถวผิดรูป: จำนวนคอลัมน์ / id ซ้ำ / phase ไม่มี / id อ่านไม่ได้", () => {
  const p = parsePlanIndex(plan("| BE-001 | a | setup | 1 | — |\n| BE-002 | b | setup | 9 | — | pending |\n| BE-002 | b | setup | 2 | — | pending |\n| ??? | b | setup | 2 | — | pending |\n"));
  assert.deepEqual(p.issues.map((i) => [i.kind, i.level]).sort(), [
    ["plan-duplicate-id", "row"], ["plan-phase-unknown", "row"], ["plan-row-malformed", "row"], ["plan-row-unidentified", "module"],
  ]);
});

test("v2 ขาด ## Phases / ## Waiting on Human → module issue", () => {
  const p = parsePlanIndex(plan("| BE-001 | a | setup | 1 | — | pending |\n", ""));
  assert.deepEqual(p.issues.map((i) => [i.kind, i.level, i.location]), [["plan-section-missing", "module", "## Phases"], ["plan-section-missing", "module", "## Waiting on Human"]]);
});

const TASK = (extra = "", skip = ""): string =>
  "# BE-001 — x\n\n" + TASK_FILE_HEADINGS.filter((h) => h !== skip).map((h) =>
    `## ${h}\n\n${h === "References" ? "- REQ-011 (AC-036), DES-014, TP-002 · UX-003\n" : h === "Scope" ? "- Write paths: `src/a.ts`, `dir/**`\n- Security-sensitive: yes\n- Session group: g1\n" : "x\n"}`).join("\n") + extra;

test("task file ครบ 8 หัวข้อ: อ่าน References + บรรทัดเครื่องอ่าน, ไม่มี issue", () => {
  const t = parseTaskFile(TASK(), "BE-001");
  assert.deepEqual(t.issues, []);
  assert.deepEqual(t.references, ["REQ-011", "AC-036", "DES-014", "TP-002", "UX-003"]);
  assert.deepEqual([t.writePaths, t.securitySensitive, t.sessionGroup], [["src/a.ts", "dir/**"], true, "g1"]);
});

test("task file: ขาดหัวข้อ / มี Status: → issue แถว (AC-038) · Status ใน code fence/blockquote ไม่นับ", () => {
  const miss = parseTaskFile(TASK("", "Handoff"), "BE-001");
  assert.deepEqual(miss.issues.map((i) => [i.kind, i.reason, i.taskIds, i.level]), [["task-file-heading-missing", "missing:Handoff", ["BE-001"], "row"]]);
  const st = parseTaskFile(TASK("\nStatus: verified\n"), "BE-001");
  assert.deepEqual(st.issues.map((i) => i.kind), ["task-file-status-field"]);
  assert.deepEqual(parseTaskFile(TASK("\n```\nStatus: x\n```\n"), "BE-001").issues, []);
  assert.deepEqual(parseTaskFile(TASK("\n> Owner/Phase/Depends/Status → plan\n"), "BE-001").issues, []);
  const sec = parseTaskFile(TASK().replace("Security-sensitive: yes", "Security-sensitive: maybe"), "BE-001");
  assert.deepEqual(sec.issues.map((i) => i.kind), ["task-file-machine-line"]);
  assert.equal(sec.securitySensitive, null);
});
