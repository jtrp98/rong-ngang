# SETUP-001 — Skeleton TypeScript package ตาม §Modules

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

โครง package เดียวที่ `code\agent-team\` ติดตั้ง/รัน test/รัน entry ด้วย tsx ได้ — ยังไม่มี logic ใด

## References

- REQ-002 (AC-004), REQ-008 (AC-020) · `design\modules.md` §Modules

## Scope

- package.json (dep เดียว `yaml`, devDep `tsx`, scripts `start`/`test`, entry `src/main.ts`) · tsconfig.json · โฟลเดอร์ `src/core/`, `src/camps/`, `src/web/` (stub), `test/` (placeholder node:test 1 ไฟล์), `config/`, `ui/`, `state/` (ว่าง)
- Write paths: `agent-team/**`
- Security-sensitive: no

## Out of Scope

- ไฟล์ใด ๆ ใน sta2 (อ่านอย่างเดียว) · ไม่ implement logic

## Expected Output

- package ที่ `code\agent-team\` ตามโครง `design\modules.md` §Modules

## Acceptance

- `npm install` สำเร็จ · `npm test` รัน node:test ผ่าน · `npx tsx src/main.ts` รันได้ · โครงโฟลเดอร์ครบตาม `design\modules.md` §Modules · Node ≥ 20 บนเครื่อง (มี v24.21.0 แล้ว)

## Dependencies

- ไม่มี

## Handoff

- `DONE` + ไฟล์ที่สร้าง + ผล check commands → reviewer
- Risk / Rollback: ต่ำ — ลบโฟลเดอร์สร้างใหม่ได้

## Change Log

- 2026-10-05 — replan (R1 ขยาย, design Rev 10): แปลงเป็นรูป task v2 — 8 หัวข้อ DES-014, ไม่มี Status/Owner/Depends ในไฟล์ (อยู่ที่ index — OQ-15) · เนื้อหางานไม่เปลี่ยน

Back-links: `plan\index.md`
