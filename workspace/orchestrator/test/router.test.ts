// BE-019 — deterministic router (DES-018 ตาราง R1–R24): ครอบทุกแถวเป็น test
// AC-069 deterministic (pure — input เดียวกันได้ Decision เดียวกัน) · AC-070/AC-056 localized · AC-071/AC-076 fix round
// AC-055 defect → session ใหม่ · AC-062/063/064 blocker · AC-075 crash limit · AC-057/AC-077 Feature QA · AC-078 gate 2/1
// AC-068 R15 · AC-073 statusWrites verified/blocked · AC-067 ไม่ import camp/LLM · AC-079 R24 · AC-080 R19
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { route, type Decision, type RouterConfig, type RouterEvent, type RouterPhaseInfo, type RouterTask } from "../src/core/router.ts";
import type { HandoffV2, QaDefect, ReviewFinding, TaskRuntime } from "../src/core/state-store.ts";

const CFG: RouterConfig = {
  maxParallelSessions: 3, fixRoundLimit: 2, crashRestartLimit: 1,
  reviewWave: { maxTasks: 4, maxDiffLines: 800 }, largeTask: { diffLines: 400, files: 10 },
};

const mkTask = (over: Partial<RouterTask> & { taskId: string }): RouterTask => ({
  owner: "backend-engineer", planPhase: "1", group: null, step: "runnable", hold: null,
  attempt: 0, fixRounds: 0, crashRestarts: 0, currentSessionId: null, sessionIds: [], touchedFiles: [],
  lastVerdict: null, defectPacket: null, humanActions: [], depends: [], securitySensitive: false, ...over,
});
const mkHandoff = (over: Partial<HandoffV2>): HandoffV2 => ({
  role: "backend-engineer", module: "m", sessionId: "s-1-abcd", outputState: "DONE",
  result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none",
  questionsForHuman: [], blocker: null, impactedTasks: null, decision: null,
  review: null, qa: null, featureQa: null, security: null, securityGate: null, ...over,
});
const mkEvent = (over: Partial<RouterEvent>): RouterEvent =>
  ({ kind: "handoff", sessionId: "s-1-abcd", taskIds: [], ...over });
const mkPhase = (over: Partial<RouterPhaseInfo>): RouterPhaseInfo =>
  ({ locked: false, cleared: false, featureQa: "not-ready", hold: null, ...over });
const finding = (over: Partial<ReviewFinding> & { id: string; task: string }): ReviewFinding =>
  ({ severity: "Important", location: "a.ts:1", problem: "p", reference: "DES-018", ...over });
const defect = (over: Partial<QaDefect> & { id: string }): QaDefect =>
  ({ task: "BE-001", severity: "Important", expected: "e", actual: "a", reproduce: { tp: null, steps: "s" }, evidence: ["x"], ...over });

const stepOf = (d: Decision, taskId: string): Decision["transitions"][number] | undefined =>
  d.transitions.find((t) => t.taskId === taskId);
const stepVal = (d: Decision, taskId: string): string | undefined => stepOf(d, taskId)?.step;

// --- R1 / R2 ---
test("R1: execution DONE + audit สะอาด → awaiting-review · localized — task อื่นไม่ถูกแตะ", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution", currentSessionId: "s-1-abcd" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "runnable" }),
  };
  const d = route(mkEvent({ taskIds: ["BE-001"], handoff: mkHandoff({ outputState: "DONE" }) }), tasks, CFG);
  assert.equal(d.ruleId, "R1");
  assert.deepEqual(d.transitions.map((t) => [t.taskId, t.step]), [["BE-001", "awaiting-review"]]);
  assert.equal(stepOf(d, "BE-001")!.hold, undefined); // ไม่มี key hold = คงเดิม
  assert.deepEqual(d.dispatch, []);
  assert.deepEqual(d.statusWrites, []);
  assert.deepEqual(d.counters, []);
  assert.ok(d.log.some((l) => JSON.parse(l).ruleId === "R1" && JSON.parse(l).from === "execution" && JSON.parse(l).to === "awaiting-review"));
});

test("R2: audit violation → hold audit-violation ทุก suspect · ไม่นับรอบ", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "execution" }),
  };
  const d = route(
    mkEvent({ taskIds: ["BE-001"], handoff: mkHandoff({ outputState: "DONE" }), auditSuspects: ["BE-001", "BE-002"] }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R2");
  assert.deepEqual(d.transitions.map((t) => [t.taskId, t.step]), [["BE-001", "held"], ["BE-002", "held"]]);
  assert.equal(stepOf(d, "BE-001")!.hold!.reason, "audit-violation");
  assert.deepEqual(d.counters, []); // ไม่นับรอบ
  assert.deepEqual(d.dispatch, []);
});

test("R2: audit violation จาก reviewer / qa / feature-qa → hold audit-violation ทุก suspect ไม่ให้ verdict ไหลผ่าน (QA-010)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-review" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "qa", planPhase: "1" }),
  };

  // 1. reviewer PASS แต่มี audit violation → R2 hold BE-001 (ไม่ไหลผ่านไป R3 awaiting-qa)
  const dReview = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "review", sessionRole: "reviewer",
      handoff: mkHandoff({
        role: "reviewer", outputState: "PASS",
        review: { roundFile: "review/round-1.md", perTask: [{ task: "BE-001", verdict: "PASS" }], findings: [] },
      }),
      auditSuspects: ["BE-001"],
    }),
    tasks, CFG,
  );
  assert.equal(dReview.ruleId, "R2");
  assert.equal(stepVal(dReview, "BE-001"), "held");
  assert.equal(stepOf(dReview, "BE-001")!.hold!.reason, "audit-violation");
  assert.deepEqual(dReview.dispatch, []);

  // 2. feature-qa PASS แต่มี audit violation → R2 hold QA-001 (ไม่ไหลผ่านไป R19 phase cleared)
  const dFQ = route(
    mkEvent({
      taskIds: ["QA-001"], sessionKind: "feature-qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "PASS",
        featureQa: { phase: "1", roundFile: "qa/round-2.md", flows: [{ flow: "f", ref: "AC-001", result: "PASS" }], defects: [] },
      }),
      phases: { "1": mkPhase({ locked: false, featureQa: "running" }) },
      auditSuspects: ["QA-001"],
    }),
    tasks, CFG,
  );
  assert.equal(dFQ.ruleId, "R2");
  assert.equal(stepVal(dFQ, "QA-001"), "held");
  assert.equal(stepOf(dFQ, "QA-001")!.hold!.reason, "audit-violation");
  assert.deepEqual(dFQ.phaseCleared, []);
  assert.deepEqual(dFQ.statusWrites, []);
});

// --- R3 / R4 (review — wave batching, AC-056 localized) ---
test("R3+R4: review wave ต่อ task ตาม verdict ของตัวเอง — PASS → awaiting-qa · FAIL → fixRounds++ + fix session (AC-056/AC-070)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-review" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-review" }),
    "BE-003": mkTask({ taskId: "BE-003", step: "awaiting-review", owner: "frontend-engineer" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["BE-001", "BE-002", "BE-003"], sessionKind: "review", sessionRole: "reviewer",
      handoff: mkHandoff({
        role: "reviewer", outputState: "FAIL",
        review: {
          roundFile: "review/round-1.md",
          perTask: [{ task: "BE-001", verdict: "PASS" }, { task: "BE-002", verdict: "PASS" }, { task: "BE-003", verdict: "FAIL" }],
          findings: [finding({ id: "REV-001", task: "BE-003", severity: "Critical" })],
        },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(stepVal(d, "BE-001"), "awaiting-qa"); // R3
  assert.equal(stepVal(d, "BE-002"), "awaiting-qa"); // R3 — task อื่นไม่โดน FAIL ของ BE-003 ลาก
  assert.equal(stepVal(d, "BE-003"), "execution"); // R4
  assert.deepEqual(d.counters, [{ taskId: "BE-003", fixRounds: 1, crashRestarts: 0 }]);
  assert.deepEqual(d.dispatch, [{ kind: "execution", role: "frontend-engineer", taskIds: ["BE-003"] }]); // AC-055 — session ใหม่ (packet = BE-021)
  assert.deepEqual(d.statusWrites, []); // R4 review ไม่เขียน Status (เฉพาะ QA/Feature-QA)
});

test("R4: review finding Critical ไม่เข้า R7 — gate 4 เฉพาะ QA → ไป R4 ตาม §Severity (DES-018)", () => {
  const tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-review" }) };
  const d = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "review", sessionRole: "reviewer",
      handoff: mkHandoff({
        role: "reviewer", outputState: "FAIL",
        review: { roundFile: "review/round-1.md", perTask: [{ task: "BE-001", verdict: "FAIL" }], findings: [finding({ id: "REV-009", task: "BE-001", severity: "Critical" })] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R4");
  assert.deepEqual(d.gates, []); // ไม่เปิด gate 4
  assert.equal(stepVal(d, "BE-001"), "execution");
});

test("R4: QA blocked → fixRounds++ + Status blocked + fix session (AC-055) · task verified ไม่โดย task FAIL ลาก", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-qa" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["BE-001", "BE-002"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "FAIL",
        qa: { roundFile: "qa/round-1.md", checks: [], perTask: [{ task: "BE-001", verdict: "verified" }, { task: "BE-002", verdict: "blocked" }], defects: [defect({ id: "QA-001", task: "BE-002" })] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(stepVal(d, "BE-001"), "verified"); // R6
  assert.deepEqual(d.statusWrites, [{ taskId: "BE-001", value: "verified" }, { taskId: "BE-002", value: "blocked" }]); // AC-073
  assert.equal(stepVal(d, "BE-002"), "execution"); // R4
  assert.deepEqual(d.counters, [{ taskId: "BE-002", fixRounds: 1, crashRestarts: 0 }]);
  assert.deepEqual(d.dispatch, [{ kind: "execution", role: "backend-engineer", taskIds: ["BE-002"] }]);
});

test("R4: Feature QA FAIL ระบุ task → R4 ของ task นั้น + anchor blocked/step waiting-deps (DES-019 §anchor)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "qa", planPhase: "1" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["QA-001"], sessionKind: "feature-qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "FAIL",
        featureQa: { phase: "1", roundFile: "qa/round-2.md", flows: [{ flow: "login", ref: "AC-001", result: "FAIL" }], defects: [defect({ id: "QA-002", task: "BE-001", severity: "Important" })] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R4");
  assert.equal(stepVal(d, "BE-001"), "execution");
  assert.deepEqual(d.counters, [{ taskId: "BE-001", fixRounds: 1, crashRestarts: 0 }]);
  assert.equal(stepVal(d, "QA-001"), "waiting-deps"); // anchor รอ phase ใหม่
  assert.deepEqual(d.statusWrites, [{ taskId: "BE-001", value: "blocked" }, { taskId: "QA-001", value: "blocked" }]); // R4 (feature-qa) + anchor
});

// --- R5 (gate 4 — fail ครั้งที่ 3, AC-071/AC-076) ---
test("R5: fixRounds == fixRoundLimit → hold + gate 4 qa-critical · ไม่ dispatch · ไม่นับเพิ่ม · Status blocked", () => {
  const tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa", fixRounds: 2 }) };
  const d = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "FAIL",
        qa: { roundFile: "qa/round-3.md", checks: [], perTask: [{ task: "BE-001", verdict: "blocked" }], defects: [defect({ id: "QA-003", task: "BE-001" })] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R5");
  const tr = stepOf(d, "BE-001")!;
  assert.equal(tr.step, "held");
  assert.deepEqual(tr.hold, { reason: "gate", ref: "qa-critical", prevStep: "awaiting-qa" });
  assert.deepEqual(d.counters, []); // ไม่นับเพิ่ม — คงที่ limit
  assert.deepEqual(d.dispatch, []); // ไม่ dispatch
  assert.equal(d.gates.length, 1);
  assert.equal(d.gates[0]!.gateId, "qa-critical");
  assert.equal(d.gates[0]!.scope, "task");
  assert.deepEqual(d.statusWrites, [{ taskId: "BE-001", value: "blocked" }]);
});

test("R5: review รอบที่ 3 → hold gate 4 เหมือนกัน แต่ไม่เขียน Status (R4 verbatim — เฉพาะ QA/Feature-QA)", () => {
  const tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-review", fixRounds: 2 }) };
  const d = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "review", sessionRole: "reviewer",
      handoff: mkHandoff({
        role: "reviewer", outputState: "FAIL",
        review: { roundFile: "review/round-3.md", perTask: [{ task: "BE-001", verdict: "FAIL" }], findings: [finding({ id: "REV-010", task: "BE-001" })] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R5");
  assert.equal(d.gates[0]!.gateId, "qa-critical");
  assert.deepEqual(d.statusWrites, []);
});

// --- R6 (unlock dependents) ---
test("R6: qa verified → Status verified + step verified · unlock dependent ตรง · dependent ที่ dep ยังไม่ครบคง waiting-deps", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }),
    "BE-009": mkTask({ taskId: "BE-009", step: "execution", currentSessionId: "s-9" }), // dep อื่นยังไม่ verified
    "FE-001": mkTask({ taskId: "FE-001", step: "waiting-deps", depends: ["BE-001"], owner: "frontend-engineer" }),
    "FE-002": mkTask({ taskId: "FE-002", step: "waiting-deps", depends: ["BE-001", "BE-009"], owner: "frontend-engineer" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "PASS",
        qa: { roundFile: "qa/round-1.md", checks: [], perTask: [{ task: "BE-001", verdict: "verified" }], defects: [] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R6");
  assert.deepEqual(d.statusWrites, [{ taskId: "BE-001", value: "verified" }]);
  assert.equal(stepVal(d, "FE-001"), "runnable"); // unlock (R8 บน working steps)
  assert.equal(stepVal(d, "FE-002"), undefined); // dep ยังไม่ครบ — ไม่แตะ
  assert.ok(d.log.some((l) => JSON.parse(l).ruleId === "R8" && JSON.parse(l).taskId === "FE-001"));
});

// --- R7 (QA defect Critical — gate 4 ทันที) ---
test("R7: QA defect Critical → Status blocked + gate 4 ทันที แทน R4 · ไม่ dispatch fix · ไม่นับรอบ · จับ defect นอก perTask ด้วย", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-qa" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["BE-001", "BE-002"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "FAIL",
        qa: {
          roundFile: "qa/round-1.md", checks: [],
          perTask: [{ task: "BE-001", verdict: "blocked" }, { task: "BE-002", verdict: "blocked" }],
          defects: [defect({ id: "QA-009", task: "BE-001", severity: "Critical" })],
        },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(stepVal(d, "BE-001"), "held");
  assert.equal(stepOf(d, "BE-001")!.hold!.ref, "qa-critical");
  assert.ok(!d.counters.some((x) => x.taskId === "BE-001")); // BE-001 ไม่นับ — gate 4 ทันที (R7)
  assert.ok(!d.dispatch.some((x) => x.taskIds.includes("BE-001"))); // ไม่ส่ง fix ของ BE-001 ก่อนคนตัดสิน
  assert.deepEqual(d.statusWrites, [{ taskId: "BE-001", value: "blocked" }, { taskId: "BE-002", value: "blocked" }]);
  assert.equal(d.gates[0]!.gateId, "qa-critical");
  assert.equal(d.gates[0]!.question.includes("QA-009"), true);
  // BE-002 (blocked ปกติ ไม่มี Critical) → R4 ปกติ — ได้ fix session และนับรอบ
  assert.equal(stepVal(d, "BE-002"), "execution");
  assert.deepEqual(d.counters, [{ taskId: "BE-002", fixRounds: 1, crashRestarts: 0 }]);
});

// --- R8 (DAG ordering) ---
test("R8: plan-changed — Depends ครบ → runnable / ไม่ครบ → waiting-deps (DES-001) · task อื่นไม่ถูกแตะ", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "waiting-deps", depends: ["BE-001"] }),
    "BE-003": mkTask({ taskId: "BE-003", step: "waiting-deps", depends: ["BE-002"] }),
    "BE-004": mkTask({ taskId: "BE-004", step: "runnable", depends: [] }),
    "BE-005": mkTask({ taskId: "BE-005", step: "execution", currentSessionId: "s-5", depends: [] }),
  };
  const d = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), tasks, CFG);
  assert.equal(d.ruleId, "R8");
  assert.equal(stepVal(d, "BE-002"), "runnable");
  assert.equal(stepVal(d, "BE-003"), undefined); // ยัง waiting-deps — ไม่มี transition (from == to)
  assert.equal(stepVal(d, "BE-004"), undefined);
  assert.equal(stepVal(d, "BE-005"), undefined); // active — ไม่แตะ
});

// --- R9 (Depends ไม่มีจริง / วงวน — AC-039) ---
test("R9: Depends อ้าง id ไม่มี / วงวน → hold dep-error ราก + dependents · แก้แล้วปลดทั้งสายกลับ step เดิม", () => {
  const tasks = {
    "BE-010": mkTask({ taskId: "BE-010", step: "waiting-deps", depends: ["BE-099"] }),
    "FE-010": mkTask({ taskId: "FE-010", step: "waiting-deps", depends: ["BE-010"], owner: "frontend-engineer" }),
    "BE-011": mkTask({ taskId: "BE-011", step: "waiting-deps", depends: ["BE-012"] }),
    "BE-012": mkTask({ taskId: "BE-012", step: "waiting-deps", depends: ["BE-011"] }),
    "OK-001": mkTask({ taskId: "OK-001", step: "runnable" }),
  };
  const d1 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), tasks, CFG);
  assert.equal(d1.ruleId, "R9");
  assert.equal(stepOf(d1, "BE-010")!.hold!.reason, "dep-error");
  assert.equal(stepOf(d1, "BE-010")!.hold!.ref, "missing:BE-099");
  assert.equal(stepOf(d1, "FE-010")!.hold!.reason, "dep-error"); // dependent
  assert.equal(stepOf(d1, "BE-011")!.hold!.ref, "cycle");
  assert.equal(stepOf(d1, "BE-012")!.hold!.ref, "cycle");
  assert.equal(stepVal(d1, "OK-001"), undefined); // task อื่นเดินต่อ

  const fixed = {
    ...tasks,
    "BE-010": mkTask({ taskId: "BE-010", step: "waiting-deps", hold: { reason: "dep-error", ref: "missing:BE-099", prevStep: "waiting-deps" }, depends: ["BE-001"] }),
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "FE-010": mkTask({ taskId: "FE-010", step: "held", hold: { reason: "dep-error", ref: "missing:BE-099", prevStep: "waiting-deps" }, depends: ["BE-010"], owner: "frontend-engineer" }),
    "BE-011": mkTask({ taskId: "BE-011", step: "held", hold: { reason: "dep-error", ref: "cycle", prevStep: "waiting-deps" }, depends: [] }),
    "BE-012": mkTask({ taskId: "BE-012", step: "held", hold: { reason: "dep-error", ref: "cycle", prevStep: "waiting-deps" }, depends: ["BE-011"] }),
  };
  const d2 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), fixed, CFG);
  assert.equal(stepVal(d2, "BE-010"), "runnable"); // ปลด + Depends ครบ (BE-001 verified)
  assert.equal(stepVal(d2, "FE-010"), "waiting-deps"); // dependent ถูกปลดกลับ prevStep (waiting-deps) แล้ว R8 ไม่ขยับ (BE-010 ยังไม่ verified)
  assert.equal(stepVal(d2, "BE-012"), "waiting-deps"); // ปลดกลับ waiting-deps (BE-011 ยังไม่ verified)
  assert.ok(!d2.transitions.some((t) => stepOf(d2, t.taskId)?.hold?.reason === "dep-error"));
});

// --- R10 (NEEDS_DESIGN_CHANGE — คิว SA → PM → R13) ---
test("R10: NEEDS_DESIGN_CHANGE → hold design-change + dependents (ref DES-id) · คิว change SA · SA DONE → PM (AC-062)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution" }),
    "FE-001": mkTask({ taskId: "FE-001", step: "runnable", depends: ["BE-001"], owner: "frontend-engineer" }),
    "BE-099": mkTask({ taskId: "BE-099", step: "runnable", depends: [] }), // task นอก impact
  };
  const d1 = route(
    mkEvent({
      taskIds: ["BE-001"],
      handoff: mkHandoff({ outputState: "NEEDS_DESIGN_CHANGE", blocker: { type: "design", task: "BE-001", reference: "DES-018", reason: "r" } }),
    }),
    tasks, CFG,
  );
  assert.equal(d1.ruleId, "R10");
  assert.deepEqual(stepOf(d1, "BE-001")!.hold, { reason: "design-change", ref: "DES-018", prevStep: "execution" });
  assert.equal(stepOf(d1, "FE-001")!.hold!.reason, "design-change"); // dependent
  assert.equal(stepVal(d1, "BE-099"), undefined); // task ที่ไม่อยู่ใน impact ยังรันต่อ (AC-064)
  assert.deepEqual(d1.dispatch, [{ kind: "change", role: "system-analyst", taskIds: ["BE-001"] }]);

  const held = {
    "BE-001": mkTask({ taskId: "BE-001", step: "held", hold: { reason: "design-change", ref: "DES-018", prevStep: "execution" } }),
    "FE-001": mkTask({ taskId: "FE-001", step: "held", hold: { reason: "design-change", ref: "DES-018", prevStep: "runnable" }, depends: ["BE-001"], owner: "frontend-engineer" }),
  };
  const d2 = route(
    mkEvent({ taskIds: ["BE-001"], sessionKind: "change", sessionRole: "system-analyst", handoff: mkHandoff({ role: "system-analyst", outputState: "DONE" }) }),
    held, CFG,
  );
  assert.equal(d2.ruleId, "R10");
  assert.deepEqual(d2.dispatch, [{ kind: "change", role: "project-manager", taskIds: ["BE-001"] }]); // SA ตามด้วย PM เสมอ
});

// --- R11 (NEEDS_REQUIREMENT_CHANGE — คิว BA ก่อนเสมอ, AC-063; SA ตามด้วย PM; nextRole ของ BA) ---
test("R11: NEEDS_REQUIREMENT_CHANGE → hold requirement-change + คิว BA ก่อนเสมอ (AC-063) · BA DONE nextRole SA → SA", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution" }),
    "FE-001": mkTask({ taskId: "FE-001", step: "runnable", depends: ["BE-001"], owner: "frontend-engineer" }),
  };
  const d1 = route(
    mkEvent({
      taskIds: ["BE-001"],
      handoff: mkHandoff({ outputState: "NEEDS_REQUIREMENT_CHANGE", blocker: { type: "requirement", task: "BE-001", reference: "REQ-021", reason: "r" } }),
    }),
    tasks, CFG,
  );
  assert.equal(d1.ruleId, "R11");
  assert.deepEqual(stepOf(d1, "BE-001")!.hold, { reason: "requirement-change", ref: "REQ-021", prevStep: "execution" });
  assert.deepEqual(d1.dispatch, [{ kind: "change", role: "business-analyst", taskIds: ["BE-001"] }]); // AC-063

  const held = {
    "BE-001": mkTask({ taskId: "BE-001", step: "held", hold: { reason: "requirement-change", ref: "REQ-021", prevStep: "execution" } }),
  };
  const d2 = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "change", sessionRole: "business-analyst",
      handoff: mkHandoff({ role: "business-analyst", outputState: "DONE", nextRole: "system-analyst" }),
    }),
    held, CFG,
  );
  assert.equal(d2.ruleId, "R11");
  assert.deepEqual(d2.dispatch, [{ kind: "change", role: "system-analyst", taskIds: ["BE-001"] }]);
});

test("R11: SA DONE ใน requirement chain → PM เสมอ · BA nextRole none → ปลด hold กลับ step เดิม", () => {
  const held = {
    "BE-001": mkTask({ taskId: "BE-001", step: "held", hold: { reason: "requirement-change", ref: "REQ-021", prevStep: "execution" } }),
  };
  const d1 = route(
    mkEvent({ taskIds: ["BE-001"], sessionKind: "change", sessionRole: "system-analyst", handoff: mkHandoff({ role: "system-analyst", outputState: "DONE" }) }),
    held, CFG,
  );
  assert.equal(d1.ruleId, "R11");
  assert.deepEqual(d1.dispatch, [{ kind: "change", role: "project-manager", taskIds: ["BE-001"] }]);

  const d2 = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "change", sessionRole: "business-analyst",
      handoff: mkHandoff({ role: "business-analyst", outputState: "DONE", nextRole: "none" }),
    }),
    held, CFG,
  );
  assert.equal(stepVal(d2, "BE-001"), "execution"); // กลับ step เดิม
  assert.equal(stepOf(d2, "BE-001")!.hold, null);
  assert.deepEqual(d2.dispatch, []);
});

// --- R12 (NEEDS_HUMAN → gate; AC-078 gate 2/1) ---
test("R12: NEEDS_HUMAN → gate ตาม questionsForHuman + hold task + dependents (scope task)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution" }),
    "FE-001": mkTask({ taskId: "FE-001", step: "runnable", depends: ["BE-001"], owner: "frontend-engineer" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["BE-001"],
      handoff: mkHandoff({
        outputState: "NEEDS_HUMAN",
        questionsForHuman: [{ gate: "ux-signoff", question: "ต้องตัดสินอะไร", owner: "jtrp98", touchesSchemaOrContract: null }],
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R12");
  assert.deepEqual(d.gates, [{ gateId: "ux-signoff", scope: "task", taskIds: ["BE-001"], phase: "1", question: "ต้องตัดสินอะไร", owner: "jtrp98" }]);
  assert.deepEqual(stepOf(d, "BE-001")!.hold, { reason: "gate", ref: "ux-signoff", prevStep: "execution" });
  assert.equal(stepOf(d, "FE-001")!.hold!.ref, "ux-signoff"); // dependents ตาม Depends (DES-008)
});

test("R12: SA ส่ง gate none → touchesSchemaOrContract true = gate 2 / false = gate 1 (AC-078) · non-SA none → gate 1 (DES-008 fallback)", () => {
  const tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution" }) };
  const q = (flag: boolean | null) => [{ gate: "none" as const, question: "q", owner: "jtrp98", touchesSchemaOrContract: flag }];
  const d1 = route(mkEvent({ taskIds: [], sessionKind: "change", sessionRole: "system-analyst", handoff: mkHandoff({ role: "system-analyst", outputState: "NEEDS_HUMAN", questionsForHuman: q(true) }) }), tasks, CFG);
  assert.equal(d1.gates[0]!.gateId, "schema-breaking");
  assert.equal(d1.gates[0]!.scope, "module"); // change chain ก่อนมี plan (DES-008)
  const d2 = route(mkEvent({ taskIds: [], sessionKind: "change", sessionRole: "system-analyst", handoff: mkHandoff({ role: "system-analyst", outputState: "NEEDS_HUMAN", questionsForHuman: q(false) }) }), tasks, CFG);
  assert.equal(d2.gates[0]!.gateId, "business-choice");
  const d3 = route(mkEvent({ taskIds: ["BE-001"], handoff: mkHandoff({ outputState: "NEEDS_HUMAN", questionsForHuman: q(null) }) }), tasks, CFG);
  assert.equal(d3.gates[0]!.gateId, "business-choice");
});

// --- R13 (PM DONE ใน change chain) ---
test("R13: PM DONE — impacted ไม่ verified → session ใหม่ (ไม่นับรอบ) · ต้นเรื่องนอก impact → กลับ step เดิม · verified ใน impact → reopen-needed", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "held", hold: { reason: "design-change", ref: "DES-018", prevStep: "execution" } }),
    "BE-002": mkTask({ taskId: "BE-002", step: "held", hold: { reason: "design-change", ref: "DES-018", prevStep: "runnable" }, depends: ["BE-001"] }),
    "BE-003": mkTask({ taskId: "BE-003", step: "verified" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "change", sessionRole: "project-manager",
      handoff: mkHandoff({ role: "project-manager", outputState: "DONE", impactedTasks: ["BE-002", "BE-003"] }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R13");
  assert.equal(stepVal(d, "BE-002"), "execution"); // session ใหม่
  assert.deepEqual(d.dispatch, [{ kind: "execution", role: "backend-engineer", taskIds: ["BE-002"] }]);
  assert.deepEqual(d.counters, []); // ไม่นับรอบ
  assert.equal(stepVal(d, "BE-001"), "execution"); // ต้นเรื่องนอก impact → step เดิม
  assert.equal(stepOf(d, "BE-001")!.hold, null);
  assert.equal(stepVal(d, "BE-003"), "held");
  assert.equal(stepOf(d, "BE-003")!.hold!.reason, "reopen-needed"); // verified ใน impact
});

// --- R14 (BLOCKED) ---
test("R14: BLOCKED → hold blocked · ไม่นับรอบ · ทุก kind (execution/anchor)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-qa" }),
  };
  const d1 = route(
    mkEvent({ taskIds: ["BE-001"], handoff: mkHandoff({ outputState: "BLOCKED", blocker: { type: "environment", task: "BE-001", reference: null, reason: "env เสีย" } }) }),
    tasks, CFG,
  );
  assert.equal(d1.ruleId, "R14");
  assert.deepEqual(stepOf(d1, "BE-001")!.hold, { reason: "blocked", ref: null, prevStep: "execution" });
  assert.deepEqual(d1.counters, []);
  const d2 = route(
    mkEvent({
      taskIds: ["BE-002"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({ role: "qa-engineer", outputState: "BLOCKED", blocker: { type: "dependency", task: "BE-002", reference: "BE-009", reason: "รอ BE-009" } }),
    }),
    tasks, CFG,
  );
  assert.deepEqual(stepOf(d2, "BE-002")!.hold, { reason: "blocked", ref: "BE-009", prevStep: "awaiting-qa" });
});

// --- R15 (invalid-handoff — AC-068) ---
test("R15: state นอกชุดของ kind (review DONE) / ไม่มี outputState / handoffInvalid / verdict ขัด §Severity / securityGate phase ไม่ตรง → invalid-handoff", () => {
  const tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-review" }) };
  const d1 = route(mkEvent({ taskIds: ["BE-001"], sessionKind: "review", sessionRole: "reviewer", handoff: mkHandoff({ role: "reviewer", outputState: "DONE" }) }), tasks, CFG);
  assert.equal(d1.ruleId, "R15");
  assert.equal(stepOf(d1, "BE-001")!.hold!.reason, "invalid-handoff");

  const d2 = route(mkEvent({ taskIds: ["BE-001"], handoff: mkHandoff({ outputState: undefined as unknown as HandoffV2["outputState"] }) }), tasks, CFG);
  assert.equal(d2.ruleId, "R15");

  const d3 = route(mkEvent({ taskIds: ["BE-001"], handoffInvalid: ["(3) NEEDS_DESIGN_CHANGE ต้องมี blocker.reference = DES-id"], handoff: mkHandoff({}) }), tasks, CFG);
  assert.equal(d3.ruleId, "R15");
  assert.ok(d3.log.some((l) => l.includes("blocker.reference")));

  // review perTask FAIL แต่ไม่มี finding Critical|Important — ขัด §Severity → R15
  const d4 = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "review", sessionRole: "reviewer",
      handoff: mkHandoff({
        role: "reviewer", outputState: "FAIL",
        review: { roundFile: "review/round-1.md", perTask: [{ task: "BE-001", verdict: "FAIL" }], findings: [finding({ id: "REV-011", task: "BE-001", severity: "Minor" })] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d4.ruleId, "R15");

  // securityGate.phase ≠ phase ของ session → R15 (R23)
  const d5 = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "PASS", securityGate: [{ phase: "9", reason: "x" }],
        qa: { roundFile: "qa/round-1.md", checks: [], perTask: [{ task: "BE-001", verdict: "verified" }], defects: [] },
      }),
    }),
    { ...tasks, "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }) }, CFG,
  );
  assert.equal(d5.ruleId, "R15");
});

// --- R16 / R17 (crash restart — AC-075) ---
test("R16: crash/timeout/interrupted — crashRestarts++ · session ใหม่ (dispatch เดียวครบ taskIds) · fixRounds คงเดิม", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "execution", currentSessionId: "s-1", fixRounds: 1 }),
    "BE-002": mkTask({ taskId: "BE-002", step: "execution", currentSessionId: "s-1" }),
  };
  const d = route(mkEvent({ kind: "timeout", sessionId: "s-1", taskIds: ["BE-001", "BE-002"], sessionKind: "execution" }), tasks, CFG);
  assert.equal(d.ruleId, "R16");
  assert.deepEqual(d.counters, [
    { taskId: "BE-001", fixRounds: 0, crashRestarts: 1 }, // fixRounds delta 0 — คงเดิม
    { taskId: "BE-002", fixRounds: 0, crashRestarts: 1 },
  ]);
  assert.deepEqual(d.dispatch, [{ kind: "execution", role: "backend-engineer", taskIds: ["BE-001", "BE-002"] }]);
  assert.equal(stepVal(d, "BE-001"), "execution");
});

test("R17: crash ครบ crashRestartLimit → hold crash-limit (AC-075) · ไม่ dispatch", () => {
  const tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution", crashRestarts: 1 }) };
  const d = route(mkEvent({ kind: "crash", sessionId: "s-1", taskIds: ["BE-001"], sessionKind: "execution" }), tasks, CFG);
  assert.equal(d.ruleId, "R17");
  assert.deepEqual(stepOf(d, "BE-001")!.hold, { reason: "crash-limit", ref: null, prevStep: "execution" });
  assert.deepEqual(d.dispatch, []);
  assert.deepEqual(d.counters, []);
});

// --- R18 (Feature QA — AC-057) ---
test("R18: ทุก task ใน phase verified (ไม่นับ anchor + dependents ของ anchor) → คิว feature-qa taskIds=[anchor] · anchor step qa", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "verified" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "runnable" }),
    "DEV-001": mkTask({ taskId: "DEV-001", owner: "devops", step: "waiting-deps", depends: ["QA-001"] }), // งานหลัง Feature QA — R18 ไม่รอ
  };
  const d = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), tasks, CFG);
  assert.deepEqual(d.dispatch, [{ kind: "feature-qa", role: "qa-engineer", taskIds: ["QA-001"] }]);
  assert.equal(stepVal(d, "QA-001"), "qa"); // ระหว่าง session step qa (DES-019)
  assert.equal(stepVal(d, "DEV-001"), undefined); // ไม่ถูกบังคับ verified — R18 ไม่รอ dependents ของ anchor
});

test("R18: task ที่ไม่ใช่ anchor/dependent ยังไม่ verified → ไม่เปิด · ไม่มี anchor → taskIds ว่าง · featureQa running → ไม่คิวซ้ำ · มีแถว plan-error → ไม่เปิด", () => {
  const notReady = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "execution", currentSessionId: "s-2" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "runnable" }),
  };
  const d1 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), notReady, CFG);
  assert.deepEqual(d1.dispatch, []);

  const noAnchor = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified", planPhase: "3" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "verified", planPhase: "3" }),
  };
  const d2 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), noAnchor, CFG);
  assert.deepEqual(d2.dispatch, [{ kind: "feature-qa", role: "qa-engineer", taskIds: [] }]); // R18 เดิม — ว่าง

  const running = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "qa" }),
  };
  const d3 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [], phases: { "1": mkPhase({ featureQa: "running" }) } }), running, CFG);
  assert.deepEqual(d3.dispatch, []);

  const planError = {
    ...running,
    "BE-004": mkTask({ taskId: "BE-004", step: "held", hold: { reason: "plan-error", ref: "owner:reviewer", prevStep: "pending" as TaskRuntime["step"] }, owner: "reviewer" }),
  };
  const d4 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [], phases: { "1": mkPhase() } }), planError, CFG);
  assert.deepEqual(d4.dispatch, []); // ไม่มีแถว hold plan-error ใน phase เงื่อนไข R18 ไม่ผ่าน
});

test("R18: phase ที่มีแต่ anchor — Depends ที่เขียน explicit ของ anchor ต้องครบด้วย (DES-019 §anchor '+ที่เขียน — R8') — รูป plan จริง phase 6/7", () => {
  // plan จริง: phase 6 = QA-001 (Depends BE-011… ยัง pending) — ไม่เปิด feature-qa ทั้งที่ไม่มี task อื่นใน phase
  const early = {
    "BE-011": mkTask({ taskId: "BE-011", step: "waiting-deps", planPhase: "3" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "waiting-deps", planPhase: "6", depends: ["BE-011"] }),
  };
  const d1 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), early, CFG);
  assert.deepEqual(d1.dispatch, []); // Depends ของ anchor ยังไม่ครบ — ไม่เปิด

  // anchor คนละ phase รอ phase ก่อนหน้า cleared (QA-002 depends QA-001 — satisfied(anchor) = phase cleared)
  const chained = {
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "verified", planPhase: "6" }),
    "QA-002": mkTask({ taskId: "QA-002", owner: "qa-engineer", step: "waiting-deps", planPhase: "7", depends: ["QA-001"] }),
    "DEV-001": mkTask({ taskId: "DEV-001", owner: "devops", step: "waiting-deps", planPhase: "7", depends: ["QA-001", "QA-002"] }),
  };
  const d2 = route(
    mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [], phases: { "6": mkPhase({ featureQa: "pass" }), "7": mkPhase() } }),
    chained, CFG,
  );
  assert.deepEqual(d2.dispatch, []); // phase 6 ยังไม่ cleared → satisfied(QA-001) false → phase 7 ยังไม่เปิด

  const d3 = route(
    mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [], phases: { "6": mkPhase({ featureQa: "pass", cleared: true }), "7": mkPhase() } }),
    chained, CFG,
  );
  assert.deepEqual(d3.dispatch, [{ kind: "feature-qa", role: "qa-engineer", taskIds: ["QA-002"] }]); // phase 6 cleared → phase 7 เปิด
  assert.equal(stepVal(d3, "DEV-001"), undefined); // dependent ของ anchor — R18 ไม่รอ (เริ่มหลัง phase cleared)
});

// --- R19 (security stage ท้าย phase 🔒 — AC-080) ---
test("R19: Feature QA PASS — phase มี 🔒 → คิว security (task verified ของ phase) + anchor verified · ไม่มี 🔒 → phase cleared", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "verified" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "qa" }),
  };
  const locked = {
    tasks,
    event: mkEvent({
      taskIds: ["QA-001"], sessionKind: "feature-qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({ role: "qa-engineer", outputState: "PASS", featureQa: { phase: "1", roundFile: "qa/round-2.md", flows: [{ flow: "f", ref: "AC-001", result: "PASS" }], defects: [] } }),
      phases: { "1": mkPhase({ locked: true, featureQa: "running" }) },
    }),
  };
  const d1 = route(locked.event, tasks, CFG);
  assert.equal(d1.ruleId, "R19");
  assert.equal(stepVal(d1, "QA-001"), "verified");
  assert.deepEqual(d1.statusWrites, [{ taskId: "QA-001", value: "verified" }]);
  assert.deepEqual(d1.dispatch, [{ kind: "security", role: "security", taskIds: ["QA-001", "BE-001", "BE-002"].sort() }]);
  assert.deepEqual(d1.phaseCleared, []);

  const d2 = route(
    mkEvent({
      taskIds: ["QA-001"], sessionKind: "feature-qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({ role: "qa-engineer", outputState: "PASS", featureQa: { phase: "1", roundFile: "qa/round-2.md", flows: [{ flow: "f", ref: "AC-001", result: "PASS" }], defects: [] } }),
      phases: { "1": mkPhase({ locked: false, featureQa: "running" }) },
    }),
    tasks, CFG,
  );
  assert.deepEqual(d2.dispatch, []);
  assert.deepEqual(d2.phaseCleared, ["1"]); // ไม่มี 🔒 → cleared (AC-080)
});

// --- R20 (Feature QA FAIL ไม่ระบุ task — AC-077) ---
test("R20: FAIL ไม่ระบุ task → hold phase feature-qa-unattributed + anchor blocked/step held (gate ref = phase) · fixRounds คงเดิม", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "qa" }),
  };
  const d = route(
    mkEvent({
      taskIds: ["QA-001"], sessionKind: "feature-qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "FAIL",
        featureQa: { phase: "1", roundFile: "qa/round-2.md", flows: [{ flow: "checkout", ref: "AC-010", result: "FAIL" }], defects: [defect({ id: "QA-005", task: null, severity: "Important" })] },
      }),
    }),
    tasks, CFG,
  );
  assert.equal(d.ruleId, "R20");
  assert.deepEqual(d.phaseHolds, [{ phase: "1", reason: "feature-qa-unattributed" }]);
  assert.equal(stepVal(d, "QA-001"), "held");
  assert.deepEqual(stepOf(d, "QA-001")!.hold, { reason: "gate", ref: "1", prevStep: "qa" });
  assert.deepEqual(d.statusWrites, [{ taskId: "QA-001", value: "blocked" }]);
  assert.deepEqual(d.counters, []); // fixRounds คงเดิม (AC-077)
  assert.deepEqual(d.dispatch, []);
});

// --- R21 (security stage ผล) ---
test("R21: security PASS → phase cleared · FAIL มี Critical|Important → gate 5 scope phase · FAIL เฉพาะ Minor → cleared (Minor → backlog)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "verified" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "verified" }),
  };
  const ev = (over: Partial<HandoffV2>): RouterEvent =>
    mkEvent({ taskIds: ["BE-001", "BE-002"], sessionKind: "security", sessionRole: "security", handoff: mkHandoff({ role: "security", ...over }) });
  const d1 = route(ev({ outputState: "PASS", security: { findings: [] } }), tasks, CFG);
  assert.equal(d1.ruleId, "R21");
  assert.deepEqual(d1.phaseCleared, ["1"]);
  assert.deepEqual(d1.gates, []);

  const d2 = route(ev({ outputState: "FAIL", security: { findings: [{ id: "SEC-001", severity: "Critical", ref: "DES-015" }] } }), tasks, CFG);
  assert.equal(d2.ruleId, "R21");
  assert.deepEqual(d2.phaseCleared, []); // ไม่ cleared
  assert.equal(d2.gates[0]!.gateId, "security-finding");
  assert.equal(d2.gates[0]!.scope, "phase");
  assert.equal(d2.gates[0]!.phase, "1");

  const d3 = route(ev({ outputState: "FAIL", security: { findings: [{ id: "SEC-002", severity: "Minor", ref: "DES-015" }] } }), tasks, CFG);
  assert.deepEqual(d3.phaseCleared, ["1"]);
  assert.deepEqual(d3.gates, []);
});

// --- R22 (gate answered / human retry) ---
test("R22: gate answered → record-only (role เจ้าของเอกสาร) + task ที่ hold เพราะ gate กลับ step เดิม · gate 4 → ค้างจนคนกด retry", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "held", hold: { reason: "gate", ref: "ux-signoff", prevStep: "execution" } }),
    "BE-002": mkTask({ taskId: "BE-002", step: "held", hold: { reason: "gate", ref: "qa-critical", prevStep: "awaiting-qa" } }),
  };
  const d1 = route(mkEvent({ kind: "gate-answered", sessionId: "ui", taskIds: ["BE-001"], gateId: "ux-signoff" }), tasks, CFG);
  assert.equal(d1.ruleId, "R22");
  assert.deepEqual(d1.dispatch, [{ kind: "record-only", role: "uxui-designer", taskIds: [] }]);
  assert.equal(stepVal(d1, "BE-001"), "execution");
  assert.equal(stepOf(d1, "BE-001")!.hold, null);
  assert.equal(stepVal(d1, "BE-002"), undefined); // gate 4 ไม่ปลดด้วยคำตอบ

  const d2 = route(mkEvent({ kind: "gate-answered", sessionId: "ui", taskIds: ["BE-002"], gateId: "qa-critical" }), tasks, CFG);
  assert.equal(stepVal(d2, "BE-002"), undefined); // ยังค้าง
  assert.ok(d2.log.some((l) => l.includes("ค้างจนคนกด retry")));

  const d3 = route(mkEvent({ kind: "human-retry", sessionId: "ui", taskIds: ["BE-002"] }), tasks, CFG);
  assert.equal(stepVal(d3, "BE-002"), "awaiting-qa"); // กลับ step เดิม
  assert.equal(stepOf(d3, "BE-002")!.hold, null);
  assert.deepEqual(d3.counters, []); // retry ของคนไม่ reset ตัวนับ — fail ถัดไปเข้า R5
});

// --- R23 (securityGate — G2-f) ---
test("R23: qa/feature-qa มี securityGate → securityMarks ประมวลร่วมกับแถว outputState · ไม่ hold ไม่นับรอบ", () => {
  const tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }) };
  const d = route(
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "PASS", securityGate: [{ phase: "1", reason: "แตะ auth flow" }],
        qa: { roundFile: "qa/round-1.md", checks: [], perTask: [{ task: "BE-001", verdict: "verified" }], defects: [] },
      }),
    }),
    tasks, CFG,
  );
  assert.deepEqual(d.securityMarks, [{ phase: "1", reason: "แตะ auth flow" }]);
  assert.equal(stepVal(d, "BE-001"), "verified"); // แถว R6 ยังเดิน
  assert.deepEqual(d.counters, []); // ไม่นับรอบ
  assert.deepEqual(d.gates, []); // ไม่ hold
  assert.ok(d.log.some((l) => JSON.parse(l).ruleId === "R23"));
});

// --- R24 (Owner reviewer/security + anchor > 1 — AC-079) ---
test("R24: แถว Owner reviewer → hold plan-error (ref owner:reviewer) + dependents · task อื่นเดินต่อ · handoff ทับรายไม่ถูกตัดสิน · แก้แล้วปลด", () => {
  const tasks = {
    "REV-001": mkTask({ taskId: "REV-001", owner: "reviewer", step: "waiting-deps" }),
    "BE-001": mkTask({ taskId: "BE-001", step: "waiting-deps", depends: ["REV-001"] }),
    "OK-001": mkTask({ taskId: "OK-001", step: "waiting-deps", depends: [] }),
  };
  const d1 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), tasks, CFG);
  assert.equal(d1.ruleId, "R24");
  assert.deepEqual(stepOf(d1, "REV-001")!.hold, { reason: "plan-error", ref: "owner:reviewer", prevStep: "waiting-deps" });
  assert.equal(stepOf(d1, "BE-001")!.hold!.reason, "plan-error"); // dependent
  assert.equal(stepVal(d1, "OK-001"), "runnable"); // task อื่นเดินต่อ (แบบ R9)
  assert.deepEqual(d1.dispatch, []); // ไม่ dispatch

  // handoff ของแถว plan-error → R24 เด่น — verdict ไม่ถูกใช้
  const held = {
    ...tasks,
    "REV-001": mkTask({ taskId: "REV-001", owner: "reviewer", step: "held", hold: { reason: "plan-error", ref: "owner:reviewer", prevStep: "execution" } }),
  };
  const d2 = route(
    mkEvent({ taskIds: ["REV-001"], sessionKind: "execution", handoff: mkHandoff({ outputState: "DONE", role: "reviewer" }) }),
    held, CFG,
  );
  assert.equal(d2.ruleId, "R24");
  assert.equal(stepVal(d2, "REV-001"), undefined); // ไม่ขยับ

  // plan แก้แล้ว (owner เปลี่ยน) → ปลดทั้งสาย
  const fixed = {
    "REV-001": mkTask({ taskId: "REV-001", owner: "backend-engineer", step: "held", hold: { reason: "plan-error", ref: "owner:reviewer", prevStep: "execution" } }),
    "BE-001": mkTask({ taskId: "BE-001", step: "held", hold: { reason: "plan-error", ref: "owner:reviewer", prevStep: "waiting-deps" }, depends: ["REV-001"] }),
    "OK-001": mkTask({ taskId: "OK-001", step: "runnable" }),
  };
  const d3 = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), fixed, CFG);
  assert.equal(stepVal(d3, "REV-001"), "execution"); // กลับ step เดิม
  assert.equal(stepOf(d3, "BE-001")!.hold, null);
});

test("R24: anchor > 1 ใน phase → hold plan-error ref multi-anchor ทุกแถว + dependents (DES-019 §anchor)", () => {
  const tasks = {
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "runnable", planPhase: "6" }),
    "QA-002": mkTask({ taskId: "QA-002", owner: "qa-engineer", step: "runnable", planPhase: "6" }),
    "FE-001": mkTask({ taskId: "FE-001", owner: "frontend-engineer", step: "waiting-deps", depends: ["QA-001"], planPhase: "6" }),
  };
  const d = route(mkEvent({ kind: "plan-changed", sessionId: "tick", taskIds: [] }), tasks, CFG);
  assert.equal(d.ruleId, "R24");
  assert.equal(stepOf(d, "QA-001")!.hold!.ref, "multi-anchor");
  assert.equal(stepOf(d, "QA-002")!.hold!.ref, "multi-anchor");
  assert.equal(stepOf(d, "FE-001")!.hold!.reason, "plan-error");
});

// --- AC-069 deterministic · AC-073 statusWrites · AC-067 ไม่ import camp/LLM ---
test("AC-069: input เดียวกัน → Decision เดียวกัน (pure — route 2 ครั้ง deepEqual)", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "runnable" }),
  };
  const event = mkEvent({
    taskIds: ["BE-001"], sessionKind: "qa", sessionRole: "qa-engineer",
    handoff: mkHandoff({
      role: "qa-engineer", outputState: "FAIL",
      qa: { roundFile: "qa/round-1.md", checks: [], perTask: [{ task: "BE-001", verdict: "blocked" }], defects: [defect({ id: "QA-001", task: "BE-001" })] },
    }),
    phases: { "1": mkPhase() },
  });
  const d1 = route(event, tasks, CFG);
  const d2 = route(event, tasks, CFG);
  assert.deepEqual(d1, d2);
  assert.deepEqual(JSON.parse(JSON.stringify(d1)), JSON.parse(JSON.stringify(d1))); // log เป็น JSON ทุกบรรทัด (router.log)
});

test("AC-073: statusWrites มีแค่ verified/blocked ทุก decision ในชุดทดสอบนี้", () => {
  const tasks = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-qa", fixRounds: 2 }),
    "QA-001": mkTask({ taskId: "QA-001", owner: "qa-engineer", step: "qa" }),
  };
  const qa = (perTask: { task: string; verdict: "verified" | "blocked" }[]): RouterEvent =>
    mkEvent({
      taskIds: ["BE-001", "BE-002"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({ role: "qa-engineer", outputState: "FAIL", qa: { roundFile: "qa/r.md", checks: [], perTask, defects: [] } }),
    });
  const ds = [
    route(qa([{ task: "BE-001", verdict: "verified" }, { task: "BE-002", verdict: "blocked" }]), tasks, CFG),
    route(mkEvent({
      taskIds: ["QA-001"], sessionKind: "feature-qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({ role: "qa-engineer", outputState: "PASS", featureQa: { phase: "1", roundFile: "qa/r2.md", flows: [{ flow: "f", ref: "AC-001", result: "PASS" }], defects: [] } }),
    }), tasks, CFG),
  ];
  for (const d of ds) {
    for (const w of d.statusWrites) assert.ok(w.value === "verified" || w.value === "blocked", `statusWrite ต้องเป็น verified|blocked — ได้ ${String(w.value)}`);
  }
});

test("AC-067: router ไม่ import camp adapter / LLM client (pure — ตัดสินจาก state+เอกสารล้วน)", () => {
  const src = readFileSync(new URL("../src/core/router.ts", import.meta.url), "utf8");
  assert.equal(src.includes("camps/"), false);
  assert.equal(src.includes("camp-adapter"), false);
  assert.equal(/import\s+[^;]*\bllm\b/i.test(src), false);
  assert.equal(src.includes("fetch("), false);
});

// --- วงจรต่อเนื่อง (state เดินข้าม event — ฐานของ resume/AC-070): ตัวนับไม่ reset ระหว่าง event ---
test("ต่อเนื่อง: review FAIL → fix → QA blocked → fix → QA blocked รอบที่ 3 → R5 gate 4 (fixRounds ตัวเดียวต่อ task)", () => {
  let t = mkTask({ taskId: "BE-001", step: "awaiting-review" });
  const apply = (d: Decision): void => {
    const tr = d.transitions.find((x) => x.taskId === "BE-001");
    if (tr) { t = { ...t, step: tr.step }; if (tr.hold !== undefined) t = { ...t, hold: tr.hold }; }
    const c = d.counters.find((x) => x.taskId === "BE-001");
    if (c) t = { ...t, fixRounds: t.fixRounds + c.fixRounds, crashRestarts: t.crashRestarts + c.crashRestarts };
  };
  const reviewFail = (): RouterEvent =>
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "review", sessionRole: "reviewer",
      handoff: mkHandoff({
        role: "reviewer", outputState: "FAIL",
        review: { roundFile: "review/round-1.md", perTask: [{ task: "BE-001", verdict: "FAIL" }], findings: [finding({ id: "REV-001", task: "BE-001" })] },
      }),
    });
  const qaBlocked = (): RouterEvent =>
    mkEvent({
      taskIds: ["BE-001"], sessionKind: "qa", sessionRole: "qa-engineer",
      handoff: mkHandoff({
        role: "qa-engineer", outputState: "FAIL",
        qa: { roundFile: "qa/round-1.md", checks: [], perTask: [{ task: "BE-001", verdict: "blocked" }], defects: [defect({ id: "QA-001", task: "BE-001" })] },
      }),
    });
  const d1 = route(reviewFail(), { "BE-001": t }, CFG); apply(d1);
  assert.equal(d1.ruleId, "R4");
  assert.equal(t.fixRounds, 1);
  t = { ...t, currentSessionId: null };
  const d2 = route(qaBlocked(), { "BE-001": t }, CFG); apply(d2);
  assert.equal(d2.ruleId, "R4");
  assert.equal(t.fixRounds, 2); // รวม review+QA — ตัวนับเดียว (DES-018 §ตัวนับ)
  t = { ...t, currentSessionId: null };
  const d3 = route(qaBlocked(), { "BE-001": t }, CFG); apply(d3);
  assert.equal(d3.ruleId, "R5"); // fail ครั้งที่ 3 → gate 4
  assert.equal(stepOf(d3, "BE-001")!.hold!.ref, "qa-critical");
  assert.equal(t.fixRounds, 2); // ไม่เกิน limit
});

after(() => { /* pure — ไม่มี fixture บนดิสก์ */ });
