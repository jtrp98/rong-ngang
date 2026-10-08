// BE-013 — node:test ของ camp adapter codex (DES-002 — codex-cli 0.160.0) — ทุก test ใช้ fake spawn (ห้าม spawn CLI จริง)
// ครอบ Acceptance: command line ตรง DES-002 ทุก flag — flags อ่านจาก camps.yaml จริง (ไม่ hardcode) ·
// effort ผ่าน `-c model_reasoning_effort=<effort>` ตาม camps.yaml (effortVia) · ค่า --output-schema = path ไฟล์
// (pin DES-002 2026-10-07 — ต่างจาก claude QA-007) · ไม่มี subcommand `resume`/bypass (AC-033 — session ใหม่เสมอ) ·
// handoff จาก last-message file (`-o`) ผ่าน schema validation — ไม่มี envelope (structuredOutputField ไม่ตั้ง) ·
// timeout/spawn fail เหมือน BE-012 (ฐานร่วม base.ts — R16/retryOnCrash) · packet เดียวกับ camp อื่น (AC-004) ·
// session_id/version อ่านจาก JSONL events — รูป mark `inferred` (DES-002), ไม่เจอ → null (fail-closed)
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
import { CampAdapterError, buildArgv, packetPointerText, sessionLogPath, type CampChild, type SpawnFn, type SpawnOptionsLite } from "../src/camps/base.ts";
import { CodexAdapter, codexOutputMeta } from "../src/camps/codex.ts";

// camps.yaml จริงของ deployment (BE-001 validate แล้ว) — พิสูจน์ว่า argv มาจาก config ไม่ใช่ค่า hardcode
const CFG = loadAppConfig();
const PROFILE: CampProfile = CFG.camps.camps.codex;

const tmp = mkdtempSync(path.join(os.tmpdir(), "be013-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

// --- fixture: ไฟล์ที่ argv จะชี้ + packet v2 (รูปตาม data-model — ชุดเดียวกับ camp-claude.test.ts, AC-004) ---

const RP_FILE = path.join(tmp, "backend-engineer.md");
writeFileSync(RP_FILE, "---\nname: backend-engineer\ntools: Read, Write, Edit, Glob, Grep\nmodel: sonnet\neffort: medium\n---\n\nYou implement backend tasks.\n");
// ไฟล์ schema ที่ driver เขียนต่อ session — codex --output-schema รับ **path** ไฟล์ (pin DES-002 2026-10-07)
// → ไฟล์บนดิสก์คงเต็มตาม contract รวม $schema ราก (DES-012) — ต่างจาก claude ที่ตัดตอน inline
const SCHEMA_FILE = path.join(tmp, "handoff-v2.json");
writeFileSync(SCHEMA_FILE, JSON.stringify(handoffV2JsonSchema()));

const BASE_PACKET: PacketV2 = {
  packetVersion: 2,
  runId: "r-20261006-000000-abcd",
  sessionId: "s-1-0001",
  seq: 1,
  module: "agent-team",
  role: "backend-engineer",
  kind: "execution",
  taskIds: ["BE-013"],
  planPhase: "4",
  attempt: 1,
  dateFromUser: "2026-10-07",
  docsRoot: "C:\\src\\AICode\\rong-ngang\\knowledge\\agent-team",
  docsLayout: "split",
  selectedTarget: { name: "agent-team-code", path: "C:\\src\\AICode\\rong-ngang\\workspace\\orchestrator" },
  gitPolicy: [],
  readSections: ["plan\\be-013.md", "design\\des-002.md"],
  writeScope: { allow: ["codeRoots/**"], deny: [] },
  claim: [],
  priorSession: null,
  defectPacket: null,
  reviewInput: null,
  blocker: null,
  rolePrompt: { source: RP_FILE, hash: `sha256:${"0".repeat(64)}` },
  brief: "ทำ BE-013 ตาม task file",
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
    model: "gpt-6.1-sol",
    effort: "high",
    handoffSchemaPath: SCHEMA_FILE,
    timeoutSec: 1800,
    cwd: "C:\\src\\AICode\\rong-ngang\\workspace",
    // codex ไม่มี extraDirsFlag (camps.yaml) — write scope ชั้น 2 = sandbox + cwd ที่รากโปรเจกต์ (DES-006)
    extraDirs: [],
    ...over,
  };
}

const mkHandoff = (req: CampDispatch): Record<string, unknown> => ({
  role: req.packet.role, module: req.packet.module, sessionId: req.packet.sessionId, outputState: "DONE",
  result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none", questionsForHuman: [],
  blocker: null, impactedTasks: null, decision: null, review: null, qa: null, featureQa: null, security: null, securityGate: null,
});

// --- fake spawn: ไม่มี process จริง — child ปลอมที่ test ปล่อย event เอง (รูปเดียวกับ camp-claude.test.ts) ---

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

const ENOENT = () => Object.assign(new Error("spawn codex ENOENT"), { code: "ENOENT" });

// --- argv จาก CampProfile (camps.yaml จริง) — codex ไม่มี toolRules ให้ส่ง (ไม่มี toolRuleFlags) ---

test("buildArgv ประกอบ command line ตรง DES-002 ทุก flag — flags จาก camps.yaml จริง (ไม่ hardcode)", () => {
  const req = mkReq();
  const built = buildArgv(PROFILE, req, {});
  const lastMessagePath = path.join(path.dirname(req.packetPath), "last-message.txt");
  assert.deepEqual([PROFILE.command, ...built.args], [
    "codex",
    "exec", // subcommand จาก camps.yaml
    ...PROFILE.headlessArgs.map((a) => (a === "<lastMessagePath>" ? lastMessagePath : a)), // --json --skip-git-repo-check --sandbox workspace-write --output-last-message <path> (จาก config)
    "-C", req.cwd, // cwdFlag (DES-006 ชั้น 2 — write scope ของ codex)
    "-m", "gpt-6.1-sol",
    "-c", "model_reasoning_effort=high", // effortVia จาก camps.yaml — mark inferred (doc)
    "--output-schema", SCHEMA_FILE, // path ไฟล์ — pin DES-002 2026-10-07 (ไม่ใช่ inline แบบ claude QA-007)
    `อ่านและทำตาม dispatch packet ที่ ${req.packetPath}`, // briefChannel packet-file — positional ท้าย command line
  ]);
  assert.equal(built.lastMessagePath, lastMessagePath);
  assert.equal(built.args.at(-1), packetPointerText(PROFILE, req)); // positional ท้ายเสมอ (DES-002)
});

test("--output-schema = path ไฟล์ (pin DES-002 2026-10-07 — ต่างจาก claude QA-007) · ไฟล์บนดิสก์คงเต็มรวม $schema ราก", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, {});
  const at = args.indexOf(PROFILE.schemaFlag!);
  assert.deepEqual(args.slice(at, at + 2), ["--output-schema", SCHEMA_FILE]);
  const onDisk: Record<string, unknown> = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
  assert.equal("$schema" in onDisk, true, "ไฟล์ที่ driver เขียนคงเต็มตาม contract (DES-012) — ไม่ตัด $schema");
  assert.equal(args.some((a) => a.trimStart().startsWith("{")), false, "ไม่มี JSON inline หลุดเข้า argv");
});

test("AC-033: argv ไม่มี subcommand resume / bypass / --continue ทุกเส้นทาง — 1 dispatch = process ใหม่เสมอ", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, {});
  for (const forbidden of ["--dangerously-skip-permissions", "--dangerously-bypass-approvals-and-sandbox", "--continue", "--resume", "resume"]) {
    assert.equal(args.includes(forbidden), false, forbidden);
  }
});

test("effort ผ่าน -c ตาม camps.yaml (effortVia) — ไม่มี --effort · effort null → ไม่ส่ง (กติกา 3 — DES-004)", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, {});
  assert.equal(args.filter((a) => a === "-c").length, 1);
  assert.deepEqual(args.slice(args.indexOf("-c"), args.indexOf("-c") + 2), ["-c", "model_reasoning_effort=high"]);
  assert.equal(args.includes("--effort"), false);
  const none = buildArgv(PROFILE, mkReq({ effort: null }), {});
  assert.equal(none.args.includes("-c"), false);
  assert.equal(none.args.some((a) => a.startsWith("model_reasoning_effort=")), false);
  assert.deepEqual(none.args.slice(none.args.indexOf("-m"), none.args.indexOf("-m") + 2), ["-m", "gpt-6.1-sol"]); // model ยังส่งปกติ
});

test("cwdFlag -C จาก camps.yaml (DES-006 ชั้น 2) · rolePromptFlag null → argv ไม่มีไฟล์ role prompt (DES-003)", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, {});
  assert.deepEqual(args.slice(args.indexOf("-C"), args.indexOf("-C") + 2), ["-C", req.cwd]);
  assert.equal(args.includes(req.rolePromptFile), false);
  assert.equal(args.includes("--append-system-prompt-file"), false);
  assert.throws(() => buildArgv(PROFILE, mkReq({ cwd: null }), {}), CampAdapterError); // codex ต้องมี cwd
});

test("fail-closed: codex ไม่มี extraDirsFlag/toolRuleFlags — ส่งมาผิด contract → CampAdapterError ก่อน spawn", () => {
  assert.throws(() => buildArgv(PROFILE, mkReq({ extraDirs: ["C:\\tmp\\x"] }), {}), CampAdapterError);
  assert.throws(() => buildArgv(PROFILE, mkReq(), { toolRules: { allow: ["Read"], deny: [] } }), CampAdapterError);
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new CodexAdapter(PROFILE, { spawnFn });
  assert.throws(() => adapter.dispatch(mkReq({ extraDirs: ["C:\\tmp\\x"] })), CampAdapterError);
  assert.equal(calls.length, 0);
});

// --- dispatch ผ่าน CodexAdapter ด้วย fake spawn ---

test("dispatch (fake spawn): argv + บรีฟ positional ท้าย + pid + last-message file → outcome ครบ + session.log", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new CodexAdapter(PROFILE, { spawnFn, retryOnCrash: CFG.camps.defaults.retryOnCrash });
  const req = mkReq();
  const handle = adapter.dispatch(req);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.command, "codex");
  assert.equal(calls[0]!.args[0], "exec"); // subcommand จาก camps.yaml
  assert.equal(calls[0]!.opts.shell, false); // argv array ตรง ไม่ผ่าน shell (DES-002)
  assert.equal(handle.pid, 4242); // pid บันทึกได้ — ฐานของ AC-066
  const child = calls[0]!.child;
  assert.deepEqual(child.stdin.writes, []); // briefChannel packet-file — brief เป็น positional ไม่ใช่ stdin
  assert.equal(child.stdin.ended, false);
  // last-message file ที่ -o ชี้ (session dir เดียวกับ packet.json) — CLI เขียนจริงตอนจบ; test เขียนแทน
  const handoff = mkHandoff(req);
  writeFileSync(path.join(path.dirname(req.packetPath), "last-message.txt"), JSON.stringify(handoff));
  // JSONL events (รูป session_id/version mark inferred — DES-002): field ซ้อนชั้นเดียวใน event แบบครอบ
  child.stdout.emit("data", Buffer.from([
    '{"id":"0","msg":{"type":"session_configured","session_id":"th-abc","model":"gpt-6.1-sol"}}',
    '{"id":"1","msg":{"type":"task_complete","last_agent_message":"...","version":"0.160.0"}}',
    "",
  ].join("\n")));
  child.emit("close", 0);
  const out = await handle.outcome;
  assert.deepEqual(out, {
    exitCode: 0,
    handoffRaw: JSON.stringify(handoff), // จากไฟล์ last-message — handoff ตรง (DES-002: JSONL events + last-message)
    structuredOutputField: null, // codex ไม่มี envelope — ไม่ประกาศ field (camp-adapter.ts)
    cliSessionId: "th-abc",
    cliVersion: "0.160.0",
    logsPath: sessionLogPath(req),
    failure: null,
  });
  const log = readFileSync(out.logsPath!, "utf8"); // argv + stdout ลง session.log (DES-007)
  assert.ok(log.includes("--output-schema"));
  assert.ok(log.includes("session_id"));
});

test("handoff จาก --output-schema (last-message file) ผ่าน schema validation — เหลือให้ driver ตัดสินต่อ (AC: handoff ผ่าน schema)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const req = mkReq();
  const handle = new CodexAdapter(PROFILE, { spawnFn }).dispatch(req);
  writeFileSync(path.join(path.dirname(req.packetPath), "last-message.txt"), JSON.stringify(mkHandoff(req)));
  calls[0]!.child.stdout.emit("data", '{"id":"0","msg":{"type":"task_started"}}\n');
  calls[0]!.child.emit("close", 0);
  const out = await handle.outcome;
  assert.deepEqual(handoffSchemaProblems(JSON.parse(out.handoffRaw!) as unknown), []);
});

test("last-message file ไม่มี/ว่าง → handoffRaw = stdout (JSONL) — raw คืน driver ตีความต่อ ไม่ตัดสินแทน (base outputRaw)", async () => {
  const jsonl = '{"id":"0","msg":{"type":"task_started"}}\n{"id":"1","msg":{"type":"task_complete"}}\n';
  // ไฟล์ไม่ถูกเขียนเลย (CLI พังก่อนเขียน) — stdout ยังมี JSONL
  const { spawnFn: fn2, calls: calls2 } = fakeSpawn();
  const req2 = mkReq();
  const handle2 = new CodexAdapter(PROFILE, { spawnFn: fn2 }).dispatch(req2);
  calls2[0]!.child.stdout.emit("data", jsonl);
  calls2[0]!.child.emit("close", 0);
  const out2 = await handle2.outcome;
  assert.equal(out2.handoffRaw, jsonl);
  // ไฟล์ว่าง (0 byte — CLI จบก่อนเขียน) → กลับไปใช้ stdout เหมือนกัน
  const { spawnFn: fn3, calls: calls3 } = fakeSpawn();
  const req3 = mkReq();
  const handle3 = new CodexAdapter(PROFILE, { spawnFn: fn3 }).dispatch(req3);
  writeFileSync(path.join(path.dirname(req3.packetPath), "last-message.txt"), "");
  calls3[0]!.child.stdout.emit("data", jsonl);
  calls3[0]!.child.emit("close", 0);
  const out3 = await handle3.outcome;
  assert.equal(out3.handoffRaw, jsonl);
});

test("codexOutputMeta (JSONL — รูป mark `inferred` ตาม DES-002): ชั้นบน/ซ้อน msg.* · บรรทัดไม่ใช่ JSON ข้าม · ไม่เจอ → null", () => {
  // session_id ซ้อนชั้นเดียว (event แบบครอบ)
  assert.deepEqual(
    codexOutputMeta('{"id":"0","msg":{"type":"session_configured","session_id":"th-1"}}\n'),
    { cliSessionId: "th-1", cliVersion: null },
  );
  // session_id/version ชั้นบนสุด
  assert.deepEqual(
    codexOutputMeta('{"type":"thread.started","session_id":"th-2","version":"0.160.0"}\n'),
    { cliSessionId: "th-2", cliVersion: "0.160.0" },
  );
  // บรรทัดไม่ใช่ JSON ข้าม — ไม่ทำให้ stdout ทั้งก้อนพัง (JSONL อ่านต่อ)
  assert.deepEqual(codexOutputMeta('boom\nnot json\n{"session_id":"x"}\n'), { cliSessionId: "x", cliVersion: null });
  // ค่าไม่ใช่ string/ค่าว่าง → null (fail-closed ไม่เดา)
  assert.deepEqual(codexOutputMeta('{"session_id":123,"version":0}'), { cliSessionId: null, cliVersion: null });
  assert.deepEqual(codexOutputMeta('{"msg":{"session_id":""}}'), { cliSessionId: null, cliVersion: null });
  // stdout ว่าง → null ทั้งคู่
  assert.deepEqual(codexOutputMeta(""), { cliSessionId: null, cliVersion: null });
});

test("timeout → kill tree (taskkill /T /F) + outcome 'timeout' — เหมือน BE-012 (R16 ตัดสินต่อ ไม่ retry ใน adapter)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new CodexAdapter(PROFILE, { spawnFn });
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
  const adapter = new CodexAdapter(PROFILE, { spawnFn });
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
  const adapter = new CodexAdapter(PROFILE, { spawnFn, retryOnCrash: CFG.camps.defaults.retryOnCrash }); // camps.yaml = 1
  const req = mkReq();
  const handle = adapter.dispatch(req);
  assert.equal(handle.pid, null);
  calls[0]!.child.emit("error", ENOENT());
  assert.equal(calls.length, 2, "spawn ซ้ำทันที — sessionId/argv เดิม");
  assert.deepEqual(calls[1]!.args, calls[0]!.args);
  calls[1]!.child.emit("error", ENOENT());
  const out = await handle.outcome;
  assert.deepEqual(out, {
    exitCode: null, handoffRaw: null, structuredOutputField: null, cliSessionId: null, cliVersion: null,
    logsPath: sessionLogPath(req), failure: "spawn",
  });
  const log = readFileSync(out.logsPath!, "utf8");
  assert.ok(log.includes("attempt 1/2"));
  assert.ok(log.includes("attempt 2/2"));
});

test("spawn พังครั้งเดียวแล้วสำเร็จ → retry ได้ผล — pid ชี้ child ที่มีชีวิต (DES-007)", async () => {
  const { spawnFn, calls } = fakeSpawn([null, 4242]);
  const adapter = new CodexAdapter(PROFILE, { spawnFn, retryOnCrash: 1 });
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

test("exit ≠ 0 → outcome 'crash' — handoffRaw คืน raw stdout ไว้ให้ driver ตรวจ (ไม่ตัดสินแทน)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new CodexAdapter(PROFILE, { spawnFn });
  const handle = adapter.dispatch(mkReq());
  calls[0]!.child.stderr.emit("data", "boom");
  calls[0]!.child.stdout.emit("data", '{"id":"0","msg":{"type":"error","message":"stream error"}}');
  calls[0]!.child.emit("close", 1);
  const out = await handle.outcome;
  assert.deepEqual({ failure: out.failure, exitCode: out.exitCode }, { failure: "crash", exitCode: 1 });
  assert.ok(out.handoffRaw!.includes("stream error"));
  assert.ok(readFileSync(out.logsPath!, "utf8").includes("boom"));
});

test("AC-004: packet camp-agnostic — packet.json ชุดเดียวกับ camp อื่น ชี้ด้วยบรีฟสั้น channel packet-file", () => {
  const req = mkReq();
  const pointer = packetPointerText(PROFILE, req);
  assert.ok(pointer.startsWith("อ่านและทำตาม dispatch packet ที่ ")); // ถ้อยคำตรงตัว DES-002 ฝั่ง packet-file
  assert.ok(pointer.endsWith(req.packetPath)); // ชี้ path เท่านั้น — เนื้อบรีฟอยู่ใน packet.json ไฟล์เดียวกันทุก camp
  const packet = JSON.parse(readFileSync(req.packetPath, "utf8")) as PacketV2;
  assert.equal(packet.packetVersion, 2);
  assert.equal(typeof packet.brief, "string");
  assert.equal(packet.role, "backend-engineer");
});

test("CodexAdapter ตรง CampAdapter contract — campAdapterProblems ผ่าน (core ตรวจก่อน driver ลงทะเบียน)", () => {
  const adapter = new CodexAdapter(PROFILE, { spawnFn: fakeSpawn().spawnFn });
  assert.deepEqual(campAdapterProblems(adapter), []);
  assert.equal(adapter.camp, "codex");
});
