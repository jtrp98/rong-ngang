### SETUP-002 — git init ที่ราก rong-ngang + baseline commit

- **Owner:** setup · **Depends on:** SETUP-001 · **Status:** pending
- **Traces:** REQ-003 (AC-007), DES-006, OQ-D4 (`open-questions\oq-d4.md`, `design\archive.md`)
- **Objective:** repo พร้อมให้ write audit ใช้ git (read-only status/diff) เป็นชั้นหลักแทน manifest
- **Scope / Do not touch:** `git init` ที่ `C:\src\AICode\rong-ngang\` + baseline commit ครอบ skeleton + `.gitignore` อย่างน้อย `node_modules/` · **หมายเหตุ:** one-time exception จากกติกา "no state-changing git" ซึ่งผูก agent ระหว่าง pipeline เท่านั้น — ตัดสินแล้วจาก OQ-D4 (init โดย setup role ตอนขั้นตั้งโปรเจกต์); ถ้าผู้ใช้จะรันคำสั่งนี้เองก็ได้ ยืนยันตอน dispatch · Do not touch: ไม่ push ที่ใด, หลังจากนี้ pipeline ไม่แตะ `.git` (กติกาเดิมคงผูก)
- **Done-check:** `git -C C:\src\AICode\rong-ngang rev-parse --is-inside-work-tree` = true · มี baseline commit · `git status` สะอาดหลัง commit
- **Risk / Rollback:** ต่ำ — ลบ `.git` ได้ (ยังไม่มีประวัติสำคัญ)

Back-links: plan\index.md
