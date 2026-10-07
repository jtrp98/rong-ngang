# agent-team — QA Round 1 — SETUP-007

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

โหมด solo · clean session · เทียบ Acceptance ของ `plan\setup-007.md` + DES-014 · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\`

## Open Issues

| ID | Task | Severity | path:line | Owner | Status |
|---|---|---|---|---|---|
| QA-001 | SETUP-007 | Minor | `CLAUDE.md:16` | setup | → backlog |

ไม่มี Critical/Important · finding เปิดของ reviewer ที่เป็นของ SETUP-007 (REV-003…006) ทั้งหมด non-blocking → backlog — ไม่ขวาง AC (ตรวจซ้ำแล้ว ข้อ "Open findings" ด้านล่าง)

## Round 1

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| typecheck | — (ไม่มี script แยกใน check commands) | not run |
| lint | — (ไม่มีใน check commands) | not run |
| build | — (tsx รันตรง ไม่มี build step) | not run |
| test | `npm test` ที่ `code\agent-team\` | pass — `tests 14 · pass 14 · fail 0` (duration 4054 ms) |
| size | `wc -c` templates/policy/CLAUDE.md | plan-index 2207 · plan-task 1299 · test-plan 1424 · review-round 1356 · qa-round 1989 · documentation.md 10185 · CLAUDE.md 11770 bytes |
| grep AC-023 | `grep -E "You own the\|Read first:\|never rubber-stamp\|Keep the release moving\|You are (the\|a) "` ใน 5 templates + policy + CLAUDE.md | ไม่พบ (match เดียว = หัวข้อ `## Handoff` ของ `plan-task.md:37` ซึ่งเป็นหัวข้อตาม DES-014 ไม่ใช่เนื้อหา prompt) |
| grep AC-038 | `grep -n "Status:" templates/plan-task.md` | ไม่พบ (rc=1) |

หมายเหตุ: test 14 ข้อเป็นของ BE-001/SETUP-001 (validator v1) — ไม่ครอบรูป v2 (BE-018 ยังไม่ build) · ไม่ใช่หลักฐานของ AC v2

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-007 | verified | ดูตาราง AC ด้านล่าง |

### AC ของ SETUP-007

| AC | Result | หลักฐาน |
|---|---|---|
| AC-038 — `plan-task.md` 8 หัวข้อ ไม่มี Status | ✅ Verified | `templates/plan-task.md:5,9,13,21,25,29,33,37` = Goal/References/Scope/Out of Scope/Expected Output/Acceptance/Dependencies/Handoff ตรงลำดับ DES-014 · ไม่มี `Status:` · `:3` ระบุ Status/Owner/Phase/Depends อยู่ที่ index · บรรทัดเครื่องอ่าน `:17-19` (Write paths / Security-sensitive / Session group) |
| AC-036 — `plan-index.md` 6 คอลัมน์ | ✅ Verified | `templates/plan-index.md:26` = `\| Task \| Name \| Owner \| Phase \| Depends \| Status \|` ตรงตัว DES-014 · `:3` ผู้เขียน Status ตามโหมด (PM แถวใหม่ pending · orchestrated = orchestrator · solo = qa-engineer) + ค่า 3 ค่า + Depends แหล่งเดียว |
| AC-059 — TP template | ✅ Verified | `templates/test-plan.md:21-27` TP-001 + REQ/AC + Given/When/Then · `:3` ตาราง index `\| TP \| Phase \| REQ/AC \| ไฟล์ \|` ตรง DES-014 |
| AC-050 — REV template | ✅ Verified | `templates/review-round.md:9-15` REV-NNN + Severity/Task/Location/Problem/Reference · `:19` Verdict PASS\|FAIL · `:7` ตาราง index `\| ID \| Task \| Severity \| ไฟล์ \|` |
| AC-055 — QA defect packet | ✅ Verified | `templates/qa-round.md:39-45` QA-NNN + Task/Severity/Expected/Actual/Reproduce (TP-NNN)/Evidence · `:5` ตาราง index finding |
| AC-058 — Feature QA flows | ✅ Verified | `templates/qa-round.md:27-31` Flow + อ้าง TP หรือ REQ/AC + Result ต่อ flow · perTask verified/blocked `:21-25` |
| AC-073 — ไม่เหลือ "Status = qa-engineer เท่านั้น" แบบไม่แยกโหมด | ✅ Verified | `policies/documentation.md:39` (§1 writer `plan\index.md` 6 คอลัมน์ + ชี้ §3) · `:62` (§3 แยก orchestrated/solo) · `CLAUDE.md:42,50,57,61,114` แยกโหมดครบ · grep `qa-engineer.{0,20}(เท่านั้น\|only)` ใน policy+CLAUDE.md เจอเฉพาะ `:62` ซึ่งแยกโหมดแล้ว |
| AC-023 — ไม่มีสำเนาเนื้อหา role prompt | ✅ Verified | grep ข้างบนไม่พบ · `CLAUDE.md:126` ชี้ `.claude/agents/*.md` เป็นแหล่งเดียว |
| AC-021 — สองโหมดใช้รูปเดียวกัน | ✅ Verified (ระดับเอกสาร) | pack ชุดเดียว (`CLAUDE.md:7,125`) · template ไม่มีกิ่งต่อโหมด ยกเว้นผู้เขียน Status · การสลับโหมดจริง → Unverified |
| AC-007 — สิทธิ์เขียนต่อ role | ✅ Verified (ระดับเอกสาร) | `policies/documentation.md:28-47` ตาราง writer · `CLAUDE.md:46-59` · การบังคับจริงข้าม camp → Unverified |
| Scope: CLAUDE.md ข้อยกเว้น orchestrated ก–ง + solo serial | ✅ Verified | `CLAUDE.md:61` (ก–ง ครบ + "solo mode คง serial") |
| Scope: Write paths ไม่เกิน `templates/**`, `policies/documentation.md`, `CLAUDE.md` | ⚠️ ตรวจไม่ได้เต็ม | ไม่มี diff/git ให้ใช้ (ห้าม state-changing git; ไม่ได้ ls) — ตรวจได้เฉพาะไฟล์ที่ระบุว่าเนื้อหาตรง scope · reviewer รายงานเหมือนกัน (`review\round-1.md:101`) |

### Open findings ของ reviewer (SETUP-007)

| ID | Result | หลักฐาน |
|---|---|---|
| REV-003 (review-round ไม่มี `## Open Findings`/verdict ต่อ task) | ⚠️ ยืนยันจริง · Minor → backlog | `templates/review-round.md:17-21` มีแค่ verdict ระดับ round · ไม่ขัด AC-050 (field ครบ) |
| REV-004 (qa-round ไม่มี `## Open Issues`/หัว Feature QA) | ⚠️ ยืนยันจริง · Minor → backlog | `templates/qa-round.md:37` `### Issues Found` · ไม่มีรูปหัว `Feature QA — Phase <n>` · AC-058 ยังผ่าน (ตาราง flow มี) — รอบนี้เพิ่ม `## Open Issues` เองตาม role prompt |
| REV-005 (mapping blocking ↔ Critical/Important) | ⚠️ ยืนยันจริง · Minor → backlog (owner system-analyst) | `templates/review-round.md:11` |
| REV-006 (HTML comment ในบรรทัด Session group) | ⚠️ ยืนยันจริง · Minor → backlog | `templates/plan-task.md:19` `- Session group: <id> <!-- optional -->` |

### Data Model check

ไม่เกี่ยว — SETUP-007 แก้เฉพาะ template/policy/CLAUDE.md ไม่มี entity/schema code · DES-014 ระบุ "ไม่มี schema ใหม่" (`design\des-014.md:46`) · ไม่ได้เปิด `design\data-model.md` ตามขอบเขต brief

### Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

#### QA-001

- **Task:** SETUP-007 · **Severity:** Minor (→ backlog)
- **Expected:** แถว Stack ใน `CLAUDE.md` ของ pack ตรงกับ plan v2 ปัจจุบัน (task BE-001…015, BE-018…023)
- **Actual:** `CLAUDE.md:16` ยังเขียน "see `knowledge\agent-team\plan\` tasks BE-001…015" — ไม่รวม BE-018…023 และยังนับ BE-016/017 ที่ย้าย backlog แล้ว
- **Reproduce:** เปิด `code\CLAUDE.md` บรรทัด 16 เทียบ `plan\index.md` §Release Scope บรรทัด 9
- **Evidence:** `CLAUDE.md:16` · `plan\index.md:9` — ไม่กระทบ AC ใดของ SETUP-007

## Backlog (Minor — ไม่ขวาง)

- QA-001 (owner setup) · REV-003, REV-004, REV-006 (owner setup) · REV-005 (owner system-analyst) — ส่งให้ PM append `backlog.md`

## ข้อสังเกต

- Depends SETUP-004 (`plan\index.md:43`) ยัง `pending` แต่ pack มีจริงที่ `code\` (`CLAUDE.md:7`; `plan\index.md:78`) — ไม่ใช่เหตุ blocked · SETUP-004 ยังต้องผ่าน QA ของตัวเอง
- driver ตัดสินเรื่อง sync pack ไป sta2 (`setup-007.md` §Handoff) — QA ไม่ได้ตรวจฝั่ง sta2

## Unverified Behaviour — undeployed phases

- Phase 1/2: parser/validator v2 อ่าน template ชุดนี้ได้ (header 6 คอลัมน์, task file มี `Status:` → issue, บรรทัด `Write paths`/`Security-sensitive`/`Session group`) — เป็นงาน BE-018 ยังไม่ build · test ปัจจุบันเป็น v1
- Phase 2/6: สลับ solo ↔ orchestrated บน knowledge เดียวกัน (AC-021) — ตรวจได้เฉพาะระดับเอกสาร · รันจริงใน QA-002
- Phase 3: การบังคับสิทธิ์เขียน/Status single-writer จริง (AC-007, AC-073 ฝั่ง orchestrated) — BE-008/BE-022
- ขอบเขต Write paths ของ SETUP-007 — ไม่มี diff ให้เทียบ

## Change Log

- 2026-10-05 — Round 1 — SETUP-007 ✅ Verified (QA-001 Minor → backlog)

Back-links: `plan\index.md` · `..\index.md`
