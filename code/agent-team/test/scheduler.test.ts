// BE-011 — DAG scheduler (DES-001 §DAG scheduler): คิว deterministic (AC-043/AC-044/AC-045) · session group OQ-12 (AC-041) ·
// review wave / QA round ผ่าน batching ของ BE-021 โดย driver คำนวณ freeSlots/remainingBusy/activeExecutions/tpReady ·
// นิยาม phase 🔒 3 แหล่ง (AC-080) · satisfied(dep) เต็ม — anchor ⇔ phase cleared (DES-019) · legacy = serial (AC-074) ·
// ขนาด diff จาก numstat ของ diff.patch (BE-008/BE-021)
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  activeSessions, claimCollides, depsSatisfiedFull, diffSizeOf, dispatchCap, freeSlots, groupExecutions,
  orderedRunnable, phaseInfos, qaDispatch, reviewDispatches, rowOrder, sizeOf, stepForKind,
  tpPhasesOf, tpReadyOf, uxuiAnsweredOf,
} from "../src/core/scheduler.ts";
import type { RouterConfig, RouterPhaseInfo, RouterTask } from "../src/core/router.ts";
import type { HandoffV2, RunJson, SessionRecord } from "../src/core/state-store.ts";

const CFG: RouterConfig = {
  maxParallelSessions: 3, fixRoundLimit: 2, crashRestartLimit: 1,
  reviewWave: { maxTasks: 4, maxDiffLines: 800 }, largeTask: { diffLines: 400, files: 10 },
};

const mkTask = (over: Partial<RouterTask> & { taskId: string }): RouterTask => ({
  owner: "backend-engineer", planPhase: "1", group: null, step: "runnable", hold: null,
  attempt: 0, fixRounds: 0, crashRestarts: 0, currentSessionId: null, sessionIds: [], touchedFiles: [],
  lastVerdict: null, defectPacket: null, humanActions: [], depends: [], securitySensitive: false, ...over,
});

const mkSession = (over: Partial<SessionRecord> & { sessionId: string; seq: number }): SessionRecord => ({
  kind: "execution", role: "backend-engineer", taskIds: ["BE-001"], planPhase: "1", attempt: 1,
  camp: "claude", model: "sonnet", effort: "medium", tier: "T5", modelBasis: "tier", effortBasis: "tier", basisReason: "",
  packetPath: `sessions/${over.sessionId}/packet.json`, rolePromptHash: `sha256:${"a".repeat(64)}`, cliVersion: null,
  pid: null, cliSessionId: null, claim: [], contextFiles: [], priorSession: null,
  startedAt: "2026-10-06T00:00:00Z", endedAt: null, exitCode: null, outcome: null, handoff: null, logsPath: "",
  writeAudit: { mode: "manifest", partial: false, diffApprox: false, changed: [], touchedFiles: [], violations: [], gitRefs: [] },
  ...over,
});

const mkRun = (over: Partial<RunJson> = {}): RunJson => ({
  runId: "r-20261006-000000-abcd", module: "alpha", mode: "new-work", status: "running", planFormat: "v2",
  scheduler: CFG, newWorkText: null,
  createdAt: "2026-10-06T00:00:00Z", updatedAt: "2026-10-06T00:00:00Z",
  configSnapshot: { routing: "sha256:a", tiers: "sha256:b", camps: "sha256:c", gates: "sha256:d" },
  gitPolicy: [], tasks: {}, phases: {}, sessions: [], gateLog: [],
  ...over,
});

const mkHandoff = (over: Partial<HandoffV2> = {}): HandoffV2 => ({
  role: "backend-engineer", module: "alpha", sessionId: "s-1-abcd", outputState: "DONE",
  result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none",
  questionsForHuman: [], blocker: null, impactedTasks: null, decision: null,
  review: null, qa: null, featureQa: null, security: null, securityGate: null, ...over,
});

// --- เพดาน (AC-045) + legacy serial (AC-074) ---
test("dispatchCap: เพดาน − active = slot ว่าง · legacy เหลือ 1 เสมอ (AC-045/AC-074)", () => {
  const run = mkRun({
    sessions: [
      mkSession({ sessionId: "s-0-aaaa", seq: 0 }),
      mkSession({ sessionId: "s-1-bbbb", seq: 1, endedAt: "2026-10-06T00:01:00Z", outcome: "completed" }),
    ],
  });
  assert.equal(activeSessions(run).length, 1);
  assert.equal(freeSlots(run), 2);
  assert.equal(dispatchCap(run), 2); // 3 − 1 active
  assert.equal(dispatchCap(mkRun({ planFormat: "legacy", sessions: [] })), 1); // serial ต่อ module
  assert.equal(dispatchCap(mkRun({ scheduler: { ...CFG, maxParallelSessions: 2 }, sessions: [mkSession({ sessionId: "s-0-aaaa", seq: 0 }), mkSession({ sessionId: "s-2-cccc", seq: 2 })] })), 0);
});

test("claimCollides: overlap แบบ prefix (DES-021 ข้อ 2) — claim เดียวกันชน, คนละกิ่งผ่าน", () => {
  const active = [mkSession({ sessionId: "s-0-aaaa", seq: 0, claim: ["codeRoots/be-100/**"] })];
  assert.equal(claimCollides(active, ["codeRoots/be-100/x.ts"]), true);
  assert.equal(claimCollides(active, ["codeRoots/be-200/**"]), false);
});

// --- คิว execution: Phase น้อยก่อน → ลำดับแถว (deterministic — DES-001) ---
test("orderedRunnable: phase 2 ก่อน 10, ลำดับแถวตาม plan · ตัด held/active/anchor ออก", () => {
  const tasks: Record<string, RouterTask> = {
    "BE-010": mkTask({ taskId: "BE-010", planPhase: "10" }),
    "BE-002": mkTask({ taskId: "BE-002", planPhase: "2" }),
    "BE-001": mkTask({ taskId: "BE-001", planPhase: "2", step: "runnable" }),
    "BE-003": mkTask({ taskId: "BE-003", planPhase: "1", step: "held", hold: { reason: "blocked", ref: null, prevStep: "runnable" } }),
    "BE-004": mkTask({ taskId: "BE-004", planPhase: "1", currentSessionId: "s-0-aaaa" }),
    "QA-001": mkTask({ taskId: "QA-001", planPhase: "1", owner: "qa-engineer" }),
  };
  const order = rowOrder(null);
  const out = orderedRunnable(mkRun(), tasks, order);
  assert.deepEqual(out.map((t) => t.taskId), ["BE-001", "BE-002", "BE-010"]); // phase 2 ก่อน 10 · แถว BE-001 ก่อน BE-002
});

// --- session group (OQ-12 — AC-041): default ไม่รวม · รวมเมื่อ owner/phase เดียว + ไม่มี Depends ระหว่างสมากิก ---
test("groupExecutions: default 1 task ต่อ packet (AC-041) · group ผ่านเกณฑ์ → packet เดียว · ไม่ผ่าน → แยก + หมายเหตุ", () => {
  const solo = groupExecutions([mkTask({ taskId: "BE-001" }), mkTask({ taskId: "BE-002" })]);
  assert.deepEqual(solo.map((d) => d.taskIds), [["BE-001"], ["BE-002"]]); // default ไม่รวม

  const grouped = groupExecutions([
    mkTask({ taskId: "BE-001", group: "g1" }),
    mkTask({ taskId: "BE-002", group: "g1" }),
  ]);
  assert.deepEqual(grouped.map((d) => [d.kind, d.taskIds]), [["execution", ["BE-001", "BE-002"]]]);

  const mixedOwner = groupExecutions([
    mkTask({ taskId: "BE-001", group: "g1" }),
    mkTask({ taskId: "FE-001", group: "g1", owner: "frontend-engineer" }),
  ]);
  assert.deepEqual(mixedOwner.map((d) => d.taskIds), [["BE-001"], ["FE-001"]]);
  assert.ok(mixedOwner.every((d) => d.note !== null)); // หมายเหตุบน dashboard (OQ-12)

  const internalDep = groupExecutions([
    mkTask({ taskId: "BE-001", group: "g1" }),
    mkTask({ taskId: "BE-002", group: "g1", depends: ["BE-001"] }),
  ]);
  assert.deepEqual(internalDep.map((d) => d.taskIds), [["BE-001"], ["BE-002"]]);
});

// --- review wave (AC-051) — freeSlots/remainingBusy เป็น input ที่ scheduler คำนวณ ---
test("reviewDispatches: batch ตาม phase · ยังมี runnable/execution ใน phase → รอ · ไม่มี slot → ว่าง", () => {
  const tasks: Record<string, RouterTask> = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-review" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-review" }),
    "BE-003": mkTask({ taskId: "BE-003", step: "execution", currentSessionId: "s-0-aaaa" }),
  };
  const run = mkRun({ tasks: {}, sessions: [mkSession({ sessionId: "s-0-aaaa", seq: 0 })] });
  const sizes = () => ({ lines: 10, files: 1 });
  const waves = reviewDispatches(run, tasks, CFG, sizes, rowOrder(null));
  assert.deepEqual(waves.map((w) => w.taskIds), []); // remainingBusy 1 (BE-003) → ยังไม่เปิด (DES-019 ข้อ 4)

  const quiet = reviewDispatches(mkRun(), { ...tasks, "BE-003": mkTask({ taskId: "BE-003", step: "verified" }) }, CFG, sizes, rowOrder(null));
  assert.deepEqual(quiet.map((w) => [w.kind, w.taskIds, w.phase]), [["review", ["BE-001", "BE-002"], "1"]]);

  const full = mkRun({ scheduler: { ...CFG, maxParallelSessions: 1 }, sessions: [mkSession({ sessionId: "s-0-aaaa", seq: 0, endedAt: "2026-10-06T00:01:00Z", outcome: "completed" })] });
  assert.equal(reviewDispatches(full, { ...tasks, "BE-003": mkTask({ taskId: "BE-003", step: "verified" }) }, { ...CFG, maxParallelSessions: 1 }, sizes, rowOrder(null)).length, 1);
  // session เต็มเพดาน → ไม่เปิด wave (dispatchCap อ่านจาก run.scheduler — freeze)
  const busy = mkRun({ scheduler: { ...CFG, maxParallelSessions: 1 }, sessions: [mkSession({ sessionId: "s-0-aaaa", seq: 0 })] });
  assert.deepEqual(reviewDispatches(busy, tasks, { ...CFG, maxParallelSessions: 1 }, sizes, rowOrder(null)).length, 0);
});

// --- REV-046 — ลำดับแถวในตาราง Tasks (DES-019 §review wave ข้อ 3) — ไม่ใช่ taskId.localeCompare ---
test("reviewDispatches: ผู้สมัครเรียงตามลำดับแถว plan (ข้อ 3) — wave pack ตามแถว ไม่ใช่ lexicographic id (REV-046)", () => {
  const tasks: Record<string, RouterTask> = {
    "BE-200": mkTask({ taskId: "BE-200", step: "awaiting-review" }),
    "BE-100": mkTask({ taskId: "BE-100", step: "awaiting-review" }),
  }; // ลำดับ id ≠ ลำดับแถว — ตาราง Tasks: แถว BE-200 อยู่ก่อน BE-100
  const plan = {
    format: "v2" as const, needsMigration: false,
    rows: [
      { id: "BE-200", name: "b", owner: "backend-engineer", phase: "1", depends: [], status: "pending" as const, line: 8 },
      { id: "BE-100", name: "a", owner: "backend-engineer", phase: "1", depends: [], status: "pending" as const, line: 9 },
    ],
    phases: [], waiting: [], issues: [],
  };
  const sizes = () => ({ lines: 10, files: 1 });
  const waves = reviewDispatches(mkRun(), tasks, CFG, sizes, rowOrder(plan));
  assert.deepEqual(waves.map((w) => w.taskIds), [["BE-200", "BE-100"]]); // ตามลำดับแถว — localeCompare จะให้ BE-100 ก่อน
  const noOrder = reviewDispatches(mkRun(), tasks, CFG, sizes, rowOrder(null));
  assert.deepEqual(noOrder.map((w) => w.taskIds), [["BE-100", "BE-200"]]); // ไม่มี order → tiebreak id (deterministic)
});

// --- QA round (AC-054/AC-061 + quiesce) ---
test("qaDispatch: รวมผู้สมัคร ณ ตอนเปิด · tp ไม่พร้อม / มี execution / ไม่มี slot → null (quiesce)", () => {
  const tasks: Record<string, RouterTask> = {
    "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa" }),
    "BE-002": mkTask({ taskId: "BE-002", step: "awaiting-qa" }),
  };
  const ok = qaDispatch(mkRun(), tasks, () => true);
  assert.deepEqual(ok === null ? null : [ok.kind, ok.taskIds, ok.quiesce], ["qa", ["BE-001", "BE-002"], true]);

  assert.equal(qaDispatch(mkRun(), tasks, () => false), null); // AC-061 — test-planner ยังไม่ DONE
  const busy = mkRun({ sessions: [mkSession({ sessionId: "s-0-aaaa", seq: 0, taskIds: ["BE-003"] })] });
  const withBusy: Record<string, RouterTask> = {
    ...tasks,
    "BE-003": mkTask({ taskId: "BE-003", step: "execution", currentSessionId: "s-0-aaaa" }),
  };
  assert.equal(qaDispatch(busy, withBusy, () => true), null); // quiesce ข้อ 3 — รอตัวที่รันอยู่จบ
});

test("tpReadyOf: phase มี task ของ test-planner ที่ยังไม่ verified → ไม่พร้อม (AC-061)", () => {
  const tasks: Record<string, RouterTask> = {
    "TP-001": mkTask({ taskId: "TP-001", owner: "test-planner", step: "execution", currentSessionId: "s-0-aaaa" }),
    "BE-001": mkTask({ taskId: "BE-001" }),
  };
  assert.equal(tpReadyOf(tasks, "1"), false);
  assert.equal(tpReadyOf({ ...tasks, "TP-001": mkTask({ taskId: "TP-001", owner: "test-planner", step: "verified" }) }, "1"), true);
  assert.equal(tpReadyOf(tasks, "2"), true); // ไม่มี test-planner ใน phase นั้น
});

// --- นิยาม phase 🔒 3 แหล่ง (AC-080) + สถานะ phase ที่ router อ่าน ---
test("phaseInfos: locked = แถว 🔒 ∨ Security-sensitive ∨ securityGate · cleared/featureQa/hold จาก run.json", () => {
  const plan = {
    format: "v2" as const, needsMigration: false, rows: [], waiting: [], issues: [],
    phases: [{ label: "1", name: "a", tasks: [], note: "", locked: false }, { label: "2", name: "b", tasks: [], note: "", locked: true }],
  };
  const tasks: Record<string, RouterTask> = {
    "BE-001": mkTask({ taskId: "BE-001", planPhase: "1" }),
    "BE-002": mkTask({ taskId: "BE-002", planPhase: "2", securitySensitive: false }),
    "BE-003": mkTask({ taskId: "BE-003", planPhase: "3", securitySensitive: true }),
  };
  const run = mkRun({
    phases: { "1": { featureQa: "pass", featureQaSessionId: "s-0-aaaa", cleared: true, hold: null }, "2": { featureQa: "fail", featureQaSessionId: null, cleared: false, hold: { reason: "feature-qa-unattributed" } } },
    sessions: [mkSession({ sessionId: "s-0-aaaa", seq: 0, handoff: mkHandoff({ securityGate: [{ phase: "4", reason: "r" }] }) })],
  });
  const info = phaseInfos(run, plan, tasks);
  assert.equal(info["1"]!.locked, false);
  assert.equal(info["1"]!.cleared, true);
  assert.equal(info["1"]!.featureQa, "pass");
  assert.equal(info["2"]!.locked, true); // แถว ## Phases มี 🔒
  assert.equal(info["2"]!.hold, "feature-qa-unattributed"); // hold phase → R18 ไม่เปิด
  assert.equal(info["3"]!.locked, true); // task Security-sensitive: yes
  assert.equal(info["4"]!.locked, true); // securityGate ใน sessions[]
});

// --- ขนาด diff (BE-021 อ่านจาก numstat 2 คอลัมน์แรกของ diff.patch) ---
test("diffSizeOf: นับเฉพาะบรรทัด numstat · ข้าม # · วัดไม่ได้ = null (ถือเป็นใหญ่)", () => {
  assert.deepEqual(diffSizeOf(null), null);
  assert.deepEqual(diffSizeOf("# numstat: added\tdeleted\tpath\n# approx: x\n12\t3\ta.ts\n0\t1\tb.ts\n"), { lines: 12, files: 2 });
  assert.deepEqual(diffSizeOf("# approx: x (ไม่มี pre-image)\n"), { lines: 0, files: 0 });
});

test("sizeOf: อ่าน diff.patch ของ execution session ล่าสุดของ task · ไม่เคยมี execution = null", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "be011-sched-"));
  try {
    const sess = path.join(tmp, "sessions", "s-1-abcd");
    mkdirSync(sess, { recursive: true });
    writeFileSync(path.join(sess, "diff.patch"), "5\t2\ta.ts\n");
    const run = mkRun({
      sessions: [
        mkSession({ sessionId: "s-0-aaaa", seq: 0 }),
        mkSession({ sessionId: "s-1-abcd", seq: 1, endedAt: "2026-10-06T00:01:00Z", outcome: "completed" }),
      ],
    });
    const size = sizeOf(run, "BE-001", (sid) => path.join(tmp, "sessions", sid, "diff.patch"), (abs) => readTextOf(abs));
    assert.deepEqual(size, { lines: 5, files: 1 });
    assert.equal(sizeOf(run, "BE-999", (sid) => path.join(tmp, "sessions", sid, "diff.patch"), readTextOf), null);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
import { readFileSync } from "node:fs";
const readTextOf = (abs: string): string | null => {
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return null;
  }
};

// --- satisfied(dep) เต็มของ DES-001 (amendment Rev 11/12) ---
test("depsSatisfiedFull: anchor ⇔ phase cleared · test-planner ⇔ แถว TP · uxui ⇔ gate 3 answered · อื่น = verified", () => {
  const cleared = new Set(["1"]);
  const tp = new Set(["2"]);
  const ctx = { clearedPhases: cleared, tpPhases: tp, uxuiAnswered: (id: string) => id === "UX-001" };
  assert.equal(depsSatisfiedFull(mkTask({ taskId: "QA-100", owner: "qa-engineer", planPhase: "1", step: "waiting-deps" }), ctx), true);
  assert.equal(depsSatisfiedFull(mkTask({ taskId: "QA-100", owner: "qa-engineer", planPhase: "2", step: "verified" }), ctx), false); // verified เองไม่พอ — รอ phase cleared (ไม่ deadlock แบบรอ Depends)
  assert.equal(depsSatisfiedFull(mkTask({ taskId: "TP-001", owner: "test-planner", planPhase: "2", step: "execution" }), ctx), true);
  assert.equal(depsSatisfiedFull(mkTask({ taskId: "UX-001", owner: "uxui-designer", planPhase: "1", step: "awaiting-review" }), ctx), true);
  assert.equal(depsSatisfiedFull(mkTask({ taskId: "BE-001", step: "verified" }), ctx), true);
  assert.equal(depsSatisfiedFull(mkTask({ taskId: "BE-001", step: "awaiting-qa" }), ctx), false); // เสร็จจริง = verified (OQ-10)
});

test("tpPhasesOf + uxuiAnsweredOf: ตาราง TP|Phase + gate 3 answered ครอบ task (scope task/module)", () => {
  assert.deepEqual(tpPhasesOf(null), new Set());
  assert.deepEqual(
    tpPhasesOf("| TP | Phase | REQ/AC | ไฟล์ |\n|---|---|---|---|\n| TP-001 | 3 | REQ-001 | round-1.md |\n| x | 9 | — | — |\n"),
    new Set(["3"]),
  );
  const run = mkRun({
    gateLog: [
      { gateId: "ux-signoff", sessionId: null, scope: "task", taskIds: ["UX-001"], phase: "1", question: "q", owner: { name: "j" }, status: "answered", answeredBy: "j", answeredAt: "2026-10-06T00:00:00Z", answer: "a", note: null, recordSessionId: null },
      { gateId: "ux-signoff", sessionId: null, scope: "task", taskIds: ["UX-001"], phase: "1", question: "q", owner: { name: "j" }, status: "open", answeredBy: null, answeredAt: null, answer: null, note: null, recordSessionId: null },
    ],
  });
  assert.equal(uxuiAnsweredOf(run, "UX-001"), false); // last-wins — instance ล่าสุด open
  const answered = mkRun({ gateLog: [run.gateLog[0]!] });
  assert.equal(uxuiAnsweredOf(answered, "UX-001"), true);
  assert.equal(uxuiAnsweredOf(answered, "UX-002"), false);
  const moduleWide = mkRun({ gateLog: [{ ...answered.gateLog[0]!, scope: "module", taskIds: [] }] });
  assert.equal(uxuiAnsweredOf(moduleWide, "UX-002"), true);
});

test("stepForKind: execution/review/qa เดิน step · change/feature-qa/security/record-only เป็นของ Decision ของ router", () => {
  assert.equal(stepForKind("execution"), "execution");
  assert.equal(stepForKind("review"), "review");
  assert.equal(stepForKind("qa"), "qa");
  assert.equal(stepForKind("feature-qa"), null);
  assert.equal(stepForKind("change"), null);
  assert.equal(stepForKind("security"), null);
  assert.equal(stepForKind("record-only"), null);
});

test("phaseInfos: task ใน phase ที่ไม่มีแถว ## Phases ยังอ่านได้ (Security-sensitive อย่างเดียวพอ)", () => {
  const tasks: Record<string, RouterTask> = { "BE-001": mkTask({ taskId: "BE-001", planPhase: "9", securitySensitive: true }) };
  const info = phaseInfos(mkRun(), null, tasks);
  assert.equal(info["9"]!.locked, true);
  assert.equal(info["9"]!.featureQa, "not-ready");
});

// RouterPhaseInfo ใช้ตรงตาม BE-019 — รูป field ตายตัว
test("RouterPhaseInfo รูปตรง BE-019 (locked/cleared/featureQa/hold)", () => {
  const info: RouterPhaseInfo = { locked: false, cleared: false, featureQa: "not-ready", hold: null };
  assert.deepEqual(Object.keys(info).sort(), ["cleared", "featureQa", "hold", "locked"]);
});
