# agent-team — Requirement

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (DES-014) → ไฟล์ย่อย 9 ตัว (req-001…008 + scope.md) median 1.99 KB → budget ≈ 15.4 KB · unit: req ≤ 4 KB · scope.md ≤ 12 KB · เขียนโดย `business-analyst` เท่านั้น
> วิธีอ่าน: เปิดเฉพาะไฟล์ที่ packet ระบุ — สถานะล่าสุดของ REQ อยู่ในตารางนี้เท่านั้น · เนื้อหา module-level (Overview/Target Users/Release Scope/Constraints/Declined/References) อยู่ที่ `scope.md` · กลับไปสารบัญหลักที่ `..\index.md`

| REQ | ชื่อ | Status | AC ids | ไฟล์ |
|---|---|---|---|---|
| REQ-001 | หน้าจอเปิดมี 2 กรณี: งานที่เริ่มแล้ว และงานใหม่ | confirmed | AC-001, AC-002, AC-003 | `req-001.md` |
| REQ-002 | ส่งงานให้ CLI หลายค่าย (multi-camp) | confirmed | AC-004, AC-005 | `req-002.md` |
| REQ-003 | บทบาทเดียวกับ sta2 (12 roles) | confirmed | AC-006, AC-007 | `req-003.md` |
| REQ-004 | กำกับด้วย Tier 1–6 | confirmed | AC-008, AC-009, AC-010 | `req-004.md` |
| REQ-005 | knowledge เดียวกันทั้งทีม | confirmed | AC-011, AC-012 | `req-005.md` |
| REQ-006 | human gate ผูกกับเจ้าของ และระบบวิ่งหาเจ้าของเอง | confirmed — AC-072 สมมติฐาน | AC-013, AC-014, AC-015, AC-016, AC-072, AC-078 | `req-006.md` |
| REQ-007 | งานใหม่ส่งตรงถึง BA เป็นผู้กรอง | confirmed | AC-017, AC-018, AC-019 | `req-007.md` |
| REQ-008 | Solo mode: ขับ pipeline แบบ manual ใน coding agent session | confirmed | AC-020, AC-021, AC-022, AC-023, AC-024 | `req-008.md` |
| REQ-009 | สวิตช์ git commit ต่อ knowledge (override ต่อ target) | confirmed — ไม่อยู่ R1 (เลื่อน release ถัดไป — gate 7, jtrp98 2026-10-05) | AC-025, AC-026, AC-027, AC-028, AC-029, AC-030, AC-031, AC-032 | `req-009.md` |
| REQ-010 | Artifact เป็นความจำของโปรเจกต์ (stateless agent session) | confirmed | AC-033, AC-034, AC-035 | `req-010.md` |
| REQ-011 | `plan\index.md` เป็น work graph (Depends + Status แหล่งเดียว) | confirmed — AC-039 สมมติฐาน | AC-036, AC-037, AC-038, AC-039, AC-073, AC-074, AC-079 | `req-011.md` |
| REQ-012 | 1 coherent task = 1 session (Agent ≠ Session) | confirmed | AC-040, AC-041, AC-042 | `req-012.md` |
| REQ-013 | รัน task อิสระพร้อมกัน + unlock ตาม contract | confirmed — ค่าเพดาน 3 สมมติฐาน | AC-043, AC-044, AC-045 | `req-013.md` |
| REQ-014 | Minimum context ต่อ session + อ้างอิงด้วย ID | confirmed | AC-046, AC-047, AC-048 | `req-014.md` |
| REQ-015 | Reviewer clean session ต่อ execution wave + ผล structured | confirmed — ค่า wave/task ใหญ่ + 🔒 = flag security-sensitive สมมติฐาน | AC-049, AC-050, AC-051, AC-052, AC-080 | `req-015.md` |
| REQ-016 | QA clean session ต่อ round + batch checks + defect packet | confirmed | AC-053, AC-054, AC-055, AC-056 | `req-016.md` |
| REQ-017 | Feature/Integration QA หลัง task ของ feature ครบ | confirmed | AC-057, AC-058, AC-077 | `req-017.md` |
| REQ-018 | Test Planner กำหนดว่าต้องตรวจอะไร (TP-NNN) | confirmed | AC-059, AC-060, AC-061 | `req-018.md` |
| REQ-019 | Blocker: ขอแก้ design / requirement ระหว่างทำ task | confirmed | AC-062, AC-063, AC-064 | `req-019.md` |
| REQ-020 | Orchestrator เป็นเจ้าของ runtime state | confirmed — restart limit 1 สมมติฐาน | AC-065, AC-066, AC-067, AC-075 | `req-020.md` |
| REQ-021 | กติกา workflow deterministic + output state + localized retry | confirmed | AC-068, AC-069, AC-070, AC-071, AC-076 | `req-021.md` |
| scope.md | เนื้อหา module-level: Overview · Target Users & Roles · Release Scope · Constraints & Assumptions · Declined / Not Pursuing · References | พร้อม | — | `scope.md` |
| archive.md | ของที่ย้ายออก verbatim (ประวัติ/เหตุผล/หมายเหตุแก้ข้อกำหนดเดิม) จาก req-011, req-012, req-015, req-020, req-021, scope.md — ไม่อ่านตอน startup | พร้อม | — | `archive.md` |

## Change Log

- 2026-10-05 — สร้างพร้อม split โครงเอกสาร (DES-014): แตก requirement.md → req-001…008 (1 REQ ต่อไฟล์) + index.md นี้
- 2026-10-05 — เพิ่มแถว `scope.md` (เนื้อหา module-level ย้ายจาก module index.md) + แก้หัว budget เป็นสูตรใหม่ (DES-014 ฉบับปรับปรุง 2026-10-05)
- 2026-10-05 — เพิ่ม REQ-009 (สวิตช์ git commit) จากคำตอบเจ้าของใน OQ-7; AC-030 รอ OQ-8 · ส่วน command/audit/remote รอ OQ-9
- 2026-10-05 — REQ-009 → confirmed หลังปิด OQ-8/9; เพิ่ม AC-031 (non-git root เตือน+ข้าม), AC-032 (ตัด `git.remote`)
- 2026-10-05 — spec refactor session/orchestration ของเจ้าของ (jtrp98) เข้า R1 (gate 7 ยืนยันโดยผู้ใช้ 2026-10-05): เพิ่ม REQ-010…021 (AC-033…071) · amend REQ-001, REQ-003, REQ-008 (หมายเหตุ ไม่เปลี่ยน AC) และ REQ-006 (+AC-072) · OQ-10…19 ค้าง · หัว budget: ไฟล์ย่อย 22 ตัว (req-001…021 + scope.md) — median/budget ยังไม่ได้วัดใหม่ด้วย `wc -c`
- 2026-10-05 — ปิด OQ-10…19 ตามคำตอบเจ้าของ (jtrp98) 2026-10-05 → amend REQ-003/006/008/011/012/013/015/017/018/020/021 + scope.md · เพิ่ม AC-073…078 · แก้ AC-021 (`plan.md` → `plan\index.md`) · ขนาดไฟล์หลังแก้ยังไม่ได้วัด (BA ไม่มี shell)
- 2026-10-05 — คุมงบ (driver วัด: scope.md 13,327 B, req-011 5,163 B, req-020 4,634 B): ย้ายประวัติ/เหตุผล verbatim → `archive.md` (ไฟล์ใหม่ + แถวในตารางนี้) · rule/AC/ค่าที่ตอบแล้วไม่เปลี่ยน · req-021 (3,911 B) อยู่ในงบ ไม่แตะ
- 2026-10-05 — gate 7: เจ้าของ (jtrp98) เลือก "ไป release ถัดไป" ผ่าน AskUserQuestion → REQ-009 (AC-025…032) ไม่อยู่ R1 · status คง confirmed · rule/AC ไม่เปลี่ยน · R1 ใช้กติกา no state-changing git เดิม (scope.md Constraints)
- 2026-10-05 — ปิด OQ-20: เจ้าของ (jtrp98) เลือกข้อ (ก) ผ่าน AskUserQuestion — plan ห้าม task Owner reviewer/security → amend REQ-011 (+AC-079), REQ-012, REQ-015 (+AC-080), REQ-021 (แถวตาราง) · ย้าย Change Log แรกของ req-021 verbatim → `archive.md` · ขนาดไฟล์หลังแก้ยังไม่ได้วัด
- 2026-10-05 — คุมงบ รอบ 2 (driver วัด: req-011 4,639 B, req-012 4,190 B, req-015 4,312 B, scope.md 12,883 B): ย้าย Change Log เดิม + ข้อความที่ซ้ำ AC/ประวัติ verbatim → `archive.md` · rule/AC/ค่าที่เจ้าของตอบไม่เปลี่ยน (รวม AC-079/080)
