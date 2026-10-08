# agent-team — Review Round 24 (BE-015)

> วันที่: 2026-10-07 · ผู้ตรวจ: `reviewer` · Task: BE-015 (Local API server + composition root) · ผล: **PASS**

---

## 1. ขอบเขตและเอกสารอ้างอิง

- **Task**: `plan\be-015.md` (Scope, Acceptance, Dependencies: BE-010, BE-011)
- **Design & Requirements**: REQ-001 (AC-001, AC-003), REQ-006 (AC-014, AC-072), REQ-007 (AC-017), DES-009, DES-010, DES-015, OQ-5
- **Changed Code**:
  - `src/web/server.ts` (API server + endpoints + SSE + Host guard)
  - `src/main.ts` (Composition root wiring `--serve`)
  - `test/web.test.ts` (Unit & integration tests สำหรับ API server)

---

## 2. ผลการตรวจตาม Acceptance & Design Rules

1. **🔒 Security & Loopback Binding (DES-009)**:
   - Bind ที่ `127.0.0.1:<port>` (default 7800) เท่านั้น
   - ตรวจสอบ `Host` header ป้องกัน DNS rebinding: อนุญาตเฉพาะ Host ที่ตรงกับ `127.0.0.1` / `<host>:<port>` นอกนั้นปฏิเสธ 403 Forbidden
   - ไม่พึ่งพาหรือโหลด external CDN ใน static files (`ui/index.html`)

2. **Endpoints ครบถ้วนตามตาราง DES-009**:
   - `GET /api/config`: อ่าน sta-config และ config snapshot ถูกต้อง (DES-015)
   - `GET /api/modules` และ `GET /api/modules/<name>`: ดึง pointer และ run summary
   - `POST /api/modules/<name>/start`:
     - Run ไม่ได้วิ่ง + มี gate open → 409 Conflict พร้อมรายการ `gateIds[]` (OQ-5)
     - Run กำลัง running อยู่ → 200 คืน runId เดิม (AC-072)
     - Target path ไม่มีจริง → 404/400 (DES-015)
   - `POST /api/tasks/new`:
     - ตรวจสอบความยาว untrusted text: ค่าว่าง/ช่องว่างล้วน → 400 (AC-017)
     - ความยาวเกิน 20,000 ตัวอักษร (`NEW_WORK_LIMIT`) → 400 (DES-009 / DES-010)
     - ส่งต่องานผ่าน `submitNewWork` (BE-010) ได้สำเร็จ
   - `GET /api/gates/<gateId>`: ค้นหา gate ล่าสุดผ่าน `latestGateRecord`
   - `POST /api/gates/<gateId>/answer`: ตอบ gate ผ่าน `answerGate` (pure transition), บันทึกด้วย `saveRun`, พิมพ์ gate banner แจ้งเตือน terminal เสมอ (AC-014), emit event `gate-answered`
   - `GET /api/runs/<runId>/events`: SSE stream พร้อม header `text/event-stream` ถูกต้อง

3. **Composition Root (`src/main.ts`)**:
   - รองรับ flag `--serve` ใน argv และเริ่ม web server ได้อย่างถูกต้อง
   - Export `createWebServer`, `startWebServer`, `WebServerInstance` ชัดเจน

4. **Tests & Evidence**:
   - `test/web.test.ts`: ครอบคลุม 7 กรณีทดสอบ ทั้งด้าน security, endpoints, OQ-5, AC-014, AC-017, AC-072 และ CLI `--serve`
   - รัน `npm test` ผ่านทั้งหมด 341/341 tests (0 fail)

---

## 3. Findings

| ID | Task | Severity | สรุป | จัดการ |
|---|---|---|---|---|
| REV-057 | BE-015 | Minor | SSE `/api/runs/<runId>/events` ยังกระจาย broadcast ทุก event ใน server โดยยังไม่ได้ filter เฉพาะ runId เป้าหมาย | บันทึกเข้า `backlog.md` (non-blocking) |

---

## 4. สรุปผลและการส่งต่อ

- **BE-015**: ✅ **PASS**
- **Next Stage**: ส่งต่อให้ `qa-engineer` ตรวจสอบและบันทึกผลใน `qa/round-24.md` พร้อมอัปเดต cell Status ของ BE-015 ใน `plan\index.md` เป็น `verified`
