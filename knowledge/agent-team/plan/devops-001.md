# DEVOPS-001 — deploy.md runbook

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

runbook ติดตั้ง/รัน/resume/smoke/solo จากของจริงที่ verified แล้ว ไม่ใช่จาก design เพียงอย่างเดียว

## References

- REQ-008 (AC-024), REQ-013 (AC-045), REQ-020 (AC-066, AC-075), REQ-011 (AC-074, AC-079), DES-009, DES-001, DES-007, DES-019, DES-022 · `design\quality-attributes.md` §Deployment

## Scope

- `deploy.md` ตาม template — สภาพแวดล้อม (Windows + Git Bash, Node v24.21.0, CLI ทั้งสามพร้อมเวอร์ชัน) · ติดตั้ง (`npm install` ที่ `code\agent-team\`, registry/sta-config paths, owner ใน gates.yaml) · เริ่ม server/terminal + resume · smoke ต่อ camp · เปิด solo session (อ้าง `code\AGENTS.md`)
- ค่า `scheduler`/`audit` ตั้งต้นและการปรับ (เพดาน 3, restart 1, wave 4/800, task ใหญ่ 400/10 — สมมติฐาน — ยังไม่ยืนยัน) · พฤติกรรมเมื่อปิด/ล่มกลางรัน (restart อัตโนมัติ 1 ครั้ง, ไม่ revert, ปุ่ม retry) · module plan legacy ต้องให้ PM replan (dispatch ทีละตัว) · แถว hold `plan-error` (Owner reviewer/security, anchor > 1) → PM แก้ plan
- ข้อจำกัด: loopback only ไม่มี auth · solo ไม่มี post-run audit และ serial · ไม่มี service/daemon — ปิดแล้ว resume ได้ · orchestrator นี้ build/แก้แบบ solo เท่านั้น (risk #14)

## Out of Scope

- ตั้ง service/daemon · bind นอก loopback · deploy ไป environment ภายนอก (ไม่มี — release local) · ส่วน `gituse` (REQ-009)

## Expected Output

- `deploy.md` (ไฟล์เดียว — devops เป็นเจ้าของ)

## Acceptance

- deploy.md ตรง template · เดินตาม runbook บนเครื่องสดแล้วระบบรันได้จบทุกขั้น (ติดตั้ง → เริ่ม → run parallel → gate → restart กลางรัน → solo)

## Dependencies

- QA-001, QA-002 — runbook เขียนจากของที่ verified แล้ว · task นี้เป็น dependent ของ anchor QA-002 (phase 7) = งานหลัง Feature QA: เริ่มเมื่อ phase 7 `cleared` และไม่อยู่ใน Depends โดยนัยของ anchor จึงไม่ deadlock (DES-019)

## Handoff

- `DONE` + ผลเดินตาม runbook → ผู้ใช้รับมอบ (Done = released — human gate 6/7 ตามที่ใช้ได้; release local ไม่มี deploy จริงต่อ shared env)
- Risk / Rollback: ต่ำ

## Change Log

- 2026-10-05 — replan Rev 10: เพิ่ม config `scheduler`/`audit`, พฤติกรรม restart/retry, plan legacy, ข้อจำกัด solo serial + build แบบ solo · รูป task v2
- 2026-10-06 — design Rev 12: ย้ายไป phase 7 (dependent ของ anchor QA-002) · runbook ครอบ hold `plan-error`

Back-links: `plan\index.md`
