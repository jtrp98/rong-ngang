# agent-team — Review Round 6 — BE-001 (Rev 10: `concurrency` → `scheduler` + `audit`, `FORBIDDEN_ARGS`)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

ตรวจใน clean session ตามคำสั่งเจ้าของ jtrp98 วันที่ 2026-10-06 · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\agent-team\` · session นี้ไม่มี shell จึงไม่ได้ดู git diff และไม่ได้รัน `npm test` · ตรวจจากไฟล์ปัจจุบันทั้งไฟล์

## Findings

### REV-018

- **Severity:** Minor → backlog
- **Task:** BE-001
- **Location:** `src/core/config.ts:41,559-564`
- **Problem:** ตรวจ `headlessArgs` ด้วย `args.includes(forbidden)` ซึ่งเทียบเฉพาะสมาชิกที่ตรงทั้งตัว ค่าต่อไปนี้จึงผ่านได้ (1) รูป `--resume=<id>` และ `--continue=…` ที่ CLI ส่วนใหญ่รับ (2) codex resume ที่ใส่ไว้ใน `subcommand` เช่น `subcommand: "exec resume"` หรือ `"resume"` เพราะ `:547` ตรวจแค่ว่าเป็น string (3) arg ที่ซ่อนใน `effortVia`/`toolRuleFlags` · อย่างไรก็ตาม plan `be-001.md:36` และ data-model §camps.yaml (`camps: # headlessArgs ห้ามมี --continue/--resume/resume`) กำหนดไว้แค่ 3 literal ใน `headlessArgs` และโค้ดก็ทำครบตามนั้น ช่องที่เหลือเป็นการป้องกันเกิน contract อีกทั้ง config เป็นของคนและระบบอ่านอย่างเดียว ส่วน AC-033 ยังตรวจซ้ำที่ระดับ packet/log ของ dispatch (`req-010.md:15`) จึงไม่ขวาง AC
- **Reference:** REQ-010 AC-033 · data-model §camps.yaml · ผู้ต้องแก้: `system-analyst` (ขยาย contract ให้ครอบรูป `=` และ `subcommand`) → `backend-engineer`

### REV-019

- **Severity:** Minor → backlog
- **Task:** BE-001
- **Location:** `src/core/config.ts:41`
- **Problem:** claude CLI มี short alias `-c` (= `--continue`) และ `-r` (= `--resume`) ซึ่ง `FORBIDDEN_ARGS` ไม่ครอบ แต่จะห้าม `-c` ทุก camp ไม่ได้ เพราะ codex ใช้ `-c` เป็น config override (`config/camps.yaml:20` `effortVia`) · รายการห้ามจึงต้องแยกตาม camp ซึ่ง design ยังไม่ได้กำหนด
- **Reference:** REQ-010 AC-033 · DES-002 · ผู้ต้องแก้: `system-analyst` (กำหนดรายการห้ามต่อ camp) → `backend-engineer`

### REV-020

- **Severity:** Minor → backlog
- **Task:** BE-001
- **Location:** `test/config.test.ts:184-190`
- **Problem:** test กรณี reject ครอบ concurrency, ขาด scheduler, ขาด audit, `maxParallelSessions` 0, `maxTasks` 0, `preimageMaxMB` -1 และ `crashRestartLimit` 1.5 และทุกกรณี assert `e.file` กับ path ใน message ไว้ครบ (`:197`) · ยังไม่มีกรณีของ `fixRoundLimit` < 0, `reviewWave.maxDiffLines`, `largeTask.diffLines`/`files`, `manifestIgnore` ที่ไม่ใช่ list และ key แปลกใน `scheduler` · โค้ดฝั่งนี้ (`config.ts:343-364`) ถูกต้องแล้วจากการอ่าน เหลือเพียงการล็อกด้วย test
- **Reference:** BE-001 Acceptance ("ผิดช่วง → ปฏิเสธ") · ผู้ต้องแก้: `backend-engineer`

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-018 | Minor | `src/core/config.ts:41,559-564` | system-analyst → backend-engineer | → backlog |
| REV-019 | Minor | `src/core/config.ts:41` | system-analyst → backend-engineer | → backlog |
| REV-020 | Minor | `test/config.test.ts:184-190` | backend-engineer | → backlog |

## Round 6

**Verdict:** PASS (ไม่มี finding Critical/Important)

| Task | Verdict |
|---|---|
| BE-001 | PASS |

- **ค่าตั้งต้นตรง data-model:** `config/registry.yaml:15-23` มี `scheduler` {3, 2, 1, reviewWave 4/800, largeTask 400/10} และ `audit` {`["node_modules/**", ".git/**"]`, 50} ตรงกับ data-model ทุกค่า · ค่าที่ data-model ระบุว่าเป็นสมมติฐานก็ติดป้าย `(สมมติฐาน — ยังไม่ยืนยัน)` · test `:58-66` ล็อกค่าเหล่านี้ไว้ และ assert ว่าไม่มี `concurrency`
- **ช่วงค่า int:** `config.ts:344-364` ตรงกับ data-model ทุก field ได้แก่ `maxParallelSessions` ≥1, `fixRoundLimit` ≥0, `crashRestartLimit` ≥0, `reviewWave.*` ≥1, `largeTask.*` ≥1, `preimageMaxMB` ≥0 และ `manifestIgnore` เป็น string[] · `expectInt` บังคับ `Number.isInteger` (`:262`) · `expectExactKeys` ทำงานทุกชั้น ชื่อ field จึงต้องตรงตัว
- **AC-045 (มี concurrency / ขาด / ผิดช่วง → ปฏิเสธพร้อม path):** `:323-325` ใส่ข้อความเฉพาะของ concurrency ไว้เป็น violation แรก (ก่อน exactKeys) · `ConfigError` ระบุ file:line:col (`:149`) · test `:184-190` + `:197` assert `e.file` และ path ของไฟล์ ส่วน case ที่ยังขาดดู REV-020
- **AC-033 (`FORBIDDEN_ARGS`):** `:41` เพิ่ม `--continue`, `--resume`, `resume` และ `:559-564` ตรวจทุก camp · test `:181-183` ครอบทั้งสามกรณี · ช่องที่เกิน contract อยู่ใน REV-018/019 (Minor)
- **DES-007 `retryOnCrash`:** comment ที่ `config/camps.yaml:3` บอกว่า "spawn ไม่สำเร็จเท่านั้น" และ restart ใช้ `scheduler.crashRestartLimit` ตรงกับ `des-007.md:9`
- **DES-021:** `audit.manifestIgnore` และ `preimageMaxMB` ตรงกับชื่อที่ `des-021.md:10,26` ใช้
- **ไม่มี gituse/gitPolicy:** grep `config.ts` ไม่พบ · sta-config ยังรับเฉพาะ `name`/`path` (`:585,604`) ตาม Out of Scope (BL-014)
- **AC-010 / AC-015 / test เดิม:** test AC-010 (`:156-169`) และ test เดิมอื่นยังอยู่ครบ ไม่พบการลบหรือทำให้อ่อนลง · การแก้ owner ใน gates.yaml ไม่ต้องแก้โค้ด (`config.ts:510` ตรวจแค่ string) ซึ่งตรง AC-015
- **Scope:** ไฟล์ที่อ่านทั้ง 4 ไฟล์อยู่ใน Write paths · ไม่พบการแตะ sta2 หรือคำสั่ง git ในโค้ด · comment เป็น why-comment
- **ไม่ได้ review:** git diff (ยืนยันไม่ได้ว่าไม่มีไฟล์อื่นนอก Write paths เปลี่ยน) · ผลรัน `npm test` (session ไม่มี shell — ขอให้ qa-engineer ยืนยัน) · `routing.yaml`/`tiers.yaml`/`gates.yaml` และ `docs-validator.ts` (ไม่อยู่ในรายการให้อ่าน) · DES-002 (ไม่อยู่ในรายการให้อ่าน)

## Reviewed

- `knowledge\agent-team\review\index.md`, `review\round-5.md` (รูปแบบ), `plan\be-001.md`
- `requirement\req-004.md`, `req-006.md`, `req-010.md`, `req-013.md`, `req-020.md` (grep: AC-010/015/033/045/075)
- `design\data-model.md` (grep: scheduler/audit/retryOnCrash/gituse), `des-007.md`, `des-015.md` และ `des-021.md` (grep)
- `code\agent-team\src\core\config.ts`, `config\registry.yaml`, `config\camps.yaml`, `test\config.test.ts` (ทั้งไฟล์)

## Change Log

- 2026-10-06 — Round 6 — BE-001 PASS · REV-018…020 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
