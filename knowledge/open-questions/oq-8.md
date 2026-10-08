# OQ-8 — git commit: ใครทำ เมื่อไร ขอบเขตไหน push ไหม และข้อยกเว้นกติกา no state-changing git

> เขียนโดย `business-analyst` · สถานะ: answered · สารบัญ: `index.md`

## คำถาม

ต่อจาก OQ-7 (ผู้ใช้ 2026-10-05: "read อะได้ตลอด แต่ พวก commit เนี้ยแหละ ที่อยากเปิดปิด" + "default เปิด") ให้ driver ถามเจ้าของ:

1. ตอนสวิตช์เปิด ใครเป็นคน commit: (ก) orchestrator เองหลังจบแต่ละ stage/role (ข) role ใด role หนึ่ง เช่น engineer หรือ qa (ค) ทุก role ที่เขียนไฟล์ (ง) ระบบไม่ commit เอง แค่ไม่บล็อกตอนคนสั่ง
2. commit เมื่อไร และครอบคลุมอะไร: ต่อ stage, ต่อ task ที่ verified หรือจบ run · เฉพาะไฟล์ที่ role นั้นเขียน หรือทุกไฟล์ที่เปลี่ยน · ข้อความ commit มาจากไหน
3. "พวก commit" รวม push, branch, merge ด้วยไหม หรือ commit อย่างเดียว
4. กติกาเดิมของ pipeline คือ "No state-changing git — commit/push/branch/merge เป็นของผู้ใช้" ถ้า "default เปิด" หมายถึงระบบ commit ได้ทันทีโดยไม่ต้องตั้งค่า กติกานี้จะกลายเป็นข้อยกเว้นเมื่อสวิตช์เปิด ยืนยันใช่ไหม หรืออยากให้ default เปิดหมายถึงอย่างอื่น
5. root ที่ไม่ใช่ git repo แต่สวิตช์เปิด ควรทำอย่างไร: ข้ามเงียบ ๆ, เตือน หรือปฏิเสธ run

## คำตอบ

- **ผู้ตอบ:** ผู้ใช้ (เจ้าของ) ผ่าน AskUserQuestion ที่ driver ถามแทน · **วันที่:** 2026-10-05
- (1/2) พิมพ์เอง: "แค่อนุญาตให้ ai ที่ใช้ tools นี้ commit" — สวิตช์เป็น permission เท่านั้น ระบบไม่ commit เอง ไม่กำหนดจังหวะ/ขอบเขต
- (3) "commit อย่างเดียว ไม่ push/branch/merge"
- (4) "ยืนยัน: เปิดอยู่ = ระบบ commit ได้ (กติกาเดิมใช้เมื่อสวิตช์ปิด)"
- (5) "เตือนแล้วข้าม commit"
- **ผล:** answered → `..\requirement\req-009.md` AC-030, AC-031

## อ้างถึง

- `oq-7.md` · `oq-d4.md` (กติกา no state-changing git, setup role เป็นคน git init) · `..\requirement\req-009.md`
