# agent-team — Feature QA — Phase 5

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` · ไฟล์นี้ = 1 round · live Open Issues / Unverified Behaviour อยู่ในไฟล์รอบล่าสุดเท่านั้น

---

## Open Issues

- ไม่มีข้อบกพร่องค้าง (REV-058 ถูกบันทึกและดำเนินการต่อเรียบร้อยแล้วใน FE-002)

---

## Round 27

**Status:** ✅ Verified — Feature QA — Phase 5: **PASS** (ผ่านครบทุก flow)

Flow ทดสอบ: "เปิด browser → งานใหม่ถึง BA / เลือกงานเดิม → เริ่ม → ดูงานต่อ task → ตอบ gate → retry" (`plan\index.md` `## Phases` 5)

---

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` ที่ `code\agent-team\` | pass — 345/345 (`tsx --test test/*.test.ts`) |
| typecheck/lint/build | — | not present (package.json ไม่มี script เหล่านี้) |

---

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-010 | verified | Intake งานใหม่รับข้อความ untrusted จำกัด 20,000 อักษร ส่งตรงถึง BA packet (AC-017, AC-018) |
| BE-015 | verified | Web server ผูก loopback 127.0.0.1, Host guard ป้องกัน DNS rebinding, start module (OQ-5 409), ตอบ gate พร้อม terminal banner |
| BE-023 | verified | Tasks API 3 endpoints: GET /tasks คืนครบ field DES-022, POST /retry ตรวจ CSRF Origin + ไม่ reset ตัวนับ, GET /sessions คืน contextFiles (AC-047) + logTail 50 บรรทัด |
| FE-001 | verified | Web UI Dashboard static single page (vanilla HTML/CSS/JS) ไม่มี external CDN, root selector, 2 กรณีหลัก, หน้าตอบ gate บังคับพิมพ์ answeredBy, safeText XSS escaping |
| FE-002 | verified | Dashboard ต่อ task 1 แถวต่อ task, concurrency active/max, แผง Waiting on Human (doc/gate/hold), แถบเตือน legacy plan (AC-074), session modal, retry modal |

---

### Feature QA Flows

| Flow | อ้าง | Result |
|---|---|---|
| 1. เปิด browser (Static UI Serving) | DES-009 · REQ-001 | **PASS**: GET `/` ให้ HTTP 200 เสิร์ฟ `ui/index.html` สมบูรณ์ ไม่มี CDN หรือ external resource ใด ๆ, script ป้องกัน XSS ทำงานครบ |
| 2. งานใหม่ถึง BA (Intake Flow) | AC-017 · AC-018 · BE-010 | **PASS**: ข้อความว่างหรือเกิน 20,000 ตัวอักษร ปฏิเสธ 400 Bad Request, ข้อความถูกต้อง ส่งงานตรงถึง BA ได้ HTTP 200 พร้อม `runId` |
| 3. เลือกงานเดิม → เริ่ม / Resume | OQ-5 · AC-072 · BE-015 | **PASS**: โมดูลที่มี open gate เมื่อสั่ง start จะได้ HTTP 409 Conflict พร้อมรายการ `gateIds` เพื่อให้ UI redirect ไปหน้าตอบ gate (OQ-5) |
| 4. ดูงานต่อ task (Tasks Dashboard) | DES-022 · AC-034 · AC-045 | **PASS**: GET `/api/modules/<name>/tasks` คืนข้อมูลครบถ้วน: `planFormat`, `active / maxParallelSessions`, Status ยึดจาก `plan\index.md` เท่านั้น (AC-034), `waitingFor`, `waitingOnHuman` รวม 3 แหล่ง (doc, gate, hold) |
| 5. ตอบ Gate (Human Decision) | AC-014 · AC-016 · REQ-006 | **PASS**: POST `/api/gates/<gateId>/answer` บันทึก `answeredBy` ที่ผู้ใช้พิมพ์เอง, พิมพ์ terminal banner แจ้งเตือน และปลด gate ใน state store |
| 6. ปลด Hold (Human Retry) | DES-018 · DES-022 · R22 | **PASS**: POST `/api/modules/<name>/tasks/<taskId>/retry` ตรวจสอบ loopback Origin CSRF guard, บังคับชื่อ `by`, ปลด hold กลับสู่ขั้น `execution`, บันทึก `humanActions`, ไม่ reset ตัวนับเดิม |
| 7. ดู Session Details | AC-005 · AC-047 · AC-066 | **PASS**: GET `/api/sessions/<sessionId>` คืน metadata ครบถ้วน, `contextFiles`, `writeAudit`, `priorSession`, และ `logTail` 50 บรรทัดท้าย |

---

### 🔒 Security Gate Check

- Phase 5 มี 🔒 security gate ระบุใน `plan\index.md`:
  - BE-010: untrusted input validation & limit 20,000 characters
  - BE-015: DNS rebinding protection (Host header loopback check)
  - BE-023: CSRF protection on POST retry (Origin header loopback check)
  - FE-001 / FE-002: การแสดงผลข้อความ untrusted / logs ผ่าน `safeText()` และ `.textContent` ป้องกัน XSS injection
- ผลการทดสอบ: ผ่านทั้งหมด ไม่มีช่องโหว่ blocking

---

## Handoff

- **Verdict**: **Feature QA — Phase 5 = PASS** (✅ Verified)
- **Findings ใหม่**: ไม่มี
- **Next Stage**: ส่งต่อให้ `security` ดำเนินการ Security Review ของ Phase 5 (ประเมิน 🔒 security gate ใน `security.md`)
