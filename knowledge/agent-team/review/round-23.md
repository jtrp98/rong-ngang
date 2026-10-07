# agent-team — Review Round 23 — BE-010 (Intake งานใหม่ → BA packet)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · 1 round ต่อ 1 ไฟล์ · ตรวจจาก artifact จริง · ไม่อ่าน `qa\` และ `security.md`

## Findings

- ไม่มี finding ใหม่

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-056 | Minor | src/camps/codex.ts:17 | backend-engineer | → backlog (round 21) |

- REV-047…054 คงสถานะ → backlog ทุกรายการ (ตารางเต็มใน round-20.md)

## Round 23

**Verdict:** PASS

| Task | Verdict |
|---|---|
| BE-010 | PASS |

### BE-010 — Intake งานใหม่ → BA packet (ตรวจจากโค้ดและ tests จริง)

- **Scope & Write paths ตรง plan (`be-010.md:18`):**
  - ไฟล์ที่เขียน: `src/core/intake.ts` และ `test/intake.test.ts` ตรง Write paths เป๊ะ · ไม่แตะไฟล์นอก scope
  - Security-sensitive (untrusted input): `USER_TEXT_GUARD` วางนำหน้าข้อความดิบของผู้ใช้ใน packet builder · ข้อความถูกส่งใน field `userText` ไม่ปนกับ prompt ของระบบ
- **ตรง Acceptance (`be-010.md:31`):**
  - **AC-017 (ข้อความถึง packet ครบถ้วน):** ข้อความดิบของผู้ใช้เก็บใน `run.newWorkText` และส่งถึง packet ของ BA ครบถ้วนทุกตัวอักษร (`intake.ts:174` · test `intake.test.ts:168`) · ตรวจสอบข้อความว่าง/whitespace หรือเกิน 20,000 ตัวอักษร ปฏิเสธด้วย `IntakeError("empty-text")` / `IntakeError("text-too-long")` ก่อนสร้าง run ไม่ทิ้งขยะ state
  - **AC-018 (อ่าน decision ของ BA):** `newWorkDecision` ดึงผลตัดสินจาก session ล่าสุดของ BA ใน `run.json` · รองรับ `create` (สร้าง module ใหม่ + set pointer) และ `amend` (pointer ชี้ module เดิม) · ถ้าชื่อ module ไม่ถูกรูป fail-closed อย่างปลอดภัย ไม่สร้าง pointer เสีย
  - **AC-019 (หลัง BA driver เดิน change chain ต่อเอง):** เดิน chain ต่อตาม `nextRole` จาก BA → SA → PM โดยอัตโนมัติจนกว่าจะครบ chain หรือเจอ gate ถัดไป
  - **BA ถามข้อมูลเพิ่ม:** ส่ง `NEEDS_HUMAN` พร้อม `questionsForHuman` → เข้าสู่ gate `business-choice` (BE-009) · รองรับ `answerGate` แล้วเดิน chain ต่อ
  - **ความทนทาน:** crash ทนทานตาม `crashRestartLimit` · อ้าง REQ/AC ที่ไม่มีในเอกสาร → ปฏิเสธก่อนสร้าง run
- **Evidence:**
  - `npm test` ทั้งชุด **334/334 ผ่าน** (รวม suite `intake.test.ts` 9 เคส)
  - type check สะอาด ไม่พบ type error หรือ syntax issue

## Reviewed

- `src/core/intake.ts` (ทั้งไฟล์)
- `test/intake.test.ts` (ทั้งไฟล์)
- เอกสาร: `plan\be-010.md` · `design\des-010.md` · `design\des-012.md` · `requirement\req-007.md`
- ไม่อ่าน `qa\` และ `security.md` · ไม่รัน git

## Handoff

- **Verdict:** รอบ **PASS** — BE-010 **PASS**
- **Next:** ส่ง task BE-010 ให้ `qa-engineer` ตรวจสอบใน QA Round 22
- Blockers: ไม่มี

## Change Log

- 2026-10-07 — Round 23 — BE-010 (Intake งานใหม่): PASS · ตรวจสอบข้อความ untrusted, guard, decision, change chain, gate ครบถ้วน · test 9/9 ผ่าน

Back-links: `plan\index.md` · `..\index.md`
