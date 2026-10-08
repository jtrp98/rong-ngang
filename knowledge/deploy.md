# agent-team — Deploy

> ไฟล์เดียว append (Deploy History ต่อท้าย; เกินใหญ่ย้าย era เก่า verbatim ไป `deploy\archive.md` พร้อมแถวชี้) · เขียนโดย `devops` · deploy/migration จริงต้องให้คนยืนยันใน session ก่อนทุกครั้ง · วันที่จากผู้ใช้: 2026-10-07

---

## Environments

| Env | URL / host | Deploy ด้วย | Owner |
|---|---|---|---|
| local | `http://127.0.0.1:3000` (loopback only) | `npm start` / `npm run serve` บนเครื่องผู้พัฒนา | ผู้ใช้ (local single-user) |

> หมายเหตุ: Release R1 เป็น local standalone tool ไม่มี shared/cloud environment ภายนอก (ตามข้อกำหนด REQ-001, REQ-015, DES-009)

---

## Required Environment Keys

| Key (ชื่อเท่านั้น ห้ามใส่ค่า) | ใช้ทำอะไร | Env |
|---|---|---|
| `PATH` | สำหรับเรียกใช้ Node.js, npm, claude, codex, agy | local |
| `ANTHROPIC_API_KEY` | ใช้งาน camp claude (ถ้าไม่ได้ใช้ session-level login) | local |
| `OPENAI_API_KEY` | ใช้งาน camp codex (ถ้าไม่ได้ใช้ session-level login) | local |
| `GEMINI_API_KEY` | ใช้งาน camp antigravity (ถ้าไม่ได้ใช้ session-level login) | local |

---

## Runbook

### 1. สภาพแวดล้อมที่รองรับ (Prerequisites)
- **OS:** Windows 10/11 (รองรับ PowerShell และ Git Bash)
- **Node.js:** v24.21.0 (หรือ >= v20.0.0 LTS)
- **CLI Camps ทั้ง 3 ตัวที่ติดตั้งบน PATH:**
  - `claude` (Claude Code 2.1.292 ขึ้นไป)
  - `codex` (codex-cli 0.160.0 ขึ้นไป)
  - `agy` (antigravity 1.2.16 ขึ้นไป)

### 2. ติดตั้ง (Installation)
1. เข้าไปยังไดเรกทอรี `code\agent-team\`:
   ```powershell
   cd C:\src\AICode\rong-ngang\code\agent-team
   npm install
   ```
2. ตรวจสอบไฟล์คอนฟิกใน `config\`:
   - `camps.yaml`: ตรวจสอบคำสั่งและ flags ของทั้ง 3 camp
   - `gates.yaml`: ตรวจสอบชื่อ owner ของ gate ต่างๆ
   - `registry.yaml`: ตรวจสอบพาธ module (`docsRoot`, `codeRoots`, `layout`)
   - `routing.yaml`: ตรวจสอบการผูก role เข้ากับ camp
   - `tiers.yaml`: ตรวจสอบระดับโมเดล/effort
3. ตรวจสอบไฟล์คอนฟิกเครื่อง `code\sta-config.json` (machine-local — DES-015):
   - ต้องมี `main_root` และ `knowledge_roots` ที่มีอยู่จริงบนดิสก์

### 3. รัน Smoke Check แต่ละ Camp
ทดสอบการทำงานของ CLI แต่ละตัวก่อนเริ่ม pipeline:
```powershell
claude.cmd -p "Reply with: pong" --output-format json
$null | codex.cmd exec --json "Reply with: pong"
$null | agy.exe -p "Reply with: pong" --output-format json
```
ทุกคำสั่งต้องคืน exit code 0 พร้อม response/events สมบูรณ์

### 4. เริ่มระบบ (Starting the System)
#### ทางเลือก ก: รัน Orchestrator ผ่าน Terminal (Headless / CLI Driver)
```powershell
# รัน pipeline ของ module ที่กำหนด
npx tsx src/main.ts <module-name>
```
Orchestrator จะอ่านคอนฟิก, ตรวจสอบความถูกต้องของเอกสาร (docs-validator), และขับเคลื่อน DAG scheduler ตาม dependency graph

#### ทางเลือก ข: รัน Web UI Dashboard Server
```powershell
# เริ่ม Web Server ที่พอร์ต 3000 (หรือพอร์ตที่ว่าง)
npm run serve
# หรือ: npx tsx src/main.ts --serve
```
เปิดเบราว์เซอร์ไปที่ `http://127.0.0.1:3000` (ผูกเฉพาะ loopback ป้องกันการเข้าถึงจากภายนอก)

### 5. การกู้คืนและทำงานต่อหลังขัดข้อง (Crash Recovery & Resume)
- หากโพรเซสถูกปิดหรือหยุดทำงานกะทันหัน ให้รันคำสั่งเดิมซ้ำ:
  - Orchestrator จะสแกน `run.json` ล่าสุด และทำ **resume reconciliation** เทียบกับสถานะจริงในเอกสาร `plan\index.md` (Document as Truth — AC-034)
  - Task ที่มีสถานะ `verified` ในเอกสารจะถือว่าสำเร็จถาวรและไม่ถูกรันซ้ำ
  - มีการจำกัดการรีสตาร์ทอัตโนมัติจากความขัดข้องตาม `scheduler.crashRestartLimit: 1`
- ใน Web UI:
  - หาก task ติด hold (เช่น gate ค้าง หรือเกิดข้อผิดพลาดที่แก้แล้ว) ผู้ใช้สามารถกดปุ่ม **Retry** พร้อมพิมพ์ชื่อผู้สั่ง เพื่อปลด hold กลับสู่ execution โดยไม่สูญเสียตัวนับ attempt/fixRounds เดิม (DES-018)

### 6. การปรับแต่ง Scheduler & Audit (Tuning Configuration)
คอนฟิกตั้งต้นใน `config\registry.yaml` / `camps.yaml`:
- `maxParallelSessions: 3` (เพดาน concurrency เพื่อไม่ให้โหลดเครื่องเกินไป)
- `crashRestartLimit: 1` (จำนวนครั้งที่ให้ retry เมื่อ process crash)
- `reviewWave.maxTasks: 4`, `maxDiffLines: 800` (เพดานจัดกลุ่ม review wave — สมมติฐาน — ยังไม่ยืนยัน)
- `largeTask.diffLines: 400`, `files: 10` (เกณฑ์ task ขนาดใหญ่ที่ต้องแยก solo review — สมมติฐาน — ยังไม่ยืนยัน)

### 7. การรับมือกรณีพิเศษ (Handling Special Cases)
- **โมดูลรูปแบบ Plan Legacy (AC-074):** หากพบแถบเตือนสีเหลือง `รูปแบบ Plan: Legacy` ระบบจะบล็อกการ dispatch ขนาน ให้ dispatch ทีละตัว (serial) และมอบหมาย `project-manager` ทำการ replan แปลงเป็น plan v2 6 คอลัมน์
- **สถานะ Hold `plan-error` (AC-079):** หาก plan มีข้อผิดพลาดทางโครงสร้าง (เช่น Owner เป็น reviewer/security หรือมี anchor ซ้ำซ้อน) ระบบจะติด hold `plan-error` ต้องให้ `project-manager` เข้ามาแก้ไข plan ใน `plan\index.md`

### 8. การใช้งาน Solo Mode
- สำหรับการขับงานแบบเดี่ยว (เช่น ตอน build ตัว orchestrator เอง — risk #14):
  - เปิด session ในไดเรกทอรี `code\` (packRoot)
  - ปฏิบัติตามคู่มือ 7 ขั้นใน `code\AGENTS.md`
  - สวมบทบาททีละ role แบบ serial และหยุดถามมนุษย์ทุก gate

---

## Rollback

1. **Rollback โค้ด:**
   - หากต้องการย้อนกลับโค้ดของโมดูล สามารถใช้ git revert หรือ checkout commit ที่เสถียรก่อนหน้าบน working tree
2. **Rollback สถานะ Plan / Run:**
   - สถานะการทำงานยึดเอกสาร `plan\index.md` เป็นหลัก หากต้องการให้ task ใดรันใหม่ ให้แก้ไข cell `Status` ใน `plan\index.md` กลับเป็น `pending`
   - Orchestrator จะตรวจจับการเปลี่ยนแปลงและ reconcile เพื่อนำ task กลับเข้าคิวรันใหม่

---

## Deploy History

### 2026-10-07 — Release R1 → local

- **ยืนยันโดย:** ผู้ใช้ (`jtrp98`)
- **Scope:** ครบทุก task ใน R1 Release Scope:
  - Phase 1: SETUP-001, SETUP-002, BE-001, BE-002, BE-018
  - Phase 2: SETUP-004, SETUP-007, SETUP-008, SETUP-009, SETUP-003, SETUP-005
  - Phase 3: BE-003, BE-004, BE-005, BE-020, BE-006, BE-007, BE-008, BE-022, BE-019, BE-021, BE-009, BE-012, BE-011
  - Phase 4: BE-013, BE-014
  - Phase 5: BE-010, BE-015, BE-023, FE-001, FE-002
  - Phase 6: QA-001
  - Phase 7: QA-002, DEVOPS-001
- **Unverified Behaviour ที่แจ้งผู้ใช้แล้ว:**
  - codex interactive stdin: เมื่อรัน codex ผ่าน terminal interactive โดยไม่ส่ง EOF จะรอ stdin เพิ่มเติม (ในระบบจริง pipeline ปิด stdin หรือส่ง input ผ่าน process pipe เรียบร้อย)
- **Migration:** none (ไม่มี database หรือ schema ภายนอก)
- **Backup:** git tracking ใน workspace
- **Health check หลัง deploy:**
  - `npm test` ผ่าน 345/345 tests (100% pass)
  - Smoke tests จริงครบทั้ง 3 camp (claude, codex, agy) ผ่าน exit code 0
  - Web UI Dashboard เสิร์ฟผ่าน HTTP 200 loopback พร้อม security guards ครบถ้วน (DNS rebinding, CSRF Origin, XSS escaping)

Back-links: `plan\index.md` · `..\index.md`
