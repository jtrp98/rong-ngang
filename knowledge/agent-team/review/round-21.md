# agent-team — Review Round 21 — BE-013 + BE-014 (Camp adapter: codex / antigravity — phase 4)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · 1 round ต่อ 1 ไฟล์ · solo wave — ตรวจจาก artifact จริงทั้งไฟล์ · ไม่อ่าน `qa\`/`security.md`

## Findings

### REV-055 (ใหม่)

- **Severity:** Important (blocking)
- **Task:** — (ช่องว่าง plan ครอบ phase 4/5 — ไม่ใช่ความผิดของ BE-013/014)
- **Location:** `src/main.ts:90-93` + `src/core/driver.ts:962-963`
- **Problem:** adapters ใหม่ไม่มีจุด register — main.ts (composition root เดียวของ production ตอนนี้) register เฉพาะ ClaudeAdapter และ comment `main.ts:90` ยังว่า "R1 มี camp เดียว (claude)" ซึ่งเป็นเท็จแล้วหลัง BE-013/014 · routing.yaml ตั้ง camp = codex/agy → driver โยน DriverError "ไม่มี adapter ของ camp … ลงทะเบียน" ทันที → flow ของ phase 4 (`plan\index.md:32` "ย้าย role ไป codex/agy ใน routing.yaml → session ของ role นั้นรันครบวงจรบน camp นั้น") ที่ Feature QA phase 4 ต้องรันหลัง task verified (Sequencing Notes `plan\index.md:91`) FAIL แน่นอน · engineer ไม่แตะ main.ts = ถูกต้อง (main.ts ไม่อยู่ Write paths `be-013.md:17`/`be-014.md:17`) · `be-015.md:7,19` มี main.ts ใน Write paths + Goal "wire core ↔ camps ↔ server ที่ composition root" แต่ Scope ไม่เขียนชัดว่า register adapters ครบ 3 camp → เจ้าของ wiring เป็นนัย ไม่มีข้อความกำกับ
- **ตัวเลือก (PM ตัดสิน):** (ก) amend `be-015.md` — Scope เพิ่ม "register CodexAdapter/AntigravityAdapter ครบ 3 camp ที่ composition root main.ts + แก้ comment เก่า" และกำหนดลำดับว่า flow QA ของ phase 4 รอ BE-015 wiring (ข) amend Write paths ของ BE-013/014 เพิ่ม main.ts ให้ register ตอนนี้ (~2 บรรทัด + import) — ต้องแจ้ง PM ตาม `plan\index.md:81` · (ก) สอดคล้อง plan เดิมมากกว่า (BE-015 เป็น composition root ตาม Goal เดิม)
- **Reference:** `plan\index.md:32,81,91` · be-013.md:17 · be-014.md:17 · be-015.md:7,19 · DES-002 · AC-004
- **Owner:** project-manager (ตัดสิน + amend) → backend-engineer (แก้ตาม amend)

### REV-056 (ใหม่)

- **Severity:** Minor → backlog
- **Task:** BE-013
- **Location:** `src/camps/codex.ts:17-27`
- **Problem:** `pick` ของ codexOutputMeta ค้น `session_id`/`version` ชั้นบน + ซ้อนชั้นเดียวใน object ใด ๆ ของ event — event อื่นที่มี key ชนกัน (เช่น error payload มี `version` ของ protocol) ทำให้ค่าที่จด SessionRecord ผิดได้ (observability เท่านั้น ไม่กระทบ outcome · รูป field mark `inferred` รอยืนยัน QA-001 แล้ว) · hardening: จำกัด container ที่รู้จัก (เช่น `msg`) หรือ pin รูปจริงแล้วแก้ที่เดียวนี้
- **Reference:** DES-002 (codex JSONL — `inferred`)
- **Owner:** backend-engineer (หลังยืนยันรูปจริงที่ QA-001)

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-055 | Important | src/main.ts:90 | project-manager | open |
| REV-056 | Minor | src/camps/codex.ts:17 | backend-engineer | → backlog |

- REV-047…054 คงสถานะ → backlog ทุกรายการ (ตารางเต็มใน round-20.md — ไม่เปลี่ยน)

## Round 21

**Verdict:** FAIL

| Task | Verdict |
|---|---|
| BE-013 | PASS (ตรง AC ครบ — ไม่มี finding ของ task) |
| BE-014 | PASS (ตรง AC ครบ — ไม่มี finding ของ task) |

- รอบ FAIL เฉพาะจุด: REV-055 (Important — plan gap เจ้าของ PM ไม่ใช่ engineer) ขวาง flow QA ของ phase 4 · **ไม่ต้องแก้โค้ด BE-013/014** — ส่งกลับ engineer = เสีย fix round เปล่า · หลัง PM amend REV-055 แล้ว driver เดินต่อได้
- **BE-013** ตรง Acceptance ทุกข้อ: argv จาก camps.yaml จริงครบ DES-002 — exec · headlessArgs (--json --skip-git-repo-check --sandbox workspace-write --output-last-message placeholder) · `-C` · `-m` · `-c model_reasoning_effort=` (effortVia) · `--output-schema` = **path** (pin 2026-10-07) · positional บรีฟท้ายเสมอ (test :161,:179) · effort ผ่าน `-c` + null → ไม่ส่ง (test :197) · AC-033 ไม่มี resume/bypass ทุกเส้นทาง (test :189 + FORBIDDEN_ARGS `config.ts:41,560-562`) · handoff last-message ผ่าน schema (test :267) · timeout/kill-tree/retryOnCrash บนฐานร่วมเดียวกับ claude (test :319,:335,:352,:372,:386) · fail-closed ก่อน spawn (test :218 — extraDirs/toolRules ผิด contract → CampAdapterError, spawnFn ไม่ถูกเรียก) · AC-004 packet camp-agnostic (test :399) · สมมติฐาน JSONL session_id/version จด mark `inferred` ตรง DES-002 (`codex.ts:12-15`)
- **BE-014** ตรง Acceptance ทุกข้อ: argv ตาม camps.yaml — `-p --output-format json --sandbox` · `--model` · `--json-schema` = path · `--add-dir` repeatable (docsRoot+codeRoots ตาม DES-002) · `--log-file` เฉพาะ camp นี้ (test :162,:179,:206,:224) · effort=null ไม่ปรากฏใน argv (กติกา 3 — DES-004, test :179) · มีค่า → `--effort` (test :198) · AC-033 (test :216) · log ต่อ session = `sessions/<sid>/session.log` (test :224) · cliSessionId/cliVersion = null ตามจริง ไม่เดา (test :253 — DES-002 "agy ไม่ทราบ") · timeout/spawn fail เหมือน BE-012 (test :307,:323,:340,:360,:374) · AC-004 (test :387) · สมมติฐาน `--json-schema` = path + ไม่มี envelope จด mark ชัด (`antigravity.ts:33-41`) ตรง pin DES-002 2026-10-07 — ยืนยันจริงที่ QA-001 ตาม Risk ของ `be-014.md:39` · packet ไม่มีจริง → ปฏิเสธก่อน spawn (test :242)
- wiring (ประเด็นตัดสินพิเศษ): `main.ts:93` register เฉพาะ claude · `driver.ts:962-963` ปฏิเสธ camp ที่ไม่มี adapter (fail visibly ตาม comment) — พฤติกรรม fail-closed ถูกต้อง แต่ทำให้ flow phase 4 ยังเดินไม่ได้ → REV-055 (PM) · grep ยืนยันไม่มีจุด register อื่นใน src\
- Evidence จาก driver: `npm test` **324/324 ผ่าน** (BE-013 +17, BE-014 +18) — reviewer นับ `test(` จริงใน test\ ได้ **324 ตรง** (codex 17 · antigravity 18 · camp-claude 21 รวม test ของ fix QA-007/009 แล้ว) · ไม่รัน npm test เอง (ตามเดิม)

## Reviewed

- `src/camps/codex.ts` · `src/camps/antigravity.ts` (ทั้งไฟล์) · cross-check `src/camps/base.ts` · `src/camps/claude.ts` · `src/core/contract/camp-adapter.ts`
- `test/camp-codex.test.ts` (17 test) · `test/camp-antigravity.test.ts` (18 test) — นับ `test(` ทั้ง test\ = 324 (grep)
- wiring: `src/main.ts` · `src/core/driver.ts` (จุด dispatch) · `config/routing.yaml` · `config/camps.yaml` · `src/core/config.ts` (FORBIDDEN_ARGS/KNOWN_CAMPS — grep)
- เอกสาร: `plan\be-013.md` · `plan\be-014.md` · `plan\be-011.md` · `plan\be-015.md` · `plan\index.md` · `design\des-002.md` · `design\des-006.md` · `design\index.md` · `requirement\req-002.md` · `requirement\req-010.md` (grep AC) · `review\index.md` · `review\round-20.md`
- ไม่อ่าน `qa\` และ `security.md` — stay independent · ไม่รัน `npm test` · ไม่รัน git (ขอบเขตรอบ)

## Handoff

- **Verdict:** BE-013 **PASS** · BE-014 **PASS** — โค้ดตรง DES-002/camps.yaml + AC ครบ สมมติฐาน (codex JSONL `inferred` · agy schema path + ไม่มี envelope) จด mark ครบ · รอบ **FAIL** เฉพาะจุดเพราะ REV-055
- **REV-055** Important (open) — wiring: main.ts register เฉพาะ claude, flow phase 4 ยังเดินไม่ได้ — **ผู้ต้องแก้: project-manager** (เลือก amend be-015 หรือ grant main.ts ให้ BE-013/014) แล้ว backend-engineer แก้ตาม — **ห้ามส่งกลับ engineer โดยไม่มี amend**
- **REV-056** Minor → backlog (codexOutputMeta nested pick — backend-engineer หลัง QA-001)
- **Next:** PM ตัดสิน REV-055 → หลัง amend: QA phase 4 ตามลำดับที่แก้ + เดิน phase 5 (BE-010 → BE-015) / uxui draft

## Change Log

- 2026-10-07 — Round 21 — BE-013 PASS · BE-014 PASS · รอบ FAIL เฉพาะจุด (REV-055 Important — plan gap เจ้าของ PM · ไม่ใช่ finding ของ task) · เพิ่ม REV-056 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
