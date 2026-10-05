## Quality Attributes

ตอบตาม `policies\architecture.md:14-24` §2:

- **Performance and load:** ผู้ใช้คนเดียว local — load จริงอยู่ที่ latency ของ CLI (นาทีต่อ stage) ไม่ใช่ server; จุดที่ degrades ก่อนคือ stage ยาวเกิน timeout (default 1800s) → fail ชัดเจน + retry; UI ไม่กระทบเพราะอ่าน state ไฟล์เท่านั้น
- **Failure modes:** ตัดสินไว้แล้ว ไม่ค้นพบตอนวิ่ง: CLI พัง → retry 1 ครั้ง → run failed รายงาน; handoff เสีย → failed ไม่เดา; gate ค้าง → หยุดจริงรอคน (นี่คือพฤติกรรมที่ต้องการ ไม่ใช่ความล้มเหลว); config เสีย → ปฏิเสธเริ่ม run พร้อมชี้ไฟล์
- **Observability:** StageRecord ต่อ stage (camp/model/effort/basis — AC-005), log ต่อ stage, GateRecord append-only, rolePromptHash ต่อ dispatch, configSnapshot (hash ของ config ทั้ง 5) ต่อ run — ใครอยู่นอกสามารถบอกได้ว่าอะไรทำไม
- **Deployment:** ติดตั้ง = `npm install` ที่ `code\agent-team\` (dependency เดียว: `yaml`) + แก้ registry.yaml (path) + ตรวจชื่อ owner ใน gates.yaml (ตั้งต้น `jabja` — OQ-D5); รันด้วย `tsx` (ไม่มี build step — ตัดสินใจแล้ว 2026-10-04) — ตรวจ 2026-10-04: Node **v24.21.0** (≥ 20 ตามที่กำหนด), npm 11.19.0 มีอยู่บนเครื่องแล้ว; ไม่มี service/daemon — ปิดแล้ว pipeline หยุด, resume ได้จาก state
- **Compatibility and maintainability:** additive ต่อ sta2 ทุกด้าน (ไม่แตะไฟล์ sta2 นอกจากอ่าน); จุดเปลี่ยนที่ควบคุม: camp flags อยู่ camps.yaml, tier binding อยู่ tiers.yaml, role prompt อยู่ที่เดียว — การอัปเดต CLI เวอร์ชันใหม่แตะ camps.yaml เป็นหลัก
- **Operational cost / vendor lock-in / tech debt:** ต้นทุน = subscription ของ 3 camp เดิม (ไม่เพิ่ม API key); lock-in ถูกจำกัดที่ adapter (แต่ flags ต่างกันจริง — ยอมรับ); tech debt ที่ยอมรับพร้อมทิศทาง: (1) write audit แบบ detective (ทิศทาง: ย้ายไป preventive เมื่อมี git/sandbox ต่อไฟล์), (2) ไม่มี parallelism (ทิศทาง: เปิด maxConcurrent ต่อ module เมื่อ audit แยก per-module), (3) role prompt พึ่ง path ใน sta2 (ทิศทาง: ทำสัญญา version ถ้า sta2 เปลี่ยนโครง)
