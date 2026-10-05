### DEVOPS-001 — deploy.md runbook

- **Owner:** devops · **Depends on:** QA-001, QA-002 · **Status:** pending
- **Traces:** REQ-008 (AC-024), `design\quality-attributes.md` §Deployment, DES-009
- **Objective:** runbook ติดตั้ง/รัน/resume/smoke/solo จากของจริงที่ verified แล้ว ไม่ใช่จาก design เพียงอย่างเดียว
- **Scope / Do not touch:** deploy.md ตาม template — สภาพแวดล้อม (Windows + Git Bash, Node v24.21.0, CLI ทั้งสามพร้อมเวอร์ชัน), ขั้นติดตั้ง (`npm install` ที่ `code\agent-team\`, แก้ registry.yaml paths, ตรวจชื่อ owner ใน gates.yaml), วิธีเริ่ม server + resume, ขั้น smoke ต่อ camp, วิธีเปิด solo session (อ้าง SETUP-003), ข้อจำกัด (loopback only ไม่มี auth, solo ไม่มี post-run audit, ไม่มี service/daemon — ปิดแล้ว resume ได้) · Do not touch: ไม่ตั้ง service/daemon, ไม่เปิด bind นอก loopback
- **Done-check:** deploy.md ตรง template · เดินตาม runbook บนเครื่องสดแล้วระบบรันได้จบทุกขั้น (ติดตั้ง → เริ่ม → run → gate → solo)
- **Risk / Rollback:** ต่ำ

Back-links: plan\index.md
