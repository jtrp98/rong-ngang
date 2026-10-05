### SETUP-001 — Skeleton TypeScript package ตาม §Modules

- **Owner:** setup · **Depends on:** — · **Status:** pending
- **Traces:** REQ-002 (AC-004), REQ-008 (AC-020), `design\modules.md` §Modules
- **Objective:** โครง package เดียวที่ `code\agent-team\` ติดตั้ง/รัน test/รัน entry ด้วย tsx ได้ — ยังไม่มี logic ใด
- **Scope / Do not touch:** package.json (dep เดียว `yaml`, devDep `tsx`, scripts `start`/`test`, entry `src/main.ts`) · tsconfig.json · โฟลเดอร์ `src/core/`, `src/camps/`, `src/web/` (stub), `test/` (placeholder node:test 1 ไฟล์), `config/`, `ui/`, `state/` (ว่าง) · Do not touch: ไฟล์ใด ๆ ใน sta2 (อ่านอย่างเดียว), ไม่ implement logic
- **Done-check:** `npm install` สำเร็จ · `npm test` รัน node:test ผ่าน · `npx tsx src/main.ts` รันได้ · โครงโฟลเดอร์ครบตาม `design\modules.md` §Modules · Node ≥ 20 บนเครื่อง (มี v24.21.0 แล้ว)
- **Risk / Rollback:** ต่ำ — ลบโฟลเดอร์สร้างใหม่ได้

Back-links: plan\index.md
