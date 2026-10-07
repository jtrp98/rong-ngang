# agent-team — Security

> ไฟล์เดียวต่อ module · เขียนโดย `security` เท่านั้น · มีแค่ `security` ที่ปิด finding ได้ หลัง re-audit โค้ดจริง

## Open Findings

| ID | Severity | Phase | Location | Owner | Status |
|---|---|---|---|---|---|
| — | — | — | — | — | ไม่มี finding ค้าง |

## Summary

การตรวจความปลอดภัย 🔒 security stage:
- **Phase 3 (Orchestrated engine บน terminal — claude)** ตาม `plan\index.md:31`: ตรวจสอบ BE-006, BE-008, BE-011, BE-022 — PASS (Clean) · Phase 3 cleared 🔒
- **Phase 5 (Web UI + dashboard ต่อ task)** ตาม `plan\index.md:32`: ตรวจสอบ 4 จุด security-sensitive: BE-010 (untrusted input limit), BE-015 (Host loopback / DNS rebinding guard), BE-023 (CSRF Origin check / human retry), FE-001/FE-002 (safeText XSS escaping) — **PASS (Clean)** · ไม่มี Critical/Important finding · **Phase 5 cleared 🔒**

## Clean

- **BE-006 (Prompt-injection guard):** `USER_TEXT_GUARD` วางชิดก่อนข้อความดิบ untrusted (`intake` / user text) ใน packet v2 · agent ได้รับใน context structured JSON ไม่ปนกับ system prompt
- **BE-008 (Write audit & Path claim):** `session-audit.ts` ตรวจสอบ path claim สัมพัทธ์ root · ตรวจจับ `unclaimed-write` และ `status-write` ด้วย snapshot hash · การแก้ QA-010 ล่าสุดทำให้ router บังคับ R2 hold ทุก suspect สำหรับทุก session kind ทันทีแบบ fail-closed
- **BE-011 (CLI Spawn & Command Injection):** การ spawn CLI (`claude`, `codex`, `agy`) ใช้ `spawn` / `spawnSync` พร้อม `{ shell: false }` และ argument array ทั้งหมด · มีการตรวจ `FORBIDDEN_ARGS` ป้องกัน flag ต้องห้าม (`--continue`, `--resume`)
- **BE-022 (Status write-back):** แก้ไขเฉพาะ cell Status ของแถวเป้าหมายใน `plan\index.md` แบบ atomic · ป้องกันการเขียนทับส่วนอื่นของเอกสาร
- **BE-010 (Untrusted Input Intake & Limit):** `intake.ts` บังคับเพดานข้อความสูงสุด 20,000 ตัวอักษร (`NEW_WORK_LIMIT`) · ข้อความว่างหรือเกินเพดานถูก reject ทันที (HTTP 400) ก่อนส่งต่อ BA packet
- **BE-015 (DNS Rebinding Guard & Loopback Binding):** `server.ts` ผูก 127.0.0.1 เท่านั้น และตรวจ Host header ป้องกัน DNS rebinding (Host แปลกถูก reject HTTP 403) · ไม่มี external CDN/script
- **BE-023 (CSRF Protection & Anti-tampering):** `tasks-api.ts` ตรวจสอบ Origin header บน HTTP POST (reject HTTP 403 หากไม่ใช่ loopback) · บังคับชื่อ `by` ไม่ให้ว่าง · ปฏิเสธการปลด hold ต้องห้าม (`design-change`, `requirement-change`, open gate) ด้วย HTTP 409 · ไม่ reset ตัวนับ attempt/fix
- **FE-001 / FE-002 (XSS Prevention & Safe Escaping):** `ui/index.html` ทำงานแบบ self-contained vanilla JS 100% ปราศจาก external CDN/libraries · ข้อความ logTail, คำถาม gate, ชื่องาน, และ error messages ถูก sanitize ผ่าน `safeText()` และ DOM `.textContent` ป้องกัน script execution อย่างสมบูรณ์
- **Secrets & Credentials:** ตรวจสอบไฟล์ yaml ใน `config/` และโค้ดใน `src/` ไม่พบการ hardcode secrets, token หรือ private keys

## Accepted Risks

| ID | ความเสี่ยง | ยอมรับโดย (คน) | วันที่ | เงื่อนไข/ทบทวนเมื่อ |
|---|---|---|---|---|
| — | — | — | — | — |

## Change Log

- 2026-10-07 — Security audit Phase 3 🔒: ตรวจสอบ BE-006, BE-008, BE-011, BE-022 — **PASS (Clean)** · ไม่มี Critical/Important finding · Phase 3 `cleared`
- 2026-10-07 — Security audit Phase 5 🔒: ตรวจสอบ BE-010, BE-015, BE-023, FE-001, FE-002 — **PASS (Clean)** · DNS rebinding guard, CSRF Origin check, safeText XSS prevention สมบูรณ์ · Phase 5 `cleared`

Back-links: `plan\index.md` · `..\index.md`
