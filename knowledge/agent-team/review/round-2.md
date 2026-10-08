# agent-team — Review Round 2 — SETUP-008

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

Re-review หลัง fix round 1 (REV-001) · clean session ไม่มี context ของ implementer · ไม่มี diff ตรวจจากไฟล์ปัจจุบัน · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\` · REV-002…009 → backlog แล้ว (round-1) ไม่เปิดซ้ำ

## Findings

### REV-010

- **Severity:** non-blocking (Minor) → backlog
- **Task:** SETUP-008
- **Location:** `.claude/agents/qa-engineer.md:27`
- **Problem:** prompt บอกให้ส่ง security gate เป็น entry ใน `questionsForHuman` แต่กำหนดแค่ข้อความ (ขึ้นต้นด้วย `🔒 Security gate` ตามด้วย phase และเหตุผล) ไม่ได้ระบุค่าของ field `gate`, `owner` และ `touchesSchemaOrContract` ตาม shape ใน data-model:163 ทั้งที่ router ใช้ `questionsForHuman[].gate` เลือก gate (DES-018 R12) ถ้า qa ใส่ `gate: "none"` หรือ id ผิด pipeline ยังหยุดรอคนเพราะ state เป็น `NEEDS_HUMAN` แต่ gate record อาจถูกบันทึกเป็น gate ผิดตัว ไม่ทำให้ AC ของ SETUP-008 ไม่ผ่าน เป็นงาน hardening ที่ควรทำคู่กับการที่ SA ตัดสินเรื่อง field เฉพาะ (ส่งให้ SA แล้ว)
- **Reference:** `design\data-model.md:163`, `:173` · DES-018 R12 (`des-018.md:32`) · ผู้ต้องแก้: `system-analyst` (กำหนด GateId ของ security gate หรือ field เฉพาะ) แล้วตามด้วย `setup` (prompt)

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-001 | blocking | `.claude/agents/qa-engineer.md:27` / `:46-47` | setup | resolved |
| REV-010 | non-blocking | `.claude/agents/qa-engineer.md:27` | system-analyst → setup | → backlog |

## Round 2

**Verdict:** PASS

- **REV-001 — closed (resolved):** ตอนนี้ข้อ 6 ที่บรรทัด 27 แยกโหมดแล้ว **Solo** ให้ใส่ marker บน phase ใน `plan\index.md` **Orchestrated** สั่ง "do not write `plan\index.md`" และให้รายงานผ่าน `questionsForHuman` (ข้อความขึ้นต้นด้วย `🔒 Security gate`) พร้อม state `NEEDS_HUMAN` ข้อความนี้สอดคล้องกับ `:46` (orchestrated ไม่เขียน `plan\index.md` และคืน `qa.perTask`) และ `:47` (solo เขียนเฉพาะ Status กับ `🔒 Security gate`) จึงไม่ขัดกันอีก ช่องทางรายงานก็มีจริง เพราะ `questionsForHuman` อยู่ใน handoff (data-model:163) และ `NEEDS_HUMAN` เป็น state ที่ใช้ได้กับ kind `qa` (`des-018.md:13`, `qa-engineer.md:52`) ส่วน "never remove one / never close a security finding" ยังอยู่ (`:27`) ความเสี่ยงที่ phase จะผ่านไปโดยไม่มี security review จึงไม่มีแล้ว การไม่มี field เฉพาะเป็น workaround ที่ driver ยอมรับและส่งให้ SA ตัดสินแล้ว ไม่นับเป็น finding ของรอบนี้
- **Regression check (qa-engineer.md ทั้งไฟล์):** ไม่พบข้อขัดกันใหม่ ยังมี clean session และไม่แก้ code (`:21`, AC-053) · ทั้ง `:46` และ description `:3` ยังบอกว่าใน orchestrated ไม่เขียน Status (AC-073) · ใช้ 4 state ของ qa (`:52`) · batch, shared checks ครั้งเดียว, QA-NNN และ Feature QA ยังอยู่ (`:31-33`) · ส่วน `:39` (REV-008) ไม่ได้เปลี่ยน ยังอยู่ใน backlog
- **SETUP-008 — PASS:** AC อื่นผ่านตั้งแต่ round 1 (ดู `round-1.md` § Round 1) รอบนี้ไม่ได้อ่าน prompt อีก 5 ไฟล์ซ้ำ เพราะ fix round แตะแค่ `qa-engineer.md`
- **ไม่ได้ review:** AC-006 และ AC-023 (ต้อง ls ซึ่งต้องห้าม เหมือน round 1) · prompt อีก 5 ไฟล์ที่ไม่ได้อ่านซ้ำ ถ้า fix round แก้ไฟล์เหล่านั้นด้วย ผลรอบนี้ไม่ครอบคลุม

## Reviewed

- `knowledge\agent-team\review\index.md`, `review\round-1.md`, `plan\setup-008.md`
- `design\data-model.md` (grep: OutputState/handoff/questionsForHuman/GateId), `design\des-018.md` (grep), `design\des-019.md` (grep)
- `code\.claude\agents\qa-engineer.md` (ทั้งไฟล์) · `code\templates\review-round.md`

## Change Log

- 2026-10-05 — Round 2 — PASS (SETUP-008 · REV-001 resolved · REV-010 → backlog)

Back-links: `plan\index.md` · `..\index.md`
