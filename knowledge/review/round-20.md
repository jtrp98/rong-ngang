# agent-team — Review Round 20 — BE-011 (fix round 1 — REV-045/046)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · 1 round ต่อ 1 ไฟล์ · ตรวจเฉพาะการแก้ REV-045/046 + จุดที่ engineer ขอให้ตัดสิน · REV-047…052 คง Minor → backlog (ไม่ตรวจ)

## Findings

### REV-045 — resolved

- **Severity:** Important (blocking) — round 19
- **Task:** BE-011
- **Location:** `src/main.ts:44-135` (เดิม stub 1-19)
- **Fix (ตรวจแล้ว):** terminal entry จริง — args `<knowledge> <target> <module> --date YYYY-MM-DD [--resume]` (`main.ts:54-72` — ลำดับเลือกตาม DES-015:17 · --date บังคับ regex ไม่เดาวันที่) · config fail-closed ก่อนแตะ state (`main.ts:76-80` — DES-001 "config ไม่ผ่าน → run ไม่เริ่ม") · `resolveRunRoots` ปฏิเสธ path ไม่มีจริงพร้อม path ก่อนสร้าง driver (`main.ts:84-88` — DES-015 fail visibly) · start/resume ผ่าน PipelineDriver เท่านั้น (`main.ts:95-97` — --resume ไม่มี pointer → ปฏิเสธ; ไม่มี --resume + มี pointer → วิ่งต่อ AC-003) · แจ้ง gate waiting-on-human ทาง stdout (`main.ts:104-108` + `gateLine` :39-42 — ข้อความสั้น DES-008) · `invokedDirectly` คงเดิม (`main.ts:121-135`) · default adapter = ClaudeAdapter (BE-012) ตรง Expected Output "รันด้วย adapter จริงได้" · ข้อสังเกตรอบ 19 (comment อ้าง "BE-001 จะแทนที่") แก้แล้ว (`main.ts:1-11,115-116`) · test ใหม่ 4 (`test/main.test.ts:216-284`): args ไม่ครบ/flag แปลก/--date หาย, path ไม่มีจริง (ยืนยันไม่มี state เกิด `main.test.ts:244`), วงจรครบ completed, resume ตาม pointer · ตรงต่อ be-015.md:7,19 ที่รอต่อ
- **Reference:** be-011.md:20,30 · DES-001 Goal · DES-015:17,19,23

### REV-046 — resolved

- **Severity:** Important (blocking) — round 19
- **Task:** BE-011
- **Location:** `src/core/scheduler.ts:166-177` (เดิม :171 localeCompare) + `src/core/driver.ts:874`
- **Fix (ตรวจแล้ว):** `reviewDispatches` รับ `order: Map<string,number>` — เรียงผู้สมัครด้วย rank = ลำดับแถว plan ก่อนจัดกลุ่ม phase แล้ว pack (`scheduler.ts:174-179`) · id ไม่มีใน plan → MAX_SAFE_INTEGER + tiebreak id (deterministic — comment :163-165 อธิบาย why) · driver ส่ง `this.order` = `rowOrder(plan)` ที่ refresh ทุก tick (`driver.ts:874` + `driver.ts:313`) · caller เดียวใน production (grep ยืนยัน) · test ใหม่: unit (`test/scheduler.test.ts:139-157` — ลำดับ id ≠ ลำดับแถว ได้ ["BE-200","BE-100"] + กรณี no-order fallback) และ integration (`test/driver.test.ts:433-443` — wave taskIds ตามแถวตาราง) · qaDispatch คง localeCompare ได้ — DES-019 §QA ข้อ 1 ไม่มีเพดาน/ไม่ pack (รวมทุกตัว ณ ตอนเปิด) ลำดับไม่มีผล
- **Reference:** DES-019 §review wave ข้อ 3 · AC-051

### REV-053 (ใหม่)

- **Severity:** Minor → backlog
- **Task:** SETUP-001 (ต่อเนื่อง BE-011)
- **Location:** `test/skeleton.test.ts:6-10` + `src/main.ts:117-118`
- **Problem:** placeholder test ของ SETUP-001 ยัง assert `SKELETON_MESSAGE` ทั้งที่ main.ts ไม่ใช่ skeleton แล้ว — การคง export ถูกต้องชั่วคราว (ไฟล์ test อยู่นอก Write paths ของ BE-011 · ข้อความใหม่ตรงจริงและ match /SETUP-001/) แต่ต้องมีกำหนดเลิก: PM ตัดสินขอบเขต (ลบ test + export เมื่อ SETUP-001 ปิด/revise) แล้ว engineer แก้ตาม
- **Reference:** be-011.md:21 (Write paths) · skeleton.test.ts ของ SETUP-001
- **Owner:** project-manager (ตัดสิน) → backend-engineer (แก้)

### REV-054 (ใหม่)

- **Severity:** Minor → backlog
- **Task:** BE-011
- **Location:** `src/core/scheduler.ts:185` + `:214`
- **Problem:** ลำดับ phase ของ waves/QA ยัง lexicographic (`[...byPhase.keys()].sort()`) — DES-019 §review wave ข้อ 3 พูดถึงเฉพาะลำดับผู้สมัคร "ใน" phase (แก้แล้ว) · ข้าม phase ไม่มีข้อความ pin ใน DES-019 (ข้อ 4 เปิดราย phase) แต่ DES-001 ลำดับคิว "(2) Phase น้อยก่อน" ตีความครอบได้ และ orderedRunnable/orderedResumable ใช้ rank เป็นเลขแล้ว (`scheduler.ts:75-86,146-155` — test "phase 2 ก่อน 10") → เมื่อ label ≥ 10 หรือ sort คนละแบบ wave ของ phase "10" จะแซง "2" ต่างจากคิว execution · deterministic ยังอยู่ ผลจำกัด (wave เปิดช้าลง ไม่ใช่ไม่เปิด) → ไม่ block
- **Reference:** DES-001 §DAG scheduler (ลำดับคิว) · DES-019 §review wave ข้อ 3-4
- **Owner:** backend-engineer (align rank เป็นเลข หรือเสนอ SA pin ว่า lexicographic ได้)

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-045 | Important | src/main.ts:44 | backend-engineer | resolved (round 20) |
| REV-046 | Important | src/core/scheduler.ts:166 | backend-engineer | resolved (round 20) |
| REV-047 | Minor | src/core/driver.ts:436 | backend-engineer | → backlog |
| REV-048 | Minor | src/core/driver.ts:403 | backend-engineer | → backlog |
| REV-049 | Minor | src/core/driver.ts:713 | backend-engineer | → backlog |
| REV-050 | Minor | src/core/driver.ts:1404 | system-analyst | → backlog |
| REV-051 | Minor | src/core/driver.ts:808 | backend-engineer | → backlog |
| REV-052 | Minor | src/core/driver.ts:1081 | backend-engineer | → backlog |
| REV-053 | Minor | test/skeleton.test.ts:6 | project-manager | → backlog |
| REV-054 | Minor | src/core/scheduler.ts:185 | backend-engineer | → backlog |

## Round 20

**Verdict:** PASS

| Task | Verdict |
|---|---|
| BE-011 | PASS (หลัง fix round 1 — REV-045/046 resolved · ไม่มี Critical/Important open) |

- จุดที่ engineer ขอให้ตัดสิน (2): (1) **SKELETON_MESSAGE คง export = ถูกต้องชั่วคราว** — skeleton.test.ts:6-10 (SETUP-001, นอก Write paths ของ BE-011) ยัง import + assert อยู่ การลบ export จะทำ suite คอมไพล์ไม่ผ่านโดยแก้ไฟล์นอกขอบเขตไม่ได้ · ข้อความใหม่ (`main.ts:117-118`) ตรงความจริง ไม่หลอกผู้อ่าน · การเลิก placeholder → REV-053 ให้ PM ตัดสิน (2) **ลำดับ phase ของ waves lexicographic = ไม่ขัด DES-019 ข้อ 3** (ข้อความนั้นครอบเฉพาะผู้สมัครใน phase — ซึ่งแก้ตรงแล้ว) แต่ต่างมาตรฐานจาก "Phase น้อยก่อน" ของ DES-001 ที่ orderedRunnable ทำเป็นเลข → REV-054 Minor → backlog (ตีความของผู้รีวิว — ถ้า SA ต้องการ pin ต่างจากนี้ให้แก้ที่ REV-054)
- fix ไม่ทำสิ่งที่รอบ 19 ยืนยันไว้เสีย — อ่านซ้ำทั้งไฟล์: `transitionRunStatus` (`driver.ts:1396-1422` — completed = verified ทุก task + cleared ทุก phase + ไม่ active + ไม่มี gate open · log ทุก transition) · `applyParserIssueHolds` (`driver.ts:777-820` — hold แถว+dependents · routerOwnedRef เป็นของ router · ปลดเมื่อ plan แก้) · `killOrphan` (`driver.ts:429-468` — fail-open คงเดิมตาม REV-047 → backlog ถูกต้องที่ไม่แก้ใน release นี้) · pump/dispatchLoop/applyWrites/featureQa "queued" ตรงข้อสังเกตรอบ 19 ทุกจุด
- Evidence จาก driver: `npm test` **279/279 ผ่าน** (273 + 6 ใหม่ — main 4 · scheduler 1 · driver 1) · พิสูจน์ entry แบบ dry — ปฏิเสธทุกกรณี config ผิด/args ไม่ครบ/path ไม่มีจริงพร้อม path และไม่มี state เกิด (ตรง test main.test.ts:232,244) · ไม่รัน npm test เอง (นอกขอบเขต role — เดิมรอบ 19)
- ไม่มี git diff — "จุดอื่นคงเดิม" ตรวจด้วยการอ่านไฟล์เต็มเทียบข้อสังเกตรอบ 19 (line เลื่อนจาก param/comment ใหม่ใน scheduler.ts เท่านั้น)

## Reviewed

- `src/main.ts` · `src/core/scheduler.ts` · `src/core/driver.ts` (ทั้งไฟล์)
- `test/main.test.ts` · `test/scheduler.test.ts` · `test/driver.test.ts` (ทั้งไฟล์)
- จุดเรียกข้ามไฟล์ (grep): `reviewDispatches` (caller เดียว) · `SKELETON_MESSAGE` (skeleton.test.ts เท่านั้น) · `test/skeleton.test.ts:1-10`
- เอกสาร: `plan\be-011.md` · `plan\be-015.md` · `design\des-001.md` · `design\des-015.md` · `design\des-019.md` · `review\round-19.md` · `review\index.md`
- ไม่อ่าน `qa\` และ `security.md` — stay independent · ไม่รัน `npm test`

## Change Log

- 2026-10-07 — Round 20 — PASS (BE-011 หลัง fix round 1) · REV-045/046 resolved (ตรวจ fix จริงก่อนปิด) · เพิ่ม REV-053/054 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
