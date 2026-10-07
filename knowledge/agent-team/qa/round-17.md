# agent-team — Feature QA — Phase 3

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · fixture ทั้งหมดอยู่ `code\fixture-featureqa-p3\` (สร้าง/ทดสอบ/ลบแล้ว — 2026-10-07) · วันที่จากผู้ใช้: 2026-10-07

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| QA-007 | BE-012 | Important | open — บล็อก dispatch จริงทั้ง camp claude |
| QA-008 | BE-012 | Minor | → backlog (precondition ของสภาพแวดล้อม) |

## Round 17

**Status:** ❌ Failed

ขา "dispatch ผ่าน claude CLI จริง" ตายทั้งหมด (QA-007 — CLI exit 1 ทุก session) → flow ของ phase 3 ใช้จริงไม่ได้จนแก้ · ขา driver ที่เหลือพิสูจน์ครบด้วย fake-adapter mode (scripted CampAdapter — ติดป้ายชัด ไม่แทนผล dispatch จริง) บน entry/driver/state/เอกสาร fixture จริงทั้งหมด

### Checks run

| Check | Command | Result |
|---|---|---|
| test (baseline) | `npm test` (agent-team) | pass 279/279 |
| loader จริง resolve fixture | `npx tsx` script เรียก `loadStaConfig`+`resolveRunRoots` | pass (docsRoot/codeRoots ตรง fixture) |
| flow จริงครั้งที่ 1 (CLI จริง) | `npx tsx src/main.ts fixture-featureqa-p3 fixture-featureqa-p3-target featureqa-p3 --date 2026-10-07` | run r-20261007-120652-34b9 — dispatch spawn ได้ (pid จริง) แต่ CLI exit 1 ทันที → R16 → R17 hold ครบ |
| flow ครั้งที่ 2 (fake-adapter) | script เดียวกันผ่าน `main()` + scripted adapter | run r-20261007-121535-faa9 — flow ครบจน gate |

### Feature QA flows

| Flow | อ้าง (TP-NNN หรือ REQ/AC) | Result |
|---|---|---|
| เริ่ม run จาก terminal (args + --date บังคับ, selection ตาม sta-config, pointer) | `## Phases` phase 3 flow | pass (run จริง 12:06 + run fake) |
| dispatch ผ่าน claude CLI จริง (ClaudeAdapter — argv array, pid จริง, role prompt/schema/tool-rules/add-dir ครบ) | phase 3 "dispatch จริง" | **fail — QA-007** (CLI exit 1 ทุก attempt) |
| crash path จริง: exit≠0 → R16 restart 1/1 → R17 crash-limit hold → waiting-on-human | DES-007/018 | pass (evidence จาก QA-007 เอง) |
| DAG parallel ใต้เพดาน (3 execution พร้อมกัน, cap `maxParallelSessions` 3) | AC-045 | pass |
| review wave ตามกฎ (R1 → awaiting-review → wave; คัด task verified ออก) | DES-019 §1–5 | pass |
| QA round (quiesce — รอ execution หมด, tpReady) | AC-054/AC-061 | pass |
| Status write-back เฉพาะ cell (FQ-002 `pending→verified`; ไม่เขียน `pending`; FQ-003 คง pending) | DES-007/AC-073 | pass |
| Feature QA ของ phase (R18 เปิดเมื่อ verified ครบ; taskIds ว่าง = ไม่มี anchor; R19 cleared เพราะไม่มี 🔒) | DES-019 §R18/R19 | pass |
| restart หลัง kill จริง: `--resume` → orphan finalize (interrupted) → R16 + priorSession → reconcile เอกสารชนะ (FQ-001 verified ตาม plan — ไม่ re-run/re-review) → ไม่ dispatch ซ้ำงานเสร็จ | DES-007/AC-034 | pass |
| หยุดที่ gate: NEEDS_HUMAN → gate business-choice (scope task, phase 2, owner jtrp98 จาก gates.yaml) → task hold → task นอก scope เดินต่อ → stdout แจ้ง gate line | DES-008/AC-072/AC-013 | pass |

### perTask

Phase 3 tasks 13/13 เป็น `verified` ตั้งแต่ round 16 — round นี้ไม่ re-verify task (Feature QA ทดสอบ flow รวม)

### Data Model check

ไม่มี schema/entity ใหม่ใน phase 3 (flow/engine เท่านั้น) — run.json `sessions[]/tasks{}/phases{}` บนดิสก์ตรง data-model (อ่านจาก run จริงทั้ง 2 run)

### Issues Found

#### QA-007

- **Task:** BE-012 · **Severity:** Important
- **Expected:** dispatch จริงส่ง schema ให้ CLI ได้ — `camps.yaml` `schemaFlag: "--json-schema"` + `base.ts buildArgv` ส่งค่าเป็น **path ไฟล์** `handoff-schema.json`
- **Actual:** claude CLI 2.1.292 รับ `--json-schema <inline JSON>` เท่านั้น (help: "JSON Schema … Example: {\"type\":\"object\"…}") → parse path เป็น JSON ไม่ผ่าน → exit 1 ภายใน ~0.5s ทุก session: `Error: --json-schema is not valid JSON: JSON Parse error: Unexpected identifier "C"` (session.log ของ s-0-3e45/s-3-49dc ฯลฯ — argv ครบถูกรูป ยกเว้นค่า schemaFlag) → R16 restart → R17 hold ทั้ง module → ไม่มี session จริงใดทำงานเสร็จ · ทดสอบยืนยัน: inline schema ผ่าน (`structured_output` ตรง schema)
- **Reproduce:** เริ่ม run จริงด้วย entry จริง (คำสั่งข้างบน) — ดู `sessions/<sid>/session.log` (argv + stderr) · หรือ `claude -p --json-schema <path>` ตรง ๆ
- **Evidence:** state (ลบแล้วตามเก็บกวาด) — ข้อความ stderr + argv บันทึกไว้เต็มในไฟล์นี้/console ครั้งรัน · ตัว fix อยู่ที่ `src/camps/base.ts` (อ่านไฟล์ schema แล้วส่งเนื้อ JSON inline) หรือกำหนด semantic ของ `schemaFlag` ใหม่ใน camps.yaml

#### QA-008

- **Task:** BE-012 · **Severity:** Minor (→ backlog)
- **Expected:** `command: claude` spawn ได้จาก PATH ตามที่ camps.yaml ตั้ง
- **Actual:** `spawn('claude', …, {shell:false})` = ENOENT บน Windows — npm global มีแต่ shim `.cmd`/`.sh` ซึ่ง spawn ตรงไม่ได้; executable จริงอยู่ `…\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe` ที่**ไม่ได้อยู่บน PATH** (fixture ต้องสร้าง bin สำเนา exe จริง + prepend PATH จึง spawn ผ่าน)
- **Reproduce:** `node -e "spawn('claude',['--version'],{shell:false})"` โดยไม่มี claude.exe บน PATH → ENOENT
- **Evidence:** ผลรันจริงก่อน/หลัง prepend PATH (close 0 vs ENOENT) — จดเป็น deployment precondition (runbook/deploy.md) หรือชี้ `command` เต็ม path

## Unverified Behaviour — undeployed phases

- agent จริง (claude CLI) ทำงานจนคืน handoff ผ่าน schema: **ยังไม่พิสูจน์** — QA-007 บล็อกทุก session (คงจาก round 15)
- killOrphan กับ **pid จริง** (`taskkill /PID /T /F` + winImageName guard ของ driver): run จริง session ตายเอง <1s ไม่มี orphan process ค้าง; fake run pid=null → พิสูจน์เฉพาะ finalize/interrupted — รูป `inferred` ของ DES-007 ยังไม่ trigger จริง
- security stage (🔒) ของ phase จริง: fixture ไม่ lock phase — พิสูจน์แล้วเฉพาะ unit suite (round 15) · เป็น stage ถัดไปหลัง phase 3 ผ่าน (ถ้า round นี้ PASS)
- ผลข้างมุม: ระหว่างทดสอบพบ claude.exe 3 process ของผู้ใช้ (สร้างก่อนการทดสอบ) — ไม่ได้แตะ; session ของ run ทั้ง 6 attempt จบเอง (exit 1) — ไม่มี process ค้างจากการทดสอบ

## Change Log

- 2026-10-07 — Round 17 — Feature QA — Phase 3 — ❌ Failed (qa:QA-007 Important บล็อก dispatch จริง — เจ้าของ BE-012 · qa:QA-008 Minor → backlog) · fixture ลบ + sta-config คืน byte-exact (sha256 ตรง) + state คืน .gitkeep · npm test 279/279

Back-links: `plan\index.md` · `..\index.md`
