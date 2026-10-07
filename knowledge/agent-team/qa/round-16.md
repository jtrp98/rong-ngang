# agent-team — QA Round 16 — BE-011

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · live Open Issues / Unverified Behaviour อยู่ไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| QA-006 | BE-011 | Minor | → backlog |

- review:REV-047…052 (round 19) + REV-053/054 (round 20) Minor → backlog คงเดิม — รายละเอียดที่ `review\round-20.md` · REV-047 (killOrphan fail-open) ส่ง security stage phase 3 อ่านต่อ
- spawn CLI จริงด้วย ClaudeAdapter ยังไม่พิสูจน์ — ของ qa:QA-001 (Feature QA phase 6) — ดู `## Unverified Behaviour`

## Round 16

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` | pass — 279/279 fail 0 (11.9 s) |
| test (วงจร) | `npx tsx --test test/driver.test.ts test/scheduler.test.ts` | pass — 36/36 (driver 20 + scheduler 16) |
| typecheck/lint/build | — | none — `package.json` มีแค่ start/test |
| entry dry จริง | `npx tsx src/main.ts` 6 กรณี | ดูตาราง |

### Entry dry (รันจริง — ไม่ใช่ fake)

| กรณี | ผล | state |
|---|---|---|
| ไม่ใส่ args / positional ไม่ครบ | usage + exit 1 | ไม่เกิด |
| --date หาย | ปฏิเสธ "…ไม่เดาวันที่" + exit 1 | ไม่เกิด |
| knowledge root แปลก / target `no-such-target` | ปฏิเสธ sta-config พร้อมค่า + exit 1 | ไม่เกิด |
| module รูปแบบผิด (ส่ง path แทนชื่อ) | ปฏิเสธ regex `^[a-z0-9][a-z0-9-]*$` + exit 1 | ไม่เกิด |
| module ถูกรูปแต่ไม่มีเอกสาร (`no-such-module`) | run เริ่ม → planFormat none → waiting-on-human exit 0 — ไม่ spawn ใด (sessions []) | มี — เก็บกวาดแล้ว (QA-006) |

`<knowledge>`/`<target>` จับคู่ด้วย `name` ใน sta-config (`config.ts:763,765`) — ใส่ path จึงโดน "ไม่มีในรายการ" (ถูก) · "path ไม่มีจริงบนดิสก์" ของ root/target พิสูจน์ด้วย test `main.test.ts:236-246` (ผ่าน npm test — ปฏิเสธพร้อม path + ไม่มี state/dispatch) · resume ไม่มี pointer → ปฏิเสธ ที่ `main.test.ts:268-273`

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-011 | verified | ตาราง AC · npm test 279/279 · entry dry 6 กรณี · state จริงเหลือแค่ .gitkeep หลังเก็บกวาด |

### AC ต่อ test จริง

| AC | ครอบด้วย | ผล |
|---|---|---|
| AC-043 · 040 | "AC-043/AC-040: สอง task ไม่ขึ้นต่อกัน → execution สอง session พร้อมกัน" | pass |
| AC-045 | "AC-045: cap 2 กับ 3 task runnable → 2 รัน 1 คิว" | pass |
| AC-044 | "AC-044: FE ที่ Depends ถึง BE ไม่ถูก dispatch จน BE verified" | pass |
| AC-037 | "AC-037: แก้ Depends อย่างเดียว → waiting-deps → runnable" | pass |
| AC-039 · 079 | "AC-039/AC-079: dep-error + plan-error … multi-anchor → hold แถว + dependents · BE ปกติเดินต่อ" | pass |
| AC-074 | "AC-074: plan legacy → needsMigration + dispatch ทีละ session" | pass |
| AC-041 | "AC-041: session group ผ่านเกณฑ์ OQ-12 → packet เดียว" | pass |
| AC-042 | "review wave: สอง task awaiting-review → session เดียว (AC-042/AC-051)" | pass |
| AC-062 · 064 | "AC-062/AC-064: NEEDS_DESIGN_CHANGE → hold + SA → PM → impacted dispatch ใหม่" | pass |
| AC-066 | "AC-066: ปิด orchestrator ขณะรัน → resume — ไม่ revert" | pass |
| AC-075 | "AC-075: crash แรก → R16 + priorSession · ซ้ำ → R17 hold (fixRounds ไม่ขยับ)" | pass |
| AC-067 | วงจรครบ assert router.log ruleId ∈ R1–R24/dispatch/run-status/gate-answered/resume + `/llm\|ถาม model/` = 0 hit · CampAdapter มีแค่ dispatch/kill (`contract/camp-adapter.ts:55-58`) | pass |
| AC-057 · 080 | วงจรครบ: feature-qa ต่อ phase · security หลัง Feature QA (`fqa2 < sec`) · taskIds = verified ของ phase 🔒 | pass |
| AC-003 | "AC-003: resume กลาง review wave — R16 แล้ววิ่งต่อจน verified" + main.test resume ตาม pointer | pass |
| anchor ไม่ deadlock | วงจรครบ: ทุก task verified รวม FE-300 dependent ของ anchor QA-200 | pass |

วงจรครบ (test เดียว `test/driver.test.ts:369`): execution → review wave → QA round → verified → Feature QA → security (🔒) → cleared → completed · ขั้น fix (R4 — fixRounds นับ 1 + defect packet AC-055) อยู่ test "gate 4: review FAIL ครบ limit…" (`driver.test.ts:552,568`) · gate NEEDS_HUMAN → answer → record-only + เดินต่อ · rowOrder หลังแก้ REV-046: unit scheduler ("ผู้สมัครเรียงตามลำดับแถว plan") + integration ("BE-200 ก่อน BE-100") · wiring `driver.ts:313,874`

### จุดยืนยันเฉพาะ round นี้

- main.ts ไม่ spawn CLI เมื่อ config/args ผิด — ทุก dry ปฏิเสธก่อนสร้าง driver · run ว่าง sessions `[]` · test `main.test.ts:245` "ไม่มี dispatch" ผ่าน
- killOrphan recovery-only: จุดเรียกเดียว `driver.ts:416` ใน `resumeFrom` (DES-007) · spawnSync เฉพาะ taskkill/tasklist `shell:false` (`driver.ts:441,461`) · ไม่มี git · ไม่ถาม LLM
- REV-045 ตรวจซ้ำจากโค้ดจริง: args/usage `main.ts:53-72` · config fail-closed `:76-88` · start/resume ผ่าน PipelineDriver เท่านั้น `:95-97` · gate stdout `:104-108` · SKELETON_MESSAGE ข้อความใหม่ตรงจริง `:115-118`

### Data Model check

BE-011 ไม่นิยาม entity ใหม่ · run.json จาก entry dry มี field ครบตาม `design\data-model.md`: runId/module/mode/status/planFormat/scheduler(freeze)/newWorkText/configSnapshot(sha256 4 ไฟล์)/gitPolicy/tasks/phases/sessions/gateLog · router.log transition `queued → waiting-on-human` ตรง DES-001

### Issues Found (defect packet)

#### QA-006

- **Task:** BE-011 · **Severity:** Minor (Minor → backlog)
- **Expected:** ตาม brief — entry dry "module ไม่มีจริง → ปฏิเสธพร้อม path และไม่มี state เกิด"
- **Actual:** module ถูกรูปแต่ไม่มีเอกสาร (`no-such-module`) → run เริ่มจริง: สร้าง `state\modules\no-such-module.json` + `state\runs\r-20261007-113328-3584\` + router.log · waiting-on-human gates=0 · ไม่ spawn ใด · ผู้ใช้เห็นเฉพาะ "ไม่มี task ใดเดินได้ (ดู dashboard notes/state)" — note (`driver.ts:363`) in-memory ยังไม่มีช่องแสดงผลใน phase 3
- **ตัดสิน:** ไม่ขัด AC ใด — `driver.ts:361-363,856` จงใจ: ไม่มี plan = พื้นที่ intake ของ BE-010 (phase 5) · DES-015 บังคับปฏิเสธเฉพาะ root/target ซึ่งตรงจริงทุกกรณี · Minor → backlog: entry ควรพิมพ์ note ลง stdout เมื่อ run ว่าง ไม่ต้องรอ dashboard (BE-023) · Owner: backend-engineer
- **Reproduce:** `npx tsx src/main.ts rong-ngang-knowledge agent-team-code no-such-module --date 2026-10-07` แล้วดู `state\`
- **Evidence:** ตาราง Entry dry · `driver.ts:361-363,856` · `config.ts:763-770`

## Unverified Behaviour — undeployed phases

- Phase 6 (qa:QA-001 ต่อ): spawn CLI จริงผ่าน ClaudeAdapter ไม่เคยถูกเรียกจริง — evidence รอบนี้ใช้ fake adapter หรือ dry entry · `taskkill /PID /T /F` กับ process tree จริงยังไม่ทดสอบบนเครื่องจริง (design กำกับ "inferred" ไว้เช่นกัน) · killOrphan fail-open (REV-047) ค้าง — security stage phase 3 ต้องอ่าน

## Change Log

- 2026-10-07 — Round 16 — BE-011 ✅ Verified · qa:QA-006 Minor → backlog · sync Status BE-011 `pending → verified` — phase 3 verified ครบ 13/13

Back-links: `plan\index.md` · `..\index.md`
