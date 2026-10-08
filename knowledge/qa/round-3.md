# agent-team — QA Round 3 — SETUP-009

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

โหมด solo · clean session (เจ้าของ jtrp98, 2026-10-06) · เทียบ Acceptance + Scope ของ `plan\setup-009.md` กับไฟล์จริง + DES-018/019/020 · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\` · review ล่าสุด `review\round-5.md` = PASS (SETUP-009 PASS)

## Open Issues

| ID | Task | Severity | path:line | Owner | Status |
|---|---|---|---|---|---|
| REV-015 | SETUP-009 | Minor | `templates/test-plan.md:1,3` | project-manager → setup | → backlog (คงตาม reviewer — ยืนยันรอบนี้: `<slug>` ยังอยู่ที่ `:1` และ `:3`) |
| REV-016 | SETUP-009 | Minor | `.claude/agents/test-planner.md:21` | setup | → backlog (คงตาม reviewer — "Trigger unchanged." ยังอยู่) |
| QA-002 | SETUP-008 | Minor | `.claude/agents/test-planner.md:38-40` | setup | resolved (ตรวจแล้วรอบนี้ — `:40` มี output state ชุด execution) |

ไม่มี Critical/Important · ไม่มี QA finding ใหม่ · REV-015/016 ไม่ทำให้ AC ล้ม (TP resolve ผ่านคอลัมน์ `ไฟล์` ของ index ตาม DES-020; trigger list ที่ `:21` ถูกต้อง)

## Round 3

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| typecheck | — (ไม่มีใน check commands) | not run |
| lint | — (ไม่มีใน check commands) | not run |
| build | — (tsx รันตรง ไม่มี build step) | not run |
| test | `npm test` ที่ `code\agent-team\` | pass — rc=0 · `tests 14 · pass 14 · fail 0` (duration 563.8 ms) |
| size | `wc -c` | `test-planner.md` 2967 B · `templates/test-plan.md` 1424 B |
| grep ห้ามพบ | `grep -nF` "more than one" / "input →" / "input ->" / "expected" / "slug" / "<slug>" ใน `test-planner.md` | ไม่พบทุกคำ (rc=1) |
| grep ต้องพบ | `grep -nF` "round-N.md" / "test-plan\index.md" / "Given / When / Then" / "REQ/AC" / "NEEDS_HUMAN" / "never run" | พบที่ `:33` / `:29,34` / `:23,29` / `:29,35` / `:40` / `:29` |

หมายเหตุ: test 14 ข้อเป็นของ BE-001/SETUP-001 (v1) — **ไม่ใช่หลักฐานของ AC prompt** · แสดงเพียงว่าไม่มี regression ในโค้ด · SETUP-009 ตรวจได้ระดับอ่าน/grep เท่านั้น

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-009 | verified | Acceptance ทุกข้อ ✅ ระดับเอกสาร ยกเว้น "ไม่มีไฟล์อื่นเปลี่ยน" → Unverified (ไม่มี diff; ไม่ใช่หลักฐานว่าล้ม) · พฤติกรรม agent จริง → Unverified |

### Acceptance ของ SETUP-009

| ข้อ | Result | หลักฐาน |
|---|---|---|
| สั่งมี `test-plan\index.md` ไม่มีเงื่อนไข "more than one file" | ✅ Verified | `test-planner.md:34-35` "Always create or update `test-plan\index.md` … even with a single file" · `:29` "Keep `test-plan\index.md`" · grep "more than one" rc=1 |
| ไม่พบ "input → expected" | ✅ Verified | grep "input →", "input ->", "expected" rc=1 |
| TP = Given/When/Then + REQ/AC (AC-059) | ✅ Verified | `:29` "one `TP-NNN` with **Given / When / Then** and the **REQ/AC**" ตรง `des-019.md:24` · ตาราง `\| TP \| Phase \| REQ/AC \| ไฟล์ \|` `:29,35` ตรง `des-019.md:24` และ `des-020.md:15` (resolve TP → `test-plan\round-N.md`) |
| ชื่อไฟล์ `round-N.md` ไม่พบ `<slug>.md` | ✅ Verified | `:33` `test-plan\round-N.md` ตรง `des-019.md:24` · grep "slug" rc=1 |
| §Handoff มี 5 state ของ kind execution ตรง DES-018 | ✅ Verified | `:40` DONE · BLOCKED · NEEDS_DESIGN_CHANGE · NEEDS_REQUIREMENT_CHANGE · NEEDS_HUMAN = `des-018.md:11` (test-planner อยู่ในแถว `execution`) ครบ 5 ไม่เกิน |
| รูป blocker (AC-068) | ✅ Verified | `:40` `blocker{type,task,reference,reason}` + `BLOCKED` เฉพาะ environment\|dependency\|access\|other = `des-018.md:16` · `reference` = DES/REQ/AC id สอดคล้อง R10/R11 (`des-018.md:30-31`) |
| ยังห้ามรัน check (AC-060) | ✅ Verified | `:4` tools `Read, Write, Edit, Glob, Grep` (ไม่มี Bash) · `:29` "never run checks, tests, or commands" · `:3` "never writes or runs tests" |
| ไม่มีไฟล์อื่นเปลี่ยน | ⚠️ Partial → Unverified | ไม่มี diff และ role ห้ามใช้ git/ls · `templates/test-plan.md` ยังมี `<slug>` (REV-015) = สอดคล้องกับ "ไม่ได้แก้ template" · ไม่พบหลักฐานว่ามีไฟล์อื่นเปลี่ยน |

### Scope ที่ต้องคง (จาก SETUP-008 verified)

| ข้อ | Result | หลักฐาน |
|---|---|---|
| trigger เดิม (OQ-16) | ✅ Verified | `:3` และ `:21` 5 trigger `cross-task`, `multi-system`, `migration`, `security`, `release` ไม่เปลี่ยน (คำว่า "Trigger unchanged." = REV-016 Minor) |
| ไม่แตะ Status · ไม่ใช้ git · ไม่ invoke role อื่น | ✅ Verified | `:40` "Never edit code or plan Status, run git, or invoke another role." |
| อ่านตามโครง split + งบ ≤ 10 KB | ✅ Verified | `:13-17` index-first · ห้าม ls/ข้ามหมวด · ไฟล์ละ ≤ 10 KB |

### Open findings ของ reviewer (ตาม `review\round-5.md:33-46`)

| ID | Result | หลักฐาน |
|---|---|---|
| REV-002 | ✅ resolved ยืนยัน | `:29,34-35` index ไม่มีเงื่อนไข + G/W/T |
| REV-014 | ✅ resolved ยืนยัน | `:33` `round-N.md` |
| REV-007 (ฝั่ง test-planner) | ✅ resolved ยืนยัน | `:40` · ฝั่ง `project-manager.md` = BL-024 นอก Scope |
| REV-015, REV-016 | ⚠️ Minor → backlog | ยืนยันว่ายังอยู่จริง ไม่กระทบ AC |
| REV-017 | — ไม่อยู่ใน scope | task SETUP-008 (ไม่ได้อ่าน `project-manager.md`) |

### Data Model check

ไม่มี entity code · shape ใน prompt เทียบ DES-018 ทีละ field: OutputState kind `execution` (`:40` ↔ `des-018.md:11`) 5 ค่าตรง · Blocker `type,task,reference,reason` (`:40` ↔ `des-018.md:16`) ตรง · `design\data-model.md` ไม่อยู่ในรายการให้อ่านของ brief รอบนี้ — เทียบผ่าน DES-018 ที่ round-2 ยืนยันแล้วว่าตรง `data-model.md:154,156` · ไม่พบ divergence

### Issues Found

ไม่มี QA finding ใหม่

## Backlog (Minor — ไม่ขวาง)

- REV-015 (template `<slug>` — PM เปิด task → setup), REV-016 (ตัด "Trigger unchanged." — setup), REV-017 (SETUP-008) — ตามที่ reviewer ส่ง · ส่งให้ PM append `backlog.md`

## ข้อสังเกต

- Depends: SETUP-008 = `verified` (`plan\index.md:47`) ✅
- ตัวนับรอบ SETUP-009: review FAIL 0 · QA รอบแรกของ task นี้ → ✅
- sync `test-planner.md` ไป sta2 = driver (นอก scope · ไม่ได้ตรวจ)

## Unverified Behaviour — undeployed phases

- Phase 2 (SETUP-009): "ไม่มีไฟล์อื่นเปลี่ยน" — ต้องใช้ git diff/status (role ห้าม) → driver/คนยืนยัน
- Phase 2/6/7: agent test-planner ทำตาม prompt จริง — สร้าง `test-plan\index.md` ทุกครั้ง, ตั้งชื่อ `round-N.md` (เสี่ยงทำตาม template `<slug>` — REV-015), TP เป็น G/W/T + REQ/AC, ไม่รัน check, จบด้วย output state ที่ถูกต้อง — พิสูจน์ได้เมื่อรันจริงใน QA-001 (module ทดสอบมี test-planner + TP — AC-059/061) และ QA-002 (4 agents)
- Phase 3: orchestrator resolve `TP-NNN` ผ่าน `test-plan\index.md` (AC-048, DES-020) และ router R10/R11/R14 รับ output state ของ test-planner — BE-019/BE-020/BE-021
- คงจาก round-2: AC-006 (12 ไฟล์ prompt จริง) และ AC-023 (ไม่มีสำเนาใน `AGENTS.md`/sta2) — ต้อง ls/อ่านนอกรายการ · agent ทำตาม prompt ทั้ง 4 camp (QA-002) · orchestrator บังคับ handoff (R15, R23, Status single-writer, AC-007) — BE-006/008/019/021/022 · validator v2 อ่าน template — BE-018

## Change Log

- 2026-10-06 — Round 3 — SETUP-009 ✅ Verified (qa:QA-002 resolved · REV-015/016 Minor → backlog · ไม่มี finding ใหม่)

Back-links: `plan\index.md` · `..\index.md`
