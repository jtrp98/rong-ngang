# agent-team — QA Round 4 — BE-001

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

โหมด solo · clean session (เจ้าของ jtrp98, 2026-10-06) · เทียบ Acceptance ของ `plan\be-001.md` (Rev 10: `scheduler`+`audit`, `FORBIDDEN_ARGS`) กับไฟล์จริง + `design\data-model.md` · path สัมพัทธ์ `C:\src\AICode\rong-ngang\code\agent-team\` · review ล่าสุด `review\round-6.md` = PASS (BE-001 PASS)

## Open Issues

| ID | Task | Severity | path:line | Owner | Status |
|---|---|---|---|---|---|
| REV-018 | BE-001 | Minor | `src/core/config.ts:41,559-564` | system-analyst → backend-engineer | → backlog (ยืนยันด้วยการทดลอง: `--resume=abc` และ `subcommand: "exec resume"` ผ่าน validator) |
| REV-019 | BE-001 | Minor | `src/core/config.ts:41` | system-analyst → backend-engineer | → backlog (ยืนยัน: `-r abc`, `-c` ใน claude `headlessArgs` ผ่าน) |
| REV-020 | BE-001 | Minor | `test/config.test.ts:184-190` | backend-engineer | → backlog (QA ทดลองกรณีที่ขาดเองแล้ว — โค้ดปฏิเสธถูกทุกกรณี เหลือแค่ล็อกด้วย test) |
| QA-003 | BE-001 | Minor | `src/core/config.ts:308` | backend-engineer | → backlog (ใหม่ — ดู Issues Found) |

ไม่มี Critical/Important · REV-018/019 ไม่ทำให้ AC ล้ม — Acceptance ของ task และ data-model `:60` กำหนดแค่ 3 literal ใน `headlessArgs` ซึ่งปฏิเสธครบ · AC-033 ระดับ dispatch (log/packet) เป็นงาน BE-006/011/012

## Round 4

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| typecheck | — (ไม่มีใน check commands) | not run |
| lint | — (ไม่มีใน check commands) | not run |
| build | — (tsx รันตรง ไม่มี build step) | not run |
| test | `npm test` ที่ `code\agent-team\` | pass — rc=0 · `tests 14 · pass 14 · fail 0` (duration_ms 567.3) |
| ทดลอง QA | `npx tsx <scratchpad>\qa4.ts` — สำเนา `config\` ลง scratchpad, แก้ทีละกรณี, เรียก `loadAppConfig` (ไม่แตะ `config\` จริง) | 17 กรณี — ผลในตารางด้านล่าง |

ผลทดลอง (ConfigError: ไฟล์ + line จริง):

| กรณี | ผล |
|---|---|
| baseline (ไม่แก้) | ACCEPTED |
| `fixRoundLimit: -1` | REJECTED `registry.yaml:17` "scheduler.fixRoundLimit ต้องเป็น int ในช่วง 0" |
| ลบบรรทัด `fixRoundLimit` | REJECTED `registry.yaml:16` "ขาด field scheduler.fixRoundLimit" |
| `maxDiffLines: 0` | REJECTED `registry.yaml:19` |
| `largeTask.diffLines: 0` / `files: 0` | REJECTED `registry.yaml:20` ทั้งสอง |
| `maxParallelSessions: "3"` (string) | REJECTED `registry.yaml:16` |
| `manifestIgnore` เป็น scalar | REJECTED `registry.yaml:22` "ต้องเป็น string[]" |
| key แปลก `maxConcurrentRuns` ใน `scheduler` | REJECTED `registry.yaml:18` "field ไม่รู้จัก" |
| เพิ่ม `concurrency` (มี scheduler ครบ) | REJECTED `registry.yaml:24` ข้อความเฉพาะ "ถูกแทนที่ด้วย scheduler + audit" |
| codex `headlessArgs` + `"resume"` | REJECTED `camps.yaml:18` "ห้ามใช้ resume" |
| antigravity `headlessArgs` + `"--continue"` | REJECTED `camps.yaml:27` |
| claude `"--resume=abc"` (REV-018) | **ACCEPTED** |
| claude `"-r","abc"` / `"-c"` (REV-019) | **ACCEPTED** ทั้งสอง |
| codex `subcommand: "exec resume"` (REV-018) | **ACCEPTED** |
| gates `release-cut.owner: "alice"` (AC-015) | ACCEPTED, `owner=alice` |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-001 | verified | Acceptance ทุกข้อ ✅ (test จริง + ทดลอง) · ช่องโหว่ REV-018/019 นอก contract → Minor · พฤติกรรม runtime ของ AC-033/045/075 → Unverified (task อื่น) |

### Acceptance ของ BE-001

| ข้อ | Result | หลักฐาน |
|---|---|---|
| node:test ครบ 5 ไฟล์ + sta-config | ✅ Verified | test "โหลด + validate ครบ 5 yaml + sta-config.json ของจริง" pass · `config.ts:681-686` |
| แก้ tiers.yaml มีผล run ถัดไป (AC-010) | ✅ Verified | test AC-010 pass (`config.test.ts:156-169`) · โหลดใหม่ทุกครั้ง ไม่มี cache (`config.ts:670-686`) |
| แก้ owner ใน gates.yaml ไม่ต้องแก้โค้ด (AC-015) | ✅ Verified | ทดลอง owner → `"alice"` ACCEPTED · `config.ts:510` ตรวจแค่ string |
| ไฟล์เสีย/path ไม่มีจริง → ปฏิเสธพร้อม path | ✅ Verified | test fail-closed + sta-config pass (`config.test.ts:171-230`) · `ConfigError` ใส่ `file:line:col` (`config.ts:149`) |
| ค่าตั้งต้น `scheduler`/`audit` ตรง data-model | ✅ Verified | `config/registry.yaml:15-23` = `data-model.md:24-32` ทุกค่า · test `config.test.ts:58-66` pass |
| มี `concurrency` / ขาด / ผิดช่วง → ปฏิเสธ (AC-045 ฝั่ง config) | ✅ Verified | test `:184-190` pass + ทดลองเพิ่ม 9 กรณี REJECTED ทุกกรณีพร้อม line |
| `--continue`/`--resume`/codex `resume` ใน `headlessArgs` → ปฏิเสธ (AC-033 ฝั่ง config) | ✅ Verified | `config.ts:41,559-564` · test `:181-183` pass · ทดลองบน codex/antigravity REJECTED (ตรวจทุก camp) · รูปแปร (`=`, alias, subcommand) ผ่าน = REV-018/019 Minor |
| test เดิมอื่นยังผ่าน | ✅ Verified | 14/14 pass |
| comment `retryOnCrash` = spawn ไม่สำเร็จเท่านั้น (Scope) | ✅ Verified | `config/camps.yaml:3` ตรง `data-model.md:59` |
| ไม่มี `gituse`/`gitPolicy` (Out of Scope) | ✅ Verified | `config.ts:572,585,604` exact keys ไม่มี `gituse` |

### REV-018/019 กระทบ AC-033 จริงไหม

AC-033 (`req-010.md:15`) = "dispatch ไม่แนบ conversation history ของ session อื่น — ตรวจจาก log/packet ของ dispatch" · ทดลองยืนยันว่า ถ้า**คน**ใส่ `--resume=<id>`/`-r`/`-c` ลง `camps.yaml` เอง validator ไม่กัน และ dispatch จะ resume session เดิมได้ = ผิด AC-033 ตอน runtime · แต่ (1) contract ที่ BE-001 ต้องทำ (`be-001.md:36`, `data-model.md:60`) ระบุ 3 literal ซึ่งทำครบ (2) ค่า config ปัจจุบันไม่มีรูปแปรเหล่านี้ (`camps.yaml:7,18,27`) (3) config เป็นของคน ระบบอ่านอย่างเดียว → ไม่ใช่ failure ของ AC ใน scope · คงเป็น Minor → backlog ตาม reviewer · ขอให้ SA พิจารณาขยาย contract (รูป `=`, alias ต่อ camp, `subcommand`) ก่อน QA-001

### Data Model check

`registry.yaml` ↔ `data-model.md:16-32`: `scheduler` 5 field + `audit` 2 field ชื่อ/ค่า/ช่วงตรงทุก field (`config.ts:343-364` ≥1/≥0 ตรง comment data-model) · `RegistryConfig` type `config.ts:109-116` ตรง · `camps.yaml` ↔ `data-model.md:59-65`: ค่าทั้ง 3 camp ตรงตัว · required/optional `config.ts:517-518` ตรงรายการ `:65` (หมายเหตุ: `:65` อ้าง `config.ts:487-488` — เลขบรรทัดเก่า ปัจจุบัน `:517-518`; ข้อความ SA, ไม่กระทบ) · ไม่พบ divergence

### Issues Found

- **QA-003** — Minor → backlog · `src/core/config.ts:308` · template literal `` `…design\data-model.md…` `` — `\d` ไม่ใช่ escape ที่ถูกต้อง JS จึงตัด backslash ทิ้ง ข้อความจริงที่ผู้ใช้เห็นคือ "schema ตาม designdata-model.md" (เห็นในผลทดลองกรณี key แปลก) · ผลแค่ข้อความ error ไม่กระทบการปฏิเสธ · owner: backend-engineer (ใช้ `\\` หรือ `/`)

## Backlog (Minor — ไม่ขวาง)

- REV-018, REV-019 (SA ขยาย contract → backend-engineer), REV-020 (เพิ่ม test กรณี — QA ยืนยันแล้วว่าโค้ดถูก), QA-003 (ข้อความ error) · ส่งให้ PM append `backlog.md`
- SA: อัปเดตเลขบรรทัด `data-model.md:65` (`config.ts:487-488` → `:517-518`) เมื่อแก้ไฟล์ครั้งถัดไป

## ข้อสังเกต

- Depends: SETUP-001 = `pending` (`plan\index.md:40`) — plan บันทึกว่า build แล้วตาม spec เดิม (`plan\index.md:82`) และ test skeleton SETUP-001 ผ่าน · ไม่ขวาง BE-001 แต่ PM/driver ควรให้ SETUP-001 ผ่าน QA
- SETUP-009 ยัง `pending` ใน `plan\index.md:48` ขณะที่ `qa\index.md` Change Log บันทึก round 3 ✅ Verified · ตาราง Rounds ใน `qa\index.md` ขาดแถว round 3 — บันทึกเท่านั้น ไม่ได้แก้ (ตาม brief)
- ตัวนับรอบ BE-001: review round-6 PASS · QA รอบแรกของ task นี้ (Rev 10) → ✅
- ไม่ได้ดู git diff (role ห้าม) — ยืนยันไม่ได้ว่าไม่มีไฟล์นอก Write paths เปลี่ยน

## Unverified Behaviour — undeployed phases

- Phase 1 (BE-001): typecheck/lint ไม่มีใน check commands → ไม่ได้รัน (tsx ไม่ type-check) · "ไม่มีไฟล์อื่นเปลี่ยน" ต้อง git diff → driver/คนยืนยัน
- Phase 3: AC-033 ระดับ dispatch (packet/log ไม่มี history, spawn session ใหม่) — BE-006/011/012 · AC-045 เพดาน `maxParallelSessions` + คิวจริง — BE-011 · AC-075 `crashRestartLimit` → Waiting on Human, ไม่เพิ่ม fixRounds — BE-007/011/019 · freeze `scheduler` ลง run.json — BE-007
- คงจาก round-3: Phase 2/6/7 agent test-planner ทำตาม prompt จริง (QA-001/002) · Phase 3 resolve `TP-NNN` (BE-020) · AC-006/AC-023 ต้อง ls นอกรายการ · validator v2 — BE-018

## Change Log

- 2026-10-06 — Round 4 — BE-001 ✅ Verified · REV-018/019/020 Minor → backlog (ยืนยันด้วยทดลอง) · qa:QA-003 Minor ใหม่ → backlog

Back-links: `plan\index.md` · `..\index.md`
