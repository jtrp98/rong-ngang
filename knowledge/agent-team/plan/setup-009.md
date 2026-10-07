# SETUP-009 — Pack: test-planner prompt ตรง DES-018/019/020

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

`test-planner.md` ใน pack ผลิต TP ที่ resolve ได้เสมอ และจบด้วย output state ชุด execution — ปิด Minor ที่เจ้าของดึงเข้า R1 (`backlog.md` BL-023, BL-024, BL-029, BL-030)

## References

- REQ-018 (AC-059, AC-061), REQ-014 (AC-048), REQ-021 (AC-068)
- DES-018, DES-019, DES-020
- review:REV-002, review:REV-007, review:REV-014, qa:QA-002

## Scope

- review:REV-002 (`test-planner.md:23,35`): สร้าง/อัปเดต `test-plan\index.md` (ตาราง TP ตาม DES-014/019) ทุกครั้ง แม้มีไฟล์เดียว · TP ทุกข้อรูป Given/When/Then + REQ/AC
- review:REV-014 (`:33`): ชื่อไฟล์ `test-plan\round-N.md` ตาม DES-019 แทน `<slug>.md`
- review:REV-007 + qa:QA-002 (`:38-40`): §Handoff ระบุ output state ชุด execution ของ DES-018 + รูป blocker แบบเดียวกับ engineer prompt
- คงของที่ SETUP-008 verified แล้ว: ไม่รัน check (AC-060) · trigger เดิม (OQ-16) · ไม่แตะ Status
- Write paths: `.claude/agents/test-planner.md`
- Security-sensitive: no

## Out of Scope

- prompt/template อื่น (template test-plan ไม่ตรง → แจ้งใน handoff ให้ PM) · ฝั่ง `project-manager.md:46-50` ของ REV-007 (ยังอยู่ backlog BL-024) · BL-025/026 (release ถัดไป) · sync ไป sta2 (driver)

## Expected Output

- `code\.claude\agents\test-planner.md` ที่แก้แล้ว

## Acceptance

- grep `test-planner.md`: สั่งมี `test-plan\index.md` ไม่มีเงื่อนไข "more than one file" · ไม่พบ "input → expected" · TP เป็น Given/When/Then + REQ/AC (AC-059) · ชื่อไฟล์ `round-N.md` ไม่พบ `<slug>.md`
- §Handoff มี 5 state ของ kind execution ตรง DES-018 + รูป blocker (AC-068) · ยังห้ามรัน check (AC-060) · ไม่มีไฟล์อื่นเปลี่ยน

## Dependencies

- SETUP-008 — prompt v2 ที่ verified (ไฟล์เดียวกัน)

## Handoff

- `DONE` + diff → reviewer (แยก session) · แจ้ง driver เรื่อง sync ไป sta2
- Risk / Rollback: ต่ำ — prompt ไฟล์เดียว · rollback: คืนไฟล์จาก git

## Change Log

- 2026-10-06 — สร้างตามเจ้าของ (jtrp98) BL triage 2026-10-06: ดึง BL-023/024/029/030 เข้า R1 (ไฟล์เดียว `test-planner.md`)

Back-links: `plan\index.md`
