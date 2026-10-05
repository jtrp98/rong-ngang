# agent-team — Backlog

> ทุกอย่างที่ไม่อยู่ใน `plan.md` `## Release Scope` · ใครก็เพิ่มบรรทัดได้ · ย้ายเข้า release ได้เฉพาะเมื่อผู้ใช้สั่ง

| ID | รายการ (1 บรรทัด) | มาจาก | ความสำคัญ | Decision |
|---|---|---|---|---|
| BL-001 | เปิด parallelism ข้าม stage/run (`maxConcurrentRuns`/`maxConcurrentStages` > 1 — ต้องแยก write audit per-module ก่อน) | REQ §ไม่อยู่ใน release / DES-001 | Med | — |
| BL-002 | แจ้ง gate ผ่าน Telegram/LINE/Email (field `channels` ใน gates.yaml สงวนไว้แล้ว) | REQ §ไม่อยู่ใน release / DES-008 | Med | — |
| BL-003 | เจ้าของ gate หลายคนพร้อมช่องทางติดต่อจริง (Owner-A/Owner-B — config รองรับโครงแล้ว ยังไม่กรอกตัวจริง; AC-015 รองรับอยู่แล้ว) | REQ §ไม่อยู่ใน release / AC-015 | Med | — |
| BL-004 | camp เพิ่มนอกจาก claude/codex/antigravity (opencode, zai ตามของเดิม) | REQ §ไม่อยู่ใน release / DES-004 | Low | — |
| BL-005 | รายงานต้นทุน/โควตาต่อ camp บน dashboard | REQ §ไม่อยู่ใน release | Low | — |
| BL-006 | รันต่างเครื่อง/บน server (ต้องมี auth + bind นอก loopback — release นี้ bind 127.0.0.1 และไม่มี auth ตาม DES-009) | REQ §ไม่อยู่ใน release / DES-009 | Low | — |
| BL-007 | self-learning/memory ของ CAO | REQ §ไม่อยู่ใน release | Low | — |
| BL-008 | pack format เพิ่มสำหรับ coding agent อื่นนอก 4 ตัว (claude, codex, antigravity, zcode) | REQ §ไม่อยู่ใน release / DES-013 | Low | — |
| BL-009 | แก้ sta2 `policies\documentation.md:5` ให้สอดคล้อง flat layout (OQ-D1 — policy alignment; แตะไฟล์ sta2 จึงต้องผู้ใช้สั่งเท่านั้น) | OQ-D1 (design-archive) / DES-011 | Med | — |
| BL-010 | ยกระดับ write audit จาก detective เป็น preventive เมื่อ CLI/sandbox รองรับการจำกัดระดับไฟล์ | design §Quality Attributes (tech debt) | Low | — |
| BL-011 | ทำสัญญา version ของ path ที่ชี้ role prompt ใน sta2 (ปัจจุบันตั้งใจใช้ path เดิมเสมอ — ตาม REQ-003) | design §Quality Attributes (tech debt) | Low | — |
| BL-012 | กัน git ระดับคำสั่งต่อ root สำหรับ codex/agy (ปัจจุบันเหลือบรีฟ + ref audit; push ด้วย URL ตรงที่ไม่อัปเดต refs/remotes จับไม่ได้) เมื่อ CLI รองรับ | DES-016 §Security abuse (3) | Low | — |

## Change Log

- 2026-10-04 — สร้าง backlog ตั้งต้นจาก requirement §ไม่อยู่ใน release + design Rev 5 (tech debt / policy alignment)
- 2026-10-05 — เพิ่ม BL-012 (ความเสี่ยงคงเหลือ DES-016 ชั้น 2 ของ codex/agy) จากการ plan REQ-009
