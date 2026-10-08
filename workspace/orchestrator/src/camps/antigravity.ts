// BE-014 — CampAdapter ของ antigravity (DES-002 — agy 1.2.16) · 1 dispatch = process ใหม่เสมอ
// (stateless session — ห้าม --continue/--resume ตาม AC-033; FORBIDDEN_ARGS ที่ BE-001 ตรวจ camps.yaml อยู่แล้ว
// และ argv ที่ adapter ประกอบไม่เติมชื่อ flag เหล่านั้นทุกเส้นทาง) · ห้าม --dangerously-skip-permissions เด็ดขาด
// (DES-002 Security) · write scope ชั้น 2 ของ agy = --sandbox (headlessArgs จาก camps.yaml) + --add-dir เฉพาะราก
// ที่จำเป็น ไม่มีระดับไฟล์ (extraDirsFlag — DES-006) · role prompt ไม่มีช่องส่ง (rolePromptFlag null) → อยู่ใน
// packet file แล้ว (DES-003) · ไม่มี toolRuleFlags — tool advisory อยู่ใน packet (DES-003) และ dispatch ของ agy
// ห้ามส่ง toolRules (base ปฏิเสธถ้าไม่ว่าง — fail-closed) · --log-file มีเฉพาะ camp นี้ (logFlag จาก camps.yaml)
// ชี้ session.log ใต้ sessions/<sid>/ (DES-007 — ฐานประกอบให้) · effort null (T2–T6 ของ antigravity — effort
// ฝังในชื่อ model) → ไม่ส่ง --effort ตามกติกา 3 (DES-004 — ฐานจัดการ) · กลไก spawn ใช้ฐานร่วม src/camps/base.ts
import type { CampProfile } from "../core/config.ts";
import type { CampAdapter, CampDispatch, CampSessionHandle } from "../core/contract/camp-adapter.ts";
import { spawnDispatch, type SpawnFn } from "./base.ts";

export interface AntigravityAdapterOptions {
  spawnFn?: SpawnFn; // seam ของ test — default child_process.spawn (argv array ตรง ไม่ผ่าน shell)
  retryOnCrash?: number; // camps.defaults.retryOnCrash (DES-007 — spawn ไม่สำเร็จเท่านั้น) · ไม่ส่ง = 0 (fail-closed)
}

export class AntigravityAdapter implements CampAdapter {
  readonly camp = "antigravity" as const;
  readonly profile: CampProfile; // camps.yaml ที่ BE-001 validate แล้ว — adapter อ่าน flag จากที่นี่
  private readonly spawnFn: SpawnFn | undefined;
  private readonly retryOnCrash: number | undefined;

  constructor(profile: CampProfile, opts: AntigravityAdapterOptions = {}) {
    this.profile = profile;
    this.spawnFn = opts.spawnFn;
    this.retryOnCrash = opts.retryOnCrash;
  }

  dispatch(req: CampDispatch): CampSessionHandle {
    return spawnDispatch(this.camp, this.profile, req, {
      // ไม่ตั้ง schemaInline — ค่า --json-schema = path ไฟล์ ตามรูปที่ DES-002 เขียนไว้ (`--json-schema
      // <handoff-v2.json>`) · รูปค่าของ agy mark **สมมติฐาน** ใน design (ยังไม่ยืนยันกับ agy 1.2.16 จริง —
      // ยืนยันที่ QA-001 แล้วแก้ที่เดียวนี้ เหมือนที่ claude แก้ตาม QA-007) · ไฟล์ schema บนดิสก์คงเต็มตาม
      // contract (DES-012) — adapter ไม่แตะเนื้อไฟล์
      // ไม่ตั้ง parseOutput — DES-002: cliSessionId ของ agy "ไม่ทราบ → null" · version ไม่มีรูป field ใน
      // design เช่นกัน → null ทั้งคู่ ตามจริง ไม่เดา (fail-closed — ต่างจาก claude/codex ที่มีรูปให้อ่าน)
      // ไม่ตั้ง structuredOutputField — DES-002: agy → stdout JSON = handoff ตรง ตัดสินสำเร็จด้วย exit code 0
      // + handoff ผ่าน schema (ไม่มี result envelope แบบ claude — QA-009) · driver ใช้ candidates เดิมตาม
      // DES-012 Fallback — ถ้า agy จริงครอบ envelope ยืนยันที่ QA-001 แล้วเติมชื่อ field ที่เดียวนี้
      spawnFn: this.spawnFn,
      retryOnCrash: this.retryOnCrash,
    });
  }
}
