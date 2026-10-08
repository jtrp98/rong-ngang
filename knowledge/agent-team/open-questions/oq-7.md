# OQ-7 — สวิตช์ git ต่อ knowledge/module: "บล็อก" คืออะไร อยู่ที่ไหน ใครสลับ

> เขียนโดย `business-analyst` · สถานะ: answered (ส่วนต่อปิดใน OQ-8, OQ-9) · สารบัญ: `index.md`

## คำถาม

ต้นทาง — ผู้ใช้ 2026-10-05 (verbatim): "ไอ git เนี้ย ฉันต้องการแบบ บาง module, knowledge สามารถเลือกได้ว่าจะบล็อกหรือไม่ เช่น อาจจะ knowledge GitUser = true ก็ใช้งี้ อาจจะเปิดปิดได้จาก command /gituse ฉันไม่ค่อยแน่ใจ"

ถามเจ้าของ 4 ข้อ: (1) "บล็อก" หมายถึงอะไร (2) ตอนเปิดสวิตช์ ระบบทำอะไรกับ git ได้ (3) สวิตช์ผูกระดับไหน ตั้งที่ไหน (4) default เป็นอะไร และสลับแล้วมีผลเมื่อไร

## คำตอบ

- **ผู้ตอบ:** ผู้ใช้ (เจ้าของ) ผ่าน AskUserQuestion ที่ driver ถามแทน BA · **วันที่:** 2026-10-05
- (1) verbatim: "ฉันอยากให้เป็น config ใน sta-confic ทั้งหมดไปเลย เปิดปิดได้"
- (2) verbatim: "read อะได้ตลอด แต่ พวก commit เนี้ยแหละ ที่อยากเปิดปิด"
- (3) ตัวเลือกที่เลือก: "ต่อ knowledge (+ override ต่อ target) ตั้งใน sta-config และสลับด้วย /gituse"
- (4) ตัวเลือกที่เลือก: "default เปิด; สลับมีผล run ถัดไป" (run ที่วิ่งอยู่ใช้ค่าที่ freeze ไว้ตอนเริ่ม)
- **ผล:** answered บางส่วน → `..\requirement\req-009.md` · ส่วนที่ยังค้างย้ายไป `oq-8.md` (ใคร commit/เมื่อไร/push/ข้อยกเว้นของกติกา no state-changing git) และ `oq-9.md` (`/gituse` เป็น command ของอะไร, ผลต่อ write audit, draft `git: {remote}`, ใครสลับได้)

## อ้างถึง

- `oq-d4.md` (git เป็นหลักของ write audit, manifest เป็น fallback; no state-changing git)
- `..\design\des-006.md` ชั้น 3 · `..\design\des-015.md` field `git` (SA draft หยุดกลางคัน — ไม่ใช่ requirement)
