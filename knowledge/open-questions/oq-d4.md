# OQ-D4 — git init ที่ rong-ngang หรือไม่

> เขียนโดย `business-analyst` (ต้นฉบับฝั่ง design — verbatim จาก `..\design\archive.md`) · สถานะ: answered · สารบัญ: `index.md`

## คำถาม

"ควร `git init` ที่ `C:\src\AICode\rong-ngang\` เพื่อให้ write audit อิง diff ของ git แทน manifest (แข็งแรงกว่า) — ทำไหม" (Blocking: ต่ำ — manifest ใช้ได้โดยไม่ต้องมี git)

## คำตอบ

- **ผู้ตอบ:** ผู้ใช้ (เจ้าของโปรเจกต์ — สั่ง "ปิด oq ก่อน" โดย BA บันทึกค่า default; ผู้ใช้ยังแก้กลับได้) · **วันที่:** 2026-10-04
- **คำตอบ (verbatim):** "git init ที่ rong-ngang — **ใช่** แต่ init โดย **setup role ตอนขั้นตั้งโปรเจกต์** (task แรกของงาน build) ไม่ใช่ orchestrator/agent ทำระหว่าง pipeline (กติกา no state-changing git ของ sta2 ยังผูก) → DES-006 ชั้น 3 (write audit): หลัง git init แล้วใช้ **git เป็นหลัก** (status/diff ระบุไฟล์ที่เปลี่ยนแม่นกว่า mtime) โดย manifest (size/mtime) เป็น fallback เมื่อ repo ไม่มี/เสีย; ยังจับไม่ได้ระดับ cell — คงข้อจำกัดเดิม"

## อ้างถึง

- `..\design\des-006.md` (ชั้น 3 write audit) · `..\design\archive.md` (ต้นทาง verbatim) — init เป็นหน้าที่ setup role ตอนขั้นตั้งโปรเจกต์
