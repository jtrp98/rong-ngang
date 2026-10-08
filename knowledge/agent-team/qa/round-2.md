# agent-team — QA Round 2 — SETUP-008

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

โหมด solo · clean session · เทียบ Acceptance + Scope ของ `plan\setup-008.md` กับไฟล์จริง + DES-018/019/020 + `design\data-model.md` §PacketV2/HandoffV2 · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\` · review ล่าสุด `review\round-4.md` = PASS

## Open Issues

| ID | Task | Severity | path:line | Owner | Status |
|---|---|---|---|---|---|
| QA-002 | SETUP-008 | Minor | `.claude/agents/test-planner.md:38-40` | setup | → backlog |
| QA-001 | SETUP-007 | Minor | `CLAUDE.md:16` | setup | resolved (ตรวจแล้วรอบนี้) |

ไม่มี Critical/Important · REV ที่ค้างเป็น Minor → backlog ไม่ทำให้ AC ล้ม

## Round 2

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| typecheck | — (ไม่มีใน check commands) | not run |
| lint | — (ไม่มีใน check commands) | not run |
| build | — (tsx รันตรง ไม่มี build step) | not run |
| test | `npm test` ที่ `code\agent-team\` | pass — rc=0 · `tests 14 · pass 14 · fail 0` (duration 4012 ms) |
| size | `wc -c` | qa 6293 · rev 4135 · pm 4319 · be 3587 · fe 3453 · tp 2617 · tpl review/qa/task 1983/2525/1281 · CLAUDE.md 11819 B |
| grep AC-023 | `grep -nE "You own the\|Read first:\|never rubber-stamp\|Keep the release moving\|You implement \*\*\|You define \*\*shared" templates/*.md CLAUDE.md` | ไม่พบ (rc=1) |
| grep AC-006 | นับแถว role ในตาราง Roles ของ `CLAUDE.md` | 12 · `CLAUDE.md:3` "twelve role prompts" · `:126` แหล่งเดียว `.claude/agents/*.md` |
| grep AC-073 | `grep -nE "qa-engineer.{0,25}(only\|เท่านั้น)"` ใน 6 prompts | match เดียว `project-manager.md:45` — แยกโหมดแล้ว (solo qa เขียน · orchestrated orchestrator คัด) |

หมายเหตุ: test 14 ข้อเป็นของ BE-001/SETUP-001 (v1) ไม่ใช่หลักฐานของ prompt — SETUP-008 ตรวจได้ระดับอ่าน/grep

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-008 | verified | ทุกข้อใน Acceptance ✅ ระดับเอกสาร (ตารางด้านล่าง) · พฤติกรรม runtime → Unverified |

### AC / Scope ของ SETUP-008

| ข้อ | Result | หลักฐาน |
|---|---|---|
| qa: Status ตามโหมด · AC-073 ไม่สั่งเขียน Status ใน orchestrated | ✅ Verified | `qa-engineer.md:46-49` (orchestrated "do not write `plan\index.md`" คืน `qa.perTask` · solo เขียนเฉพาะ Status · โหมดไม่ชัด → ถาม) · `:27` 🔒 orchestrated ส่ง `securityGate` ไม่เขียน plan · `:33` anchor แยกโหมด |
| qa: batch + shared checks ครั้งเดียว + QA-NNN + Feature QA | ✅ Verified | `:31` check ครั้งเดียว/รอบ · command ซ้ำ = invalid (ตรง `des-019.md:17`) · `:32` QA-NNN ครบ field ตรง `data-model.md:158-159` · `:33-34` Feature QA flows (flow/ref/result ตรง `data-model.md:168`) |
| reviewer: clean session · ไม่แก้ implementation · PASS/FAIL + REV-NNN ครบ field (AC-049, AC-050) | ✅ Verified | `reviewer.md:19-21` · `:40` id/severity/task/location/problem/reference ตรง `data-model.md:157` · `:42` verdict · `:35` FAIL ⇔ Critical/Important ตรง `des-018.md:47` |
| QA clean session + ไม่แก้ code (AC-053) | ✅ Verified | `qa-engineer.md:21` (session ต่างจาก implementer/reviewer · "never fix or edit application code") · `:53` |
| PM: ตาราง v2 + Depends ใน index · 8 หัวข้อไม่มี Status · Write paths/Security-sensitive/Session group · phase = user flow · ไม่บอก implementation · `impactedTasks` (AC-038) | ✅ Verified | `project-manager.md:39` (8 หัวข้อตรง `templates/plan-task.md:5-37` · ไม่มี Status/Owner/Phase/Depends) · `:40` 6 คอลัมน์ · `:23` · `:41` impactedTasks ตรง `data-model.md:164` · PM ไม่เขียน verified/blocked `:44-45` |
| engineers: 7 output states + รูป blocker (AC-062, AC-068) · ไม่แก้ design/req · เขียนเฉพาะ Write paths | ✅ Verified | `backend-engineer.md:41` / `frontend-engineer.md:45` — 5 สถานะ execution + อ้างชุด 7 ค่า ตรง `des-018.md:11` และ `data-model.md:154` · Task/Reference/Reason ตรง `Blocker` `data-model.md:156` และ `des-018.md:16` (BLOCKED เฉพาะ environment/dependency/access/other) · `:45`/`:49` ห้ามแตะ module docs/Status |
| test-planner: TP-NNN G/W/T + REQ/AC · ไม่รัน check (AC-060) · trigger เดิม (OQ-16) | ✅ Verified | `test-planner.md:29` · `:4` tools ไม่มี Bash · `:21` trigger 5 ชนิดคงเดิม · ตาราง `\| TP \| Phase \| REQ/AC \| ไฟล์ \|` ตรง `des-019.md:23` |
| AC-006 ครบ 12 role | ⚠️ Partial (ระดับเอกสาร) | `CLAUDE.md` Roles 12 แถว · เปิดได้ 6/12 prompt — นับไฟล์จริงต้อง ls → Unverified (ไม่มีหลักฐานว่าขาด) |
| AC-023 ไม่มีสำเนา prompt ที่อื่น | ⚠️ Partial (ระดับเอกสาร) | grep templates + CLAUDE.md rc=1 · `AGENTS.md`/sta2 นอกรายการอ่าน → Unverified |
| follow-up Rev 11: templates อ้าง id ชน (`qa:`/`review:`/`test-plan:`) | ✅ Verified | `templates/qa-round.md:7` · `templates/review-round.md:32` · prompts `qa-engineer.md:32`, `reviewer.md:43`, `project-manager.md:26` ตรง `des-020.md:50` |

### Open findings ของ reviewer (SETUP-008, ตาม `review\round-4.md:13-22`)

| ID | Result | หลักฐาน |
|---|---|---|
| REV-011 | ✅ resolved ยืนยัน | grep "never use `gate: \"none\"`" ใน `qa-engineer.md` ไม่พบ · `:27` จบที่ shape `questionsForHuman` ตรง `data-model.md:163` |
| REV-002, 007, 008, 009, 012, 013, 014 | ⚠️ Minor → backlog (คงตาม reviewer) | ไม่มีข้อใดกระทบ AC ในตารางข้างบน · REV-008 (`qa-engineer.md:40`) อ่านได้เป็นการแจ้งคน ไม่ขัด AC-073 |

### Data Model check

ไม่มี entity code · shape ใน prompt เทียบ `data-model.md` ทีละ field: securityGate (`qa-engineer.md:27`↔`:170`) · questionsForHuman (↔`:163`) · qa.perTask (`:47`↔`:167`) · QaDefect (`:32`↔`:158-159`) · ReviewFinding (`reviewer.md:40`↔`:157`) · Blocker (↔`:156`) · OutputState (↔`:154`) — ไม่พบ divergence

### Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

#### QA-002

- **Task:** SETUP-008 · **Severity:** Minor (→ backlog)
- **Expected:** test-planner อยู่ใน session kind `execution` (`des-018.md:11`) → prompt ระบุ output state (DONE/BLOCKED/NEEDS_DESIGN_CHANGE/NEEDS_REQUIREMENT_CHANGE/NEEDS_HUMAN) เหมือน engineer
- **Actual:** `test-planner.md:38-40` §Handoff มีแค่ "Trigger, coverage, gaps, next owner" ไม่ระบุ output state ชุดใด
- **Reproduce:** null · เปิด `test-planner.md:38-40` เทียบ `des-018.md:11`
- **Evidence:** `test-planner.md:38-40` · นอก Scope SETUP-008 → ไม่ขวาง AC

## Backlog (Minor — ไม่ขวาง)

- qa:QA-002 (owner setup) — ส่งให้ PM append `backlog.md` · REV-002/007/008/009/012/013/014 ตามที่ reviewer ส่งแล้ว

## ข้อสังเกต

- Depends: SETUP-007 = `verified` (`plan\index.md:44`) · SETUP-004 ยัง `pending` (`:43`) แต่ pack มีจริงที่ `code\` — ไม่ใช่เหตุ blocked · SETUP-004 ยังต้องผ่าน QA ของตัวเอง
- follow-up Rev 11 แก้ templates 3 ไฟล์ + `CLAUDE.md` นอก Write paths (`setup-008.md:21`) — PM ควร amend ให้ตรง (ไม่ขวาง AC)
- ตัวนับรอบ SETUP-008: FAIL 2 (review 1, 3) · รอบนี้ PASS · sync ไป sta2 = driver ตัดสิน (ไม่ได้ตรวจ)

## Unverified Behaviour — undeployed phases

- Phase 2: AC-006 จำนวนไฟล์ prompt จริง 12 ไฟล์ และ AC-023 ไม่มีสำเนาใน `AGENTS.md`/sta2/ที่อื่น — ต้อง ls/อ่านนอกรายการ
- Phase 2/6: agent ทำตาม prompt จริง (clean session, ไม่แก้ code, ไม่รัน check, เขียน Status ตามโหมด) ทั้ง 4 camp — รันจริงใน QA-002
- Phase 3: orchestrator บังคับ handoff (R15, R23, Status single-writer, สิทธิ์เขียน AC-007) — BE-006/008/019/021/022
- Phase 1/2 (จาก round-1): validator v2 อ่าน template — BE-018 · Write paths SETUP-008 ไม่มี diff เทียบ

## Change Log

- 2026-10-06 — Round 2 — SETUP-008 ✅ Verified (qa:QA-002 Minor → backlog · qa:QA-001 resolved)

Back-links: `plan\index.md` · `..\index.md`
