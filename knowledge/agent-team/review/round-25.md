# agent-team — Review Round 25 (BE-023)

> วันที่: 2026-10-07 · ผู้ตรวจ: `reviewer` · Task: BE-023 (Task dashboard API + human retry) · ผล: **PASS**

---

## 1. ขอบเขตและเอกสารอ้างอิง

- **Task**: `plan\be-023.md` (Scope, Acceptance, Dependencies: BE-011, BE-015)
- **Design & Requirements**: REQ-020 (AC-065, AC-066), REQ-013 (AC-043, AC-045), REQ-011 (AC-037, AC-074), REQ-006 (AC-014, AC-072), REQ-014 (AC-047), REQ-019 (AC-064), REQ-010 (AC-034), REQ-012 (AC-040), DES-022, DES-009
- **Changed Code**:
  - `src/web/tasks-api.ts` (Implementation ของ 3 endpoints ตาม DES-022)
  - `src/web/server.ts` (Mount handleTasksApi เข้าสู่ server request lifecycle)
  - `test/tasks-api.test.ts` (ชุดทดสอบ unit & integration 3 เคส)

---

## 2. ผลการตรวจตาม Acceptance & Design Rules

1. **`GET /api/modules/<name>/tasks` (DES-022)**:
   - โครงสร้าง response ครบถ้วนทุกฟิลด์ตามสัญญา: `planFormat`, `needsMigration`, `active`, `maxParallelSessions`, `tasks`, `phases`, `waitingOnHuman`
   - **Status มาจาก `plan\index.md` เท่านั้น** (AC-034) เอกสารชนะ runtime
   - `needsMigration`: เป็นจริงเมื่อ format เป็น legacy (AC-074)
   - `active`: นับจำนวน task ที่กำลังอยู่ใน `execution`, `review`, `qa` เทียบกับ `maxParallelSessions` (AC-043, AC-045)
   - `waitingFor`: แสดงรายการ Depends ที่ยังไม่ verified และเหตุผลคิว (`ceiling`, `gate:<id>`, `hold:<reason>`) ชัดเจน (AC-037, AC-064)
   - `waitingOnHuman`: รวบรวมครบ 3 แหล่งพร้อมป้ายที่มา: `doc` (จาก `## Waiting on Human`), `gate` (จาก open GateRecords), `hold` (จาก task ที่ติด hold) (AC-014, AC-072)
   - กรณีโมดูลไม่มี run: ประกอบสถานะจากเอกสารล้วนโดยไม่ crash

2. **`POST /api/modules/<name>/tasks/<taskId>/retry` (DES-022)**:
   - 🔒 **CSRF Guard**: ตรวจสอบ Origin header ต้องเป็น loopback เท่านั้น หากไม่ถูกต้องปฏิเสธ 403 Forbidden
   - ตรวจสอบ `by`: ว่างหรือช่องว่างล้วน ปฏิเสธ 400 Bad Request
   - ปฏิเสธการ retry สำหรับ task ที่ไม่ได้ hold หรือ hold ด้วยเหตุผลที่ห้ามปลด (`design-change`, `requirement-change`, gate ที่ยัง open) ด้วย 409 Conflict
   - ปลด hold สำเร็จสำหรับเหตุผลที่อนุญาต (`crash-limit`, `blocked`, `audit-violation`, `invalid-handoff`, `context-error`, `status-conflict`, หรือ gate ที่ตอบแล้ว)
   - **ไม่ reset ตัวนับ** (`attempt`, `fixRounds`, `crashRestarts` คงเดิมตาม DES-018)
   - บันทึกประวัติใน `TaskRuntime.humanActions[]` ครบ `{ action: "retry", by, note, at }`
   - Emit event `human-retry` ถูกต้องตามกติกา R22

3. **`GET /api/sessions/<sessionId>` (DES-022)**:
   - ค้นหา session จากทุก run directory
   - คืนค่าครบถ้วน: `sessionId`, `kind`, `role`, `taskIds`, `camp`, `model`, `effort`, `basisReason`, `startedAt`, `endedAt`, `outcome`, `contextFiles` (AC-047), `writeAudit`, `priorSession` (AC-066), `logTail` (อ่าน 50 บรรทัดท้ายจาก log จริง)
   - Session ไม่มีจริงปฏิเสธ 404 Not Found

4. **Tests & Evidence**:
   - `test/tasks-api.test.ts` ผ่านครบทั้ง 3 ชุดทดสอบ
   - รัน `npm test` ผ่านทั้งหมด 344/344 tests (0 fail)

---

## 3. Findings

- ไม่มีข้อบกพร่องระดับ Critical, Important หรือ Minor

---

## 4. สรุปผลและการส่งต่อ

- **BE-023**: ✅ **PASS**
- **Next Stage**: ส่งต่อให้ `qa-engineer` ดำเนินการ QA Round 24 และบันทึก Status ใน `plan\index.md` เป็น `verified`
