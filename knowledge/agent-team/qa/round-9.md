# agent-team — QA Round 9 — SETUP-003

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|

ไม่มี QA finding ค้าง (qa:QA-001/002/003 resolved ทั้งหมด — ดู `qa\index.md`) · review:REV-030 Minor → backlog ไม่ block — ดูหัวข้อด้านล่าง

## Round 9

**Status:** ✅ Verified

ตรวจ artifact จริง ณ 2026-10-06 — SETUP-003 (จุดเข้า solo mode 4 agents + คู่มือ — DES-013): `code\AGENTS.md` · รันเช็คด้วย shell ของ QA เองทุกข้อ (รวม git/backup ที่ review round 11 ยังอ้าง evidence ของ engineer — ยืนยันซ้ำได้แล้ว)

### Checks run

| Check | Command | Result |
|---|---|---|
| AC-023 ไม่คัดลอกเนื้อหา role prompt | bash loop: ทุกบรรทัด ≥ 60 ตัวอักษรจาก `code\.claude\agents\*.md` (12 ไฟล์) → `grep -qF` บน `code\AGENTS.md` | pass — tested 213 วลี / hits 0 (เกินเกณฑ์ brief ≥ 20 วลี) |
| AC-024 ครอบ 4 agents | อ่าน `code\AGENTS.md:13-18` เทียบ des-013.md:9-14 | pass — claude/zcode/codex/antigravity ครบ วิธีเปิด + สถานะยืนยัน/inferred ตรง design |
| ประกาศ solo | `grep -n -e serial -e OQ-14 -e OQ-17 -e "post-run audit" -e AC-02 AGENTS.md` | pass — serial (:35,:42) · qa-engineer เขียน Status เอง (:36,:43) · รูป v2 (:44) · ไม่มี post-run audit (:40) |
| path ที่อ้างมีไฟล์จริง | `test -e` ทีละ path + `ls` | pass — รายละเอียดใน perTask |
| backup-then-delete | `find` นับ + `test -d` + `ls` (อ่านอย่างเดียว ไม่แก้ home) | pass — backup 11 role / 11 ไฟล์ `agent.md` · โฟลเดอร์เดิมถูกลบ · ไฟล์ config อื่นครบ |
| ไม่มีไฟล์ sta2 ถูกแก้ | `git -C C:\src\AICode\rong-ngang status --porcelain` (read-only) | pass — ทุก entry อยู่ใต้ `code/` หรือ `knowledge/` เท่านั้น |
| test | `npm test` ที่ `code\agent-team\` | pass — 43/43 (0 fail) |
| typecheck / lint / build | — | none (ไม่มีคำสั่งประกาศ — task เขียนเอกสารเท่านั้น) |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-003 | verified | รายละเอียดต่อ AC ด้านล่าง |

- **AC-023 (ไม่คัดลอกเนื้อหา role prompt)** — grep อัตโนมัติ 213 บรรทัดยาวจาก role prompt ทั้ง 12 ไฟล์ → 0 hits บน `code\AGENTS.md` · ไฟล์ประกาศตัวเอง "ดัชนี/wrapper เท่านั้น" (`AGENTS.md:6-7`) · หัวข้อ "อ่านอะไร (path เท่านั้น)" (`:20-26`) มีเพียง path + คำอธิบายสั้น
- **AC-024 (ครบ 4 agents)** — ตาราง `AGENTS.md:13-18`: claude/zcode = `CLAUDE.md` + `.claude\agents\*.md` โหลดตรง (ls ยืนยัน 12 ไฟล์) · codex = convention `AGENTS.md` ใน cwd + global `~\.codex\AGENTS.md` (`test -f` ผ่าน) · antigravity = สั่งอ่านไฟล์นี้ก่อนเริ่ม — ตรง des-013.md:9-14 ทุกแถว
- **ประกาศ solo ครบ (DES-013 R1)** — serial OQ-17 (`AGENTS.md:35,42`) · qa-engineer เขียน Status เอง ค่า `pending/verified/blocked` OQ-14 (`:36,43`) · รูป v2 AC-021 + AC-036/AC-038 (`:44`) · ไม่มี post-run audit (`:40`) · state = เอกสาร knowledge (`:41`) · `/gituse` ยังไม่มี — BL-016 (`:46`; grep `backlog.md:22` = SETUP-006 `/gituse` ตรง)
- **ทุก path ที่อ้างมีไฟล์จริง** — `CLAUDE.md` (Human gates :89, docs root :14-15) · `.claude\agents\` 12 ไฟล์ · `policies\README.md` + `policies\documentation.md` · `templates\` 17 ไฟล์ · docs `plan\index.md` มี `## Waiting on Human` (:14 — คำสั่งอ่านก่อนลงมือที่ `AGENTS.md:32` ใช้ได้) · `code\agent-team\` · `C:\src\AICode\sta2\` · `~\.codex\AGENTS.md` · `tiers.yaml` ที่ packRoot = ไม่มีจริง ตรงคำประกาศ "ถ้ามี…ยังไม่มีไฟล์นี้ใน pack → ใช้ default ห้ามสร้างเอง" (`AGENTS.md:26`)
- **backup-then-delete** — `~\.gemini\config\agents-backup-2026-10-06\` ครบ 11 role (backend-engineer, business-analyst, devops, frontend-engineer, project-manager, qa-engineer, security, setup, system-analyst, test-planner, uxui-designer) นับ `agent.md` ได้ 11 · `~\.gemini\config\agents\` ไม่มีอยู่แล้ว (`test -d` fail) · `config.json`, `config.json.bak`, `hooks.json`, `mcp_config.json`, `plugins`, `projects`, `sidecars`, `sta-global-bridge.js` ครบเดิม — md5 เนื้อหายังเทียบไม่ได้ (ไม่มี baseline ฝั่ง QA)
- **"ไม่มีไฟล์ sta2 ถูกแก้"** — `git status --porcelain` รันเอง: ทุก path `code/…` หรือ `knowledge/…` (รวม untracked round files) — ไม่มี entry นอกสองราก

### review:REV-030 (Minor → backlog — Back-links)

ยืนยันช่องว่างเป็นจริง: `code\tiers.yaml` MISSING ขณะที่ DES-013 §Rule นับ "ตาราง tier" เป็นส่วนของ pack และ tier authority มีจริงที่ `code\agent-team\config\tiers.yaml` (test -f ผ่าน) — แต่ `AGENTS.md:26` รับมือแล้วด้วย branch "ถ้าไม่พบ ใช้ default ห้ามสร้างเอง" ตรง AC-022 (branch default) + DES-004 → **ไม่ block** (ตรงตัดสิน review round 11 PASS) · owner ถัดไป: `system-analyst` → `setup` (รายละเอียดที่ `review\round-11.md` หัวข้อ REV-030)

### Data Model check

ไม่มี entity/schema ใน task นี้ (ไฟล์จุดเข้า + backup เท่านั้น) — `design\data-model.md` ไม่ครอบ artifact ของ SETUP-003

### Issues Found (defect packet)

ไม่มี — ไม่เปิด QA-004

## Unverified Behaviour

- **คู่มือเปิด solo session ทำตามได้จริงทีละ agent (Acceptance)** — plan กำหนดตรวจเต็มที่ **QA-002** (phase 7): รอบนี้ตรวจเชิงโครงอย่างเดียว — คู่มือ `AGENTS.md:28-36` มี 7 ขั้นทำตามได้ ทุก path ในขั้นมีไฟล์จริง (ดู perTask) · **ยังไม่เคยเปิด session จริงตามคู่มือครบทั้ง 4 agents** — รอ Feature QA phase 7
- แขนง codex "convention อ่าน `AGENTS.md` ใน cwd อัตโนมัติ" และ antigravity "สั่งอ่านไฟล์ก่อนเริ่ม" = `inferred` (des-013.md:13-14) — ยังไม่ทดลองจริง

## Change Log

- 2026-10-06 — Round 9 — SETUP-003 ✅ Verified (รันเช็คเอง: grep 213 วลี 0 hits · path ที่อ้างมีจริง · backup 11 ไฟล์ · git status สะอาด · npm test 43/43) · sync Status `pending → verified` · ไม่มี QA finding ใหม่ (ไม่เปิด QA-004) · review:REV-030 Minor → backlog (Back-links)

Back-links: `plan\index.md` · `..\index.md`
