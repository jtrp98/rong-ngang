# <ชื่อ module> — Design Index

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (`policies\documentation.md` §4) · เขียนโดย `system-analyst` เท่านั้น · 1 แถว = 1 บรรทัด
> วิธีอ่าน: อ่านไฟล์นี้ก่อน แล้วเปิดเฉพาะ `des-*.md` / `data-model.md` ที่ packet/brief ระบุ — ห้าม ls ห้ามอ่านข้ามหมวด · ตาราง DES ด้านล่างคือรายชื่อไฟล์ contract ทั้งหมด

## Feature-by-Feature Feasibility

| Feature / REQ | Verdict | เหตุผล / หลักฐาน (`path:line`) |
|---|---|---|
| REQ-001 | ทำได้ทันที / ทำได้ถ้าเปลี่ยน X / ทำไม่ได้ | |

## Design Contracts

| ID | ชื่อ | Traces | ไฟล์ |
|---|---|---|---|
| DES-001 | <ชื่อ> | REQ-001 (AC-001) | `des-001.md` |

## ไฟล์อื่นในหมวดนี้

| ไฟล์ | เนื้อหา |
|---|---|
| `data-model.md` | schema contract |
| `quality-attributes.md` | performance, failure modes, observability, deployment |
| `modules.md` | feature group ภายใน delivery unit |
| `risks.md` | dependencies + risks |
| `archive.md` | Q&A ที่ปิดแล้ว + Change Log entries ที่ถูกแทน — verbatim |

## Unresolved Open Questions

| ID | คำถาม | ผู้ตอบ | Blocking? |
|---|---|---|---|

> ที่ปิดแล้วอยู่ใน `archive.md`

## Change Log

> รายการของ revision ที่ถูกแทนแล้วย้ายไป `archive.md`

- YYYY-MM-DD — Rev 1 — <สิ่งที่เปลี่ยน>

Back-links: `..\index.md`
