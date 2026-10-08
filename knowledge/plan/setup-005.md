# SETUP-005 — Setup prompt onboarding knowledge (DES-015)

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

ไฟล์ setup prompt ใน pack (เช่น `code\prompts\setup-knowledge.md`) — รันจากที่ติดตั้ง ชี้ path knowledge → ตรวจ/สร้างโครง module ตาม DES-014 (รูป v2 จาก template ของ SETUP-007) → เขียน/เพิ่มรายการ knowledge (+targets) ลง `code\sta-config.json`

## References

- REQ-001 (AC-001, AC-002), REQ-011 (AC-036), DES-015, DES-014

## Scope

- ไฟล์ prompt เดียว + คำแนะนำใช้ย่อใน `AGENTS.md` (ขยายได้ภายหลัง)
- prompt เขียน sta-config.json แบบ append รายการ (รักษารายการเดิม — schema DES-015: main_root, knowledge_roots[].{name,path,targets[]}) · ไม่เขียน key นอก schema ที่ config.ts รับ (`config.ts:555,574` exact keys)
- fail-closed เมื่อ path ที่ผู้ใช้ชี้ไม่มีจริง — ปฏิเสธโดยไม่เขียนอะไร (DES-015)
- โครง module ใหม่ใช้ template v2 (plan 6 คอลัมน์, ตาราง TP/REV/QA ใน index)
- Write paths: `prompts/**`, `AGENTS.md`
- Security-sensitive: no

## Out of Scope

- orchestrator code · เอกสาร module อื่น · `gituse`/`git` ใน sta-config (REQ-009 — `backlog.md` BL-017)

## Expected Output

- `code\prompts\setup-knowledge.md` + หัวข้อสั้นใน `code\AGENTS.md`

## Acceptance

- รัน prompt ชี้ knowledge ทดสอบ → `code\sta-config.json` มีรายการถูกต้อง (name/path/targets ตรง schema — orchestrator โหลดผ่าน BE-001) + โครง module ครบตาม DES-014 และ plan index มี 6 คอลัมน์ (AC-036) · path ผิด → ปฏิเสธ · รายการเดิมใน sta-config ไม่หาย

## Dependencies

- SETUP-004 — pack · SETUP-007 — template v2 · SETUP-003 — `AGENTS.md` (ไฟล์เดียวกัน — ทำต่อกัน)

## Handoff

- `DONE` + ไฟล์ที่เขียน + ผลรันทดสอบ → reviewer
- Risk / Rollback: ต่ำ — prompt เขียนแค่ sta-config.json (append รายการ)

## Change Log

- 2026-10-05 — replan Rev 10: โครง module ใช้ template v2 · Depends +SETUP-007, SETUP-003 · ถอดส่วน REQ-009 (`gituse`) → `backlog.md` BL-017 · รูป task v2

Back-links: `plan\index.md`
