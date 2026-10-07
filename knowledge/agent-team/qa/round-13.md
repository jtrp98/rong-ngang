# agent-team — QA Round 13 — BE-020 + BE-007

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| QA-005 | BE-020 (design) | Minor | → backlog — owner `system-analyst`: des-019/des-020 เกินงบ 8 KB หลัง pin REV-034…036 (ผลวัดด้านล่าง) |
| review:REV-034 | BE-020 | Minor | pin ครบแล้ว (des-019 §Defect packet + des-020 แถว execution — 2026-10-06) · โค้ดตรง pin ยืนยัน live รอบนี้ · จด backlog ตาม round-14 |
| review:REV-035 | BE-020 | Minor | pin ครบแล้ว (des-019 §Feature QA union + des-020 แถว feature-qa) · test ครอบ `context-loader.test.ts:224-234` · จด backlog ตาม round-14 |
| review:REV-036 | BE-020 | Minor | ปิดจริงแล้ว — แถว uxui ใน des-020 + CFG (`context-loader.ts:239,254`) + test (:299-343) + live 3 กรณีรอบนี้ · จด backlog ตาม round-14 |

## Round 13

**Status:** ✅ Verified

ตรวจ artifact จริง ณ 2026-10-06 · review round 14 PASS ทั้งคู่ · รอบนี้รันเช็ค + live resolve/store ด้วยตัวเอง รวม amendment uxui (design pin REV-036) ที่เพิ่มหลัง round 14

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` (ที่ `code\agent-team\`) | pass — tests 102 · pass 102 · fail 0 (99 + 3 uxui ใหม่ — นับ `test()` ได้ 23+15 ตรง) |
| smoke | `npm start` | pass — skeleton message (SETUP-001 stub — ไม่มี script typecheck/lint/build) |
| live BE-020 | `npx tsx <tmp>\qa13-be020.ts` | pass — 3 กรณีบน module จริง (ผลด้านล่าง) |
| live BE-020 uxui | `npx tsx <tmp>\qa13-uxui.ts` | pass — 3 กรณี fixture tmp |
| live BE-007 | `npx tsx <tmp>\qa13-be007.ts` | pass — วงจรครบใน tmp · ระหว่างทาง validator ปฏิเสธ `tasks[BE_003]` ผิดรูปจากสคริปต์ QA เอง (fail-closed ทำงานจริง) |
| state จริง | `ls code\agent-team\state` | pass — ก่อน/หลังรันทุกอย่างมีแค่ `.gitkeep` (ไม่มีเศษ — ไม่ต้องลบ) |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-020 | verified | live บน module จริง: (1) execution BE-020 → `error: null` readSections 8 ไฟล์ตรง References — ไม่มี round เก่า/conversation (AC-046/033) · contextFiles บันทึกชนิดครบ `task:BE-020 -> …` (AC-047) (2) fix session BE-018 + defectPacket `findings[].id = REV-021` → `review\round-7.md` ตรงตาราง review index (ข้อ 1 field มีชนิด — REV-034 pin) + REQ/DES จาก finding.reference ไม่มี index เพิ่ม (3) TP-001 บน module ไม่มี test-plan\ → `context-error {id: TP-001, index: test-plan\index.md}` readSections ว่าง (AC-048 ไม่เดา path) (4) uxui: ไม่มี uxui\ / uxui\ ว่าง → 0-hit `error: null` ตาม pin · มี artifact → `uxui\UX-001-login.md` kind ux · fail-closed เดิมคงอยู่ (>1 ไฟล์ / id หาไม่เจอ) · test 23 ชิ้น ครบ AC |
| BE-007 | verified | live วงจรใน tmp: (1) createRun → pointer + sessions/ + defects/ ครบ (2) transition แล้วจำลอง crash ทิ้ง `run.json.tmp-999-dead` → อ่านของเดิมได้ + save ต่อได้ (atomic tmp+rename — `state-store.ts:200-205`) (3) run.json เสีย → `StateError corrupt` + `run.json.corrupt-<ts>` + run.json ไม่ค้างให้ทับ (`:323-341`) (4) ปิด/เปิดใหม่ → reconcile เอกสารชนะ: plan verified → step `verified` hold null (AC-034) แต่ attempt=2/fixRounds=1 คงจาก state · `phases{1}{featureQa fail, featureQaSessionId s-1-abcd, cleared false}` คงค่าจากดิสก์ · `handoff.securityGate` คงค่า + `collectSecurityGates` อ่านได้ (5) validator ปฏิเสธ state ผิดรูปก่อนเขียน (`:351`) · test 15 ชิ้น ครบ AC · test ทั้งไฟล์ใช้ `os.tmpdir` |

### AC coverage (test ไฟล์จริงเทียบ Acceptance ของ task file)

- **BE-020:** AC-046/033 `context-loader.test.ts:99-124` · AC-047 `:107-110, 277-281` · AC-048 `:126-161, 345-366` · AC-042 `:163-189` · AC-035 `:368-388` · id ชน 3 รูป `:253-282` · ทุกแถว CFG `:163-251, 299-343` · module จริง `:391-404`
- **BE-007:** atomic ทน crash `state-store.test.ts:112-124` · corrupt → quarantine + ไม่สร้างทับ `:126-143` · missing → derive `:145-151` · pointer เสีย `:153-164` · เอกสารชนะ AC-034 + pure `:166-189` · task เพิ่ม/ลด + anchor ⇔ cleared + hook `:191-239` · phases{} `:241-258` · gate scope/answered `:260-295` · securityGate `:297-320` · SessionRecord ค้าง (AC-066/075) `:322-345` · AC-065+AC-002 วงจรครบ `:364-392`

### Data Model check

เทียบ `design\data-model.md` กับ `state-store.ts` — ตรงทุก field ไม่มี divergence:

- `RunJson` (data-model.md:87-97) ↔ `state-store.ts:109-124` — mode/status/planFormat ครบชุด · configSnapshot 4 key · gitPolicy 10 field · `phases{PhaseRuntime}` ตรง (:31,105-107)
- `TaskRuntime` (data-model.md:98-108) ↔ `:67-76` — step 9 ค่า · hold.reason 12 ค่า · counters int
- `SessionRecord` (data-model.md:109-125) ↔ `:78-95` — kind/outcome 7 ค่า · writeAudit/violations(5)/gitRefs ตรง
- `GateRecord` (data-model.md:126-132) ↔ `:97-103` — scope 3 ค่า + AC-072 ครบ · `HandoffV2` (data-model.md:160-171) ↔ `:51-65` ครบรวม `securityGate` (G2-f/R23)

### ผลรัน live (output จริง)

- BE-020 (module จริง): readSections = `["plan\index.md","plan\be-020.md","req-014","req-010","req-012","des-020","des-012","des-014"]` · fix session `resolved REV-021 = {kind: rev, path: review\round-7.md}` · TP-001 → `error {id: TP-001, index: test-plan\index.md}` readSections `[]`
- uxui: ไม่มี uxui\ / ว่าง → `error: null` resolved UX-001 `null` · มี artifact → `uxui\UX-001-login.md`
- BE-007: `corrupt: kind = corrupt · quarantine = true · ไม่ค้าง = true` · `resume: step = verified · hold = null · attempt/fixRounds = [2, 1]` · `phases[1] คงค่า` · `securityGate = [{phase: 1, …}]` · `collect = [["1","พบ Critical — security re-audit"]]`
- งบขนาด (`wc -c`): des-019.md = 8,835 B · des-020.md = 8,703 B — **เกินงบ 8 KB (8,192 B)** ที่หัวไฟล์ประกาศ → qa:QA-005 (Minor → backlog — pin ใหม่บวมไฟล์; ทางแก้ตาม policy §4: archive ส่วน Rev เก่า verbatim ลง `design\archive.md` · ไม่ break AC ใดใน scope)

Teardown: fixture ทั้งหมดใน OS temp และลบแล้ว · `code\agent-team\state\` ยังมีแค่ `.gitkeep`

## Unverified Behaviour — undeployed phases

- **Phase 3:** loader/store ยังไม่ถูกเรียกจาก orchestrator จริง — เติม `readSections` ลง `SessionRecord.contextFiles` ตอน dispatch + บรรทัดแรก session log (BE-006/BE-011) · hook `depsSatisfied` ที่ driver ผ่านจริง (BE-011) · kill/restart จริงจาก `findOpenSessions` (BE-011) · defect packet ที่ orchestrator สร้าง (BE-021) — รอบนี้ยืนยันเฉพาะชั้น component + live ต่อ API
- แถว `devops-stage` resolve ผ่าน test เท่านั้น — module จริงยังไม่มี dispatch devops

## Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

### QA-005

- **Task:** BE-020 (design des-019/des-020 — owner `system-analyst`) · **Severity:** Minor → backlog
- **Expected:** `design\des-NNN.md` ≤ 8 KB (`policies\documentation.md` §4 — วัด `wc -c`; หัวไฟล์ประกาศเองด้วย)
- **Actual:** des-019.md = 8,835 B · des-020.md = 8,703 B — เกินจาก pin REV-034/035/036 (Change Log 2026-10-06) ที่เพิ่มข้อความลงทั้งสองไฟล์
- **Reproduce:** `wc -c design\des-019.md design\des-020.md`
- **Evidence:** ผลวัดใน `### ผลรัน live` · precedent REV-027/qa:QA-004 (เอกสารเกินงบ = Minor → backlog) · ไม่ break AC ใดของ BE-020/BE-007

## Change Log

- 2026-10-06 — Round 13 — BE-020/BE-007 ✅ Verified · รันเช็คเอง (npm test 102/102 · live BE-020 3 กรณี module จริง + uxui 3 กรณี · live BE-007 วงจรครบ · state\ สะอาด) · sync Status `pending → verified` 2 แถวใน `plan\index.md` · qa:QA-005 Minor → backlog (des-019/des-020 เกินงบ 8 KB) · review:REV-034/035/036 ยืนยัน pin ครบ + โค้ดตรง pin แล้ว

Back-links: `plan\index.md` · `..\index.md` · `..\review\round-14.md`
