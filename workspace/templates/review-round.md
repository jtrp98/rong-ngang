# <ชื่อ module> — Review Round <n> — <task ids>

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · open findings ที่ยังไม่จบให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Findings

> `review\index.md` ต้องมีตาราง finding (1 แถว = 1 บรรทัด) `| ID | Task | Severity | ไฟล์ |` เช่น `| REV-001 | BE-001 | Important | round-1.md |` · ผลที่ขาดฟิลด์ไม่ถือเป็นผล review (AC-050)

### REV-001

- **Severity:** Critical | Important | Minor (Critical/Important = blocking · Minor → backlog)
- **Task:** BE-001
- **Location:** `src/orders.ts:42`
- **Problem:** <สิ่งที่ผิด>
- **Reference:** AC-001 / DES-001 <ที่บอกว่าต้องเป็นอย่างไร>

## Open Findings

| ID | Severity | path:line | Owner | Status (open/resolved/→ backlog) |
|---|---|---|---|---|

## Round <n>

**Verdict:** PASS | FAIL (FAIL ต้องมี Critical/Important ≥ 1)

| Task | Verdict |
|---|---|
| <TASK-ID> | PASS / FAIL |

<หมายเหตุของแต่ละ finding ในรอบนี้>

> อ้าง finding/TP ที่ id ชนกับ task id ในข้อความอิสระ ให้ใช้รูปมีหมวดนำ `review:REV-001` · `qa:QA-001` · `test-plan:TP-001` (task id ตรงคอลัมน์ Task ของ `plan\index.md` ถูกตีเป็น task ก่อนเสมอ)

## Reviewed

- `src/orders.ts`

## Change Log

- YYYY-MM-DD — Round <n> — <verdict>

Back-links: `plan\index.md` · `..\index.md`
