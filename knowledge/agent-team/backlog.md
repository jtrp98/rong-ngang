# agent-team — Backlog

> ทุกอย่างที่ไม่อยู่ใน `plan.md` `## Release Scope` · ใครก็เพิ่มบรรทัดได้ · ย้ายเข้า release ได้เฉพาะเมื่อผู้ใช้สั่ง

| ID | รายการ (1 บรรทัด) | มาจาก | ความสำคัญ | Decision |
|---|---|---|---|---|
| BL-001 | เปิด parallelism ข้าม stage/run (`maxConcurrentRuns`/`maxConcurrentStages` > 1 — ต้องแยก write audit per-module ก่อน) | REQ §ไม่อยู่ใน release / DES-001 | Med | ดึงเข้า R1 ผ่าน REQ-013 + DES-021 (gate 7 — เจ้าของ jtrp98, 2026-10-05) |
| BL-002 | แจ้ง gate ผ่าน Telegram/LINE/Email (field `channels` ใน gates.yaml สงวนไว้แล้ว) | REQ §ไม่อยู่ใน release / DES-008 | Med | — |
| BL-003 | เจ้าของ gate หลายคนพร้อมช่องทางติดต่อจริง (Owner-A/Owner-B — config รองรับโครงแล้ว ยังไม่กรอกตัวจริง; AC-015 รองรับอยู่แล้ว) | REQ §ไม่อยู่ใน release / AC-015 | Med | — |
| BL-004 | camp เพิ่มนอกจาก claude/codex/antigravity (opencode, zai ตามของเดิม) | REQ §ไม่อยู่ใน release / DES-004 | Low | — |
| BL-005 | รายงานต้นทุน/โควตาต่อ camp บน dashboard | REQ §ไม่อยู่ใน release | Low | — |
| BL-006 | รันต่างเครื่อง/บน server (ต้องมี auth + bind นอก loopback — release นี้ bind 127.0.0.1 และไม่มี auth ตาม DES-009) | REQ §ไม่อยู่ใน release / DES-009 | Low | — |
| BL-007 | self-learning/memory ของ CAO | REQ §ไม่อยู่ใน release | Low | — |
| BL-008 | pack format เพิ่มสำหรับ coding agent อื่นนอก 4 ตัว (claude, codex, antigravity, zcode) | REQ §ไม่อยู่ใน release / DES-013 | Low | — |
| BL-009 | แก้ sta2 `policies\documentation.md:5` ให้สอดคล้อง flat layout (OQ-D1 — policy alignment; แตะไฟล์ sta2 จึงต้องผู้ใช้สั่งเท่านั้น) | OQ-D1 (design-archive) / DES-011 | Med | — |
| BL-010 | ยกระดับ write audit จาก detective เป็น preventive เมื่อ CLI/sandbox รองรับการจำกัดระดับไฟล์ | design §Quality Attributes (tech debt) | Low | — |
| BL-011 | ทำสัญญา version ของ path ที่ชี้ role prompt ใน sta2 (ปัจจุบันตั้งใจใช้ path เดิมเสมอ — ตาม REQ-003) | design §Quality Attributes (tech debt) | Low | — |
| BL-012 | กัน git ระดับคำสั่งต่อ root สำหรับ codex/agy (ปัจจุบันเหลือบรีฟ + ref audit; push ด้วย URL ตรงที่ไม่อัปเดต refs/remotes จับไม่ได้) เมื่อ CLI รองรับ | DES-016 §Security abuse (3) | Low | — |
| BL-013 | REQ-009 สวิตช์ git commit (`gituse`) ทั้งก้อน — AC-025…032 · DES-016, DES-017 + ส่วน `gituse` ของ DES-015 + ส่วน REQ-009 ใน DES-006/009/012/013 | plan Waiting on Human #8 / REQ-009 | Med | R ถัดไป (เจ้าของ jtrp98, 2026-10-05) |
| BL-014 | task BE-016 — Config: สวิตช์ `gituse` validate + resolve + repo check → `gitPolicy` (ไฟล์เดิมตรงตัว §Archive A) | plan replan 2026-10-05 (REQ-009) | Med | R ถัดไป (เจ้าของ jtrp98, 2026-10-05) |
| BL-015 | task BE-017 — Ref audit หลัง stage (DES-016 ชั้น 3) (ไฟล์เดิมตรงตัว §Archive A) | plan replan 2026-10-05 (REQ-009) | Med | R ถัดไป (เจ้าของ jtrp98, 2026-10-05) |
| BL-016 | task SETUP-006 — `/gituse` + hard rule git แบบมีเงื่อนไขใน pack (ไฟล์เดิมตรงตัว §Archive A) | plan replan 2026-10-05 (REQ-009) | Med | R ถัดไป (เจ้าของ jtrp98, 2026-10-05) |
| BL-017 | ส่วน "(REQ-009)" ที่ถอดจาก BE-001/006/007/008/011/012/015, FE-001, SETUP-003/005 และ task QA ทั้งสอง — ใส่กลับเมื่อดึง REQ-009 (ข้อความเดิมตรงตัว §Archive B) | plan replan 2026-10-05 | Med | R ถัดไป (เจ้าของ jtrp98, 2026-10-05) |
| BL-018 | คำถามที่ต้องตอบก่อนดึง REQ-009 กลับ: ชื่อ/ชนิด `gituse` · ค่า null/key `git` · ถอด deny `git add`/`git commit` ใน `code\.claude\settings.json` (task setup แยก ยังไม่สร้าง) · กติกา `--amend`/`add -A`/นิยาม run (Waiting on Human #3–#6 ตรงตัว §Archive C) | plan Waiting on Human #3–#6 | Med | R ถัดไป (เจ้าของ jtrp98, 2026-10-05) |
| BL-019 | เพดาน parallel ต่อ camp / ต่อ role (R1 = ค่าเดียวทั้งระบบ `scheduler.maxParallelSessions`) | OQ-10 / REQ-013 | Low | — |
| BL-020 | resume session เดิม (`--continue`/`--resume`) แทนการเปิด session ใหม่ในรอบแก้/หลัง crash | OQ-18 / REQ-012 | Low | — |
| BL-021 | production incident impact สูงเป็นสถานการณ์ gate (ยังไม่มี production) | OQ-19 / REQ-006 | Low | — |
| BL-022 | กัน test-planner รัน check / เขียนนอก claim แบบ preventive บน codex/agy (R1 กันก่อนได้เฉพาะ claude — AC-060 partial) | DES-021 Security / design\index.md REQ-018 | Low | — |
| BL-023 | review:REV-002 — `test-planner.md:23,35`: index มีเฉพาะเมื่อ > 1 ไฟล์ (TP ไฟล์เดียว resolve ไม่ได้) + รูป "input → expected" ไม่ใช่ Given/When/Then (owner setup) | `review\round-1.md`, คงสถานะ `round-4.md` | Minor | ดึงเข้า R1 → SETUP-009 (เจ้าของ jtrp98, 2026-10-06) |
| BL-024 | review:REV-007 — `test-planner.md:38` (kind execution) และ `project-manager.md:46-50` (kind change) ไม่ระบุ output state (owner setup) — ซ้ำฝั่ง test-planner กับ BL-030 | `review\round-1.md`, `round-4.md` | Minor | ดึงเข้า R1 → SETUP-009 เฉพาะ `test-planner.md` (เจ้าของ jtrp98, 2026-10-06) · ฝั่ง `project-manager.md:46-50` ยังไม่ตัดสิน · 2026-10-06: ฝั่ง `project-manager.md:46-50` (output state kind change) → R ถัดไป (เจ้าของ jtrp98 — "ไฟล์เดียว") |
| BL-025 | review:REV-008 — `qa-engineer.md:40` "third failed round / Critical → stop and ask" ไม่แยกโหมด (orchestrated = router R5/R7 ยก gate 4) (owner setup) | `review\round-1.md`, `round-4.md` | Minor | R ถัดไป (เจ้าของ jtrp98, 2026-10-06) |
| BL-026 | review:REV-009 — `project-manager.md:22` ยังใช้คำ "Depends on" รูปเดิม (v2 = คอลัมน์ Depends ใน index) (owner setup) — reviewer ยังไม่ยืนยันว่าแก้แล้ว (round 3 ยังพบ, round 4 ไม่ได้อ่านซ้ำ) | `review\round-1.md`, `round-3.md` | Minor | R ถัดไป (เจ้าของ jtrp98, 2026-10-06) |
| BL-027 | review:REV-012 — `project-manager.md:24` "At most one per phase" เกิน design | `review\round-3.md` | Minor | **closed** — design Rev 12 กำหนด anchor ≤ 1 ต่อ phase แล้ว (`design\index.md` §Impact แถว Rev 12, DES-019) |
| BL-028 | review:REV-013 — `project-manager.md:33` คำ "non-blocking" จากชุด severity เก่า | `review\round-3.md` | Minor | **closed** — แจ้งโดย driver 2026-10-06 ว่า follow-up Rev 11/12 แก้แล้ว · ยังไม่มี review round ยืนยัน |
| BL-029 | review:REV-014 — `test-planner.md:33` ชื่อไฟล์ `test-plan\<slug>.md` ไม่ตรง contract `test-plan\round-N.md` (DES-019/020) — เรื่องเดียวกับ BL-023 (owner setup) | `review\round-3.md`, `round-4.md` | Minor | ดึงเข้า R1 → SETUP-009 (เจ้าของ jtrp98, 2026-10-06) |
| BL-030 | qa:QA-002 — `test-planner.md:38-40` §Handoff ไม่ระบุ output state ชุด execution (owner setup) | `qa\round-2.md` | Minor | ดึงเข้า R1 → SETUP-009 (เจ้าของ jtrp98, 2026-10-06) |
| BL-031 | review:REV-015 — `templates/test-plan.md:1,3` ยังใช้ `<slug>` ไม่ตรง `test-plan\round-N.md` (owner setup) | `review\round-5.md`, ยืนยัน `qa\round-3.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-032 | review:REV-016 — `test-planner.md:21` ประโยค "Trigger unchanged." เป็นบันทึกการเปลี่ยน ไม่ใช่คำสั่ง (owner setup) | `review\round-5.md`, ยืนยัน `qa\round-3.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-033 | review:REV-017 — `project-manager.md:24` "except tasks that depend on it" ไม่ระบุ dependents แบบทอด ตาม DES-019:22 (owner setup) | `review\round-5.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-034 | review:REV-018 — `config.ts:41,559-564` `FORBIDDEN_ARGS` ตรวจตรงทั้งตัว: `--resume=<id>`, codex resume ใน `subcommand`, arg ใน `effortVia`/`toolRuleFlags` หลุด (เกิน contract ปัจจุบัน) (owner system-analyst ขยาย contract → backend-engineer) | `review\round-6.md`, ยืนยันด้วยทดลอง `qa\round-4.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) · ข้อเสนอ PM (ยังไม่ตัดสิน): ตัดสินก่อน QA-001 ตามที่ QA แนะนำ |
| BL-035 | review:REV-019 — `config.ts:41` ไม่ครอบ alias claude `-c`/`-r`; ห้าม `-c` ทุก camp ไม่ได้ (codex ใช้เป็น config override) → รายการห้ามต้องแยกต่อ camp (owner system-analyst → backend-engineer) | `review\round-6.md`, ยืนยันด้วยทดลอง `qa\round-4.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) · ข้อเสนอ PM (ยังไม่ตัดสิน): ตัดสินก่อน QA-001 ตามที่ QA แนะนำ |
| BL-036 | review:REV-020 — `test/config.test.ts:184-190` ขาด reject case (`fixRoundLimit` < 0, `reviewWave.maxDiffLines`, `largeTask.*`, `manifestIgnore` ไม่ใช่ list, key แปลกใน `scheduler`) — โค้ดถูกแล้ว เหลือล็อกด้วย test (owner backend-engineer) | `review\round-6.md`, `qa\round-4.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-037 | qa:QA-003 — `config.ts:308` `\d` ใน template literal ถูกตัด backslash → ข้อความ error "designdata-model.md" (กระทบแค่ข้อความ) (owner backend-engineer) | `qa\round-4.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-038 | qa:ข้อสังเกต — `design\data-model.md:65` อ้างเลขบรรทัดเก่า `config.ts:487-488` → ปัจจุบัน `:517-518` (owner system-analyst) | `qa\round-4.md` §Data Model check | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-039 | review:REV-023 — `knowledge-paths.ts:74` + ไม่มี `templates\module-index.md` ใน pack — BA เปิด module ใหม่ไม่มี template ให้ใช้ ขัด AC-012 (contract gap) (owner system-analyst → setup, backend-engineer) | `review\round-7.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-040 | review:REV-025 — `requirement\req-006.md` (4,353 B), `req-008.md` (5,118 B), `req-009.md` (4,256 B) เกินงบ 4 KB — archive ตาม `policies\documentation.md` §4 (owner business-analyst) | `review\round-7.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-041 | review:REV-026 — round เก่าเกินงบ 10 KB: `review\round-1.md` (11,323 B) / `round-3.md` (11,125 B) / `round-5.md` (10,524 B) / `qa\round-4.md` (11,762 B) — รอบปิดแล้วคง verbatim แก้ย้อนไม่ได้ · reviewer/qa-engineer คุมขนาดรอบถัดไป · การตัดสิน release-cut รอเจ้าของ (owner reviewer / qa-engineer) | `review\round-7.md` + ผลรันหลังแก้ REV-021 | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-042 | review:REV-027 — `review\round-7.md` (14,180 B) เกินงบ round 10 KB — รอบปิดแล้วคง verbatim · reviewer คุมขนาดรอบถัดไป (owner reviewer) | `review\round-8.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-043 | review:REV-028 — `src\main.ts:2` + `package.json:5` comment ชี้ "BE-001 จะแทนที่ entry" แต่งาน wire entry อยู่ที่ BE-015 (phase 5) — แก้ comment ตอนทำ BE-015 (owner backend-engineer) | `review\round-9.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-044 | review:REV-029 — `code\.claude\agents\setup.md:22` ข้อความ "**Pack files** ที่ราก" เป็นตำแหน่งเดิมก่อนย้าย packRoot = `code\` — แก้เป็น "pack ที่ `code\` (packRoot)" (owner setup — เมื่อมีงาน pack ถัดไป) | `review\round-10.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-045 | review:REV-030 — `code\AGENTS.md:26` + ไม่มี `code\tiers.yaml` — DES-013 นับ tier table เป็นส่วน pack แต่ packRoot ไม่มีไฟล์ (มีแต่ `code\agent-team\config\tiers.yaml`) (owner system-analyst ตัดสินแหล่ง tier ฝั่ง solo → setup แก้) | `review\round-11.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-046 | review:REV-031 — `code\prompts\setup-knowledge.md:44` รายการ "ไม่สร้าง" ไม่ครอบ `design\quality-attributes.md`/`modules.md`/`risks.md`/`archive.md` ตาม DES-014 (template design index อ้างทั้ง 4) (owner system-analyst ตัดสิน contract → setup) | `review\round-12.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-047 | review:REV-032 — `code\prompts\setup-knowledge.md:76` สาขา "config ไม่มี → สร้างใหม่" ไม่สั่งตรวจ `main_root` ก่อนเขียน (fail-closed DES-015) (owner setup) | `review\round-12.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-048 | qa:QA-004 — skeleton จาก template verbatim fail `assertModuleDocs` ทันที 5 issue (`index-row-no-file` ×4 จากแถวตัวอย่าง template + `index-over-budget` plan index เปล่า 2,207 B > เพดาน 2,048 B) — ช่องว่าง contract ระหว่าง SETUP-005/SETUP-007/BE-018 ที่ DES-014/015 ไม่พูดถึง (เจ้าของเสนอ: system-analyst ตัดสิน contract แล้ว role ที่เกี่ยวแก้) | `qa\round-11.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-06) |
| BL-049 | review:REV-042 — `router.ts:773` handleCrash เดา kind เป็น `execution` เมื่อ event ไม่ส่ง `sessionKind` — session review/qa ที่ล่มโดย driver ลืมส่ง `sessionKind/sessionRole` ถูก re-dispatch เป็น execution ผิด kind (R16) — hardening เกิน AC (owner backend-engineer) | `review\round-17.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-050 | review:REV-043 — `router.ts:632,654` review/qa `perTask` อ้าง task id ไม่มีใน module ถูกข้ามเงียบ (`if (!t …) continue`) — FAIL โดนตรวจจับ แต่ PASS ของ task อื่นไหลผ่านเงียบ ควรเข้า R15 — hardening เกิน AC (owner backend-engineer) | `review\round-17.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-051 | review:REV-044 — กติกา gate เปิดซ้อนหลาย instance / task โดน 2 gate ครอบ ยังไม่ pin (DES-008/data-model เงียบ) — comment อ้าง reconcileRun §5 เป็น last-wins ไม่ตรงจริง → task ค้างโดย dashboard ไม่เห็น gate (contract gap — owner system-analyst pin แล้ว engineer align) | `review\round-18.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-052 | review:REV-047 — `driver.ts:436` killOrphan fail-open เมื่อ tasklist ตรวจ image name ไม่ได้ (winImageName คืน null → kill โดยไม่ยืนยันชื่อ process — PID reuse ระหว่าง crash→resume เสี่ยง kill process แปลก) — พื้นที่ 🔒 phase 3: security stage ต้องอ่านด้วย (owner backend-engineer) | `review\round-19.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-053 | review:REV-048 — `driver.ts:403` vs `scheduler.ts:234` satisfied(anchor) ไม่ตรงกันระหว่าง driver (step verified) / scheduler (phase cleared ตาม DES-019 Rev 12) — จบผลเดียวกันเพราะ applyR8 แก้กลับใน tick เดียว แต่เป็นแหล่ง confusion (owner backend-engineer) | `review\round-19.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-054 | review:REV-049 — `driver.ts:713` + `router.ts:789` crash ผสมใน event เดียว (task หนึ่งครบ crashRestartLimit อีก task ยัง under → R17) → re-dispatch ไม่มี priorSession.touchedFiles ขัด DES-018 R16 (owner backend-engineer) | `review\round-19.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-055 | review:REV-050 — `driver.ts:1404` legacy plan ไม่มี `## Phases` → ไม่มีทางเข้า run.status `completed` (task verified หมดแล้วจบด้วย idle) — contract gap: system-analyst pin (ยอมรับ idle หรือขยายเงื่อนไข) (owner system-analyst) | `review\round-19.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-056 | review:REV-051 — `driver.ts:808` + `router.ts:258` churn R24: hold plan-error สองเจ้าของ (router/driver) — router ปลด hold ของ driver ทุก plan-changed tick แล้ว applyParserIssueHolds re-hold ทันที (save 2 ครั้ง + log คู่ต่อ tick) — router ควรข้าม ref ที่ไม่ใช่ของตัวเอง (owner backend-engineer) | `review\round-19.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-057 | review:REV-052 — `driver.ts:1081` backfill `GateRecord.recordSessionId` ใช้แถวท้าย gateLog — ถ้า gate อื่นเปิดทีหลัง แถวท้าย ≠ gate ที่เพิ่งตอบ → เงียบไม่ backfill (OQ-D3) — ควรหาย้อนหาแถว gateId ตรง (owner backend-engineer) | `review\round-19.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-058 | review:REV-053 — `test/skeleton.test.ts:6` + `main.ts:117` placeholder skeleton test (assert `SKELETON_MESSAGE`) ยังค้างหลัง main.ts ไม่ใช่ skeleton แล้ว — ต้องมีกำหนดเลิก: PM ตัดสินขอบเขต (ลบ test + export เมื่อ SETUP-001 ปิด/revise) แล้ว engineer แก้ (owner project-manager → backend-engineer) | `review\round-20.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-059 | review:REV-054 — `scheduler.ts:185,214` ลำดับ phase ของ waves/QA lexicographic ต่างมาตรฐาน "Phase น้อยก่อน" ของ DES-001 (orderedRunnable ใช้ rank เป็นเลข) — align rank เป็นเลข หรือเสนอ SA pin ว่า lexicographic ได้ (owner backend-engineer) | `review\round-20.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-060 | review:REV-041 — session-audit: untracked binary นับบรรทัดต่ำกว่าจริงได้ (ช่องคงเหลือจาก fix REV-039) (owner backend-engineer) | `review\round-16.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-061 | qa:QA-005 — des-019/des-020 เกินงบ 8 KB จาก pin REV-034…036 — system-analyst archive ส่วน Rev เก่า ตาม `policies\documentation.md` §4 (owner system-analyst) | `qa\round-13.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-062 | qa:QA-006 — entry dry: module ถูกรูปแต่ไม่มีเอกสาร → run เริ่มจริง state ว่าง ไม่ปฏิเสธ (จงใจ รอ BE-010 intake — `driver.ts:361-363`) — entry ควรพิมพ์ note ลง stdout เมื่อ run ว่าง ไม่รอ dashboard (owner backend-engineer) | `qa\round-16.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-063 | qa:QA-008 — precondition deployment: PATH ต้องมี `claude.exe` จริง (npm global มีแต่ shim `.cmd`/`.sh` spawn ตรง shell:false ไม่ได้ = ENOENT) — จดใน runbook/deploy.md หรือชี้ `command` เป็นเต็ม path (owner backend-engineer) | `qa\round-17.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-064 | หมายเหตุ SA — DES-002 กำกวมเรื่องรูปค่า `--json-schema` (ความจริงจาก fix qa:QA-007: claude รับ inline JSON ตัด `$schema` ราก; codex/agy ยืนยันภายหลัง phase 4) — system-analyst แก้ DES-002 ให้ชัด | `qa\round-18.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |
| BL-065 | review:REV-040 — session-audit จับการลบแถว plan ของ PM เป็น `status-write` ขัด design ที่ SA pin แล้ว (des-021 §5 + des-007 §Resume 2026-10-07: PM ลบแถวระหว่าง replan = เอกสารชนะ ไม่ใช่ violation) — engineer align `session-audit.ts` (จุด :642-645) ตาม pin (owner backend-engineer) | `review\round-15.md` | Minor | R ถัดไป — รอเจ้าของย้ายเข้า (2026-10-07) |

## Archive — ย้ายจาก plan ตรงตัว (2026-10-05)

> ไม่ใช่รายการ backlog ใหม่ — ข้อความเดิมตรงตัวจาก replan 2026-10-05 สำหรับดึงกลับ (BL-014…018) · ไม่อ่านตอน startup

### Archive A — task files ที่ย้ายออกจาก plan (เนื้อหาเดิมทั้งไฟล์)

```markdown
### BE-016 — Config: สวิตช์ `gituse` — validate + resolve + repo check → `gitPolicy` (DES-015)

- **Owner:** backend-engineer · **Depends on:** BE-001 · **Status:** pending
- **Traces:** REQ-009 (AC-025, AC-026, AC-028, AC-031, AC-032), DES-015, DES-016 (ตารางกลุ่ม git), `design\data-model.md` (sta-config `gituse`, `gitPolicy`)
- **Objective:** config layer รู้จักสวิตช์ `gituse` และคืน `gitPolicy[]` ต่อ root (docsRoot + codeRoots ของ run) เป็น snapshot ให้ driver freeze
- **ทำไมเป็น task ใหม่ ไม่เปิด BE-001:** BE-001 build ตาม spec เดิมแล้ว (14 test ผ่าน — driver แจ้ง 2026-10-05) · แยกเพื่อให้ done-check เดิมของ BE-001 ตรวจได้อิสระ · contract ใหม่ (REQ-009, DES-015 Rev 9) และติด human gate (Waiting on Human #3, #4, #8) ที่ BE-001 ไม่ติด · risk ต่าง (เปลี่ยนพฤติกรรม: default เปิด)
- **Scope / Do not touch:** (1) validator: `gituse` optional ที่ `knowledge_roots[]` และ `targets[]` ต้องเป็น JSON boolean — `null`/string/number/object → ปฏิเสธ run พร้อม JSON path + ค่าที่พบ · พบ key `git` → ปฏิเสธ run ตามข้อความ DES-015 · config ที่ไม่มี `gituse` ยัง valid (2) resolve: docsRoot = `knowledge.gituse ?? true` · codeRoot = `target.gituse ?? knowledge.gituse ?? true` · `basis` = `target|knowledge|default` (3) repo check อ่านอย่างเดียว: `git -C <root> rev-parse --show-toplevel` ผ่าน argv array (git runner ฉีดได้เพื่อ test) → `repo`/`repoTop`; ล้ม/ไม่มี git → `repo: false` (4) `commitAllowed = gituse && repo` · `auditMode` = `git` เมื่อ `repo` ไม่ขึ้นกับ `gituse` · เปิดแต่ไม่ใช่ repo → `warning` ตาม DES-015 (5) คืน `gitPolicy[]` ตรงโครง data-model (immutable) · Do not touch: ไม่เขียน sta-config, ไม่เรียก git อื่นนอก `rev-parse`, ไม่มี remote/branch/ตรวจ origin, ไม่ลดเงื่อนไข test เดิมของ BE-001 · บันทึกลง run.json = BE-007 · เรียกตอนสร้าง run = BE-011
- **Done-check:** node:test — resolve ครบ 4 กรณี (ตั้งที่ target / knowledge / ทั้งคู่ / ไม่ตั้ง) ได้ effective + basis ถูก (AC-025, AC-028) · `null`, `"true"`, `1`, `{}` → ปฏิเสธพร้อม JSON path · key `git` → ปฏิเสธ (AC-032) · fake runner ยืนยันว่าเรียกเฉพาะ `rev-parse` (AC-032) · root ไม่ใช่ repo + เปิด → `commitAllowed: false` + `warning` ไม่ throw (AC-031) · repo + `gituse: false` → `auditMode: git` (AC-026) · 14 test เดิมของ BE-001 ยังผ่าน
- **Risk / Rollback:** กลาง — ชื่อ/ชนิด field และกติกาปฏิเสธยังรอผู้ใช้ (#3, #4) → ห้ามเริ่มก่อนได้คำตอบ · rollback: ถอดโมดูลนี้ — config ไม่ต้อง migrate (ไม่มี key = เปิด)

Back-links: plan\index.md
```

```markdown
### BE-017 — Ref audit หลัง stage (DES-016 ชั้น 3)

- **Owner:** backend-engineer · **Depends on:** BE-008, BE-016 · **Status:** pending
- **Traces:** REQ-009 (AC-026, AC-027, AC-030), DES-016, DES-006, `design\data-model.md` (`writeAudit.violations[]`, `gitRefs`)
- **Objective:** จับการกระทำ git ที่เกินสิทธิ์ของ AI หลังแต่ละ stage (detective) ได้ทุก camp
- **ทำไมแยกจาก BE-008:** contract คนละตัว (DES-016) และพึ่ง `gitPolicy` จาก BE-016 · BE-008 ตรวจไฟล์ task นี้ตรวจ ref/commit แล้วส่งไฟล์ใน commit ใหม่เข้า changed ของ BE-008
- **Scope / Do not touch:** ต่อ `repoTop` ที่ `repo: true` (root ที่อยู่ repo เดียวกันตรวจครั้งเดียว) — ก่อน dispatch เก็บ `symbolic-ref -q HEAD`, `rev-parse HEAD`, `for-each-ref refs/heads refs/remotes refs/tags` · หลัง stage → violation ตามข้อ (ก)…(ฉ) ของ DES-016 (kind `git-ref` / `git-commit-off`) ใช้ `merge-base --is-ancestor` และจำนวน parent ของ commit ใหม่ · ไฟล์ใน `diff --name-only <before>..<after>` ส่งเข้า changed ของ write audit (BE-008) · บันทึก `gitRefs` before/after ใน StageRecord · violation → stage failed + run `stopped` รอคน · git หายกลาง run → `partial` + เหตุ · ทุกคำสั่ง read-only ผ่าน argv array · Do not touch: ไม่ revert/reset อัตโนมัติ, ไม่ commit, ไม่ใส่ flag ของ CLI (ชั้น 2 = BE-012)
- **Done-check:** node:test บน repo ชั่วคราวใน temp dir (fixture สร้างโดย test เท่านั้น) — commit แบบ linear ใน root ที่ `commitAllowed: true` → ผ่าน และไฟล์ใน commit ถูกนับใน write audit (นอก allow → violation `write`) · commit แตะ root ที่ `commitAllowed: false` หรือ HEAD ย้ายใน repo ที่ไม่มี root เปิด → `git-commit-off` (AC-027) · สร้าง branch / tag / checkout branch อื่น / amend (ไม่ fast-forward) / merge commit → `git-ref` (AC-030) · git หาย → `partial` · หลัง violation ไม่มีการ revert
- **Risk / Rollback:** กลาง — push ด้วย URL ตรงที่ไม่อัปเดต refs/remotes จับไม่ได้ (ประกาศใน DES-016; claude กันที่ BE-012) · rollback: ปิดการเรียกจาก driver — write audit (BE-008) ยังทำงาน

Back-links: plan\index.md
```

```markdown
### SETUP-006 — `/gituse` + hard rule git แบบมีเงื่อนไขใน pack (DES-017, DES-016 §solo)

- **Owner:** setup · **Depends on:** SETUP-003, SETUP-004 · **Status:** pending
- **Traces:** REQ-009 (AC-025, AC-027, AC-028, AC-029, AC-030, AC-031), REQ-008 (AC-023, AC-024), DES-017, DES-016, DES-013
- **Objective:** solo mode สลับสวิตช์ด้วย `/gituse` ได้ และ session ทำตามสิทธิ์ commit ต่อ root
- **ทำไมแยกจาก SETUP-003:** contract ใหม่ (DES-016/017) + ติด human gate (#3, #5, #6, #8) ที่ SETUP-003 ไม่ติด — SETUP-003 เดินต่อได้ไม่ต้องรอ · `setup-003.md` ใกล้งบ 4 KB
- **Scope / Do not touch:** (1) `code\.claude\commands\gituse.md` (claude/zcode) ตาม DES-017: `/gituse` แสดงตารางค่าที่ตั้ง/effective/basis · `/gituse on|off|unset [<knowledge>] [<target>]` (knowledge หลายตัวไม่ระบุ → ถามผู้ใช้) · แก้ key `gituse` จุดเดียว รักษา key/ลำดับอื่น เขียน atomic (tmp + rename) แล้ว parse ซ้ำ · ข้อความผลลัพธ์ "มีผล run ถัดไป" · errors ตาม DES-017 (2) หัวข้อ `/gituse` ใน `code\AGENTS.md` (codex/agy) ชี้ไฟล์เดียวกัน + fallback พิมพ์เป็นข้อความ — ห้ามสำเนาเนื้อหา (AC-023) (3) hard rule "No state-changing git" ใน `code\CLAUDE.md` → มีเงื่อนไขตาม DES-016 §solo: `git add -- <path>`/`git commit` เฉพาะ root ที่ effective `gituse` = true และเป็น repo (resolve ครั้งเดียวตอนเริ่ม run) · ห้าม `git add -A`/`.` และ `--amend` · กลุ่มห้ามเสมอ (push/branch/merge ฯลฯ) ห้ามทุกค่า · non-repo → เตือน + ข้าม · AI ห้ามเรียก `/gituse` หรือแก้ sta-config เอง · Do not touch: `code\.claude\settings.json` (Waiting on Human #5 — task แยกหลังผู้ใช้ตัดสิน), ไฟล์ sta2, orchestrator code, ค่าใน `code\sta-config.json` จริง
- **Done-check:** `gituse.md` ครอบ show/on/off/unset + errors ตาม DES-017 · `AGENTS.md` มีหัวข้อ `/gituse` เป็น path อ้างอิง (grep ไม่พบเนื้อหาซ้ำ — AC-023) · `code\CLAUDE.md` มีข้อยกเว้นตรง DES-016 §solo และยังห้าม push/branch/merge (AC-030) · `settings.json` ไม่ถูกแตะ · พฤติกรรมจริงต่อ agent (AC-029) ตรวจที่ QA-002
- **Risk / Rollback:** กลาง — รูป slash command ต่อ agent `inferred` · ถ้า #5 = ไม่ถอด deny ต้องประกาศใน `AGENTS.md` ว่าสวิตช์เปิดไม่มีผลใน claude/zcode · rollback: ลบ `gituse.md` + หัวข้อ + คืน hard rule เดิม

Back-links: plan\index.md
```

### Archive B — ส่วน "(REQ-009)" ที่ถอดจาก task เดิม (ข้อความเดิมตรงตัว แยกตามไฟล์/ช่อง)

```text
be-001.md · Objective: · สวิตช์ `gituse` (REQ-009) แยกเป็น BE-016 (2026-10-05) — ไม่เปิด task นี้ใหม่
be-006.md · Depends on: BE-016 (REQ-009)
be-006.md · Traces: REQ-009 (AC-027, AC-029, AC-030, AC-031), DES-016 ชั้น 1
be-006.md · Scope: · (REQ-009) packet `gitPolicy` (`rootKind`, `path`, `commitAllowed`, `warning`) คัดจาก `run.json.gitPolicy` — ทุก stage ของ run เดียวกันได้ค่าเดียวกัน + ประโยคบังคับชั้น 1 ของ DES-016 (commit เฉพาะ root ที่ `commitAllowed`, `git add -- <path>` ห้าม `-A`/`.`, root มี `warning` ข้าม commit, กลุ่มห้ามเสมอ, ห้ามแก้ sta-config)
be-006.md · Done-check: · (REQ-009) packet มี `gitPolicy` ตรง run.json ทุก stage + ประโยคบังคับ git ปรากฏทุก packet · `code\sta-config.json` ไม่อยู่ใน `writeScope.allow` ของ role ใด
be-007.md · Depends on: BE-016 (REQ-009)
be-007.md · Traces: REQ-009 (AC-029, AC-031), DES-015 (freeze)
be-007.md · Scope: · (REQ-009) run.json มี `gitPolicy[]` ที่ freeze ตอนสร้าง run (ค่าจาก BE-016) + `warning` ใน run state · resume ใช้ค่าใน run.json เท่านั้น ห้าม resolve ซ้ำ · StageRecord มี `writeAudit.mode/partial/violations[]/gitRefs` ตาม data-model
be-007.md · Done-check: · (REQ-009) แก้ sta-config หลังสร้าง run แล้ว resume → `gitPolicy` เดิม; run ใหม่ได้ค่าใหม่ (AC-029)
be-008.md · Depends on: BE-016 (REQ-009)
be-008.md · Traces: REQ-009 (AC-026)
be-008.md · Scope (deny list): `code\sta-config.json` (REQ-009)
be-008.md · Scope: audit หลัง stage (REQ-009): โหมดต่อ root จาก `gitPolicy.auditMode` ไม่ขึ้นกับ `gituse` — git: changed = `diff --name-only <HEAD ก่อน stage>..HEAD` ∪ `status --porcelain -uall` จำกัด pathspec ใต้ root (read-only; knowledge/target repo เดียวกันแยกด้วย pathspec) เทียบ allow → violations · manifest เมื่อ root ไม่ใช่ repo / repo เสียกลาง run (mark partial เมื่อสแกนไม่ครบ) · ref audit = BE-017
be-008.md · Done-check: · (REQ-009) commit ระหว่าง stage ที่มีไฟล์นอก allow → violation · repo + `gituse` true/false ได้โหมด git เหมือนกัน (AC-026) · role เขียน sta-config → violation
be-011.md · Depends on: BE-016, BE-017 (REQ-009)
be-011.md · Traces: REQ-009 (AC-029, AC-030, AC-031), DES-016
be-011.md · Scope: · (REQ-009) ตอนสร้าง run เรียก BE-016 resolve `gitPolicy` ของ docsRoot + codeRoots แล้ว freeze ผ่าน BE-007 · `warning` → terminal + run state แล้ว run ต่อ (AC-031) · snapshot/ref audit (BE-017) ก่อน-หลังทุก stage · driver ไม่ commit เอง (AC-030)
be-011.md · Done-check: · (REQ-009) root ไม่ใช่ repo + เปิด → warning, run ไม่ล้ม · fake git runner ยืนยันว่า driver ไม่เรียก git เขียนใด
be-012.md · Traces: REQ-009 (AC-027, AC-030), DES-016 ชั้น 2
be-012.md · Scope: · (REQ-009) git flags จาก `packet.gitPolicy`: `--disallowedTools` กลุ่มห้ามเสมอของ DES-016 (Bash + PowerShell) ทุก stage · ทุก root ของ stage ปิด → เพิ่ม `git add`/`git commit` ใน disallowed · มี root เปิด → `--allowedTools` `Bash(git add:*)`, `Bash(git commit:*)` (รูป rule `inferred` — ยืนยันที่ QA-001) · ผลจริงเมื่อ cwd อยู่ใต้ `code\` ขึ้นกับ Waiting on Human #5
be-012.md · Done-check: · (REQ-009) command line มีกลุ่มห้ามเสมอทุก stage · root ปิดหมด → `git add`/`git commit` อยู่ใน disallowed · มี root เปิด → อยู่ใน allowed
be-015.md · Depends on: BE-016 (REQ-009)
be-015.md · Traces: REQ-009 (AC-029, AC-031, AC-032)
be-015.md · Scope: · (REQ-009, DES-009 Rev 9) `GET /api/config` ต่อ knowledge/target เพิ่ม `gituse` (boolean|null), `gituseEffective`, `gituseBasis`, `repo`, `auditMode`, `warning` · `GET /api/modules/\<name\>` มี `gitPolicy` ที่ freeze ของ run ล่าสุด · start ไม่ปฏิเสธเพราะ git · ไม่มี endpoint สลับ `gituse` / remote
be-015.md · Done-check: · (REQ-009) field `gituse*` ครบและตรง sta-config · ไม่มี field remote (AC-032) · root ไม่ใช่ repo + เปิด → `warning` และ start ยังผ่าน (AC-031)
fe-001.md · Traces: REQ-009 (AC-029, AC-031)
fe-001.md · Scope: · (REQ-009) แสดงสวิตช์ `gituse` ต่อ knowledge/target (ค่าที่ตั้ง/effective/basis/`warning`) อ่านอย่างเดียว ไม่มีปุ่มสลับ + `gitPolicy` ของ run ล่าสุดในหน้าสถานะ module
fe-001.md · Done-check: · (REQ-009) ค่าสวิตช์บน UI ตรง `/api/config`, ไม่มีปุ่มสลับ, warning ของ root ที่ไม่ใช่ repo แสดง (AC-031)
setup-003.md · Objective: · `/gituse` + hard rule git แบบมีเงื่อนไข (REQ-009) แยกเป็น SETUP-006 (2026-10-05)
setup-005.md · Traces: REQ-009 (AC-028, AC-032)
setup-005.md · Scope: · (REQ-009) schema มี `gituse` optional (knowledge/target) — prompt **ไม่เขียน** `gituse` (ไม่ตั้ง = เปิด AC-028; รอ Waiting on Human #6), รักษา `gituse` เดิมของรายการที่มีอยู่ตอน append, ไม่เขียน `git`/remote (AC-032)
setup-005.md · Done-check: · (REQ-009) รายการใหม่ไม่มี key `gituse`/`git` · รายการเดิมที่มี `gituse` คงค่าเดิม
qa-001.md · Depends on: BE-016, BE-017 (REQ-009)
qa-001.md · Traces: REQ-009 (AC-025, AC-026, AC-027, AC-028, AC-030, AC-031, AC-032), DES-016
qa-001.md · Scope: · (REQ-009) run จริงบน root ที่สวิตช์เปิด / ปิด / ไม่ใช่ repo
qa-001.md · Done-check: · (REQ-009) root เปิด → AI commit ได้ไม่มี violation และ orchestrator ไม่ commit เอง (AC-030) · root ปิด → commit ถูกจับ `git-commit-off` (AC-027) · branch/push ถูกกัน (claude ชั้น 2) หรือถูกจับ `git-ref` (AC-030) · non-repo → warning run ไม่ล้ม (AC-031) · ไม่มี remote/ไม่ตรวจ origin (AC-032)
qa-001.md · Risk: · (REQ-009) ผล commit ผ่าน claude ขึ้นกับ Waiting on Human #5 · ใช้ target `code/agent-team` ได้หลังตอบ #7
qa-002.md · Depends on: SETUP-006 (REQ-009)
qa-002.md · Traces: REQ-009 (AC-029, AC-030), DES-016 §solo, DES-017
qa-002.md · Done-check: · (REQ-009) `/gituse` (claude/zcode = slash command, codex/agy = ข้อความตาม `AGENTS.md`) เปลี่ยนค่าใน sta-config; run ที่ขับอยู่ใช้ค่าเดิม run ถัดไปใช้ค่าใหม่ (AC-029) · session ไม่ commit ที่ root ปิด และไม่ push/branch/merge (AC-030)
```

### Archive C — Waiting on Human ของ `plan\index.md` ที่ปิดแล้ว (แถวเดิมตรงตัว) + คำตอบ

```markdown
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
```

- คำตอบ #3, #4, #5, #6, #8 — เจ้าของ (jtrp98) เลือก "ไป release ถัดไป" 2026-10-05 → #8 = (b); #3–#6 ไม่ต้องตอบใน R1 — ถามใหม่เมื่อดึง REQ-009 กลับ (BL-018)
- คำตอบ #7 — เจ้าของ (jtrp98) 2026-10-05: (b) build orchestrator แบบ solo เท่านั้น ไม่แก้ deny ไม่มีข้อยกเว้น (risk #14 — `design\index.md` §Impact on built code)
- #1, #2 — ตอบแล้ว 2026-10-04 (ตามแถว)

## Change Log

- 2026-10-04 — สร้าง backlog ตั้งต้นจาก requirement §ไม่อยู่ใน release + design Rev 5 (tech debt / policy alignment)
- 2026-10-05 — เพิ่ม BL-012 (ความเสี่ยงคงเหลือ DES-016 ชั้น 2 ของ codex/agy) จากการ plan REQ-009
- 2026-10-05 — replan R1 ขยาย (REQ-010…021): REQ-009 → R ถัดไปตามเจ้าของ (jtrp98) — เพิ่ม BL-013…018 + §Archive A/B/C (task BE-016/BE-017/SETUP-006, ส่วน "(REQ-009)" ที่ถอด, Waiting on Human #1–#8 ที่ปิด — ตรงตัว) · BL-019…021 จาก OQ-10/18/19 · BL-022 (AC-060 partial) · BL-001 Decision = ดึงเข้า R1 ผ่าน REQ-013
- 2026-10-06 — replan Rev 11/12: เพิ่ม BL-023…030 จาก Minor ค้างของ review round 1–4 (REV-002/007/008/009/012/013/014) + qa round 2 (qa:QA-002) · BL-027/028 บันทึกเป็น closed · REV-003…006/010/011 resolved แล้ว (ไม่ลง) · ใช้รูปมีหมวดนำ `review:`/`qa:` (DES-020)
- 2026-10-06 — BL triage โดยเจ้าของ (jtrp98): BL-023/024/029/030 ดึงเข้า R1 → task SETUP-009 (`test-planner.md` ไฟล์เดียว — ฝั่ง PM ของ BL-024 ยังไม่ตัดสิน) · BL-025/026 → R ถัดไป · กรอกคอลัมน์ Decision เท่านั้น ไม่ลบแถว
- 2026-10-06 — BL-024 ฝั่ง `project-manager.md:46-50` → R ถัดไป (เจ้าของ jtrp98) — ต่อท้าย Decision เดิม ไม่ลบ
- 2026-10-06 — เพิ่ม BL-031…033 จาก Minor ของ review round 5 (REV-015/016/017; REV-015/016 ยืนยันซ้ำใน qa round 3) · Decision = R ถัดไป รอเจ้าของ (jtrp98) ย้ายเข้า · ไม่สร้าง task
- 2026-10-06 — เพิ่ม BL-034…038 จาก Minor ของ review round 6 (REV-018/019/020) + qa round 4 (qa:QA-003 + ข้อสังเกตเลขบรรทัด `data-model.md:65`) · Decision = R ถัดไป รอเจ้าของ (jtrp98) ย้ายเข้า · BL-034/035 มีข้อเสนอ PM ให้ตัดสินก่อน QA-001 (ยังไม่ใช่การตัดสิน) · ไม่สร้าง task ไม่แตะ `plan\index.md`
- 2026-10-06 — เพิ่ม BL-039…043 จาก Minor ของ review round 7–9 (REV-023/025/026/027/028) · REV-022 resolved โดย backend-engineer (review round 8) และ REV-024 แก้โดย qa-engineer (qa round 5) จึงไม่ลง · Decision = R ถัดไป รอเจ้าของ (jtrp98) ย้ายเข้า · BL-041 การตัดสิน release-cut เป็นของเจ้าของ (ไม่ใช่ human gate ใหม่ — ไฟล์ round เก่าคง verbatim ได้) · ไม่สร้าง task ไม่แตะ `plan\index.md`
- 2026-10-06 — เพิ่ม BL-044…048 จาก Minor ของ review round 10–12 (REV-029/030/031/032) + qa round 11 (qa:QA-004) — รอบปิด phase 2 · ไม่จดซ้ำที่ resolved · Decision = R ถัดไป รอเจ้าของ (jtrp98) ย้ายเข้า · ไม่สร้าง task ไม่แตะ `plan\index.md`
- 2026-10-07 — เพิ่ม BL-049…064 จาก Minor ของ review round 16–20 (REV-041, REV-042/043, REV-044, REV-047…052, REV-053/054) + qa round 13/16/17 (qa:QA-005/006/008) + หมายเหตุ SA (DES-002 `--json-schema` — จาก fix qa:QA-007) — ปิดงาน build phase 3 · ไม่จดซ้ำที่ resolved (REV-045/046, qa:QA-007/009 · qa:QA-010 Important open = อยู่ human gate ไม่ลง backlog) · REV-047 ส่ง security stage phase 3 อ่านด้วย · BL-058 owner project-manager (ตัดสินขอบเขต) · Decision = R ถัดไป รอเจ้าของ (jtrp98) ย้ายเข้า · ไม่สร้าง task ไม่แตะ `plan\index.md`
