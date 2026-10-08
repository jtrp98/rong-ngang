# agent-team — Review Round 14 — BE-020 + BE-007

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · open findings ที่ยังไม่จบอยู่ในไฟล์รอบล่าสุดเท่านั้น

ตรวจ artifact จริง ณ 2026-10-06 — BE-020 (minimum context loader) · BE-007 (runtime state store v2 + resume reconcile) โหมด solo · `npm test` 99/99 เป็น evidence จาก driver (BE-020 +20, BE-007 +15 — นับ test() ในไฟล์จริงได้ 20/15 ตรง); ยืนยันด้วย Read โค้ด/test/dependencies จริงทั้งไฟล์ · ไม่อ่าน `qa\`/`security.md` — stay independent

## Findings

### REV-034

- **Severity:** Minor → backlog
- **Task:** BE-020 (contract gap)
- **Location:** `code\agent-team\src\core\context-loader.ts:523-538` · `design\des-019.md:20`
- **Problem:** fix session resolve `findings[].id` → finding → ไฟล์ round ของ qa/review หลุดเข้า `readSections` (test :251-266 ยืนยัน) ขัด DES-019 §Defect packet "fix session ได้ packet + task + REQ/DES เท่านั้น (**ไม่แนบ round file**)" — แต่ตรงกับ DES-020 Rev 11 ข้อ 1 + plan BE-020 Acceptance ("findings[].id → ตามชนิด field") เอกสารชนกันเอง โค้ดเลือกฝั่ง plan/DES-020 · ผู้ต้องแก้: `system-analyst` pin ก่อนเวฟที่ fix session เดินจริง (BE-019/BE-021)
- **Reference:** DES-019 §Defect packet · DES-020 ข้อ 1 · AC-046 (ไม่ break — round ที่ resolve เป็น round ที่เกี่ยวกับ defect)

### REV-035

- **Severity:** Minor → backlog
- **Task:** BE-020 (contract gap)
- **Location:** `code\agent-team\src\core\context-loader.ts:255,552-554` · `design\des-019.md:21`
- **Problem:** feature-qa ได้ทั้ง TP ของ phase และ REQ/AC ที่ anchor อ้าง (union — test :222-232 assert ทั้งคู่เมื่อ phase มี TP) ขณะที่ DES-019 กำหนด "TP ของ phase (มี) **ไม่งั้น** REQ/AC ที่ task ใน phase อ้าง" = เลือกอย่างเดียว · superset เล็กน้อย ไม่ break AC (ทุกไฟล์มี ID อ้าง — เกณฑ์ "ห้ามเกินโดยไม่มี ID อ้าง" ยังผ่าน) · ผู้ต้องแก้: `system-analyst` pin
- **Reference:** DES-019 §Feature QA · DES-020 ตาราง context แถว feature-qa

### REV-036

- **Severity:** Minor → backlog
- **Task:** BE-020 (contract gap)
- **Location:** `code\agent-team\src\core\context-loader.ts:234-245` · `design\des-020.md:22-35`
- **Problem:** DES-018 ให้ uxui-designer เป็น kind `execution` แต่ตาราง context ของ DES-020 ไม่มีแถว uxui → `loadContext` throw context-error ทุก dispatch (fail-closed ถูกทาง แต่ orchestrated จะ hold uxui ทันทีเมื่อถึงขั้น UX) · ผู้ต้องแก้: `system-analyst` เพิ่มแถว uxui-designer ใน DES-020 แล้ว engineer ขยาย CFG
- **Reference:** DES-018 ตาราง state ต่อ kind (แถว execution มี uxui) · DES-020 ตาราง context

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

## Round 14

**Verdict:** PASS

| Task | Verdict |
|---|---|
| BE-020 | PASS |
| BE-007 | PASS |

**BE-020 (context loader — DES-020 Rev 11) — ตัดสิน 7 จุดที่ engineer ตัดสินเอง: ตรง design ทั้งหมด**
- ตาราง CFG ครบ 10 แถวตรง DES-020 (execution/ba/sa/pm/test-planner/review/qa/feature-qa/security/devops-stage) — readSections ตรงคอลัมน์ทุกแถว + test ครบทุกแถว; devops แยก stage (taskIds ว่าง) ↔ task (execution) ตรง brief
- ลำดับ resolve id ชนครบ 3 ข้อ Rev 11: (1) field มีชนิด = explicit คงอยู่นอก keep-list (:560-569) (2) token ตรงคอลัมน์ Task = task ก่อนเสมอ (:126) (3) รูปมีหมวดนำ span ถูกตัดจาก scan เปลือกนอก (:115-121) — test id ชนครบ: References `QA-001` → task · `qa:QA-001` → finding · `findings[].id` → finding
- fail-closed ครบ (AC-048): id ไม่เจอ / index ชี้ไฟล์ไม่มี / index parse ไม่ผ่าน / kind-role ไม่ตรง / task id ไม่อยู่ plan / UX 0 หรือ >1 ไฟล์ / AC ซ้ำหลาย REQ → context-error ระบุ id + index + readSections ว่าง — test ครบทุกกรณี
- regex: CATEGORY_ID (`\d{3}`) + prefixed form ตรง DES-020 เป๊ะ · TASK_TOKEN กว้างกว่า (`[A-Za-z][A-Za-z0-9]*-\d+`) แต่ตัดสินด้วยคอลัมน์ Task ของ plan เท่านั้น = "task id ตามคอลัมน์ Task" ตรง design (จับ DEVOPS-001 ได้ด้วย)
- OPTIONAL_INDEXES (oq/test-plan/review/qa) ข้ามเฉพาะไฟล์ index ทั้งหมวดที่ยังไม่มี (session แรกของ role เจ้าของ — comment :158-160) — การอ้าง id เข้าหมวดที่ไม่มีตารางยัง error ทุกกรณี (fallback DES-020 ไม่เดา path) · devops-stage ยังบังคับ qa round ล่าสุด
- record-only คืนว่าง (ตารางไม่มีแถว — ต่ำสุด สอดคล้อง DES-008 จด gate) · UX-NNN scan prefix deterministic (uxui ไม่มี index ใน DES-014) — "artifact ที่ sign แล้ว" เป็นหน้าที่ driver (gate 3 structural) ไม่ใช่ loader
- AC-046/047/048 + AC-042 (BA/SA/PM) + AC-033 + AC-035 test จริงครอบ (AC-035 = snapshot ไฟล์ module ไม่เปลี่ยน รันซ้ำได้ผลเดิม) · real-module test: BE-020 เอง 8 path ตรง References ครบ (ขัดกับ driver evidence ตรง)

**BE-007 (state store v2 — DES-007 + data-model §state) — ตัดสิน 6 จุดตีความ: ตรง design ทั้งหมด**
- atomic write (tmp + rename) ทุก transition + validate ก่อนเขียนทั้ง create/save — crash จำลองทิ้ง tmp ซากไม่กระทบ (test :112-124) · run.json เสีย parse/schema → `run.json.corrupt-<ts>` + ปฏิเสธ resume + ไม่ถูกสร้างทับ (:126-143) · saveRun ไม่ฟื้นของเสีย (missing)
- reconcile pure ตรง DES-007 §Resume: verified ใน plan ชนะ + ปลด hold ใด ๆ · plan blocked → held (hold `blocked` คง prevStep) · run ว่า verified แต่ plan pending → held `reopen-needed` · เพิ่ม task seed runnable/waiting-deps ตาม DES-001 (anchor ⇔ phase `cleared` — DES-019 + hook `depsSatisfied` ให้ driver) · task/phase ลด = ถอด (sessions[] คงประวัติ) · gate answered ปลดกลับ prevStep / open hold เฉพาะ scope (task/phase/module — AC-072) ไม่ทับ hold อื่น ไม่ hold ย้อน verified
- pointer เสีย → quarantine + null (derive ตัวนับเริ่ม 0 = ข้อจำกัดที่ design ประกาศ) · findOpenSessions ข้าม run เสียโดยไม่ quarantine ซ้ำ — เหตุผล comment :403 ถูก (quarantine เป็นของ loadRun/resume กันไฟล์ corrupt ซ้ำหลายฉบับ)
- phases{} + `handoff.securityGate` + counters อ่านกลับครบหลังปิด/เปิด (test :297-320) · AC-065: grep fixture เอกสาร 0 hits attempt/sessionId/fixRounds · AC-002/034 วงจรครบ · gitPolicy คง field ตาม data-model (derive = BL-017 ตาม plan)
- test ใช้ fixture `os.tmpdir` เสมอ — ไม่มี path เขียนเข้า `state\` จริง (ยืนยันทั้งไฟล์) · driver ยืนยันรันของจริงใน tmp แล้วลบ `state\` เหลือ .gitkeep

ไม่ได้ review: รัน `npm test` เอง (evidence ของ driver) · `qa\`/`security.md`

## Reviewed

- `plan\be-020.md` · `plan\be-007.md` · `design\index.md` · `design\des-020.md` · `design\des-007.md` · `design\des-012.md` · `design\des-014.md` · `design\des-018.md` · `design\des-019.md` · `design\data-model.md`
- `requirement\req-014.md` · `requirement\req-010.md` · `requirement\req-020.md`
- `code\agent-team\src\core\context-loader.ts` (ครบ) · `test\context-loader.test.ts` (ครบ) · `src\core\state-store.ts` (ครบ) · `test\state-store.test.ts` (ครบ)
- `src\core\plan-parser.ts` (ครบ) · `src\core\knowledge-paths.ts` (ครบ) — dependencies ที่ loader/store อ้าง
- `review\index.md` · `review\round-13.md` · `code\templates\review-round.md` · `code\.claude\agents\reviewer.md`

## Handoff

- Verdict: BE-020 PASS · BE-007 PASS — ไม่มี Critical/Important
- ใหม่: REV-034/035/036 (Minor → backlog — `system-analyst` pin contract 3 จุด: แหล่ง id ของ fix packet ชน DES-019 · feature-qa TP/REQ union · แถว uxui ใน DES-020)
- Blockers: ไม่มี · Next: driver ส่งเวฟ A ทั้งหมดเข้า qa-engineer

## Change Log

- 2026-10-06 — Round 14 — BE-020/BE-007 PASS · เพิ่ม REV-034…036 Minor → backlog (contract gap — system-analyst)

Back-links: `plan\index.md` · `..\index.md`
