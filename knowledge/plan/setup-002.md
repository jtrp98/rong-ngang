# SETUP-002 — git init ที่ราก rong-ngang + baseline commit

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

repo พร้อมให้ write audit ใช้ git แบบอ่านอย่างเดียว (`ls-files`, `diff --no-index` — DES-021) เป็นชั้นหลักแทน manifest

## References

- REQ-003 (AC-007), DES-006, DES-021 · OQ-D4 (`open-questions\oq-d4.md`, `design\archive.md`)

## Scope

- `git init` ที่ `C:\src\AICode\rong-ngang\` + baseline commit ครอบ skeleton + `.gitignore` อย่างน้อย `node_modules/`
- **หมายเหตุ:** one-time exception จากกติกา "no state-changing git" ซึ่งผูก agent ระหว่าง pipeline เท่านั้น — ตัดสินแล้วจาก OQ-D4 (init โดย setup role ตอนขั้นตั้งโปรเจกต์); ถ้าผู้ใช้จะรันคำสั่งนี้เองก็ได้ ยืนยันตอน dispatch
- Security-sensitive: no

## Out of Scope

- ไม่ push ที่ใด · หลังจากนี้ pipeline ไม่แตะ `.git` (กติกาเดิมคงผูก)

## Expected Output

- repo ที่ราก rong-ngang (สังเกต 2026-10-05: `rong-ngang\.git\HEAD` มีแล้ว — design\index.md §Feasibility)

## Acceptance

- `git -C C:\src\AICode\rong-ngang rev-parse --is-inside-work-tree` = true · มี baseline commit · `git status` สะอาดหลัง commit

## Dependencies

- SETUP-001 — skeleton ต้องมีก่อน baseline commit

## Handoff

- `DONE` + hash ของ baseline commit → reviewer (ผู้ใช้ commit เองก็ได้ — แจ้งตอน dispatch)
- Risk / Rollback: ต่ำ — ลบ `.git` ได้ (ยังไม่มีประวัติสำคัญ)

## Change Log

- 2026-10-05 — replan (R1 ขยาย, design Rev 10): แปลงเป็นรูป task v2 — 8 หัวข้อ DES-014, ไม่มี Status/Owner/Depends ในไฟล์ (OQ-15) · Goal อ้าง git read-only ตาม DES-021 แทน status/diff ของ DES-006 ชั้น 3 เดิม

Back-links: `plan\index.md`
