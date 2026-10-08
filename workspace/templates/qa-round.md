# <ชื่อ module> — QA Round <n> — <task ids>  (รอบ Feature QA: `# <ชื่อ module> — Feature QA — Phase <n>`)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

> `qa\index.md` ต้องมีตาราง finding (1 แถว = 1 บรรทัด) `| ID | Task | Severity | ไฟล์ |` เช่น `| QA-001 | BE-001 | Important | round-1.md |`

> อ้าง finding/TP ที่ id ชนกับ task id (เช่น task `QA-001` กับ finding `QA-001`) ในข้อความอิสระ ให้ใช้รูปมีหมวดนำ `qa:QA-001` · `review:REV-001` · `test-plan:TP-001` · field ที่มีชนิด (ตาราง finding, `reproduce.tp`) ไม่ต้องใช้

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|

## Round <n>

**Status:** ✅ Verified | ⚠️ Partial | ❌ Failed

### Checks run

| Check | Command | Result |
|---|---|---|
| typecheck | `<cmd>` | pass / fail / not run |
| lint | | |
| build | | |
| test | | none / pass / fail |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| <TASK-ID> | verified / blocked | `path:line` / output |

### Feature QA flows

| Flow | อ้าง (TP-NNN หรือ REQ/AC) | Result |
|---|---|---|
| <user flow ที่ทดสอบ> | TP-001 / AC-001 | pass / fail |

### Data Model check

<เทียบ entity/schema code กับ `design\data-model.md` ทีละ field>

### Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

#### QA-001

- **Task:** BE-001 · **Severity:** Critical | Important | Minor (Minor → backlog)
- **Expected:** <ตาม AC/DES>
- **Actual:** <สิ่งที่เกิดจริง>
- **Reproduce:** <ขั้นตอน> (TP-NNN ถ้ามี)
- **Evidence:** `path:line` / output

## Unverified Behaviour — undeployed phases

- Phase <N>: <กติกาที่อ่านโค้ดได้แต่ไม่ได้รันจริง>

## Change Log

- YYYY-MM-DD — Round <n> — <ผล>

Back-links: `plan\index.md` · `..\index.md`
