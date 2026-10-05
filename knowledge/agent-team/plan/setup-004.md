### SETUP-004 — Fork pack มาที่ `code\` (packRoot)

- **Owner:** setup · **Depends on:** — · **Status:** pending
- **Traces:** REQ-003 (AC-006, AC-023), REQ-008 (AC-024), DES-003, DES-011, DES-014
- **Objective:** rong-ngang พึ่งตัวเองได้ — `CLAUDE.md` (project config: packRoot=`code\` · docsRoot/codeRoots ไม่ hard-code — ผูกด้วย `code\sta-config.json` (DES-015), ผู้เขียนรายการคือ SETUP-005/คน) + `.claude\agents\*.md` ทั้ง 12 **แก้ตามโครง split** (path ต่อ role ตาม des-006 ฉบับ split, กติกาอ่าน index-first, status-at-index สำหรับ PM/QA, readSections เป็น path) + `policies\documentation.md` เขียนใหม่ §1/§4/§5 ตาม split + budget ต่อหน่วย/สูตร index + `templates\` ชุดใหม่ต่อไฟล์ย่อย (req / scope / des / task / oq / round / index) + `AGENTS.md` จุดเข้า codex/agy
- **Scope / Do not touch:** สร้าง/เขียนเฉพาะไฟล์ pack ที่ `code\` (packRoot — DES-003; ย้ายเข้า `code\` แล้วบนดิสก์ 2026-10-05 — design Rev 8) ตาม Objective (คำสั่งเจ้าของ 2026-10-05 "ให้แก้ agent ที่จะทำในอันใหม่") · Do not touch: ห้ามลบ/แก้ไฟล์ใดใน sta2 (provenance)
- **Done-check:** grep ไม่พบ path แบบเก่า (`requirement.md` เดี่ยว ฯลฯ) ใน prompts/policies · เปิด session ที่ `code\` (packRoot) เห็น agents ครบ 12 · ไม่มีไฟล์ sta2 ถูกแก้
- **Risk / Rollback:** ต่ำ — ไฟล์ใหม่ที่ `code\` (packRoot) ทั้งหมด

Back-links: plan\index.md
