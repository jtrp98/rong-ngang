// BE-007 — runtime state store v2 (DES-007): atomic write ทน crash จำลอง · run.json เสีย → quarantine + ปฏิเสธ resume
// resume reconcile เอกสารชนะ (AC-003/AC-034) · counters/sessionId ไม่ลง module docs (AC-065) · phases{}/handoff.securityGate คงค่าข้ามปิด-เปิด
// test ใช้ fixture dir (os.tmpdir) เสมอ — ห้ามเขียน state จริงระหว่าง test
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parsePlanIndex } from "../src/core/plan-parser.ts";
import {
  StateError,
  appendRouterLog,
  collectSecurityGates,
  createRun,
  ensureSessionDir,
  findOpenSessions,
  getPointer,
  loadRun,
  newRunId,
  newSessionId,
  reconcileRun,
  saveRun,
  setPointer,
  statePaths,
  updateRun,
  type GateRecord,
  type HandoffV2,
  type RunJson,
  type SessionRecord,
  type TaskRuntime,
} from "../src/core/state-store.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be007-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
const home = (): string => {
  const h = path.join(tmp, `h${++n}`);
  mkdirSync(h, { recursive: true });
  return h;
};

const SNAP = { routing: "sha256:aaa", tiers: "sha256:bbb", camps: "sha256:ccc", gates: "sha256:ddd" };
const SCHED = {
  maxParallelSessions: 2, fixRoundLimit: 2, crashRestartLimit: 1,
  reviewWave: { maxTasks: 5, maxDiffLines: 400 }, largeTask: { diffLines: 300, files: 8 },
};
type CreateInit = Parameters<typeof createRun>[1];
const mkRun = (h: string, over: Partial<CreateInit> = {}): RunJson =>
  createRun(h, { module: "agent-team", mode: "new-work", planFormat: "v2", scheduler: SCHED, newWorkText: null, configSnapshot: SNAP, ...over });

const mkTask = (over: Partial<TaskRuntime> & { taskId: string }): TaskRuntime => ({
  owner: "backend-engineer", planPhase: "1", group: null, step: "waiting-deps", hold: null,
  attempt: 0, fixRounds: 0, crashRestarts: 0, currentSessionId: null, sessionIds: [], touchedFiles: [],
  lastVerdict: null, defectPacket: null, humanActions: [], ...over,
});

const mkSession = (over: Partial<SessionRecord> & { sessionId: string; seq: number }): SessionRecord => ({
  kind: "execution", role: "backend-engineer", taskIds: ["BE-001"], planPhase: "1", attempt: 1,
  camp: "claude", model: "m", effort: null, tier: null,
  modelBasis: "role-default", effortBasis: "role-default", basisReason: "—",
  packetPath: `sessions/${over.sessionId}/packet.json`, rolePromptHash: "sha256:rp", cliVersion: null,
  pid: null, cliSessionId: null, claim: [], contextFiles: [], priorSession: null,
  startedAt: "2026-10-06T00:00:00.000Z", endedAt: null, exitCode: null, outcome: null,
  handoff: null, logsPath: `sessions/${over.sessionId}/session.log`,
  writeAudit: { mode: "manifest", partial: false, diffApprox: false, changed: [], touchedFiles: [], violations: [], gitRefs: [] },
  ...over,
});

const gate = (over: Partial<GateRecord> & { gateId: GateRecord["gateId"] }): GateRecord => ({
  sessionId: null, scope: "task", taskIds: [], phase: null, question: "ต้องตัดสินอะไร", owner: { name: "user" },
  status: "open", answeredBy: null, answeredAt: null, answer: null, note: null, recordSessionId: null, ...over,
});

const HEAD = "| Task | Name | Owner | Phase | Depends | Status |\n|---|---|---|---|---|---|\n";
const WAIT = "## Waiting on Human\n\n| # | q | o | d | b |\n|---|---|---|---|---|\n\n";
const planText = (rows: string, phases = "| 1 | a | BE-001 | — |"): string =>
  `# P\n\n## Phases\n\n| Phase | ชื่อ | Tasks | หมายเหตุ |\n|---|---|---|---|\n${phases}\n\n${WAIT}## Tasks\n\n${HEAD}${rows}\n`;
const planOf = (rows: string, phases?: string) => parsePlanIndex(planText(rows, phases));

test("createRun: โครง state ตาม DES-007 + run.json ตรง data-model + pointer ชี้ run + session dir/router.log", () => {
  const h = home();
  const run = mkRun(h);
  const p = statePaths(h);
  assert.match(run.runId, /^r-\d{8}-\d{6}-[0-9a-f]{4}$/);
  assert.match(newRunId(), /^r-\d{8}-\d{6}-[0-9a-f]{4}$/);
  assert.match(newSessionId(7), /^s-7-[0-9a-f]{4}$/);
  assert.deepEqual(
    Object.keys(run).sort(),
    ["configSnapshot", "createdAt", "gateLog", "gitPolicy", "mode", "module", "newWorkText", "phases", "planFormat", "runId", "scheduler", "sessions", "status", "tasks", "updatedAt"],
  );
  assert.equal(run.status, "queued");
  assert.deepEqual(run.configSnapshot, SNAP); // freeze ตอนสร้าง run
  assert.deepEqual(run.gitPolicy, []);
  assert.ok(existsSync(path.join(p.runDir(run.runId), "sessions")));
  assert.ok(existsSync(p.defectsDir(run.runId)));
  assert.equal(getPointer(h, "agent-team"), run.runId);
  const sd = ensureSessionDir(h, run.runId, "s-1-abcd");
  assert.ok(existsSync(sd));
  appendRouterLog(h, "tick 1");
  assert.equal(readFileSync(p.routerLog, "utf8"), "tick 1\n");
});

test("createRun ทับ run เดิมไม่ได้ (fail-closed — ไม่สร้างทับ run.json เดิม)", () => {
  const h = home();
  const run = mkRun(h);
  const file = statePaths(h).runJsonPath(run.runId);
  const before = readFileSync(file, "utf8");
  assert.throws(() => mkRun(h, { runId: run.runId }), (e: unknown) => e instanceof StateError && e.kind === "exists");
  assert.equal(readFileSync(file, "utf8"), before);
});

test("atomic write ทน crash จำลอง: tmp ซากจาก crash ไม่กระทบ run.json — อ่านของเดิมได้/บันทึกต่อได้/ไม่ทิ้ง tmp เอง", () => {
  const h = home();
  const run = mkRun(h);
  const file = statePaths(h).runJsonPath(run.runId);
  const v2 = updateRun(h, run.runId, (r) => ({ ...r, status: "running" }));
  writeFileSync(`${file}.tmp-999-dead`, "{ บรรทัดครึ่ง", "utf8"); // crash จำลอง — ตายระหว่างเขียน tmp
  assert.equal(loadRun(h, run.runId).status, "running"); // ของเดิมไม่เสียหาย
  const v3 = saveRun(h, { ...v2, status: "idle" });
  assert.equal(loadRun(h, run.runId).status, "idle");
  assert.ok(v3.updatedAt >= v2.updatedAt);
  // save เองไม่ทิ้ง tmp เพิ่ม (rename กิน tmp ตัวเองหมด) — ซาก crash คงอยู่แต่ไม่รบกวนการอ่าน/เขียน
  assert.deepEqual(readdirSync(path.dirname(file)).filter((f) => f.includes(".tmp-")), ["run.json.tmp-999-dead"]);
});

test("run.json เสีย → run.json.corrupt-<ts> + ปฏิเสธ resume · ผิดรูป = เสีย · ไม่ถูกสร้างทับ (DES-007)", () => {
  const h = home();
  const run = mkRun(h);
  const file = statePaths(h).runJsonPath(run.runId);
  const dir = path.dirname(file);
  writeFileSync(file, "{ บรรทัดครึ่ง", "utf8");
  assert.throws(() => loadRun(h, run.runId), (e: unknown) => e instanceof StateError && e.kind === "corrupt");
  assert.equal(existsSync(file), false); // ไม่มี run.json ค้างให้ทับ
  let corrupt = readdirSync(dir).filter((f) => f.startsWith("run.json.corrupt-"));
  assert.equal(corrupt.length, 1);
  assert.equal(readFileSync(path.join(dir, corrupt[0]!), "utf8"), "{ บรรทัดครึ่ง");
  // JSON แท้แต่ schema ไม่ตรง → ผิดรูป = เสีย เหมือนกัน
  writeFileSync(file, JSON.stringify({ x: 1 }), "utf8");
  assert.throws(() => loadRun(h, run.runId), (e: unknown) => e instanceof StateError && e.kind === "corrupt");
  corrupt = readdirSync(dir).filter((f) => f.startsWith("run.json.corrupt-"));
  assert.equal(corrupt.length, 2);
  assert.throws(() => mkRun(h, { runId: run.runId }), (e: unknown) => e instanceof StateError && e.kind === "exists");
});

test("run.json หาย → StateError missing — ทาง derive จากเอกสาร (ตัวนับเริ่ม 0) · saveRun ไม่ฟื้นของเสียเอง", () => {
  const h = home();
  const run = mkRun(h);
  rmSync(statePaths(h).runJsonPath(run.runId));
  assert.throws(() => loadRun(h, run.runId), (e: unknown) => e instanceof StateError && e.kind === "missing");
  assert.throws(() => saveRun(h, run), (e: unknown) => e instanceof StateError && e.kind === "missing");
});

test("pointer ต่อ module: roundtrip · หาย → null · เสีย → quarantine + null (ตัวนับเริ่ม 0 ตาม design)", () => {
  const h = home();
  assert.equal(getPointer(h, "agent-team"), null);
  setPointer(h, "agent-team", "r-20261006-000000-aaaa");
  assert.equal(getPointer(h, "agent-team"), "r-20261006-000000-aaaa");
  const pf = statePaths(h).pointerPath("agent-team");
  rmSync(pf);
  assert.equal(getPointer(h, "agent-team"), null);
  writeFileSync(pf, "ไม่ใช่ json", "utf8");
  assert.equal(getPointer(h, "agent-team"), null);
  assert.equal(readdirSync(path.dirname(pf)).filter((f) => f.startsWith("agent-team.json.corrupt-")).length, 1);
});

test("resume reconcile — Status verified ใน plan ชนะ run.json (AC-034) · blocked ชนะ · verified ถอย → reopen-needed · pure", () => {
  const h = home();
  const run = mkRun(h);
  run.tasks = {
    "BE-101": mkTask({ taskId: "BE-101", step: "execution" }),
    "BE-102": mkTask({ taskId: "BE-102", step: "execution" }),
    "BE-103": mkTask({ taskId: "BE-103", step: "verified", lastVerdict: { source: "qa", verdict: "verified", ref: "qa-1.md", sessionId: "s-1-abcd" } }),
    "BE-104": mkTask({ taskId: "BE-104", step: "execution" }),
  };
  const plan = planOf(
    "| BE-101 | a | backend-engineer | 1 | — | verified |\n| BE-102 | b | backend-engineer | 1 | — | blocked |\n| BE-103 | c | backend-engineer | 1 | — | pending |\n| BE-104 | d | backend-engineer | 1 | — | pending |\n",
  );
  const out = reconcileRun(run, plan);
  assert.equal(out.tasks["BE-101"]!.step, "verified"); // เอกสารชนะ
  assert.equal(out.tasks["BE-101"]!.hold, null);
  assert.equal(out.tasks["BE-102"]!.step, "held");
  assert.deepEqual([out.tasks["BE-102"]!.hold!.reason, out.tasks["BE-102"]!.hold!.prevStep], ["blocked", "execution"]);
  assert.equal(out.tasks["BE-103"]!.step, "held"); // run ว่า verified แต่ plan pending
  assert.deepEqual([out.tasks["BE-103"]!.hold!.reason, out.tasks["BE-103"]!.hold!.prevStep], ["reopen-needed", "verified"]);
  assert.equal(out.tasks["BE-104"]!.step, "execution"); // ปกติ — คง runtime
  assert.equal(out.status, run.status); // run.status เป็นของ driver
  assert.equal(out.createdAt, run.createdAt);
  assert.equal(run.tasks["BE-101"]!.step, "execution"); // ต้นฉบับไม่ถูกแก้ (pure)
});

test("resume reconcile — task เพิ่ม: runnable/waiting-deps ตาม DES-001 · anchor = phase cleared (DES-019) · hook depsSatisfied · derive จากเอกสารล้วน", () => {
  const h = home();
  const run = mkRun(h, {
    phases: {
      "1": { featureQa: "not-ready", featureQaSessionId: null, cleared: false, hold: null },
      "2": { featureQa: "pass", featureQaSessionId: "s-2-abcd", cleared: true, hold: null },
    },
  });
  run.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "verified" }) };
  const plan = planOf(
    "| BE-001 | a | backend-engineer | 1 | — | verified |\n"
    + "| BE-002 | b | backend-engineer | 1 | BE-001 | pending |\n"
    + "| BE-003 | c | backend-engineer | 1 | BE-004 | pending |\n"
    + "| BE-004 | d | backend-engineer | 1 | — | pending |\n"
    + "| AN-001 | e | qa-engineer | 2 | — | pending |\n"
    + "| BE-005 | f | backend-engineer | 2 | AN-001 | pending |\n"
    + "| AN-002 | g | qa-engineer | 3 | — | pending |\n"
    + "| BE-006 | h | backend-engineer | 3 | AN-002 | pending |\n"
    + "| UX-001 | i | uxui-designer | 1 | — | pending |\n"
    + "| BE-007 | j | backend-engineer | 1 | UX-001 | pending |\n"
    + "| BE-008 | k | backend-engineer | 1 | — | verified |\n",
    "| 1 | a | BE-001, BE-002, BE-003, BE-004, UX-001, BE-007, BE-008 | — |\n| 2 | b | AN-001, BE-005 | — |\n| 3 | c | AN-002, BE-006 | — |",
  );
  const out = reconcileRun(run, plan);
  assert.equal(out.tasks["BE-002"]!.step, "runnable"); // dep verified
  assert.equal(out.tasks["BE-003"]!.step, "waiting-deps"); // dep ยัง pending
  assert.equal(out.tasks["BE-005"]!.step, "runnable"); // anchor + phase 2 cleared
  assert.equal(out.tasks["BE-006"]!.step, "waiting-deps"); // phase 3 ไม่ cleared
  assert.equal(out.tasks["BE-007"]!.step, "waiting-deps"); // uxui ยังไม่ verified (default rule)
  assert.equal(out.tasks["BE-008"]!.step, "verified"); // แถวใหม่ + plan verified
  const t = out.tasks["BE-002"]!;
  assert.deepEqual([t.attempt, t.fixRounds, t.crashRestarts, t.sessionIds, t.currentSessionId, t.hold], [0, 0, 0, [], null, null]);
  // hook — rule ที่อ่านจาก plan เดี่ยวไม่ได้ (uxui = gate 3 answered — DES-001) driver ผ่านเข้ามา
  const out2 = reconcileRun(run, plan, { depsSatisfied: (dep) => dep.owner === "uxui-designer" });
  assert.equal(out2.tasks["BE-007"]!.step, "runnable");
  assert.equal(out2.tasks["BE-002"]!.step, "waiting-deps");
  assert.equal(out2.tasks["BE-005"]!.step, "waiting-deps");
});

test("resume reconcile — task ลด: ถอดจาก tasks{} แต่ sessions[] คงประวัติ (เอกสารชนะ)", () => {
  const h = home();
  const run = mkRun(h);
  run.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution" }), "BE-009": mkTask({ taskId: "BE-009", step: "runnable" }) };
  run.sessions = [mkSession({ sessionId: "s-1-abcd", seq: 1 })];
  const out = reconcileRun(run, planOf("| BE-001 | a | backend-engineer | 1 | — | pending |\n"));
  assert.deepEqual(Object.keys(out.tasks), ["BE-001"]);
  assert.equal(out.sessions.length, 1);
  assert.equal(out.sessions[0]!.sessionId, "s-1-abcd");
});

test("resume reconcile — phases{} คงค่าข้าม resume · เพิ่ม = init ตาม data-model · ลด = ถอด · configSnapshot freeze คงเดิม", () => {
  const h = home();
  const run = mkRun(h, {
    phases: {
      "1": { featureQa: "pass", featureQaSessionId: "s-2-abcd", cleared: true, hold: null },
      "2": { featureQa: "not-ready", featureQaSessionId: null, cleared: false, hold: null },
    },
  });
  run.tasks = { "BE-001": mkTask({ taskId: "BE-001", step: "execution" }) };
  const out = reconcileRun(run, planOf(
    "| BE-001 | a | backend-engineer | 1 | — | verified |\n",
    "| 1 | a | BE-001 | — |\n| 3 | c | — | — |",
  ));
  assert.deepEqual(out.phases["1"], { featureQa: "pass", featureQaSessionId: "s-2-abcd", cleared: true, hold: null });
  assert.deepEqual(out.phases["3"], { featureQa: "not-ready", featureQaSessionId: null, cleared: false, hold: null });
  assert.ok(!("2" in out.phases));
  assert.deepEqual(out.configSnapshot, SNAP);
});

test("resume reconcile — gate open → hold เฉพาะใน scope (task/phase/module) · นอก scope เดินต่อ · verified/hold อื่นไม่ถูกทับ · answered → ปลดกลับ prevStep", () => {
  const h = home();
  const run = mkRun(h);
  run.tasks = {
    "BE-101": mkTask({ taskId: "BE-101", step: "execution" }),
    "BE-102": mkTask({ taskId: "BE-102", step: "runnable" }),
    "BE-103": mkTask({ taskId: "BE-103", step: "verified" }),
    "BE-104": mkTask({ taskId: "BE-104", planPhase: "2", step: "execution" }),
  };
  run.gateLog = [gate({ gateId: "business-choice", taskIds: ["BE-101"] }), gate({ gateId: "qa-critical", scope: "phase", phase: "2" })];
  const rows = "| BE-101 | a | backend-engineer | 1 | — | pending |\n| BE-102 | b | backend-engineer | 1 | — | pending |\n| BE-103 | c | backend-engineer | 1 | — | verified |\n| BE-104 | d | backend-engineer | 2 | — | pending |\n";
  const out = reconcileRun(run, planOf(rows));
  assert.deepEqual(
    [out.tasks["BE-101"]!.step, out.tasks["BE-101"]!.hold!.reason, out.tasks["BE-101"]!.hold!.ref, out.tasks["BE-101"]!.hold!.prevStep],
    ["held", "gate", "business-choice", "execution"],
  );
  assert.equal(out.tasks["BE-102"]!.step, "runnable"); // task นอก scope เดินต่อ (DES-008)
  assert.equal(out.tasks["BE-103"]!.step, "verified"); // verified ไม่ hold ย้อน
  assert.deepEqual([out.tasks["BE-104"]!.hold!.reason, out.tasks["BE-104"]!.hold!.ref], ["gate", "qa-critical"]);
  // scope module + hold อื่น (crash-limit) ไม่ถูกทับ
  const run2 = mkRun(home());
  run2.tasks = {
    "BE-101": mkTask({ taskId: "BE-101", step: "runnable" }),
    "BE-102": mkTask({ taskId: "BE-102", step: "held", hold: { reason: "crash-limit", ref: "R16", prevStep: "execution" } }),
  };
  run2.gateLog = [gate({ gateId: "deploy-real", scope: "module" })];
  const out2 = reconcileRun(run2, planOf("| BE-101 | a | backend-engineer | 1 | — | pending |\n| BE-102 | b | backend-engineer | 1 | — | pending |\n"));
  assert.deepEqual([out2.tasks["BE-101"]!.step, out2.tasks["BE-101"]!.hold!.ref], ["held", "deploy-real"]);
  assert.equal(out2.tasks["BE-102"]!.hold!.reason, "crash-limit");
  // gate answered → ปลด hold กลับ prevStep
  const run3 = mkRun(home());
  run3.tasks = { "BE-101": mkTask({ taskId: "BE-101", step: "held", hold: { reason: "gate", ref: "business-choice", prevStep: "execution" } }) };
  run3.gateLog = [gate({ gateId: "business-choice", taskIds: ["BE-101"], status: "answered", answeredBy: "user", answeredAt: "2026-10-06T00:00:00.000Z", answer: "ตัดสินแล้ว" })];
  const out3 = reconcileRun(run3, planOf("| BE-101 | a | backend-engineer | 1 | — | pending |\n"));
  assert.deepEqual([out3.tasks["BE-101"]!.step, out3.tasks["BE-101"]!.hold], ["execution", null]);
});

test("ปิด/เปิดใหม่: phases{} (cleared, featureQaSessionId) + handoff.securityGate + counters อ่านกลับครบจากดิสก์ · collectSecurityGates", () => {
  const h = home();
  const run = mkRun(h);
  const sid = newSessionId(1);
  const handoff: HandoffV2 = {
    role: "qa-engineer", module: "agent-team", sessionId: sid, outputState: "DONE",
    result: "ตรวจแล้ว", changedDocs: [], changedCode: [], evidence: [], nextRole: "none",
    questionsForHuman: [], blocker: null, impactedTasks: null, decision: null, review: null, qa: null,
    featureQa: null, security: null,
    securityGate: [{ phase: "1", reason: "พบ Critical ต้อง re-audit" }],
  };
  updateRun(h, run.runId, (r) => ({
    ...r,
    tasks: { "BE-001": mkTask({ taskId: "BE-001", step: "awaiting-qa", attempt: 2, fixRounds: 1 }) },
    phases: { "1": { featureQa: "fail", featureQaSessionId: sid, cleared: false, hold: null } },
    sessions: [mkSession({ sessionId: sid, seq: 1, endedAt: "2026-10-06T01:00:00.000Z", outcome: "completed", exitCode: 0, handoff })],
  }));
  const back = loadRun(h, run.runId); // เปิดใหม่ — อ่านจากดิสก์
  assert.deepEqual(back.phases["1"], { featureQa: "fail", featureQaSessionId: sid, cleared: false, hold: null });
  assert.deepEqual(back.sessions[0]!.handoff!.securityGate, [{ phase: "1", reason: "พบ Critical ต้อง re-audit" }]);
  assert.equal(back.tasks["BE-001"]!.attempt, 2);
  assert.equal(back.tasks["BE-001"]!.fixRounds, 1);
  assert.deepEqual(collectSecurityGates(back), [{ phase: "1", reason: "พบ Critical ต้อง re-audit", sessionId: sid, seq: 1 }]);
});

test("findOpenSessions: endedAt = null เจอได้หลัง restart (ฐาน AC-066/AC-075) · ปิดแล้วไม่เจอ · run เสียไม่บล็อกการสแกน/ไม่ถูกแตะ", () => {
  const h = home();
  const r1 = mkRun(h);
  const r2 = mkRun(h, { module: "other-module" });
  const s11 = newSessionId(1);
  const s21 = newSessionId(1);
  updateRun(h, r1.runId, (r) => ({
    ...r,
    sessions: [mkSession({ sessionId: s11, seq: 1 }), mkSession({ sessionId: newSessionId(2), seq: 2, endedAt: "2026-10-06T01:00:00.000Z", outcome: "completed", exitCode: 0 })],
  }));
  updateRun(h, r2.runId, (r) => ({ ...r, sessions: [mkSession({ sessionId: s21, seq: 1, pid: 4321 })] }));
  const badId = "r-20261006-000000-bad0";
  mkdirSync(statePaths(h).runDir(badId), { recursive: true });
  writeFileSync(statePaths(h).runJsonPath(badId), "เสีย", "utf8");
  const open = findOpenSessions(h);
  // เรียงตาม runId (hex สุ่ม) — เทียบเป็นชุด ไม่ผูกลำดับ
  assert.deepEqual(open.map((o) => o.runId).sort(), [r1.runId, r2.runId].sort());
  assert.deepEqual(open.map((o) => o.session.sessionId).sort(), [s11, s21].sort());
  assert.ok(open.every((o) => o.session.endedAt === null));
  assert.equal(open.find((o) => o.runId === r2.runId)!.session.pid, 4321);
  assert.deepEqual(findOpenSessions(h, r2.runId).map((o) => o.session.sessionId), [s21]);
  assert.equal(findOpenSessions(h, r1.runId).length, 1);
  assert.equal(readdirSync(statePaths(h).runDir(badId)).filter((f) => f.startsWith("run.json.corrupt-")).length, 0);
});

test("saveRun/updateRun: ปฏิเสธ state ผิดรูป (ไม่เขียนทับไฟล์เดิม) · transition เปลี่ยน runId ไม่ได้", () => {
  const h = home();
  const run = mkRun(h);
  const file = statePaths(h).runJsonPath(run.runId);
  const before = readFileSync(file, "utf8");
  assert.throws(
    () => saveRun(h, { ...run, sessions: "x" as unknown as RunJson["sessions"] }),
    (e: unknown) => e instanceof StateError && e.kind === "invalid",
  );
  assert.equal(readFileSync(file, "utf8"), before);
  assert.throws(
    () => updateRun(h, run.runId, (r) => ({ ...r, runId: "r-20261006-000000-zzzz" })),
    (e: unknown) => e instanceof StateError && e.kind === "invalid",
  );
  assert.equal(readFileSync(file, "utf8"), before);
});

test("AC-065 + AC-002: วงจรครบกับ fixture module docs — เอกสารไม่มี attempt/sessionId/fixRounds · สถานะประกอบจาก state + เอกสารจริง", () => {
  const docs = path.join(tmp, `docs${++n}`);
  mkdirSync(path.join(docs, "plan"), { recursive: true });
  writeFileSync(path.join(docs, "plan", "index.md"), planText("| BE-001 | a | backend-engineer | 1 | — | verified |\n"));
  writeFileSync(
    path.join(docs, "plan", "be-001.md"),
    "# T\n\n## Goal\n\nx\n\n## References\n\n- REQ-001\n\n## Scope\n\n- Write paths: `src/x.ts`\n- Security-sensitive: no\n\n## Out of Scope\n\n- x\n\n## Expected Output\n\n- x\n\n## Acceptance\n\n- x\n\n## Dependencies\n\n- —\n\n## Handoff\n\n- x\n",
  );
  const h = home();
  const run = mkRun(h);
  const sid = newSessionId(1);
  updateRun(h, run.runId, (r) => ({
    ...r,
    tasks: { "BE-001": mkTask({ taskId: "BE-001", step: "execution", attempt: 3, fixRounds: 2, crashRestarts: 1, currentSessionId: sid, sessionIds: [sid] }) },
    sessions: [mkSession({ sessionId: sid, seq: 1 })],
  }));
  const plan = parsePlanIndex(readFileSync(path.join(docs, "plan", "index.md"), "utf8"));
  saveRun(h, reconcileRun(loadRun(h, run.runId), plan));
  assert.equal(getPointer(h, "agent-team"), run.runId);
  const state = loadRun(h, run.runId);
  // ประกอบจากสองฝั่ง: verified มาจากเอกสาร (AC-034) · counters/session มาจาก state เท่านั้น (AC-065)
  assert.equal(state.tasks["BE-001"]!.step, "verified");
  assert.deepEqual([state.tasks["BE-001"]!.attempt, state.tasks["BE-001"]!.fixRounds, state.tasks["BE-001"]!.sessionIds], [3, 2, [sid]]);
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(docs)) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /attempt|sessionId|fixRounds|crashRestarts|s-\d+-[0-9a-f]{4}/, `พบ runtime state ใน ${f}`);
  }
});
