# agent-team — QA Round 15 — BE-012, BE-019, BE-021, BE-009, BE-022

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| REV-042 | BE-019 | Minor | → backlog (review\round-17.md — handleCrash เดา kind เมื่อไม่ส่ง sessionKind) |
| REV-043 | BE-019 | Minor | → backlog (review\round-17.md — perTask อ้าง id นอก module ถูกข้ามเงียบ) |
| REV-044 | BE-009 | Minor | → backlog (review\round-18.md — multi-instance gate ซ้อน: contract gap รอ system-analyst pin แล้ว engineer align) |
| qa:QA-005 | BE-020 | Minor | backlog คงเดิม (des-019/020 เกินงบ — รอบ 13) |

ไม่มี finding ใหม่รอบนี้ (ไม่เปิด QA-006)

## Round 15

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| test (รวม — ครั้งเดียวต่อรอบ) | `npm test` ที่ `code\agent-team\` | **pass 239/239** (fail 0, skipped 0 — รันจริง 2026-10-06) |
| BE-012 live | `npx tsx <tmp>\be012-live.cts` (cjs/require) | pass — argv จาก `loadAppConfig()` camps.yaml จริงตรง DES-002 ทุก flag ตามลำดับ (`-p --output-format json --permission-prompts none --permission-mode dontAsk --model --effort --json-schema --append-system-prompt-file --allowedTools …Edit(<claim>)/Write(<claim>) --add-dir ×2`) · ไม่มี `--continue`/`--resume`/`--dangerously-skip-permissions` · test-planner → `--disallowedTools Bash` (AC-060) · brief stdin ไม่อยู่ใน argv · effort null ไม่ส่ง flag · `claudeOutputMeta` ไม่ใช่ JSON → null ทั้งคู่ |
| BE-019 live | `npx tsx <tmp>\be019-live.cts` | pass — R5 (fixRounds=limit → hold gate 4 `qa-critical`, ไม่ dispatch, ไม่นับเพิ่ม, Status blocked AC-071/076) · R7 (Critical → gate 4 ทันที แทน R4, localized BE-002 เดินต่อ, คำถามอ้าง QA-009 ตรงตัว) · R8 (ครบ Depends → runnable · id ไม่มีจริง → R9 hold `dep-error`) · R18 (Depends explicit ของ anchor ยังไม่ครบ → ไม่เปิด · phase 6 `cleared` ก่อน phase 7 เปิด · DEV-001 dependent ของ anchor ไม่ถูกรอ) · R21 (Minor-only → phase cleared · Critical → gate 5 scope phase) · AC-069 route 2 ครั้ง deepEqual |
| BE-021 live | `npx tsx <tmp>\be021-live.cts` | pass — waves 5×300 เส้น (maxDiffLines 800): `[T1,T2][T3,T4][T5]` ไม่มี wave เกินเพดาน (AC-051) · task 900 เส้น → solo · แถว plan-error ถูกปฏิเสธ · batchQaRound: tpReady=false → null (AC-061) · activeExecutions=1 → null (quiesce) · พร้อม → `{kind:"qa", taskIds:[T1,T2], quiesce:true}` (AC-054) · buildDefectPacket verbatim `{taskId, source, roundFile, findings}` + packet แนบ defectPacket ผ่าน `packetProblems` = [] (AC-055, pin REV-034) · planSecurityStage: ตัด owner reviewer/security + plan-error, เหลือ `BE-001`, ไม่ ordered/cleared/ไม่ 🔒 → null (AC-079/080) |
| BE-009 live | `npx tsx <tmp>\be009-live.cts` | pass — scope task: BE-001+dependent BE-002 held, BE-003 (phase 2) runnable ต่อ · dispatchBlocker บล็อกเฉพาะใน scope (AC-072/AC-013) · scope phase/module ครบ · owner จาก gates.yaml (`owner_default`→jtrp98 · แก้ config → record ใหม่ใช้ค่าใหม่, owner ต่อ gate ชนะ — AC-015) · append-only: ตอบแล้ว gateLog แถวเดียวกัน, เนื้อหา audit ไม่ถูกแก้, `answeredBy` ตามที่พิมพ์ (AC-016) · gate 4 ตอบแล้ว step ยัง `held` ค้างจน human-retry (AC-071 — ตรง test เส้น 277–280 ของโปรเจกต์) · pure: run ต้นฉบับไม่ถูกแตะ |
| BE-022 live | `npx tsx <tmp>\be022-live.cts` + `git diff --no-index` | pass — สำเนา plan\index.md **จริง** ใน tmp: เขียน 5 แถว pending→verified — diff = 6 แถวพอดี (5 cell เป้าหมาย ไบต์ก่อนหน้า cell คงเดิม + 🔒 แถว Phase 4 เติมท้าย cell หมายเหตุ `… 🔒 security gate \|` ข้อความเดิมคงครบ) · เขียนซ้ำ → no-op · conflict (expectedCurrent ไม่ตรง) → แถวนั้น `conflict` ไม่บล็อกแถว applied ในคำสั่งเดียว (AC-056) · claim `plan/**` active → deferred ทั้งชุด ไฟล์ไม่เปลี่ยน · journal → `finishSessionAudit` violations = [] · control ไม่ส่ง journal → `status-write` (BE-008 จับจริง) |

หมายเหตุ: live scripts ผู้ตรวจเขียนเองบน fixture ใน OS temp (ลบแล้ว) — ผ่านครบทุก assertion เมื่อ fixture ถูกต้อง (แก้ fixture ของผู้ตรวจ 3 จุดให้ตรงพฤติกรรมที่ test ของโปรเจกต์ยืนยันไว้: R9 dep-error, allowedStates 5 ค่า, gate 4 ค้าง — ไม่ใช่การแก้โค้ด)

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-012 | verified | live BE-012 PASS · `npm test` รวม camp-claude 16 test · review\round-17 PASS · `src\camps\base.ts:80` `src\camps\claude.ts:13` |
| BE-019 | verified | live BE-019 PASS (R5/R7/R8/R18/R21 + AC-069) · review\round-17 PASS · `src\core\router.ts:834` `route` |
| BE-021 | verified | live BE-021 PASS (AC-051/061/055/079/080) · review\round-17 PASS · `src\core\batching.ts:57,113,188` |
| BE-009 | verified | live BE-009 PASS (AC-072/013/015/016/071) · review\round-18 PASS · `src\core\gates.ts:128,215` |
| BE-022 | verified | live BE-022 PASS + git diff --no-index 6 แถวเป้าหมายพอดี · review\round-18 PASS · `src\core\status-writer.ts:169` |

### Data Model check

- `TaskRuntime` (`state-store.ts:67-76`) ตรง data-model ทีละ field — `HoldReason` 12 ค่าตรง set ใน data-model · `RouterTask` เติม `depends`/`securitySensitive` additive (ระบุไว้ใน review 17 — sketch ของ DES-018)
- `GateRecord` (`gates.ts:166-176`) ตรง data-model field-by-field (scope/taskIds/phase/question/owner{name}/answeredBy/…/recordSessionId)
- `SessionRecord.pid/cliVersion/cliSessionId` (`state-store.ts:83-84`) ตรง data-model — BE-012 อ่านจาก stdout JSON (`claude.ts:25`)
- `PacketV2.defectPacket` ตรง `{taskId, source, roundFile, findings}` — live deepEqual verbatim · `QaDefect`/`ReviewFinding` ผ่าน `packetProblems`
- ไม่พบ divergence — ไม่มีตัวให้ route ไป system-analyst

### Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

ไม่มี — ไม่เปิด QA-006 · review:REV-042/043/044 Minor → backlog แล้วตาม finish rules (Back-links ใน Open Issues)

## Unverified Behaviour — undeployed phases

- **spawn CLI จริงยังไม่พิสูจน์** — camp-claude test ทั้งหมดใช้ fake spawn; `claude -p` จริง (timeout kill tree, spawn fail → retry, pid จริง) จะพิสูจน์ที่ smoke 3 camp ของ QA-001 (phase 6) — รวมรูป `Edit(<claim>)`/`Write(<claim>)` ที่ mark `inferred`
- **BE-011 ยังไม่ build** — dispatch/apply Decision/คิวจริงของ router+batching+gates+status-writer ยังไม่เคยรันรวมกัน end-to-end (วงจร orchestrated จะพิสูจน์ที่ Feature QA phase 6 — qa:QA-001)
- **REV-044** — พฤติกรรม gate ซ้อนหลาย instance ยังรอ system-analyst pin (backlog); กรณีปกติ gate เดี่ยว verify ผ่านแล้ว

## Change Log

- 2026-10-06 — Round 15 — ✅ Verified ทั้ง 5 task (BE-012, BE-019, BE-021, BE-009, BE-022) — npm test 239/239 + live check 5 ชุดผ่านจริง · เขียน Status `verified` 5 แถวใน plan\index.md · ไม่มี finding ใหม่ (ไม่เปิด QA-006) · review:REV-042/043/044 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
