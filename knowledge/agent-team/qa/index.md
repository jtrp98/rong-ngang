# agent-team — QA Index

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` · 1 แถว = 1 บรรทัด
> วิธีอ่าน: หา QA id ในตาราง Findings แล้วเปิดเฉพาะ round file ที่แถวนั้นระบุ — รอบล่าสุดเป็นที่เดียวที่ Open Issues / Unverified Behaviour ยังเป็นปัจจุบัน

## Rounds

| Round | Tasks | Status | ไฟล์ |
|---|---|---|---|
| 1 | SETUP-007 | ✅ Verified | round-1.md |
| 2 | SETUP-008 | ✅ Verified | round-2.md |
| 3 | SETUP-009 | ✅ Verified | round-3.md |
| 4 | BE-001 | ✅ Verified | round-4.md |
| 5 | BE-002, BE-018, SETUP-009 | ✅ Verified | round-5.md |
| 6 | SETUP-001, SETUP-002 | ✅ Verified | round-6.md |
| 7 | Feature QA — Phase 1 (SETUP-001, SETUP-002, BE-001, BE-002, BE-018) | ✅ Verified | round-7.md |
| 8 | SETUP-004 | ✅ Verified | round-8.md |
| 9 | SETUP-003 | ✅ Verified | round-9.md |
| 10 | SETUP-005 | ✅ Verified | round-10.md |
| 11 | Feature QA — Phase 2 (SETUP-004, SETUP-007, SETUP-008, SETUP-009, SETUP-003, SETUP-005) | ✅ Verified | round-11.md |
| 12 | BE-003, BE-004, BE-005 | ✅ Verified | round-12.md |
| 13 | BE-020, BE-007 | ✅ Verified | round-13.md |
| 14 | BE-006, BE-008 | ✅ Verified | round-14.md |
| 15 | BE-012, BE-019, BE-021, BE-009, BE-022 | ✅ Verified | round-15.md |
| 16 | BE-011 | ✅ Verified | round-16.md |
| 17 | Feature QA — Phase 3 (BE-003, BE-004, BE-005, BE-020, BE-006, BE-007, BE-008, BE-022, BE-019, BE-021, BE-009, BE-012, BE-011) | ❌ Failed | round-17.md |
| 18 | Feature QA — Phase 3 (รอบใหม่ — ปิด QA-007) | ❌ Failed | round-18.md |
| 19 | Feature QA — Phase 3 (รอบ 19 — ปิด QA-009) | ❌ Failed | round-19.md |
| 20 | BE-013, BE-014 | ✅ Verified | round-20.md |

## Findings

| ID | Task | Severity | ไฟล์ |
|---|---|---|---|
| QA-001 | SETUP-007 | Minor | round-1.md |
| QA-002 | SETUP-008 | Minor | round-2.md |
| QA-003 | BE-001 | Minor | round-4.md |
| QA-004 | SETUP-005 | Minor | round-11.md |
| QA-005 | BE-020 | Minor | round-13.md |
| QA-006 | BE-011 | Minor | round-16.md |
| QA-007 | BE-012 | Important | round-17.md |
| QA-008 | BE-012 | Minor | round-17.md |
| QA-009 | BE-011 | Important | round-18.md |
| QA-010 | BE-019 | Important | round-19.md |

## Change Log

- 2026-10-05 — สร้าง index + round 1
- 2026-10-06 — round 2 (SETUP-008): ✅ Verified · qa:QA-002 Minor → backlog · qa:QA-001 resolved (`CLAUDE.md:16` แก้แล้ว — ดู round-2.md)
- 2026-10-06 — round 3 (SETUP-009): ✅ Verified · qa:QA-002 resolved (`test-planner.md:40` — ดู round-3.md) · ไม่มี QA finding ใหม่
- 2026-10-06 — round 4 (BE-001): ✅ Verified · qa:QA-003 Minor → backlog · REV-018/019/020 Minor → backlog (ยืนยันด้วยทดลอง — ดู round-4.md)
- 2026-10-06 — round 5 (BE-002, BE-018, SETUP-009): ✅ Verified · แก้ review:REV-024 (เพิ่มแถว round 3 ในตาราง Rounds — `file-not-in-index` หาย ยืนยันด้วยผลรัน validator) · sync SETUP-009 Status `pending → verified` · ไม่มี QA finding ใหม่
- 2026-10-06 — round 6 (SETUP-001, SETUP-002): ✅ Verified · sync Status `pending → verified` ทั้งสองแถว · review:REV-028 Minor → backlog (จดที่ review\round-9.md — round-6 อ้าง Back-links) · ไม่มี QA finding ใหม่ (ไม่เปิด QA-004)
- 2026-10-06 — round 7 (Feature QA — Phase 1): ✅ Verified — **PASS ครบ 4 กรณี**: A ปฏิเสธ module จริงพร้อม path/issue ครบ 8 (fail-closed ถูก flow — ภาระเอกสารอยู่ BL-040/041/042) · B fixture-ok ผ่าน 0 issue · C legacy ถูก flag `needsMigration` (AC-074) · D ปฏิเสธ path ไม่มีจริงพร้อม path · ทดสอบผ่าน component (orchestrator ตัวจริงยังไม่มี — BE-011 phase 3) · ลบ fixture ที่ `state\tmp-featureqa\` แล้ว · ไม่มี QA finding ใหม่ (ไม่เปิด QA-004)
- 2026-10-06 — round 8 (SETUP-004): ✅ Verified — รันเช็คซ้ำเองครบ ตรง review round 10 (agents 12 · grep path เก่า = match เดียวเป็น `templates\test-plan.md` ที่ยกเว้น · packRoot/sta-config · git provenance) · npm test 43/43 · sync Status `pending → verified` · ไม่มี QA finding ใหม่ (ไม่เปิด QA-004) · review:REV-029 Minor → backlog (จดที่ review\round-10.md — round-8 อ้าง Back-links)
- 2026-10-06 — round 9 (SETUP-003): ✅ Verified — รันเช็คเอง (grep role prompt 213 วลี 0 hits · path ที่อ้างมีจริง · backup-then-delete 11 `agent.md` + ลบโฟลเดอร์เดิมแล้ว · git status อยู่ใต้ `code\`/`knowledge\` เท่านั้น · npm test 43/43) · sync Status SETUP-003 `pending → verified` · ไม่มี QA finding ใหม่ (ไม่เปิด QA-004) · review:REV-030 Minor → backlog (จดที่ review\round-11.md — round-9 อ้าง Back-links)
- 2026-10-06 — round 10 (SETUP-005): ✅ Verified — รัน prompt ซ้ำเองทีละขั้น (path ผิด → ปฏิเสธ + sha256 คงเดิม · path จริง → โครง 11 ไฟล์ + plan index 6 คอลัมน์ AC-036 + append ตรง schema ไม่มี `gituse` + รายการเดิม deep-equal) · loader จริง `loadStaConfig`/`resolveRunRoots` resolve ได้ทั้งรายการใหม่/เดิม · npm test 43/43 · teardown คืน sta-config byte-exact + ลบ fixture · `AGENTS.md` แทรกไม่ทับ SETUP-003 · sync Status SETUP-005 `pending → verified` · ไม่มี QA finding ใหม่ (ไม่เปิด QA-004) · review:REV-031/032 Minor → backlog (จดที่ review\round-12.md — round-10 อ้าง Back-links)
- 2026-10-06 — round 11 (Feature QA — Phase 2): ✅ Verified — **PASS ครบ 4 ข้อ**: คู่มือ 7 ขั้นเปิด session ได้จริงไม่ตัน (agents 12 · tiers.yaml ไม่มีตามประกาศ) · onboarding fail-closed 2 กรณี + loader จริง resolve ใหม่/เดิม · วงจร task serial รอบเดียวด้วยรูป v2 (PM แถว+task file → `inspectPlan` v2 `planIssues=0` → QA เขียน Status เอง → parser อ่าน `verified` จริง) · กติกา solo 4 ข้อตรง DES-013 · npm test 43/43 · qa:QA-004 Minor → backlog (skeleton ใหม่ fail `assertModuleDocs` 5 issue จากแถวตัวอย่าง template + template plan index 2,207 B > เพดาน 2,048 B) · fixture `state\tmp-featureqa-p2\` ลบแล้ว + sta-config คืน byte-exact · ไม่แตะ `plan\index.md` (Status 6/6 คงเดิม)
- 2026-10-06 — round 12 (BE-003, BE-004, BE-005): ✅ Verified — รันเช็คเอง (npm test 99/99 · live โหลด role prompt 12/12 จาก pack จริง + hash นิ่ง/เปลี่ยนถูกจังหวะ + fail-closed ก่อน spawn · resolve tier จริงตรงตาราง REQ-004 + T1 ปฏิเสธพร้อมเหตุผล + sandbox แก้ tiers.yaml ผลเปลี่ยน-ของเดิม freeze · precedence camp 3 ชั้นครบ basis + sandbox แก้ routing.yaml ย้าย role ได้จริงโดยไม่แก้โค้ด) · sync Status `pending → verified` 3 แถว · ไม่มี QA finding ใหม่ (ไม่เปิด QA-005) · review:REV-033 Minor → backlog (จดที่ review\round-13.md — round-12 อ้าง Back-links)
- 2026-10-06 — round 13 (BE-020, BE-007): ✅ Verified — รันเช็คเอง (npm test 102/102 รวม amendment uxui + npm start smoke · live resolve จริง: execution BE-020 8 ไฟล์ตรง References · fix session findings[].id REV-021 → `review\round-7.md` · TP-001 บน module ไม่มี test-plan → context-error fail-closed · uxui 0-hit ไม่ error 2 กรณี + มี artifact resolve · live BE-007: atomic ทน crash จำลอง · run.json เสีย → quarantine + ปฏิเสธ resume · เอกสารชนะ AC-034 + counters คงจาก state · phases{}/handoff.securityGate คงค่าข้ามปิด-เปิด · validator ปฏิเสธ state ผิดรูป) · sync Status `pending → verified` 2 แถว · qa:QA-005 Minor → backlog (des-019/des-020 เกินงบ 8 KB จาก pin REV-034…036 — `system-analyst` archive ส่วน Rev เก่า) · review:REV-034/035/036 ยืนยัน pin ครบ + โค้ดตรง pin แล้ว (ดู round-13.md) · `state\` จริงมีแค่ .gitkeep ก่อน/หลังรัน
- 2026-10-06 — round 14 (BE-006, BE-008): ✅ Verified — รันเช็คเอง (npm test 145/145 · live BE-006 29/29: ประกอบ packet จริงของ BE-021 จาก config/prompt/module จริง — readSections 11 ไฟล์ครบ · packetProblems ว่าง · PacketV2 25 field ตรง data-model · guard ชิดก่อนข้อความดิบ · AC-033 · handoff ผิดรูป 3 แบบ (outputState นอก 7 ค่า / NEEDS_HUMAN ไม่มี questions / securityGate ใน kind ที่ห้าม) ติด validator · live BE-008 28/28 บน fixture git repo จิ๋วใน OS temp — snapshot/pre-image · claim ผ่าน / unclaimed-write / write violation AC-007 · status-write AC-073 + journal ครอบ/hash ไม่ตรงยังโดน · snapshot รอด restart AC-066 · AC-043 สอง session · review:REV-039 ยืนยัน resolved จริง: diffApprox true + untracked ปรากฏใน numstat + plan ได้ pre-image เสมอ) · sync Status `pending → verified` 2 แถว · ไม่มี QA finding ใหม่ (ไม่เปิด QA-006) · review:REV-040/041 Minor → backlog (ดู round-14.md Open Issues)
- 2026-10-06 — round 15 (BE-012, BE-019, BE-021, BE-009, BE-022): ✅ Verified — รันเช็คเอง (npm test 239/239 · live 5 ชุดใน OS temp: BE-012 argv จาก camps.yaml จริงตรง DES-002 ทุก flag + ไม่มี --continue/--resume + test-planner --disallowedTools Bash · BE-019 R5/R7 gate 4 + R8 + R18 anchor Depends explicit + R21 Minor-only → cleared + AC-069 deepEqual · BE-021 wave ไม่เกินเพดาน AC-051 + tpReady/quiesce AC-061 + defect packet ผ่าน packetProblems AC-055 + security stage ตัด reviewer/security AC-079/080 · BE-009 scope task/phase/module + นอก scope เดินต่อ AC-072/013 + owner gates.yaml AC-015 + gate 4 ค้าง AC-071 · BE-022 สำเนา plan จริง pending→verified เฉพาะ cell + 🔒 append + conflict per-row AC-056 + journal → BE-008 ไม่จับ status-write — git diff --no-index = 6 แถวเป้าหมายพอดี) · sync Status `pending → verified` 5 แถว · ไม่มี QA finding ใหม่ (ไม่เปิด QA-006) · review:REV-042/043/044 Minor → backlog (Back-links ที่ round-15.md) · spawn CLI จริงยังไม่พิสูจน์ — ของ QA-001 (ดู round-15.md Unverified Behaviour)
- 2026-10-07 — round 16 (BE-011): ✅ Verified — รันเช็คเอง (npm test 279/279 · suite driver+scheduler 36/36 รวมวงจรครบ execution → review wave → QA round → fix R4 → verified → Feature QA → security 🔒 → cleared → completed + gate hold/answer + kill-restart resume + cap concurrency + rowOrder review wave REV-046 · entry dry จริง 6 กรณี: args/config ผิดปฏิเสธก่อนแตะ state ไม่ spawn CLI · AC ครบ 17 ข้อของ be-011.md + AC-003/067 · killOrphan recovery-only จุดเดียว `driver.ts:416` · REV-045 ตรวจซ้ำจากโค้ดจริง) · sync Status BE-011 `pending → verified` — phase 3 verified ครบ 13/13 · qa:QA-006 Minor → backlog (entry dry กับ module ถูกรูปแต่ไม่มีเอกสาร → run เริ่ม + state เกิดแบบว่าง — จงใจรอ BE-010 intake ตาม `driver.ts:361-363` — แต่ note ไม่มีช่องแสดงผลใน phase 3; state เก็บกวาดคืนแล้ว) · review:REV-047…054 Minor → backlog คงเดิม (Back-links ที่ round-16.md)
- 2026-10-07 — round 17 (Feature QA — Phase 3): ❌ Failed — flow จริงบน fixture: dispatch ผ่าน claude CLI จริงตายทุก session (`--json-schema` ถูกส่งเป็น path แต่ CLI 2.1.292 รับ inline JSON — qa:QA-007 Important เจ้าของ BE-012; spawn ต้องมี claude.exe บน PATH — qa:QA-008 Minor → backlog) · ขา driver ที่เหลือพิสูจน์ครบด้วย fake-adapter mode บน entry/state/เอกสารจริง: DAG parallel / review wave / QA round / write-back / Feature QA / kill-restart resume (orphan → R16 + เอกสารชนะ + ไม่ dispatch ซ้ำ) / หยุดที่ gate แจ้ง stdout — ผลต่อขาที่ round-17.md · npm test 279/279 · fixture ลบ + sta-config คืน sha256 ตรง + state คืน .gitkeep · ต่อไป: engineer แก้ QA-007 แล้ว Feature QA รอบใหม่ (round 18) ก่อนเปิด 🔒 security stage
- 2026-10-07 — round 18 (Feature QA — Phase 3 รอบใหม่): ❌ Failed — **qa:QA-007 resolved**: dispatch จริงผ่าน (argv `--json-schema` = inline JSON 6,095 ตัวอักษร ไม่มี `$schema` ราก · CLI 2.1.292 exit 0 · session จริง 2 ตัว เขียนไฟล์จริง · structured_output ผ่าน `handoffProblems` = 0) · qa:QA-009 ใหม่ Important เจ้าของ BE-011 — driver `extractHandoff` (`driver.ts:1330`) ไม่ unwrap `structured_output` ของ result envelope → R15 hold ทุก task → flow หลัง session จบตาย (DAG parallel/review wave/QA round/write-back/Feature QA/gate/kill-restart ไม่ได้วิ่งจริงรอบนี้ — evidence fake จาก round 17 ยังครอบ) · npm test 283/283 · fixture ลบ + sta-config คืน sha256 ตรง + state คืน .gitkeep · ต่อไป: engineer แก้ QA-009 → round 19 (ถ้า fail เป็นรอบที่ 3 ของ phase 3 — ถามผู้ใช้)
- 2026-10-07 — round 19 (Feature QA — Phase 3 รอบ 19): ❌ Failed — **qa:QA-009 resolved**: `extractHandoff` unwrap `structured_output` ต่อ camp (`driver.ts:1333` + `claude.ts:67`) · npm test 289/289 (unit QA-009 4 เคส) · live 3 run บน fixture — run 3 (15 session จริง) R15 = 0 ทั้ง run · ขาที่ถูกบล็อกรอบ 18 เดินจริงครบ: AC-045 parallel (3 session ใน 47 ms) · review wave → QA round → write-back (AC-073 เฉพาะ cell) → Feature QA (R18/R19 phase cleared) · gate R12 + stdout (task ใน scope hold นอก scope เดินต่อ) · kill-restart ×3 (finalize interrupted → R16 + priorSession · งานเสร็จไม่ dispatch ซ้ำ) · qa:QA-010 ใหม่ Important เจ้าของ BE-019 — R2 ตรวจ `auditSuspects` เฉพาะ execution (`router.ts:533`) → violation ของ review/qa/feature-qa ไม่ hold ตัดสินต่อ (ขัด DES-018 R2 + DES-021 §4) · fixture ลบ + sta-config คืน sha256 ตรง + state คืน .gitkeep · **ครบ 3 รอบ FAIL ของ phase 3 → หยุดที่ human gate — ผู้ใช้ตัดสิน: ยอมรับ / ส่ง engineer แก้ QA-010 / re-scope**
- 2026-10-07 — round 20 (BE-013, BE-014): ✅ Verified — รันเช็คเอง (npm test **324/324** · camp-codex 17 + camp-antigravity 18 · tsx -e 6 ชุด: argv จาก camps.yaml จริงตรง DES-002 ทั้งสอง camp (codex exec/-C/-m/-c effortVia/--output-schema path/last-message · agy -p/--json-schema path/--add-dir/--log-file session.log) · AC-033 ไม่มี resume/bypass · effort null ไม่ปรากฏ · last-message/stdout → handoff ผ่าน `handoffSchemaProblems` · retry/kill/timeout · fail-closed ก่อน spawn (spawnFn ไม่ถูกเรียก) · wiring REV-055 resolved: `main.ts:94-100` register ครบ 3 camp พิสูจน์ด้วย constructor จริง `campAdapterProblems` = [] + grep "มี camp เดียว" = 0 hits) · sync Status BE-013/BE-014 `pending → verified` — phase 4 verified ครบ 2/2 · ไม่มี QA finding ใหม่ (review:REV-056 คง → backlog) · spawn CLI จริง codex/agy = Unverified Behaviour ของ Feature QA phase 4 (round-20.md)

Back-links: `..\index.md`
