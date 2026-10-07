# agent-team — QA Round 5 — BE-002, BE-018, SETUP-009

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่ verbatim · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

โหมด solo · clean session (เจ้าของ jtrp98, 2026-10-06) · **รันเช็คเองทุกข้อ ไม่ยึด evidence ส่งต่อ** · review ล่าสุด: `review\round-7.md` (BE-002 PASS), `round-8.md` (BE-018 PASS — REV-021/022 resolved), `round-5.md` (SETUP-009 PASS) · หลักฐานเดิม SETUP-009: `qa\round-3.md` ✅

## Open Issues

| ID | Task | Severity | path:line | Owner | Status |
|---|---|---|---|---|---|
| REV-023 | BE-002 | Minor | `src/core/knowledge-paths.ts:74` | system-analyst → setup, backend-engineer | → backlog (contract gap template module-index — resolver ถูกแล้ว) |
| REV-024 | — (เอกสาร qa) | Minor | `qa\index.md` ตาราง Rounds | qa-engineer | **resolved รอบนี้** — ผลรัน validator ยืนยัน `file-not-in-index` หาย |
| REV-025 | — (requirement) | Minor | `req-006.md:1`, `req-008.md:1`, `req-009.md:1` | business-analyst | → backlog (ยืนยันด้วยผลรัน — 3 ไฟล์) |
| REV-026 | — (review/qa) | Minor | `review\round-1/3/5.md`, `qa\round-4.md` | reviewer / qa-engineer | → backlog (ยืนยันด้วยผลรัน — 4 ไฟล์ แก้ย้อนไม่ได้) |
| REV-027 | — (review) | Minor | `review\round-7.md:1` | reviewer | → backlog (ยืนยันด้วยผลรัน) |
| REV-015/016 | SETUP-009 | Minor | `templates/test-plan.md:1,3` · `test-planner.md:21` | PM → setup | → backlog (คงตาม round-3) |

คงเดิมจาก round-4 (Minor → backlog): qa:QA-003, REV-018/019/020 · ไม่มี Critical/Important ค้าง

## Round 5

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| typecheck / lint / build | — (`CLAUDE.md:17` มีแค่ npm test · tsx รันตรง) | not run |
| test | `npm test` ที่ `code\agent-team\` | pass — rc=0 · `tests 43 · pass 43 · fail 0` |
| validator | `validateModuleDocs('…knowledge/agent-team')` + `inspectPlan` | ก่อนแก้ REV-024: 9 issues (8 `unit-over-budget` + `file-not-in-index` qa\round-3.md) · rows 34 · needsMigration false · **ไม่มี `plan-*`/`task-file-*`** |
| validator (หลังแก้) | รันซ้ำหลังแก้ `qa\index.md` + เขียน round-5.md | 8 issues — `file-not-in-index` หายครบ เหลือ `unit-over-budget` ล้วน |
| grep artifact | `grep -nF` คำห้ามใน `test-planner.md` | ไม่พบทุกคำ (rc=1) · คำบังคับพบที่ `:23,29,33-35,40` |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-002 | verified | Acceptance ครบ (ตารางล่าง) — test knowledge-paths 9 ข้อผ่านในรันของ QA เอง |
| BE-018 | verified | Acceptance ครบ (ตารางล่าง) — test 20 ข้อผ่าน + ผลรัน module จริง |
| SETUP-009 | verified | sync จาก round-3 ✅ + re-verify artifact เอง (หัวข้อล่าง) |

### Acceptance — BE-002 (`test\knowledge-paths.test.ts`)

| ข้อ | Result | หลักฐาน |
|---|---|---|
| path ถูกทุก layout ที่ registry รับ | ✅ | test `:23-28` split/flat/module + ปฏิเสธ layout แปลก (`knowledge-paths.ts:60-65`) |
| ชื่อ module ผิดรูป/`..` ถูกปฏิเสธ | ✅ | test `:48-66` (11 ชื่อเสีย + traversal รวม glob `design/**/../x` · `:17,28-34` ครอบ `/` `\` NUL) |
| resolve ชี้ไฟล์จริงใน `knowledge\agent-team\` (AC-011) | ✅ | test `:93-117` — 11 unit ผ่าน sta-config จริง (split) · `isInside` `:37-40` |
| template mapping (AC-012) + fail-closed | ✅ | test `:77-91` · REV-023 = contract gap ไม่ใช่ defect ของ task |

### Acceptance — BE-018 (`test\plan-parser.test.ts` / `test\docs-validator.test.ts`)

| ข้อ | Result | หลักฐาน |
|---|---|---|
| AC-036 v2 6 คอลัมน์ | ✅ | test `:12-23` · จริง: rows 34, v2 |
| AC-074 legacy → needsMigration | ✅ | test `:35-44` (`plan-parser.ts:133-135`) · จริง: false |
| AC-038 `Status:`/ขาดหัวข้อ → issue + ไม่ใช้ค่า | ✅ | test `:105-115` + `docs-validator.test.ts:59-64` · status=null (`:194-195,260`) · fence/blockquote ไม่นับ (`:255-259`) |
| AC-039 Depends เสีย → issue แถว | ✅ | test `:54-63` missing/cycle/malformed (`:186-220`) |
| Status นอก 3 ค่า → issue | ✅ | test `:46-52` |
| ตาราง TP-REV-QA ผิดรูป → issue (module) | ✅ | test `docs-validator.test.ts:74-93` (`docs-validator.ts:54-83`) |
| AC-079 Owner reviewer/security → issue แถว + task id | ✅ | test `:65-72` (`:225-229`) |
| multi-anchor ระบุทั้งสอง | ✅ | test `:74-80` (`:231-237`) · จริง: QA-001 ph6 / QA-002 ph7 → ไม่มี issue |
| issue แถวไม่ทำให้ module ล้ม | ✅ | test `docs-validator.test.ts:38-49` (`:201-206`) |
| รันกับ module จริง → ไม่มี issue ด้านรูป plan | ✅ | รันเอง: 9 issues = งบเอกสาร/qa-index เท่านั้น · test `:136-139` |
| two-way หมวด round (แก้ REV-021/022) | ✅ | `docs-validator.ts:31-33,114-129,148-155` · test `:95-134` · false positive 9 รายการหาย (18 → 9) |

### SETUP-009 — sync Status (pending → verified)

ตรวจ artifact เอง: `code\.claude\agents\test-planner.md` ตรง DES — DES-018:11 (kind `execution` 5 state) + `:16` blocker → `:40` · DES-019:24 (TP-NNN + Given/When/Then + REQ/AC · index `TP|Phase|REQ/AC|ไฟล์` · `round-N.md`) → `:29,33-35` · DES-020:15-16 (resolve ผ่านคอลัมน์ `ไฟล์` เสมอ) → `:34-35` · severity model (DES-018:48) กับ kind `feature-qa` (`:13`) เป็นกติกาฝั่ง reviewer/QA/orchestrator — test-planner ไม่ emit finding/ไม่ใช่ anchor จึงไม่ขัด · รูป `qa:QA-NNN` (DES-020:21) เกี่ยวข้อความอิสระที่ชน task id — prompt อ้างแต่ REQ/AC/DES จึง n/a · AC-060 ไม่มี Bash (`:4,29`) · trigger เดิม (`:21`) · review round 5 PASS (`review\round-5.md:50,54`) · QA round 3 ✅ (`qa\round-3.md:19`) → ครบตาม brief → **`verified`** · ผู้บันทึก: qa-engineer, 2026-10-06

### Data Model check

ไม่มี entity/schema ใหม่ใน 3 task นี้ · PlanIndex/PlanRow/PlanIssue/DocIssue (`plan-parser.ts:27-66` · `docs-validator.ts:40-48`) ตรง DES-014 §plan v2/§Validator — issue 2 ระดับ + taskIds + reason `missing:`/`owner:`/`multi-anchor` ตาม R9/R24 (DES-018:29,44) · ไม่พบ divergence

### Issues Found

ไม่มี QA finding ใหม่ — ไม่เปิด QA-004 · issue คงเหลือ (8 `unit-over-budget`) ตรง review:REV-025/026/027 ที่จดไว้แล้ว (Back-links) · review:REV-024 แก้แล้วรอบนี้

## Backlog (Minor — ไม่ขวาง)

- REV-023, REV-025, REV-026, REV-027, REV-015, REV-016, qa:QA-003, REV-018/019/020 — จดไว้ใน review/qa เดิม ให้ PM คงสถานะ `backlog.md` (ไม่มีรายการใหม่)

## ข้อสังเกต

- Depends: BE-001 = `verified` (`plan\index.md:42`) ✅
- ตัวนับรอบ: BE-002 review 7 PASS + QA รอบแรก · BE-018 review 7 FAIL → 8 PASS (fix round 1) + QA รอบแรก — ไม่ถึงขีด 3 รอบ ไม่มี Critical
- Status ลง `plan\index.md`: BE-002 / BE-018 / SETUP-009 `pending` → `verified` (review PASS + QA ผ่านครบ)
- "ไม่มีไฟล์อื่นเปลี่ยน" ทั้ง 3 task ตรวจไม่ได้ (role ห้าม git) → Unverified Behaviour

## Unverified Behaviour — undeployed phases

- Phase 1/2: "ไม่มีไฟล์อื่นเปลี่ยน" ทุก task — ต้อง git diff/status → driver/คนยืนยัน
- Phase 1: parser/validator ใน orchestrator จริง (BE-011 hold/dispatch, BE-021 resolve REV/QA, BE-022 write-back) — ยังไม่ build
- Phase 2/6/7: agent test-planner ทำตาม prompt จริง (สร้าง index ทุกครั้ง · ตั้งชื่อ `round-N.md` — เสี่ยง template `<slug>` REV-015) — QA-001/002
- คงจาก round-4: AC-033 ระดับ dispatch · AC-045 เพดาน session · AC-075 crash → Waiting on Human · คงจาก round-3: AC-006/AC-023 · orchestrator บังคับ handoff (BE-006/008/019/021/022)

## Change Log

- 2026-10-06 — Round 5 — BE-002, BE-018, SETUP-009 ✅ Verified · แก้ review:REV-024 (แถว round 3 ใน qa\index.md) · sync SETUP-009 `pending → verified` · ไม่มี finding ใหม่

Back-links: `plan\index.md` · `..\index.md`
