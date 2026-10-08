# agent-team — Feature QA — Phase 3 (รอบใหม่ — ปิด QA-007)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · fixture อยู่ `code\fixture-featureqa-p3\` (สร้าง/ทดสอบ/ลบแล้ว — 2026-10-07) · วันที่จากผู้ใช้: 2026-10-07

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| QA-009 | BE-011 | Important | open — บล็อก flow ต่อจาก session จริง (R15 hold ทุก task) |

QA-007 ปิดแล้วรอบนี้ (ดู Round 18) · QA-008 คง → backlog (รอบนี้บรรเทาด้วย fixture bin ผ่าน PATH)

## Round 18

**Status:** ❌ Failed

dispatch ผ่าน claude CLI จริงผ่านครบทุกชั้นจน session คืน handoff ตรง schema (ปิด QA-007 — 2 session จริง exit 0, structured_output ผ่าน `handoffProblems` = 0, เขียนไฟล์จริงได้) — แต่ driver ปฏิเสธ handoff ของตัวเอง (QA-009: `extractHandoff` ไม่ unwrap `structured_output` ของ result envelope) → R15 hold ทั้งสอง task → flow หลัง session จบตายทั้งหมด

### Checks run

| Check | Command | Result |
|---|---|---|
| test (baseline) | `npm test` (agent-team) | pass 283/283 (round 17 เคย 279 — fix QA-007 เพิ่ม test มา 4) |
| precondition QA-008 | `where claude` + `node -e spawn('claude',…,{shell:false})` | `where` เจอแต่ shim `.cmd` · spawn ตรง = ENOENT → แก้ด้วย hardlink `claude.exe` จริงเข้า fixture `bin\` + prepend PATH → spawn ตรง close 0 (เหมือนรอบ 17) |
| flow จริง (CLI จริง) | `npx tsx src/main.ts fixture-featureqa-p3 fixture-featureqa-p3-target featureqa-p3 --date 2026-10-07` | run `r-20261007-130433-e25b` — dispatch จริง 2 session (pid 18544/40476) ทำงาน 9 turns, exit 0, cost ~$0.23/ตัว · driver R15 hold → waiting-on-human (ไม่มี gate) |
| ตรวจ handoff ด้วย validator ของระบบ | สคริปต์ tsx เรียก `handoffProblems` บน stdout จริงของ session | envelope ดิบ = 42 problems · `structured_output` = **0 problems** ทั้ง 2 session (sessionId ตรง packet) |

### Feature QA flows

| Flow | อ้าง (TP-NNN หรือ REQ/AC) | Result |
|---|---|---|
| เริ่ม run จาก terminal (args + --date บังคับ, selection ตาม sta-config, pointer) | `## Phases` phase 3 flow | pass (run จริง 13:04) |
| dispatch ผ่าน claude CLI จริง — `--json-schema` inline JSON ตัด `$schema` ราก (fix QA-007) | phase 3 "dispatch จริง" | **pass — ปิด QA-007**: argv บันทึกใน session.log = inline JSON 6,095 ตัวอักษร ไม่มี `$schema` ราก (ไฟล์ `handoff-schema.json` บนดิสก์คงเต็มตาม contract) · CLI 2.1.292 ไม่ exit 1 อีกต่อไป |
| session จริงทำงานจนเขียนไฟล์จริง + คืน handoff ผ่าน schema จริง | phase 3 | pass — `target/notes/a.md` = `ex-001 ok`, `notes/b.md` = `ex-002 ok` (เขียนโดย session จริง, `permission_denials` ว่าง) · structured_output ผ่าน validator ระบบ 0 problems |
| driver ตีความ handoff จาก stdout ของ camp ที่ CLI enforce schema | DES-002/012 | **fail — QA-009** (`extractHandoff` ไม่ unwrap `structured_output` → R15 hold) |
| DAG parallel (AC-045) | AC-045 | พิสูจน์ไม่ได้รอบนี้ — fixture ผิดรูป (Write paths ไม่คลุม backtick → claim ตกเป็น role-allow `codeRoots/**` ทับกัน → scheduler เลื่อน sequential ถูกต้องตาม DES-021 §2) — แก้ fixture แล้วพิสูจน์รอบหน้า |
| review wave / QA round / Status write-back / Feature QA / gate จริง | DES-019 | ไม่ได้วิ่งจริงรอบนี้ — ถูก QA-009 บล็อกหลัง session จบ · evidence จาก round 17 (fake mode) ยังครอบขา driver เดิม |
| restart หลัง kill กลาง run (`--resume`, orphan) | DES-007/AC-034 | ไม่ได้ทดสอบรอบนี้ — run หยุดด้วย QA-009 ก่อน (ไม่มี session active ค้างจะ kill) |

### perTask

Phase 3 tasks 13/13 คง `verified` ตั้งแต่ round 16 — round นี้ไม่ re-verify task (Feature QA ทดสอบ flow รวม) · plan fixture คง `pending` ทุกแถว (ไม่มี verdict ถึง BE-022 — ถูกต้อง)

### Data Model check

run.json `sessions[]/tasks{}/phases{}` บนดิสก์ตรง data-model (อ่านจาก run จริง) · handoff-v2 ที่ CLI คืนตรง schema ระบบทุก field (`handoffProblems` = 0)

### Issues Found

#### QA-009

- **Task:** BE-011 · **Severity:** Important
- **Expected:** handoff ต้องถูกอ่านจาก stdout ของ camp ที่ CLI enforce schema — claude `-p --output-format json` คืน **result envelope** `{type:"result", …, structured_output:{…handoff…}}` — driver ต้องหยิบ handoff จาก object field `structured_output`
- **Actual:** `extractHandoff` (`driver.ts:1330–1361`) parse envelope ตรงเป็น candidate เดียว แล้ว `collect()` หาเฉพาะ **fenced JSON ใน string field** (depth ≤ 3) — handoff อยู่ใน object `structured_output` จึงไม่มีทางเข้า candidates → validate envelope ทั้งก้อน → 42 problems (`ขาด field "role"` + `field ไม่รู้จัก "structured_output"` ฯลฯ) → R15 hold ทุก task · ของเดียวกันพิสูจน์ว่า structured_output ผ่าน `handoffProblems` = 0 — ตัว handoff ไม่มีปัญหา ปัญหาคือการ unwrap
- **Reproduce:** run จริงเดียวกัน (คำสั่งข้างบน) — ดู `router.log` R15 + `sessions/s-0-d446/s-1-63da/session.log` (stdout 3,090 B)
- **Evidence:** จุดแก้: `extractHandoff` เพิ่ม object value ที่ camp ระบุ (field `structured_output` ของ claude) เป็น candidate ต่อ camp — แก้ที่ driver (BE-011) ไม่ใช่ adapter (ตีความ handoff เป็นของ driver ตาม DES-002/012) · fallback fenced-in-string สำหรับ CLI ที่ไม่ enforce มีอยู่แล้วและคงใช้ได้

#### QA-007 — ปิดแล้ว (resolved 2026-10-07)

- หลักฐานปิด 3 ชิ้นจาก run จริง: (1) argv ใน session.log ส่ง `--json-schema` เป็น inline JSON 6,095 ตัวอักษร ไม่มี `$schema` ราก (`inlineSchemaArgv` ที่ `src/camps/base.ts:64` + `schemaInline: true` ที่ `claude.ts:66`) (2) CLI 2.1.292 exit 0 ทุก session (รอบ 17 exit 1 ใน ~0.5s ทุกตัว) (3) structured_output ผ่าน `handoffProblems` = 0 — handoff ผ่าน schema จริง

#### หมายเหตุ fixture (ไม่เปิด QA id — ความผิดฝั่ง fixture)

- `parseTaskFile` ดึงค่า Write paths จาก **backtick** เท่านั้น (`plan-parser.ts:276` — `` `([^`]+)` ``) — machine line ของ fixture รอบนี้ไม่คลุม backtick → writePaths ว่าง → claim = role-allow `codeRoots/**` → EX-001/EX-002 claim ทับกัน → dispatch sequential (พฤติกรรมถูกตาม DES-021 §2) · รอบหน้าต้องเขียน `` - Write paths: `<path>` `` เพื่อพิสูจน์ DAG parallel จริง

## Unverified Behaviour — undeployed phases

- flow ต่อจาก session จริง (review wave / QA round / Status write-back / Feature QA / gate จริง / restart หลัง kill กับ pid จริง): **ยังไม่พิสูจน์** — บล็อกด้วย QA-009 (evidence fake mode ของ round 17 ยังครอบขา driver)
- killOrphan กับ pid จริง (`taskkill /PID /T /F` + winImageName guard): คงสถานะจาก round 17
- codex/agy adapter: คงสถานะ (phase 4)
- ค่าใช้จ่ายจริง: session จริง 2 ตัว ~$0.23/ตัว (sonnet/medium) — จดเพื่อข้อมูล
- ผลข้างมุม: ไม่มี process ค้างจากการทดสอบ (session ปิดเอง exit 0 ทั้งคู่; claude.exe ที่เหลือบนเครื่องเริ่มก่อนวันทดสอบ — ไม่ได้แตะ)

## Change Log

- 2026-10-07 — Round 18 — Feature QA — Phase 3 — ❌ Failed (qa:QA-007 **resolved** — dispatch จริงผ่าน + handoff ผ่าน schema จริง · qa:QA-009 ใหม่ Important เจ้าของ BE-011 — extractHandoff ไม่ unwrap structured_output → R15 hold ทุก task) · npm test 283/283 · fixture ลบ + sta-config คืน byte-exact (sha256 ตรง) + state คืน .gitkeep · ต่อไป: engineer แก้ QA-009 แล้ว Feature QA รอบใหม่ (round 19 — ถ้า fail เป็นรอบที่ 3 ของ phase 3 ต้องถามผู้ใช้ตาม finish rules)

Back-links: `plan\index.md` · `..\index.md`
