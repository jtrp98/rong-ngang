# agent-team — Feature QA — Phase 2

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` · ไฟล์นี้ = 1 round · live Open Issues / Unverified Behaviour อยู่ในรอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| qa:QA-004 | SETUP-005 | Minor | → backlog (system-analyst — ดู Issues Found) |

## Round 11

**Status:** ✅ Verified — Feature QA — Phase 2: **PASS**

Flow ทดสอบ: "เปิด solo session ที่ `code\` → ขับ pipeline แบบ serial ด้วย template/prompt v2 · onboarding knowledge ใหม่ด้วย setup prompt" (`plan\index.md` `## Phases` 2) — สวมบทผู้ใช้ + driver ในเซสชันเดียว · 6 task `verified` ครบโดยรอบก่อน (rounds 1/2/3/8/9/10) — รอบนี้พิสูจน์ผลรวม pack · fixture ลบแล้ว (Handoff)

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` ที่ `code\agent-team\` | pass — 43/43 |
| typecheck/lint/build | — | not present (package.json ไม่มี) |

### ขั้นที่ 1 — คู่มือ 7 ขั้น (`AGENTS.md:34-42`) ทำได้จริง ไม่ตัน

1 เปิดที่ `code\` — จุดเข้า 4 agents ครบ (`:13-18` · `~\.codex\AGENTS.md` มีจริง) · 2 อ่าน `CLAUDE.md` ครบ (docs root `:14` · check commands `:17` · Status `:42,114`) · 3 `## Waiting on Human` อ่านจริง — ว่าง (ไม่มีเรื่องค้าง 2026-10-06) · 4 สวม role โดยอ่าน prompt ก่อนจริง: `setup.md`/`qa-engineer.md` (+`project-manager.md`) — frontmatter ครบ · policies ที่ prompt ชี้มีจริง · 5 handoff ในข้อความ ไม่เขียน state ใหม่ (`:40`) · 6 serial — grep `parallel\|spawn` ใน `CLAUDE.md`/role prompts = 0 (`AGENTS.md:26` เป็นคำแนะนำ model/effort ไม่ใช่คำสั่งขนาน) · 7 ค่า Status ตรง `plan-parser.ts:10`

Path ที่คู่มือชี้มีจริงหมด: `.claude\agents\` 12 · `policies\` 11 · `templates\` 17 · `prompts\setup-knowledge.md` · `tiers.yaml` ไม่มีตามที่คู่มือประกาศเอง (`:26`)

### ขั้นที่ 2 — onboarding + วงจร serial (fixture `tmp-qa-knowledge` / `tmp-qa-target` / `tmp-qa-module`)

**Onboarding — รัน `prompts\setup-knowledge.md` ทีละขั้น (backup sha256 `39251948…ae94f`):**
- กรณี A fail-closed: `stat` path ไม่มีจริง → ปฏิเสธทันที ไม่เขียน/แก้ไฟล์ใด — sha256 คงเดิม (`setup-knowledge.md:18-22`) — pass
- กรณี B path จริง: ขั้น 1 `stat` ผ่าน → ขั้น 2 โครง 11 ไฟล์ (7 template verbatim + 4 stub) — plan index 6 คอลัมน์ (AC-036) → ขั้น 3 append ท้าย `knowledge_roots[]` ตรง schema — รายการเดิม deep-equal · grep `gituse` = 0 (sha ใหม่ `cd3f43c8…8aad`) → ขั้น 4 parse กลับผ่าน + **loader จริง** `loadStaConfig`/`resolveRunRoots` resolve ได้ทั้งรายการใหม่และเดิม (`rong-ngang-knowledge`) — pass

**วงจร task serial 1 รอบ (รูป v2):** (1) สวม `project-manager` (อ่าน role prompt ก่อน): เพิ่มแถวเดียว `TA-001 | backend-engineer | 1 | BE-001 | pending` (OQ-14 — PM ไม่มีสิทธิ์ verified · `project-manager.md:45-46`) + `plan\ta-001.md` 8 หัวข้อ (AC-038) จาก `templates\plan-task.md` → (2) `validateModuleDocs` + `inspectPlan` (`npx tsx` cjs/require): `format:"v2"` `planIssues=0` · TA-001 อ่านครบ (depends `[BE-001]`) · ไม่มี `task-file-*` issue → (3) สวม `qa-engineer` เขียนคอลัมน์ Status เอง `pending` → `verified` → (4) parser อ่านซ้ำ: `TA-001:"verified"` เปลี่ยนจริง `planIssues=0` — รอบเดียวจบในตัว

### ขั้นที่ 3 — กติกา solo ตาม DES-013 (`des-013.md:18,22` + `AGENTS.md:44-52`)

- serial (OQ-17): `AGENTS.md:41,48` — รอบนี้ทำทีละ role จริง · ไม่มี scheduler/claim audit — ✓
- qa-engineer เขียน Status เอง (OQ-14): `AGENTS.md:42,49` · `CLAUDE.md:42,114` · `templates\plan-index.md:3` — PM ได้แค่ `pending` · QA เขียน verified แล้ว parser อ่านจริง — ✓
- ไม่มี post-run audit: `AGENTS.md:46` (`des-013.md:22`) — ไม่มีกลไกสแกนใน pack — ✓
- state = เอกสาร: `AGENTS.md:47` · `des-013.md:5` — วงจรใช้แค่ plan index + task file — ✓

ไม่พบคู่มือขัดพฤติกรรมจริง — สิ่งที่พบคือช่องว่างระหว่าง component (qa:QA-004)

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-004 | verified | pack ถูกใช้จริงทั้งรอบ — agents 12/templates 17/policies 11/prompts 1 |
| SETUP-007 | verified | template v2 คัดสร้างจริง · AC-036 · task file ผ่าน parser (AC-038) |
| SETUP-008 | verified | role prompt สวมจริง 3 ตัว ขับงานตรงหน้าที่ |
| SETUP-009 | verified | `test-planner.md` คงเดิมตรง round-3 — ไม่มีจุดขัดแย้ง |
| SETUP-003 | verified | คู่มือ 7 ขั้นใช้เปิดจริง (ขั้นที่ 1) · ประกาศ solo ครบ (`:44-52`) |
| SETUP-005 | verified | onboarding 2 กรณี + loader จริง — issue เดียว Minor (qa:QA-004) |

### Feature QA flows

| Flow | อ้าง | Result |
|---|---|---|
| เปิด solo session ตามคู่มือ 7 ขั้น — ครบทุกขั้น ไม่ตัน | AC-024 · DES-013 · SETUP-003 | pass |
| onboarding knowledge ใหม่ — fail-closed 2 กรณี + loader จริง | DES-015 · SETUP-005 | pass |
| ขับ pipeline serial ด้วยรูป v2 — PM → validator/parser → QA Status → parser | AC-021 · AC-036/038 · OQ-14/17 | pass |
| กติกา solo 4 ข้อ ตรง DES-013 | DES-013 R1 | pass |

### Data Model check

sta-config ขณะทดสอบ ตรง `design\data-model.md` §sta-config + DES-015: root `[main_root, knowledge_roots]` · root ย่อย `[name, path, targets]` · target `[name, path]` — ผ่าน validator ของ loader จริงทั้งใหม่/เดิม · ไม่มี `gituse` · phase 2 ไม่มี entity ใหม่

### Issues Found (defect packet)

#### QA-004

- **Task:** SETUP-005 (ร่วม SETUP-007, BE-018) · **Severity:** Minor (ไม่ block AC ใด — Minor → backlog)
- **Expected:** โครงจาก setup prompt (template verbatim) ควรผ่าน `assertModuleDocs` ตั้งแต่เริ่ม หรือมีที่ประกาศชัดว่ายังไม่ผ่านจน owner ใส่เนื้อหาจริง
- **Actual:** skeleton ใหม่ fail module-level 5 issue — `index-row-no-file` ×4 จากแถวตัวอย่างของ template (req-001/des-001/be-001/oq-1) + `index-over-budget` (template plan index 2,207 B > เพดาน 2,048 B ตอน 0 ไฟล์อ้างอิง) · เหลือ 4 หลังเพิ่ม task จริง · validator ถูกตาม DES-014 · DES-014/015 ไม่พูดถึงจุดนี้ (grep แล้ว)
- **Reproduce:** รัน setup-knowledge ขั้น 1–4 กับ path จริง → `npx tsx -e` เรียก `validateModuleDocs(<moduleDir>)`
- **Evidence:** output รอบนี้ (5 → 4 issue) · `templates\plan-index.md` 2,207 B · `docs-validator.ts:131-198`

## Unverified Behaviour — undeployed phases

- จุดเข้า codex/agy จริง: ยืนยันได้เฉพาะไฟล์มีจริง (`~\.codex\AGENTS.md` ✓) — ไม่ได้รัน session บน camp นั้น → QA-002
- สาขา prompt ยังไม่รัน: name ซ้ำ · config corrupt · ไฟล์มีอยู่แล้ว → ข้าม (round-10 ธงไว้) · gate 7 จุดใน solo ไม่มี enforcement (`AGENTS.md:46`) — งานจำลองไม่มีจุดเข้าเงื่อนไข gate → QA-002

## Handoff

- Verdict: **Feature QA — Phase 2 = PASS** (✅ Verified) · securityGate: none (ไม่มี 🔒 — เอกสาร/prompt ล้วน)
- Findings ใหม่: qa:QA-004 Minor → backlog (system-analyst) · ไม่จดซ้ำ review:REV-029…032
- เก็บกวาดแล้ว: sta-config คืน byte-exact sha256 `392519480e3652474088a9e7f704d977724a2eb7e4a8ef11adfb1ca6536ae94f` · ลบ `state\tmp-featureqa-p2\` (เหลือ `.gitkeep`)
- Blockers: ไม่มี · Status 6 task คง `verified` (sync รอบก่อน — รอบนี้ไม่แตะ `plan\index.md`)
- next role: driver — phase 3 เริ่มได้ (งานแรก BE-003)

## Change Log

- 2026-10-06 — Round 11 — Feature QA — Phase 2: ✅ Verified (PASS) — คู่มือ 7 ขั้น + onboarding 2 กรณี + วงจร serial v2 + กติกา DES-013 · qa:QA-004 Minor → backlog · fixture ลบ + sta-config คืน byte-exact

Back-links: `plan\index.md` · `..\index.md`
