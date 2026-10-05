# <ชื่อ module> — Plan Index

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (`policies\documentation.md` §4) · เขียนโดย `project-manager` — **คอลัมน์ Status ในตาราง Tasks ให้ `qa-engineer` เขียนเท่านั้น** (`pending` ตั้งโดย PM · `verified`/`blocked` โดย qa) · 1 แถว = 1 บรรทัด
> วิธีอ่าน: อ่านไฟล์นี้ก่อน แล้วเปิดเฉพาะ `<task-id>.md` ที่ packet/brief ระบุ — ตาราง Tasks ด้านล่างคือแหล่งสถานะเดียว

## Release Scope

**Release:** R1 — ยืนยันโดย <ชื่อ> <YYYY-MM-DD>
**อยู่ใน release:** <task ids / AC ids>
**Done เมื่อ:** <deploy ไป environment ไหน หรือใครรับมอบ>
ของที่ไม่อยู่ในรายการนี้ไปอยู่ `backlog.md` — ย้ายเข้ามาได้เฉพาะเมื่อผู้ใช้สั่ง

## Waiting on Human

| # | ต้องตัดสินอะไร | ตัวเลือก | ผู้ตัดสิน | ขวาง task |
|---|---|---|---|---|

## Phases

| Phase | ชื่อ | Tasks | หมายเหตุ |
|---|---|---|---|
| 1 | <ชื่อ> | <task ids> | — / 🔒 security gate |

## Tasks

| Task | ชื่อ | Owner | Phase | Status |
|---|---|---|---|---|
| BE-001 | <ชื่อ> | backend-engineer | 1 | pending |

## Sequencing Notes

<dependency ข้าม phase, ลำดับที่ต้องระวัง> — ห้าม renumber task id

## Change Log

- YYYY-MM-DD — <สิ่งที่เปลี่ยน>

Back-links: `..\index.md`
