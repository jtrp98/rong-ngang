// BE-012 — กลไก spawn ร่วมของ camp adapter (ฐานเดียวที่ claude = BE-012 / codex = BE-013 / antigravity = BE-014 ต่อใช้)
// ตาม DES-002: spawn ด้วย child_process.spawn argv array ตรง ไม่ผ่าน shell · ทุก flag อ่านจาก CampProfile
// (camps.yaml ที่ BE-001 validate แล้ว — ห้าม hardcode ค่าที่ควรมาจาก config) · บรีฟสั้นชี้ packet file ตาม
// briefChannel (stdin = เขียน stdin · packet-file = positional arg ท้าย command line) · timeout → kill ทั้ง
// process tree → outcome "timeout" (router R16 ตัดสินต่อ — ไม่ retry ใน adapter) · spawn ไม่สำเร็จ
// (process ไม่เริ่ม — ENOENT/EACCES) → spawn ซ้ำ sessionId เดิมตาม camps.defaults.retryOnCrash (DES-007 —
// ผู้เรียกส่งค่าเข้ามา, default 0 = ไม่ retry แบบ fail-closed) · exit ≠ 0 → "crash" · kill() → "interrupted" ·
// ทุก attempt บันทึก argv/stdout/stderr ลง sessions/<sid>/session.log (DES-007 — argv ไม่มี secret ตาม DES-002
// Security) · handoffRaw = raw stdout หรือ last-message file — การตีความ handoff (schema/กฎ) เป็นของ driver
// (camp-adapter.ts — adapter ไม่ตัดสิน handoff ไม่เดาค่าแทน)
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { CampName, CampProfile } from "../core/config.ts";
import type { CampDispatch, CampOutcome, CampSessionHandle } from "../core/contract/camp-adapter.ts";

// --- seam ของ test: ทุก test ถักเส้น spawn ด้วย SpawnFn ปลอม — ห้าม spawn CLI จริงใน test ---

export interface SpawnOptionsLite {
  cwd?: string;
  shell: false; // DES-002 — argv array ตรง ไม่ผ่าน shell เสมอ
  windowsHide?: boolean;
  detached?: boolean; // นอก Windows: spawn แบบกลุ่ม process เพื่อ kill tree ด้วย process.kill(-pid)
}

// child โครงน้อยที่สุดที่ adapter ใช้ — ChildProcess จริงกับ child ปลอมใน test อยู่รูปเดียวกันได้
export interface CampChild {
  pid: number | null;
  stdin: { write(chunk: string): unknown; end(): unknown } | null;
  stdout: { on(event: "data", listener: (chunk: unknown) => void): unknown } | null;
  stderr: { on(event: "data", listener: (chunk: unknown) => void): unknown } | null;
  on(event: "error", listener: (err: Error) => void): unknown;
  on(event: "close", listener: (code: number | null) => void): unknown;
  kill(signal?: string | number): unknown;
}

export type SpawnFn = (command: string, args: string[], opts: SpawnOptionsLite) => CampChild;

const defaultSpawnFn: SpawnFn = (command, args, opts) =>
  spawn(command, args, { ...opts, stdio: "pipe" }) as unknown as CampChild;

// adapter ผิดรูป/ข้อมูลไม่ครบต้องหยุดก่อน spawn — ไม่เดาค่าแทน (fail-closed ตาม design)
export class CampAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampAdapterError";
  }
}

// เพดานความยาว "ค่า" schema ที่เข้า argv เมื่อ camp รับ inline JSON (schemaInline — QA-007): Windows
// CreateProcess จำกัด command line ~32,767 ตัวอักษร — เพดาน 8,192 สงวน ≥ ~24 KB ให้ argv ส่วนที่เหลือ
// (flags/model/toolRules+claims/add-dir/log — claims เป็นส่วนเดียวที่โดยตัว) · handoff-v2 compact วัดจริง
// 6,152 ตัวอักษร (2026-10-07) → headroom ~2 KB ให้ schema โตแบบ additive (DES-002)
export const SCHEMA_ARGV_MAX_CHARS = 8192;

// QA-007: claude CLI 2.1.292 รับค่า --json-schema เป็น inline JSON เท่านั้น — ส่ง path แล้ว CLI parse
// path เป็น JSON ไม่ผ่าน → exit 1 ทุก session (`JSON Parse error: Unexpected identifier "C"`) · helper อ่าน
// ไฟล์ schema ที่ driver เขียนไว้ต่อ session (camp-adapter.ts) แปลงเป็น JSON compact ก่อน spawn และตัด
// $schema ระดับราก — CLI พิสูจน์จริง 2026-10-07: validator ไม่รู้จัก meta-schema draft 2020-12 ติด
// `no schema with key or ref "https://json-schema.org/draft/2020-12/schema"` → exit 1 ($schema เป็น
// ประกาศภาษา ไม่ใช่กฎตรวจ — ไฟล์บนดิสก์คงเต็มตาม contract) · fail-closed ทั้งเส้น: อ่านไม่ได้/JSON ผิดรูป/
// รากไม่ใช่ object/เกินเพดาน → CampAdapterError ก่อน spawn — ไม่มี fallback กลับไปส่ง path เพราะ CLI ปฏิเสธ path
function inlineSchemaArgv(schemaPath: string): string {
  let raw: string;
  try {
    raw = readFileSync(schemaPath, "utf8");
  } catch (e) {
    throw new CampAdapterError(`อ่านไฟล์ handoff schema ไม่ได้: ${schemaPath} — ${e instanceof Error ? e.message : String(e)} (fail-closed — QA-007)`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new CampAdapterError(`ไฟล์ handoff schema ไม่ใช่ JSON ที่ parse ได้: ${schemaPath} — ${e instanceof Error ? e.message : String(e)} (fail-closed — QA-007)`);
  }
  // รากของ JSON Schema ต้องเป็น object — ค่าอื่น (array/primitive) CLI จะปฏิเสธเป็น session ที่เสียเปล่า
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CampAdapterError(`ไฟล์ handoff schema ต้องมีรากเป็น object (JSON Schema): ${schemaPath} (fail-closed — QA-007)`);
  }
  const root = parsed as Record<string, unknown>;
  if ("$schema" in root) {
    const { $schema: _dialect, ...rules } = root;
    parsed = rules;
  }
  const inline = JSON.stringify(parsed); // เพดานวัดที่รูป compact ที่เข้า argv จริง — ไฟล์ดิบยาวแต่ compact สั้น = ผ่าน
  if (inline.length > SCHEMA_ARGV_MAX_CHARS) {
    throw new CampAdapterError(
      `schema inline ยาว ${inline.length} > เพดาน ${SCHEMA_ARGV_MAX_CHARS} ตัวอักษร (ขีดจำกัด argv ของ Windows) — ปฏิเสธก่อน spawn (fail-closed — QA-007)`,
    );
  }
  return inline;
}

// --- argv จาก CampProfile + CampDispatch (ลำดับตรง DES-002: subcommand, headlessArgs, cwd, model,
// effort, schema, rolePrompt, toolRules, extraDirs, log, positional brief) ---

export interface ToolRuleArgs {
  allow: string[]; // ค่าต่อท้าย toolRuleFlags[0] (--allowedTools) — รายชื่อ tool + Edit(<claim>)/Write(<claim>)
  deny: string[]; // ค่าต่อท้าย toolRuleFlags[1] (--disallowedTools)
}

export interface BuildArgvOptions {
  toolRules?: ToolRuleArgs | null; // camp ไม่มี toolRuleFlags แต่ส่ง rules มา → ปฏิเสธ
  schemaInline?: boolean; // ค่า schemaFlag = inline JSON (claude — QA-007: CLI ปฏิเสธ path) · default false = ส่ง path (codex --output-schema: "JSON Schema file" — DES-002)
}

export interface BuiltArgv {
  args: string[]; // argv หลังชื่อ command — spawn(command, args)
  lastMessagePath: string | null; // มีเมื่อ headlessArgs ใช้ placeholder <lastMessagePath> (codex -o — BE-013 อ่านคืน)
}

export function sessionLogPath(req: CampDispatch): string {
  return path.join(path.dirname(req.packetPath), "session.log"); // DES-007 — log ต่อ session
}

// บรีฟสั้นชี้ packet.json — ถ้อยคำตรงตัว DES-002 (stdin ของ claude / positional ของ codex-agy)
// packet camp-agnostic (AC-004): ข้อความนี้ชี้ path เท่านั้น — เนื้อบรีฟอยู่ใน packet.json ไฟล์เดียวกันทุก camp
export function packetPointerText(profile: CampProfile, req: CampDispatch): string {
  return profile.briefChannel === "stdin"
    ? `ทำงานตาม dispatch packet ที่ ${req.packetPath}`
    : `อ่านและทำตาม dispatch packet ที่ ${req.packetPath}`;
}

export function buildArgv(profile: CampProfile, req: CampDispatch, opts: BuildArgvOptions = {}): BuiltArgv {
  // ไฟล์ที่ argv จะชี้ต้องมีจริงก่อน spawn (fail-closed — ชี้แล้ว CLI อ่านไม่เจอคือ session เสียเปล่า)
  if (!existsSync(req.packetPath)) {
    throw new CampAdapterError(`packet ไม่มีจริง: ${req.packetPath} — ปฏิเสธ dispatch (fail-closed)`);
  }
  if (profile.rolePromptFlag !== null && !existsSync(req.rolePromptFile)) {
    throw new CampAdapterError(`ไฟล์ role prompt ไม่มีจริง: ${req.rolePromptFile} (fail-closed — DES-003)`);
  }
  if (profile.schemaFlag !== null && req.handoffSchemaPath !== null && !existsSync(req.handoffSchemaPath)) {
    throw new CampAdapterError(`ไฟล์ handoff schema ไม่มีจริง: ${req.handoffSchemaPath} (fail-closed — DES-012)`);
  }

  const args: string[] = [];
  if (profile.subcommand) args.push(profile.subcommand);

  // headlessArgs — แทน placeholder <lastMessagePath> เป็นไฟล์ในโฟลเดอร์ session (codex --output-last-message)
  let lastMessagePath: string | null = null;
  const sessionDir = path.dirname(req.packetPath);
  for (const arg of profile.headlessArgs) {
    if (arg === "<lastMessagePath>") {
      lastMessagePath = path.join(sessionDir, "last-message.txt");
      args.push(lastMessagePath);
    } else {
      args.push(arg);
    }
  }

  // cwdFlag (codex -C — DES-006 ชั้น 2) — claude ไม่มี flag นี้: cwd ของ spawn อย่างเดียว
  if (profile.cwdFlag) {
    if (req.cwd === null || req.cwd.trim() === "") {
      throw new CampAdapterError(`camp "${profile.command}" มี cwdFlag ${profile.cwdFlag} แต่ dispatch.cwd ไม่มี — ปฏิเสธ (fail-closed)`);
    }
    args.push(profile.cwdFlag, req.cwd);
  }

  if (profile.modelFlag === null) {
    throw new CampAdapterError(`camp "${profile.command}" ไม่มี modelFlag — ส่ง model ไม่ได้ (fail-closed — DES-004)`);
  }
  if (req.model.trim() === "") {
    throw new CampAdapterError(`model ว่าง — camp "${profile.command}" ปฏิเสธ dispatch (fail-closed — DES-004)`);
  }
  args.push(profile.modelFlag, req.model);

  if (req.effort === null) {
    // กติกา 3 (DES-004): effort null = reasoning เลือกโดย model เอง — ห้ามส่ง flag
  } else if (profile.effortFlag) {
    args.push(profile.effortFlag, req.effort);
  } else if (profile.effortVia && profile.effortVia.length > 0) {
    for (const piece of profile.effortVia) args.push(piece.replace("<effort>", req.effort));
  } else {
    throw new CampAdapterError(`camp "${profile.command}" ไม่มี effortFlag/effortVia — ส่ง effort "${req.effort}" ไม่ได้ (fail-closed — DES-004)`);
  }

  // schemaFlag/handoffSchemaPath ต้องสอดคล้องกันทั้งคู่ — null ฝั่งเดียว = driver ประกอบผิด contract (camp-adapter.ts)
  if ((profile.schemaFlag === null) !== (req.handoffSchemaPath === null)) {
    throw new CampAdapterError(
      `schemaFlag (${profile.schemaFlag}) กับ handoffSchemaPath (${req.handoffSchemaPath}) ไม่สอดคล้อง — schemaEnforcedByCli ต้องตรง camps.yaml (fail-closed — DES-012)`,
    );
  }
  if (profile.schemaFlag !== null && req.handoffSchemaPath !== null) {
    if (opts.schemaInline === true) {
      args.push(profile.schemaFlag, inlineSchemaArgv(req.handoffSchemaPath));
    } else {
      args.push(profile.schemaFlag, req.handoffSchemaPath);
    }
  }

  // rolePromptFlag (claude --append-system-prompt-file) — camp อื่นเป็น null: role prompt อยู่ใน packet file แล้ว (DES-003)
  if (profile.rolePromptFlag !== null) args.push(profile.rolePromptFlag, req.rolePromptFile);

  const rules = opts.toolRules ?? null;
  if (profile.toolRuleFlags && profile.toolRuleFlags.length >= 2) {
    if (rules) {
      if (rules.allow.length > 0) args.push(profile.toolRuleFlags[0]!, ...rules.allow);
      if (rules.deny.length > 0) args.push(profile.toolRuleFlags[1]!, ...rules.deny);
    }
  } else if (rules && (rules.allow.length > 0 || rules.deny.length > 0)) {
    throw new CampAdapterError(`camp "${profile.command}" ไม่มี toolRuleFlags แต่มี toolRules ให้ส่ง — ปฏิเสธ (fail-closed)`);
  }

  if (profile.extraDirsFlag) {
    for (const dir of req.extraDirs) args.push(profile.extraDirsFlag, dir);
  } else if (req.extraDirs.length > 0) {
    throw new CampAdapterError(`camp "${profile.command}" ไม่มี extraDirsFlag แต่มี extraDirs ${req.extraDirs.length} รายการ — ปฏิเสธ (fail-closed — DES-006 ชั้น 2)`);
  }

  if (profile.logFlag) args.push(profile.logFlag, sessionLogPath(req));

  // packet-file channel: บรีฟสั้นเป็น positional arg ท้าย command line · stdin channel: ส่งตอน spawn (spawnDispatch)
  if (profile.briefChannel === "packet-file") args.push(packetPointerText(profile, req));

  return { args, lastMessagePath };
}

// --- spawn + เฝ้าผล — คืน handle ทันที ผลเดินทาง promise (CampSessionHandle — camp-adapter.ts) ---

export interface SpawnDispatchOptions extends BuildArgvOptions {
  parseOutput?: (stdout: string) => { cliSessionId: string | null; cliVersion: string | null }; // ต่อ camp — อ่าน stdout JSON
  structuredOutputField?: string | null; // ชื่อ object field ที่ CLI ครอบ structured output (CampOutcome — QA-009) —
  // ความรู้ต่อ camp จาก adapter ผู้เรียก ไม่ hardcode ใน driver/base · ส่งต่อทุก outcome ที่ spawnDispatch คืน
  spawnFn?: SpawnFn; // seam ของ test — default child_process.spawn
  retryOnCrash?: number; // camps.defaults.retryOnCrash (DES-007 — spawn ไม่สำเร็จเท่านั้น) · default 0 = fail-closed
}

export function spawnDispatch(
  camp: CampName,
  profile: CampProfile,
  req: CampDispatch,
  opts: SpawnDispatchOptions = {},
): CampSessionHandle {
  const spawnFn = opts.spawnFn ?? defaultSpawnFn;
  const retryOnCrash = Math.max(0, Math.floor(opts.retryOnCrash ?? 0));
  const soField = opts.structuredOutputField ?? null; // CampOutcome.structuredOutputField — คงความรู้ต่อ camp ทุก outcome (QA-009)
  const { args, lastMessagePath } = buildArgv(profile, req, opts);
  const logsPath = sessionLogPath(req);
  const pointer = packetPointerText(profile, req);

  let child: CampChild | null = null;
  let currentPid: number | null = null;
  let attempts = 0;
  let settled = false;
  let killed: "timeout" | "interrupted" | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let resolveOutcome!: (outcome: CampOutcome) => void;
  const outcome = new Promise<CampOutcome>((resolve) => {
    resolveOutcome = resolve;
  });

  const appendLog = (line: string): void => {
    // session.log เขียนไม่ได้ห้ามชนะ dispatch — log เป็นหลักฐานประกอบ ไม่ใช่ทางผ่านของข้อมูล
    try {
      mkdirSync(path.dirname(logsPath), { recursive: true });
      appendFileSync(logsPath, `${new Date().toISOString()} ${line}\n`, "utf8");
    } catch {
      // ทิ้ง — outcome ยังครบทุก field
    }
  };

  const finish = (value: CampOutcome): void => {
    if (settled) return;
    settled = true;
    if (timer !== null) clearTimeout(timer);
    resolveOutcome(value);
  };

  // kill ทั้ง tree (DES-007): Windows = taskkill /PID <pid> /T /F (รูป `inferred` ยังไม่ทดสอบบนเครื่องจริง —
  // QA ตรวจต่อ) · นอก Windows = kill กลุ่ม process ที่ spawn แบบ detached
  const killTree = (): void => {
    if (child !== null) {
      try {
        child.kill("SIGKILL");
      } catch {
        // ตายไปแล้ว — ตัดสินใจต่อที่ close
      }
    }
    const pid = currentPid;
    if (pid === null) return;
    if (process.platform === "win32") {
      try {
        spawnFn("taskkill", ["/PID", String(pid), "/T", "/F"], { shell: false });
        appendLog(`kill tree: taskkill /PID ${pid} /T /F`);
      } catch (e) {
        appendLog(`taskkill ผิดพลาด: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      try {
        process.kill(-pid, "SIGKILL");
        appendLog(`kill tree: process.kill(-${pid}, SIGKILL)`);
      } catch (e) {
        appendLog(`process.kill(-pid) ผิดพลาด: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  };

  const spawnFailure: CampOutcome = { exitCode: null, handoffRaw: null, structuredOutputField: soField, cliSessionId: null, cliVersion: null, logsPath, failure: "spawn" };
  const deadOutcome = (failure: "timeout" | "interrupted"): CampOutcome => ({
    exitCode: null, // kill/timeout/spawn ไม่สำเร็จ = ไม่มี exit code (camp-adapter.ts)
    handoffRaw: null, // ผลลุ่มค้างจากการ kill ไม่ใช้เป็น handoff (fail-closed)
    structuredOutputField: soField,
    cliSessionId: null,
    cliVersion: null,
    logsPath,
    failure,
  });

  const attempt = (): void => {
    attempts += 1;
    // argv ไม่มี secret (DES-002 Security) — บันทึกเต็มไว้ตรวจย้อนหลัง
    appendLog(`${camp} spawn attempt ${attempts}/${retryOnCrash + 1} pid=? argv=${JSON.stringify([profile.command, ...args])}`);
    let c: CampChild;
    try {
      c = spawnFn(profile.command, args, {
        cwd: req.cwd ?? undefined,
        shell: false,
        windowsHide: true,
        detached: process.platform !== "win32",
      });
    } catch (e) {
      // spawnFn โยนแบบ synchronous (เช่น argv ผิดรูป) = spawn ไม่สำเร็จเช่นกัน
      appendLog(`spawn ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
      if (attempts <= retryOnCrash) {
        attempt();
        return;
      }
      finish(spawnFailure);
      return;
    }
    child = c;
    currentPid = c.pid ?? null;

    const outParts: string[] = [];
    const errParts: string[] = [];
    const toText = (chunk: unknown): string => (typeof chunk === "string" ? chunk : (chunk as { toString(): string }).toString());
    c.stdout?.on("data", (chunk: unknown) => {
      outParts.push(toText(chunk));
    });
    c.stderr?.on("data", (chunk: unknown) => {
      errParts.push(toText(chunk));
    });

    c.on("error", (err: Error) => {
      if (settled || c !== child) return;
      if (currentPid === null) {
        // spawn ไม่สำเร็จ (process ไม่เริ่ม) → spawn ซ้ำ sessionId เดิม — ไม่นับเป็น restart (DES-007)
        appendLog(`spawn ไม่สำเร็จ: ${err.message}`);
        if (attempts <= retryOnCrash) {
          attempt();
          return;
        }
        finish(spawnFailure);
        return;
      }
      appendLog(`child error หลังเริ่มทำงาน: ${err.message}`);
      finish({ exitCode: null, handoffRaw: null, structuredOutputField: soField, cliSessionId: null, cliVersion: null, logsPath, failure: "crash" });
    });

    c.on("close", (code: number | null) => {
      if (settled || c !== child) return;
      const stdout = outParts.join("");
      const stderr = errParts.join("");
      appendLog(`close exitCode=${code} stdout=${stdout.length} B stderr=${stderr.length} B`);
      if (stdout !== "") appendLog(`--- stdout ---\n${stdout}`); // DES-007 — stdout/stderr ลง session.log
      if (stderr !== "") appendLog(`--- stderr ---\n${stderr}`);
      if (killed !== null) {
        // เส้นตาย — timeout/kill ปกติ finish ทันทีที่ kill ก่อน close มาถึง
        finish(deadOutcome(killed));
        return;
      }
      const meta = opts.parseOutput ? opts.parseOutput(stdout) : { cliSessionId: null, cliVersion: null };
      if (code === 0) {
        finish({
          exitCode: 0,
          handoffRaw: outputRaw(stdout, lastMessagePath),
          structuredOutputField: soField,
          cliSessionId: meta.cliSessionId,
          cliVersion: meta.cliVersion,
          logsPath,
          failure: null,
        });
        return;
      }
      // exit ≠ 0 = crash (DES-007 → R16 โดย driver) — คืน raw ไว้ให้ตรวจ แต่ failure ชี้สถานะก่อน
      finish({ exitCode: code ?? null, handoffRaw: stdout === "" ? null : stdout, structuredOutputField: soField, cliSessionId: meta.cliSessionId, cliVersion: meta.cliVersion, logsPath, failure: "crash" });
    });

    if (profile.briefChannel === "stdin") {
      if (c.stdin === null) {
        appendLog("stdin ไม่พร้อม — บรีฟสั้นส่งไม่ได้ (session จะ timeout — fail-closed)");
      } else {
        try {
          c.stdin.write(pointer);
          c.stdin.end();
        } catch (e) {
          appendLog(`เขียน stdin ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  };

  // timeout ต่อ session (camps.defaults.timeoutSec — ผู้เรียกส่งผ่าน CampDispatch.timeoutSec) เกินเวลา →
  // kill tree → outcome "timeout" — R16/R17 ตัดสินต่อ (DES-002/018 — adapter ไม่ retry เอง)
  timer = setTimeout(() => {
    if (settled || killed !== null) return;
    killed = "timeout";
    appendLog(`timeout ${req.timeoutSec}s — kill tree (R16 ตัดสินต่อ — ไม่ retry ใน adapter)`);
    killTree();
    finish(deadOutcome("timeout"));
  }, req.timeoutSec * 1000);

  attempt();

  return {
    get pid() {
      return currentPid;
    },
    outcome,
    kill(reason: string) {
      if (settled) return;
      killed = "interrupted";
      appendLog(`kill: ${reason}`); // reason ลง session log (CampSessionHandle.kill — camp-adapter.ts)
      killTree();
      finish(deadOutcome("interrupted"));
    },
  };
}

// last-message file (codex -o — DES-002) มีข้อความไม่ว่าง → ใช้แทน stdout · ไม่งั้น raw stdout (claude/agy)
function outputRaw(stdout: string, lastMessagePath: string | null): string | null {
  if (lastMessagePath !== null && existsSync(lastMessagePath)) {
    const st = statSync(lastMessagePath);
    if (st.isFile() && st.size > 0) return readFileSync(lastMessagePath, "utf8");
  }
  return stdout === "" ? null : stdout;
}
