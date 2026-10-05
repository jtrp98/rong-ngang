# OQ-9 — `/gituse` เป็น command ของอะไร, ผลต่อ write audit, draft `git: {remote}`, ใครสลับได้

> เขียนโดย `business-analyst` · สถานะ: answered · สารบัญ: `index.md`

## คำถาม

ต่อจาก OQ-7 (ผู้ใช้ 2026-10-05 เลือก "ต่อ knowledge (+ override ต่อ target) ตั้งใน sta-config และสลับด้วย /gituse") ให้ driver ถามเจ้าของ:

1. `/gituse` ใช้ที่ไหน: (ก) Web UI/CLI ของ orchestrator (ข) slash command ของ coding agent ใน solo mode (REQ-008) (ค) ทั้งสอง · ใช้แล้วสลับของ knowledge หรือของ target ตัวไหน
2. ใครสลับได้: เจ้าของคนเดียว หรือทุกคนในทีม · ต้องบันทึกว่าใครสลับ เมื่อไรหรือไม่
3. สวิตช์มีผลกับ write audit ไหม: audit ยังใช้ git diff เป็นหลักเสมอ (ตาม OQ-D4) ไม่ว่าสวิตช์เป็นค่าใด หรือปิดสวิตช์แล้วต้องเปลี่ยนไปใช้ manifest
4. ข้อตัดสินก่อนหน้าวันนี้ — `git: {remote}` เป็น optional, ไม่มี branch (ใช้ branch ปัจจุบัน), ใช้ตรวจ origin แบบปฏิเสธ run เมื่อไม่ตรง — ยังคงไว้คู่กับสวิตช์ใหม่ ถูกแทนด้วยสวิตช์ หรือตัดทิ้ง

## คำตอบ

- **ผู้ตอบ:** ผู้ใช้ (เจ้าของ) ผ่าน AskUserQuestion ที่ driver ถามแทน · **วันที่:** 2026-10-05
- (1) "slash command ของ coding agent (solo mode) แก้ sta-config" — ระดับ knowledge/target ตาม REQ-009
- (2) พิมพ์เอง: "ทุกคน เพราะ มันเป็น setting local เฉยๆ ใน sta-config.json" — ไม่ต้องบันทึกประวัติ
- (3) "ไม่กระทบ — audit ใช้ git diff (อ่าน) เสมอถ้ามี repo"
- (4) "ตัดทิ้ง ใช้สวิตช์อย่างเดียว" — ไม่มี field remote ไม่ตรวจ origin
- **ผล:** answered → `..\requirement\req-009.md` AC-026, AC-029, AC-032

## อ้างถึง

- `oq-7.md` · `oq-d4.md` · `..\requirement\req-009.md` · `..\requirement\req-008.md` (solo mode)
- `..\design\des-015.md` · `..\design\des-006.md` (SA draft หยุดกลางคัน — ไม่ใช่ requirement)
