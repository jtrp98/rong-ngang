# OQ-D1 — layout เอกสารยืนยัน flat หรือไม่

> เขียนโดย `business-analyst` (ต้นฉบับฝั่ง design — verbatim จาก `..\design\archive.md`) · สถานะ: answered — **superseded โดย DES-014** · สารบัญ: `index.md`

## คำถาม

"Layout เอกสารของโปรเจกต์นี้ยืนยันเป็น flat `knowledge\<module>\` (ตามที่ `knowledge\agent-team\` มีอยู่จริง) ไม่ใช่ `knowledge\module\<name>\` ตาม `policies\documentation.md:5` — ใช่ไหม" (Blocking: ต่ำ — มี default ตามของจริงใน registry.yaml แก้ได้ทีหลัง)

## คำตอบ

- **ผู้ตอบ:** ผู้ใช้ (เจ้าของโปรเจกต์ — สั่ง "ปิด oq ก่อน" โดย BA บันทึกค่า default; ผู้ใช้ยังแก้กลับได้) · **วันที่:** 2026-10-04
- **คำตอบ (verbatim):** "flat `knowledge\<module>\` — ยืนยัน default ตามของจริง; คง `docsLayout: flat` ใน registry.yaml · หมายเหตุ: sta2 `policies\documentation.md:5` จะต้องแก้ตาม (เป็น policy alignment task ไม่ใช่ design blocker)"
- **Superseded (2026-10-05):** OQ-D1 superseded โดย DES-014 — `docsLayout` เปลี่ยนเป็น **`split`** (โครงเอกสารแบบ index + ไฟล์ย่อย) ยืนยันโดยเจ้าของ 2026-10-05; คำตอบเดิม (flat) คงอยู่ด้านบนเป็นประวัติ ค่า default ใน registry.yaml แก้แล้วตาม DES-011/014

## อ้างถึง

- `..\design\des-014.md` (design ที่ supersede คำตอบนี้) · `..\design\des-011.md` · `..\design\archive.md` (ต้นทาง verbatim + บรรทัด superseded)
