// BE-013 — CampAdapter ของ codex (DES-002 — codex-cli 0.160.0) · 1 dispatch = process ใหม่เสมอ
// (stateless session — ห้าม subcommand `resume` ตาม AC-033; FORBIDDEN_ARGS ที่ BE-001 ตรวจ camps.yaml อยู่แล้ว
// และ argv ที่ adapter ประกอบไม่เติมชื่อ flag เหล่านั้นทุกเส้นทาง) · ห้าม --dangerously-bypass-approvals-and-sandbox
// เด็ดขาด (DES-002 Security) · write scope ชั้น 2 ของ codex = --sandbox workspace-write + cwd รากโปรเจกต์
// (-C จาก CampProfile — DES-006) · role prompt ไม่มีช่องส่ง (rolePromptFlag null) → อยู่ใน packet file แล้ว
// (DES-003) · ไม่มี toolRuleFlags/extraDirsFlag/logFlag — tool advisory อยู่ใน packet (DES-003) และ dispatch
// ของ codex ต้องส่ง extraDirs ว่าง (base ปฏิเสธถ้าไม่ว่าง — fail-closed) · กลไก spawn ใช้ฐานร่วม src/camps/base.ts
import type { CampProfile } from "../core/config.ts";
import type { CampAdapter, CampDispatch, CampSessionHandle } from "../core/contract/camp-adapter.ts";
import { spawnDispatch, type SpawnFn } from "./base.ts";

// stdout ของ `exec --json` = JSONL events บรรทัดต่อบรรทัด (DES-002) — หา session_id/version จาก event แรกที่มี:
// รูป field mark `inferred` (DES-002 — ยังไม่ยืนยันกับ codex 0.160.0 โดยตรง; ผิดที่ QA-001 → แก้ที่เดียวนี้)
// · ค้นชั้นบนสุดของ event แล้วซ้อนชั้นเดียว (event แบบครอบ เช่น msg.*) เฉพาะ key ตรงตัว ค่า string ไม่ว่าง
// · บรรทัดที่ไม่ใช่ JSON ข้าม (อ่าน JSONL ต่อ) · ไม่เจอ → null ทั้งคู่ (fail-closed — ไม่เดาค่าแทน)
export function codexOutputMeta(stdout: string): { cliSessionId: string | null; cliVersion: string | null } {
  const pick = (rec: Record<string, unknown>, key: string): string | null => {
    const v = rec[key];
    if (typeof v === "string" && v !== "") return v;
    for (const nested of Object.values(rec)) {
      if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
        const inner = (nested as Record<string, unknown>)[key];
        if (typeof inner === "string" && inner !== "") return inner;
      }
    }
    return null;
  };
  let cliSessionId: string | null = null;
  let cliVersion: string | null = null;
  for (const line of stdout.split("\n")) {
    const text = line.trim();
    if (text === "") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      continue; // บรรทัดไม่ใช่ JSON — ไม่ใช่ event (JSONL อ่านต่อ)
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) continue;
    const rec = parsed as Record<string, unknown>;
    if (cliSessionId === null) cliSessionId = pick(rec, "session_id") ?? pick(rec, "thread_id");
    if (cliVersion === null) cliVersion = pick(rec, "version");
  }
  return { cliSessionId, cliVersion };
}

export interface CodexAdapterOptions {
  spawnFn?: SpawnFn; // seam ของ test — default child_process.spawn (argv array ตรง ไม่ผ่าน shell)
  retryOnCrash?: number; // camps.defaults.retryOnCrash (DES-007 — spawn ไม่สำเร็จเท่านั้น) · ไม่ส่ง = 0 (fail-closed)
}

export class CodexAdapter implements CampAdapter {
  readonly camp = "codex" as const;
  readonly profile: CampProfile; // camps.yaml ที่ BE-001 validate แล้ว — adapter อ่าน flag จากที่นี่
  private readonly spawnFn: SpawnFn | undefined;
  private readonly retryOnCrash: number | undefined;

  constructor(profile: CampProfile, opts: CodexAdapterOptions = {}) {
    this.profile = profile;
    this.spawnFn = opts.spawnFn;
    this.retryOnCrash = opts.retryOnCrash;
  }

  dispatch(req: CampDispatch): CampSessionHandle {
    return spawnDispatch(this.camp, this.profile, req, {
      parseOutput: codexOutputMeta,
      // ไม่ตั้ง schemaInline — codex --output-schema รับ **path ไฟล์** (help: "JSON Schema file" — pin
      // DES-002 2026-10-07; ต่างจาก claude QA-007 ที่รับ inline JSON) · ไฟล์ schema บนดิสก์คงเต็มตาม
      // contract (DES-012) — adapter ไม่แตะเนื้อไฟล์
      // ไม่ตั้ง structuredOutputField — codex ไม่มี envelope: handoffRaw = ไฟล์ last-message (`-o/--output-last-
      // message`) เป็น handoff ตรง (base outputRaw; stdout JSONL เป็นเส้นสำรอง) — driver ตีความต่อตาม DES-012
      spawnFn: this.spawnFn,
      retryOnCrash: this.retryOnCrash,
    });
  }
}
