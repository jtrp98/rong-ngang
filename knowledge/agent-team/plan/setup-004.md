# SETUP-004 — Fork pack มาที่ `code\` (packRoot)

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

rong-ngang พึ่งตัวเองได้ — pack ครบชุดที่ `code\`: `CLAUDE.md` (project config: packRoot=`code\` · docsRoot/codeRoots ไม่ hard-code — ผูกด้วย `code\sta-config.json` (DES-015), ผู้เขียนรายการคือ SETUP-005/คน) + `.claude\agents\*.md` ทั้ง 12 **แก้ตามโครง split** (path ต่อ role ตาม DES-006 ฉบับ split, อ่าน index-first, status-at-index สำหรับ PM/QA, readSections เป็น path) + `policies\documentation.md` §1/§4/§5 ตาม split + budget/สูตร index + `templates\` ต่อไฟล์ย่อย (req / scope / des / task / oq / round / index) + `AGENTS.md` จุดเข้า codex/agy

## References

- REQ-003 (AC-006, AC-023), REQ-008 (AC-024), DES-003, DES-011, DES-014

## Scope

- สร้าง/เขียนเฉพาะไฟล์ pack ที่ `code\` (ย้ายเข้า `code\` แล้วบนดิสก์ 2026-10-05 — design Rev 8) ตาม Goal (คำสั่งเจ้าของ 2026-10-05 "ให้แก้ agent ที่จะทำในอันใหม่")
- Write paths: `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `policies/**`, `templates/**`
- Security-sensitive: no

## Out of Scope

- ห้ามลบ/แก้ไฟล์ใดใน sta2 (provenance) · รูป plan v2 / TP / REV / QA ของ Rev 10 (SETUP-007) · พฤติกรรม role ตาม Rev 10 (SETUP-008)

## Expected Output

- pack ฉบับ split ที่ `code\` (ฐานของ SETUP-003/005/007/008 และ BE-003)

## Acceptance

- grep ไม่พบ path แบบเก่า (`requirement.md` เดี่ยว ฯลฯ) ใน prompts/policies · เปิด session ที่ `code\` (packRoot) เห็น agents ครบ 12 · ไม่มีไฟล์ sta2 ถูกแก้

## Dependencies

- ไม่มี

## Handoff

- `DONE` + รายการไฟล์ pack → reviewer
- Risk / Rollback: ต่ำ — ไฟล์ใหม่ที่ `code\` (packRoot) ทั้งหมด

## Change Log

- 2026-10-05 — replan Rev 10: รูป task v2 (8 หัวข้อ ไม่มี Status) · แยกส่วน Rev 10 ของ pack ไป SETUP-007/008 · เนื้อหางานเดิมไม่เปลี่ยน

Back-links: `plan\index.md`
