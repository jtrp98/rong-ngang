# agent-team — Module Index

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (DES-014) → ไฟล์ที่ระบุ 5 ตัว median 2.92 KB (วัดจาก 4 ไฟล์ที่มีจริง — `plan\index.md` ยังไม่มี) → budget ≈ 12.9 KB · เขียนโดย `business-analyst` เท่านั้น
> วิธีอ่าน: อ่าน index ของหมวดที่ packet ชี้ก่อน แล้วเปิดเฉพาะไฟล์ที่ packet ระบุ — ห้าม ls ห้ามอ่านข้ามหมวด (grep ในไฟล์ที่ได้รับอนุญาตทำได้) · index นี้เป็น **สารบัญล้วน** — เนื้อหา module-level ทั้งหมดอยู่ที่ `requirement\scope.md`

## Documents

| ไฟล์ | เนื้อหา | สถานะ |
|---|---|---|
| `requirement\index.md` | สารบัญ requirement — ตาราง REQ-001…021 + scope.md + สถานะ + AC | พร้อม |
| `requirement\scope.md` | เนื้อหา module-level: Overview · Target Users & Roles · Release Scope · Constraints & Assumptions · Declined / Not Pursuing · References | พร้อม |
| `design\index.md` | สารบัญ design — Feasibility + ตาราง DES + ไฟล์ย่อย | พร้อม |
| `plan\index.md` | สารบัญ plan — release scope, phase, task ต่อไฟล์ | พร้อม |
| `open-questions\index.md` | สารบัญ OQ ทั้ง 25 — ไฟล์รายตัว oq-1…20, oq-d1…d5 (ปิดครบ) | พร้อม |
| `backlog.md` | งานที่ทำทีหลัง (append-only) | พร้อม |
| `security.md` | บันทึกความปลอดภัยและการประเมิน 🔒 security gates | พร้อม |
| `deploy.md` | Runbook ติดตั้ง, รัน, กู้คืน และประวัติการ Deploy R1 | พร้อม |

## Change Log

- 2026-10-04 — สร้างเอกสารจากการสัมภาษณ์ BA: ชื่อ module `agent-team`, ทุก gate ผูกกับผู้ใช้เองใน release นี้, ช่องทาง intent = Web UI แบบ local, แจ้ง gate ผ่าน dashboard/terminal
- 2026-10-04 — ตามข้อเสนอแก้ไขของผู้ใช้: ตัด intent classifier — REQ-001 เป็น "หน้าจอ 2 กรณี" (งานเดิม: เลือก knowledge/module + สถานะ + ปุ่มเริ่มงาน; งานใหม่: พิมพ์แล้วส่งตรงถึง BA), REQ-007 เปลี่ยนเป็น "BA กรองงานใหม่" และเพิ่ม OQ-1 (Gemini ยังใช้ไหม), OQ-5 (เริ่มงานทั้งที่มี gate ค้าง)
- 2026-10-04 — ปิด OQ ครบทั้ง 5: ตัด Gemini API ออกทั้งหมด (OQ-1) · ทุก role default camp claude ก่อน (OQ-2) · เขียน orchestrator เอง Windows native ไม่ใช้ CAO (OQ-3) · ยืนยันตาราง tier binding ฉบับตั้งต้น (OQ-4 — ตรวจชื่อ model จาก `agy models` + `~/.codex/config.toml`) · ปุ่มเริ่มงานพาไปตอบ gate ก่อนเมื่อมี Waiting on Human (OQ-5 ตาม default) — ยืนยัน CLI จริง: claude 2.1.287 / codex-cli 0.160.0 / agy 1.2.16
- 2026-10-04 — เพิ่ม REQ-008 solo mode (pipeline แบบ manual ใน coding agent session ด้วย pack ชุดเดียวกับ orchestrated mode) + OQ-6 (pack format สำหรับ codex/agy session — non-blocking) — OQ-D1…D5 ฝั่ง design ถูกปิดด้วยค่า default ที่ BA เลือกตามคำสั่ง "ปิด oq ก่อน" (ผู้ใช้ยังแก้กลับได้: ที่ config สำหรับ D1/D2/D5, git init เป็น setup task สำหรับ D4) — รายละเอียดใน design.md Rev 4
- 2026-10-04 — ปิด OQ-6 ตามนิยามของเจ้าของ: solo mode = การใช้ prompt แบบ sta2 without orchestrator/web ใครก็ใช้ได้ — ขยาย REQ-008 รองรับ 4 agents (claude/codex/antigravity/zcode) + AC-024 · handoff-v1 (DES-012) ยืนยันโดยเจ้าของ — design.md อัปเดต Rev 5
- 2026-10-05 — ย้ายโครงเอกสารเป็น split (DES-014): แตก requirement.md → requirement\ + index.md, รวม OQ ที่ open-questions\ — module index.md นี้เป็นสารบัญหลัก
- 2026-10-05 — ตาม DES-014 ฉบับปรับปรุง 2026-10-05: index นี้เหลือสารบัญล้วน — ย้ายเนื้อหา module-level (Overview, Target Users & Roles, Release Scope, Constraints & Assumptions, Declined / Not Pursuing, References) ไป `requirement\scope.md` verbatim · แตก OQ เป็นไฟล์รายตัว `open-questions\oq-1…6.md` + `oq-d1…d5.md` · หัว budget ของ index ทุกตัวเป็นสูตรใหม่ (median × 0.75 × จำนวนไฟล์ + 2 KB)
- 2026-10-05 — git: เพิ่ม REQ-009 (สวิตช์ git commit ต่อ knowledge + override ต่อ target ใน sta-config, สลับด้วย `/gituse`, default เปิด, มีผล run ถัดไป, อ่าน git ได้เสมอ) จากคำตอบเจ้าของใน OQ-7 · ค้าง OQ-8, OQ-9
- 2026-10-05 — ปิด OQ-7/8/9 → REQ-009 confirmed: สวิตช์ = permission ให้ AI commit อย่างเดียว (ห้าม push/branch/merge), ปิด = กติกา no state-changing git เดิม, non-git root เตือน+ข้าม, `/gituse` เป็น slash command ใน solo mode, ตัด `git.remote`/ตรวจ origin
- 2026-10-05 — spec refactor session/orchestration ของเจ้าของ (jtrp98) เข้า R1 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05, route BA → SA → PM): เพิ่ม REQ-010…021 (AC-033…071), amend REQ-001/003/006 (+AC-072)/008, แก้ Release Scope + Constraints ใน `requirement\scope.md` · เปิด OQ-10…19
- 2026-10-05 — เจ้าของเปลี่ยนชื่อ owner เป็น `jtrp98` (ชื่อ git) ตามคำสั่งเจ้าของ: แก้ทุกเอกสารและ `gates.yaml` `owner_default` + test · คงชื่อเดิม `jabja` verbatim ใน `open-questions\oq-d5.md`, `design\archive.md`, `design\index.md` Change Log (ประวัติ)
- 2026-10-05 — ปิด OQ-10…19: เจ้าของ (jtrp98) เลือกตัวเลือกตามข้อเสนอของ BA ทุกข้อ → amend REQ-003/006/008/011/012/013/015/017/018/020/021 + `requirement\scope.md` · เพิ่ม AC-073…078 · ตัวเลข config ตั้งต้นยังเป็นสมมติฐาน
- 2026-10-05 — gate 7: เจ้าของ (jtrp98) เลื่อน REQ-009 (สวิตช์ git `gituse`, AC-025…032) ไป release ถัดไป — R1 ใช้กติกา no state-changing git เดิม · แก้ `requirement\index.md`, `requirement\scope.md`, `requirement\req-009.md` · เปิด OQ-20 (task Owner reviewer/security ใน orchestrated mode) รอเจ้าของ
- 2026-10-05 — ปิด OQ-20: เจ้าของ (jtrp98) เลือกข้อ (ก) ตามข้อเสนอของ BA — task ใน plan ห้าม Owner reviewer/security (review มาจาก wave, security = stage ท้าย phase 🔒) → REQ-011 (+AC-079), REQ-012, REQ-015 (+AC-080), REQ-021
- 2026-10-07 — **ปิด Release R1 (DONE / RELEASED):** ผู้ใช้ (`jtrp98`) อนุมัติรับมอบงาน Release R1 Local อย่างเป็นทางการตามข้อกำหนด Done = released — สโคปงานทั้ง 34 tasks (Phase 1–7) ผ่านการ implement, review, และ QA ครบ 100%, test suite 345/345 ผ่าน, smoke จริงครบ 3 camp (claude, codex, agy), runbook `deploy.md` พร้อมใช้งาน
