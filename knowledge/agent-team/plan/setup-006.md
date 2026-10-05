### SETUP-006 — `/gituse` + hard rule git แบบมีเงื่อนไขใน pack (DES-017, DES-016 §solo)

- **Owner:** setup · **Depends on:** SETUP-003, SETUP-004 · **Status:** pending
- **Traces:** REQ-009 (AC-025, AC-027, AC-028, AC-029, AC-030, AC-031), REQ-008 (AC-023, AC-024), DES-017, DES-016, DES-013
- **Objective:** solo mode สลับสวิตช์ด้วย `/gituse` ได้ และ session ทำตามสิทธิ์ commit ต่อ root
- **ทำไมแยกจาก SETUP-003:** contract ใหม่ (DES-016/017) + ติด human gate (#3, #5, #6, #8) ที่ SETUP-003 ไม่ติด — SETUP-003 เดินต่อได้ไม่ต้องรอ · `setup-003.md` ใกล้งบ 4 KB
- **Scope / Do not touch:** (1) `code\.claude\commands\gituse.md` (claude/zcode) ตาม DES-017: `/gituse` แสดงตารางค่าที่ตั้ง/effective/basis · `/gituse on|off|unset [<knowledge>] [<target>]` (knowledge หลายตัวไม่ระบุ → ถามผู้ใช้) · แก้ key `gituse` จุดเดียว รักษา key/ลำดับอื่น เขียน atomic (tmp + rename) แล้ว parse ซ้ำ · ข้อความผลลัพธ์ "มีผล run ถัดไป" · errors ตาม DES-017 (2) หัวข้อ `/gituse` ใน `code\AGENTS.md` (codex/agy) ชี้ไฟล์เดียวกัน + fallback พิมพ์เป็นข้อความ — ห้ามสำเนาเนื้อหา (AC-023) (3) hard rule "No state-changing git" ใน `code\CLAUDE.md` → มีเงื่อนไขตาม DES-016 §solo: `git add -- <path>`/`git commit` เฉพาะ root ที่ effective `gituse` = true และเป็น repo (resolve ครั้งเดียวตอนเริ่ม run) · ห้าม `git add -A`/`.` และ `--amend` · กลุ่มห้ามเสมอ (push/branch/merge ฯลฯ) ห้ามทุกค่า · non-repo → เตือน + ข้าม · AI ห้ามเรียก `/gituse` หรือแก้ sta-config เอง · Do not touch: `code\.claude\settings.json` (Waiting on Human #5 — task แยกหลังผู้ใช้ตัดสิน), ไฟล์ sta2, orchestrator code, ค่าใน `code\sta-config.json` จริง
- **Done-check:** `gituse.md` ครอบ show/on/off/unset + errors ตาม DES-017 · `AGENTS.md` มีหัวข้อ `/gituse` เป็น path อ้างอิง (grep ไม่พบเนื้อหาซ้ำ — AC-023) · `code\CLAUDE.md` มีข้อยกเว้นตรง DES-016 §solo และยังห้าม push/branch/merge (AC-030) · `settings.json` ไม่ถูกแตะ · พฤติกรรมจริงต่อ agent (AC-029) ตรวจที่ QA-002
- **Risk / Rollback:** กลาง — รูป slash command ต่อ agent `inferred` · ถ้า #5 = ไม่ถอด deny ต้องประกาศใน `AGENTS.md` ว่าสวิตช์เปิดไม่มีผลใน claude/zcode · rollback: ลบ `gituse.md` + หัวข้อ + คืน hard rule เดิม

Back-links: plan\index.md
