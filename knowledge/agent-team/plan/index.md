# agent-team — Plan

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (DES-014) → ไฟล์ย่อย 27 ตัว (1 task ต่อ 1 ไฟล์; +BE-016, BE-017, SETUP-006 วันที่ 2026-10-05) median ≈ 2.0 KB (ประมาณ — driver วัด) → budget ≈ 2.0×0.75×27+2 ≈ 42.5 KB (ถ้า median คงเดิม 1.73 KB → ≈ 37.0 KB) · unit: task ≤ 4 KB ต่อไฟล์ (DES-014) · เขียนโดย `project-manager` — คอลัมน์ Status ในตาราง Tasks ให้ `qa-engineer` เขียนเท่านั้น (`pending` ตั้งโดย PM · `verified`/`blocked` โดย qa)
> วิธีอ่าน: เปิดเฉพาะไฟล์ task ที่ packet ระบุ — ตาราง Tasks ด้านล่างคือแหล่งสถานะเดียว · กลับไปสารบัญหลักที่ `..\index.md`

## Release Scope

**Release:** R1 — ยืนยันโดย ผู้ใช้ 2026-10-04 (ผ่าน `requirement\scope.md` §Release Scope)
**อยู่ใน release:** REQ-001…008 · AC-001…024 · DES-001…015 · tasks: SETUP-001…005, BE-001…015, FE-001, QA-001…002, DEVOPS-001
**เสนอเข้า R1 — รอผู้ใช้ยืนยัน (Waiting on Human #8, ยังไม่ยืนยัน):** REQ-009 · AC-025…032 · DES-016, DES-017 (+ ส่วน Rev 9 ของ DES-006/009/012/013/015) · tasks ใหม่ BE-016, BE-017, SETUP-006 + ส่วนที่ป้าย "(REQ-009)" ใน BE-006/007/008/011/012/015, FE-001, SETUP-005, QA-001/002 · ถ้ารับ: Done เพิ่ม AC-025…032 ผ่านใน QA-001/QA-002 · ถ้าไม่รับ: task ใหม่ → `backlog.md` และถอดส่วนที่ป้าย "(REQ-009)" ออก
**Done เมื่อ:** QA-001 ผ่าน — orchestrator รัน pipeline จริงครบ 1 module ทดสอบ (งานใหม่ส่งถึง business-analyst แล้วเดิน process ต่อจนถึง human gate และวิ่งต่อหลังตอบ) + smoke test จริงครบ 3 camp และ QA-002 ผ่าน — solo mode เปิดได้ครบ 4 agents (claude, codex, antigravity, zcode) · deploy.md มี runbook · ผู้ใช้ยอมรับมอบบนเครื่อง local (ระบบ local ไม่มี deploy environment ภายนอก)
ของที่ไม่อยู่ในรายการนี้ไปอยู่ `backlog.md` — ย้ายเข้ามาได้เฉพาะเมื่อผู้ใช้สั่ง

## Waiting on Human

| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |
|---|---|---|---|---|
| 1 | ตำแหน่ง + สิทธิ์เขียนไฟล์จุดเข้า solo mode (`AGENTS.md`) — PM เสนอราก `rong-ngang` (ไม่แตะ sta2, อยู่ในขอบ audit ของโปรเจกต์) แต่ DES-013 Evidence ระบุ "ราก sta2"; ทั้งสองตำแหน่งอยู่นอก writePaths ปัจจุบันของทุก role จึงต้องเพิ่ม allow ใน routing.yaml (config คนเป็นเจ้าของ) หรือผู้ใช้เขียนไฟล์เอง | **ตอบแล้ว 2026-10-04 โดยผู้ใช้: (a) ราก `rong-ngang` + เพิ่ม allow ใน routing.yaml** — design จะแก้ตาม (DES-013 Rev 6) | ผู้ใช้ | — |
| 2 | สำเนา role prompt เก่าที่ `~\.gemini\config\agents\<role>\agent.md` — อยู่นอกขอบเขตเขียนของทุก role; DES-013 ตัดสินแล้วว่าไม่ใช้เป็นจุดเข้า (เป็นสำเนา ขัด AC-023) จึงไม่ขวางงาน แต่ควรตัดสินชะตาไฟล์ | **ตอบแล้ว 2026-10-04 โดยผู้ใช้: backup แล้วลบ** — อนุมัติ setup role ดำเนินการ (one-time exception) รวมใน SETUP-003: คัดลอก `~\.gemini\config\agents\` ไป `~\.gemini\config\agents-backup-<date>\` ก่อนลบโฟลเดอร์เดิม | ผู้ใช้ | — |
| 3 | ยืนยันชื่อ/ชนิด field สวิตช์ (gate 2): `gituse` boolean optional ที่ knowledge + target (ข้อเสนอ SA — DES-015) หรือชื่ออื่น เช่น `gitCommit` | (a) `gituse` boolean optional ตาม DES-015 · (b) ชื่อ/ชนิดอื่น — SA แก้ DES-015/017 + data-model ก่อน | ผู้ใช้ | **ยังไม่ตอบ** — BE-016, SETUP-006, SETUP-005/BE-015/FE-001 (ส่วน REQ-009) |
| 4 | ค่า `gituse` เป็น `null`/non-boolean หรือมี key `git` ค้าง → ปฏิเสธ run (fail-closed ตาม DES-015) | (a) ปฏิเสธ run พร้อม JSON path ตาม DES-015 · (b) ทางอื่น (เช่น ถือว่าไม่ตั้ง) — SA แก้ DES-015 | ผู้ใช้ | **ยังไม่ตอบ** — BE-016 |
| 5 | ถอด `git add`/`git commit` ออกจาก deny ใน `code\.claude\settings.json` (Bash + PowerShell, คงรายการอื่น) หรือไม่ — ไม่ถอด = สวิตช์เปิดไม่มีผลใน claude/zcode (DES-016 Compatibility) | (a) ถอด → PM เพิ่ม task setup แยกหลังได้คำตอบ (ยังไม่สร้าง) · (b) ไม่ถอด → ประกาศข้อจำกัดใน `AGENTS.md`; AC-030 ใน claude/zcode ไม่ครบ | ผู้ใช้ | **ยังไม่ตอบ** — SETUP-006 (Risk), BE-012 (ผลจริง), QA-001/QA-002 |
| 6 | กติกาที่ design เสนอ: ห้าม `commit --amend` และ `git add -A`/`.` · "run" ใน solo = ขับ pipeline หนึ่งครั้งตามคำสั่งผู้ใช้จนหยุดที่ gate/จบ (DES-016) · setup prompt ไม่เขียน `gituse` (DES-015) | (a) รับตาม design · (b) แก้ข้อใด — SA amend | ผู้ใช้ | **ยังไม่ตอบ** — SETUP-006, BE-006 (ประโยคบรีฟ), SETUP-005 |
| 7 | risks #14: target `code/agent-team` ชน universal deny `code/agent-team/**` (DES-006) → engineer เขียน codeRoots ไม่ได้ใน orchestrated run — ตัดสินแยกจาก REQ-009 | (a) ข้อยกเว้นเฉพาะ target นี้ (SA กำหนดรูป) · (b) build orchestrator แบบ solo เท่านั้น · (c) อื่น | ผู้ใช้ | **ยังไม่ตอบ** — BE-008 (รายการ deny), QA-001 ถ้าใช้ target นี้ |
| 8 | **Release scope (gate 7):** REQ-009 / DES-016 / DES-017 + BE-016, BE-017, SETUP-006 (+ ส่วน "(REQ-009)" ใน task เดิม) = ขยาย R1 ที่ freeze 2026-10-04 — ผู้ใช้ขอในเซสชัน 2026-10-05 แต่ยังไม่ได้ยืนยันว่าเข้า R1 | (a) เข้า R1 · (b) R ถัดไป — task ใหม่ → `backlog.md`, ถอดส่วน "(REQ-009)" | ผู้ใช้ | **ยังไม่ตอบ** — ทุก task/ส่วนที่ป้าย REQ-009 |

## Phases

| Phase | ชื่อ | Tasks | หมายเหตุ |
|---|---|---|---|
| 1 | Setup และ config ตั้งต้น | SETUP-001, SETUP-002, BE-001, BE-016 | BE-016 (REQ-009) เสนอเข้า R1 — รอ Waiting on Human #3/#4/#8 |
| 2 | Core: ทรัพยากรและกติกาต่อ role | BE-002…005 | — |
| 3 | Core: contract, state, audit, gate, intake, driver | BE-006…011, BE-017 | 🔒 security gate — qa-engineer ตรวจด้าน security ของ BE-006 (DES-012), BE-010 (DES-010) และ BE-017 (DES-016 — AI กระทำ git บน repo ผู้ใช้) ด้วย |
| 4 | Camp adapters | BE-012…014 | — |
| 5 | Web UI + local API | BE-015, FE-001 | 🔒 security gate — qa-engineer ตรวจด้าน security ของ BE-015 (DES-009 Security) ด้วย |
| 6 | Solo mode pack และจุดเข้า | SETUP-003, SETUP-004, SETUP-005, SETUP-006 | SETUP-005 (setup prompt onboarding knowledge — DES-015) อยู่เฟสนี้เพราะเป็นงาน setup/onboarding ที่พึง SETUP-004 อย่างเดียว ไม่ใช่โค้ด orchestrator — ทำหลัง SETUP-004 และขนานกับ build ได้ (ดู Sequencing Notes) |
| 7 | End-to-end verify และ runbook | QA-001, QA-002, DEVOPS-001 | — |

## Tasks

| Task | ชื่อ | Owner | Phase | Status |
|---|---|---|---|---|
| SETUP-001 | Skeleton TypeScript package | setup | 1 | pending |
| SETUP-002 | git init ที่ราก rong-ngang + baseline commit | setup | 1 | pending |
| BE-001 | Config layer: 5 ไฟล์ yaml + config store + validator | backend-engineer | 1 | pending |
| BE-016 | Config: สวิตช์ `gituse` — validate + resolve + repo check → `gitPolicy` | backend-engineer | 1 | pending |
| BE-002 | Knowledge path + template resolver | backend-engineer | 2 | pending |
| BE-003 | Role prompt loader แหล่งเดียว | backend-engineer | 2 | pending |
| BE-004 | Tier engine port | backend-engineer | 2 | pending |
| BE-005 | Role routing role → camp | backend-engineer | 2 | pending |
| BE-006 | Contract: packet builder + handoff-v1 + CampAdapter | backend-engineer | 3 | pending |
| BE-007 | Run state store + resume | backend-engineer | 3 | pending |
| BE-008 | Write scope + post-run write audit | backend-engineer | 3 | pending |
| BE-009 | Gate trigger evaluation + GateRecord | backend-engineer | 3 | pending |
| BE-010 | Intake งานใหม่ → BA packet | backend-engineer | 3 | pending |
| BE-011 | Pipeline driver + stage state machine | backend-engineer | 3 | pending |
| BE-017 | Ref audit หลัง stage (DES-016 ชั้น 3) | backend-engineer | 3 | pending |
| BE-012 | Camp adapter: claude | backend-engineer | 4 | pending |
| BE-013 | Camp adapter: codex | backend-engineer | 4 | pending |
| BE-014 | Camp adapter: antigravity | backend-engineer | 4 | pending |
| BE-015 | Local API server + composition root | backend-engineer | 5 | pending |
| FE-001 | Dashboard UI 2 กรณี + หน้าตอบ gate | frontend-engineer | 5 | pending |
| SETUP-003 | จุดเข้า solo mode 4 agents + คู่มือ | setup | 6 | pending |
| SETUP-004 | Fork pack มาที่ `code\` (packRoot) | setup | 6 | pending |
| SETUP-005 | Setup prompt onboarding knowledge (DES-015) | setup | 6 | pending |
| SETUP-006 | `/gituse` + hard rule git แบบมีเงื่อนไขใน pack (DES-017) | setup | 6 | pending |
| QA-001 | E2E orchestrated + smoke ครบ 3 camp | qa-engineer | 7 | pending |
| QA-002 | E2E solo mode 4 agents + สลับโหมด | qa-engineer | 7 | pending |
| DEVOPS-001 | deploy.md runbook | devops | 7 | pending |

## Sequencing Notes

- **Critical path:** SETUP-001 → SETUP-002 → BE-001 → {BE-002, BE-003, BE-004, BE-005 — ขนานได้} → {BE-006, BE-007, BE-008} → BE-009 → BE-010 → BE-011 → BE-015 → FE-001 → QA-001 → {QA-002, DEVOPS-001}
- **REQ-009 (เสนอเข้า R1 — Waiting on Human #8, 2026-10-05):** BE-001 → BE-016 → {BE-006, BE-007, BE-008, BE-015} · BE-008 + BE-016 → BE-017 → BE-011 · BE-012 อ่าน `packet.gitPolicy` จาก BE-006 · SETUP-003 → SETUP-006 → QA-002 · BE-013/014 ไม่เปลี่ยน (codex/agy ใช้ชั้น 1 ผ่าน packet + ชั้น 3 ที่ driver) · **อย่าเริ่ม** BE-016/BE-017/SETUP-006 หรือส่วน "(REQ-009)" ใน task อื่นก่อนผู้ใช้ตอบ #8 และ #3/#4 (BE-016) · #6 (SETUP-006) — งานที่ไม่ติด REQ-009 (เช่น ตรวจ BE-001, SETUP-003) เดินต่อได้ · `.claude\settings.json` ไม่มี task จนกว่าผู้ใช้ตอบ #5
- BE-012…014 ขนานได้ทันทีหลัง BE-006 (แชร์ interface `CampAdapter`; BE-013/014 ใช้ base จาก BE-012) — ไม่ต้องรอ driver
- **backend ก่อน frontend:** FE-001 อ่าน contract ที่ BE-015 build แล้วจริง — ห้ามทำพร้อมกัน (`policies\agent-boundaries.md` §3)
- SETUP-003 พึง SETUP-001 + SETUP-004 เท่านั้น — Waiting on Human #1/#2 ปิดแล้ว (2026-10-04) จึงทำได้ก่อนถึง Phase 7; QA-002 ต้องมีทั้ง SETUP-003 และ orchestrated ที่ verified (AC-021 ทดสอบสลับสองทิศ)
- SETUP-004 ขนานได้ทุก phase (ไม่พึ่งโค้ด) แต่ BE-003 และ QA-002 ต้องมี pack จริงก่อน verify
- BE-001/BE-015/FE-001 อ้าง sta-config.json (DES-015 — machine-local ที่ `code\`, gitignored, orchestrator อ่านอย่างเดียว): BE-001 โหลด/validate + resolve docsRoot/codeRoots จากการเลือก knowledge→target · BE-015 เปิด `GET /api/config` คืนรายการ knowledge/target + start รับการเลือก knowledge→target→module · FE-001 เดิน UI ตามลำดับเดียวกัน — path ไม่มีจริง → ปฏิเสธ run (fail-closed)
- SETUP-005 ทำหลัง SETUP-004 (pack fork ที่ `code\` พร้อมแล้ว) — ขนานได้กับ build ทุกเฟส เพราะเขียนเฉพาะ `code\sta-config.json` (append) + โครง knowledge ไม่แตะโค้ด orchestrator
- task ย้ายโครงเอกสาร (requirement/design/plan split) ดำเนินการแล้วในเซสชัน 2026-10-05 ก่อน build ทั้งหมด — ไม่สร้าง task ย้อนหลัง
- งานทั้งแผนรันได้ทั้งแบบ solo (session สวม role ตามวิธีเดิมของ sta2) หรือ dogfood ผ่าน orchestrator เมื่อ BE-011 เสร็จ — ตัดสินโดยผู้ใช้ต่อ task
- ส่งยืนยัน SA (ความกำกวมที่ PM เจอใน design): (1) ตำแหน่งไฟล์จุดเข้า solo — **ตัดสินแล้ว 2026-10-04: ราก rong-ngang** (Waiting on Human #1 ปิด — design แก้ตามใน Rev 6); (2) DES-006 ยังไม่ระบุวิธีแยกไฟล์ที่ driver เองเขียน (run state, packets, logs) ออกจาก violations เมื่อ audit ใช้ git status — ให้ BE-008 ตัดสินพร้อมเหตุผลและเสนอ SA ยืนยัน; (3) universal deny `code/agent-team/**` ของ DES-006 ชนกับการให้ engineer แก้ orchestrator code เอง กรณีผู้ใช้เลือก dogfood ตอน build — ต้องมีข้อยกเว้นชัดก่อนรันผ่าน pipeline
- ห้าม renumber task id — task ใหม่ใช้ id ถัดไปของ prefix เดียวกัน

## Change Log

- 2026-10-04 — สร้าง plan จาก design Rev 5 (DES-001…013) + requirement REV ปัจจุบัน
- 2026-10-04 — ปิด Waiting on Human #1/#2 ตามคำตอบผู้ใช้: จุดเข้า solo = ราก `rong-ngang` · สำเนา `~\.gemini\config\agents\` = backup แล้วลบโดย setup role (รวมใน SETUP-003) — design แก้ตามใน Rev 6
- 2026-10-05 — ย้ายโครงเป็น split (DES-014): 1 task ต่อ 1 ไฟล์, status รวมที่ index นี้ (qa เขียนคอลัมน์ Status เท่านั้น) · เพิ่ม SETUP-004 (fork pack) · ปรับ BE-001/BE-003/SETUP-003 ตาม design Rev 7
- 2026-10-05 — ตาม design Rev 8 (DES-015): เพิ่ม SETUP-005 (setup prompt onboarding knowledge) · BE-001/BE-015/FE-001 ปรับตาม sta-config + เลือก knowledge→target→module · แก้ path pack → code\ ใน setup-003/004, be-003
- 2026-10-05 — ตาม REQ-009 + design Rev 9 (DES-006/009/012/013/015, ใหม่ DES-016/017): เพิ่ม BE-016 (gituse config — แยกจาก BE-001 ที่ build แล้ว), BE-017 (ref audit), SETUP-006 (`/gituse` + hard rule git) · แทรกส่วน "(REQ-009)" ใน be-001 (ตัวชี้), be-006, be-007, be-008, be-011, be-012, be-015, fe-001, setup-003 (ตัวชี้), setup-005, qa-001, qa-002 · Release Scope: เสนอเข้า R1 รอผู้ใช้ยืนยัน · Waiting on Human #3–#8 (ยังไม่ตอบ) · phase 3 🔒 ครอบ BE-017 · หัว budget คำนวณใหม่ 27 ไฟล์
