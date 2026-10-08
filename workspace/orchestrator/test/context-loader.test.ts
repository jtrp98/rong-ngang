// BE-020 — context loader (DES-020): resolve ID → ไฟล์ ผ่าน index · context ต่อ kind/role · id ชน · fail-closed
// AC-046 (engineer packet มีเฉพาะที่อ้าง) · AC-047 (contextFiles บันทึกชนิด) · AC-048 (context-error)
// AC-033 (ไม่มี conversation) · AC-035 (อ่านอย่างเดียว) · AC-042 (BA/SA/PM scope เดียว)
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadContext, type ContextRefs, type Role, type SessionKind } from "../src/core/context-loader.ts";
import { TASK_FILE_HEADINGS } from "../src/core/plan-parser.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be020-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;

const TASK = (refs = "x\n"): string =>
  "# T\n\n" + TASK_FILE_HEADINGS.map((h) => `## ${h}\n\n${h === "References" ? refs : "x\n"}`).join("\n");

const PLAN_ROWS = [
  "| BE-020 | Minimum context loader | backend-engineer | 3 | BE-002, BE-018 | pending |",
  "| BE-006 | packet v2 | backend-engineer | 3 | BE-020 | pending |",
  "| FE-001 | dashboard | frontend-engineer | 5 | BE-015 | pending |",
  "| FE-002 | dashboard ต่อ task | frontend-engineer | 5 | FE-001 | pending |",
  "| QA-001 | e2e | qa-engineer | 6 | BE-011 | pending |",
  "| DEVOPS-001 | runbook | devops | 7 | QA-001 | pending |",
  "| UXUI-001 | ux artifact | uxui-designer | 5 | — | pending |",
].join("\n") + "\n";
const PLAN_INDEX =
  "# P\n\n## Phases\n\n| Phase | ชื่อ | Tasks | หมายเหตุ |\n|---|---|---|---|\n" +
  "| 3 | engine | BE-020, BE-006 | — |\n| 5 | web | FE-001, FE-002, UXUI-001 | — |\n| 6 | e2e | QA-001 | — |\n| 7 | solo | DEVOPS-001 | — |\n\n" +
  "## Waiting on Human\n\n| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |\n|---|---|---|---|---|\n\n" +
  "## Tasks\n\n| Task | Name | Owner | Phase | Depends | Status |\n|---|---|---|---|---|---|\n" + PLAN_ROWS;
const REQ_INDEX =
  "# R\n\n| REQ | ชื่อ | Status | AC ids | ไฟล์ |\n|---|---|---|---|---|\n" +
  "| REQ-014 | minimum context | confirmed | AC-046, AC-047, AC-048 | `req-014.md` |\n" +
  "| REQ-010 | artifact | confirmed | AC-033, AC-035 | `req-010.md` |\n" +
  "| REQ-012 | 1 task 1 session | confirmed | AC-041, AC-042 | `req-012.md` |\n";
const DES_INDEX =
  "# D\n\n| ID | ชื่อ | Traces | ไฟล์ |\n|---|---|---|---|\n" +
  "| DES-020 | context loader | REQ-014 | des-020.md |\n| DES-012 | packet | REQ-002 | des-012.md |\n" +
  "| DES-014 | split | REQ-005 | des-014.md |\n| DES-011 | knowledge | REQ-005 | des-011.md |\n";
const REVIEW_INDEX =
  "# Review\n\n## Rounds\n\n| Round | Tasks | Verdict | ไฟล์ |\n|---|---|---|---|\n| 1 | BE-020 | FAIL | round-1.md |\n\n" +
  "## Findings\n\n| ID | Task | Severity | ไฟล์ |\n|---|---|---|---|\n| REV-001 | BE-020 | Important | round-1.md |\n";
const QA_INDEX =
  "# QA\n\n## Rounds\n\n| Round | Tasks | Status | ไฟล์ |\n|---|---|---|---|\n| 1 | BE-020 | ✅ Verified | round-1.md |\n| 2 | BE-006 | ✅ Verified | round-2.md |\n\n" +
  "## Findings\n\n| ID | Task | Severity | ไฟล์ |\n|---|---|---|---|\n| QA-001 | BE-020 | Minor | round-1.md |\n";
const TP_INDEX =
  "# TP\n\n| TP | Phase | REQ/AC | ไฟล์ |\n|---|---|---|---|\n| TP-001 | 3 | AC-046 | round-1.md |\n| TP-002 | 6 | AC-001 | round-2.md |\n";

function mkModule(over: Record<string, string> = {}, omit: string[] = []): string {
  const files: Record<string, string> = {
    "plan/index.md": PLAN_INDEX,
    "plan/be-020.md": TASK("- REQ-014 (AC-046, AC-047), DES-020, DES-012\n"),
    "plan/be-006.md": TASK("- REQ-014, DES-012, TP-001\n"),
    "plan/fe-001.md": TASK("- QA-001, qa:QA-001, review:REV-001\n"),
    "plan/fe-002.md": TASK("- UX-001\n"),
    "plan/qa-001.md": TASK("- REQ-014\n"),
    "plan/devops-001.md": TASK("- DES-020\n"),
    "plan/uxui-001.md": TASK("- REQ-014, DES-012, UX-001\n"),
    "requirement/index.md": REQ_INDEX,
    "requirement/scope.md": "scope\n",
    "requirement/req-014.md": "r14\n",
    "requirement/req-010.md": "r10\n",
    "requirement/req-012.md": "r12\n",
    "design/index.md": DES_INDEX,
    "design/data-model.md": "dm\n",
    "design/des-020.md": "d20\n",
    "design/des-012.md": "d12\n",
    "design/des-014.md": "d14\n",
    "design/des-011.md": "d11\n",
    "review/index.md": REVIEW_INDEX,
    "review/round-1.md": "rev1\n",
    "qa/index.md": QA_INDEX,
    "qa/round-1.md": "qa1\n",
    "qa/round-2.md": "qa2\n",
    "test-plan/index.md": TP_INDEX,
    "test-plan/round-1.md": "tp1\n",
    "test-plan/round-2.md": "tp2\n",
    "open-questions/index.md": "# OQ\n\n| id | คำถาม | ผู้ตอบ | สถานะ | ไฟล์ |\n|---|---|---|---|---|\n",
    "uxui/UX-001-login.md": "ux\n",
    "security.md": "sec\n",
    "deploy.md": "dep\n",
    ...over,
  };
  const m = path.join(tmp, `m${++n}`);
  for (const [f, c] of Object.entries(files)) {
    if (omit.includes(f)) continue;
    const p = path.join(m, f);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, c);
  }
  return m;
}

const load = (m: string, kind: SessionKind, role: Role, taskIds: string[], refs: ContextRefs = {}) =>
  loadContext({ docsRoot: path.resolve(m, ".."), layout: "split", module: path.basename(m) }, kind, role, taskIds, refs);

test("execution BE: readSections มีเฉพาะ plan index + task file + REQ/DES ที่อ้าง (AC-046, AC-033)", () => {
  const r = load(mkModule(), "execution", "backend-engineer", ["BE-020"]);
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "plan\\index.md", "plan\\be-020.md",
    "requirement\\req-014.md", "design\\des-020.md", "design\\des-012.md",
  ]);
  // AC-047 — contextFiles บันทึกชนิดของ id ที่ resolve + บรรทัดแรก = ไฟล์แรกของ packet
  assert.deepEqual(r.contextFiles, [
    "plan\\index.md", "task:BE-020 -> plan\\be-020.md",
    "REQ-014 -> requirement\\req-014.md", "DES-020 -> design\\des-020.md", "DES-012 -> design\\des-012.md",
  ]);
  assert.deepEqual(r.resolved.map((e) => [e.id, e.kind, e.path]), [
    [null, "index", "plan\\index.md"],
    ["BE-020", "task", "plan\\be-020.md"],
    ["REQ-014", "req", "requirement\\req-014.md"],
    ["AC-046", "ac", "requirement\\req-014.md"],
    ["AC-047", "ac", "requirement\\req-014.md"],
    ["DES-020", "des", "design\\des-020.md"],
    ["DES-012", "des", "design\\des-012.md"],
  ]);
  assert.deepEqual(r.attachments, []);
  // ไม่มีไฟล์ที่ไม่ถูกอ้าง / round เก่า / conversation (AC-033, AC-046)
  const all = r.readSections.join("|");
  assert.ok(!/round-|qa\\|review\\|test-plan\\|conversation/i.test(all), all);
});

test("id หาไม่เจอ → context-error ระบุ id + index ที่หา + readSections ว่าง (AC-048 fail-closed)", () => {
  const m = mkModule({ "plan/be-020.md": TASK("- REQ-014, REQ-099, DES-099\n") });
  const r = load(m, "execution", "backend-engineer", ["BE-020"]);
  assert.ok(r.error);
  assert.deepEqual([r.error!.id, r.error!.index], ["REQ-099", "requirement\\index.md"]);
  assert.deepEqual(r.readSections, []);
  const d = load(mkModule(), "execution", "backend-engineer", ["BE-020"], { blockerReference: "DES-099" });
  assert.deepEqual([d.error!.id, d.error!.index], ["DES-099", "design\\index.md"]);
});

test("index ชี้ไฟล์ที่ไม่มี → context-error (AC-048) — ผ่าน field ที่มีชนิด และผ่าน TP ของ qa", () => {
  const m = mkModule({
    "qa/index.md": QA_INDEX.replace("| QA-001 | BE-020 | Minor | round-1.md |", "| QA-009 | BE-020 | Minor | round-9.md |"),
  });
  const r = load(m, "execution", "backend-engineer", ["BE-020"], {
    defectPacket: { taskId: "BE-020", source: "qa", roundFile: "qa\\round-9.md", findings: [{ id: "QA-009" }] },
  });
  assert.ok(r.error);
  assert.equal(r.error!.index, "qa\\index.md");
  assert.ok(r.error!.message.includes("round-9.md"), r.error!.message);
  assert.deepEqual(r.readSections, []);
  const noTp = load(mkModule({}, ["test-plan/round-1.md"]), "qa", "qa-engineer", ["BE-006"]);
  assert.ok(noTp.error);
  assert.deepEqual([noTp.error!.id, noTp.error!.index], ["TP-001", "test-plan\\index.md"]);
});

test("index parse ไม่ผ่าน → context-error: plan header เสีย · requirement index ไม่มีตาราง REQ", () => {
  const badPlan = mkModule({ "plan/index.md": "## Tasks\n\n| Task | Depends | Status |\n|---|---|---|\n" });
  const a = load(badPlan, "execution", "backend-engineer", ["BE-020"]);
  assert.ok(a.error && a.error!.message.includes("parse"));
  assert.equal(a.error!.index, "plan\\index.md");
  const badReq = mkModule({ "requirement/index.md": "# R\n\nไม่มีตาราง\n" });
  const b = load(badReq, "execution", "backend-engineer", ["BE-020"]);
  assert.ok(b.error && b.error!.message.includes("ตาราง REQ"));
  assert.equal(b.error!.index, "requirement\\index.md");
});

test("change: BA — req index + scope + REQ จาก blocker + oq index (AC-042 scope เดียว)", () => {
  const r = load(mkModule(), "change", "business-analyst", [], { blockerReference: "REQ-010 (AC-033)" });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "requirement\\index.md", "requirement\\scope.md", "open-questions\\index.md", "requirement\\req-010.md",
  ]);
});

test("change: SA — req index + scope + design index + data-model + REQ/DES จาก blocker", () => {
  const r = load(mkModule(), "change", "system-analyst", [], { blockerReference: "DES-014 (AC-046)" });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "requirement\\index.md", "requirement\\scope.md", "design\\index.md", "design\\data-model.md",
    "design\\des-014.md", "requirement\\req-014.md",
  ]);
});

test("change: PM — plan/design/req index + task ที่กระทบ + DES จาก changedDocs (AC-042)", () => {
  const r = load(mkModule(), "change", "project-manager", ["BE-020"], {
    changedDocs: ["design\\des-014.md", "requirement\\req-014.md"],
    blockerReference: "BE-006",
  });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "plan\\index.md", "design\\index.md", "requirement\\index.md", "plan\\be-020.md", "plan\\be-006.md", "design\\des-014.md",
  ]);
});

test("test-planner — plan index + test-plan index + task ใน phase + REQ/DES ที่อ้าง", () => {
  const r = load(mkModule(), "change", "test-planner", ["BE-020"]);
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "plan\\index.md", "test-plan\\index.md", "plan\\be-020.md",
    "requirement\\req-014.md", "design\\des-020.md", "design\\des-012.md",
  ]);
});

test("review — task file ใน wave + REQ/DES + review index (ไม่มี round เก่า) + reviewInput เป็นไฟล์แนบ", () => {
  const r = load(mkModule(), "review", "reviewer", ["BE-020", "BE-006"], { reviewInput: true });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "review\\index.md", "plan\\be-020.md", "plan\\be-006.md",
    "requirement\\req-014.md", "design\\des-020.md", "design\\des-012.md",
  ]);
  assert.ok(!r.readSections.some((p) => /round-\d+\.md$/.test(p)));
  assert.deepEqual(r.attachments, ["attachment:reviewInput"]);
  assert.deepEqual(r.resolved.filter((e) => e.kind === "tp"), []); // TP ที่ BE-006 อ้าง ไม่อยู่แถว review
});

test("qa — task file + REQ/TP ที่อ้าง + data-model + qa index + REV จาก review รอบล่าสุด (ไม่มี DES/index อื่น)", () => {
  const r = load(mkModule(), "qa", "qa-engineer", ["BE-006"], { reviewRefs: ["REV-001"] });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "design\\data-model.md", "qa\\index.md", "plan\\be-006.md",
    "requirement\\req-014.md", "test-plan\\round-1.md", "review\\round-1.md",
  ]);
  assert.ok(!r.readSections.includes("design\\des-012.md")); // DES ที่ task อ้าง ไม่อยู่แถว qa
  assert.ok(!r.readSections.includes("plan\\index.md") && !r.readSections.includes("design\\index.md"));
  assert.deepEqual(r.resolved.find((e) => e.id === "TP-001")?.kind, "tp");
});

test("feature-qa — plan index + task ใน phase + TP ของ phase + REQ + qa index", () => {
  const r = load(mkModule(), "feature-qa", "qa-engineer", ["BE-020"], { planPhase: "3" });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "plan\\index.md", "qa\\index.md", "plan\\be-020.md",
    "requirement\\req-014.md", "test-plan\\round-1.md",
  ]);
  const p6 = load(mkModule(), "feature-qa", "qa-engineer", ["BE-020"], { planPhase: "6" });
  assert.ok(!p6.readSections.includes("test-plan\\round-1.md")); // TP-002 phase 6 — BE-020 ไม่อ้าง
  assert.ok(!p6.readSections.some((p) => p.startsWith("design\\")));
});

test("security — security.md + DES ที่ task ใน phase อ้าง (ไม่มี task file) + รายชื่อไฟล์เปลี่ยนเป็นไฟล์แนบ", () => {
  const r = load(mkModule(), "security", "security", ["BE-020"], { phaseChangedFiles: ["src\\core\\a.ts"] });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, ["security.md", "design\\des-020.md", "design\\des-012.md"]);
  assert.ok(!r.readSections.includes("plan\\be-020.md"));
  assert.deepEqual(r.attachments, ["attachment:changedFiles"]);
});

test("devops — stage (ไม่มี task): deploy + plan index + qa round ล่าสุด + security · แถว task = execution", () => {
  const stage = load(mkModule(), "execution", "devops", []);
  assert.equal(stage.error, null);
  assert.deepEqual(stage.readSections, ["deploy.md", "plan\\index.md", "qa\\round-2.md", "security.md"]);
  const task = load(mkModule(), "execution", "devops", ["DEVOPS-001"]);
  assert.equal(task.error, null);
  assert.deepEqual(task.readSections, ["plan\\index.md", "plan\\devops-001.md", "design\\des-020.md"]);
});

test("fix session — defect + task + REQ/DES เท่านั้น · findings[].id/reproduce.tp resolve ตามชนิด field (AC-047)", () => {
  const r = load(mkModule(), "execution", "backend-engineer", ["BE-020"], {
    defectPacket: { taskId: "BE-020", source: "qa", roundFile: "qa\\round-1.md", findings: [{ id: "QA-001", reference: "DES-012", reproduce: { tp: "TP-001" } }] },
  });
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "plan\\index.md", "plan\\be-020.md",
    "requirement\\req-014.md", "design\\des-020.md", "design\\des-012.md",
    "qa\\round-1.md", "test-plan\\round-1.md",
  ]);
  assert.deepEqual(r.attachments, ["attachment:defectPacket"]);
  // QA-001 resolve เป็น finding (round file) ไม่ใช่ task แม้ plan มี task QA-001 — ไม่มี review/qa index เพิ่ม
  assert.ok(!r.readSections.includes("plan\\qa-001.md"));
  assert.ok(!r.readSections.includes("review\\index.md") && !r.readSections.includes("qa\\index.md"));
  assert.deepEqual(r.resolved.find((e) => e.id === "QA-001")?.kind, "qa");
});

test("id ชน (task QA-001 vs finding QA-001) — References QA-001 → task · qa:QA-001/review:REV-001 → finding · ไม่เกิด context-error", () => {
  const r = load(mkModule(), "execution", "frontend-engineer", ["FE-001"]);
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "plan\\index.md", "plan\\fe-001.md",
    "qa\\round-1.md", "review\\round-1.md", "plan\\qa-001.md",
  ]);
  // AC-047 — contextFiles บันทึกชนิดที่ resolve ของแต่ละ id
  assert.deepEqual(r.contextFiles, [
    "plan\\index.md", "task:FE-001 -> plan\\fe-001.md",
    "qa:QA-001 -> qa\\round-1.md", "review:REV-001 -> review\\round-1.md", "task:QA-001 -> plan\\qa-001.md",
  ]);
});

test("FE ได้ UX artifact เมื่อ task อ้าง UX-NNN · BE ไม่ได้ · UX ซ้ำหลายไฟล์ → context-error", () => {
  const fe = load(mkModule(), "execution", "frontend-engineer", ["FE-002"]);
  assert.equal(fe.error, null);
  assert.ok(fe.readSections.includes("uxui\\UX-001-login.md"));
  assert.deepEqual(fe.resolved.find((e) => e.id === "UX-001")?.kind, "ux");
  const be = load(mkModule({ "plan/be-020.md": TASK("- REQ-014, UX-001\n") }), "execution", "backend-engineer", ["BE-020"]);
  assert.ok(!be.readSections.some((p) => p.startsWith("uxui\\")));
  const dup = load(mkModule({ "uxui/UX-001-other.md": "ux2\n" }), "execution", "frontend-engineer", ["FE-002"]);
  assert.ok(dup.error && dup.error!.message.includes("หลายไฟล์"));
  const none = load(mkModule({}, ["uxui/UX-001-login.md"]), "execution", "frontend-engineer", ["FE-002"]);
  assert.ok(none.error && none.error!.id === "UX-001");
  assert.equal(none.error!.index, "uxui\\");
  assert.deepEqual(none.readSections, []);
});

test("execution: uxui (REV-036) — req index + scope + design index + task file + REQ/DES ที่อ้าง + UX artifact เมื่อแก้ของเดิม", () => {
  const r = load(mkModule(), "execution", "uxui-designer", ["UXUI-001"]);
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "requirement\\index.md", "requirement\\scope.md", "design\\index.md", "plan\\uxui-001.md",
    "requirement\\req-014.md", "design\\des-012.md", "uxui\\UX-001-login.md",
  ]);
  assert.deepEqual(r.contextFiles, [
    "requirement\\index.md", "requirement\\scope.md", "design\\index.md", "task:UXUI-001 -> plan\\uxui-001.md",
    "REQ-014 -> requirement\\req-014.md", "DES-012 -> design\\des-012.md", "UX-001 -> uxui\\UX-001-login.md",
  ]);
  assert.deepEqual(r.resolved.find((e) => e.id === "UX-001")?.kind, "ux");
  assert.ok(!r.readSections.includes("plan\\index.md")); // ตาราง DES-020 แถว uxui ไม่มี plan index — task id ยังตรวจกับ plan แต่ไม่แนบไฟล์ index
});

test("uxui — task ไม่อ้าง UX → ไม่ resolve · artifact ใหม่ยังไม่มีไฟล์ → ไม่ resolve ไม่ error (0-hit — driver ส่ง path ใน brief)", () => {
  const noUx = load(mkModule(), "execution", "uxui-designer", ["BE-006"]); // refs REQ/DES/TP — ไม่มี UX
  assert.equal(noUx.error, null);
  assert.deepEqual(noUx.readSections, [
    "requirement\\index.md", "requirement\\scope.md", "design\\index.md", "plan\\be-006.md",
    "requirement\\req-014.md", "design\\des-012.md",
  ]);
  assert.ok(!noUx.readSections.includes("test-plan\\round-1.md")); // TP ไม่อยู่แถว uxui
  const fresh = load(mkModule({ "plan/uxui-001.md": TASK("- UX-002\n") }), "execution", "uxui-designer", ["UXUI-001"]);
  assert.equal(fresh.error, null);
  assert.deepEqual(fresh.readSections, [
    "requirement\\index.md", "requirement\\scope.md", "design\\index.md", "plan\\uxui-001.md",
  ]);
  // fail-closed เดิมคงอยู่: >1 ไฟล์ = resolve ซ้ำไม่ชัด · id อื่นหาไม่เจอ = context-error
  const dup = load(mkModule({ "uxui/UX-001-other.md": "u2\n" }), "execution", "uxui-designer", ["UXUI-001"]);
  assert.ok(dup.error && dup.error!.message.includes("หลายไฟล์"));
  const bad = load(mkModule({ "plan/uxui-001.md": TASK("- REQ-099, UX-001\n") }), "execution", "uxui-designer", ["UXUI-001"]);
  assert.deepEqual([bad.error!.id, bad.error!.index], ["REQ-099", "requirement\\index.md"]);
});

test("uxui — attachments เหมือนแถว execution: defect packet + priorSession", () => {
  const r = load(mkModule(), "execution", "uxui-designer", ["UXUI-001"], {
    defectPacket: { taskId: "UXUI-001", source: "qa", roundFile: "qa\\round-1.md", findings: [{ id: "QA-001" }] },
    priorSession: { sessionId: "s1", touchedFiles: ["uxui\\UX-001-login.md"] },
  });
  assert.equal(r.error, null);
  assert.deepEqual(r.attachments, ["attachment:defectPacket", "attachment:priorSession"]);
  assert.ok(r.readSections.includes("qa\\round-1.md")); // findings[].id resolve ตามชนิด field (ข้อ 1) แม้ id ชน task QA-001
  assert.ok(!r.readSections.includes("plan\\qa-001.md"));
});

test("taskIds ไม่อยู่ใน plan / kind-role ไม่ตรงตาราง → context-error · record-only = ว่าง", () => {
  const m = mkModule();
  const t = load(m, "execution", "backend-engineer", ["ZZ-999"]);
  assert.deepEqual([t.error!.id, t.error!.index], ["ZZ-999", "plan\\index.md"]);
  const c = load(m, "qa", "reviewer", ["BE-020"]);
  assert.ok(c.error && c.error!.message.includes("ไม่ตรงตาราง"));
  const ro = load(m, "record-only", "reviewer", []);
  assert.deepEqual([ro.readSections, ro.contextFiles, ro.error], [[], [], null]);
});

test("AC ปรากฏในหลาย REQ → context-error (resolve ซ้ำไม่ชัด)", () => {
  const m = mkModule({
    "requirement/index.md": REQ_INDEX.replace(
      "| REQ-012 | 1 task 1 session | confirmed | AC-041, AC-042 | `req-012.md` |",
      "| REQ-012 | 1 task 1 session | confirmed | AC-041, AC-042, AC-046 | `req-012.md` |",
    ),
  });
  const r = load(m, "execution", "backend-engineer", ["BE-020"]);
  assert.ok(r.error);
  assert.deepEqual([r.error!.id, r.error!.index], ["AC-046", "requirement\\index.md"]);
  assert.deepEqual(r.readSections, []);
});

test("AC-035 — อ่านอย่างเดียว: รันซ้ำ context เท่าเดิม และไฟล์ module ไม่เปลี่ยน", () => {
  const m = mkModule();
  const snapshot = (): string[] => {
    const out: string[] = [];
    const walk = (d: string, pre: string): void => {
      for (const f of readdirSync(d, { withFileTypes: true }).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))) {
        const p = path.join(d, f.name);
        const rp = pre ? `${pre}\\${f.name}` : f.name;
        if (f.isDirectory()) walk(p, rp);
        else out.push(`${rp}:${statSync(p).size}:${readFileSync(p).length}`);
      }
    };
    walk(m, "");
    return out;
  };
  const before = snapshot();
  const a = load(m, "execution", "backend-engineer", ["BE-020"]);
  const b = load(m, "execution", "backend-engineer", ["BE-020"]);
  assert.deepEqual(a, b);
  assert.deepEqual(snapshot(), before);
});

const REAL = path.resolve(import.meta.dirname, "..", "..", "..", "knowledge", "agent-team");
test("รันกับ module จริง knowledge\\agent-team — context ของ BE-020 เอง (AC-046)", { skip: !existsSync(REAL) }, () => {
  const r = loadContext({ docsRoot: path.resolve(REAL, ".."), layout: "split", module: "agent-team" }, "execution", "backend-engineer", ["BE-020"]);
  assert.equal(r.error, null);
  assert.deepEqual(r.readSections, [
    "plan\\index.md", "plan\\be-020.md",
    "requirement\\req-014.md", "requirement\\req-010.md", "requirement\\req-012.md",
    "design\\des-020.md", "design\\des-012.md", "design\\des-014.md",
  ]);
  assert.deepEqual(r.contextFiles, [
    "plan\\index.md", "task:BE-020 -> plan\\be-020.md",
    "REQ-014 -> requirement\\req-014.md", "REQ-010 -> requirement\\req-010.md", "REQ-012 -> requirement\\req-012.md",
    "DES-020 -> design\\des-020.md", "DES-012 -> design\\des-012.md", "DES-014 -> design\\des-014.md",
  ]);
});
