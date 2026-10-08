# AGENTS.md — จุดเข้า solo mode (DES-013)

solo mode = coding agent session เดียว สวม role ทีละตัวตาม pipeline — ไม่มี orchestrator, ไม่มี state machine:
การ evaluate gate และการบันทึกการอนุมัติเป็นหน้าที่ของ session เอง (gate 7 จุด + กติกา who/when อยู่ใน `CLAUDE.md`)

ไฟล์นี้เป็น **ดัชนี/wrapper เท่านั้น** — แหล่งความจริงเดียวคือ pack ที่ packRoot = โฟลเดอร์นี้ (`<project>\rong-ngang-workspace\` ใน project ที่ install)
**ห้ามสำเนาเนื้อหา role prompt** มาไว้ที่นี่หรือที่อื่น (AC-023) — แก้ role prompt/policy ที่จุดเดียวแล้วทั้ง solo และ orchestrated ได้รับ

## วิธีเปิด session ต่อ agent (AC-024 — 4 agents, pack ชุดเดียวกัน)

ทุก agent **เปิด session ที่ packRoot (โฟลเดอร์นี้)** — ไม่ใช่ราก project

| Agent | จุดเข้า | สถานะ |
|---|---|---|
| claude | native — `CLAUDE.md` + `.claude\agents\*.md` ที่ packRoot โหลดตรง | ยืนยัน |
| zcode | เดียวกับ claude — `CLAUDE.md` + `.claude\agents\*.md` | ยืนยัน |
| codex | convention `AGENTS.md` ใน cwd = ไฟล์นี้ (+ global `~\.codex\AGENTS.md` มีอยู่แล้ว) | inferred |
| antigravity | ไม่พบ convention เฉพาะ — **สั่ง session อ่านไฟล์นี้ก่อนเริ่ม** | inferred |

## อ่านอะไร (path เท่านั้น — เนื้อหาอยู่ที่ไฟล์ปลายทาง)

1. `CLAUDE.md` — project config (stack, docs root, code roots), โครงเอกสาร DES-014, pipeline + right-sizing, human gates 7 จุด, finish rules, hard rules, ตาราง Roles (ขอบเขตเขียนต่อ role)
2. `.claude\agents\<role>.md` — role prompt ทั้ง 12 บทบาท: **อ่านไฟล์ role ที่จะสวมก่อนเริ่มทุกครั้ง** (frontmatter มี name/tools/model/effort)
3. `policies\README.md` → `policies\<topic>.md` — อ่านเฉพาะ section ที่ต้องใช้
4. `templates\*.md` — 1 template ต่อไฟล์ย่อย: คัดจาก template ไม่ invent รูปใหม่
5. **ถ้ามี** `tiers.yaml` ที่ packRoot — คำแนะนำ model/effort ต่อ role ตอน spawn subagent (AC-022; claude/zcode ระบุ model ได้, codex/agy ยังไม่ยืนยัน) — ตรวจ 2026-10-06 แล้ว**ยังไม่มีไฟล์นี้ใน pack** → ถ้าไม่พบ ใช้ default ของ agent นั้น และห้ามสร้างเอง

## Onboarding knowledge ใหม่ — setup prompt

- `prompts\setup-knowledge.md` — ใช้เมื่อผูก knowledge root ใหม่เข้าเครื่องนี้: รับ name/path (+targets) จากผู้ใช้ → ตรวจ/สร้างโครง module ตาม DES-014 จาก `templates\` → append รายการลง `sta-config.json` (machine-local — DES-015)
- **fail-closed:** path ที่ผู้ใช้ชี้ไม่มีจริงบนดิสก์ → ปฏิเสธทันทีและ**ไม่เขียนแก้ไฟล์ใดเลย** — prompt ไม่สร้าง/clone path เอง
- เขียนเฉพาะ key ตาม schema (`main_root`, `knowledge_roots[].{name,path,targets[]}`) — **ห้าม `gituse`** (REQ-009 เลื่อน release ถัดไป — backlog BL-017; validator ของ orchestrator ปฏิเสธ key นอก exact keys) · เขียนแบบ append รายการ — รายการเดิมใน sta-config ต้องครบเสมอ

## คู่มือเปิด solo session (ทีละขั้น — ทำตามได้จริง)

1. เปิด session ที่ packRoot ด้วย agent ใดก็ได้จากตารางข้างบน (codex อ่านไฟล์นี้เองจาก convention; antigravity ต้องสั่งให้อ่านก่อนเริ่ม)
2. อ่าน `CLAUDE.md` ครบ — จะได้ pipeline, gates, ขอบเขตเขียน, hard rules
3. เปิด knowledge root (docs root ใน Project config ของ `CLAUDE.md`) — อ่าน **index ของหมวดก่อน** แล้วเปิดเฉพาะไฟล์ที่ brief/task ระบุ · อ่าน `plan\index.md` `## Waiting on Human` ก่อนลงมือเสมอ
4. สวม role แรกตาม pipeline (หรือ role ที่ brief ชี้): อ่าน `.claude\agents\<role>.md` + policies ที่ role prompt ระบุ แล้วทำงานในขอบเขตเขียนของ role นั้นเท่านั้น
5. จบ role ด้วย **handoff สั้นในข้อความ** — result → evidence → blockers → next role (ไม่เขียนไฟล์ state ใหม่)
6. สวม role ถัดไป **ทีละตัว (serial)** — ทุกจุดที่เข้าเงื่อนไข gate ใน `CLAUDE.md` ให้หยุดถามผู้ใช้; บันทึก who/when ของการอนุมัติลงเอกสารตามที่ผู้ใช้พูดเป๊ะ ๆ — session ไม่มีสิทธิ์เขียนการอนุมัติแทน
7. จบ task: `qa-engineer` เขียนคอลัมน์ Status ของ `plan\index.md` **เอง** (ค่าที่ลงได้ `pending` / `verified` / `blocked`) · งานจบเมื่อ deploy หรือมนุษย์รับงาน ไม่ใช่เมื่อ "verified"

## ข้อจำกัดของ solo mode (ประกาศตรง — DES-013 R1)

- **ไม่มี post-run audit** — ไม่มี driver สแกน manifest/git diff; การหยุดที่ gate และการเคารพขอบเขตเขียน = หน้าที่ของ session เอง — พลาดไม่หยุด = ผิดกติกา ต้องตรวจด้วยมือ
- **state = เอกสารใน knowledge เท่านั้น** — ไม่มี run.json/packet/GateRecord; runtime state (รอบแก้ ฯลฯ) อยู่ใน session หลัก + artifact; นับ fix round จาก round files ใน `review\`/`qa\` ของ task (max 2 แล้วเข้า gate 4)
- **serial (OQ-17)** — สวม role ทีละตัว ทำ task ทีละอัน — ไม่ spawn parallel, ไม่มี scheduler/claim audit
- **qa-engineer เขียน Status เอง (OQ-14)** — ต่างจาก orchestrated mode ที่ orchestrator คัดลอกจาก verdict ของ qa-engineer
- **รูปเอกสาร v2 เดียวกับ orchestrated (AC-021)** — ตาราง plan 6 คอลัมน์ `Task|Name|Owner|Phase|Depends|Status` (AC-036), task file ไม่มี Status (AC-038), split layout ตาม DES-014, path/template/กติกาเดียวกัน → สลับโหมดได้ตลอด; ตอนสลับไป orchestrated ให้ orchestrator เริ่มนับ fix round ใหม่ (0) สำหรับ task ที่ยังไม่ verified
- **แนวปฏิบัติแนะนำ ไม่บังคับ** — clean reviewer/QA session (subagent ใหม่), 1 task = 1 subagent, minimum context, output state 7 ค่า, defect packet
- **`/gituse` ยังไม่มีใน pack (R1)** — REQ-009 เลื่อนไป release ถัดไป (backlog BL-016 — SETUP-006): hard rule "No state-changing git" คงเดิม — read-only `status/log/diff/show` เท่านั้น

## ห้ามแตะ

- โค้ด orchestrator (`orchestrator\`) — แตะได้เฉพาะ engineer role ตาม task ใน `plan\`
- อะไรก็ตามนอกขอบเขตเขียนของ role ปัจจุบัน (ตาราง Roles ใน `CLAUDE.md` + `policies\documentation.md` §1) และนอก docs root / code roots ที่ประกาศ
- การสร้างสำเนา role prompt/policy ที่ใดก็ตาม — แก้ที่ pack จุดเดียวเสมอ (AC-023)

## กติกาหลัก (สรุป — ฉบับเต็มอยู่ใน `CLAUDE.md` + `policies\`)

- โครงเอกสาร `knowledge\<module>\` เป็น **split layout (DES-014)** — index-first, เปิดเฉพาะ path ที่ task/packet ระบุ, ห้าม ls ข้ามหมวด, Status อยู่ที่ index เท่านั้น
- เขียนเฉพาะ path ที่ role นั้นเป็นเจ้าของ — ตาราง Roles ใน `CLAUDE.md` + `policies\documentation.md` §1
- แก้ (amend) ไม่ regenerate — `Edit` เฉพาะ section ที่กระทบ + เพิ่ม Change Log มีวันที่
- วันที่มาจากผู้ใช้ ไม่ infer · เลขที่ไม่มีแหล่งอ้างต้อง mark ว่าสมมติฐาน · ตรวจกับไฟล์จริงไม่ใช่ความจำ
- เอกสารอ้างอิง: `policies\*.md` (อ่านเฉพาะ section ที่ใช้) · `templates\*.md` (1 template ต่อไฟล์ย่อย)
