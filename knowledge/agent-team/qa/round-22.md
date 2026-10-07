# agent-team — QA Round 22 — BE-010 (Intake งานใหม่ → BA packet — phase 5)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · live Open Issues / Unverified Behaviour อยู่ไฟล์รอบล่าสุดเท่านั้น · วันที่จากผู้ใช้: 2026-10-07

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| — | — | — | ไม่มี QA finding เปิดใหม่รอบนี้ |

- review:REV-056 Minor คง → backlog (round 21)

## Round 22

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` (tsx --test) | pass — **334/334** fail 0 (7.1 s) · `intake.test.ts` 9 เคสครบถ้วน |
| typecheck/integrity | git diff inspection | `intake.ts` เขียนตาม contract BE-006/007/009/011 ไม่เขียน component ซ้ำซ้อน |
| probe intake behaviour | `npx tsx -e` probe suite | ผ่านทุกข้อ (ดูรายละเอียดด้านล่าง) |

### BE-010 — Intake งานใหม่ → BA packet (ตรง AC be-010.md ทุกข้อ)

| ตรวจ | ผล | หลักฐาน |
|---|---|---|
| AC-017: ข้อความดิบถึง packet ครบถ้วน + guard | pass | `run.newWorkText` เก็บข้อความดิบตรงไบต์ · `userText` ใน packet มี `USER_TEXT_GUARD` นำหน้า · text ว่างหรือเกิน 20,000 ตัวอักษร ถูกปฏิเสธด้วย `IntakeError` ก่อนสร้าง run ไม่สร้าง state ค้าง |
| AC-018: อ่าน decision ของ BA | pass | `newWorkDecision` ดึงผลตัดสินจาก session BA ล่าสุด · รองรับ `create` (สร้าง module ใหม่ + set pointer) และ `amend` (ชี้ module เดิม) · fail-closed เมื่อชื่อ module ผิดรูป |
| AC-019: หลัง BA driver เดิน change chain ต่อเอง | pass | เดิน chain ตาม `nextRole` (BA → SA → PM) จบสมบูรณ์โดยอัตโนมัติ |
| gate business-choice เมื่อต้องการข้อมูล | pass | BA ส่ง `NEEDS_HUMAN` → เปิด gate ผ่าน `openGate` · รับคำตอบผ่าน `answerGate` แล้วเดิน chain ต่อได้ |
| fail-closed ทนทาน | pass | crash ทนตาม `crashRestartLimit` (R16/R17 mirror) · อ้าง REQ/AC ที่ไม่มีจริงปฏิเสธก่อนแตะ state |

### Status Write-back

- `qa-engineer` ปรับ Status ของแถว `BE-010` ใน `plan\index.md`: `pending` → `verified`

## Change Log

- 2026-10-07 — Round 22 — BE-010: ✅ Verified · รันเช็ค AC-017, AC-018, AC-019 ครบถ้วน · npm test 334/334 ผ่าน · sync Status BE-010 `pending → verified` ใน `plan\index.md`

Back-links: `plan\index.md` · `..\index.md`
