### SETUP-005 — Setup prompt onboarding knowledge (DES-015, phase 1)

- **Owner:** setup · **Depends on:** SETUP-004 (pack พร้อมแล้ว) · **Status:** pending
- **Traces:** REQ-001 (AC-001, AC-002), REQ-009 (AC-028, AC-032), DES-015, DES-014
- **Objective:** ไฟล์ setup prompt ใน pack (เช่น `code\prompts\setup-knowledge.md`) — รันจากที่ติดตั้ง ชี้ path knowledge → ตรวจ/สร้างโครง module ตาม DES-014 → เขียน/เพิ่มรายการ knowledge (+targets) ลง `code\sta-config.json`
- **Scope / Do not touch:** สร้างไฟล์ prompt เดียว + คำแนะนำใช้ย่อใน `AGENTS.md` (ขยายได้ภายหลัง) · เขียน sta-config.json แบบ append รายการ (รักษารายการเดิม — schema ตาม DES-015: main_root, knowledge_roots[].{name,path,targets[]}) · (REQ-009) schema มี `gituse` optional (knowledge/target) — prompt **ไม่เขียน** `gituse` (ไม่ตั้ง = เปิด AC-028; รอ Waiting on Human #6), รักษา `gituse` เดิมของรายการที่มีอยู่ตอน append, ไม่เขียน `git`/remote (AC-032) · fail-closed เมื่อ path ที่ผู้ใช้ชี้ไม่มีจริงบนดิสก์ — ปฏิเสธโดยไม่เขียนอะไร (DES-015) · Do not touch: orchestrator code, knowledge เอกสาร module อื่น
- **Done-check:** รัน prompt ชี้ knowledge ทดสอบ → `code\sta-config.json` มีรายการถูกต้อง (name/path/targets ตรง schema) + โครงโฟลเดอร์ module ครบตาม DES-014 · path ผิด → ปฏิเสธ (fail-closed) · รายการเดิมใน sta-config ไม่ถูกทำหาย · (REQ-009) รายการใหม่ไม่มี key `gituse`/`git` · รายการเดิมที่มี `gituse` คงค่าเดิม
- **Risk / Rollback:** ต่ำ — เขียนแค่ sta-config.json (append รายการ)

Back-links: plan\index.md
