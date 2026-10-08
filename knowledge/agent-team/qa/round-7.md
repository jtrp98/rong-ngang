# agent-team — Feature QA — Phase 1

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · live Open Issues / Unverified Behaviour อยู่ในไฟล์รอบล่าสุดเท่านั้น
> finding id ชน task id (task `QA-001`) → ใช้รูป `qa:QA-NNN` ในข้อความอิสระ

## Open Issues

ไม่มี — qa:QA-001/002/003 resolved แล้ว (สถานะรวมที่ `index.md`)

## Round 7

**Status:** ✅ Verified — Feature QA — Phase 1: **PASS** (พฤติกรรมถูกต้องครบ 4 กรณี A–D)

Scope ทดสอบ: flow phase 1 "เจ้าของแก้ config/sta-config/plan → orchestrator โหลด + validate module จริง → ผ่าน หรือปฏิเสธพร้อม path/issue (plan legacy ถูกระบุ)" (`plan\index.md` ## Phases 1) · รันผ่าน **component ที่ build แล้ว** (config loader + knowledge-paths + docs-validator + plan-parser) ด้วยสคริปต์ `npx tsx` (cjs) — **orchestrator ตัวจริงยังไม่มี (BE-011 = phase 3): ข้อจำกัดที่บันทึกไว้ ไม่ใช่ความล้มเหลว** · fixture ชั่วคราวอยู่ `state\tmp-featureqa\` — ลบทิ้งเมื่อจบแล้ว (ดู Handoff)

### Checks run

| Check | Command | Result |
|---|---|---|
| install | `npm install` ที่ `code\agent-team\` | pass — 0 vulnerabilities (warn: esbuild postinstall ยังไม่อยู่ใน allowScripts — env ไม่ใช่โค้ด) |
| test | `npm test` | pass — 43/43 (`tsx --test test/*.test.ts`) |
| start | `npm start` | pass — ปรินต์ skeleton message (SETUP-001) |
| typecheck/lint/build | — | not present — package.json ไม่มี script เหล่านี้ |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-001 | verified | `npm install`/`npm test`/`npm start` ผ่านจริงรอบนี้ (package.json:10-13) |
| SETUP-002 | verified | `git -C rong-ngang status` อ่านได้จริง — repo มีจริง (ใช้ยืนยันการลบ fixture) |
| BE-001 | verified | กรณี A: `loadAppConfig()` โหลด 5 yaml + `code\sta-config.json` ผ่าน · กรณี D: fail-closed พร้อม path (`src\core\config.ts:613-629,762-773`) |
| BE-002 | verified | กรณี A: docsLayout=`split` → `moduleDir` = `knowledge\agent-team` ถูก path (`src\core\knowledge-paths.ts:60-65`) |
| BE-018 | verified | กรณี A/B/C: `inspectPlan` v2 จริง 0 issue · fixture-ok ผ่าน · legacy ถูก flag (`src\core\docs-validator.ts:86-89,131-206`) |

### Feature QA flows

| Flow | อ้าง | Result |
|---|---|---|
| A — โหลด config จริง + validate module จริง → **ปฏิเสธพร้อม path/issue ครบ 8** (`unit-over-budget` ล้วน: req-006/008/009 · review\round-1/3/5/7 · qa\round-4) — วัดขนาดไฟล์จริงยืนยันทุกไฟล์เกินงบ และสแกนทั้ง module ไม่พบ unit เกินงบที่หลุดรายงาน / ไม่พบไฟล์ถูกกล่าวหาเกินจริง = **ไม่มี false positive** | DES-014 §Size budget/Fallback · BE-001 Acceptance | pass |
| B — module สมบูรณ์ (fixture `fixture-ok\`: index ของ requirement/design/plan/qa/review + req-001, des-001, ta-001/002, plan v2 6 คอลัมน์) → `validateModuleDocs` = 0 issue, `assertModuleDocs` ไม่ throw | AC-036 · DES-014 | pass |
| C — plan legacy (fixture `fixture-legacy\`: ตาราง `Task|Status` ไม่มี Depends) → `format:"legacy"` + `needsMigration:true` — ธงระดับ module ที่ระบุที่มา (PlanIndex ของ plan\index.md นั้น), อ่านแถว Task+Status ได้, ไม่ crash, ไม่มี false issue (DES-014 กำหนด legacy = อ่านได้ + ธง ไม่ใช่ issue — ตรง unit test "legacy → needsMigration … ไม่มี issue (AC-074)") | AC-074 · DES-014 (DES-001 กรณี 3) | pass |
| D — sta-config ชี้ path ไม่มีจริง → `loadStaConfig` และ `resolveRunRoots` ปฏิเสธพร้อม path เต็ม + `file:line:column` ("path ไม่มีจริงบนดิสก์ (fail-closed — DES-015) … ปฏิเสธ run ก่อน dispatch") — ไม่เดา path | DES-015 fail-closed · `plan\index.md` Sequencing (sta-config) | pass |

หมายเหตุ flow A: การปฏิเสธ module จริง = พฤติกรรม fail-closed **ถูกต้องตาม flow** ("ผ่าน หรือปฏิเสธพร้อม path/issue") — 8 issue ตรงกับภาระเอกสารที่จดไว้แล้วใน backlog (review:REV-025 → BL-040 · review:REV-026 → BL-041 · review:REV-027 → BL-042) จึงไม่จด finding ซ้ำ

### Data Model check

- sta-config schema ตรง data-model/DES-015: `main_root` + `knowledge_roots[name, path, targets[name, path]]` exact keys (`src\core\config.ts:569-609`) · ไม่มี `gituse` (R1 — expectExactKeys ปฏิเสธ key แปลก `config.ts:305-311`)
- registry `docsLayout: split` ตรง DES-014 (`config\registry.yaml`) · phase 1 ไม่มี schema/entity ใหม่ — ไม่มีเอนติ้งใหม่ให้เทียบทีละ field

### Issues Found

ไม่มี finding ใหม่ (ไม่เปิด qa:QA-004) — พฤติกรรมผ่านครบ 4 กรณี · ภาระเอกสารเกินงบอยู่ใน backlog แล้ว (Back-links)

## Unverified Behaviour — undeployed phases

- Orchestrator end-to-end (โหลด config → dispatch stage → Status write-back) ยังไม่มีโค้ด (BE-011 ฯลฯ — phase 3): รอบนี้พิสูจน์เฉพาะชั้น component ที่ flow ใช้
- การปฏิเสธ key แปลกใน sta-config (เช่น `gituse`) และ AC-010/freeze ลง run.json (BE-007 — phase 3): ตรวจจากการอ่านโค้ดเท่านั้น ไม่ได้รันในรอบนี้

## Handoff

- Verdict: **Feature QA — Phase 1 = PASS** (✅ Verified) — A ปฏิเสธถูก flow (ครบ 8, ไม่มี false positive) · B ผ่าน · C legacy ถูก flag · D fail-closed พร้อม path · securityGate: none (phase 1 ไม่มี 🔒 และไม่พบพื้นผิว sensitive)
- Findings ใหม่: ไม่มี · Blockers: ไม่มี
- ลบ `state\tmp-featureqa\` แล้ว — `git status` ของ repo ไม่มีร่องรอย fixture (0 แถว)
- next role: driver (main session) — phase 2 พร้อมเริ่ม (งานแรก SETUP-004 ยัง `pending`)

## Change Log

- 2026-10-06 — Round 7 — Feature QA — Phase 1: ✅ Verified (PASS)

Back-links: `plan\index.md` · `..\index.md`
