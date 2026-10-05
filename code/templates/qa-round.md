# <ชื่อ module> — QA Round <n> — <task ids>

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues — all phases

| ID | Phase | Severity | Owner | สรุป | Blocking? | State |
|---|---|---|---|---|---|---|

## Round <n>

**Status:** ✅ Verified | ⚠️ Partial | ❌ Failed

### Checks run

| Check | Command | Result |
|---|---|---|
| typecheck | `<cmd>` | pass / fail / not run |
| lint | | |
| build | | |
| test | | none / pass / fail |

### Per-Task Results

- <TASK-ID> — ✅ Verified — <หลักฐาน `path:line` / output>
- AC-001 — ✅ Verified — …

### Data Model check

<เทียบ entity/schema code กับ `design\data-model.md` ทีละ field>

### Issues Found

- FIND-<n> — Critical | Important | Minor — `path:line` — owner — <สิ่งที่ผิดเทียบกับ AC/DES> — Minor → backlog

## Unverified Behaviour — undeployed phases

- Phase <N>: <กติกาที่อ่านโค้ดได้แต่ไม่ได้รันจริง>

## Change Log

- YYYY-MM-DD — Round <n> — <ผล>

Back-links: `plan\index.md` · `..\index.md`
