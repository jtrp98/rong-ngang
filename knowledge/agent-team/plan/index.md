# agent-team — Plan

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (DES-014) → ไฟล์ย่อย 33 ตัว (1 task ต่อ 1 ไฟล์ — replan 2026-10-05: +9 ใหม่, −3 ย้าย backlog · replan 2026-10-06 Rev 11/12: ไม่มีไฟล์เพิ่ม/ลด · +SETUP-009 2026-10-06 → 34 ไฟล์) median ≈ 3.0 KB (ประมาณ — driver วัด; รูป v2 8 หัวข้อใหญ่กว่าเดิม) → budget ≈ 3.0×0.75×34+2 ≈ 78 KB · unit: task ≤ 4 KB ต่อไฟล์ · 1 แถว = 1 บรรทัด · **plan v2** (DES-014) · เขียนโดย `project-manager` — **คอลัมน์ Status (OQ-14):** PM เขียน `pending` เฉพาะแถวใหม่ · `verified`/`blocked`: orchestrated = orchestrator คัดจาก verdict ของ qa-engineer · solo = qa-engineer
> วิธีอ่าน: เปิดเฉพาะไฟล์ task ที่ packet ระบุ — ตาราง Tasks ด้านล่างคือแหล่ง Owner/Phase/Depends/Status เดียว (task file ไม่มี Status) · กลับไปสารบัญหลักที่ `..\index.md`

## Release Scope

**Release:** R1 (ขยาย) — R1 ยืนยันโดย ผู้ใช้ 2026-10-04 · ขยาย REQ-010…021 เข้า R1 ยืนยันโดยเจ้าของ (jtrp98) 2026-10-05 (gate 7 — `requirement\scope.md` §Release Scope) · REQ-009 → release ถัดไป ตามเจ้าของ (jtrp98) 2026-10-05
**อยู่ใน release:** REQ-001…008, REQ-010…021 · AC-001…024, AC-033…080 (AC-079/080 = OQ-20 ใน REQ-011/015 — **ยืนยันโดยเจ้าของ jtrp98 2026-10-06** พร้อม phase 6/7) · DES-001…014, DES-015 (ส่วน sta-config — ไม่รวม `gituse`), DES-018…022 (DES-006/009/012/013 เฉพาะส่วนที่ไม่ใช่ REQ-009) · tasks: SETUP-001…005, SETUP-007, SETUP-008, SETUP-009 (BL-023/024/029/030 ดึงเข้า R1 — เจ้าของ jtrp98 2026-10-06), BE-001…015, BE-018…023, FE-001, FE-002, QA-001, QA-002, DEVOPS-001
**ไม่อยู่ใน release (ไป release ถัดไป):** REQ-009 · AC-025…032 · DES-016, DES-017 + ส่วน `gituse` ของ DES-015 + ส่วน REQ-009 ใน DES-006/009/012/013 · tasks BE-016, BE-017, SETUP-006 และส่วน "(REQ-009)" ที่ถอดจาก task เดิม → `backlog.md` BL-013…018 (ข้อความเดิมตรงตัว §Archive)
**Done เมื่อ:** QA-001 ผ่าน (Feature QA phase 6) — orchestrator รัน pipeline จริงครบ 1 module ทดสอบ (งานใหม่ถึง business-analyst → change chain → DAG parallel → review wave → QA round → Feature QA → security stage → human gate และวิ่งต่อหลังตอบ) + AC ฝั่ง orchestrated ใน AC-033…080 ผ่าน + smoke จริงครบ 3 camp และ QA-002 ผ่าน (Feature QA phase 7) — solo mode ครบ 4 agents (claude, codex, antigravity, zcode) ด้วยรูปเอกสาร v2 + สลับโหมดสองทิศ · deploy.md มี runbook · ผู้ใช้ยอมรับมอบบนเครื่อง local (ไม่มี deploy environment ภายนอก)
ของที่ไม่อยู่ในรายการนี้ไปอยู่ `backlog.md` — ย้ายเข้ามาได้เฉพาะเมื่อผู้ใช้สั่ง

## Waiting on Human

| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |
|---|---|---|---|---|
| 9 | Feature QA phase 3 FAIL ครบ 3 รอบ (rounds 17–19) — qa:QA-010 (Important, BE-019): router ตรวจ `auditSuspects` เฉพาะ `case "execution"` (`router.ts:533`) ขัด DES-018 แถว R2 + DES-021 §4 ที่ให้ violation จาก session ใดก็ได้ → R2 hold — ผล: write violation ของ feature-qa/reviewer ไหลผ่าน ไม่ถูก hold (violation ยังจดใน writeAudit ตรวจย้อนหลังได้) | (ก) ส่งกลับ engineer แก้ QA-010 (BE-019) แล้ว QA รอบ 20 (ข) ยอมรับความเสี่ยง — บันทึก acceptance แล้ว QA-010 → backlog (ค) re-scope release | jtrp98 (เจ้าของ) | phase 3 clearance + 🔒 security stage · Feature QA รอบ 20 · (งาน phase 4/5 build ต่อได้ — ไม่ถูกขวาง) |

ไม่มีเรื่องค้าง ณ 2026-10-06 (replan Rev 11/12 ไม่มีคำถามใหม่ — G2-f/OQ-20 ปิดแล้วที่ design) · #1–#8 เดิมปิดแล้ว (#3–#6, #8: เจ้าของ jtrp98 เลือก "ไป release ถัดไป" 2026-10-05 · #7: build orchestrator แบบ solo ไม่แก้ deny — jtrp98 2026-10-05 · #1, #2: ผู้ใช้ 2026-10-04) — แถวเดิมตรงตัว → `..\backlog.md` §Archive C

## Phases

> phase = feature ที่ user flow จบในตัว (OQ-13) · Feature QA ของ phase เปิดเมื่อทุก task ใน phase เป็น `verified` (REQ-017) · คอลัมน์หมายเหตุ = flow ที่ Feature QA ทดสอบ
> Owner `qa-engineer` = anchor ของ Feature QA ของ phase **≤ 1 ต่อ phase** (DES-019, R24) · dependents ของ anchor = งานหลัง Feature QA (`satisfied(anchor)` ⇔ phase `cleared`) · ห้าม Owner `reviewer`/`security` (AC-079) — security = stage ท้าย phase 🔒 ไม่ใช่ task (AC-080)

| Phase | ชื่อ | Tasks | หมายเหตุ |
|---|---|---|---|
| 1 | Config + ตรวจเอกสาร v2 | SETUP-001, SETUP-002, BE-001, BE-002, BE-018 | flow: เจ้าของแก้ config/sta-config/plan → orchestrator โหลด + validate module จริง → ผ่าน หรือปฏิเสธพร้อม path/issue (plan legacy ถูกระบุ) |
| 2 | Pack v2 + solo mode | SETUP-004, SETUP-007, SETUP-008, SETUP-009, SETUP-003, SETUP-005 | flow: เปิด solo session ที่ `code\` → ขับ pipeline แบบ serial ด้วย template/prompt v2 · onboarding knowledge ใหม่ด้วย setup prompt |
| 3 | Orchestrated engine บน terminal (claude) | BE-003, BE-004, BE-005, BE-020, BE-006, BE-007, BE-008, BE-022, BE-019, BE-021, BE-009, BE-012, BE-011 | 🔒 security gate — BE-006 (prompt-injection guard), BE-008 (write audit), BE-011 (spawn), BE-022 (เขียน Status/🔒) · flow: เริ่ม run module ทดสอบจาก terminal → DAG parallel ใต้เพดาน → review wave → QA round → Status write-back → Feature QA → restart หลัง kill → หยุดที่ gate |
| 4 | Multi-camp | BE-013, BE-014 | flow: ย้าย role ไป codex/agy ใน routing.yaml → session ของ role นั้นรันครบวงจรบน camp นั้น |
| 5 | Web UI + dashboard ต่อ task | BE-010, BE-015, BE-023, FE-001, FE-002 | 🔒 security gate — BE-010 (untrusted input), BE-015 (DES-009 Security), BE-023 (retry/CSRF), FE-001/FE-002 (แสดงข้อความ untrusted) · flow: เปิด browser → งานใหม่ถึง BA / เลือกงานเดิม → เริ่ม → ดูงานต่อ task → ตอบ gate → retry |
| 6 | E2E orchestrated + smoke 3 camp | QA-001 | anchor QA-001 = Feature QA ของ phase นี้ (ไม่เปิดซ้ำ) · flow: run module ทดสอบจริงครบ pipeline บน 3 camp (รายละเอียดใน task) |
| 7 | Solo mode 4 agents + สลับโหมด + runbook | QA-002, DEVOPS-001 | anchor QA-002 = Feature QA ของ phase นี้ · DEVOPS-001 = dependent ของ anchor (หลัง phase `cleared`) · flow: solo session 4 agents → สลับโหมดสองทิศ → เดินตาม runbook |

## Tasks

| Task | Name | Owner | Phase | Depends | Status |
|---|---|---|---|---|---|
| SETUP-001 | Skeleton TypeScript package | setup | 1 | — | verified |
| SETUP-002 | git init ที่ราก rong-ngang + baseline commit | setup | 1 | SETUP-001 | verified |
| BE-001 | Config layer: 5 ไฟล์ yaml + sta-config + validator (`scheduler`/`audit`) | backend-engineer | 1 | SETUP-001 | verified |
| BE-002 | Knowledge path + template resolver | backend-engineer | 1 | BE-001 | verified |
| BE-018 | Plan v2 parser + docs validator v2 | backend-engineer | 1 | BE-001 | verified |
| SETUP-004 | Fork pack มาที่ `code\` (packRoot) | setup | 2 | — | verified |
| SETUP-007 | Pack: templates v2 + policies §1/§3 + CLAUDE.md | setup | 2 | SETUP-004 | verified |
| SETUP-008 | Pack: role prompts v2 | setup | 2 | SETUP-007 | verified |
| SETUP-009 | Pack: test-planner prompt ตรง DES-018/019/020 | setup | 2 | SETUP-008 | verified |
| SETUP-003 | จุดเข้า solo mode 4 agents + คู่มือ | setup | 2 | SETUP-001, SETUP-004 | verified |
| SETUP-005 | Setup prompt onboarding knowledge (DES-015) | setup | 2 | SETUP-004, SETUP-007, SETUP-003 | verified |
| BE-003 | Role prompt loader แหล่งเดียว | backend-engineer | 3 | BE-001, SETUP-004 | verified |
| BE-004 | Tier engine port | backend-engineer | 3 | BE-001 | verified |
| BE-005 | Role routing role → camp | backend-engineer | 3 | BE-001 | verified |
| BE-020 | Minimum context loader: ID → ไฟล์ | backend-engineer | 3 | BE-002, BE-018 | verified |
| BE-006 | Contract: packet v2 + handoff-v2 + CampAdapter | backend-engineer | 3 | BE-002, BE-003, BE-005, BE-020 | verified |
| BE-007 | Runtime state store v2 + resume reconcile | backend-engineer | 3 | BE-001, BE-002 | verified |
| BE-008 | Write scope + session audit (path claim) | backend-engineer | 3 | BE-001, BE-002, SETUP-002, BE-007, BE-018 | verified |
| BE-022 | Status write-back ของ orchestrator | backend-engineer | 3 | BE-007, BE-008, BE-018 | verified |
| BE-019 | Deterministic router R1–R24 + retry counter | backend-engineer | 3 | BE-001, BE-006, BE-007 | verified |
| BE-021 | Review wave · QA round · Feature QA · security stage · defect packet | backend-engineer | 3 | BE-006, BE-007, BE-008, BE-018 | verified |
| BE-009 | Gate trigger evaluation + GateRecord ต่อ scope | backend-engineer | 3 | BE-006, BE-007 | verified |
| BE-012 | Camp adapter: claude | backend-engineer | 3 | BE-006 | verified |
| BE-011 | Pipeline driver + DAG scheduler | backend-engineer | 3 | BE-004, BE-005, BE-006, BE-007, BE-008, BE-009, BE-018, BE-019, BE-020, BE-021, BE-022 | verified |
| BE-013 | Camp adapter: codex | backend-engineer | 4 | BE-006, BE-012 | verified |
| BE-014 | Camp adapter: antigravity | backend-engineer | 4 | BE-006, BE-012 | verified |
| BE-010 | Intake งานใหม่ → BA packet | backend-engineer | 5 | BE-006, BE-007, BE-009, BE-011 | pending |
| BE-015 | Local API server + composition root | backend-engineer | 5 | BE-010, BE-011 | pending |
| BE-023 | Task dashboard API + human retry | backend-engineer | 5 | BE-011, BE-015 | pending |
| FE-001 | Dashboard UI 2 กรณี + หน้าตอบ gate | frontend-engineer | 5 | BE-015 | pending |
| FE-002 | Dashboard ต่อ task + หน้า session + retry | frontend-engineer | 5 | BE-023, FE-001 | pending |
| QA-001 | E2E orchestrated + smoke ครบ 3 camp | qa-engineer | 6 | BE-011, BE-012, BE-013, BE-014, BE-015, BE-023, FE-001, FE-002, SETUP-009 | pending |
| QA-002 | E2E solo mode 4 agents + สลับโหมด | qa-engineer | 7 | SETUP-003, SETUP-008, QA-001 | pending |
| DEVOPS-001 | deploy.md runbook | devops | 7 | QA-001, QA-002 | pending |

## Sequencing Notes

- **Critical path:** SETUP-001 → BE-001 → {BE-002, BE-018} → BE-020 → BE-006 → {BE-019, BE-021, BE-009} (คู่ขนาน BE-007 → BE-008 → BE-022) → BE-011 → BE-010 → BE-015 → BE-023 → FE-002 (หลัง FE-001) → QA-001 (anchor phase 6 → phase 6 `cleared`) → QA-002 (anchor phase 7) → phase 7 `cleared` → DEVOPS-001
- **Phase 6/7 (replan 2026-10-06 — R24 `multi-anchor`):** QA-001/QA-002 เป็น Feature QA คนละ user flow (orchestrated / solo) จึงแยก phase แทนการรวม (รวม = task เดียวเกินงบ 4 KB และ id QA-002 ต้องทิ้ง) · ไม่มี deadlock: anchor ไม่มี task อื่นใน phase ให้รอ (DEVOPS-001 เป็น dependent ของ anchor จึงไม่อยู่ใน Depends โดยนัย — DES-019) · QA-002 รอ QA-001 = รอ phase 6 `cleared` · DEVOPS-001 รอ phase 7 `cleared`
- **วิธี build (risk #14 — เจ้าของ jtrp98 2026-10-05):** orchestrator นี้ build แบบ **solo mode เท่านั้น** (serial — driver สวม role ทีละ task) · **ห้ามวางแผน/รัน dogfood ผ่าน orchestrated run กับ target `code/agent-team`** · universal deny `code/agent-team/**` คงเดิม · QA-001 ใช้ knowledge/target ทดสอบแยก · บรรทัด `Write paths`/`Security-sensitive` ใน task file มีไว้ให้ plan เป็นรูป v2 ครบ (AC-036/038) และใช้กับ review แยก session — ไม่ได้แปลว่าจะรัน parallel ตอน build
- **Write paths** สัมพัทธ์ codeRoot `C:\src\AICode\rong-ngang\code\` (DES-021 claim) · ชื่อไฟล์เป็นข้อเสนอ PM — engineer เปลี่ยน/เพิ่มได้แต่ต้องแจ้งใน handoff ให้ PM amend · ไม่มี task ใดใช้ `Session group` (default ไม่รวม — OQ-12)
- **ทำ phase 2 (SETUP-007/008) ก่อน build phase 3 ถ้าทำได้** — solo build ใช้ template/prompt ชุดนี้ (ไม่ใช่ Depends เชิงโค้ด) · หลัง SETUP-007/008 driver ตัดสินเรื่อง sync pack ไป sta2 (`sta2\CLAUDE.md` — sync ตามคำสั่งเจ้าของ)
- **build แล้วตาม spec เดิม (Status ยัง `pending`):** SETUP-001, SETUP-002 (repo มีแล้ว), BE-001 (14 test), SETUP-004 (pack ที่ `code\`) — BE-001 เปิดงานใหม่ (breaking config, gate 2 ยืนยันแล้ว); BE-018 ต่อยอด `docs-validator.ts` · ที่เหลือยังไม่มีโค้ด (`design\index.md` §Impact)
- **ส่วน REQ-009 ใน design:** DES-006/009/012/013/015 ยังมีเนื้อหา REQ-009 (gitPolicy, ref audit, `gituse` UI) — engineer **ไม่ทำส่วนนั้น** (task ระบุใน Out of Scope) · `config.ts:555,574` (sta-config exact keys ไม่มี `gituse`) คงเดิม
- BE-012 ทำได้ทันทีหลัง BE-006 · BE-013/014 ใช้ base จาก BE-012 (phase 4 — ไม่ต้องรอ driver)
- **backend ก่อน frontend:** FE-001 อ่าน contract ที่ BE-015 build แล้วจริง · FE-002 อ่าน BE-023 — ห้ามทำพร้อมกัน (`policies\agent-boundaries.md` §3) · FE-002 ต่อจาก FE-001 (ไฟล์ `ui\` เดียวกัน)
- BE-010 กลับทิศ: พึ่ง BE-011 (intake เป็นทางเข้าเสริมของ driver) และย้ายไป phase 5 ให้ flow "งานใหม่ถึง BA" จบใน phase เดียวกับ UI
- SETUP-009 (phase 2) แก้ `test-planner.md` ไฟล์เดียวต่อจาก SETUP-008 · QA-001 Depends +SETUP-009 เพราะ module ทดสอบมี test-planner + TP (AC-059/061) · ฝั่ง `project-manager.md` ของ REV-007 ไม่อยู่ใน SETUP-009 (backlog BL-024)
- QA-002 ต้องมี SETUP-003 + SETUP-008 และ orchestrated ที่ verified (AC-021 สลับสองทิศ) · SETUP-005 ต่อจาก SETUP-003 เพราะเขียน `AGENTS.md` ไฟล์เดียวกัน
- sta-config.json (DES-015 — machine-local ที่ `code\`, orchestrator อ่านอย่างเดียว): BE-001 โหลด/validate + resolve · BE-015 `GET /api/config` + start รับ knowledge→target→module · FE-001 เดิน UI ตามลำดับเดียวกัน — path ไม่มีจริง → ปฏิเสธ run
- **Feature QA ใน solo build:** เมื่อทุก task ใน phase `verified` → qa-engineer รัน flow ในคอลัมน์หมายเหตุของ `## Phases` เขียน `qa\round-N.md` หัว `Feature QA — Phase <n>` (phase 6/7: รอบนี้คือ task anchor เอง) · phase ที่มี 🔒 (นิยาม DES-019 §Security stage) → security หลัง Feature QA PASS (REQ-017, AC-080) · task ที่เป็น dependent ของ anchor เริ่มหลัง phase `cleared`
- ~~ส่งยืนยัน SA~~ ปิดแล้วโดย design Rev 11/12: (1) task Owner `qa-engineer` = anchor → session kind `feature-qa` (DES-018/019) (2) task id ชน finding → ลำดับ resolve + รูป `qa:QA-NNN` (DES-020) — task id คงเดิม ไม่ renumber
- **Rev 11/12 ในโค้ด (task ที่ amend 2026-10-06):** BE-018 issue ระดับแถว AC-079/`multi-anchor` · BE-019 R1–R24 · BE-021 anchor + security stage · BE-011 `satisfied(anchor)` + hold R24 · BE-006 กฎ (7) `securityGate` · BE-022 🔒 write-back + reconcile · BE-020 ลำดับ resolve id ชน — Depends ไม่เปลี่ยน
- task ย้ายโครงเอกสาร (split) ทำแล้วในเซสชัน 2026-10-05 · plan นี้แปลงเป็น v2 โดย PM 2026-10-05 (OQ-15) — ไม่สร้าง task ย้อนหลัง
- ห้าม renumber task id — task ใหม่ใช้ id ถัดไปของ prefix เดียวกัน · BE-016, BE-017, SETUP-006 สงวน id ไว้ใน backlog (ไม่นำมาใช้ซ้ำ)

## Change Log

- 2026-10-04 — สร้าง plan จาก design Rev 5 (DES-001…013) + requirement REV ปัจจุบัน
- 2026-10-04 — ปิด Waiting on Human #1/#2 ตามคำตอบผู้ใช้: จุดเข้า solo = ราก `rong-ngang` · สำเนา `~\.gemini\config\agents\` = backup แล้วลบโดย setup role (รวมใน SETUP-003) — design แก้ตามใน Rev 6
- 2026-10-05 — ย้ายโครงเป็น split (DES-014): 1 task ต่อ 1 ไฟล์, status รวมที่ index นี้ (qa เขียนคอลัมน์ Status เท่านั้น) · เพิ่ม SETUP-004 (fork pack) · ปรับ BE-001/BE-003/SETUP-003 ตาม design Rev 7
- 2026-10-05 — ตาม design Rev 8 (DES-015): เพิ่ม SETUP-005 (setup prompt onboarding knowledge) · BE-001/BE-015/FE-001 ปรับตาม sta-config + เลือก knowledge→target→module · แก้ path pack → code\ ใน setup-003/004, be-003
- 2026-10-05 — ตาม REQ-009 + design Rev 9 (DES-006/009/012/013/015, ใหม่ DES-016/017): เพิ่ม BE-016 (gituse config — แยกจาก BE-001 ที่ build แล้ว), BE-017 (ref audit), SETUP-006 (`/gituse` + hard rule git) · แทรกส่วน "(REQ-009)" ใน be-001 (ตัวชี้), be-006, be-007, be-008, be-011, be-012, be-015, fe-001, setup-003 (ตัวชี้), setup-005, qa-001, qa-002 · Release Scope: เสนอเข้า R1 รอผู้ใช้ยืนยัน · Waiting on Human #3–#8 (ยังไม่ตอบ) · phase 3 🔒 ครอบ BE-017 · หัว budget คำนวณใหม่ 27 ไฟล์
- 2026-10-05 — **replan R1 ขยาย** (REQ-010…021 / AC-033…078 + design Rev 10) ตามเจ้าของ (jtrp98): แปลง index เป็น plan v2 (ตาราง `Task|Name|Owner|Phase|Depends|Status`, Depends ย้ายจาก task file มาที่นี่ — OQ-15) · ทุก task file เป็นรูป 8 หัวข้อ DES-014 ไม่มี Status + `Write paths`/`Security-sensitive` · ค่า Status เดิมไม่เปลี่ยน (ทุกแถว `pending`) · **ใหม่:** BE-018 (plan parser + validator v2), BE-019 (router), BE-020 (context loader), BE-021 (review/QA/Feature QA batching), BE-022 (Status write-back), BE-023 (task API + retry), FE-002 (dashboard ต่อ task), SETUP-007 (templates/policies/CLAUDE.md), SETUP-008 (role prompts) — แถวใหม่ `pending` · **แก้ตาม Rev 10:** BE-001 (`scheduler`/`audit`, FORBIDDEN_ARGS), BE-006 (packet v2/handoff-v2), BE-007 (runtime state v2), BE-008 (session audit path claim), BE-009 (gate scope, AC-078), BE-010/012/013/014/015, FE-001, SETUP-003/005, QA-001/002, DEVOPS-001 · **REQ-009 → release ถัดไป** (เจ้าของ jtrp98 2026-10-05): BE-016, BE-017, SETUP-006 + ส่วน "(REQ-009)" → `backlog.md` BL-013…018 ตรงตัว · Waiting on Human #3–#6, #8 ปิด (ไป release ถัดไป), #7 ปิด (build แบบ solo ไม่แก้ deny) — ตารางว่าง · phases ใหม่ 6 phase ตาม user flow (OQ-13) · 🔒 phase 3 (BE-006/008/011/022) และ phase 5 (BE-010/015/023, FE-001/002) · หัว budget 33 ไฟล์ (median ประมาณ — driver วัด)
- 2026-10-06 — replan ตาม design Rev 11/12 (G2-f, OQ-20 — เจ้าของ jtrp98 2026-10-05): **phase 6 แตกเป็น 6 (QA-001) + 7 (QA-002, DEVOPS-001)** — anchor ≤ 1 ต่อ phase (R24 `multi-anchor`) · Release Scope AC-033…078 → AC-033…080 (AC-079/080 ใน REQ-011/015 ที่อยู่ R1 แล้ว) · ชื่อแถว BE-019 (R1–R24), BE-021 (+security stage) · amend task: BE-006, BE-011 (ย่อ), BE-018, BE-019, BE-020, BE-021, BE-022, QA-001, QA-002, DEVOPS-001, SETUP-008 (amend ย้อนหลังหลัง verified — Write paths/Scope เท่านั้น) · ค่า Status ทุกแถวไม่เปลี่ยน · ไม่มี task ใหม่ · Depends ไม่เปลี่ยน (ไม่มีวง, ทุก id มีจริง) · Minor จาก review/qa → `backlog.md` BL-023…030 · Waiting on Human ยังว่าง
- 2026-10-06 — เจ้าของ (jtrp98) ยืนยัน Release Scope AC-033…080 + phase 6/7 · BL triage: ดึง BL-023/024/029/030 เข้า R1 เป็น **SETUP-009** ใหม่ (phase 2, Depends SETUP-008, แถว `pending`) · BL-025/026 → release ถัดไป · QA-001 Depends +SETUP-009 (ไม่มีวง) · amend BE-007 (`phases{}` + handoff `securityGate` ตาม DES-007/data-model), BE-022 (resume 🔒 ตาม DES-007), ย่อ SETUP-008 (driver วัด 4,295 B) · หัว budget 34 ไฟล์ · ค่า Status เดิมไม่เปลี่ยน
- 2026-10-06 — review round 7 (BE-002 PASS · BE-018 FAIL — REV-021 Important) · round 8 (BE-018 PASS — backend-engineer แก้ REV-021/022 ใน fix round 1 · test 43/43) · round 9 (SETUP-001 PASS · SETUP-002 PASS) · qa round 5 (BE-002/BE-018 ✅ + sync SETUP-009 `pending`→`verified` ตามหลักฐาน qa round 3 + review round 5 · แก้ REV-024 โดยเพิ่มแถว round 3 ใน qa\index.md) · qa round 6 (SETUP-001/002 ✅)
- 2026-10-06 — ผลลัพธ์: Status ในตาราง Tasks เปลี่ยนโดย qa-engineer 5 แถว — BE-002, BE-018, SETUP-009 (qa round 5) และ SETUP-001, SETUP-002 (qa round 6) `pending` → `verified` · phase 1 verified ครบ 5/5 · false positive two-way rule ของ validator แก้แล้วใน `docs-validator.ts` (REV-021) — เหลือ true issue 8 ตัวเป็นงบเอกสารเกิน → `backlog.md` BL-039…043 (REV-023/025/026/027/028 — Minor)
- 2026-10-06 — Phase 2 ปิดครบ: review round 10 (SETUP-004 PASS), round 11 (SETUP-003 PASS), round 12 (SETUP-005 PASS) · QA round 8 (SETUP-004 ✅), round 9 (SETUP-003 ✅), round 10 (SETUP-005 ✅) · build ใหม่โดย setup role: `code\AGENTS.md` (จุดเข้า solo 4 agents — SETUP-003) + `code\prompts\setup-knowledge.md` (SETUP-005) + backup-then-delete `~\.gemini\config\agents\` → `agents-backup-2026-10-06\` (ยืนยันเจ้าของ 2026-10-04)
- 2026-10-06 — Status เปลี่ยนโดย qa-engineer 3 แถว: SETUP-004, SETUP-003, SETUP-005 `pending` → `verified` · phase 2 verified ครบ 6/6 · **Feature QA — Phase 2 PASS** (qa round 11: เปิด solo session ตามคู่มือจริงทุกขั้น + onboarding fail-closed + วงจร task serial รูป v2 จบในตัว)
- 2026-10-07 — Phase 3 build ครบ: BE-012/019/021/009/022 verified (review 17–18 + QA 15) · BE-011 FAIL round 19 (REV-045/046 Important) → fix → PASS round 20 → verified (QA 16) — **phase 3 verified 13/13 2026-10-07** · system-analyst pin REV-033…036 แก้ des-005/019/020 (BE-020 เพิ่มแถว uxui ตาม REV-036)
- 2026-10-07 — Feature QA phase 3: round 17 FAIL (qa:QA-007 Important — `--json-schema` ส่ง path แต่ CLI รับ inline JSON; แก้แล้ว พิสูจน์ CLI จริง) · round 18 FAIL (qa:QA-009 Important — extractHandoff ไม่ unwrap `structured_output`; แก้แล้ว) · round 19 — QA-009 ปิด + pipeline จริงเดินครบ (15 session จริง: DAG ขนาน 47ms, wave, QA จริง, write-back เฉพาะ cell, gate แจ้ง, kill-restart) แต่เจอ qa:QA-010 Important (BE-019 — router เช็ค auditSuspects เฉพาะ execution ขัด DES-018 R2/DES-021) — **ครบ 3 รอบ → human gate (รอเจ้าของตัดสิน: แก้ / ยอมรับความเสี่ยง / re-scope)** — phase 3 ยังไม่ cleared, security stage ยังไม่เปิด
- 2026-10-07 — เพิ่ม Waiting on Human #9: ตัดสิน qa:QA-010 หลัง Feature QA phase 3 FAIL ครบ 3 รอบ (แก้ / ยอมรับความเสี่ยง / re-scope) — phase 3 ยังไม่ cleared
- 2026-10-07 — REV-055 (review round 21, Important — plan gap): PM ตัดสิน amend Write paths BE-013/014 +`src/main.ts` (เฉพาะส่วน register adapters + comment) ให้ register codex/agy ที่ composition root ตอนนี้ — คงลำดับ phase (flow QA ของ phase 4 ต้องมี wiring ก่อน; ตัวเลือกเลื่อนไป BE-015 = phase 4 รอ phase 5 กลับลำดับ) · BE-015 คงเดิม (wire server ภายหลัง) · ต่อไป: backend-engineer แก้ wiring → reviewer resolve REV-055
