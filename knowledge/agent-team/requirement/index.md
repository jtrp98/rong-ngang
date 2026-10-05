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
| REQ-006 | human gate ผูกกับเจ้าของ และระบบวิ่งหาเจ้าของเอง | confirmed | AC-013, AC-014, AC-015, AC-016 | `req-006.md` |
| REQ-007 | งานใหม่ส่งตรงถึง BA เป็นผู้กรอง | confirmed | AC-017, AC-018, AC-019 | `req-007.md` |
| REQ-008 | Solo mode: ขับ pipeline แบบ manual ใน coding agent session | confirmed | AC-020, AC-021, AC-022, AC-023, AC-024 | `req-008.md` |
| REQ-009 | สวิตช์ git commit ต่อ knowledge (override ต่อ target) | confirmed | AC-025, AC-026, AC-027, AC-028, AC-029, AC-030, AC-031, AC-032 | `req-009.md` |
| scope.md | เนื้อหา module-level: Overview · Target Users & Roles · Release Scope · Constraints & Assumptions · Declined / Not Pursuing · References | พร้อม | — | `scope.md` |

## Change Log

- 2026-10-05 — สร้างพร้อม split โครงเอกสาร (DES-014): แตก requirement.md → req-001…008 (1 REQ ต่อไฟล์) + index.md นี้
- 2026-10-05 — เพิ่มแถว `scope.md` (เนื้อหา module-level ย้ายจาก module index.md) + แก้หัว budget เป็นสูตรใหม่ (DES-014 ฉบับปรับปรุง 2026-10-05)
- 2026-10-05 — เพิ่ม REQ-009 (สวิตช์ git commit) จากคำตอบเจ้าของใน OQ-7; AC-030 รอ OQ-8 · ส่วน command/audit/remote รอ OQ-9
- 2026-10-05 — REQ-009 → confirmed หลังปิด OQ-8/9; เพิ่ม AC-031 (non-git root เตือน+ข้าม), AC-032 (ตัด `git.remote`)
