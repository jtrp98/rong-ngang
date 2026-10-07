# agent-team — QA Round 8 — SETUP-004

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| review:REV-029 | SETUP-004 | Minor | → backlog (owner: `setup` — จดที่ review\round-10.md · round นี้อ้าง Back-links ไม่จดซ้ำ) |

## Round 8

**Status:** ✅ Verified

Review round 10 ให้ PASS แล้ว — รอบนี้ `qa-engineer` รันเช็คซ้ำด้วย shell ตัวเองทุกข้อ (ไม่เชื่อ evidence ส่งต่อ) · ผลตรงกับ review ทุกข้อ

### Checks run

| Check | Command | Result |
|---|---|---|
| agents ครบ 12 (AC) | `ls code/.claude/agents/` + count `.md` | pass — 12 ไฟล์ตรงรายชื่อ AGENTS.md: business-analyst, system-analyst, project-manager, test-planner, uxui-designer, setup, backend-engineer, frontend-engineer, reviewer, qa-engineer, security, devops |
| grep path แบบเก่า (AC) | `grep -rnE "requirement\.md\|\bplan\.md\|\bqa\.md\|\breview\.md\|\bdesign\.md\b\|open-questions\.md\|design-archive\.md" code/.claude code/policies code/templates` | pass — match เดียว `test-planner.md:33` อ้าง `templates\test-plan.md` = ชื่อไฟล์ template ที่ยกเว้น · ไม่พบ path เดี่ยวแบบเก่า |
| packRoot + config (brief) | Read `code\CLAUDE.md` + `ls code/` | pass — `CLAUDE.md:7` packRoot = `code\` · `CLAUDE.md:21` ระบบไม่ hard-code — knowledge/target ผูกที่ `code\sta-config.json` · `sta-config.json` มีจริงที่ code root |
| จุดเข้า codex/agy (brief) | Read `code\AGENTS.md` | pass — stub ชี้ `CLAUDE.md` + role prompt 12 บทบาท + กติกา split/index-first · คู่มือ solo เต็ม = SETUP-003 ตามแผน |
| ไม่มีไฟล์ sta2 ถูกแก้ (AC) | `git -C C:\src\AICode\rong-ngang status --porcelain` (read-only) | pass — ทุก path (M/A/D/??) อยู่ใต้ `code/` หรือ `knowledge/agent-team/` เท่านั้น |
| project check | `npm test` ที่ `code\agent-team\` | pass — tests 43 · pass 43 · fail 0 |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-004 | verified | AC ทั้ง 3 ผ่านด้วยผลรันของรอบนี้ (Checks run แถว 1, 2, 5) · CLAUDE.md/AGENTS.md ตรง Goal (แถว 3, 4) · Status ใน `plan\index.md` `pending → verified` |

### Feature QA flows

n/a — รอบนี้ไม่ใช่ Feature QA (phase 2 ยังไม่ verified ครบ — SETUP-003/005 ค้าง)

### Data Model check

n/a — SETUP-004 เป็นงาน markdown pack (`CLAUDE.md`, `AGENTS.md`, `.claude\agents\`, `policies\`, `templates\`) ไม่มี entity/schema ให้เทียบ

### Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

ไม่มี QA finding ใหม่ — ไม่เปิด QA-004 · spot-check `code\.claude\agents\setup.md:22` ("**Pack files** ที่ราก") พบตรงตาม review:REV-029 — ไม่ขวาง AC ใด (รายชื่อไฟล์ยังชี้เป้าได้ + setup อ่าน `CLAUDE.md` ซึ่งระบุ packRoot ก่อนเสมอ) · Minor → backlog คงตาม review round 10

## Unverified Behaviour — undeployed phases

- ยังไม่มี phase ใด deployed (ทั้ง release เป็นการ build) · การ "เปิด session ที่ `code\` (packRoot) เห็น agents ครบ 12" รอบนี้ยืนยันด้วยโครงไฟล์จริง (`ls`) + เนื้อหา `CLAUDE.md`/`AGENTS.md` ไม่ได้วิ่ง session codex/antigravity จริง — การวิ่ง session จริงเป็นของ SETUP-003 (จุดเข้า) และ QA-002 (solo 4 agents) ตามแผน

## Change Log

- 2026-10-06 — Round 8 — SETUP-004 ✅ Verified · รันเช็คซ้ำเองครบ ตรง review round 10 · sync Status `pending → verified` · ไม่มี QA finding ใหม่ · review:REV-029 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
