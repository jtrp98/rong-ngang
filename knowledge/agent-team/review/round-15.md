# agent-team — Review Round 15 — BE-006 + BE-008

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · open findings ที่ยังไม่จบอยู่ในไฟล์รอบล่าสุดเท่านั้น

ตรวจ artifact จริง ณ 2026-10-06 — BE-006 (packet v2 + handoff-v2 + CampAdapter, DES-012) · BE-008 (write scope + session audit, DES-006 ชั้น 3 + DES-021 ข้อ 1–6) โหมด solo · `npm test` 142/142 เป็น evidence จาก driver (นับ test() ในไฟล์จริง: BE-006 = 22, BE-008 = 18 — รวม 142 ตรง) · `contract/{types,schema,validate}.ts` มาจาก session build เก่าไม่เคยผ่าน review → ตรวจเต็มสิทธิ์เหมือนโค้ดใหม่ · ไม่อ่าน `qa\`/`security.md` — stay independent

## Findings

### REV-037

- **Severity:** Minor → backlog
- **Task:** BE-006
- **Location:** `code\agent-team\src\core\contract\schema.ts:4-6` · `test\contract.test.ts:265`
- **Problem:** header comment อ้าง "ชุดคีย์เวิร์ดย่อยที่ CLI รองรับร่วมกัน: type/enum/const/properties/required/additionalProperties/items/minItems" แต่ schema ใช้จริงเพิ่ม `minLength` (STRING_MIN) · `pattern` (dateFromUser, rolePrompt.hash) · `anyOf` (blocker/priorSession/securityGate ฯลฯ) — what-comment คลาดเคลื่อนบนจุดที่เป็น claim ความเข้ากันได้กับ CLI (ชุดจริงถูก SCHEMA_KEYWORDS ใน test ล็อก — แหล่งเดียวที่เชื่อถือได้) · ผู้ต้องแก้: backend-engineer แก้ comment ให้ตรงชุดที่ test pin
- **Reference:** DES-012 §Data/schema (schema flag CLI — `inferred`)

### REV-038

- **Severity:** Minor → backlog
- **Task:** BE-006
- **Location:** `code\agent-team\src\core\contract\validate.ts:312-313` · `src\core\contract\schema.ts:216`
- **Problem:** validator 2 ชั้นไม่ตรงกัน — schema.ts บังคับ handoff `module` เป็น STRING_MIN แต่ handoffSchemaProblems ตรวจแค่ isStr → handoff ที่ `module` ว่างผ่าน handoffProblems ได้เมื่อ schemaEnforcedByCli = false (codex fallback extract) — ไม่ break AC ใด (router BE-019 ยังไม่ build) · ผู้ต้องแก้: backend-engineer จัดชั้น validator ให้สอดคล้อง
- **Reference:** DES-012 (ตรวจ 2 ชั้น) · data-model HandoffV2.module

### REV-039

- **Severity:** Important (blocking)
- **Task:** BE-008
- **Location:** `code\agent-team\src\core\session-audit.ts:679-687`
- **Problem:** กิ่ง fallback "ไม่มี pre-image" ใน git root: (1) ไม่ตั้ง `diffApprox: true` — ขัด DES-021 ข้อ 6 ที่ pin ตรงตัว ("git diff HEAD --numstat -- <file> **+ diffApprox: true** — นับเกิน = ปลอดภัย") โดย comment ของ buildDiff นิยาม diffApprox เองว่า "ไม่มี diff แม่นยำ" = แคบกว่า design (2) `git diff HEAD` ไม่แสดงไฟล์ untracked → ไฟล์ใหม่ที่เกิดใน session (ไม่มี pre-image โดยธรรมชาติ) หายเงียบจาก diff.patch ทั้ง numstat และ # approx → BE-021 นับขนาด/จำนวนไฟล์ต่ำกว่าจริง → การ split review ตามเพดาน (DES-019 largeTask/reviewWave) เบี่ยงจากฝั่ง conservative · กิ่งนี้ไม่มี test เลย (test git-mode มี pre-image ครบทุกไฟล์) · ผู้ต้องแก้: backend-engineer
- **Reference:** DES-021 ข้อ 6 · plan BE-008 Scope (DES-021 ข้อ 1–6) · data-model writeAudit.diffApprox

### REV-040

- **Severity:** Minor → backlog
- **Task:** BE-008 (contract gap)
- **Location:** `code\agent-team\src\core\session-audit.ts:640-643` · `design\des-007.md` §Resume (3)
- **Problem:** ลบแถวออกจากตาราง Tasks = `status-write` ทุก role รวม PM — ชนแนว DES-007 §Resume (3) "task ลด — ไม่มีใน plan แล้ว → ถอดจาก tasks{} (เอกสารชนะ)" คือ PM replan ลบแถวได้ · DES-021 ข้อ 5 แจกแจง 3 กรณี ไม่มีการลบแถว — โค้ดเติม fail-closed เอง (comment รับทราบว่าตีความ) · ผู้ต้องแก้: system-analyst pin (อนุญาต PM ลบแถว หรือยืนยันเป็น violation) ก่อนเวฟ PM replan เดินจริง
- **Reference:** DES-021 ข้อ 5 · DES-007 §Resume (3) · AC-073

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-023 | Minor | `src/core/knowledge-paths.ts:74` | system-analyst → setup, backend-engineer | → backlog |
| REV-025 | Minor | `requirement\req-006.md:1` ฯลฯ | business-analyst | → backlog |
| REV-026 | Minor | `review\round-1.md:1` ฯลฯ | reviewer / qa-engineer | → backlog |
| REV-027 | Minor | `review\round-7.md:1` | reviewer | → backlog |
| REV-028 | Minor | `src/main.ts:2` · `package.json:5` | backend-engineer | → backlog |
| REV-029 | Minor | `code\.claude\agents\setup.md:22` | setup | → backlog |
| REV-030 | Minor | `code\AGENTS.md:26` | system-analyst | → backlog |
| REV-031 | Minor | `code\prompts\setup-knowledge.md:44` | system-analyst → setup | → backlog |
| REV-032 | Minor | `code\prompts\setup-knowledge.md:76` | setup | → backlog |
| REV-033 | Minor | `design\des-005.md:5` · `src/core/routing.ts:21` | system-analyst | → backlog |
| REV-034 | Minor | `src/core/context-loader.ts:523` · `design\des-019.md:20` | system-analyst | → backlog |
| REV-035 | Minor | `src/core/context-loader.ts:255` · `design\des-019.md:21` | system-analyst | → backlog |
| REV-036 | Minor | `src/core/context-loader.ts:234` · `design\des-020.md:22-35` | system-analyst | → backlog |
| REV-037 | Minor | `src/core/contract/schema.ts:4-6` | backend-engineer | → backlog |
| REV-038 | Minor | `src/core/contract/validate.ts:312` | backend-engineer | → backlog |
| REV-039 | Important | `src/core/session-audit.ts:679-687` | backend-engineer | open |
| REV-040 | Minor | `src/core/session-audit.ts:640-643` · `design\des-007.md` | system-analyst | → backlog |

## Round 15

**Verdict:** FAIL (BE-008 มี Important 1 — REV-039)

| Task | Verdict |
|---|---|
| BE-006 | PASS |
| BE-008 | FAIL |

**BE-006 — ตัดสินการตีความ 5 จุด: ตรง design ทั้งหมด**
- guard injection ชิดก่อนข้อความดิบ — `composeBrief` วาง USER_TEXT_GUARD บรรทัดก่อน raw (`packet-builder.ts:50-54`) ตรง DES-012 Security · test ยืนยันทั้งตำแหน่งและ "ไม่มี raw → ไม่มี guard"
- gitPolicy คัด verbatim 4 field จาก run.json ไม่ force commitAllowed:false — ค่า R1 เป็นของขั้น derive (BE-007 ยังไม่ทำ — BL-017) packet หน้าที่พาค่า freeze ตรงไป (DES-015) · test commitAllowed:true + warning ผ่านครบทุก field — รับ
- tools advisory — CampDispatch.rolePromptTools + profile.toolRuleFlags (claude) / ข้อความ advisory ฝั่ง codex-agy ตาม DES-003 · contract พาข้อมูล ไม่บังคับ — ถูกชั้น
- securityGate อยู่ HandoffV2 เท่านั้น — packet schema additionalProperties:false ปฏิเสธ field นี้ · handoff schema ไม่ required (absent/null ผ่าน — G2-f) + กฎ (7) kind/phase/reason → R23 ตรง Rev 11
- CampDispatch เพียงพอต่อ BE-012 — packet/packetPath/rolePromptFile/Body/Tools/model/effort/handoffSchemaPath/timeoutSec/cwd/extraDirs + CampProfile (flag อ่านจาก camps.yaml ห้าม hardcode) + CampOutcome(pid/outcome/kill/handoffRaw/cliSessionId/cliVersion/logsPath/failure) ครบทั้ง briefChannel stdin|packet-file — ไม่ขาด
- schema ตรง data-model verbatim (packet 25 field / handoff 17 + securityGate, required/additionalProperties ครบ) · allowedStatesFor ตรงตาราง DES-018 (SA +NEEDS_REQUIREMENT_CHANGE — test ยืนยัน) · กฎ (1)–(7) ครบ; กฎ (5) ผูก state DONE (design ไม่มีเงื่อนไข) — R13 ใช้เฉพาะ DONE + schema บังคับ field มีอยู่แล้ว จึงไม่มีช่องโหว่ — รับ · กฎเสริมที่สอดคล้อง: taskIds ว่างเฉพาะ feature-qa/record-only (AC-041/R18), BLOCKED จำกัด type 4 ค่า (DES-018 §รูป blocker), readSections ปฏิเสธ absolute/traversal (fail-closed — DES-014)
- AC ต่อข้อกับ test จริง: AC-068 (schema พังไม่รันกฎ + นอก 7 ค่า/นอกชุด kind) · AC-062 · AC-050 · AC-054 (command ซ้ำ + perTask ครบ 2 ทาง) · AC-058 · AC-055 (field ขาด/tp ผิดรูป/task null เฉพาะ featureQa) · AC-033 (conversation/taskId v1 ปฏิเสธ) · fake adapter dispatch→handoffProblems — ครบทุกข้อ

**BE-008 — ตัดสินการตีความ 5 จุด: ตรง design ทั้งหมด (ยกเว้น REV-039/040)**
- แยก kind `write` (universal deny/deny/นอก allow — AC-007/052/060) vs `unclaimed-write` (ใน allow นอก claim — DES-021 ข้อ 4) — ละเอียดกว่าข้อความ design ที่ทับกัน ผล R2 เหมือนเดิม — รับ
- status-write ครบ: แก้ค่าแถวเดิมทุก role (รวม qa-engineer) · แถวใหม่โดย non-PM · PM แถวใหม่ไม่ pending · ค่านอก pending|verified|blocked · ลบ plan/index.md · journal ครอบ (path+hash ตรง) ข้ามทั้งไฟล์ — hash ไม่ตรงยังโดน (test ยืนยันทั้งสองทาง) · (ลบแถว → REV-040)
- claim หลายราก "สะอาด" — resolve กับ codeRoots→docsRoot→packRoot ผู้สมัครใดสะอาดพอผ่าน; จุดเขียนจริงถูกตัดสินอีกชั้นตอน finish (attribution) — ไม่มีรูรั่ว
- mode git เมื่อทุก root git และไม่มี fallback; root ใด fallback/manifest → session เป็น manifest + partial (ค่าเดียวตาม data-model — conservative ตรง DES-006 repo เสียกลาง run)
- journal ก่อน universal deny (state/ ของ orchestrator อยู่ใต้ deny) + GitRunner seam — ลำดับต่าง design เล็กน้อย (journal/other-claim มาก่อน own-claim) แต่ scheduler กัน claim ทับแล้ว และ journal-first กันนับงาน orchestrator เป็น touchedFiles — รับ
- attribution 5 ขั้นครบ · glob แปลงต่อ docsLayout (module/ prefix — `patternBases:119-124`) · git read-only argv array ไม่มี shell (spawnSync `:48` เท่านั้น — ตรวจโค้ดทั้งไฟล์) · ไม่ auto-revert · ข้อจำกัด B ตาม design (ไฟล์ใต้ claim อื่น active ข้าม — `:550`)
- AC ต่อข้อกับ test จริง: AC-007/052 (reviewer แตะ codeRoots → kind write) · AC-043 (สอง session attribution ถูก) · AC-060 (test-planner 2 path) · AC-073 (qa แก้ Status / PM แถวใหม่ pending ผ่าน / ค่านอกชุด / ลบแถว fail-closed) · AC-066 (snapshot persist รอด restart) · journal ไม่ violation — ครบ (18 test บน tmpdir) · ยกเว้นกิ่ง git diff HEAD ไม่มี test (REV-039)

**Evidence จาก driver สอดคล้องโค้ด:** BE-006 ประกอบ packet จริงของ BE-006 เอง (readSections 15 ไฟล์, packetProblems ว่าง, role prompt hash จริง) — ตรง CFG ของ loader ที่ round-14 ยืนยัน · BE-008 git ls-files argv-array บน repo จริง 42 ไฟล์ + snapshot/pre-image ทำงาน + changed 0 → violations 0 — ตรงกิ่ง git mode

ไม่ได้ review: รัน `npm test` เอง (evidence ของ driver) · `qa\`/`security.md`

## Reviewed

- `plan\be-006.md` · `plan\be-008.md` · `design\index.md` · `design\des-006.md` · `design\des-012.md` · `design\des-003.md` · `design\des-020.md` · `design\des-021.md` · `design\des-018.md` · `design\data-model.md`
- `requirement\req-003.md` · `req-010.md` · `req-011.md` · `req-013.md` · `req-015.md` · `req-016.md` · `req-017.md` · `req-018.md` · `req-019.md` · `req-020.md` · `req-021.md`
- `code\agent-team\src\core\contract\types.ts` (ครบ) · `schema.ts` (ครบ) · `validate.ts` (ครบ) · `packet-builder.ts` (ครบ) · `camp-adapter.ts` (ครบ) · `test\contract.test.ts` (ครบ)
- `src\core\session-audit.ts` (ครบ) · `test\session-audit.test.ts` (ครบ)
- dependencies ที่อ้าง: `src\core\state-store.ts` (ครบ) · `src\core\knowledge-paths.ts` (ครบ) · `src\core\plan-parser.ts` (ครบ) · `src\core\config.ts` (grep section ที่เกี่ยว)
- `review\index.md` · `review\round-14.md` · `code\templates\review-round.md` · `code\.claude\agents\reviewer.md` · `code\AGENTS.md`

## Handoff

- Verdict: **BE-006 PASS** (ตีความ 5 จุดตรง design, กฎ 1–7 + schema ครบ) · **BE-008 FAIL** — REV-039 Important: กิ่ง `git diff HEAD` ไม่ตั้ง `diffApprox: true` ขัด DES-021 ข้อ 6 + ไฟล์ใหม่ (untracked) หลุดจาก diff.patch + กิ่งไม่มี test — fix round 1 ของ backend-engineer
- Findings ใหม่: REV-039 (Important — backend-engineer, open) · REV-037/038 (Minor → backlog — backend-engineer) · REV-040 (Minor → backlog — contract gap ให้ system-analyst pin)
- Security: ไม่มี security finding Critical/Important — ไม่ขวาง security stage ของ phase 3 (guard injection ตรวจแล้วตรง DES-012)
- Blockers: REV-039 ขวาง BE-008 เข้า QA เท่านั้น · Next: engineer แก้ REV-039 → reviewer resolve (อ่าน fix ก่อนปิด) → driver ส่งเข้า QA แล้ว build ตัวถัดไปของเวฟ B ต่อได้ (BE-006 PASS ไม่ขวาง task ที่พึ่ง contract)

## Change Log

- 2026-10-06 — Round 15 — BE-006 PASS · BE-008 FAIL (REV-039 Important) · เพิ่ม REV-037…040 (REV-039 open · ที่เหลือ Minor → backlog)

Back-links: `plan\index.md` · `..\index.md`
