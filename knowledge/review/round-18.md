# agent-team — Review Round 18 — BE-009, BE-022

> Budget ≤ 10 KB · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim

## Findings

### REV-044

- **Severity:** Minor
- **Task:** BE-009
- **Location:** `src/core/gates.ts:214` (answerGate last-wins ต่อ gateId) · `:152-160` (dedupe เปิดซ้ำขณะ open) · `:201-203` (hold slot เดียว) · `src/core/state-store.ts:516-529` (reconcileRun §5 วนทุกแถว open)
- **Problem:** DES-008/data-model ไม่นิยามพฤติกรรมเมื่อ gate ครอบ task เดียวกันซ้อนหลาย instance — comment ที่ gates.ts:214/265 อ้าง "กติกาเดียวกับ reconcileRun §5" ไม่ตรงจริง (§5 วนทุกแถว open ไม่ใช่ last-wins) · (a) gateId เดียวกันเปิดซ้ำขณะยัง open (PM แก้ข้อความ Waiting on Human — ทางที่ test เองสร้างได้ `test/gates.test.ts:334-337`) → ตอบปิดแถวล่าสุด แถว open เก่าค้าง → resume §5 re-hold ต่อ แต่ openGateRecords/dispatchBlocker (last-wins) บอกไม่มี gate open — task ค้างโดย dashboard ไม่เห็น gate (ขัดแนว AC-072) (b) task ถูก 2 gate open ครอบ → openGate แทน hold.ref ด้วย gate ใหม่ → ตอบ gate ใหม่ปลด task ทั้งที่ gate เก่ายัง open (ช่องว่าง AC-013 จน reconcile รอบถัดไป) — กรณีปกติ (gate เดี่ยว) ถูกทั้งหมด
- **Reference:** DES-008 (AC-013, AC-072) · data-model (GateRecord) — contract gap: system-analyst pin กติกา multi-instance (last-wins ทั้งระบบ หรือห้ามเปิดซ้ำขณะ open) แล้ว engineer align (แก้ comment ที่ gates.ts:214/265 ตาม)

## Open Findings

| ID | Severity | path:line | Owner | Status (open/resolved/→ backlog) |
|---|---|---|---|---|
| REV-044 | Minor | `src/core/gates.ts:214` (+ `state-store.ts:516-529`) | system-analyst | → backlog |

## Round 18

**Verdict:** PASS

| Task | Verdict |
|---|---|
| BE-009 | PASS |
| BE-022 | PASS |

> ไม่มี Critical/Important · REV-044 Minor → backlog ตาม finish rules

**ตีความของ engineer — ตัดสินแล้ว:**

- **BE-009 ทั้ง 4 จุด ตรง design:** (1) append-only = lifecycle ของแถวเดียว open → answered — **ตัดสินว่าถูกต้อง**: reconcileRun §5 (`state-store.ts:505-529`) re-hold จาก "ทุกแถว open" — append-on-answer ทิ้งแถว open เดิม = งานโดน hold ซ้ำหลัง resume · data-model เตรียม field คำตอบ nullable ในแถวเดียวอยู่แล้ว · โค้ดไม่ลบแถว ไม่แก้เนื้อหา audit (คำถาม/owner/scope/taskIds — test ยืนยัน) ตอบได้เฉพาะ field คำตอบ = ตีความเดียวที่สอดคล้องทั้งระบบ + fail-closed (2) scope task/phase/module + dependents ตาม Depends + task นอก scope เดินต่อ (AC-072/AC-013) — ตรง DES-008 (openGate ตรวจ scope fail-closed · dependents ข้าม phase โดน hold · verified ไม่ hold ย้อน) (3) owner จาก gates.yaml เสมอ (AC-015) — gateOwner resolve `owner_default` ที่เดียว ค่าที่ agent เสนอใน handoff ไม่ถูกใช้ dedupe รวม owner ปัจจุบัน → แก้ config มีผล (4) gate 4 ค้างจน retry (AC-071/R22 — answerGate ข้าม qa-critical, dispatchBlocker ยังบล็อก) · AC-078 mapping SA none→2/1 (null→gate 1) ตรง R12 ทุกกิ่ง (`router.ts:381-385`) · doc trigger "ทั้งหมด"/ว่าง → module · record-only map 7 ตรง OQ-D3
- **BE-022 ทั้ง 5 จุด ตรง design:** (1) expectedCurrent เทียบ PlanRow จาก parse ปัจจุบัน (BE-018) — kill กลางเขียน (rename แล้ว) → resume replay เห็น cell เป็นค่าเป้าหมาย + expectedCurrent ตรง → no-op idempotent · null = ตอนตัดสินค่าผิดรูป → conflict fail-closed (2) 🔒 append เคร่งครัด — เติมท้าย cell หมายเหตุ ไม่ลบข้อความเดิม ("—" → "— 🔒 security gate") · มี 🔒 ที่ cell ใดก็ได้ → no-op ตรงนิยาม `locked` ของ parser (3) journal แยกจาก state-store — `<home>\state\runs\<runId>\status-journal.jsonl` ผ่าน param · hash จากการอ่านซ้ำเท่านั้น verify failed → ไม่ลง journal (4) no-op idempotent ทั้ง Status และ 🔒 — ไม่เขียนไฟล์ ไม่ลง journal (test ยืนยันไบต์เท่าเดิม) (5) ไม่มี legacy fallback — โครงไม่ตรง v2 → StatusWriterError fail-closed

**ตรวจเพิ่ม:** BE-009 — pure บน RunJson (structuredClone, ต้นฉบับไม่ถูกแตะ) · GateError fail-closed 6 kind gateLog ไม่ถูกแตะเมื่อ throw · dedupe ไม่ append ซ้ำแต่ hold ยัง apply กับ task ใหม่ · shouldWaitOnHuman ตรง DES-008 · gates.yaml จริง = data-model ครบ 7 จุด owner jtrp98 · BE-022 — byte-exact + EOL คงเดิม (splitKeepEol + cellSpan, test CRLF) · atomic tmp+rename + ลบซาก · per-row fail-closed แถว conflict ไม่บล็อกแถว applied (AC-056) · integration BE-008 สองทาง (journal → violations ว่าง; ไม่ส่ง journal → status-write) · claim `plan/**` 4 รูป → deferred ทั้งชุด · test fixture ทั้งหมดใน os.tmpdir ไม่แตะ plan/state จริง

**Evidence (จาก driver — ไม่ใช่การรันของ reviewer):** `npm test` 239/239 สะสม (BE-009 +12, BE-022 +12 — นับ test() ในไฟล์จริงตรง) · BE-009: gates.yaml จริง 7 จุด owner jtrp98 + openGate release-cut บน run จริง · BE-022: สำเนา plan จริงใน tmp — BE-019 pending→verified + 🔒 phase 4, `git diff --no-index` = 2 แถวเฉพาะ cell เป้าหมาย · ตรวจเอง: `plan\index.md` จริงมี `## Phases` (แถว phase 4) + `## Tasks` + คอลัมน์ Status ครบ ตรงสมมติฐานของ writer

## Reviewed

- `plan\be-009.md` · `plan\be-022.md` · `plan\be-007.md` (§reconcileRun cross-check)
- `design\des-008.md` · `des-007.md` · `des-005.md` (pin REV-033) · `des-018.md` · `design\data-model.md` (GateRecord, HandoffV2, gates.yaml) · `design\index.md`
- `requirement\req-006.md` (AC-013/014/015/016/072/078) · `req-021.md` (AC-071) · `req-011.md` (AC-073) · `req-016.md` (AC-056)
- `config\gates.yaml` (จริง)
- `src\core\gates.ts` · `test\gates.test.ts` · `src\core\status-writer.ts` · `test\status-writer.test.ts`
- Cross-check: `src\core\state-store.ts` (reconcileRun §5 :440-529, collectSecurityGates), `src\core\router.ts:377-386` (R12), `src\core\plan-parser.ts` (STATUS_VALUES, WaitingRow.blocks, splitRow), `src\core\session-audit.ts:247-259` (claimsOverlap), `plan\index.md` (รูปจริง)

## Change Log

- 2026-10-06 — Round 18 — PASS ทั้งสอง task (BE-009, BE-022) · ตีความ 9 จุดตรง design · เพิ่ม REV-044 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
