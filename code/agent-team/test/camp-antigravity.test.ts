// BE-014 — node:test ของ camp adapter antigravity (DES-002 — agy 1.2.16) — ทุก test ใช้ fake spawn (ห้าม spawn CLI จริง)
// ครอบ Acceptance: command line ตรง DES-002 ทุก flag — flags อ่านจาก camps.yaml จริง (ไม่ hardcode; logFlag
// มีเฉพาะ camp นี้) · effort=null (T2/T3/T6 ของ antigravity — effort ฝังในชื่อ model) → ไม่ส่ง --effort · ค่า
// --json-schema = path ไฟล์ ตามรูปที่ design เขียน (mark สมมติฐาน — DES-002 ยังไม่ยืนยันรูปค่ากับ agy จริง) ·
// ไม่มี resume/bypass flag (AC-033 — session ใหม่เสมอ) · --log-file ชี้ session.log ใต้ sessions/<sid>/ (DES-007) ·
// timeout/spawn fail เหมือน BE-012/013 (ฐานร่วม base.ts — R16/retryOnCrash) · packet เดียวกับ camp อื่น (AC-004) ·
// handoff = stdout JSON ตรง — ไม่มี envelope (structuredOutputField ไม่ตั้ง) · cliSessionId/cliVersion = null
// (DES-002: agy ไม่ทราบ → ไม่เดา)
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
import { AntigravityAdapter } from "../src/camps/antigravity.ts";

// camps.yaml จริงของ deployment (BE-001 validate แล้ว) — พิสูจน์ว่า argv มาจาก config ไม่ใช่ค่า hardcode
const CFG = loadAppConfig();
const PROFILE: CampProfile = CFG.camps.camps.antigravity;

const tmp = mkdtempSync(path.join(os.tmpdir(), "be014-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

// --- fixture: ไฟล์ที่ argv จะชี้ + packet v2 (รูปตาม data-model — ชุดเดียวกับ camp-claude/codex.test.ts, AC-004) ---

const RP_FILE = path.join(tmp, "backend-engineer.md");
writeFileSync(RP_FILE, "---\nname: backend-engineer\ntools: Read, Write, Edit, Glob, Grep\nmodel: sonnet\neffort: medium\n---\n\nYou implement backend tasks.\n");
// ไฟล์ schema ที่ driver เขียนต่อ session — ค่า --json-schema = path ตามรูปที่ DES-002 เขียนไว้ (mark สมมติฐาน)
// → ไฟล์บนดิสก์คงเต็มตาม contract รวม $schema ราก (DES-012)
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
  taskIds: ["BE-014"],
  planPhase: "4",
  attempt: 1,
  dateFromUser: "2026-10-07",
  docsRoot: "C:\\src\\AICode\\rong-ngang\\knowledge\\agent-team",
  docsLayout: "split",
  selectedTarget: { name: "agent-team-code", path: "C:\\src\\AICode\\rong-ngang\\code\\agent-team" },
  gitPolicy: [],
  readSections: ["plan\\be-014.md", "design\\des-002.md"],
  writeScope: { allow: ["codeRoots/**"], deny: [] },
  claim: [],
  priorSession: null,
  defectPacket: null,
  reviewInput: null,
  blocker: null,
  rolePrompt: { source: RP_FILE, hash: `sha256:${"0".repeat(64)}` },
  brief: "ทำ BE-014 ตาม task file",
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
    model: "gemini-3.8-flash-high", // T2 ของ antigravity (tiers.yaml จริง) — effort ฝังในชื่อ model
    effort: null, // T2–T6 ของ antigravity เป็น null (data-model/tiers.yaml) — กติกา 3 (DES-004)
    handoffSchemaPath: SCHEMA_FILE,
    timeoutSec: 1800,
    cwd: "C:\\src\\AICode\\rong-ngang\\code", // packRoot (DES-013) — spawn cwd (agy ไม่มี cwdFlag)
    // DES-002: --add-dir <docsRoot> --add-dir <codeRoots> — repeatable (agy --help)
    extraDirs: [BASE_PACKET.docsRoot, BASE_PACKET.selectedTarget.path],
    ...over,
  };
}

const mkHandoff = (req: CampDispatch): Record<string, unknown> => ({
  role: req.packet.role, module: req.packet.module, sessionId: req.packet.sessionId, outputState: "DONE",
  result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none", questionsForHuman: [],
  blocker: null, impactedTasks: null, decision: null, review: null, qa: null, featureQa: null, security: null, securityGate: null,
});

// --- fake spawn: ไม่มี process จริง — child ปลอมที่ test ปล่อย event เอง (รูปเดียวกับ camp-claude/codex.test.ts) ---

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

const ENOENT = () => Object.assign(new Error("spawn agy ENOENT"), { code: "ENOENT" });

// --- camps.yaml จริง — pin profile ของ antigravity ให้ตรง DES-002 (flag เหล่านี้เป็นที่มาของ argv ทั้งหมด) ---

test("camps.yaml profile antigravity ตรง DES-002 — logFlag/extraDirsFlag มีเฉพาะ camp นี้ · ไม่มี subcommand/cwdFlag/toolRuleFlags", () => {
  assert.equal(PROFILE.command, "agy");
  assert.deepEqual(PROFILE.headlessArgs, ["-p", "--output-format", "json", "--sandbox"]); // --sandbox = write scope ชั้น 2 (DES-006)
  assert.equal(PROFILE.modelFlag, "--model");
  assert.equal(PROFILE.effortFlag, "--effort"); // agy --help: (low|medium|high|xhigh|max)
  assert.equal(PROFILE.schemaFlag, "--json-schema");
  assert.equal(PROFILE.rolePromptFlag, null); // role prompt อยู่ใน packet (DES-003)
  assert.equal(PROFILE.briefChannel, "packet-file");
  assert.equal(PROFILE.extraDirsFlag, "--add-dir"); // repeatable (agy --help)
  assert.equal(PROFILE.logFlag, "--log-file"); // มีเฉพาะ camp นี้ (DES-007)
  assert.equal(PROFILE.subcommand, undefined);
  assert.equal(PROFILE.cwdFlag ?? null, null);
  assert.equal(PROFILE.toolRuleFlags, undefined);
});

// --- argv จาก CampProfile (camps.yaml จริง) — agy ไม่มี toolRules ให้ส่ง (ไม่มี toolRuleFlags) ---

test("buildArgv ประกอบ command line ตรง DES-002 ทุก flag — flags จาก camps.yaml จริง (ไม่ hardcode) · effort=null ไม่ปรากฏใน argv", () => {
  const req = mkReq(); // effort null — ค่าจริงของ T2–T6 antigravity
  const built = buildArgv(PROFILE, req, {});
  assert.deepEqual([PROFILE.command, ...built.args], [
    "agy",
    ...PROFILE.headlessArgs, // -p --output-format json --sandbox (จาก config)
    PROFILE.modelFlag!, "gemini-3.8-flash-high", // model จาก CampProfile
    // effort null → ไม่มี --effort (กติกา 3 — DES-004)
    PROFILE.schemaFlag!, SCHEMA_FILE, // --json-schema = path ไฟล์ (mark สมมติฐาน — DES-002)
    PROFILE.extraDirsFlag!, req.packet.docsRoot, // --add-dir repeatable — docsRoot + codeRoots (DES-006 ชั้น 2)
    PROFILE.extraDirsFlag!, req.packet.selectedTarget.path,
    PROFILE.logFlag!, sessionLogPath(req), // --log-file → session.log ใต้ sessions/<sid>/ (DES-007)
    `อ่านและทำตาม dispatch packet ที่ ${req.packetPath}`, // briefChannel packet-file — positional ท้าย command line
  ]);
  assert.equal(built.lastMessagePath, null, "agy ไม่มี placeholder <lastMessagePath> ใน headlessArgs");
  assert.equal(built.args.at(-1), packetPointerText(PROFILE, req)); // positional ท้ายเสมอ (DES-002)
  assert.equal(argsCount(built.args, "--effort"), 0);
});

test("effort มีค่า → --effort <effort> ตาม camps.yaml (effortFlag) — ค่า low|medium|high|xhigh|max ตาม agy --help", () => {
  const req = mkReq({ effort: "high" });
  const { args } = buildArgv(PROFILE, req, {});
  assert.equal(argsCount(args, "--effort"), 1);
  assert.deepEqual(args.slice(args.indexOf("--effort"), args.indexOf("--effort") + 2), ["--effort", "high"]);
  assert.deepEqual(args.slice(args.indexOf("--model"), args.indexOf("--model") + 2), ["--model", "gemini-3.8-flash-high"]); // model ยังส่งปกติ
});

test("ค่า --json-schema = path ไฟล์ ตามรูปที่ design เขียน (mark สมมติฐาน — ยังไม่ยืนยันกับ agy จริง) · ไฟล์บนดิสก์คงเต็มรวม $schema ราก", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, {});
  const at = args.indexOf(PROFILE.schemaFlag!);
  assert.deepEqual(args.slice(at, at + 2), ["--json-schema", SCHEMA_FILE]);
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

test("--log-file ชี้ session.log ใต้ sessions/<sid>/ (DES-007) · rolePromptFlag null → argv ไม่มีไฟล์ role prompt (DES-003)", () => {
  const req = mkReq();
  const { args } = buildArgv(PROFILE, req, {});
  const at = args.indexOf(PROFILE.logFlag!);
  assert.deepEqual(args.slice(at, at + 2), ["--log-file", sessionLogPath(req)]);
  const logDir = path.dirname(sessionLogPath(req));
  assert.equal(path.basename(path.dirname(logDir)), "sessions");
  assert.equal(path.basename(logDir), req.packet.sessionId); // sessions/<sid>/session.log
  assert.equal(args.includes(req.rolePromptFile), false);
  assert.equal(args.includes("--append-system-prompt-file"), false);
});

test("fail-closed: agy ไม่มี toolRuleFlags — ส่ง toolRules มาผิด contract → CampAdapterError ก่อน spawn · extraDirs ผ่านได้ (ต่างจาก codex)", () => {
  assert.throws(() => buildArgv(PROFILE, mkReq(), { toolRules: { allow: ["Read"], deny: [] } }), CampAdapterError);
  const { args } = buildArgv(PROFILE, mkReq(), {}); // extraDirs ตาม DES-002 — --add-dir 2 รายการ
  assert.equal(argsCount(args, "--add-dir"), 2);
});

test("fail-closed ก่อน spawn: packet ไม่มีจริง → CampAdapterError และ spawnFn ไม่ถูกเรียกเลย", () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn });
  const req = mkReq();
  rmSync(req.packetPath); // packet.json หายหลัง mkReq — ชี้แล้ว CLI อ่านไม่เจอคือ session เสียเปล่า
  assert.throws(() => adapter.dispatch(req), CampAdapterError);
  assert.equal(calls.length, 0);
});

// --- dispatch ผ่าน AntigravityAdapter ด้วย fake spawn ---

test("dispatch (fake spawn): argv + บรีฟ positional ท้าย + pid + stdout JSON → outcome ครบ + session.log", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn, retryOnCrash: CFG.camps.defaults.retryOnCrash });
  const req = mkReq();
  const handle = adapter.dispatch(req);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.command, "agy"); // command จาก camps.yaml
  assert.equal(calls[0]!.args.includes("--sandbox"), true); // write scope ชั้น 2 จาก headlessArgs (DES-006)
  assert.equal(calls[0]!.opts.shell, false); // argv array ตรง ไม่ผ่าน shell (DES-002)
  assert.equal(calls[0]!.opts.cwd, req.cwd); // spawn cwd = packRoot (DES-013)
  assert.equal(handle.pid, 4242); // pid บันทึกได้ — ฐานของ AC-066
  const child = calls[0]!.child;
  assert.deepEqual(child.stdin.writes, []); // briefChannel packet-file — brief เป็น positional ไม่ใช่ stdin
  assert.equal(child.stdin.ended, false);
  // stdout JSON ตรง DES-002: agy → stdout JSON — สำเร็จ = exit 0 + handoff ผ่าน schema (ตัดสินที่ driver)
  const handoff = mkHandoff(req);
  child.stdout.emit("data", JSON.stringify(handoff));
  child.emit("close", 0);
  const out = await handle.outcome;
  assert.deepEqual(out, {
    exitCode: 0,
    handoffRaw: JSON.stringify(handoff), // stdout = handoff ตรง — ไม่มี last-message file (agy ไม่มี -o)
    structuredOutputField: null, // agy ไม่มี envelope — ไม่ประกาศ field (ต่างจาก claude QA-009)
    cliSessionId: null, // DES-002: agy ไม่ทราบ → null — ไม่เดา
    cliVersion: null, // ไม่มีรูป field ใน design → null ตามจริง (fail-closed)
    logsPath: sessionLogPath(req),
    failure: null,
  });
  const log = readFileSync(out.logsPath!, "utf8"); // argv + stdout ลง session.log (DES-007)
  assert.ok(log.includes("--log-file"));
  assert.ok(log.includes("--json-schema"));
  assert.ok(log.includes("outputState")); // เนื้อ stdout ลง log ครบ
});

test("handoff จาก stdout JSON ผ่าน schema validation — เหลือให้ driver ตัดสินต่อ (AC: สำเร็จ = exit 0 + handoff ผ่าน schema)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const req = mkReq();
  const handle = new AntigravityAdapter(PROFILE, { spawnFn }).dispatch(req);
  calls[0]!.child.stdout.emit("data", JSON.stringify(mkHandoff(req)));
  calls[0]!.child.emit("close", 0);
  const out = await handle.outcome;
  assert.equal(out.exitCode, 0);
  assert.deepEqual(handoffSchemaProblems(JSON.parse(out.handoffRaw!) as unknown), []);
});

test("exit 0 แต่ stdout ว่าง → handoffRaw = null (ไม่ผ่าน schema ที่ driver — ไม่เดาค่าแทน)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const handle = new AntigravityAdapter(PROFILE, { spawnFn }).dispatch(mkReq());
  calls[0]!.child.emit("close", 0);
  const out = await handle.outcome;
  assert.equal(out.failure, null);
  assert.equal(out.handoffRaw, null);
});

test("timeout → kill tree (taskkill /T /F) + outcome 'timeout' — เหมือน BE-012 (R16 ตัดสินต่อ ไม่ retry ใน adapter)", async () => {
  const { spawnFn, calls } = fakeSpawn();
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn });
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
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn });
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
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn, retryOnCrash: CFG.camps.defaults.retryOnCrash }); // camps.yaml = 1
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
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn, retryOnCrash: 1 });
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
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn });
  const handle = adapter.dispatch(mkReq());
  calls[0]!.child.stderr.emit("data", "boom");
  calls[0]!.child.stdout.emit("data", '{"error":"agy exited with code 1"}');
  calls[0]!.child.emit("close", 1);
  const out = await handle.outcome;
  assert.deepEqual({ failure: out.failure, exitCode: out.exitCode }, { failure: "crash", exitCode: 1 });
  assert.ok(out.handoffRaw!.includes("agy exited with code 1"));
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

test("AntigravityAdapter ตรง CampAdapter contract — campAdapterProblems ผ่าน (core ตรวจก่อน driver ลงทะเบียน)", () => {
  const adapter = new AntigravityAdapter(PROFILE, { spawnFn: fakeSpawn().spawnFn });
  assert.deepEqual(campAdapterProblems(adapter), []);
  assert.equal(adapter.camp, "antigravity");
});

// นับจำนวนครั้งที่ flag ปรากฏใน argv (flag เดียวกันอาจ repeat ได้ เช่น --add-dir)
function argsCount(args: string[], flag: string): number {
  return args.filter((a) => a === flag).length;
}
