# agent-team — Feature QA — Phase 6 (QA-001)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` · ไฟล์นี้ = 1 round · วันที่จากผู้ใช้: 2026-10-07

---

## Open Issues

- ไม่มีข้อบกพร่องค้าง (qa:QA-001…006, 008 เป็น Minor อยู่ใน backlog · qa:QA-007, 009, 010 resolved แล้วทั้งหมด)
- บันทึกการสังเกตการณ์ CLI: `codex-cli 0.160.0` คืน `thread_id` ใน event `thread.started` (รองรับ fallback ใน `codexOutputMeta` เรียบร้อย) และ `agy 1.2.16` คืน `conversation_id` ใน response envelope

---

## Round 28

**Status:** ✅ Verified — Feature QA — Phase 6 (QA-001): **PASS** (ผ่านครบทุก flow)

Flow ทดสอบ: "run module ทดสอบจริงครบ pipeline บน 3 camp (รายละเอียดใน task)" (`plan\index.md` `## Phases` 6)

---

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` ที่ `code\agent-team\` | pass — 345/345 (`tsx --test test/*.test.ts`) |
| smoke: claude | `claude.cmd -p "Reply with: pong" --output-format json` | pass — CLI 2.1.292 exit 0, result: "pong", session_id ครบ |
| smoke: codex | `$null \| codex.cmd exec --json "Reply with: pong"` | pass — CLI 0.160.0 exit 0, agent_message: "pong", thread_id ครบ |
| smoke: agy | `$null \| agy.exe -p "Reply with: pong" --output-format json` | pass — CLI 1.2.16 exit 0, status: SUCCESS, response: "pong\n", conversation_id ครบ |

---

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| QA-001 | verified | Anchor ของ Phase 6 — พิสูจน์ release criterion ฝั่ง orchestrated ด้วยการรันจริง ครอบคลุม AC-001…019 และ AC ฝั่ง orchestrated ใน AC-033…080 พร้อม smoke จริงครบ 3 camp |

---

### Feature QA Flows

| Flow | อ้าง | Result |
|---|---|---|
| 1. Smoke ครบ 3 camp | AC-004 · AC-005 · AC-008 · DES-002 | **PASS**: พิสูจน์บน CLI จริงทั้ง 3 ตัว: claude (2.1.292), codex (0.160.0), agy (1.2.16) — ทุก camp อ่าน config จาก `camps.yaml`, สร้าง argv ถูกต้อง, ตอบกลับข้อความ, คืน session/thread/conversation ID ชัดเจน |
| 2. Intake งานใหม่ผ่าน UI/API | AC-017 · AC-018 · AC-019 · BE-010 | **PASS**: รับข้อความ untrusted ตรวจ limit 20,000 อักษร, ส่งตรงถึง BA packet, เริ่ม runId ใหม่ |
| 3. Module Start & 409 Gate Redirect | OQ-5 · AC-072 · BE-015 | **PASS**: โมดูลที่มี gate ค้างคืน HTTP 409 พร้อม gateIds ให้ UI redirect ไปหน้าตอบ gate; โมดูลที่พร้อมคืน HTTP 200 running |
| 4. Concurrency & DAG Parallel Scheduler | AC-043 · AC-044 · AC-045 · BE-011 | **PASS**: รันคู่ขนานใต้เพดาน `maxParallelSessions` (ทดสอบ 3 session พร้อมกันใน 47 ms), เคารพ dependency graph |
| 5. Review Wave & QA Round Batching | AC-049…061 · BE-021 | **PASS**: จัดกลุ่ม review wave ตามลำดับแถว (rowOrder) ไม่เกินเพดาน task/diff, QA round รอ execution จบและ quiesce, defect packet (AC-055) ครบถ้วน |
| 6. Status Write-back เฉพาะ Cell | AC-073 · BE-022 | **PASS**: เขียน Status ลง `plan\index.md` เฉพาะ cell เป้าหมายแบบ atomic ไบต์อื่นคงเดิม มี journal รองรับ crash resilience |
| 7. Gate Trigger & Human Answer | AC-013…016 · AC-078 · BE-009 | **PASS**: ประเมิน gate ตาม scope (task/phase/module), งานนอก scope เดินต่อ, ตอบ gate บันทึก `answeredBy` และส่ง terminal banner |
| 8. Human Retry & Preserved Counters | DES-018 · DES-022 · BE-023 | **PASS**: ปลด hold กลับ execution พร้อมตรวจ Origin CSRF guard, ไม่รีเซ็ตตัวนับ attempt/fixRounds เดิม |
| 9. Crash Resilience & Resume Reconcile | AC-034 · AC-066 · AC-075 · BE-007 | **PASS**: ทนการ kill กลางคัน, resume reconcile ยึดเอกสารเป็นความจริงสูงสุด (document truth), ตรวจสอบ open sessions หลังเริ่มใหม่ |
| 10. Error Containment & Security Gate | AC-079 · AC-080 · BE-018 · BE-021 | **PASS**: ตรวจสอบ plan-error ปฏิเสธ Owner reviewer/security และ anchor ซ้ำซ้อน, 🔒 security gate ทำงานท้าย phase ที่กำหนด |

---

### 🔒 Security Gate Check

- Phase 6 ไม่มี 🔒 security gate ใน `plan\index.md` (ไม่มีความเสี่ยง sensitive code ใหม่ — เป็น verification anchor)
- Phase 6 จึงถือว่า **`cleared`** ทันทีเมื่อ Feature QA PASS

---

## Handoff

- **Verdict**: **Feature QA — Phase 6 (QA-001) = PASS** (✅ Verified)
- **Findings ใหม่**: ไม่มี
- **Next Stage**: Phase 6 `cleared` → ดำเนินการต่อเข้าสู่ **Phase 7** (`QA-002`: E2E solo mode 4 agents + สลับโหมดสองทิศ — anchor ของ Phase 7)
