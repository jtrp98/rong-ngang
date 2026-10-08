// BE-012 — CampAdapter ของ claude (DES-002 — camp default ของ release R1) · 1 dispatch = process ใหม่เสมอ
// (stateless session — ห้าม --continue/--resume ตาม AC-033, FORBIDDEN_ARGS ที่ BE-001 ตรวจ camps.yaml อยู่แล้ว
// และ argv ที่ adapter ประกอบไม่เติมชื่อ flag เหล่านั้นทุกเส้นทาง) · ห้าม --dangerously-skip-permissions เด็ดขาด
// (DES-002 Security) · ค่า --json-schema ส่งเป็น inline JSON เท่านั้น (QA-007 — CLI 2.1.292 ปฏิเสธ path;
// กลไกอ่านไฟล์/ตรวจ/เพดานอยู่ที่ base.ts) · บรีฟสั้นทาง stdin ชี้ packet.json — packet camp-agnostic
// บรีฟเดียวกับ camp อื่น (AC-004) · cwd ของ spawn = req.cwd (packRoot — DES-013 เปิด session ที่ packRoot) ·
// กลไก spawn ใช้ฐานร่วม src/camps/base.ts
import type { CampAdapter, CampDispatch, CampSessionHandle } from "../core/contract/camp-adapter.ts";
import type { CampProfile } from "../core/config.ts";
import { spawnDispatch, type SpawnFn, type ToolRuleArgs } from "./base.ts";

// ชั้นกันก่อน DES-021 Security: --allowedTools = tools: ของ role (frontmatter — BE-003) + Edit(<claim>)/
// Write(<claim>) ต่อ claim (รูป path-rule `inferred` — ยืนยันที่ QA-001) · test-planner ห้ามรัน check เอง
// → --disallowedTools Bash (AC-060)
export function claudeToolRules(req: CampDispatch): ToolRuleArgs {
  const allow = [...req.rolePromptTools];
  for (const claim of req.packet.claim) {
    allow.push(`Edit(${claim})`, `Write(${claim})`);
  }
  const deny = req.packet.role === "test-planner" ? ["Bash"] : [];
  return { allow, deny };
}

// stdout ของ --output-format json = result ชิ้นเดียว — session_id ยืนยันใน DES-002 · field `version` ของ CLI
// mark inferred (CLI ไม่ส่งมา → null ตามจริง ไม่เดา) · parse ไม่ผ่าน → ทั้งคู่ null (fail-closed — raw คืน
// handoffRaw ให้ driver ตีความต่อ รวม Fallback extract fenced JSON — DES-002/012)
export function claudeOutputMeta(stdout: string): { cliSessionId: string | null; cliVersion: string | null } {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const rec = parsed as Record<string, unknown>;
      const sid = rec["session_id"];
      const version = rec["version"];
      return {
        cliSessionId: typeof sid === "string" && sid !== "" ? sid : null,
        cliVersion: typeof version === "string" && version !== "" ? version : null,
      };
    }
  } catch {
    // stdout ไม่ใช่ JSON — ไม่ถือว่าผิดพลาดที่นี่ (driver ตัดสินจาก handoffRaw)
  }
  return { cliSessionId: null, cliVersion: null };
}

export interface ClaudeAdapterOptions {
  spawnFn?: SpawnFn; // seam ของ test — default child_process.spawn (argv array ตรง ไม่ผ่าน shell)
  retryOnCrash?: number; // camps.defaults.retryOnCrash (DES-007 — spawn ไม่สำเร็จเท่านั้น) · ไม่ส่ง = 0 (fail-closed)
}

export class ClaudeAdapter implements CampAdapter {
  readonly camp = "claude" as const;
  readonly profile: CampProfile; // camps.yaml ที่ BE-001 validate แล้ว — adapter อ่าน flag จากที่นี่
  private readonly spawnFn: SpawnFn | undefined;
  private readonly retryOnCrash: number | undefined;

  constructor(profile: CampProfile, opts: ClaudeAdapterOptions = {}) {
    this.profile = profile;
    this.spawnFn = opts.spawnFn;
    this.retryOnCrash = opts.retryOnCrash;
  }

  dispatch(req: CampDispatch): CampSessionHandle {
    return spawnDispatch(this.camp, this.profile, req, {
      toolRules: claudeToolRules(req),
      parseOutput: claudeOutputMeta,
      schemaInline: true, // QA-007 — claude CLI รับค่า --json-schema เป็น inline JSON เท่านั้น (base.ts อ่านไฟล์ + ตรวจก่อน spawn)
      structuredOutputField: "structured_output", // QA-009 — result envelope ของ `-p --output-format json` ครอบ handoff
      // ไว้ใน object field นี้ (DES-002 — รูป output ของ CLI claude) — driver unwrap ตามชื่อที่ camp ประกาศ
      // ผ่าน CampOutcome.structuredOutputField ไม่ hardcode ชื่อใน driver · CLI เก่า/ไม่มี field นี้ → fallback เดิม (DES-012)
      spawnFn: this.spawnFn,
      retryOnCrash: this.retryOnCrash,
    });
  }
}
