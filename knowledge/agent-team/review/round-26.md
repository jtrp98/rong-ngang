# agent-team — Review Round 26 (FE-001)

> วันที่: 2026-10-07 · ผู้ตรวจ: `reviewer` · Task: FE-001 (Dashboard UI 2 กรณี + หน้าตอบ gate) · ผล: **PASS**

---

## 1. ขอบเขตและเอกสารอ้างอิง

- **Task**: `plan\fe-001.md` (Scope, Acceptance, Dependencies: BE-015)
- **Design & Requirements**: REQ-001 (AC-001, AC-002, AC-003), REQ-002 (AC-005), REQ-006 (AC-014, AC-016), REQ-007 (AC-018), DES-009, DES-015
- **Changed Code**:
  - `code/agent-team/ui/index.html` (Single page application vanilla HTML/CSS/JS สำหรับ Web Dashboard)

---

## 2. ผลการตรวจตาม Acceptance & Design Rules

1. **โครงสร้าง Dashboard และ 2 กรณีหลัก (AC-001 · REQ-001)**:
   - ออกแบบเป็น static single page (vanilla HTML/CSS/JS) ทั้งหมด **ไม่มี external dependency, CDN หรือ external font/script** ตรงตามกติกา DES-009 และ security baseline
   - รองรับ 2 กรณีครบถ้วนผ่าน tab navigation:
     - Case 1: เลือกงานเดิม (Existing Modules)
     - Case 2: เริ่มงานใหม่ (New Work Intake)
     - Tab เสริม: หน้าตอบ Gate & Approvals (Waiting on Human)

2. **Root Selector & รายการโมดูล (AC-002 · DES-015)**:
   - ดึงข้อมูลรากจาก `GET /api/config` จัดคู่ Knowledge Root → Target Code ได้ถูกต้อง
   - แสดงรายการโมดูลจาก `GET /api/modules` พร้อม status badge (`running`, `waiting-on-human`, `completed`, `idle`), pointer ล่าสุด และจำนวน open gates
   - กรณีไม่มีโมดูลใน Knowledge Root แสดงกล่องแจ้งเตือนให้รัน setup prompt ตาม DES-015 ชัดเจน
   - ปุ่มเริ่ม / Resume เรียก `POST /api/modules/<name>/start` โดยส่งบริบทที่เลือกไว้ ไม่ต้องพิมพ์ซ้ำ (AC-003)
   - หากรันไม่สำเร็จเนื่องจากติด open gate (HTTP 409) ทำการแจ้งเตือนและนำทางไปยังหน้าตอบ gate อัตโนมัติ (OQ-5)

3. **New Work Intake (AC-017 · AC-018 · REQ-007)**:
   - ช่องรับข้อความงานใหม่มีตัวนับอักษรและจำกัดความยาวไม่เกิน 20,000 ตัวอักษร (`new-work-count`) ชัดเจน
   - ส่งตรงไปยัง endpoint `POST /api/tasks/new` เพื่อให้ Business Analyst วิเคราะห์โดยตรง ปราศจากการดัดแปลงข้อความดิบ
   - ปฏิเสธการส่งข้อความว่างล่วงหน้าทางฝั่ง UI

4. **หน้าตอบ Gate & Approvals (AC-014 · AC-016 · REQ-006)**:
   - แสดงรายการ gate ค้างทั้งหมด พร้อม scope, โมดูล, เจ้าของที่กำหนด (`owner.name`) และข้อความคำถามตรงตัว (`question` verbatim)
   - **บังคับให้ผู้ใช้พิมพ์ชื่อตนเองในช่อง `answeredBy`** (AC-016) ไม่มีการใส่ชื่ออัตโนมัติหรือ hardcode
   - ส่งคำตอบพร้อมบันทึกผ่าน `POST /api/gates/<gateId>/answer`

5. **Security & Untrusted Content Escaping (DES-009 · Security-sensitive)**:
   - ฟังก์ชัน `safeText()` ทำการ escape อักขระพิเศษ HTML (`&`, `<`, `>`, `"`, `'`) ครบถ้วน
   - การแสดงผลชื่อโมดูล, gate id, ข้อความคำถาม, สถานะ, และ log ใช้ `safeText()` หรือกำหนดผ่าน DOM `textContent` ทั้งหมด ป้องกัน XSS Injection 100%

6. **Live Updates (SSE)**:
   - ฟังก์ชัน `connectSse(runId)` เชื่อมต่อกับ `/api/runs/<runId>/events` เพื่อรับการแจ้งเตือนสดเมื่อ gate ได้รับคำตอบหรือ run มีการเปลี่ยนแปลงสถานะ

---

## 3. Findings

| ID | Task | Severity | รายละเอียด |
|---|---|---|---|
| REV-058 | FE-001 | Minor | การแสดงผล session ละเอียดพร้อม camp/model/effort/basis (AC-005) และ logTail อยู่ในขอบเขตการขยายต่อของ FE-002 (Dashboard ต่อ task + session modal) จึงบันทึกเป็น backlog เพื่อให้ FE-002 ดำเนินการต่อ |

---

## 4. สรุปผลและการส่งต่อ

- **FE-001**: ✅ **PASS**
- **Next Stage**: ส่งต่อให้ `qa-engineer` ดำเนินการ QA Round 25 และบันทึก Status ใน `plan\index.md` เป็น `verified`
