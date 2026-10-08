// BE-012 — node:test ของ camp adapter claude (DES-002) — ทุก test ใช้ fake spawn (ห้าม spawn CLI จริง)
// ครอบ Acceptance: command line ตรง DES-002 ทุก flag — flags อ่านจาก camps.yaml จริง (ไม่ hardcode) ·
// ค่า --json-schema เป็น inline JSON (QA-007 — CLI ปฏิเสธ path; fail-closed อ่านไม่ได้/JSON เสีย/เกินเพดาน) ·
// ไม่มี bypass / --continue / --resume (AC-033) · test-planner --disallowedTools Bash (AC-060) ·
// claim → Edit(<claim>)/Write(<claim>) (DES-021 ชั้นกันก่อน — รูป inferred ยืนยันที่ QA-001) ·
// effort null ไม่ส่ง flag (กติกา 3 — DES-004) · บรีฟสั้น stdin ชี้ packet.json (packet camp-agnostic — AC-004) ·
// timeout → kill tree + outcome timeout (R16 ตัดสินต่อ) · kill → interrupted · spawn fail → spawn ซ้ำ
// sessionId เดิมตาม retryOnCrash (DES-007) · exit ≠ 0 = crash · pid คืนจาก handle (ฐานของ AC-066) ·
// session_id/version อ่านจาก stdout JSON — ไม่ใช่ JSON ไม่เดา (fail-closed)
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { loadAppConfig, type CampProfile } from "../src/core/config.ts";
import { campAdapterProblems, type CampDispatch } from "../src/core/contract/camp-adapter.ts";
import { handoffV2JsonSchema } from "../src/core/contract/schema.ts";
import type { PacketV2 } from "../src/core/contract/types.ts";
import { handoffSchemaProblems } from "../src/core/contract/validate.ts";
import { CampAdapterError, buildArgv, packetPointerText, SCHEMA_ARGV_MAX_CHARS, sessionLogPath, type CampChild, type SpawnFn, type SpawnOptionsLite, type ToolRuleArgs } from "../src/camps/base.ts";
import { ClaudeAdapter, claudeOutputMeta, claudeToolRules } from "../src/camps/claude.ts";

// camps.yaml จริงของ deployment (BE-001 validate แล้ว) — พิสูจน์ว่า argv มาจาก config ไม่ใช่ค่า hardcode
const CFG = loadAppConfig();
const PROFILE: CampProfile = CFG.camps.camps.claude;

const tmp = mkdtempSync(path.join(os.tmpdir(), "be012-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

// --- fixture: ไฟล์ที่ argv จะชี้ + packet v2 (รูปตาม data-model — ชุดเดียวกันใช้ได้ทุก camp, AC-004) ---

const RP_FILE = path.join(tmp, "backend-engineer.md");
writeFileSync(RP_FILE, "---\nname: backend-engineer\ntools: Read, Write, Edit, Glob, Grep\nmodel: sonnet\neffort: medium\n---\n\nYou implement backend tasks.\n");
const SCHEMA_FILE = path.join(tmp, "handoff-v2.json");
writeFileSync(SCHEMA_FILE, JSON.stringify(handoffV2JsonSchema()));
// ค่าที่ adapter ส่งจริง = schema เต็ม compact แต่ตัด $schema ราก — claude CLI 2.1.292 ไม่รู้จัก meta-schema
// draft 2020-12 (พิสูจน์ CLI จริง 2026-10-07 — QA-007)
const SCHEMA_INLINE: string = (() => {
  const s: Record<string, unknown> = { ...handoffV2JsonSchema() };
  delete s.$schema;
  return JSON.stringify(s);
})();

const BASE_PACKET: PacketV2 = {
  packetVersion: 2,
  runId: "r-20261006-000000-abcd",
  sessionId: "s-1-0001",
  seq: 1,
  module: "agent-team",
  role: "backend-engineer",
  kind: "execution",
  taskIds: ["BE-012"],
  planPhase: "3",
  attempt: 1,
  dateFromUser: "2026-10-06",
  docsRoot: "C:\\src\\AICode\\rong-ngang\\knowledge\\agent-team",
  docsLayout: "split",
  selectedTarget: { name: "agent-team-code", path: "C:\\src\\AICode\\rong-ngang\\workspace\\orchestrator" },
  gitPolicy: [],
  readSections: ["plan\\be-012.md", "design\\des-002.md"],
  writeScope: { allow: ["codeRoots/**"], deny: [] },
  claim: [],
  priorSession: null,
  defectPacket: null,
  reviewInput: null,
  blocker: null,
  rolePrompt: { source: RP_FILE, hash: `sha256:${"0".repeat(64)}` },
  brief: "ทำ BE-012 ตาม task file",
  outputContract: {
    handoffSchema: "handoff-v2.json",
    schemaEnforcedByCli: true,
    allowedStates: ["DONE", "BLOCKED", "NEEDS_DESIGN_CHANGE", "NEEDS_REQUIREMENT_CHANGE", "NEEDS_HUMAN"],
  },
};
const PK = (over: Partial<PacketV2> = {}): PacketV2 => ({ ...BASE_PACKET, ...over });

let n = 0;
function mkReq(over: Partial<CampDispatch> = {}): CampDispatch {
  const packet = over.packet ?? PK();
  const dir = path.join(tmp, `s${++n}`, "sessions", packet.sessionId);
  mkdirSync(dir, { recursive: true });
  const packetPath = path.join(dir, "packet.json");
  writeFileSync(packetPath, JSON.stringify(packet));
  return {
    packet,
    packetPath,
    rolePromptFile: RP_FILE,
    rolePromptBody: "You implement backend tasks.",
    rolePromptTools: ["Read", "Write", "Edit", "Glob", "Grep"],
    model: "sonnet",
    effort: "medium",
    handoffSchemaPath: SCHEMA_FILE,
    timeoutSec: 1800,
    cwd: "C:\\src\\AICode\\rong-ngang\\workspace",
    extraDirs: ["C:\\src\\AICode\\rong-ngang\\knowledge", "C:\\src\\AICode\\rong-ngang\\workspace\\orchestrator"],
    ...over,
  };
}

// --- fake spawn: ไม่มี process จริง — child ปลอมที่ test ปล่อย event เอง ---

type SpawnCall = { command: string; args: string[]; opts: SpawnOptionsLite; child: FakeChild };

class FakeChild {
  readonly stdin: { writes: string[]; ended: boolean; write(chunk: string): unknown; end(): unknown };
  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();
  readonly killSignals: (string | number | undefined)[] = [];
  private readonly events = new EventEmitter();

  constructor(readonly pid: number | null) {
    const writes: string[] = [];
    this.stdin = {
      writes,
      ended: false,
      write: (chunk: string) => {
        writes.push(chunk);
        return true;
      },
      end: () => {
        this.stdin.ended = true;
        return undefined;
      },
    };
  }

  on(event: string, listener: (...args: unknown[]) => void): this {
    this.events.on(event, listener as never);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    return this.events.emit(event, ...(args as never[]));
  }

  kill(signal?: string | number): boolean {
    this.killSignals.push(signal);
    this.emit("close", null);
    return true;
  }
}

// pids = pid ของ child ตามลำดับการ spawn (default 4242 · taskkill ใช้ 9999) — null จำลอง spawn ไม่สำเร็จ
function fakeSpawn(pids: (number | null)[] = []): { spawnFn: SpawnFn; calls: SpawnCall[] } {
  const calls: SpawnCall[] = [];
  const spawnFn: SpawnFn = (command, args, opts) => {
    const pid = calls.length < pids.length ? pids[calls.length]! : command === "taskkill" ? 9999 : 4242;
    const child = new FakeChild(pid);
    calls.push({ command, args, opts, child });
    return child as unknown as CampChild;
  };
  return { spawnFn, calls };
}

const ENOENT = () => Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });

// --- argv จาก CampProfile (camps.yaml จริง) + tool rules ของ claude ---

test("buildArgv ประกอบ command line ตรง DES-002 ทุก flag — flags จาก camps.yaml จริง + claims (DES-021)", () => {
  const req = mkReq({ packet: PK({ claim: ["agent-team/src/camps/**", "test/camp-claude.test.ts"] }) });
  const { args } = buildArgv(PROFILE, req, { toolRules: claudeToolRules(req), schemaInline: true });
  assert.deepEqual([PROFILE.command, ...args], [
    "claude",
    ...PROFILE.headlessArgs, // -p --output-format json --permission-prompts none --permission-mode dontAsk (จาก config)
    "--model", "sonnet",
    "--effort", "medium",
    "--json-schema", SCHEMA_INLINE, // QA-007 — ค่า flag = inline JSON จากเนื้อ SCHEMA_FILE (ตัด $schema ราก)
    "--append-system-prompt-file", RP_FILE,
    "--allowedTools", "Read", "Write", "Edit", "Glob", "Grep",
    "Edit(agent-team/src/camps/**)", "Write(agent-team/src/camps/**)",
    "Edit(test/camp-claude.test.ts)", "Write(test/camp-claude.test.ts)",
    "--add-dir", "C:\\src\\AICode\\rong-ngang\\knowledge",
    "--add-dir", "C:\\src\\AICode\\rong-ngang\\workspace\\orchestrator",
  ]);
});

test("QA-007: ค่า --json-schema เป็น inline JSON (ไม่ใช่ path) — จากเนื้อไฟล์ schema ที่ driver เขียน ตัด $schema ราก", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, { schemaInline: true });
  const at = args.indexOf(PROFILE.schemaFlag!);
  const inline = args[at + 1]!;
  assert.notEqual(inline, SCHEMA_FILE); // path ที่ CLI เคยปฏิเสธ (exit 1) ไม่ปรากฏอีก
  const fromFile: Record<string, unknown> = JSON.parse(readFileSync(SCHEMA_FILE, "utf8")); // เนื้อไฟล์ที่ driver เขียน (ตาม contract)
  assert.equal("$schema" in fromFile, true, "ไฟล์บนดิสก์คงเต็ม — ตัดเฉพาะค่าที่เข้า argv");
  delete fromFile.$schema; // CLI validator ไม่รู้จัก meta-schema draft 2020-12 (พิสูจน์ CLI จริง 2026-10-07)
  assert.equal(inline, JSON.stringify(fromFile)); // ค่าที่ส่ง = เนื้อไฟล์ compact ตัด $schema
  assert.equal(inline, SCHEMA_INLINE);
});

test("QA-007 fail-closed: schema ไฟล์อ่านไม่ได้/JSON ผิดรูป → CampAdapterError ก่อน spawn (ไม่ fallback เป็น path)", () => {
  // JSON ผิดรูป — เลียนแบบ path ที่ CLI เคยได้รับแล้ว parse พัง (Unexpected identifier "C")
  const badFile = path.join(tmp, "handoff-schema-bad.json");
  writeFileSync(badFile, "C:\\src\\broken {not json");
  assert.throws(() => buildArgv(PROFILE, mkReq({ handoffSchemaPath: badFile }), { schemaInline: true }), CampAdapterError);
  // อ่านไม่ได้ — existsSync ผ่าน (directory) แต่ readFileSync โยน (EISDIR)
  const dirAsSchema = path.join(tmp, "schema-dir");
  mkdirSync(dirAsSchema, { recursive: true });
  assert.throws(() => buildArgv(PROFILE, mkReq({ handoffSchemaPath: dirAsSchema }), { schemaInline: true }), CampAdapterError);
  // ผ่าน adapter แท้ (spawnDispatch) — dispatch โยนก่อน spawn: ไม่มี child ถูกสร้าง
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn });
  assert.throws(() => adapter.dispatch(mkReq({ handoffSchemaPath: badFile })), CampAdapterError);
  assert.equal(calls.length, 0);
});

test("QA-007 fail-closed: schema inline เกินเพดาน argv → CampAdapterError ก่อน spawn · เพดานวัดที่รูป compact ที่ส่งจริง", () => {
  const over = path.join(tmp, "handoff-schema-over.json");
  writeFileSync(over, JSON.stringify({ type: "object", description: "x".repeat(SCHEMA_ARGV_MAX_CHARS) }));
  assert.throws(() => buildArgv(PROFILE, mkReq({ handoffSchemaPath: over }), { schemaInline: true }), CampAdapterError);
  // ไฟล์ดิบยาวเกินเพดาน (เติมช่องว่างระหว่าง token — JSON ยัง parse ได้) แต่ compact สั้นกว่า → ผ่าน
  const pretty = path.join(tmp, "handoff-schema-pretty.json");
  const compact = JSON.stringify({ type: "object", description: "y".repeat(100) });
  writeFileSync(pretty, compact.replaceAll(":", `: ${" ".repeat(5000)}`));
  const { args } = buildArgv(PROFILE, mkReq({ handoffSchemaPath: pretty }), { schemaInline: true });
  const inline = args[args.indexOf("--json-schema") + 1]!;
  assert.ok(inline.length <= SCHEMA_ARGV_MAX_CHARS);
  assert.deepEqual(JSON.parse(inline), { type: "object", description: "y".repeat(100) });
});

test("base ร่วม: ไม่ตั้ง schemaInline → ค่า schemaFlag = path ตามเดิม (codex --output-schema / agy — ยังไม่ยืนยันว่ารับ inline)", () => {
  const pathProfile: CampProfile = { ...PROFILE, schemaFlag: "--output-schema" };
  const { args } = buildArgv(pathProfile, mkReq(), {});
  const at = args.indexOf("--output-schema");
  assert.deepEqual(args.slice(at, at + 2), ["--output-schema", SCHEMA_FILE]);
});

test("AC-033: argv ไม่มี bypass / --continue / --resume ทุกเส้นทาง (session ใหม่เสมอ)", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, { toolRules: claudeToolRules(req) });
  for (const forbidden of ["--dangerously-skip-permissions", "--dangerously-bypass-approvals-and-sandbox", "--continue", "--resume", "resume"]) {
    assert.equal(args.includes(forbidden), false, forbidden);
  }
});

test("กติกา 3 (DES-004): effort null → ไม่มี --effort ใน argv — model ยังส่งปกติ", () => {
  const req = mkReq({ effort: null });
  const { args } = buildArgv(PROFILE, req, { toolRules: claudeToolRules(req) });
  assert.equal(args.includes("--effort"), false);
  assert.deepEqual(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2), ["--model", "sonnet"]);
});

test("AC-060: test-planner → --disallowedTools Bash · role อื่นไม่มี --disallowedTools", () => {
  const planner = mkReq({ packet: PK({ role: "test-planner" }) });
  const rules: ToolRuleArgs = claudeToolRules(planner);
  assert.deepEqual(rules.deny, ["Bash"]);
  const { args } = buildArgv(PROFILE, planner, { toolRules: rules });
  const at = args.indexOf("--disallowedTools");
  assert.ok(at >= 0);
  assert.deepEqual(args.slice(at, at + 2), ["--disallowedTools", "Bash"]);
  const engineer = mkReq();
  assert.deepEqual(claudeToolRules(engineer).deny, []);
  assert.equal(buildArgv(PROFILE, engineer, { toolRules: claudeToolRules(engineer) }).args.includes("--disallowedTools"), false);
});

// --- dispatch ผ่าน ClaudeAdapter ด้วย fake spawn ---

test("dispatch (fake spawn): argv + บรีฟ stdin ชี้ packet.json + pid + stdout JSON → outcome ครบ + session.log", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn, retryOnCrash: CFG.camps.defaults.retryOnCrash });
  const req = mkReq();
  const handle = adapter.dispatch(req);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.command, "claude");
  assert.equal(calls[0]!.opts.shell, false); // argv array ตรง ไม่ผ่าน shell (DES-002)
  assert.equal(handle.pid, 4242); // pid บันทึกได้ — ฐานของ AC-066
  const child = calls[0]!.child;
  assert.deepEqual(child.stdin.writes, [packetPointerText(PROFILE, req)]); // บรีฟสั้นทาง stdin ชี้ packet.json
  assert.equal(child.stdin.ended, true);
  const resultJson = JSON.stringify({ type: "result", session_id: "c-abc", version: "2.1.287", result: "DONE" });
  child.stdout.emit("data", Buffer.from(resultJson));
  child.emit("close", 0);
  const out = await handle.outcome;
  assert.deepEqual(out, {
    exitCode: 0,
    handoffRaw: resultJson,
    structuredOutputField: "structured_output", // QA-009 — camp ประกาศชื่อ field ของ result envelope (DES-002)
    cliSessionId: "c-abc",
    cliVersion: "2.1.287",
    logsPath: sessionLogPath(req),
    failure: null,
  });
  const log = readFileSync(out.logsPath!, "utf8"); // argv + stdout ลง session.log (DES-007)
  assert.ok(log.includes("--append-system-prompt-file"));
  assert.ok(log.includes("session_id"));
});

test("handoffRaw จาก stdout นำไปตรวจ schema ต่อได้ (AC: handoff ผ่าน schema → outcome)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const req = mkReq();
  const handoff = {
    role: req.packet.role, module: req.packet.module, sessionId: req.packet.sessionId, outputState: "DONE",
    result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none", questionsForHuman: [],
    blocker: null, impactedTasks: null, decision: null, review: null, qa: null, featureQa: null, security: null, securityGate: null,
  };
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn });
  const handle = adapter.dispatch(req);
  calls[0]!.child.stdout.emit("data", Buffer.from(JSON.stringify(handoff)));
  calls[0]!.child.emit("close", 0);
  const out = await handle.outcome;
  assert.deepEqual(handoffSchemaProblems(JSON.parse(out.handoffRaw!) as unknown), []);
});

test("QA-009: stdout = result envelope ของ CLI (-p --output-format json) → outcome คง envelope และประกาศ structured_output — unwrap เป็นหน้าที่ driver (DES-002/012)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const req = mkReq();
  const handoff = {
    role: req.packet.role, module: req.packet.module, sessionId: req.packet.sessionId, outputState: "DONE",
    result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none", questionsForHuman: [],
    blocker: null, impactedTasks: null, decision: null, review: null, qa: null, featureQa: null, security: null, securityGate: null,
  };
  // รูปตรงกับที่ CLI จริงคืน (round 18): type/subtype/is_error/session_id + structured_output ครอบ handoff
  const envelope = { type: "result", subtype: "success", is_error: false, session_id: req.packet.sessionId, result: "ok", structured_output: handoff };
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn });
  const handle = adapter.dispatch(req);
  calls[0]!.child.stdout.emit("data", Buffer.from(JSON.stringify(envelope)));
  calls[0]!.child.emit("close", 0);
  const out = await handle.outcome;
  assert.equal(out.structuredOutputField, "structured_output"); // camp เป็นผู้ประกาศชื่อ field — driver อ่านจาก outcome ไม่เดา
  const parsed = JSON.parse(out.handoffRaw!) as Record<string, unknown>; // handoffRaw ยังเป็น envelope เต็ม — ไม่ตัดสินแทน driver
  assert.deepEqual(handoffSchemaProblems(parsed.structured_output as unknown), []); // handoff ใน envelope ผ่าน schema — เหลือให้ driver unwrap
});

test("timeout → kill tree (taskkill /T /F) + outcome 'timeout' exitCode null — R16 ตัดสินต่อ ไม่ retry ใน adapter", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn });
  const req = mkReq({ timeoutSec: 0.05 }); // จำลองค่าสั้นเพื่อ test — จริงมาจาก camps.defaults.timeoutSec ผ่าน CampDispatch
  const handle = adapter.dispatch(req);
  const out = await handle.outcome;
  assert.equal(out.failure, "timeout");
  assert.equal(out.exitCode, null);
  assert.equal(out.handoffRaw, null);
  const tk = calls.find((c) => c.command === "taskkill");
  assert.ok(tk, "ต้องเรียก taskkill ฆ่าทั้ง process tree (DES-007)");
  assert.deepEqual(tk!.args, ["/PID", "4242", "/T", "/F"]);
  assert.ok(calls[0]!.child.killSignals.length > 0);
  assert.equal(handle.pid, 4242);
});

test("kill(reason) กลางทาง → outcome 'interrupted' + reason ลง session.log · หลังจบแล้ว kill ซ้ำ = no-op", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn });
  const req = mkReq();
  const handle = adapter.dispatch(req);
  handle.kill("restart — R16");
  const out = await handle.outcome;
  assert.equal(out.failure, "interrupted");
  assert.equal(out.exitCode, null);
  assert.equal(out.handoffRaw, null);
  assert.ok(calls.find((c) => c.command === "taskkill"));
  assert.ok(readFileSync(out.logsPath!, "utf8").includes("kill: restart — R16"));
  const after = calls.length;
  handle.kill("late");
  assert.equal(calls.length, after);
});

test("spawn ไม่สำเร็จ → spawn ซ้ำ sessionId เดิมตาม retryOnCrash (DES-007) — ยังพัง → outcome 'spawn'", async () => {
  const { spawnFn, calls } = fakeSpawn([null, null]);
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn, retryOnCrash: CFG.camps.defaults.retryOnCrash }); // camps.yaml = 1
  const req = mkReq();
  const handle = adapter.dispatch(req);
  assert.equal(calls.length, 1);
  assert.equal(handle.pid, null);
  calls[0]!.child.emit("error", ENOENT());
  assert.equal(calls.length, 2, "spawn ซ้ำทันที — sessionId/argv เดิม");
  assert.deepEqual(calls[1]!.args, calls[0]!.args);
  calls[1]!.child.emit("error", ENOENT());
  const out = await handle.outcome;
  assert.deepEqual(out, {
    exitCode: null, handoffRaw: null, structuredOutputField: "structured_output", cliSessionId: null, cliVersion: null,
    logsPath: sessionLogPath(req), failure: "spawn",
  });
  const log = readFileSync(out.logsPath!, "utf8");
  assert.ok(log.includes("attempt 1/2"));
  assert.ok(log.includes("attempt 2/2"));
});

test("retryOnCrash = 0 (default ของ adapter) → พังครั้งเดียวจบ ไม่ retry", async () => {
  const { spawnFn, calls } = fakeSpawn([null]);
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn });
  const handle = adapter.dispatch(mkReq());
  calls[0]!.child.emit("error", ENOENT());
  const out = await handle.outcome;
  assert.equal(out.failure, "spawn");
  assert.equal(calls.length, 1);
});

test("spawn พังครั้งเดียวแล้วสำเร็จ → retry ได้ผล outcome null + pid ชี้ child ที่มีชีวิต (DES-007)", async () => {
  const { spawnFn, calls } = fakeSpawn([null, 4242]);
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn, retryOnCrash: 1 });
  const handle = adapter.dispatch(mkReq());
  calls[0]!.child.emit("error", ENOENT());
  assert.equal(calls.length, 2);
  assert.equal(handle.pid, 4242);
  calls[1]!.child.stdout.emit("data", "x");
  calls[1]!.child.emit("close", 0);
  const out = await handle.outcome;
  assert.equal(out.failure, null);
  assert.equal(out.handoffRaw, "x");
});

test("exit ≠ 0 → outcome 'crash' — handoffRaw คืน raw ไว้ให้ driver ตรวจ (ไม่ตัดสินแทน)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn });
  const handle = adapter.dispatch(mkReq());
  calls[0]!.child.stderr.emit("data", "boom");
  calls[0]!.child.stdout.emit("data", "partial");
  calls[0]!.child.emit("close", 1);
  const out = await handle.outcome;
  assert.deepEqual({ failure: out.failure, exitCode: out.exitCode, handoffRaw: out.handoffRaw }, { failure: "crash", exitCode: 1, handoffRaw: "partial" });
  assert.ok(readFileSync(out.logsPath!, "utf8").includes("boom"));
});

test("stdout ไม่ใช่ JSON → cliSessionId/cliVersion null (ไม่เดา — fail-closed)", () => {
  assert.deepEqual(claudeOutputMeta("hello not json"), { cliSessionId: null, cliVersion: null });
  assert.deepEqual(claudeOutputMeta('{"session_id":"c-1"}'), { cliSessionId: "c-1", cliVersion: null });
  assert.deepEqual(claudeOutputMeta('{"version":"2.1.287"}'), { cliSessionId: null, cliVersion: "2.1.287" });
  assert.deepEqual(claudeOutputMeta('{"session_id":123}'), { cliSessionId: null, cliVersion: null });
});

test("ClaudeAdapter ตรง CampAdapter contract — campAdapterProblems ผ่าน (core ตรวจก่อน driver ลงทะเบียน)", () => {
  const adapter = new ClaudeAdapter(PROFILE, { spawnFn: fakeSpawn().spawnFn });
  assert.deepEqual(campAdapterProblems(adapter), []);
  assert.equal(adapter.camp, "claude");
});

test("fail-closed: ข้อมูลไม่ครบ/ไม่สอดคล้อง → CampAdapterError ก่อน spawn (ไม่เดาค่าแทน)", () => {
  // schemaFlag/handoffSchemaPath ไม่สอดคล้อง
  assert.throws(() => buildArgv(PROFILE, mkReq({ handoffSchemaPath: null })), CampAdapterError);
  // packet/role prompt/schema ไม่มีจริงบนดิสก์
  assert.throws(() => buildArgv(PROFILE, mkReq({ packetPath: path.join(tmp, "missing", "packet.json") })), CampAdapterError);
  assert.throws(() => buildArgv(PROFILE, mkReq({ rolePromptFile: path.join(tmp, "no-role-prompt.md") })), CampAdapterError);
  assert.throws(() => buildArgv(PROFILE, mkReq({ handoffSchemaPath: path.join(tmp, "no-schema.json") })), CampAdapterError);
  // effort ส่งไม่ได้เมื่อ camp ไม่มี effortFlag/effortVia
  const noEffort: CampProfile = { ...PROFILE, effortFlag: null, effortVia: undefined };
  assert.throws(() => buildArgv(noEffort, mkReq({ effort: "medium" })), CampAdapterError);
  // modelFlag null / model ว่าง
  const noModel: CampProfile = { ...PROFILE, modelFlag: null };
  assert.throws(() => buildArgv(noModel, mkReq()), CampAdapterError);
  assert.throws(() => buildArgv(PROFILE, mkReq({ model: " " })), CampAdapterError);
  // toolRules ให้ camp ที่ไม่มี toolRuleFlags / extraDirs ให้ camp ที่ไม่มี extraDirsFlag
  const noTools: CampProfile = { ...PROFILE, toolRuleFlags: undefined };
  assert.throws(() => buildArgv(noTools, mkReq(), { toolRules: { allow: ["Read"], deny: [] } }), CampAdapterError);
  const noDirs: CampProfile = { ...PROFILE, extraDirsFlag: null };
  assert.throws(() => buildArgv(noDirs, mkReq()), CampAdapterError);
});

// --- base ร่วมที่ BE-013 (codex) / BE-014 (antigravity) ต่อใช้ ---

test("base ร่วม: placeholder <lastMessagePath> + effortVia + cwdFlag + บรีฟ positional แบบ packet-file (DES-002 codex)", () => {
  const codexProfile: CampProfile = {
    command: "codex",
    subcommand: "exec",
    headlessArgs: ["--json", "--output-last-message", "<lastMessagePath>"],
    modelFlag: "-m",
    effortVia: ["-c", "model_reasoning_effort=<effort>"],
    schemaFlag: null,
    rolePromptFlag: null,
    briefChannel: "packet-file",
    cwdFlag: "-C",
  };
  const req = mkReq({ handoffSchemaPath: null, effort: "high", extraDirs: [] });
  const built = buildArgv(codexProfile, req, {});
  const lastMessagePath = path.join(path.dirname(req.packetPath), "last-message.txt");
  assert.deepEqual(built.args, [
    "exec",
    "--json", "--output-last-message", lastMessagePath,
    "-C", req.cwd,
    "-m", "sonnet",
    "-c", "model_reasoning_effort=high",
    `อ่านและทำตาม dispatch packet ที่ ${req.packetPath}`,
  ]);
  assert.equal(built.lastMessagePath, lastMessagePath);
  // packet camp-agnostic (AC-004) — packet เดียวกันถูกชี้ด้วยบรีฟสั้นต่าง channel โดยไม่แก้ packet
  assert.ok(packetPointerText(PROFILE, req).startsWith("ทำงานตาม dispatch packet ที่ "));
});
