// BE-009 — gate evaluator + GateRecord ต่อ scope (DES-008): trigger handoff/structural/doc · AC-013/014/015/016 · AC-071/072/078
// append-only gateLog (เขียนผ่าน state-store) · owner จาก gates.yaml (AC-015) · scope task/phase/module (AC-072)
// record-only ตามเจ้าของเอกสาร (OQ-D3) · test ใช้ fixture dir (os.tmpdir) เสมอ — ห้ามเขียน state จริงระหว่าง test
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { KNOWN_GATES, type GatesConfig } from "../src/core/config.ts";
import { parsePlanIndex } from "../src/core/plan-parser.ts";
import { route, type RouterConfig, type RouterTask } from "../src/core/router.ts";
import {
  GateError,
  answerGate,
  deployRealProposal,
  dispatchBlocker,
  docGateProposals,
  gateOwner,
  gateRecordRole,
  handoffGateProposals,
  openGate,
  ownerMismatchWarning,
  releaseCutProposal,
  routerGateProposals,
  shouldWaitOnHuman,
  uxSignoffProposal,
  type GateProposal,
} from "../src/core/gates.ts";
import {
  createRun,
  loadRun,
  reconcileRun,
  updateRun,
  type GateId,
  type HandoffV2,
  type RunJson,
  type TaskRuntime,
} from "../src/core/state-store.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be009-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
const home = (): string => {
  const h = path.join(tmp, `h${++n}`);
  mkdirSync(h, { recursive: true });
  return h;
};

const SNAP = { routing: "sha256:aaa", tiers: "sha256:bbb", camps: "sha256:ccc", gates: "sha256:ddd" };
const SCHED: RouterConfig = {
  maxParallelSessions: 3, fixRoundLimit: 2, crashRestartLimit: 1,
  reviewWave: { maxTasks: 4, maxDiffLines: 800 }, largeTask: { diffLines: 400, files: 10 },
};
const mkRun = (h: string): RunJson =>
  createRun(h, { module: "agent-team", mode: "new-work", planFormat: "v2", scheduler: SCHED, newWorkText: null, configSnapshot: SNAP });

const mkTask = (over: Partial<TaskRuntime> & { taskId: string }): TaskRuntime => ({
  owner: "backend-engineer", planPhase: "1", group: null, step: "runnable", hold: null,
  attempt: 0, fixRounds: 0, crashRestarts: 0, currentSessionId: null, sessionIds: [], touchedFiles: [],
  lastVerdict: null, defectPacket: null, humanActions: [], ...over,
});
const mkRouterTask = (over: Partial<RouterTask> & { taskId: string }): RouterTask => ({
  owner: "backend-engineer", planPhase: "1", group: null, step: "runnable", hold: null,
  attempt: 0, fixRounds: 0, crashRestarts: 0, currentSessionId: null, sessionIds: [], touchedFiles: [],
  lastVerdict: null, defectPacket: null, humanActions: [], depends: [], securitySensitive: false, ...over,
});
const mkHandoff = (over: Partial<HandoffV2> = {}): HandoffV2 => ({
  role: "backend-engineer", module: "agent-team", sessionId: "s-1-abcd", outputState: "DONE",
  result: "x", changedDocs: [], changedCode: [], evidence: [], nextRole: "none",
  questionsForHuman: [], blocker: null, impactedTasks: null, decision: null,
  review: null, qa: null, featureQa: null, security: null, securityGate: null, ...over,
});

// gates.yaml รูปจริงตาม data-model — fixture แยกจากไฟล์ config เพื่อแก้ owner ทดสอบ AC-015 (config จริงห้ามแตะ)
const mkGates = (over: Partial<GatesConfig> = {}): GatesConfig => ({
  owner_default: { name: "jtrp98" },
  gates: {
    "business-choice": { staGate: 1, trigger: "handoff", owner: "owner_default" },
    "schema-breaking": { staGate: 2, trigger: "handoff", owner: "owner_default" },
    "ux-signoff": { staGate: 3, trigger: "structural", owner: "owner_default" },
    "qa-critical": { staGate: 4, trigger: "handoff", owner: "owner_default" },
    "security-finding": { staGate: 5, trigger: "handoff", owner: "owner_default" },
    "deploy-real": { staGate: 6, trigger: "structural", owner: "owner_default" },
    "release-cut": { staGate: 7, trigger: "structural", owner: "owner_default" },
  },
  channels: [],
  ...over,
});

// dependents แบบทอดจากแผนที่ Depends (driver join จาก plan-parser — BE-011) — รูปเดียวกับ dependentsOf ใน router
const dependentsOf = (map: Record<string, string[]>) => (roots: readonly string[]): string[] => {
  const rev = new Map<string, string[]>();
  for (const [id, deps] of Object.entries(map)) for (const d of deps) rev.set(d, [...(rev.get(d) ?? []), id]);
  const out = new Set<string>();
  const q = [...roots];
  while (q.length) {
    const x = q.shift()!;
    for (const dep of rev.get(x) ?? []) if (!out.has(dep)) { out.add(dep); q.push(dep); }
  }
  return [...out].sort();
};

const proposal = (over: Partial<GateProposal> = {}): GateProposal => ({
  gateId: "business-choice", sessionId: "s-1-abcd", scope: "task", taskIds: ["BE-001"], phase: "1", question: "ต้องตัดสินอะไร", ...over,
});

// --- trigger (a) handoff — AC-078 + AC-014 ---
test("handoff trigger — SA gate none: แตะ schema/contract = gate 2, ไม่แตะ = gate 1 · non-SA = gate 1 · ไม่มี gate นอก 7 (AC-078)", () => {
  const q = (flag: boolean | null, gate: "none" | "ux-signoff" = "none", question = "จะใช้ contract แบบไหน") =>
    [{ gate, question, owner: "jtrp98", touchesSchemaOrContract: flag }];
  // SA + แตะ schema/contract → gate 2 · change chain ก่อนมี plan (taskIds ว่าง) → scope module (DES-008)
  const p1 = handoffGateProposals(
    mkHandoff({ role: "system-analyst", outputState: "NEEDS_HUMAN", questionsForHuman: q(true) }),
    { taskIds: [], phase: null },
  );
  assert.deepEqual(p1, [{ gateId: "schema-breaking", sessionId: "s-1-abcd", scope: "module", taskIds: [], phase: null, question: "จะใช้ contract แบบไหน" }]);
  // SA ไม่แตะ → gate 1
  assert.equal(
    handoffGateProposals(mkHandoff({ role: "system-analyst", outputState: "NEEDS_HUMAN", questionsForHuman: q(false) }), { taskIds: [], phase: null })[0]!.gateId,
    "business-choice",
  );
  // non-SA gate none → gate 1 เสมอ (DES-008 fallback) แม้ touchesSchemaOrContract = true
  assert.equal(
    handoffGateProposals(mkHandoff({ outputState: "NEEDS_HUMAN", questionsForHuman: q(true) }), { taskIds: ["BE-001"], phase: "1" })[0]!.gateId,
    "business-choice",
  );
  // gate id ระบุตรง + มี task → scope task · คำถามถ้อยคำตรงตัวจาก agent (AC-014)
  const p2 = handoffGateProposals(
    mkHandoff({ outputState: "NEEDS_HUMAN", questionsForHuman: q(null, "ux-signoff") }),
    { taskIds: ["BE-001"], phase: "1" },
  );
  assert.deepEqual(p2, [{ gateId: "ux-signoff", sessionId: "s-1-abcd", scope: "task", taskIds: ["BE-001"], phase: "1", question: "จะใช้ contract แบบไหน" }]);
  // ไม่มี gate ที่ 8 — ทุก proposal อยู่ใน 7 จุดเสมอ
  for (const p of [...p1, ...p2]) assert.ok((KNOWN_GATES as readonly string[]).includes(p.gateId));
  // trigger เฉพาะ NEEDS_HUMAN — state อื่นไม่เปิด gate แม้แนบคำถามมา
  assert.deepEqual(handoffGateProposals(mkHandoff({ outputState: "DONE", questionsForHuman: q(true) }), { taskIds: [], phase: null }), []);
});

// --- trigger (a) ผ่าน router — AC-071 + AC-014 + AC-015 ---
test("gate จาก router Decision — R5: gate 4 ไม่มี dispatch อัตโนมัติ (AC-071) · openGate บันทึก gate/owner/คำถามตรงตัว (AC-014)", () => {
  const tasks: Record<string, RouterTask> = {
    "BE-001": mkRouterTask({ taskId: "BE-001", step: "awaiting-qa", fixRounds: 2 }),
    "BE-002": mkRouterTask({ taskId: "BE-002" }),
  };
  const h = mkHandoff({
    role: "qa-engineer", outputState: "FAIL",
    qa: { roundFile: "qa/r1.md", checks: [], perTask: [{ task: "BE-001", verdict: "blocked" }], defects: [] },
  });
  const d = route({ kind: "handoff", sessionId: "s-9-abcd", taskIds: ["BE-001"], sessionKind: "qa", handoff: h }, tasks, SCHED);
  assert.equal(d.ruleId, "R5");
  assert.deepEqual(d.dispatch, []); // AC-071 — fail ครบ fixRoundLimit → gate 4 รอคน ไม่มี dispatch อัตโนมัติ
  assert.equal(d.gates[0]!.gateId, "qa-critical");

  const run = mkRun(home());
  run.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa", fixRounds: 2 }), "BE-002": mkTask({ taskId: "BE-002" }) };
  const proposals = routerGateProposals(d, "s-9-abcd");
  assert.equal(proposals.length, 1);
  const { run: run2, record, appended } = openGate(run, proposals[0]!, mkGates());
  assert.equal(appended, true);
  assert.equal(record.gateId, "qa-critical");
  assert.deepEqual(record.owner, { name: "jtrp98" }); // owner จาก gates.yaml (AC-015) — ไม่ใช่ค่าที่ agent เสนอ
  assert.equal(record.question, d.gates[0]!.question); // คำถามตรงตัวจาก router (AC-014)
  assert.equal(record.sessionId, "s-9-abcd");
  assert.equal(record.status, "open");
  assert.deepEqual(record.taskIds, ["BE-001"]);
  assert.deepEqual(
    [run2.tasks["BE-001"]!.step, run2.tasks["BE-001"]!.hold!.reason, run2.tasks["BE-001"]!.hold!.ref, run2.tasks["BE-001"]!.hold!.prevStep],
    ["held", "gate", "qa-critical", "awaiting-qa"],
  );
  assert.equal(run2.tasks["BE-002"]!.step, "runnable"); // task นอก scope เดินต่อ (AC-072)
  assert.equal(dispatchBlocker(run2, ["BE-001"])?.gateId, "qa-critical");
  assert.equal(dispatchBlocker(run2, ["BE-002"]), null);
});

// --- scope — AC-072 + AC-013 ---
test("AC-072/AC-013 — scope task: task + dependents ไม่ dispatch, task อื่นเดินต่อ · scope module: บล็อกทุก dispatch รวม taskIds ว่าง · scope phase", () => {
  // scope task — dependents ตาม Depends (DES-008)
  const run = mkRun(home());
  run.tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution" }),
    "FE-001": mkTask({ taskId: "FE-001", planPhase: "2", owner: "frontend-engineer" }),
    "BE-002": mkTask({ taskId: "BE-002", planPhase: "2" }),
    "BE-003": mkTask({ taskId: "BE-003", step: "verified" }),
  };
  const { run: run2, record } = openGate(run, proposal(), mkGates(), { dependentsOf: dependentsOf({ "FE-001": ["BE-001"] }) });
  assert.deepEqual([run2.tasks["BE-001"]!.step, run2.tasks["BE-001"]!.hold!.ref], ["held", "business-choice"]);
  assert.deepEqual([run2.tasks["FE-001"]!.step, run2.tasks["FE-001"]!.hold!.ref], ["held", "business-choice"]); // dependent รอตาม scope
  assert.equal(run2.tasks["BE-002"]!.step, "runnable"); // task อื่นเดินต่อ (AC-072)
  assert.equal(run2.tasks["BE-003"]!.step, "verified"); // verified ไม่ hold ย้อน (เอกสารชนะ)
  assert.equal(dispatchBlocker(run2, ["BE-002"]), null);
  assert.equal(dispatchBlocker(run2, ["BE-001"])?.gateId, "business-choice");
  assert.equal(dispatchBlocker(run2, ["FE-001"])?.gateId, "business-choice");

  // scope module — ไม่มี dispatch ใหม่จนตอบ (AC-013) รวม dispatch ที่ไม่มี taskIds
  const runM = mkRun(home());
  runM.tasks = { "BE-001": mkTask({ taskId: "BE-001" }), "BE-003": mkTask({ taskId: "BE-003", step: "verified" }) };
  const { run: runM2 } = openGate(runM, releaseCutProposal(), mkGates());
  assert.equal(runM2.tasks["BE-001"]!.step, "held");
  assert.equal(runM2.tasks["BE-003"]!.step, "verified");
  assert.equal(dispatchBlocker(runM2, [])?.gateId, "release-cut");
  assert.equal(dispatchBlocker(runM2, ["BE-001"])?.scope, "module");

  // scope phase — เฉพาะ task ใน phase นั้น
  const runP = mkRun(home());
  runP.tasks = { "BE-001": mkTask({ taskId: "BE-001", planPhase: "1" }), "BE-004": mkTask({ taskId: "BE-004", planPhase: "2" }) };
  const { run: runP2 } = openGate(runP, deployRealProposal("2"), mkGates());
  assert.equal(runP2.tasks["BE-004"]!.step, "held");
  assert.equal(runP2.tasks["BE-001"]!.step, "runnable");
  assert.equal(dispatchBlocker(runP2, ["BE-001"]), null);
  assert.equal(dispatchBlocker(runP2, ["BE-004"])?.gateId, "deploy-real");
});

// --- AC-015 ---
test("AC-015 — owner จาก gates.yaml: แก้ owner_default.name มีผล · owner ระบุต่อ gate มีผล · GateRecord ใช้ค่า config ปัจจุบัน", () => {
  assert.equal(gateOwner(mkGates(), "business-choice"), "jtrp98");
  assert.equal(gateOwner(mkGates({ owner_default: { name: "jabja" } }), "security-finding"), "jabja");
  const g3 = mkGates();
  g3.gates = { ...g3.gates, "release-cut": { staGate: 7, trigger: "structural", owner: "คนตัดสินเอง" } };
  assert.equal(gateOwner(g3, "release-cut"), "คนตัดสินเอง");
  const { record } = openGate(mkRun(home()), releaseCutProposal(), g3);
  assert.deepEqual(record.owner, { name: "คนตัดสินเอง" });
});

// --- AC-016 ---
test("AC-016 — append-only: ตอบแล้ว = lifecycle ของแถวเดียวกัน open → answered · เนื้อหา audit (คำถาม/owner/scope) ไม่ถูกแก้ · answeredBy/answer ตามที่พิมพ์", () => {
  const run = mkRun(home());
  run.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution" }) };
  const { run: run2, record: openRec } = openGate(run, proposal({ question: "ตัดสินอะไร" }), mkGates());
  const before = structuredClone(openRec);
  const { run: run3, record: ans } = answerGate(
    run2, "business-choice",
    { answeredBy: "  jabja  ", answer: "ไป release ถัดไป", note: "ตามที่ปรึกษา" },
    { now: new Date("2026-10-06T10:00:00.000Z") },
  );
  assert.equal(run3.gateLog.length, 1); // gateLog ไม่ลบ/ไม่เพิ่มแถว — ตอบบนแถวเดิม (lifecycle open → answered)
  assert.equal(ans.status, "answered");
  assert.equal(ans.answeredBy, "  jabja  "); // ตามที่พิมพ์ — ระบบไม่แต่งชื่อ (AC-016)
  assert.equal(ans.answer, "ไป release ถัดไป");
  assert.equal(ans.answeredAt, "2026-10-06T10:00:00.000Z"); // นาฬิกาเครื่อง (inject ได้เพื่อ deterministic)
  assert.equal(ans.note, "ตามที่ปรึกษา");
  // เนื้อหา audit ย้อนหลังไม่ถูกแก้ — คำถาม/owner/scope/taskIds/phase/sessionId คงจากตอนเปิด (AC-014 + append-only)
  assert.deepEqual(
    [ans.gateId, ans.question, ans.owner, ans.scope, ans.taskIds, ans.phase, ans.sessionId],
    [before.gateId, before.question, before.owner, before.scope, before.taskIds, before.phase, before.sessionId],
  );
  assert.equal(ans.question, "ตัดสินอะไร"); // คำถามถ้อยคำตรงตัว (AC-014)
  assert.deepEqual(ans.owner, { name: "jtrp98" });
  assert.equal(run3 === run2, false); // pure — run ต้นฉบับไม่ถูกแตะ
  assert.equal(run2.gateLog[0]!.status, "open");
  assert.deepEqual([run3.tasks["BE-001"]!.step, run3.tasks["BE-001"]!.hold], ["execution", null]); // ปลดกลับ step เดิม
  // คำตอบว่าง → ไม่รับ · ผู้ตอบไม่พิมพ์ชื่อ → ไม่รับ · ตอบ gate ที่ไม่เปิด → ปฏิเสธ
  assert.throws(() => answerGate(run2, "business-choice", { answeredBy: "x", answer: "   " }), (e: unknown) => e instanceof GateError && e.kind === "empty-answer");
  assert.throws(() => answerGate(run2, "business-choice", { answeredBy: "", answer: "x" }), (e: unknown) => e instanceof GateError && e.kind === "empty-answeredBy");
  assert.throws(() => answerGate(run3, "business-choice", { answeredBy: "x", answer: "x" }), (e: unknown) => e instanceof GateError && e.kind === "not-open");
  assert.throws(() => answerGate(run2, "gate-8" as GateId, { answeredBy: "x", answer: "x" }), (e: unknown) => e instanceof GateError && e.kind === "unknown-gate");
  // owner mismatch → UI เตือนแต่ยังบันทึกได้ (DES-008 §Permissions) — เทียบแบบ trim
  assert.match(ownerMismatchWarning(ans, "คนอื่น") ?? "", /เจ้าของ/);
  assert.equal(ownerMismatchWarning(ans, "jtrp98"), null);
});

// --- ตอบ gate ปลดเฉพาะใน scope + gate 4 ค้างจน retry (R22) ---
test("ตอบ gate ปลดเฉพาะ task ที่ถูก hold ด้วย gate นั้น (ไม่ทั้ง run — AC-072) · gate 4 ค้างจน retry/replan (R22)", () => {
  const g = mkGates();
  const run = mkRun(home());
  run.tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-qa" }),
  };
  const r1 = openGate(run, proposal({ question: "q1" }), g).run;
  const r2 = openGate(r1, proposal({ gateId: "schema-breaking", sessionId: "s-2-abcd", taskIds: ["BE-002"], question: "q2" }), g).run;
  const { run: r3 } = answerGate(r2, "business-choice", { answeredBy: "jtrp98", answer: "อนุมัติ" });
  assert.deepEqual([r3.tasks["BE-001"]!.step, r3.tasks["BE-001"]!.hold], ["execution", null]);
  assert.deepEqual([r3.tasks["BE-002"]!.step, r3.tasks["BE-002"]!.hold!.ref], ["held", "schema-breaking"]); // gate อื่นยังครอบ

  const run4 = mkRun(home());
  run4.tasks = { "BE-009": mkTask({ taskId: "BE-009", step: "qa", fixRounds: 2 }) };
  const o4 = openGate(run4, proposal({ gateId: "qa-critical", sessionId: "s-3-abcd", taskIds: ["BE-009"], question: "fail ครบ 2 รอบ" }), g).run;
  const { run: a4, record: rec4 } = answerGate(o4, "qa-critical", { answeredBy: "jtrp98", answer: "ให้ PM replan" });
  assert.equal(rec4.status, "answered");
  assert.deepEqual([a4.tasks["BE-009"]!.step, a4.tasks["BE-009"]!.hold!.ref], ["held", "qa-critical"]); // ยังค้าง — ปลดด้วย human-retry เท่านั้น
});

// --- trigger (b) structural ---
test("structural triggers ครบ — ux-signoff (scope task, FE ที่ Depends รอ) · deploy-real (scope phase) · release-cut (scope module) · sessionId null", () => {
  const g = mkGates();
  const run = mkRun(home());
  run.tasks = {
    "UX-001": mkTask({ taskId: "UX-001", owner: "uxui-designer", step: "awaiting-review" }),
    "FE-001": mkTask({ taskId: "FE-001", planPhase: "2", owner: "frontend-engineer" }),
  };
  const { run: run2, record: ux } = openGate(run, uxSignoffProposal(["UX-001"], "1"), g, { dependentsOf: dependentsOf({ "FE-001": ["UX-001"] }) });
  assert.deepEqual([ux.gateId, ux.scope, ux.sessionId, ux.phase], ["ux-signoff", "task", null, "1"]); // structural → sessionId null (data-model)
  assert.equal(run2.tasks["UX-001"]!.step, "held");
  assert.deepEqual([run2.tasks["FE-001"]!.step, run2.tasks["FE-001"]!.hold!.ref], ["held", "ux-signoff"]); // FE ที่ Depends ถึงรอ
  const dr = deployRealProposal("7");
  assert.deepEqual([dr.gateId, dr.scope, dr.phase, dr.taskIds], ["deploy-real", "phase", "7", []]);
  const rc = releaseCutProposal();
  assert.deepEqual([rc.gateId, rc.scope, rc.phase, rc.taskIds, rc.sessionId], ["release-cut", "module", null, [], null]);
  const { record: rcRec } = openGate(mkRun(home()), rc, g);
  assert.equal(rcRec.sessionId, null);
  assert.equal(gateRecordRole("deploy-real"), "devops"); // ตอบแล้ว record-only ไป devops (OQ-D3)
});

// --- trigger (c) doc + dedupe ---
test("doc trigger — Waiting on Human: ขวาง task = scope task · ว่าง/'ทั้งหมด' = ทั้ง module · คำถามอ้าง #n ตรงตัว · ประเมินซ้ำไม่ append ซ้ำ", () => {
  const plan = parsePlanIndex(
    "# P\n\n## Waiting on Human\n\n| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |\n|---|---|---|---|---|\n"
    + "| 1 | ยืนยัน breaking contract | อนุมัติ / ไม่ | jtrp98 | BE-001, BE-002 |\n"
    + "| 2 | ยืนยัน Release Scope | ใช่ / ตัด | jtrp98 | ทั้งหมด |\n\n"
    + "## Tasks\n\n| Task | Name | Owner | Phase | Depends | Status |\n|---|---|---|---|---|---|\n"
    + "| BE-001 | a | backend-engineer | 1 | — | pending |\n| BE-002 | b | backend-engineer | 1 | — | pending |\n",
  );
  assert.equal(plan.waiting.length, 2);
  const proposals = docGateProposals(plan.waiting, (id) => plan.rows.find((r) => r.id === id)?.phase ?? null);
  assert.deepEqual(proposals[0], {
    gateId: "business-choice", sessionId: null, scope: "task", taskIds: ["BE-001", "BE-002"], phase: "1",
    question: "Waiting on Human #1: ยืนยัน breaking contract (ตัวเลือก: อนุมัติ / ไม่)",
  });
  assert.deepEqual(proposals[1]!.scope, "module"); // "ทั้งหมด" = ทั้ง module (DES-008 (c))
  assert.deepEqual(proposals[1]!.taskIds, []);

  // เปิดด้วย proposal เดิมซ้ำ (doc trigger ประเมินทุก tick) → ไม่ append ซ้ำ แต่ hold ยังคง
  const g = mkGates();
  const run = mkRun(home());
  run.tasks = { "BE-001": mkTask({ taskId: "BE-001" }), "BE-002": mkTask({ taskId: "BE-002" }) };
  const first = openGate(run, proposals[0]!, g);
  assert.equal(first.appended, true);
  assert.equal(first.run.gateLog.length, 1);
  const again = openGate(first.run, proposals[0]!, g);
  assert.equal(again.appended, false);
  assert.equal(again.run.gateLog.length, 1);
  assert.equal(again.record.gateId, "business-choice");
  assert.equal(again.run.tasks["BE-001"]!.step, "held");
  // เนื้อหาแถวเปลี่ยน → instance ใหม่ append ได้ (append-only)
  const third = openGate(again.run, { ...proposals[0]!, question: "Waiting on Human #1: ยืนยัน breaking contract (แก้ข้อความ)" }, g);
  assert.equal(third.appended, true);
  assert.equal(third.run.gateLog.length, 2);
});

// --- record-only map (OQ-D3) ---
test("record-only หลังตอบ → role เจ้าของเอกสาร (OQ-D3) — map ครบ 7 ตรงกับ GATE_RECORD_ROLE ที่ BE-019 ใช้", () => {
  assert.deepEqual(
    (KNOWN_GATES as readonly GateId[]).map((g) => gateRecordRole(g)),
    ["business-analyst", "system-analyst", "uxui-designer", "qa-engineer", "security", "devops", "project-manager"],
  );
});

// --- integration กับ state-store (BE-007) ---
test("integration BE-007 — open → save ผ่าน updateRun → loadRun/reconcileRun คง hold · ตอบ → save → reconcile ปลดกลับ prevStep", () => {
  const h = home();
  const run = mkRun(h);
  run.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution" }), "BE-002": mkTask({ taskId: "BE-002" }) };
  updateRun(h, run.runId, () => run);
  const { run: opened } = openGate(
    loadRun(h, run.runId),
    proposal({ gateId: "ux-signoff", sessionId: null, question: "UX รอ sign-off" }),
    mkGates(),
  );
  updateRun(h, run.runId, () => opened);
  const plan = parsePlanIndex(
    "# P\n\n## Waiting on Human\n\n| # | q | o | d | b |\n|---|---|---|---|---|\n\n"
    + "## Phases\n\n| Phase | ชื่อ | Tasks | หมายเหตุ |\n|---|---|---|---|---|\n| 1 | a | BE-001, BE-002 | — |\n\n"
    + "## Tasks\n\n| Task | Name | Owner | Phase | Depends | Status |\n|---|---|---|---|---|---|\n"
    + "| BE-001 | a | backend-engineer | 1 | — | pending |\n| BE-002 | b | backend-engineer | 1 | — | pending |\n",
  );
  const resumed = reconcileRun(loadRun(h, run.runId), plan);
  assert.deepEqual([resumed.tasks["BE-001"]!.step, resumed.tasks["BE-001"]!.hold!.ref], ["held", "ux-signoff"]); // resume คง hold จาก gateLog
  const { run: answered } = answerGate(resumed, "ux-signoff", { answeredBy: "jtrp98", answer: "sign-off แล้ว" });
  updateRun(h, run.runId, () => answered);
  const final = reconcileRun(loadRun(h, run.runId), plan);
  assert.deepEqual([final.tasks["BE-001"]!.step, final.tasks["BE-001"]!.hold], ["execution", null]); // ปลดกลับ prevStep หลัง resume
  assert.equal(loadRun(h, run.runId).gateLog.length, 1);
  assert.equal(loadRun(h, run.runId).gateLog[0]!.status, "answered");
  assert.equal(dispatchBlocker(final, ["BE-001"]), null);
});

// --- shouldWaitOnHuman (DES-008) ---
test("shouldWaitOnHuman — scope module → true · task gate + task อื่นเดินได้ → false · ไม่เหลือ task เดินได้ → true", () => {
  const g = mkGates();
  const rm = mkRun(home());
  rm.tasks = { "BE-001": mkTask({ taskId: "BE-001" }) };
  assert.equal(shouldWaitOnHuman(openGate(rm, releaseCutProposal(), g).run), true);
  const rt = mkRun(home());
  rt.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution" }), "BE-002": mkTask({ taskId: "BE-002" }) };
  assert.equal(shouldWaitOnHuman(openGate(rt, proposal({ sessionId: null }), g).run), false);
  const rt2 = mkRun(home());
  rt2.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution" }), "BE-002": mkTask({ taskId: "BE-002", step: "verified" }) };
  assert.equal(shouldWaitOnHuman(openGate(rt2, proposal({ sessionId: null }), g).run), true);
});

// --- fail-closed ---
test("openGate fail-closed — gate id นอก 7 · คำถามว่าง · scope ขัดกันเอง → GateError และไม่แตะ gateLog", () => {
  const g = mkGates();
  const run = mkRun(home());
  assert.throws(() => openGate(run, proposal({ gateId: "gate-8" as GateId }), g), (e: unknown) => e instanceof GateError && e.kind === "unknown-gate");
  assert.throws(() => openGate(run, proposal({ question: "   " }), g), (e: unknown) => e instanceof GateError && e.kind === "empty-question");
  assert.throws(() => openGate(run, proposal({ taskIds: [] }), g), (e: unknown) => e instanceof GateError && e.kind === "invalid-scope");
  assert.throws(() => openGate(run, proposal({ scope: "phase", phase: null }), g), (e: unknown) => e instanceof GateError && e.kind === "invalid-scope");
  assert.throws(() => openGate(run, proposal({ scope: "module", phase: "1" }), g), (e: unknown) => e instanceof GateError && e.kind === "invalid-scope");
  assert.throws(() => openGate(run, proposal({ scope: "module", taskIds: ["BE-001"], phase: null }), g), (e: unknown) => e instanceof GateError && e.kind === "invalid-scope");
  assert.equal(run.gateLog.length, 0); // ผิดรูปทั้งหมด — gateLog ยังว่าง
});
