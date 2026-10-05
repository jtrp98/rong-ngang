# agent-team — Open Questions

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (DES-014) → ไฟล์ย่อย 11 ตัว (oq-1…6, oq-d1…d5) median 1.34 KB → budget ≈ 13.1 KB · unit: oq ≤ 4 KB ต่อไฟล์ · เขียนโดย `business-analyst` เท่านั้น
> วิธีอ่าน: เปิดเฉพาะไฟล์ OQ ที่ packet ระบุ — ตารางนี้คือแหล่งรายชื่อไฟล์เดียว · ถ้อยคำคำถาม/คำตอบเต็มอยู่ในไฟล์ของแต่ละข้อ · ref `req-00N.md` = `..\requirement\req-00N.md`

| ID | คำถามย่อ | ผู้ตอบ | สถานะ | ไฟล์ |
|---|---|---|---|---|
| OQ-1 | Gemini API ยังใช้ไหม | ผู้ใช้ | answered | `oq-1.md` |
| OQ-2 | role เริ่มรันที่ camp ใด | ผู้ใช้ | answered | `oq-2.md` |
| OQ-3 | ใช้ CAO หรือเขียน orchestrator เอง | ผู้ใช้ | answered | `oq-3.md` |
| OQ-4 | ตาราง tier binding ฉบับตั้งต้น | ผู้ใช้ | answered | `oq-4.md` |
| OQ-5 | เริ่มงานทั้งที่ gate ค้าง ทำอย่างไร | ผู้ใช้ | answered | `oq-5.md` |
| OQ-6 | solo mode นิยาม + รองรับ agents ใด | ผู้ใช้ | answered | `oq-6.md` |
| OQ-D1 | layout ยืนยัน flat หรือไม่ | ผู้ใช้ | answered — superseded โดย DES-014 | `oq-d1.md` |
| OQ-D2 | writePaths ต่อ role ยืนยันก่อน dispatch แรก | ผู้ใช้ | answered | `oq-d2.md` |
| OQ-D3 | record-only dispatch ต่อ gate ยอมรับไหม | ผู้ใช้ | answered | `oq-d3.md` |
| OQ-D4 | git init ที่ rong-ngang หรือไม่ | ผู้ใช้ | answered | `oq-d4.md` |
| OQ-D5 | ชื่อ owner ใน gates.yaml | ผู้ใช้ | answered | `oq-d5.md` |
| OQ-7 | สวิตช์ git ต่อ knowledge/module: "บล็อก" คืออะไร อยู่ที่ไหน ใครสลับ | ผู้ใช้ | answered → REQ-009 | `oq-7.md` |
| OQ-8 | git commit: ใครทำ เมื่อไร ขอบเขต push ไหม ข้อยกเว้น no state-changing git | ผู้ใช้ | answered → REQ-009 | `oq-8.md` |
| OQ-9 | `/gituse` อยู่ที่ไหน, ผลต่อ write audit, draft `git: {remote}`, ใครสลับได้ | ผู้ใช้ | answered → REQ-009 | `oq-9.md` |

## Change Log

- 2026-10-05 — แตก OQ เป็นไฟล์รายตัว 1 OQ ต่อ 1 ไฟล์ (ตัดสินโดยเจ้าของ 2026-10-05 — "บางคำถามอาจจะยาว บางคำตอบก็เช่นกัน"): oq-1…6 ยกถ้อยคำเต็มจาก `..\index.md` §Change Log, oq-d1…d5 จาก `..\design\archive.md` (OQ-D1 ระบุ superseded โดย DES-014) — index นี้เหลือตารางสารบัญ แทนตารางเดิมที่ยุบคำตอบไว้ในแถว
- 2026-10-05 — เปิด OQ-7 (สวิตช์ git ต่อ knowledge/module — จากคำพูดเจ้าของ 2026-10-05) รอคำตอบเจ้าของ; ยังไม่เขียน REQ
- 2026-10-05 — OQ-7 answered บางส่วน (เจ้าของตอบผ่าน driver) → REQ-009 · เปิด OQ-8 (commit: ผู้ทำ/จังหวะ/push/ข้อยกเว้น) และ OQ-9 (`/gituse`/audit/remote/สิทธิ์สลับ)
- 2026-10-05 — ปิด OQ-7, OQ-8, OQ-9 ตามคำตอบเจ้าของ → REQ-009 ครบ (AC-025…AC-032)
