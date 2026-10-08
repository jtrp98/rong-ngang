# agent-team — Review Round 1 — SETUP-007, SETUP-008

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

Review wave เดียว (phase 2) · clean session — ไม่มี context ของ implementer · ไม่มี git diff ให้ใช้ ตรวจไฟล์ปัจจุบันเทียบ Acceptance ของ task + DES/REQ โดยตรง · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\`

## Findings

### REV-001

- **Severity:** blocking (Important)
- **Task:** SETUP-008
- **Location:** `.claude/agents/qa-engineer.md:27` ขัดกับ `.claude/agents/qa-engineer.md:46`
- **Problem:** บรรทัด 27 สั่งให้ "add (never remove) `🔒 Security gate` on the phase in `plan\index.md`" โดยไม่แยกโหมด แต่บรรทัด 46 (orchestrated) สั่ง "**do not write `plan\index.md`**" ใน orchestrated mode agent ทำตามได้แค่ข้อเดียว: ถ้าทำตามบรรทัด 46 qa จะไม่ยก security gate เลย และไม่มีช่องทางอื่นให้รายงาน (handoff ระบุแค่ verdict/perTask) ทำให้ phase ที่ควรติด gate ผ่านไปโดยไม่มี security review (เป็นความเสี่ยงด้าน security) ถ้าทำตามบรรทัด 27 qa ก็เขียน `plan\index.md` ใน orchestrated ซึ่งขัดกับข้อห้ามของตัวเอง และอาจโดน write audit ของ single-writer
- **Reference:** DES-019 QA round ข้อ 5 · REQ-011 AC-073 · `policies/documentation.md:63` (สิทธิ์ security gate ของ qa) · ผู้ต้องแก้: engineer ของ `setup` (prompt) ต้องกำหนดว่า orchestrated qa ยก security gate ผ่าน handoff · ถ้า handoff-v2 ยังไม่มี field สำหรับเรื่องนี้ → `system-analyst`

### REV-002

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/test-planner.md:35` (และ `:23`)
- **Problem:** บรรทัด 29 สั่งให้มี `test-plan\index.md` เสมอ แต่บรรทัด 35 ให้มีเฉพาะ "When more than one file exists" ถ้ามี TP ไฟล์เดียวแล้วไม่มี index การ resolve TP จะเป็น `context-error` ส่วนบรรทัด 23 ยังใช้รูปเดิม "input → expected result" ซึ่งไม่ใช่ Given/When/Then
- **Reference:** DES-019 (Test Planner) · DES-020 ตาราง resolve `TP-NNN` + Fallback · AC-059

### REV-003

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-007
- **Location:** `templates/review-round.md:5-19` เทียบกับ `.claude/agents/reviewer.md:41-42`
- **Problem:** prompt สั่งให้มีตาราง `## Open Findings` และให้ verdict แยกราย task ส่งไปทาง handoff แต่ template ไม่มี section `## Open Findings` และมี verdict แค่ระดับ round ใน solo mode ซึ่งไม่มี handoff JSON นั้น qa อ่านจาก round file อย่างเดียว เลยไม่รู้ verdict ราย task เมื่อ wave มีหลาย task
- **Reference:** DES-018 R3 (review perTask PASS) · AC-050 · REQ-008 (solo ใช้ template เดียวกัน)

### REV-004

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-007
- **Location:** `templates/qa-round.md:1`, `:37`
- **Problem:** `.claude/agents/qa-engineer.md:43` บังคับให้มี `## Open Issues` แต่ template มีแค่ `### Issues Found` และหัว round ไม่มีรูป `Feature QA — Phase <n>` ที่ DES-019 กำหนดไว้สำหรับรอบ Feature QA
- **Reference:** DES-019 (Feature QA) · AC-058

### REV-005

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-007
- **Location:** `templates/review-round.md:11` (และ `.claude/agents/reviewer.md:34-35`)
- **Problem:** Severity ของ REV ใช้ `blocking|non-blocking` แต่กติกา contradiction ของ router ใช้คำ "finding Critical/Important" ถ้าไม่มี mapping ระหว่างสองชุดนี้ กฎ R15 ตัดสินแบบกำหนดแน่นอน (deterministic) ไม่ได้ ตรวจกับ data-model ไม่ได้ (อยู่นอกไฟล์ที่ได้รับอนุญาตให้อ่าน) → `system-analyst` ต้องกำหนดค่า severity ของ REV
- **Reference:** DES-018 (Permissions/States/Errors, R15) · AC-050

### REV-006

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-007
- **Location:** `templates/plan-task.md:19`
- **Problem:** บรรทัดสำหรับเครื่องอ่าน `- Session group: <id> <!-- optional -->` มี HTML comment อยู่ในบรรทัดเดียวกัน ถ้า PM คัดลอกไปตรงตัว parser จะได้ค่า `<id> <!-- optional -->`
- **Reference:** DES-014 plan v2 (บรรทัดเครื่องอ่าน `- Session group: <id>`)

### REV-007

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/test-planner.md:38-40`, `.claude/agents/project-manager.md:46-50`
- **Problem:** เรื่อง state 7 ค่าแบ่งตาม role: BE/FE (5 ค่า = execution) และ reviewer/QA (4 ค่า = review/qa) ตรงกับ DES-018 แล้ว แต่ test-planner (kind execution) และ PM (kind change: DONE/BLOCKED/NEEDS_HUMAN) ไม่ได้บอก output state ไว้เลย ถ้า packet ไม่ใส่ schema ให้ handoff จะไม่มี outputState และเข้า R15 ยืนยันไม่ได้ว่า packet ของ DES-012 ใส่ให้หรือไม่ ทั้งนี้ไม่อยู่ใน Acceptance ของ SETUP-008 โดยตรง
- **Reference:** DES-018 ตาราง state ต่อ kind · AC-068

### REV-008

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/qa-engineer.md:39`
- **Problem:** "On the **third** failed round, or any Critical, stop and ask the user" ไม่แยกโหมด ใน orchestrated การตัดสิน gate 4 เป็นของ router (R5/R7) qa ควรคืน `FAIL`/`NEEDS_HUMAN` แทนการถามผู้ใช้ใน session แบบ headless
- **Reference:** DES-018 R5, R7, R12 · AC-071

### REV-009

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/project-manager.md:22`
- **Problem:** "(`Depends on`)" เป็นคำจากรูปเดิม ส่วน v2 ใช้คอลัมน์ `Depends` ใน index เป็นแหล่งเดียว
- **Reference:** DES-014 plan v2 · AC-036

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-001 | blocking | `.claude/agents/qa-engineer.md:27` / `:46` | setup (+ system-analyst ถ้าต้องมี field ใน handoff) | open |
| REV-002 | non-blocking | `.claude/agents/test-planner.md:35` | setup | → backlog |
| REV-003 | non-blocking | `templates/review-round.md:5-19` | setup | → backlog |
| REV-004 | non-blocking | `templates/qa-round.md:1` | setup | → backlog |
| REV-005 | non-blocking | `templates/review-round.md:11` | system-analyst | → backlog |
| REV-006 | non-blocking | `templates/plan-task.md:19` | setup | → backlog |
| REV-007 | non-blocking | `.claude/agents/test-planner.md:38` | setup | → backlog |
| REV-008 | non-blocking | `.claude/agents/qa-engineer.md:39` | setup | → backlog |
| REV-009 | non-blocking | `.claude/agents/project-manager.md:22` | setup | → backlog |

## Round 1

**Verdict:** FAIL

- **SETUP-007 — PASS:** AC-036 ผ่าน (`templates/plan-index.md:26` มี 6 คอลัมน์) · AC-038 ผ่าน (`templates/plan-task.md` มี 8 หัวข้อ ไม่มี Status และมีบรรทัด Write paths/Security-sensitive/Session group) · AC-059/050/055/058 มี field ครบ (`test-plan.md:19-27`, `review-round.md:9-15`, `qa-round.md:21-45`) และมีตาราง TP/REV/QA ใน index ตาม DES-014 · AC-073 ผ่าน (`policies/documentation.md:39,62`, `CLAUDE.md:42,50,57,61,114` แยกโหมดครบ) · solo ยังเป็น serial (`CLAUDE.md:61`) · AC-023: grep วลีเฉพาะของ prompt ใน templates/policies/CLAUDE.md ไม่พบ · ไม่พบการแก้ git rule
- **SETUP-008 — FAIL:** ติด REV-001 นอกนั้นผ่าน: AC-073 (`qa-engineer.md:45-48` orchestrated ไม่เขียน Status) · AC-062/068 (`backend-engineer.md:41`, `frontend-engineer.md:45` มี 7 ค่า + รูป blocker) · AC-049/053 (`reviewer.md:21`, `qa-engineer.md:21`) · AC-060 (`test-planner.md:29` ไม่มี Bash) · PM มี v2/8 หัวข้อ/Write paths/phase = user flow/`impactedTasks` (`project-manager.md:23,37-39`) · trigger เดิมคงอยู่ (`test-planner.md:21`)
- **ไม่ได้ review:** AC-006 (ครบ 12 role) และ "ไม่มีสำเนา prompt ที่อื่น" นอกไฟล์ที่ได้รับอนุญาตให้อ่าน เพราะห้าม ls · data-model / DES-021 / DES-012 (อยู่นอกรายการอ่าน) · เทียบกับ diff ไม่ได้ เลยตัดสินไม่ได้ว่าข้อความไหนเป็นของเดิม

## Reviewed

- `knowledge\agent-team\plan\index.md` (grep แถว SETUP-007/008), `plan\setup-007.md`, `plan\setup-008.md`
- `design\des-014.md`, `des-018.md`, `des-019.md`, `des-020.md` · `requirement\req-011.md`, `req-015.md`…`req-019.md`, `req-021.md`
- `code\templates\plan-index.md`, `plan-task.md`, `test-plan.md`, `review-round.md`, `qa-round.md` · `code\policies\documentation.md` (§1–§3) · `code\CLAUDE.md`
- `code\.claude\agents\qa-engineer.md`, `reviewer.md`, `project-manager.md`, `backend-engineer.md`, `frontend-engineer.md`, `test-planner.md`

## Change Log

- 2026-10-05 — Round 1 — FAIL (SETUP-007 PASS · SETUP-008 FAIL: REV-001)

Back-links: `plan\index.md` · `..\index.md`
