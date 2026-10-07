# SETUP-003 — จุดเข้า solo mode 4 agents + คู่มือ (DES-013)

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

ไฟล์จุดเข้าต่อ agent แบบ wrapper ชี้ pack ที่ `code\` (packRoot — DES-003; fork โดย SETUP-004) + คู่มือเปิด solo session — เป็นไฟล์ประกอบ ไม่ใช่โค้ด orchestrator (DES-013 ระบุเดิมเป็น task ของ PM; ย้ายมาให้ setup เพราะขอบเขียนของ PM มีเพียง plan\ และ backlog.md)

## References

- REQ-008 (AC-020, AC-022, AC-023, AC-024), REQ-011 (AC-036), DES-013

## Scope

- `AGENTS.md` ที่ `code\` = จุดเข้ากลาง (ตำแหน่งตาม Waiting on Human #1 ที่ปิด 2026-10-04 + pack ย้ายเข้า `code\` ตาม design Rev 8) ระบุวิธีเปิด session ครบ 4 agents: claude/zcode → `.claude\agents\*.md` + `CLAUDE.md` ตรง · codex → `AGENTS.md` convention · agy → สั่ง session อ่านไฟล์ก่อนเริ่ม
- อ้าง path ของ role prompts/templates/policies/tiers.yaml เท่านั้น — **ห้ามคัดลอกเนื้อหา role prompt** (AC-023) · tiers.yaml = คำแนะนำ model/effort ตอน spawn subagent (AC-022)
- ประกาศข้อจำกัด solo: ไม่มี post-run audit (gate เป็นหน้าที่ของ session เอง) · state = เอกสารใน knowledge · **serial** (OQ-17) · qa-engineer เขียน Status เอง (OQ-14) · รูปเอกสาร v2 เดียวกับ orchestrated (AC-021)
- **backup-then-delete สำเนาเก่า** (Waiting on Human #2 ปิด 2026-10-04): คัดลอก `~\.gemini\config\agents\` → `~\.gemini\config\agents-backup-<date>\` แล้วลบโฟลเดอร์เดิม (one-time exception — นอก codeRoot)
- Write paths: `AGENTS.md`
- Security-sensitive: no

## Out of Scope

- ไฟล์เดิมทุกไฟล์ของ sta2 · โค้ด orchestrator · user home นอกจาก backup/delete ข้างบน · `/gituse` + hard rule git (REQ-009 — `backlog.md` BL-016)

## Expected Output

- `code\AGENTS.md` (จุดเข้าเดียวครบทั้งวิธีเปิดและกติกาขับ) + backup ใน user home

## Acceptance

- grep ไม่พบเนื้อหา role prompt ถูกคัดลอกลงไฟล์จุดเข้า (มีเพียง path/คำสั่งอ่าน) · ครอบครบ 4 agents · ไม่มีไฟล์ sta2 ถูกแก้ · ประกาศ serial + ผู้เขียน Status ในโหมด solo · ทำตามคู่มือเปิด session ได้จริงทีละ agent (ตรวจเต็มที่ QA-002)

## Dependencies

- SETUP-001, SETUP-004 — pack ที่ `code\`

## Handoff

- `DONE` + ไฟล์ที่เขียน + path ของ backup → reviewer
- Risk / Rollback: ต่ำ — backup ก่อนลบคือ rollback ของการลบสำเนาเก่า

## Change Log

- 2026-10-05 — replan Rev 10: เพิ่มประกาศ solo serial + qa-engineer เขียน Status (OQ-14/17, DES-013 Rev 10) · ถอดตัวชี้ REQ-009 (SETUP-006) → `backlog.md` BL-017 · รูป task v2

Back-links: `plan\index.md`
