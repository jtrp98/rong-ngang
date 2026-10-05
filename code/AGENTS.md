# AGENTS.md — จุดเข้าสำหรับ codex / antigravity (stub)

อ่านก่อนทำงานทุกครั้ง:

1. `CLAUDE.md` ที่ `code\` (โฟลเดอร์นี้ — packRoot; ย้ายจากราก repo 2026-10-05) — project config, pipeline, human gates 7 จุด, finish rules, hard rules
2. `.claude\agents\*.md` — role prompt ทั้ง 12 บทบาท (สวมบททีละ role ตาม pipeline; จบแต่ละ role ด้วย handoff สั้น)

## กติกาหลัก

- โครงเอกสาร `knowledge\<module>\` เป็น **split layout (DES-014)** — อ่าน **index ของหมวดก่อน** แล้วเปิดเฉพาะไฟล์ที่ task/packet ระบุ (`readSections` เป็น path ตรง) · **ห้าม ls ห้ามอ่านข้ามหมวด** · Status อยู่ที่ index เท่านั้น
- เขียนเฉพาะ path ที่ role นั้นเป็นเจ้าของ — ตาราง Roles ใน `CLAUDE.md` + `policies\documentation.md` §1
- แก้ (amend) ไม่ regenerate · วันที่มาจากผู้ใช้ · ห้าม state-changing git · ห้ามแตะ `sta2` (provenance)
- เอกสารอ้างอิง: `policies\*.md` (อ่านเฉพาะ section ที่ต้องใช้) · `templates\*.md` (1 template ต่อไฟล์ย่อย)

> ไฟล์นี้เป็น **stub** — คู่มือ solo mode เต็ม (การสวมบท, gate, handoff, จุดเข้าต่อ agent claude/codex/antigravity/zcode) เป็นงานของ **SETUP-003**
