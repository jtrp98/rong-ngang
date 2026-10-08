# agent-team — Review Round 19 — BE-011

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · 1 round ต่อ 1 ไฟล์ · open findings ปัจจุบันอยู่ไฟล์ล่าสุดเท่านั้น

## Findings

### REV-045

- **Severity:** Important (blocking)
- **Task:** BE-011
- **Location:** `src/main.ts:1-19` · ขัด `knowledge\agent-team\plan\be-011.md:20,30`
- **Problem:** main.ts ยังเป็น stub ของ SETUP-001 (SKELETON_MESSAGE) — Scope "entry terminal `src/main.ts` (knowledge→target→module, เริ่ม/resume, แจ้ง gate)" และ Expected Output "terminal entry ที่รัน module ทดสอบด้วย adapter จริง (BE-012) ได้" ไม่ถูกส่งมอบ · ตัดสินแล้วว่าการเลื่อนไป BE-015 **ไม่สอดคล้อง plan**: `be-015.md:7` "wire core ↔ camps ↔ server ที่ composition root (ต่อจาก terminal entry ของ BE-011)" สมมติว่า terminal entry มีอยู่แล้ว — BE-015 รับผิดชอบ wire server ไม่ใช่สร้าง CLI entry · ถอด main.ts ออกจาก Write paths ของ BE-011 โดยไม่มี amend ของ PM (be-011.md Change Log ไม่มีแถวนี้ — ขัด Sequencing Notes เรื่องแจ้ง handoff) · ผล: flow phase 3 "เริ่ม run module ทดสอบจาก terminal" (`plan\index.md:30`) ยังทำไม่ได้ → Feature QA phase 3 ตรวจ flow ตามคอลัมน์หมายเหตุไม่ได้ · แก้: backend-engineer ส่งมอบ terminal entry ใน BE-011 หรือถ้าเจ้าของยืนยันย้าย → PM amend be-011/be-015 ก่อน
- **Reference:** BE-011 Scope/Expected Output · DES-001 Goal ("เริ่ม/resume จาก terminal ไม่ต้องมี UI")

### REV-046

- **Severity:** Important (blocking)
- **Task:** BE-011
- **Location:** `src/core/scheduler.ts:171`
- **Problem:** reviewDispatches เรียง candidates ด้วย `taskId.localeCompare` — DES-019 §review wave ข้อ 3 กำหนด "ที่เหลือเรียงตามลำดับแถวในตาราง Tasks แล้ว pack ทีละตัว" · batching.ts:55-56 รออยู่แล้วว่า "driver ส่งมาตามลำดับ — ฟังก์ชันคงลำดับเดิม" (สัญญา BE-021 — round 17) · orderedRunnable/orderedResumable ใช้ row order ถูกต้อง เฉพาะ reviewDispatches เพี้ยน → เมื่อลำดับ id ไม่ตรงลำดับแถว องค์ประกอบ wave/ตัวที่โดนตัดเพดานต่างจาก design · แก้: ส่ง order (rowOrder) เข้า reviewDispatches แล้ว sort ตามก่อนเรียก batchReviewWaves
- **Reference:** DES-019 §Rule review wave ข้อ 3 · AC-051

### REV-047

- **Severity:** Minor → backlog
- **Task:** BE-011
- **Location:** `src/core/driver.ts:436`
- **Problem:** killOrphan fail-open — winImageName คืน null (tasklist ล้มเหลว/ผล INFO:) → เงื่อนไข `image !== null && !startsWith` ไม่ข้าม → kill โดยไม่ยืนยันชื่อ process ได้ ขัดเป้าหมาย guard "ชื่อ process ตรง `camps.<camp>.command`" · PID reuse ระหว่าง crash→resume เสี่ยง kill process แปลก · hardening: image === null → ข้าม kill + แจ้ง dashboard · พื้นที่ 🔒 phase 3 — security stage ควรอ่านด้วย
- **Reference:** DES-007 §Crash restart (kill `inferred`) · DES-018 §Severity

### REV-048

- **Severity:** Minor → backlog
- **Task:** BE-011
- **Location:** `src/core/driver.ts:403` vs `src/core/scheduler.ts:234`
- **Problem:** reconcileSatisfied ให้ anchor satisfied เมื่อ step verified (`|| rt?.step === "verified"`) ขัด `satisfied(anchor) ⇔ phase cleared` (DES-019 amendment Rev 12) ที่ scheduler.depsSatisfiedFull บังคับ — สอง implementation ไม่ตรงกัน · ผลจบตรงกันเพราะ applyR8 แก้กลับใน tick เดียวกัน แต่เป็นแหล่ง confusion/log รอบแรก · ให้ตรงกันทั้งคู่
- **Reference:** DES-019 §anchor · DES-001 §DAG scheduler

### REV-049

- **Severity:** Minor → backlog
- **Task:** BE-011
- **Location:** `src/core/driver.ts:713` + `src/core/router.ts:789`
- **Problem:** crash ผสมใน event เดียว (task หนึ่งครบ crashRestartLimit + อีก task ยัง under) → router ตั้ง `Decision.ruleId = "R17"` ขณะยัง dispatch ใหม่ให้ task ที่ under → toPending เช็ค `d.ruleId === "R16"` ไม่ผ่าน → re-dispatch ไม่มี priorSession.touchedFiles ขัด DES-018 R16 · เงื่อนไขแคบ (crashRestarts ต่างกันใน session เดียว — เกิดได้ใน review wave ประวัติต่างกัน) · แก้: key ที่ dispatch/เหตุการณ์ แทน ruleId ระดับ Decision
- **Reference:** DES-018 R16 ("session ใหม่ + priorSession.touchedFiles")

### REV-050

- **Severity:** Minor → backlog
- **Task:** BE-011
- **Location:** `src/core/driver.ts:1404`
- **Problem:** legacy plan ไม่มี ## Phases → `allCleared` ต้องการ phaseIds.length > 0 → run.status เข้า "completed" ไม่ได้ (task verified หมดแล้วจบด้วย idle) · DES-001 ไม่ได้นิยาม completed สำหรับ legacy — contract gap ให้ system-analyst pin (ยอมรับ idle หรือขยายเงื่อนไข)
- **Reference:** DES-001 §Inputs/Outputs (run status) · AC-074

### REV-051

- **Severity:** Minor → backlog
- **Task:** BE-011
- **Location:** `src/core/driver.ts:808-818` + `src/core/router.ts:258-264`
- **Problem:** เจ้าของ hold plan-error แบ่งกัน (router = ref `owner:*`/`multi-anchor` · driver = parser issue ของ BE-018) แต่ release loop ของ router (scanPlanError แบบ only=null) ปลด hold plan-error ของ driver ทุก plan-changed tick ที่ parser issue ยังอยู่ → applyParserIssueHolds re-hold ทันที — จบด้วย state เดิม แต่ churn (save 2 ครั้ง + log คู่ "ปลด/hold" ต่อ tick) · แก้: router ข้าม ref ที่ไม่ใช่ของตัวเอง (กติกาเดียวกับ routerOwnedRef ของ driver)
- **Reference:** DES-018 R24 · AC-079

### REV-052

- **Severity:** Minor → backlog
- **Task:** BE-011
- **Location:** `src/core/driver.ts:1081-1084`
- **Problem:** backfill `GateRecord.recordSessionId` ใช้แถวท้าย gateLog — ถ้ามี gate อื่นเปิดทีหลัง (แถวท้าย ≠ gate ที่เพิ่งตอบ) → เงียบ ไม่ backfill (OQ-D3) · แก้: หาย้อนหาแถว gateId ตรง (แบบเดียวกับ answerGate)
- **Reference:** DES-008 OQ-D3

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-045 | Important | src/main.ts:1 | backend-engineer | open |
| REV-046 | Important | src/core/scheduler.ts:171 | backend-engineer | open |
| REV-047 | Minor | src/core/driver.ts:436 | backend-engineer | → backlog |
| REV-048 | Minor | src/core/driver.ts:403 | backend-engineer | → backlog |
| REV-049 | Minor | src/core/driver.ts:713 | backend-engineer | → backlog |
| REV-050 | Minor | src/core/driver.ts:1404 | system-analyst | → backlog |
| REV-051 | Minor | src/core/driver.ts:808 | backend-engineer | → backlog |
| REV-052 | Minor | src/core/driver.ts:1081 | backend-engineer | → backlog |

## Round 19

**Verdict:** FAIL

| Task | Verdict |
|---|---|
| BE-011 | FAIL (REV-045/REV-046 Important open) |

- ตัดสินจุดพิเศษจาก handoff: (1) main.ts → REV-045 (2) ลำดับ pump + transitionRunStatus ตรง DES-001 — completed = verified ทุก task + cleared ทุก phase + ไม่มี active + ไม่มี gate open (`driver.ts:1396-1422`) · log ทุก transition ✓ (3) applyParserIssueHolds hold + dependents ทอด + ปลดเมื่อ plan แก้ ✓ (churn → REV-051) · planDirty/expectedCurrent รอบหลัง write-back ✓ (`driver.ts:761,769`) · featureQa "queued" กัน R18 ยิงซ้ำ ✓ (`driver.ts:631-640`) · priorSession ของ R16 ✓ (ขอบ → REV-049) (4) killOrphan = recovery ของ DES-007 — spawnSync เฉพาะ taskkill/tasklist (`driver.ts:441,461`) ไม่ spawn agent นอก adapter, ตรวจ image ก่อน kill (fail-open → REV-047), ไม่มี git, ไม่ถาม LLM ✓ (5) security surface: ไม่พบ Critical/Important ใหม่ — untrusted stdout ผ่าน extractHandoff → handoffProblems ก่อนใช้เสมอ (`driver.ts:1330-1361`) · spawn argv array + shell:false · REV-047 ส่ง security stage phase 3 อ่าน
- Cross-check กับ component verified (อ่าน export/จุดเรียกเท่านั้น): router — counters เป็น delta แล้ว driver บวก (`driver.ts:606-612`) ✓ · transitions[].hold key ตั้ง/ล้าง ✓ · R16 dispatch ✓ · batching — freeSlots(→dispatchCap)/remainingBusy/activeExecutions/tpReady คำนวณฝั่ง scheduler ✓ (ยกเว้นลำดับ wave → REV-046) · gates — ไม่แตะ run.status, transitionRunStatus เป็นของ driver ✓ · status-writer — expectedCurrent = PlanRow.status ตอน emit ✓, defer เมื่อ claim plan ✓ · state-store/session-audit — signature ตรงทุกจุดเรียก · camps/claude + camp-adapter — spawn เฉพาะผ่าน adapter.dispatch · retryOnCrash เป็นของ adapter ฝั่ง spawn; driver ตีความ failure:"spawn" คงเหลือเป็น R16 (ประกาศ ตีความ ไว้แล้ว — รับได้)
- AC ต่อ test: AC-043/044/045/037/039/040/041/042/062/064/066/067/074/075/003/079/080 + วงจรครบ test เดียว (AC-057/073/080) + gate AC-013/072/078 + R2/R20/gate 4 — ครบ Acceptance ของ BE-011 · นับ test ได้ 19 (driver) + 15 (scheduler) = 34 ตรง claim
- ไม่รัน `npm test` เอง (นอกขอบเขต role) — ยึด evidence ของ driver 273/273 (239 + 34 ใหม่) · "ไม่แตะ component เดิมแม้แต่บรรทัดเดียว" ตรวจด้วยจุดเรียกเทียบ export ทุกจุดที่อ่านได้ (ไม่มี git diff ให้เทียบ)
- ข้อสังเกตไม่แยก finding: comment `src/main.ts:2` ยังอ้าง "BE-001 จะแทนที่" (เก่า — wiring เป็นของ BE-011/BE-015) — แก้พร้อม REV-045

## Reviewed

- `src/core/driver.ts` · `src/core/scheduler.ts` · `src/main.ts`
- `test/driver.test.ts` · `test/scheduler.test.ts`
- cross-check (export/จุดเรียก): `src/core/router.ts` · `src/core/batching.ts` · `src/core/gates.ts` · `src/core/status-writer.ts` · `src/core/state-store.ts` (export) · `src/core/session-audit.ts` (export) · `src/core/contract/camp-adapter.ts` · `src/camps/claude.ts` (จุด spawn/retryOnCrash)
- เอกสาร: `plan\be-011.md` · `plan\be-015.md` · `plan\index.md` · `design\des-001.md` · `design\des-007.md` · `design\des-018.md` · `design\des-019.md` · `design\data-model.md` · `design\index.md` · `code\templates\review-round.md` · `review\index.md`
- ไม่อ่าน `qa\` และ `security.md` — stay independent

## Change Log

- 2026-10-07 — Round 19 — FAIL (BE-011) · REV-045/046 Important open · REV-047…052 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
