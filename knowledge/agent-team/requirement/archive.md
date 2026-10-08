# agent-team — Requirement Archive

> เก็บ verbatim ของที่ปิดแล้ว / ประวัติ / เหตุผลยาว ที่ย้ายออกจากไฟล์ย่อยของ `requirement\` เพื่อคุมงบ (`policies\documentation.md` §4) — ไม่สรุป ไม่ลบ · rule + AC ที่ใช้งานอยู่ในไฟล์ต้นทางเสมอ · **ไม่อ่านตอน startup** — เปิดเฉพาะเมื่อไฟล์ต้นทางชี้มา · เขียนโดย `business-analyst` เท่านั้น · สารบัญ: `index.md`

## req-011.md — ย้าย 2026-10-05

บรรทัดเดิมก่อนตัด (กติกาทางธุรกิจ — ส่วนที่ย้ายคือตัวอย่าง/เหตุผล/หมายเหตุแก้ข้อกำหนดเดิม; rule ที่เหลืออยู่ใน `req-011.md`):

- project-manager เป็นเจ้าของ work graph: แตก feature เป็น task ที่ verify ได้อิสระ, กำหนด owner / dependency / scope / acceptance / handoff — ไม่บอก implementation detail ที่ FE/BE ตัดสินเองได้ (เช่น สร้าง controller/service/class ที่ design ไม่ได้บังคับ)
- `plan\index.md` เป็น source of truth ของ task graph: ตาราง `Task | Name | Owner | Phase | Depends | Status` — **Depends อยู่ใน index** เพื่อรู้ว่า task ไหน runnable โดยไม่เปิด task file
- **ไม่มี Status ใน task file** — นิยามงานอยู่ใน task file, execution status อยู่ใน `plan\index.md` เท่านั้น
- **แก้ข้อกำหนดเดิม:** `policies\documentation.md` §1 ระบุตาราง task เป็น `id|status` → เปลี่ยนเป็น 6 คอลัมน์ข้างบน
- **ผู้เขียน Status (OQ-14):** orchestrated mode — orchestrator คัดลอกจาก verdict ของ qa-engineer (qa-engineer เป็นเจ้าของ verdict ใน `qa\`); agent session ใดแก้ Status เอง = ผิด · solo mode — qa-engineer เขียนเหมือนเดิม · ค่าที่ลงได้: `pending`/`verified`/`blocked` เท่านั้น · กติกา sta2 "only qa-engineer sets Status" เปลี่ยนเฉพาะ orchestrated mode → ต้องแก้ `policies\documentation.md` §3 + role prompt qa-engineer (งาน setup/pack)

Change Log เดิม:

- 2026-10-05 — สร้าง REQ ตาม spec refactor ของเจ้าของ (jtrp98) — เข้า R1 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05) · ชนกับรูปตาราง `id|status` เดิม (ระบุในเนื้อหา)
- 2026-10-05 — ปิด OQ-14 (ผู้เขียน Status แยกตามโหมด) + OQ-15 (ไม่ migrate ทั้งก้อน) ตามคำตอบเจ้าของ (jtrp98) 2026-10-05 · เพิ่ม AC-073, AC-074

## req-020.md — ย้าย 2026-10-05

บรรทัดเดิมก่อนตัด (ส่วนที่ย้ายคือหมายเหตุแก้ข้อกำหนดเดิม):

- **แก้ข้อกำหนดเดิม:** `CLAUDE.md` "The main session is the pipeline driver" — ใน orchestrated mode ตัวจำ/ตัวตัดสินลำดับคือ orchestrator ไม่ใช่ LLM session · solo mode: runtime state อยู่ใน session หลัก + artifact เหมือนเดิม (OQ-17)

Change Log เดิม:

- 2026-10-05 — สร้าง REQ ตาม spec refactor ของเจ้าของ (jtrp98) — เข้า R1 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05) · ชนกับ "main session is the pipeline driver" (ระบุในเนื้อหา)
- 2026-10-05 — ปิด OQ-18/OQ-11 (restart = session ใหม่, 1 ครั้งอัตโนมัติ, ไม่ revert), OQ-14 (ผู้เขียน Status), OQ-17 (solo runtime state) ตามคำตอบเจ้าของ (jtrp98) 2026-10-05 · แก้ AC-066 · เพิ่ม AC-075

## scope.md — ย้าย 2026-10-05

หัวไฟล์เดิม:

> เนื้อหา module-level ของ BA (ย้าย verbatim จาก `..\index.md` ตาม DES-014 ฉบับปรับปรุง 2026-10-05 — module index เป็นสารบัญล้วน) · Budget ≤ 12 KB · เขียนโดย `business-analyst` เท่านั้น · ตาราง REQ: `index.md` ในโฟลเดอร์นี้ · สารบัญหลัก: `..\index.md`

ท้ายย่อหน้า "R1 ขยาย" ใน Release Scope (ซ้ำกับ Constraints ข้อ (ง)):

· ข้อยกเว้น ownership: Status ใน orchestrated mode เขียนโดย orchestrator จาก verdict QA (REQ-011)

Change Log เดิม:

- 2026-10-05 — สร้างไฟล์ — ย้าย section module-level ทั้งหมด (Overview, Target Users & Roles, Release Scope, Constraints & Assumptions, Declined / Not Pursuing, References) จาก `..\index.md` verbatim ตาม DES-014 ฉบับปรับปรุง 2026-10-05 (module index เป็นสารบัญล้วน)
- 2026-10-05 — Release Scope: เพิ่ม "R1 ขยาย" REQ-010…021 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05, route BA → SA → PM) · Constraints: แก้ข้อ "กติกา pipeline ของ sta2 ใช้เหมือนเดิม" ให้ระบุข้อยกเว้น orchestrated mode + เพิ่มหลักการ R1 — spec ของเจ้าของ (jtrp98)
- 2026-10-05 — ปิด OQ-10…19 ตามคำตอบเจ้าของ (jtrp98) 2026-10-05: Release Scope R1 ขยาย แก้หมายเหตุ OQ (ไม่เปลี่ยน REQ ที่อยู่ใน scope, ไม่แตะ REQ-009) · Constraints เพิ่ม (ง) ผู้เขียน Status + ค่าที่ปิดแล้ว + ตัวเลข config สมมติฐาน

## req-021.md — ย้าย 2026-10-05

Change Log เดิม (บรรทัดแรก — ย้ายเพื่อคุมงบตอนปิด OQ-20):

- 2026-10-05 — สร้าง REQ ตาม spec refactor ของเจ้าของ (jtrp98) — เข้า R1 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05)

## req-011.md — ย้าย 2026-10-05 (รอบ 2 — คุมงบ หลังปิด OQ-20)

บรรทัดเดิมก่อนตัด (ส่วนที่ย้าย = ข้อความที่ซ้ำ AC-073/AC-074/REQ-015; rule + AC อยู่ใน `req-011.md`):

- **Owner ห้ามเป็น `reviewer`/`security` (OQ-20):** review มาจาก wave (REQ-015), security = stage ท้าย phase ที่มี 🔒 — PM ไม่เขียนเป็น task
- **ผู้เขียน Status (OQ-14):** orchestrated mode — orchestrator คัดลอกจาก verdict ของ qa-engineer (qa-engineer เป็นเจ้าของ verdict ใน `qa\`); agent session ใดแก้ Status เอง = ผิด · solo mode — qa-engineer เขียนเหมือนเดิม · ค่าที่ลงได้: `pending`/`verified`/`blocked` เท่านั้น
- **รูปเดิม (OQ-15):** ไม่ migrate ทั้งก้อน — PM amend ตอน replan เฉพาะ module ที่มีงานเปิด, task verified ไม่แตะ · orchestrator อ่านรูปเดิมได้แต่ไม่ dispatch parallel และขึ้นธง "ต้อง migrate"

Change Log เดิม:

- 2026-10-05 — ย้ายประวัติ + ตัวอย่าง/เหตุผล + หมายเหตุแก้ policy เดิม (§1 `id|status`, §3 + qa-engineer) verbatim → `archive.md` §req-011
- 2026-10-05 — ปิด OQ-20 (เจ้าของ jtrp98): ห้าม Owner reviewer/security · เพิ่ม AC-079

## req-012.md — ย้าย 2026-10-05

Change Log เดิม:

- 2026-10-05 — สร้าง REQ ตาม spec refactor ของเจ้าของ (jtrp98) — เข้า R1 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05)
- 2026-10-05 — ปิด OQ-12 (ผู้จัดกลุ่ม multi-task) + OQ-18 (รอบแก้ = session ใหม่) ตามคำตอบเจ้าของ (jtrp98) 2026-10-05 · AC-041 ใส่เกณฑ์จริง
- 2026-10-05 — ปิด OQ-20 (เจ้าของ jtrp98): task ไม่เป็นของ reviewer/security · security session = stage ท้าย phase 🔒 · AC ไม่เปลี่ยน

## req-015.md — ย้าย 2026-10-05

บรรทัดเดิมก่อนตัด (ส่วนที่ย้าย = ที่มาในวงเล็บ):

- 1 clean reviewer session ต่อ **small execution wave** · task ใหญ่ / security-sensitive / ไม่เกี่ยวกัน → แยก session (OQ-12 — เจ้าของ jtrp98 2026-10-05):

Change Log เดิม:

- 2026-10-05 — สร้าง REQ ตาม spec refactor ของเจ้าของ (jtrp98) — เข้า R1 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05)
- 2026-10-05 — ปิด OQ-12 (นิยาม wave + ค่า config ตั้งต้น — ตัวเลขสมมติฐาน) ตามคำตอบเจ้าของ (jtrp98) 2026-10-05 · AC-051 ใส่เกณฑ์จริง
- 2026-10-05 — ปิด OQ-20 (เจ้าของ jtrp98): review/security มาจาก wave/stage ท้าย phase 🔒 ไม่ใช่ task · เพิ่ม AC-080

## scope.md — ย้าย 2026-10-05 (รอบ 2)

ข้อความที่ตัดออก (verbatim):

- ท้ายย่อหน้า R1 ขยาย (Release Scope): ` · OQ-10…19 ปิดตามคำตอบเจ้าของ (jtrp98) 2026-10-05 — ไม่ตัด scope`
- ท้ายย่อหน้า REQ-009 ไม่อยู่ R1 (Release Scope): ` · บันทึกเดิมคงไว้: REQ-009 confirmed จาก OQ-7/8/9 (ผู้ใช้ 2026-10-05) — rule/AC ครบใน `req-009.md``
- Constraints & Assumptions: `- วันที่ทั้งหมดในเอกสารนี้อ้างจากวันที่ระบบของเซสชัน (2026-10-04) ไม่ได้มาจากปฏิทินของผู้ใช้`

Change Log เดิม:

- 2026-10-05 — ย้ายประวัติ (Change Log 3 บรรทัด + หัวไฟล์เดิม + ท้ายย่อหน้า R1 ขยายที่ซ้ำ Constraints (ง)) verbatim → `archive.md` §scope.md เพื่อคุมงบ 12 KB
- 2026-10-05 — gate 7 (jtrp98): REQ-009 เลื่อนไป release ถัดไป (Release Scope) + R1 ใช้ no state-changing git เดิม (Constraints)

## scope.md — Release Scope R1 — ย้าย 2026-10-08

ย้ายทั้ง section verbatim เมื่อเปิด R2 (R1 ปิดแล้ว 2026-10-07):

> Scope ยืนยันโดยผู้ใช้ 2026-10-04

**อยู่ใน release นี้:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008 — solo mode รองรับ 4 agents ตั้งแต่ release นี้: claude, codex, antigravity, zcode (จุดเข้าต่อ agent ออกแบบใน design — DES-013)

**R1 ขยาย (gate 7 — ผู้ใช้ยืนยัน 2026-10-05):** REQ-010…REQ-021 + ส่วนขยายใน REQ-001/003/006/008 — refactor session lifecycle, dependency execution, runtime state, orchestration ตาม spec ของเจ้าของ (jtrp98) 2026-10-05 · route BA → SA → PM (เจ้าของ 2026-10-05) · คงของเดิม: role prompts, artifact structure, split docs, exact-path reading, ownership, human gates, policies

**REQ-009 ไม่อยู่ R1 (gate 7 — เจ้าของ jtrp98 2026-10-05, AskUserQuestion "ไป release ถัดไป"):** สวิตช์ git commit `gituse` + AC-025…032 เลื่อนไป release ถัดไป

**ไม่อยู่ใน release นี้** (ไป `..\backlog.md` เมื่อ PM เปิด module นี้): แจ้ง gate ผ่าน Telegram/LINE/Email, เจ้าของ gate หลายคนพร้อมช่องทางติดต่อจริง (config รองรับแล้ว แต่ไม่กรอกตัวจริง), camp เพิ่มนอกจาก 3 ตัว (เช่น opencode/zai ตามของเดิม), รายงานต้นทุน/โควตาต่อ camp, รันต่างเครื่อง/บน server, self-learning/memory ของ CAO
