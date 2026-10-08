// BE-006 — CampAdapter: port ที่ camp ทุกตัว implement เพื่อ spawn/ส่ง packet/รับ output (DES-012 — task Scope)
// core ประกาศ contract ที่นี่เท่านั้น — core ห้าม import src/camps (AC: driver รันด้วย fake adapter ได้)
// adapter จริงต่อที่ src/camps: claude = BE-012 · codex = BE-013 · antigravity = BE-014 — งานนี้ไม่ implement ให้ camp ใด
// หน้าที่ adapter = กลไกของ camp เท่านั้น: argv จาก CampProfile (flag อ่านจาก camps.yaml ที่ BE-001 validate แล้ว
// — ห้าม hardcode flag), ช่องทาง brief stdin|packet-file (DES-002/003), timeout, เก็บ log, อ่าน output
// การตัดสินต่อไม่ใช่ของ adapter — ผู้เรียก (driver BE-011) ตรวจ handoffRaw ด้วย handoffProblems (DES-012 Fallback
// — extract fenced JSON เมื่อ schema flag ใช้ไม่ได้ แล้วยังไม่ผ่าน → failed)
import { BRIEF_CHANNELS, KNOWN_CAMPS, type CampProfile } from "../config.ts";
import type { PacketV2 } from "./types.ts";

// ทุกอย่างที่ camp ต้องใช้ ประกอบเสร็จก่อนเรียก dispatch — adapter ไม่อ่าน run state/config เอง
export interface CampDispatch {
  readonly packet: PacketV2; // ผ่าน buildPacketV2/packetProblems แล้ว — brief อ่านจาก packet.brief
  readonly packetPath: string; // absolute path ของ packet.json (briefChannel packet-file — DES-002)
  readonly rolePromptFile: string; // ไฟล์ role prompt — claude rolePromptFlag (DES-003)
  readonly rolePromptBody: string; // เนื้อ prompt — codex/agy วาง section "ROLE PROMPT" บนสุดของ packet file (DES-003)
  readonly rolePromptTools: string[]; // claude toolRuleFlags · ข้อความ advisory ใน packet file ฝั่ง codex/agy (DES-003)
  readonly model: string; // จาก resolveEffectiveModelPolicy (BE-004)
  readonly effort: string | null; // null = ห้ามส่ง effort flag (กติกา 3 — DES-004)
  readonly handoffSchemaPath: string | null; // ไฟล์ handoff-v2 schema (handoffV2JsonSchema) สำหรับ schemaFlag —
  // driver เขียนไว้ต่อ session เสมอ (artifact ตรวจย้อนหลัง) · adapter อ่านเนื้อไฟล์แล้วส่งตามรูปที่ CLI ของ
  // camp รับ: claude = inline JSON ตัด $schema ราก (QA-007 — CLI ปฏิเสธ path และไม่รู้จัก meta-schema draft 2020-12) ·
  // codex = path (help: "JSON Schema file") · null เมื่อ camp ไม่มี schemaFlag (schemaEnforcedByCli = false)
  readonly timeoutSec: number; // camps.defaults.timeoutSec — ผูก spawn ต่อ session (→ R16)
  readonly cwd: string | null; // รากโปรเจกต์สำหรับ cwdFlag (codex -C — DES-006 ชั้น 2)
  readonly extraDirs: string[]; // รากเพิ่มที่ camp ต้องเข้าถึง (agy --add-dir — DES-006 ชั้น 2)
}

// ความล้มเหลวระดับ camp (ก่อนตีความ handoff) — driver แปลงเป็น SessionRecord.outcome/R16/retryOnCrash (DES-007/018)
export type CampFailure = "spawn" | "timeout" | "crash" | "interrupted" | null;

export interface CampOutcome {
  readonly exitCode: number | null; // null = ไม่มี exit code (kill/timeout/spawn ไม่สำเร็จ)
  readonly handoffRaw: string | null; // ข้อความ raw ที่อาจมี handoff JSON — stdout หรือ last-message file
  readonly structuredOutputField?: string | null; // ชื่อ object field ใน handoffRaw ที่ CLI ครอบ structured output
  // (handoff) ไว้ — ความรู้ต่อ camp จากรูป output ของ CLI นั้น (DES-002): claude = "structured_output"
  // (result envelope ของ `-p --output-format json` — QA-009) · ไม่ระบุ/null = camp ไม่มี envelope
  // (stdout/last-message คือ handoff ตรง หรือข้อความอิสระ) → driver ใช้ candidates เดิมตาม DES-012 Fallback
  // — การตีความ (schema/กฎ) ยังเป็นของ driver เหมือนเดิม ชื่อ field เท่านั้นที่มาจาก camp
  readonly cliSessionId: string | null; // SessionRecord.cliSessionId (BE-007)
  readonly cliVersion: string | null; // SessionRecord.cliVersion
  readonly logsPath: string | null; // SessionRecord.logsPath
  readonly failure: CampFailure; // "spawn" → retryOnCrash · "timeout"/"crash"/"interrupted" → R16 (DES-018)
}

// handle คืนทันทีที่ dispatch — ให้ driver จับ pid เพื่อ kill/restart จาก findOpenSessions (BE-011, R16)
export interface CampSessionHandle {
  readonly pid: number | null; // SessionRecord.pid
  readonly outcome: Promise<CampOutcome>;
  kill(reason: string): void; // ตัด session ที่ยังรัน — reason ลง session log
}

export interface CampAdapter {
  readonly camp: (typeof KNOWN_CAMPS)[number];
  readonly profile: CampProfile; // camps.yaml ที่ BE-001 validate แล้ว — adapter อ่าน flag จากที่นี่
  dispatch(req: CampDispatch): CampSessionHandle;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// ตรวจโครง adapter ก่อน driver ลงทะเบียน (fail-closed — adapter ผิดรูปห้ามเดินไป spawn)
export function campAdapterProblems(value: unknown): string[] {
  if (!isObj(value)) return ["adapter ต้องเป็น object ที่ implement CampAdapter"];
  const p: string[] = [];
  if (!(typeof value.camp === "string" && (KNOWN_CAMPS as readonly string[]).includes(value.camp))) {
    p.push(`adapter.camp ${JSON.stringify(value.camp)} ไม่รู้จัก — ต้องเป็นหนึ่งใน ${KNOWN_CAMPS.join(" | ")}`);
  }
  const prof = value.profile;
  if (
    !isObj(prof)
    || typeof prof.command !== "string" || prof.command.trim() === ""
    || !(typeof prof.briefChannel === "string" && (BRIEF_CHANNELS as readonly string[]).includes(prof.briefChannel))
  ) {
    p.push("adapter.profile ต้องเป็น CampProfile ที่ config store validate แล้ว (command/briefChannel — BE-001)");
  }
  if (typeof value.dispatch !== "function") p.push("adapter.dispatch ต้องเป็น function (CampDispatch → CampSessionHandle)");
  return p;
}
