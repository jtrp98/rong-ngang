# agent-team — QA Round 14 — BE-006 + BE-008

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim · live Open Issues / Unverified Behaviour อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| QA-005 | BE-020 | Minor | → backlog (des-019/des-020 เกินงบ — system-analyst archive) |
| review:REV-040 | BE-008 | Minor | → backlog (contract gap ลบแถว Tasks = status-write — system-analyst pin ก่อนเวฟ PM replan — `review\round-15.md`) |
| review:REV-041 | BE-008 | Minor | → backlog (untracked binary นับบรรทัดต่ำกว่าจริงได้ — backend-engineer — `review\round-16.md`) |

## Round 14

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` (code\agent-team) | pass — tests 145 / pass 145 / fail 0 |
| typecheck | — | ไม่มีกำหนดในโปรเจกต์ (package.json มีแค่ start/test · tsx รัน .ts ตรง ไม่มี tsc/tsconfig) |
| lint / build | — | ไม่มีกำหนดในโปรเจกต์ |
| live BE-006 | `npx tsx` สคริปต์ชั่วคราว (OS temp) อ่าน src จริง | pass 29/29 — ประกอบ packet จริงของ BE-021 จาก config/role prompt/module จริง |
| live BE-008 | `npx tsx` สคริปต์ชั่วคราว + fixture git repo จิ๋วใน OS temp | pass 28/28 — fixture ลบแล้ว ไม่แตะ repo โปรเจกต์ |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-006 | verified | live packet จริงของ BE-021 (รายละเอียดด้านล่าง) + `test\contract.test.ts` 23 test ผ่านใน npm test |
| BE-008 | verified | live audit บน fixture git repo จิ๋ว (รายละเอียดด้านล่าง) + `test\session-audit.test.ts` 20 test ผ่านใน npm test |

**BE-006 — live check 29/29:**
- `loadContext` BE-021: error null · readSections 11 ไฟล์ครบตาม References (`plan\index.md`, `plan\be-021.md`, req-011/012/015/016/017/018, des-018/019/020) — ทุก path มีจริงบนดิสก์
- `rolePrompt.hash` ตรง sha256 ไฟล์ `backend-engineer.md` จริง · body/tools ไม่ว่าง
- `packetProblems(packet)` = [] · PacketV2 ครบ 25 field ตรง data-model · gitPolicy คัด 4 field verbatim ต่อราก (2 รากจริง) · writeScope มาจาก routing.yaml จริง
- AC-033: ไม่มี field conversation/history/messages ใดใน packet
- guard: `USER_TEXT_GUARD` อยู่บรรทัดชิดก่อนข้อความดิบ · ไม่มี raw → ไม่มี guard
- handoff validator: ถูกรูป (DONE, kind execution) ผ่านทั้ง 2 ชั้น · outputState นอก 7 ค่า → ติดชั้น schema (AC-068) · NEEDS_HUMAN ไม่มี questionsForHuman → กฎ (2) · securityGate ใน kind execution (ห้าม) → กฎ (7) · securityGate null/ไม่มี field → ผ่าน (additive G2-f)
- test ครอบ AC ครบทุกข้อ: AC-062 (กฎ 3), AC-050 (กฎ 4 review), AC-054 (กฎ 4 qa.checks ซ้ำ), AC-058 (กฎ 4 flows ว่าง), AC-055 (defect field), AC-068, AC-033, fake adapter (`camp-adapter.ts` — core ไม่ import camps)
- REV-037/038 resolved ยืนยันผ่าน test pin: SCHEMA_KEYWORDS (`contract.test.ts:265`) + handoff.module ว่างติดทั้ง 2 ชั้นเสมอ (`:452`)

**BE-008 — live check 28/28 (fixture: target root + knowledge root แยกกัน, git จริงผ่าน `defaultGitRunner`):**
- snapshot.json = {path → sha256} ตรง hash จริง · pre-image ของไฟล์ใต้ claim + ของ `plan/index.md` (เสมอ) ถูกเก็บ
- เขียนใน claim → 0 violation · touchedFiles ถูกตัว · mode git ไม่ partial · diffApprox false · diff.patch มี numstat จาก `git diff --no-index` (รูป old => new ตามหัวกำกับ)
- นอก claim ใน allow → `unclaimed-write` + suspects รวมตัวเอง · ไม่เข้า touchedFiles
- นอก allow → violation kind `write` detail อ้าง AC-007
- แก้ Status แถวเดิม (qa-engineer) → `status-write` อ้าง AC-073 · journal (path+hash ตรง) ครอบ plan → ไม่ violation (BE-022) · journal hash ไม่ตรง → ยังโดน (fail-closed)
- finish ใหม่อ่าน snapshot.json จากดิสก์ → touchedFiles ของ session ค้างเหมือนเดิม (AC-066 — snapshot รอด restart)
- **REV-039 resolved ยืนยันด้วย live fixture:** preimageMaxMB 0 → ไฟล์ใต้ claim ไม่มี pre-image แต่ plan/index.md ยังได้ pre-image เสมอ · `diffApprox: true` ตั้งเสมอ · numstat ของไฟล์ tracked มาจาก `git diff HEAD` (`2\t0\tsrc/claimed.ts`) · ไฟล์ untracked ใหม่ปรากฏใน numstat (`2\t0\tsrc/new-qa14.ts`) + `# approx` กำกับ — ไม่หายเงียบจาก diff.patch
- AC-043: สอง session claim ไม่ชนเขียนพร้อมกัน → แต่ละ session attribution เฉพาะไฟล์ claim ตัวเอง (ไฟล์ของอีก session ถูกข้าม)
- test ครอบ AC ครบทุกข้อ: AC-007/AC-052 (reviewer แตะ codeRoots), AC-043, AC-060 (test-planner 2 path), AC-073 (ทุกกรณี + PM แถวใหม่ pending), AC-066, journal, resolveClaim/claimsOverlap, universal deny (risk #14), git argv array ไม่มี shell

### Feature QA flows

(ไม่ใช่รอบ Feature QA — ข้าม)

### Data Model check

- PacketV2: field จริงใน packet 25 = data-model 25 (เทียบด้วยสคริปต์ทีละ field) · HandoffV2: schema properties 18 = 17 + `securityGate` ตรง data-model · `securityGate` ไม่ required (additive)
- `writeAudit` จาก `finishSessionAudit` ตรง `SessionRecord.writeAudit`: mode/partial/diffApprox/changed/touchedFiles/violations{kind,path,detail,suspects}/gitRefs — gitRefs `[]` ตาม design (ref audit = BL-015/017)
- `allowedStatesFor` ตรงตาราง DES-018 (test pin + live: DONE ผ่านสำหรับ kind execution)

### Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

ไม่มี — ไม่เปิด QA-006

## Unverified Behaviour — undeployed phases

- Phase 3 (ยังไม่ deploy): dispatch บน camp จริงยังไม่มี (BE-012 ยังไม่ build) — CampAdapter ตรวจด้วย fake adapter เท่านั้น · scheduler จริงกัน claim ทับ (BE-011 ยังไม่ build) — AC-043 ตรวจที่ชั้น audit · journal ตัวจริง BE-022 ยังไม่มี — ตรวจผ่านพารามิเตอร์ตรง interface · gitPolicy จริงมาจาก derive ที่ยังไม่ทำ (BL-017) — live ใช้ fixture รูป RunJson ตามรากจริง · กฎ (5) จะทำงานเมื่อ PM DONE ใน change chain จริง

## Change Log

- 2026-10-06 — Round 14 — BE-006 + BE-008 ✅ Verified — npm test 145/145 + live check 29/29 (BE-006), 28/28 (BE-008) · review:REV-039 ยืนยัน resolved ด้วย live fixture (diffApprox true + untracked ปรากฏใน numstat) · sync Status `pending → verified` 2 แถว · ไม่มี QA finding ใหม่ (ไม่เปิด QA-006) · review:REV-040/041 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
