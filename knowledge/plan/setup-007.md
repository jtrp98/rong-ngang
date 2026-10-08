# SETUP-007 — Pack: templates v2 + policies §1/§3 + CLAUDE.md (DES-014)

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

pack ที่ `code\` ผลิตเอกสารรูป v2 ตาม DES-014 Rev 10 — ทั้งสองโหมดใช้ template และกติกาเดียวกัน (AC-021) และผู้เขียน Status ตรง OQ-14

## References

- REQ-011 (AC-036, AC-038, AC-073), REQ-015 (AC-050), REQ-016 (AC-055), REQ-017 (AC-058), REQ-018 (AC-059), REQ-008 (AC-021, AC-023), REQ-003 (AC-007)
- DES-014, DES-019, DES-020, DES-013 · `design\index.md` §Impact (รายการไฟล์ pack)

## Scope

- `templates\plan-index.md`: ตาราง `| Task | Name | Owner | Phase | Depends | Status |` + ผู้เขียน Status ตามโหมด (orchestrated = orchestrator จาก verdict ของ qa · solo = qa-engineer · PM แถวใหม่ `pending`) แทนบรรทัด 3 เดิม
- `templates\plan-task.md`: 8 หัวข้อ DES-014 ไม่มี Status + บรรทัดเครื่องอ่าน `Write paths` / `Security-sensitive` / `Session group` ใน `## Scope`
- template test-plan (TP-NNN Given/When/Then + REQ/AC · index ตาราง `TP | Phase | REQ/AC | ไฟล์`) · review (verdict PASS/FAIL + REV-NNN Severity/Task/Location/Problem/Reference · index ตาราง finding) · qa (perTask verified/blocked · QA-NNN Expected/Actual/Reproduce/Evidence · Feature QA flows · index ตาราง finding)
- `policies\documentation.md` §1 (ตาราง writer ของ `plan\index.md` 6 คอลัมน์) + §3 (Status single-writer ตามโหมด — OQ-14)
- `CLAUDE.md` ของ pack: โครง plan v2 + ข้อยกเว้น orchestrated (`requirement\scope.md` Constraints ก–ง) · solo คง serial
- Write paths: `templates/**`, `policies/documentation.md`, `CLAUDE.md`
- Security-sensitive: no

## Out of Scope

- role prompts (SETUP-008) · ไฟล์ sta2 (driver sync เองตาม `CLAUDE.md` ของ sta2) · migrate เอกสาร module ที่มีอยู่ (PM replan ต่อ module — OQ-15) · hard rule git แบบมีเงื่อนไข (REQ-009 — `backlog.md` BL-016)

## Expected Output

- ไฟล์ pack ที่แก้ตามรายการ §Impact

## Acceptance

- `plan-task.md` มี 8 หัวข้อและไม่มี Status (AC-038) · `plan-index.md` มี 6 คอลัมน์ (AC-036)
- template TP/REV/QA มีทุก field ตาม AC-059 / AC-050 / AC-055 / AC-058 + ตารางใน index ตาม DES-014
- policies §1/§3 + `CLAUDE.md` ไม่เหลือ "Status = qa-engineer เท่านั้น" แบบไม่แยกโหมด (AC-073) · grep ไม่พบเนื้อหา role prompt ถูกคัดลอก (AC-023)

## Dependencies

- SETUP-004 — pack ที่ `code\`

## Handoff

- `DONE` + รายการไฟล์ที่แก้ → reviewer · แจ้ง driver ว่าต้อง sync pack ไป sta2 หรือไม่ (ตามคำสั่งเจ้าของ)
- Risk / Rollback: ต่ำ — ไฟล์ pack ที่ `code\` อยู่ใน repo (คืนได้จาก git)

## Change Log

- 2026-10-05 — สร้าง (replan R1 ขยาย, design Rev 10 §Impact — pack ส่วน template/policy/CLAUDE.md)

Back-links: `plan\index.md`
