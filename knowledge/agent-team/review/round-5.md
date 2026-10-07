# agent-team — Review Round 5 — SETUP-009, SETUP-008 (follow-up Rev 12)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

รอบนี้ตรวจ 2 เรื่องใน wave เดียว (เจ้าของ jtrp98, 2026-10-06) คือ (A) SETUP-009 ซึ่งแก้ `test-planner.md` และ (B) การแก้ `project-manager.md` ตาม design Rev 12 ซึ่งผูกกับ SETUP-008 ที่ amend แล้ว และยังไม่เคยผ่าน review · เป็น clean session ไม่มี diff จึงตรวจจากไฟล์ปัจจุบัน · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\` · finding ที่อยู่ใน backlog แล้วไม่เปิดซ้ำ

## Findings

### REV-015

- **Severity:** Minor → backlog
- **Task:** SETUP-009
- **Location:** `templates/test-plan.md:1,3` (หัว `Test Plan: <slug>` และตัวอย่างแถว index `| TP-001 | 1 | REQ-001/AC-001 | <slug>.md |`) ซึ่งขัดกับ `.claude/agents/test-planner.md:33`
- **Problem:** prompt สั่งให้เขียน `test-plan\round-N.md` "from `templates\test-plan.md`" แต่ template ยังใช้ `<slug>` ทั้งที่หัวไฟล์และในตัวอย่างคอลัมน์ `ไฟล์` เมื่อ agent ทำตาม template ก็อาจตั้งชื่อเป็น `<slug>.md` · TP ยัง resolve ได้ เพราะ DES-020 อ่านคอลัมน์ `ไฟล์` จาก index จึงไม่ขวาง AC · ไฟล์นี้อยู่นอก Write paths ของ SETUP-009 (Out of Scope ระบุให้แจ้ง PM)
- **Reference:** DES-019:24 · DES-020 ตาราง resolve `TP-NNN` · ผู้ต้องแก้: `project-manager` (เปิด task) → `setup`

### REV-016

- **Severity:** Minor → backlog
- **Task:** SETUP-009
- **Location:** `.claude/agents/test-planner.md:21` ("Trigger unchanged.")
- **Problem:** ประโยคนี้เป็นบันทึกการเปลี่ยนแปลง ไม่ใช่คำสั่ง agent ที่อ่านจะไม่รู้ว่า "unchanged" เทียบกับอะไร · ส่วนรายการ trigger ที่ตามมาตรงกับ `:3` และ OQ-16 อยู่แล้ว ควรตัดประโยคนี้ออก
- **Reference:** REQ-018 (OQ-16) · `policies/coding.md` §5 (what-comment) · ผู้ต้องแก้: `setup`

### REV-017

- **Severity:** Minor → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/project-manager.md:24` ("except tasks that depend on it")
- **Problem:** DES-019:22 ยกเว้น dependents ของ anchor ทั้งแบบตรงและแบบทอด (ตรง/ทอด) แต่ prompt ไม่ได้ระบุแบบทอด · router เป็นผู้คำนวณ Depends โดยนัย (R8) จึงไม่ทำให้ routing ผิด แต่ PM อาจเข้าใจผิดว่างาน "หลัง devops" ที่ไม่ได้ Depends anchor ตรง ๆ ต้องเสร็จก่อน Feature QA
- **Reference:** DES-019:22 · ผู้ต้องแก้: `setup`

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-015 | Minor | `templates/test-plan.md:1,3` | project-manager → setup | → backlog |
| REV-016 | Minor | `.claude/agents/test-planner.md:21` | setup | → backlog |
| REV-017 | Minor | `.claude/agents/project-manager.md:24` | setup | → backlog |
| REV-002 | Minor | `.claude/agents/test-planner.md:29,35` | setup | resolved |
| REV-014 | Minor | `.claude/agents/test-planner.md:33` | setup | resolved |
| REV-007 | Minor | `.claude/agents/test-planner.md:40` | setup | resolved (ฝั่ง test-planner · ฝั่ง PM ยังอยู่ BL-024 ตาม SETUP-009 Out of Scope) |
| REV-012 | Minor | `.claude/agents/project-manager.md:24` | system-analyst → setup | resolved |
| REV-013 | Minor | `.claude/agents/project-manager.md:34` | setup | resolved |
| REV-009 | Minor | `.claude/agents/project-manager.md:22` | setup | resolved |
| REV-008 | Minor | `.claude/agents/qa-engineer.md:40` | setup | → backlog (ไม่ได้อ่านซ้ำ) |

## Round 5

**Verdict:** PASS

| Task | Verdict |
|---|---|
| SETUP-009 | PASS |
| SETUP-008 (ส่วน B — `project-manager.md` Rev 12) | PASS |

- **(A) SETUP-009 Acceptance:** `:29` และ `:34-35` สั่งให้สร้างหรืออัปเดต `test-plan\index.md` ทุกครั้ง แม้มีไฟล์เดียว และไม่มีเงื่อนไข · grep ไม่พบ "more than one", "input →" หรือ `<slug>` ใน prompt · `:29` กำหนด TP-NNN แบบ Given/When/Then พร้อม REQ/AC (AC-059) · `:33` ใช้ `round-N.md` · `:40` มี 5 state ของ kind `execution` ตรงกับ `des-018.md:11` และรูป `blocker{type,task,reference,reason}` ตรงกับ `des-018.md:16` / data-model `Blocker` · `BLOCKED` จำกัดไว้ที่ environment/dependency/access/other · `:4` ไม่มี Bash และ `:29` ห้ามรัน check (AC-060) · `:40` ห้ามแตะ Status และห้ามใช้ git · trigger ที่ `:3,21` ไม่เปลี่ยน (OQ-16) · ไม่พบกฎที่เกิน design · REV-002, REV-014 และ REV-007 (ฝั่ง test-planner) จึง resolved
- **(A) template:** `templates/test-plan.md` มี Given/When/Then, REQ/AC และตาราง `| TP | Phase | REQ/AC | ไฟล์ |` ตรงกับ prompt เหลือเพียงชื่อ `<slug>` ที่ไม่ตรง (REV-015 Minor)
- **(B) AC-079:** `:28` ห้ามเขียน task ที่ Owner เป็น `reviewer`/`security` และให้เหตุผลตรงกับ R24 / DES-019:23 (review เปิดต่อ wave ส่วน security เป็น stage ท้าย phase ที่มี 🔒)
- **(B) anchor:** `:24` กำหนด Owner qa-engineer ไม่มี Write paths, Depends โดยนัยยกเว้น dependents, "At most one per phase" และงานหลัง Feature QA ต้องใส่ anchor ใน `Depends` ตรงกับ DES-019:22 และ R24 `multi-anchor` · ตอนนี้ design ยืนยัน ≤ 1 แล้ว REV-012 จึง resolved · เหลือเพียงคำ "ทอด" (REV-017 Minor)
- **(B) AC-080:** `:27` ตั้ง 🔒 ได้ทั้งที่แถว `## Phases` และด้วย `Security-sensitive: yes` ตรงกับนิยามใน DES-019:23 (ส่วน `securityGate` เป็นทางของ qa ผ่าน R23 ไม่ใช่ของ PM) และสอดคล้องกับคอลัมน์หมายเหตุ `🔒 security gate` ใน `templates/plan-index.md:22`
- **(B) คำศัพท์:** `:34` เขียน "Minor review/QA findings" ตรงกับ §Severity (`des-018.md:48`) และ grep ไม่พบ "non-blocking" อีก REV-013 จึง resolved · `:22` เขียน "(`Depends`)" ซึ่งหมายถึงคอลัมน์ใน index และ grep ไม่พบ "Depends on" อีก REV-009 จึง resolved
- **(B) ความขัดกันเอง:** `:40-41` (8 หัวข้อ ไม่มี Status/Owner/Phase/Depends ในไฟล์ task และตาราง Tasks v2) ตรงกับ `templates/plan-index.md:26` · `:45-46` (PM เขียนได้แค่ `pending` · orchestrated ให้ orchestrator คัดลอก · solo ให้ qa เขียน) ตรงกับ `plan-index.md:3` และ REQ-011 OQ-14 · `:26` (รูปมีหมวดนำ) ตรงกับ DES-020 (3) · ไม่พบกฎที่ขัดกันหรือเกิน design
- **(C) ข้ามไฟล์ / regression:** โหมด solo ยังให้ qa เขียน Status (`project-manager.md:46`) · ทั้งสอง prompt ยังห้ามใช้ git (`test-planner.md:40`, `project-manager.md:53`) · รูป blocker ของ test-planner (field form) สอดคล้องกับ `backend-engineer.md:41` (Task/Reference/Reason + BLOCKED 4 ชนิด) และ test-planner ระบุ `type` เพิ่มตาม DES-018 ซึ่งไม่ขัดกัน · ไม่มี finding Critical/Important
- **ไม่ได้ review:** "ไม่มีไฟล์อื่นเปลี่ยน" ใน Acceptance ของ SETUP-009 (ไม่มี diff และไม่อนุญาตให้ใช้ git/ls) · เนื้อหาเดิมของ REV-002/007/009 ใน round-1.md (ไม่อยู่ในรายการให้อ่าน จึงตรวจจาก Location/Problem ใน round-3/4 และ setup-009 Scope) · `qa-engineer.md` (REV-008) · ฝั่ง sta2 sync

## Reviewed

- `knowledge\agent-team\review\index.md`, `review\round-3.md`, `review\round-4.md`, `plan\setup-009.md`, `plan\setup-008.md`
- `design\des-018.md`, `des-019.md`, `des-020.md`, `design\data-model.md` (grep: blocker/OutputState/Severity/securityGate)
- `requirement\req-011.md`, `req-015.md`, `req-018.md`
- `code\.claude\agents\test-planner.md`, `project-manager.md` (ทั้งไฟล์), `backend-engineer.md` (ทั้งไฟล์)
- `code\templates\test-plan.md`, `plan-index.md`, `review-round.md`

## Change Log

- 2026-10-06 — Round 5 — PASS (SETUP-009 PASS · SETUP-008 ส่วน B PASS · REV-002/007/009/012/013/014 resolved · REV-015…017 Minor → backlog)

Back-links: `plan\index.md` · `..\index.md`
