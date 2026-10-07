# agent-team — Review Round 7 — BE-002 + BE-018

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

Solo build (risk #14): driver สวม role engineer ส่ง evidence การรันมาพร้อม brief · session นี้ไม่มี shell — ใช้ผลรันที่ driver แนบ ณ 2026-10-06 เป็นหลักฐาน: `npm test` 41 ผ่าน 0 fail · `validateModuleDocs("knowledge/agent-team")` = 18 issues · `inspectPlan` = rows 34, needsMigration false, ไม่มี issue ด้านรูป plan · path โค้ดสัมพัทธ์ `code\agent-team\`

## Findings

### REV-021

- **Severity:** Important (blocking)
- **Task:** BE-018
- **Location:** `src/core/docs-validator.ts:21-30` (`roundId` อ่านเฉพาะเซลล์แรก), `:127` (`rowIds` มาจาก `firstCells`), `:162` (`referenced` นับจาก `rowIds`)
- **Problem:** two-way rule (DES-014 §Validator, `documentation.md:98`) ถูก implement โดยดึง id จากเซลล์แรกของแถว index เท่านั้น แต่ DES-014:25 กำหนด index ของ test-plan/review/qa เป็นตาราง finding `ID | Task | Severity | ไฟล์` — ไฟล์ round ถูกชี้ที่คอลัมน์ `ไฟล์` (DES-020:16 "round file ที่แถวระบุ") ไม่ใช่เซลล์แรก (`REV-001`/`TP-001`/เลข `1` ไม่มี token "round-N") · บน index จริงที่ตรง DES `rowIds` จึงว่าง → false `file-not-in-index` 9 ไฟล์ (review\round-1…6, qa\round-1/2/4 — ทุกไฟล์ถูกอ้างครบทั้งตาราง Rounds และ Findings) + false `index-over-budget` (review\index.md "0 ไฟล์" → budget ตกไป 2 KB) · ทุก issue นี้เป็น module-level → `assertModuleDocs` จะ halt run กับ module ที่โครงถูกต้อง (fail-closed ยิงใส่ของจริง) — ขวาง flow phase 1 "validate module จริง → ผ่าน" และเป็นฐานเสียหายของ BE-021 (resolve REV/QA) กับ hold ของ BE-011 · ตัวจริงที่แฝงมามี 1 (qa\round-3.md — ดู REV-024) แต่โค้ดจับได้ด้วยเหตุผลผิด (จับทุกไฟล์) · test two-way เดิม (`test/config.test.ts:258`) ใช้ fixture `| Round | result |` เซลล์แรก "Round 1" ซึ่งไม่ใช่รูป DES-014:25 จึงไม่เห็นช่องนี้
- **Reference:** DES-014:25,33,39 · DES-020:16 · `policies\documentation.md:98` · ผู้ต้องแก้: `backend-engineer` — การตัดสิน: รูป index ของ review/qa จริงตรง DES-014 อยู่แล้ว ตัว validator ตีความผิด

### REV-022

- **Severity:** Minor → backlog
- **Task:** BE-018
- **Location:** `test/docs-validator.test.ts:74-93,95-98`
- **Problem:** ไม่มี test ครอบ two-way ของหมวด round ตามรูป DES-014:25 — fixture `:76-81` มี false positive (review\round-1.md อยู่นอก `rowIds`) แฝงอยู่แต่ assert เฉพาะ `plan-table-malformed` (`:83`) และ test module จริง (`:95-98`) filter เฉพาะ `plan-|task-file-` จึงไม่มี test ใดจับ REV-021 · ควรเพิ่ม case: round file ที่ถูกอ้างในคอลัมน์ `ไฟล์` ต้องไม่ถูกรายงาน file-not-in-index และ index ต้องนับไฟล์ครบตอนคิด budget
- **Reference:** DES-014:25,33 · ผู้ต้องแก้: `backend-engineer` (ทำพร้อม REV-021)

### REV-023

- **Severity:** Minor → backlog
- **Task:** BE-002
- **Location:** `src/core/knowledge-paths.ts:74` (`module-index` → `template: ""`) + Glob ยืนยันไม่มี `templates\module-index.md` ใน pack
- **Problem:** AC-012 กำหนดเอกสารทุกฉบับที่ agent สร้างต้องอยู่รูป template แต่ module index.md (BA เป็นเจ้าของ — DES-014:31) ไม่มี template ทั้งใน DOC_UNITS และ templatesRoot → BA เปิด module ใหม่ (flow BE-010 "งานใหม่ถึง BA") ต้องประดิษฐ์รูปเอง ขัด AC-012 · resolver fail-closed ถูกต้องแล้ว (ปฏิเสธ — DES-011 Fallback) BE-002 จึงผ่าน AC ของตัวเอง — ช่องนี้เป็น contract gap
- **Reference:** REQ-005 AC-012 · DES-011 · DES-014:9,31 · ผู้ต้องแก้: `system-analyst` (นิยาม template module-index) → setup + `backend-engineer`

### REV-024

- **Severity:** Minor → backlog
- **Task:** — (เอกสาร qa)
- **Location:** `knowledge\agent-team\qa\index.md:8-12` (ตาราง Rounds มีแค่ round 1/2/4 · Findings `:15-20` ก็ไม่มีแถวอ้าง round-3.md)
- **Problem:** `qa\round-3.md` (round SETUP-009 — Change Log `:26`) มีบนดิสก์แต่ไม่ปรากฏในตารางใดของ qa\index.md ขัด two-way rule · เมื่อแก้ REV-021 แล้ว validator จะจับเป็น true positive และ halt จนกว่า index จะเพิ่มแถว — fail-closed ทำงานถูกต้อง อันนี้เป็นการแก้เอกสาร ไม่ใช่โค้ด
- **Reference:** DES-014:33 · `policies\documentation.md:98` · ผู้ต้องแก้: `qa-engineer` (เจ้าของ qa\index.md)

### REV-025

- **Severity:** Minor → backlog
- **Task:** — (เอกสาร requirement)
- **Location:** `requirement\req-006.md:1` (4,353 B) · `req-008.md:1` (5,118 B) · `req-009.md:1` (4,256 B) — driver วัด 2026-10-06
- **Problem:** เกินงบ 4 KB/ไฟล์ (`documentation.md:73`) — ต้อง archive/แตกไฟล์ก่อน (`:90,102`) · validator รายงาน `unit-over-budget` ถูกหน้าที่แล้ว — เป็นภาระเอกสาร ไม่ใช่ defect ของ BE-018
- **Reference:** `policies\documentation.md:73,90,102` · DES-014:29 · ผู้ต้องแก้: `business-analyst`

### REV-026

- **Severity:** Minor → backlog
- **Task:** — (เอกสาร review/qa)
- **Location:** `review\round-1.md:1` (11,323 B) · `round-3.md:1` (11,125 B) · `round-5.md:1` (10,524 B) · `qa\round-4.md:1` (11,762 B)
- **Problem:** round file เกินงบ 10 KB (`documentation.md:78`) · แต่รอบที่ปิดแล้วต้องคงอยู่ verbatim (`:95` — ไฟล์นั้นคือ archive เอง) จึงแก้ย้อนไม่ได้ ทางออกตาม policy คือคุมขนาดรอบถัดไปและตัดสินเป็น release-cut (`:102`) โดยเจ้าของ · validator รายงานถูกหน้าที่
- **Reference:** `policies\documentation.md:78,95,102` · ผู้ต้องแก้: `reviewer` (review rounds) / `qa-engineer` (qa round) — ตัดสิน release-cut โดยเจ้าของ

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-021 | Important | `src/core/docs-validator.ts:21-30,127,162` | backend-engineer | open |
| REV-022 | Minor | `test/docs-validator.test.ts:74-98` | backend-engineer | → backlog |
| REV-023 | Minor | `src/core/knowledge-paths.ts:74` | system-analyst → setup, backend-engineer | → backlog |
| REV-024 | Minor | `qa\index.md:8-12` | qa-engineer | → backlog |
| REV-025 | Minor | `requirement\req-006.md:1` ฯลฯ | business-analyst | → backlog |
| REV-026 | Minor | `review\round-1.md:1` ฯลฯ | reviewer / qa-engineer | → backlog |

## Round 7

**Verdict:** FAIL (มี Important 1 — REV-021 ของ BE-018)

| Task | Verdict |
|---|---|
| BE-002 | PASS |
| BE-018 | FAIL |

**BE-002 — ตรวจครบตาม Acceptance:**
- path ถูกทุก layout ที่ registry รับ: `knowledge-paths.ts:60-65` split/flat/module + ปฏิเสธค่าแปลก · test `:23-28` · layout จริงจาก sta-config = split (`:97-98`)
- ชื่อ module ผิดรูป/`..` ถูกปฏิเสธ: `MODULE_NAME_RE` `:17` ตรง DES-011 · `assertNoTraversal` `:28-34` ครอบ `/` `\` NUL · test `:48-66` รวม glob `design/**/../x`
- resolve ชี้ไฟล์จริงใน `knowledge\agent-team\` (AC-011): test `:93-117` resolve 11 unit ผ่าน sta-config จริง · `isInside` `:37-40` กันหลุด root
- template mapping (AC-012): `DOC_UNITS` `:73-92` + `resolveTemplatePath` fail-closed เมื่อ templatesRoot/ไฟล์หาย `:129-133` · test `:77-91` resolve ทุก unit กับ templatesRoot จริง · ช่อง module-index → REV-023
- `assertUnderRoots` `:43-50` พร้อมให้ BE-006/008 ใช้ตาม DES-011 path safety · ไม่พบ scope เกิน (ไม่เขียนไฟล์จริง, ไม่ resolve id — ตรง Out of Scope)

**BE-018 — ตรวจครบตาม Acceptance (evidence: test 41 ผ่าน + ผลรันจริงของ driver):**
- AC-036 v2 6 คอลัมน์: `plan-parser.ts:129` exact header · test `plan-parser.test.ts:12-23` · จริง: rows 34, format v2
- AC-074 legacy: `:133-135` ธง `needsMigration` ไม่แปลงไฟล์ · test `:35-44` (จริง: false)
- AC-038 `Status:`/ขาดหัวข้อ: `:259-267` จับ list/bold/heading + ข้าม code fence · TaskFile ไม่มี field status = "ไม่ใช้ค่า" โดยโครงสร้าง · test `:105-115`
- Depends เสีย (AC-039): missing `:202-204` · cycle `:205-220` (task นอกวงที่พึ่งวงไม่ถูก flag — ตรง "task ในวง") · malformed `:186-191` · test `:54-63`
- Status นอก 3 ค่า: `:193-195` status=null · test `:46-52`
- ตาราง TP/REV/QA ผิดรูป: `docs-validator.ts:56-81` header/แถว/ไม่มีตาราง → module issue · test `docs-validator.test.ts:74-93`
- AC-079: `:224-229` reason `owner:<role>` + taskIds · test `:65-72` · multi-anchor `:231-237` ระบุทั้งสอง · test `:74-80` (จริง: QA-001 phase 6 / QA-002 phase 7 → ไม่มี issue — ตรง replan)
- issue แถวไม่ล้ม module: `assertModuleDocs` filter row `:173-177` · test `:38-49` · รูป issue ตรง Expected Output (file/location/reason/level/taskIds `:27-35`) และ reason code ตรง R9/R24 (`missing:<id>`, `owner:<role>`, `multi-anchor` — DES-018)
- รันกับ module จริง → ไม่มี issue ด้านรูป plan: 18 issues ที่ได้เป็น unit-over-budget/file-not-in-index/index-over-budget เท่านั้น ไม่มี `plan-*`/`task-file-*` · test `:95-98` — **AC ข้อนี้ผ่าน**
- **แต่ Scope "two-way rule เดิมคง" ไม่ผ่าน** — REV-021: validator รายงาน round file 10 ไฟล์เป็น file-not-in-index โดย 9 เป็นเท็จ และ `assertModuleDocs` จะล้มกับ module ที่โครงถูก (false positive ระดับ module = halt) → FAIL

**หมายเหตุร่วม:** งบเกินของเอกสาร (REV-025/026) เป็นเรื่องเอกสาร ไม่ใช่ defect ของ validator — validator รายงานถูกหน้าที่ · qa\round-3.md หลุด index เป็นเรื่องเอกสารของ qa-engineer (REV-024)

**ไม่ได้ review:** git diff / ขอบเขตไฟล์ที่เปลี่ยนจริง (ไม่มี shell) · การรัน test ด้วยตัวเอง (ใช้ผลของ driver) · `test-plan\` จริง (module ไม่มีหมวดนี้) · BE-011/BE-021 (ยังไม่ build — ประเมินผลกระทบจาก design เท่านั้น)

## Reviewed

- `plan\be-002.md`, `plan\be-018.md`, `plan\index.md`
- `design\des-001.md`, `des-011.md`, `des-014.md`, `des-018.md`, `des-019.md`, `des-020.md`, `design\index.md` (§Impact)
- `requirement\req-005.md`, `req-011.md`, `req-012.md`, `req-014.md`, `req-015.md`
- `code\agent-team\src\core\knowledge-paths.ts`, `plan-parser.ts`, `docs-validator.ts` (ทั้งไฟล์)
- `code\agent-team\test\knowledge-paths.test.ts`, `plan-parser.test.ts`, `docs-validator.test.ts` (ทั้งไฟล์) · `test\config.test.ts:255-305` (หลักฐาน test two-way เดิม)
- `knowledge\agent-team\review\index.md`, `qa\index.md`, `review\round-6.md` (รูปแบบ) · `code\templates\review-round.md` · `policies\documentation.md` §4 · `policies\coding.md` §4–§6

## Change Log

- 2026-10-06 — Round 7 — BE-002 PASS · BE-018 FAIL (REV-021 Important) · REV-022…026 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
