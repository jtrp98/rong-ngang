# agent-team — Feature QA — Phase 3 (รอบ 19 — ปิด QA-009)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · fixture `code\fixture-featureqa-p3\` (สร้าง/ทดสอบ/ลบแล้ว — 2026-10-07) · วันที่จากผู้ใช้: 2026-10-07

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| QA-010 | BE-019 | Important | open — R2 ไม่ครอบ kind ที่ไม่ใช่ execution (ครบ 3 รอบ FAIL — เข้า human gate) |

QA-009 ปิดแล้วรอบนี้ (ดู Round 19) · QA-007 ปิดแล้ว (Round 18) · QA-008 คง → backlog

## Round 19

**Status:** ❌ Failed

QA-009 ปิดจริง + ขาที่ถูกบล็อกรอบ 18 เดินจริงครบด้วย session จริงทั้งหมด (review wave → QA round → write-back → Feature QA → gate → kill-restart ×3) — แต่พบ defect ใหม่ QA-010 → FAIL · เป็นรอบที่ 3 ของ phase 3 → หยุดถามผู้ใช้ตาม finish rules (ไม่ fix ต่อเอง)

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` (agent-team) | pass 289/289 (round 18 = 283 — fix QA-009 +6 รวม unit 4 เคส `driver.test.ts:835–905`) |
| fixture sanity | `npx tsx` script เรียก loader/parser จริง | pass — plan v2, module issues 0, Write paths ครอบ backtick ครบทุก task |
| run 1 (shakeout) | `npx tsx src/main.ts fixture-featureqa-p3 fixture-featureqa-p3-target featureqa-p3 --date 2026-10-07` | r-…-140112 — 4 session จริง: EX เขียนเกิน claim → R2 hold จริง (audit จับครบ + suspects) · EX-004 คืน NEEDS_HUMAN → R12 gate จริง |
| run 2 | คำสั่งเดิม (fixture v2) | r-…-140719 — **AC-045: 3 EX dispatch พร้อมกันใน 47 ms** (startedAt 07:07:19.095/.121/.142, claim ต่างไฟล์) · review wave เปิด (solo) · reviewer จริง PASS → R3 · gate R12 |
| run 3 (ตัดสิน) | คำสั่งเดิม + `--resume` ×3 (kill driver กลาง run) | r-…-141611 — 15 session จริง: EX (serial) → review → QA → write-back → Feature QA → R19 cleared → EX-004 gate → **waiting-on-human gates=1** + stdout gate line, exit 0 |
| ตรวจ handoff | router.log ทั้ง run 3 | **R15 = 0 บรรทัด** — session.log = result envelope (`structured_output`) ทั้งหมด, driver unwrap ผ่านทุก session (ปิด QA-009) |

### Feature QA flows

| Flow | อ้าง | Result |
|---|---|---|
| session.log = envelope + driver ไม่ R15 | DES-002/012 | **pass — ปิด QA-009** (`extractHandoff` unwrap ต่อ camp `driver.ts:1333` + `claude.ts:67` · unit 4 เคส · live R15=0) |
| DAG parallel ใต้เพดาน | AC-045 | **pass** — run 2: 3 session เริ่มพร้อมกันใน 47 ms ใต้ cap 3, claim ต่างไฟล์ (บทเรียนรอบ 18 แก้แล้ว) |
| flow หลัง session จบ: review wave / QA round / write-back / Feature QA | DES-019 | **pass** — run 3: R1→wave→R3→R6 (Status verified) →R18→R19 anchor verified + phase 1 cleared · QA จริงรัน check เอง (`od -c notes-a/a.md` exit 0, logRef → qa/round-1.md) · เขียน qa/review round file + index จริง |
| Status write-back เฉพาะ cell | AC-073/DES-007 | pass — plan fixture: EX-001/002/003 + FQ-001 `pending→verified`, EX-004 คง pending (ไม่มีการแก้อื่น) |
| หยุดที่ gate + แจ้ง stdout · task ใน scope hold · นอก scope เดินต่อ | DES-008/AC-072/AC-013 | pass — R12 gate business-choice scope task EX-004 (owner jtrp98) จาก session จริง 2 ครั้ง · review/QA/write-back/Feature QA เดินต่อครบ · stdout: `gate business-choice เปิดรอคำตอบ (scope task 2) … ผู้ตัดสิน: jtrp98` |
| restart หลัง kill กลาง run | DES-007/AC-034 | pass (ฝั่ง resume) — kill driver 3 ครั้งกลาง qa/feature-qa/execution: orphan finalize `interrupted` → R16 (1/1) + priorSession → re-dispatch · งานที่เสร็จไม่ถูก dispatch ซ้ำ · เอกสารชนะ (Status cells คง verified) |
| R2 audit-violation hold ทุก suspect | DES-018 R2 + DES-021 §4 | **fail — QA-010** (ดู Issues Found) |

### perTask

Phase 3 tasks 13/13 คง `verified` (Feature QA ทดสอบ flow รวม — ไม่ re-verify) · plan fixture จบด้วย Status จริงจาก driver (4 verified + 1 pending)

### Data Model check

run.json 15 session (`sessions[]/tasks{}/phases{}`) บนดิสก์ตรง data-model · handoff ทุก session ผ่าน `handoffProblems` = 0 (ไม่มี R15)

### Issues Found

#### QA-010

- **Task:** BE-019 · **Severity:** Important
- **Expected:** DES-018 แถว R2 — trigger "audit violation" (ไม่จำกัด kind) → hold `audit-violation` ทุก suspect · DES-021 §4 — violation จาก session ใดก็ได้ → R2 (fail-closed) · BE-019 AC: ตาราง R1–R24 ครบ
- **Actual:** router ตรวจ `auditSuspects` เฉพาะ `case "execution"` + DONE (`router.ts:533`) — review/qa/feature-qa ที่เขียนนอก scope ผ่าน verdict ต่อทันที · live: run 3 s-13 (feature-qa) เขียน `target\notes-gate\gate-note.md` นอก role allow (violation kind `write` — AC-007) → ไม่มีบรรทัด R2 → R19 ตัดสิน FQ-001 verified + phase 1 cleared ต่อ · run 2 s-4 (reviewer) violation 2 รายการ → PASS ไหลผ่าน R3 (EX-003 รอดเพราะ R2 มาจาก event execution ของ s-0/s-1 โดยบังเอิญ)
- **Impact:** การรับประกัน "เขียนได้เฉพาะที่ role เป็นเจ้าของ" (BE-008) ไม่ครบ — session ฝั่งตรวจเขียนเกินแล้ว verdict ยังเดิน · violation ยังจดใน `writeAudit` แต่ fail-closed หัก
- **Reproduce:** run 3 r-20261007-141611 — router.log ไม่มี R2 หลัง s-13 · run.json `s-13.writeAudit.violations` = 1
- **จุดแก้ (ฝั่ง engineer):** เช็ค `auditSuspects` ก่อน switch (ครอบทุก kind) หรือเติมในแถว review/qa/feature-qa/security — ถ้าตั้งใจให้ R2 เฉพาะ execution ให้ `system-analyst` แก้ DES-018/DES-021 ก่อน (เอกสารปัจจุบันชี้ครบทุก kind)

#### หมายเหตุ fixture (ไม่เปิด QA id — ฝั่ง fixture/พฤติกรรม model)

- run 1–2: session จริงเขียนไฟล์ task อื่น (overreach) — ระบบจับครบด้วย audit + R2 (ถูกต้อง) · แก้ด้วย fixture v3: แยก subdir ต่อ task + Depends chain + wording ห้ามเขียนเกิน → run 3 สะอาด 14/15
- anchor ต้องมี Depends explicit กับ task ใน phase (แผนจริงทำอยู่แล้ว) — ไม่งั้น step `runnable` ค้าง → `remainingBusy` ไม่เป็น 0 → review wave ไม่เปิด (scheduler ถูกตาม DES-019 §4 — fixture ผิดรูป)

## Unverified Behaviour — undeployed phases

- `killOrphan` กับ **pid ที่ยังมีชีวิต** (`taskkill /PID /T /F` + winImageName guard): kill driver 3 ครั้งแต่ orphan claude (session ~20–30 วิ) ตายเองก่อน resume ทุกครั้ง → พิสูจน์เฉพาะ finalize ฝั่ง dead-orphan 3 ครั้ง · กิ่ง taskkill คง evidence unit (round 13/15/16)
- review wave รวมหลาย task ใน session เดียว (≤4): รอบนี้เปิด solo ทุกครั้ง (serial fixture) — คง evidence รอบ 17 (fake) + unit (round 15)
- codex/agy adapter (phase 4) · security stage 🔒 ของ phase จริง — คงสถานะ
- ค่าใช้จ่ายจริง: session จริง ~24 ตัวใน 3 run (sonnet ~$0.2–0.3 · opus ~$0.26–0.39 ต่อตัว — จาก `total_cost_usd` ใน session.log)
- ผลข้างมุม: claude.exe 18 process ของผู้ใช้เริ่มก่อนวันทดสอบ — ไม่ได้แตะ · ไม่มี process ค้างจากการทดสอบ

## Change Log

- 2026-10-07 — Round 19 — Feature QA — Phase 3 — ❌ Failed (qa:QA-009 **resolved** — R15=0 ทั้ง run จริง · qa:QA-010 ใหม่ Important เจ้าของ BE-019 — R2 ไม่ครอบ non-execution kind) · npm test 289/289 · ขาที่ถูกบล็อกรอบ 18 เดินจริงครบ (AC-045 / review wave / QA round / write-back / Feature QA / gate / kill-restart) · **ครบ 3 รอบ FAIL ของ phase 3 → human gate** · fixture ลบ + sta-config คืน byte-exact (sha256 ตรง) + state คืน .gitkeep · ต่อไป: รอคำตัดสินผู้ใช้ (ยอมรับ / ส่ง engineer แก้ QA-010 / re-scope)

Back-links: `plan\index.md` · `..\index.md`
