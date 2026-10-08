# agent-team — Review Round 3 — SETUP-008

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

รอบนี้ตรวจงาน follow-up ที่แก้ pack ตาม design Rev 11 (เจ้าของ jtrp98, 2026-10-05) ได้แก่ §Severity, R23 `securityGate`, anchor ของ Feature QA และรูปมีหมวดนำตาม DES-020 · เป็น clean session ไม่มี diff จึงตรวจจากไฟล์ปัจจุบัน · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\` · finding ที่อยู่ใน backlog แล้วไม่เปิดซ้ำ

## Findings

### REV-011

- **Severity:** Important
- **Task:** SETUP-008
- **Location:** `.claude/agents/qa-engineer.md:27` (ประโยค "never use `gate: "none"` for a Critical-defect or third-round stop that the brief names a gate for") ทำงานร่วมกับ `:40`
- **Problem:** ประโยคนี้ setup เพิ่มเอง ไม่มีใน design และทำให้ qa เข้าใจว่าต้องยก gate 4 เองผ่าน `questionsForHuman` (ซึ่งหมายถึง state `NEEDS_HUMAN`) ทั้งตอนเจอ Critical และตอนครบรอบที่ 3 ขณะที่ design ให้ router เป็นผู้ตัดสินเรื่องนี้จาก verdict: R7 ใช้ QA `FAIL` ที่มี defect Critical แล้วเขียน `blocked` และยก gate 4 ส่วน R5 ใช้ `fixRounds == fixRoundLimit` ซึ่ง qa ไม่รู้ค่า เพราะตัวนับอยู่ที่ TaskRuntime ไม่ใช่ใน handoff ถ้า qa คืน `NEEDS_HUMAN` ตามที่ `:40` สั่งให้ "stop and ask" ประกอบกับประโยคนี้ event จะเข้า R12 แทน R4/R5/R7 ผลคือ Status ไม่ถูกตั้งเป็น `blocked` · ไม่เกิด defect packet (AC-055) · verdict `perTask` ของ task อื่นในรอบเดียวกันไม่ถูกนำไปใช้ (AC-056 / `:31`) จึงขัดกับ contract ของ DES-018
- **Reference:** DES-018 R5, R7, R12 (`des-018.md:25,27,32`) · DES-019 QA round ข้อ 4–5 · AC-055 · ผู้ต้องแก้ `setup`: วิธีแก้ขั้นต่ำคือถอดประโยคนี้ออก ถ้าเจ้าของต้องการให้ qa ส่ง gate เองจริง เรื่องนี้ต้องให้ `system-analyst` กำหนดเพิ่มใน DES-018 ก่อน

### REV-012

- **Severity:** Minor → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/project-manager.md:24` ("At most one per phase.")
- **Problem:** design ไม่ได้กำหนดจำนวน anchor ต่อ phase ไว้ตรง ๆ (R18 เขียนว่า "`taskIds` = anchor" และ DES-019:22 เขียนว่า "anchor ของ phase") กฎนี้ไม่ขัดกับ design และอาจอนุมานได้ว่าตั้งใจไว้แบบนั้น เพราะถ้ามี anchor 2 ตัว แต่ละตัวจะ Depends โดยนัยกับอีกตัว (วงวน R9) แต่เป็นข้อจำกัดที่ setup เพิ่มเองและไม่มี validator รองรับ ควรให้ `system-analyst` ยืนยันใน DES-019 (คงไว้) หรือถอดออก
- **Reference:** DES-018 R18 · DES-019 (anchor) · ผู้ต้องแก้: `system-analyst` → `setup`

### REV-013

- **Severity:** Minor → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/project-manager.md:33` ("non-blocking review/QA findings")
- **Problem:** เป็นคำเดียวที่ยังค้างจากชุด severity เก่า และไม่ได้ map ไปยัง `Minor` (ส่วน `CLAUDE.md:106` เขียน "Non-blocking findings (Minor, …)" ซึ่ง map ไว้แล้ว) ความหมายยังเข้าใจได้ จึงไม่ทำให้ routing ผิด
- **Reference:** DES-018 §Severity (`des-018.md:47`) · `data-model.md:155` · ผู้ต้องแก้: `setup`

### REV-014

- **Severity:** Minor → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/test-planner.md:33` (`test-plan\<slug>.md`)
- **Problem:** DES-019 กำหนดให้ test-planner เขียน `test-plan\round-N.md` และ DES-020 resolve TP ไปที่ `test-plan\round-N.md` ตามที่แถวใน index ระบุ ปัจจุบันยัง resolve ได้เพราะ index มีคอลัมน์ `ไฟล์` แต่ชื่อไฟล์ไม่ตรงกับ contract (เป็นเรื่องเดียวกับ REV-002 ที่อยู่ใน backlog)
- **Reference:** DES-019:23 · DES-020 ตาราง resolve `TP-NNN` · ผู้ต้องแก้: `setup`

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-011 | Important | `.claude/agents/qa-engineer.md:27` | setup (+ system-analyst ถ้าจะคงไว้) | open |
| REV-012 | Minor | `.claude/agents/project-manager.md:24` | system-analyst → setup | → backlog |
| REV-013 | Minor | `.claude/agents/project-manager.md:33` | setup | → backlog |
| REV-014 | Minor | `.claude/agents/test-planner.md:33` | setup | → backlog |
| REV-010 | Minor | `.claude/agents/qa-engineer.md:27` | setup | resolved |
| REV-003 | Minor | `templates/review-round.md:17-28` | setup | resolved |
| REV-004 | Minor | `templates/qa-round.md:1,9` | setup | resolved |
| REV-005 | Minor | `templates/review-round.md:11` | system-analyst | resolved |
| REV-006 | Minor | `templates/plan-task.md:19` | setup | resolved |
| REV-002 | Minor | `.claude/agents/test-planner.md:23,35` | setup | → backlog (ยังอยู่) |
| REV-007 | Minor | `.claude/agents/test-planner.md:38` | setup | → backlog (ยังอยู่) |
| REV-008 | Minor | `.claude/agents/qa-engineer.md:40` | setup | → backlog (ยังอยู่ · ดู REV-011) |
| REV-009 | Minor | `.claude/agents/project-manager.md:22` | setup | → backlog (ยังอยู่) |

## Round 3

**Verdict:** FAIL

| Task | Verdict |
|---|---|
| SETUP-008 | FAIL (REV-011) |

- **(1) Severity:** prompt/template ทุกไฟล์ในรายการใช้ `Critical|Important|Minor` และ blocking = Critical/Important ตรงตาม `des-018.md:47` (ดู `reviewer.md:34-35,42,50`, `qa-engineer.md:39`, `review-round.md:7,11,24`, `qa-round.md:5,47`) · การ grep `non-blocking`/`✅ Approved` พบคำเก่าค้างแค่ที่ `project-manager.md:33` (REV-013)
- **(2) `securityGate`:** `qa-engineer.md:27` ตรงกับ `data-model.md:170`, DES-019 ข้อ 6 และ R23 ครบทุกจุด คือ `[{phase, reason}]` ใช้เฉพาะ qa/Feature QA, เป็น `null` เมื่อไม่มี, state เป็นไปตาม verdict ไม่ใช้ NEEDS_HUMAN และ phase ≠ packet ถือเป็น invalid · `:33` (anchor: solo เขียน Status ส่วน orchestrated ส่งทาง handoff) และ `:46-48` (orchestrated ไม่เขียน `plan\index.md` ส่วน solo เขียน Status + 🔒) ไม่ขัดกันเอง · REV-010 จึง resolved · ปัญหาเดียวที่เหลือคือประโยค gate ท้าย `:27` (REV-011)
- **(3) กฎที่ setup เพิ่มเอง:** ข้อแรก "อย่างมากหนึ่ง anchor" เกิน design เล็กน้อยแต่ไม่ขัด จึงเป็น Minor ให้ SA ตัดสิน (REV-012) · ข้อสอง "gate none" ขัดกับ R5/R7/R12 จึงเป็น Important ให้ถอดออก หรือให้ SA กำหนดก่อนถ้าจะคงไว้ (REV-011)
- **(4) DES-020:** ใช้รูป `qa:`/`review:`/`test-plan:` ตรงกับ design ที่ `qa-engineer.md:32` (typed fields ไม่ต้องใส่หมวดนำ ตรงกับ DES-020 (1)), `reviewer.md:43` (task-first), `project-manager.md:26` (ไม่ renumber), `review-round.md:32`, `qa-round.md:7`
- **(5) Solo/git:** solo ยังเป็น serial (`CLAUDE.md:61`) และ qa ยังเขียน Status/🔒 เองใน solo (`qa-engineer.md:33,48`) · git rule `CLAUDE.md:113` ไม่เปลี่ยน · grep ไม่พบ `gituse`
- **(6) Depends/Status:** ผู้เขียน Status แยกตามโหมดตรงกับ OQ-14 ทุกไฟล์ (`CLAUDE.md:42,57,61,114`, `project-manager.md:45`, `qa-engineer.md:46-48`, engineer `:45`/`:49` และ `test-planner.md:40` ห้ามแตะ Status) · Depends อยู่ที่ index เท่านั้น (`project-manager.md:39-40`, `plan-task.md:3,35`) · ยังเหลือคำ "Depends on" ที่ `:22` (REV-009 อยู่ใน backlog)
- **(7) Anchor ใน PM:** `project-manager.md:24` (Owner = qa-engineer, ไม่มี Write paths, Depends โดยนัยกับทุก task) ตรงกับ kind `feature-qa` (`des-018.md:13`), R18 และ DES-019:22
- **ไม่ได้ review:** DES-012 กฎ (7) (ไม่อยู่ในรายการให้อ่าน จึงตรวจได้แค่จาก data-model/DES-018/019) · AC-006/AC-023 (ต้อง ls) · prompt role อื่น · ฝั่ง sta2

## Reviewed

- `knowledge\agent-team\review\index.md`, `review\round-1.md`, `review\round-2.md`, `plan\setup-008.md`
- `design\des-018.md`, `des-019.md`, `des-020.md`, `design\data-model.md` (grep: securityGate/questionsForHuman/GateId/Severity)
- `code\templates\review-round.md`, `qa-round.md`, `plan-task.md` · `code\CLAUDE.md`
- `code\.claude\agents\qa-engineer.md`, `reviewer.md`, `project-manager.md`, `test-planner.md` (ทั้งไฟล์) · `backend-engineer.md:14-45`, `frontend-engineer.md:14-49`

## Change Log

- 2026-10-05 — Round 3 — FAIL (SETUP-008 · REV-011 Important open · REV-012…014 → backlog · REV-003…006, REV-010 resolved)

Back-links: `plan\index.md` · `..\index.md`
