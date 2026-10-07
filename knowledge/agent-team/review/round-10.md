# agent-team — Review Round 10 — SETUP-004

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

ตรวจจาก artifact จริง ณ 2026-10-06 — SETUP-004 (fork pack มาที่ `code\` — packRoot) build ไปแล้วตาม spec เดิม (ย้ายเข้า `code\` บนดิสก์ 2026-10-05 — design Rev 8) และยังไม่เคยผ่าน review · **ไม่ตัดสินซ้ำเนื้อหา Rev 10/11/12 ของ pack** (SETUP-007 templates/policies/CLAUDE.md + SETUP-008 role prompts v2 — ผ่าน review รอบ 1–5) · session นี้ไม่มี shell และไม่รัน git (no state-changing git) — evidence ด้าน git ใช้ของ driver ตาม brief

## Findings

### REV-029

- **Severity:** Minor → backlog
- **Task:** SETUP-004
- **Location:** `code\.claude\agents\setup.md:22`
- **Problem:** "**Pack files** ที่ราก" — คำ "ราก" คือตำแหน่งเดิมก่อนย้าย pack (fork จาก sta2 ซึ่ง pack อยู่ราก repo) ปัจจุบัน packRoot = `code\` แล้ว ผู้อ่านที่ลงมือตามคำนี้ตรง ๆ อาจไปหา pack ที่ราก repo ซึ่งไม่มีไฟล์เหล่านั้น · รายชื่อไฟล์ที่ยกมายังชี้เป้าได้ และ setup อ่าน `CLAUDE.md` (packRoot ระบุชัด) ก่อนเสมอ จึงไม่ขวาง AC ของ SETUP-004
- **Reference:** DES-003 (packRoot = `code\`), DES-006 (setup allow = pack ที่ `code\`) · ผู้ต้องแก้: `setup` (แก้เป็น "pack ที่ `code\` (packRoot)" เมื่อมีงาน pack ถัดไป)

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-024 | Minor | `qa\index.md:8-12` | qa-engineer | resolved (qa-engineer เพิ่มแถว round 3 ใน `qa\index.md` — ยืนยันใน qa round 5) |
| REV-023 | Minor | `src/core/knowledge-paths.ts:74` | system-analyst → setup, backend-engineer | → backlog |
| REV-025 | Minor | `requirement\req-006.md:1` ฯลฯ | business-analyst | → backlog |
| REV-026 | Minor | `review\round-1.md:1` ฯลฯ | reviewer / qa-engineer | → backlog |
| REV-027 | Minor | `review\round-7.md:1` | reviewer | → backlog |
| REV-028 | Minor | `src/main.ts:2` · `package.json:5` | backend-engineer | → backlog |
| REV-029 | Minor | `code\.claude\agents\setup.md:22` | setup | → backlog |

## Round 10

**Verdict:** PASS

| Task | Verdict |
|---|---|
| SETUP-004 | PASS |

- **grep ไม่พบ path แบบเก่า (AC)** — Grep `requirement\.md|design-archive\.md|open-questions\.md` และ `\bplan\.md|\bqa\.md|\breview\.md|\btest-plan\.md|\bdesign\.md\b` บน `.claude\`, `policies\`, `templates\` = match เดียวคือ `templates\test-plan.md` (`test-planner.md:33`) เป็นชื่อไฟล์ template ถูกต้อง
- **agents ครบ 12 (AC)** — Glob `.claude\agents\*.md` = 12 ไฟล์ ชื่อครบตาม REQ-003 (business-analyst, system-analyst, project-manager, test-planner, uxui-designer, setup, backend-engineer, frontend-engineer, reviewer, qa-engineer, security, devops)
- **โครง split ครบ** — `CLAUDE.md:23-42` (โครง + index-first + Status ที่ index) · `policies\documentation.md` §1 (โครง + ตาราง writer ต่อไฟล์ย่อย) · role prompt ทั้ง 12 มีหัว "อ่าน/เขียนตามโครง split (DES-014)" + ห้าม ls/ห้ามอ่านข้ามหมวด
- **path ต่อ role ตรง DES-006** — BA (requirement\, open-questions\, module index) · SA (design\) · PM (plan\ + backlog — แถวใหม่ `pending` เท่านั้น) · test-planner (test-plan\ + index TP) · uxui (uxui\) · setup (skeleton + pack ตาม task) · BE/FE (เขียนได้เฉพาะ `code\**` — ห้ามแตะ knowledge\ ฝั่งเขียน) · reviewer (review\round-N.md, REV structured) · qa (qa\ + Status ตามโหมด) · security (security.md ไฟล์เดียว) · devops (deploy.md + infra ใน code\) — ยกเว้นคำ "ที่ราก" ของ setup → review:REV-029
- **status-at-index** — PM `project-manager.md:40-41,45-46` · qa `qa-engineer.md:46-49` (orchestrated ไม่เขียน `plan\index.md` / solo เขียนคอลัมน์เดียว — ตรง OQ-14/DES-006) · `CLAUDE.md:41-42` · `documentation.md:62` · templates plan-index (ตาราง 6 คอลัมน์) / plan-task (8 หัวข้อ ไม่มี Status) ตรงรูป v2
- **readSections เป็น path** — `documentation.md` §5 · `CLAUDE.md:39-42,119` · `AGENTS.md:10` · ทุก role prompt
- **policies §1/§4/§5** — §1 split + writer table · §4 budget ต่อไฟล์ย่อย + สูตร `budget(index)` + two-way rule · §5 path list + index-first ✓
- **templates ต่อไฟล์ย่อย** — 17 template ครบ: requirement-index/scope/req · design-index/des/data-model · plan-index/task · test-plan · oq/oq-index · review-round · qa-round · ux-artifact · security · deploy · backlog ✓ (เนื้อหา v2 = SETUP-007 — ผ่านแล้ว ไม่ตัดสินซ้ำ)
- **AGENTS.md จุดเข้า codex/agy** — stub ชี้ `CLAUDE.md` + agents + กติกา split (คู่มือ solo เต็ม = SETUP-003 ตามแผน)
- **ไม่มีไฟล์ sta2 ถูกแก้ (AC)** — evidence driver: `git status` ณ ราก rong-ngang แสดงไฟล์แก้ไขเฉพาะใต้ `code\` และ `knowledge\agent-team\` (reviewer ไม่รัน git — อ้าง evidence ตาม brief)
- ประเด็นนอก scope นี้: `documentation.md:63` (🔒 เขียนโดย qa-engineer — ไม่แยกโหมด) อยู่ task อื่น (SETUP-007 — ผ่าน review รอบ 1–5 แล้ว)

**ไม่ได้ review:** เนื้อหา Rev 10+ ของ pack (SETUP-007/008 — ผ่านแล้ว รอบ 1–5) · เนื้อหา `code\sta-config.json` (SETUP-005) · git เอง (ใช้ evidence driver) · `code\agent-team\` โค้ด orchestrator (task BE-* — ผ่านแล้ว รอบ 6–8)

## Reviewed

- `plan\setup-004.md` · `design\index.md` · `design\des-003.md` · `design\des-006.md` · `design\des-011.md` · `design\des-014.md` · `requirement\req-003.md` · `requirement\req-008.md`
- `code\CLAUDE.md` · `code\AGENTS.md` · `code\.claude\agents\*.md` (12 ไฟล์อ่านครบ)
- `code\policies\documentation.md` · `code\templates\` 17 ไฟล์ (Glob ครบ · อ่านเนื้อหา: review-round, plan-index, plan-task)
- `review\index.md` · `review\round-9.md` · `review\round-7.md` (เฉพาะ REV-024)

## Change Log

- 2026-10-06 — Round 10 — SETUP-004 PASS · REV-024 resolved (qa-engineer เพิ่มแถว round 3 ใน `qa\index.md` — ยืนยันใน qa round 5) · เพิ่ม REV-029 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
