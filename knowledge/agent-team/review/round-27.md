# agent-team — Review Round 27 (FE-002)

> วันที่: 2026-10-07 · ผู้ตรวจ: `reviewer` · Task: FE-002 (Dashboard ต่อ task + หน้า session + ปุ่ม retry) · ผล: **PASS**

---

## 1. ขอบเขตและเอกสารอ้างอิง

- **Task**: `plan\fe-002.md` (Scope, Acceptance, Dependencies: BE-023, FE-001)
- **Design & Requirements**: REQ-020 (AC-065, AC-066), REQ-013 (AC-043, AC-045), REQ-011 (AC-037, AC-074), REQ-006 (AC-014, AC-072), REQ-014 (AC-047), REQ-019 (AC-064), REQ-010 (AC-034), REQ-012 (AC-040), DES-022, DES-009
- **Changed Code**:
  - `code/agent-team/ui/index.html` (ขยาย single page ให้รองรับตารางงานต่อ task, session modal, retry modal ตาม DES-022)

---

## 2. ผลการตรวจตาม Acceptance & Design Rules

1. **ตาราง Tasks และ Concurrency Counter (AC-043 · AC-045 · DES-022)**:
   - แสดงตัวนับ concurrency `Active Sessions: ${active} / ${maxParallelSessions}` ชัดเจนตรงตาม runtime จริง
   - ตารางงาน 1 แถวต่อ task แสดงข้อมูลครบถ้วน: Task ID, Name, Owner, Status, Step, Attempt/Fix/Restart, Session link, Hold reason, Waiting For, และ Action
   - **Status มาจากเอกสาร `plan\index.md` เท่านั้น** (AC-034) เอกสารชนะ runtime
   - `waitingFor` แสดงรายการ Depends ที่ยังไม่ verified และเหตุผลคิว (`ceiling`, `quiesce`, `gate:<id>`, `hold:<reason>`) ชัดเจน (AC-037, AC-064)

2. **แผง Waiting on Human & Legacy Migration (AC-014 · AC-072 · AC-074)**:
   - แผง **Waiting on Human** แสดงป้ายที่มาชัดเจนครบทุกตัวพร้อมกัน: `[doc]` (จาก `## Waiting on Human` ใน plan), `[gate <id>]` (จาก open gate records), และ `[hold:<reason>]` (จาก task ที่ติด hold)
   - กรณี `needsMigration === true` (plan format แบบ legacy) แสดงแถบแจ้งเตือนสีส้มเด่นชัด: `"⚠️ รูปแบบ Plan: Legacy — ต้อง migrate / dispatch ทีละตัว (AC-074)"`
   - แสดง chip สถานะ Feature QA ต่อ phase (`not-ready`, `queued`, `running`, `pass`, `fail`) พร้อมสัญลักษณ์ `cleared`

3. **Session Modal (AC-005 · AC-047 · AC-066 · DES-022)**:
   - เรียกดูข้อมูลจาก `GET /api/sessions/<sessionId>`
   - แสดง metadata ละเอียด: Kind, Role, Task IDs, Camp, Model, Effort, Basis reason (AC-005)
   - แสดงรายชื่อไฟล์ใน packet (`contextFiles` — AC-047) ในกล่อง scrollable
   - แสดง Write Audit (ไฟล์ที่ถูกเขียน) และ Prior Session (AC-066)
   - แสดง Log Tail 50 บรรทัดท้ายในบล็อก `<pre><code>` โดยผ่านการ escape ด้วย `safeText()` อย่างปลอดภัย

4. **ปุ่ม Retry และ Modal การยืนยัน (AC-016 · DES-022 · R22)**:
   - เมื่อ task ติด hold แสดงปุ่ม "ปลด Hold (Retry)"
   - เปิด modal แสดง Task ID และเหตุผล hold
   - **บังคับกรอกชื่อผู้สั่ง retry ในช่อง `by`** (AC-016) หากว่างจะแจ้งเตือนและไม่ส่งคำขอ
   - มีช่อง `note` เพิ่มเติม (optional)
   - ส่งคำขอผ่าน `POST /api/modules/<name>/tasks/<taskId>/retry` พร้อม CSRF origin อัตโนมัติจากเบราว์เซอร์
   - ปลด hold สำเร็จจะอัปเดตตาราง task ทันทีโดยไม่ reset ตัวนับเดิมตามกฎ DES-018

5. **Security & Untrusted Content Escaping (DES-009 · Security-sensitive)**:
   - ตรวจสอบโค้ดไม่มีการโหลด external CDN หรือสคริปต์ภายนอก
   - ข้อความ `<script>` หรือแท็ก HTML ใน logTail, error message, และ waitingFor ถูก escape ผ่าน `safeText()` และ DOM `textContent` ทั้งหมด

6. **Live SSE Integration**:
   - เมื่อได้รับ event จาก EventSource ระบบจะรีเฟรชตาราง task ของโมดูลที่กำลังเปิดดูอยู่โดยอัตโนมัติ

---

## 3. Findings

- ไม่มีข้อบกพร่องระดับ Critical, Important หรือ Minor

---

## 4. สรุปผลและการส่งต่อ

- **FE-002**: ✅ **PASS**
- **Next Stage**: ส่งต่อให้ `qa-engineer` ดำเนินการ QA Round 26 และบันทึก Status ใน `plan\index.md` เป็น `verified`
