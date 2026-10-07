# SETUP-008 — Pack: role prompts v2 (qa / reviewer / PM / engineers / test-planner)

> ≤ 4 KB · เขียนโดย `project-manager` · Owner/Phase/Depends/Status → `plan\index.md` (index ชนะ)

## Goal

role prompt ใน pack ที่ `code\` ทำงานตาม REQ-010…021 ทั้งสองโหมด คง ownership, gate, index-first

## References

- REQ-003 (AC-006, AC-007), REQ-011 (AC-038, AC-073), REQ-012 (AC-042), REQ-015 (AC-049, AC-050), REQ-016 (AC-053, AC-055), REQ-017 (AC-058), REQ-018 (AC-059, AC-060), REQ-019 (AC-062, AC-063), REQ-021 (AC-068), REQ-008 (AC-020, AC-023)
- DES-014, DES-012, DES-018, DES-019, DES-013 · follow-up: DES-020, AC-079, AC-080

## Scope

- `qa-engineer`: Status ตามโหมด (orchestrated คืน verdict ใน handoff; solo เขียนเอง) · QA round batch + shared checks ครั้งเดียว + QA-NNN · Feature QA flows
- `reviewer`: clean session · ไม่แก้ implementation · ผล PASS/FAIL + REV-NNN ครบ field
- `project-manager`: Depends ใน index · task file 8 หัวข้อไม่มี Status + บรรทัดเครื่องอ่าน (DES-014) · phase = user flow · `impactedTasks`
- `backend-engineer`, `frontend-engineer`: output state ชุด execution (DES-018) + รูป blocker · ไม่แก้ design/requirement · เขียนเฉพาะ Write paths
- `test-planner`: TP-NNN Given/When/Then + REQ/AC · ไม่รัน check · คง trigger เดิม (OQ-16)
- follow-up Rev 11/12 (`design\index.md` §Impact): severity 3 ระดับ · รูป `qa:`/`review:` · `securityGate[]` · Owner/anchor (DES-014) · template + `CLAUDE.md`
- Write paths: `.claude/agents/qa-engineer.md`, `.claude/agents/reviewer.md`, `.claude/agents/project-manager.md`, `.claude/agents/backend-engineer.md`, `.claude/agents/frontend-engineer.md`, `.claude/agents/test-planner.md`, `templates/review-round.md`, `templates/qa-round.md`, `templates/plan-task.md`, `CLAUDE.md`
- Security-sensitive: no

## Out of Scope

- role อื่น 6 ตัว · เพิ่ม/ลด role (คง 12 — OQ-16) · git ต่อ role (REQ-009) · ไฟล์ sta2 · template/policy นอก Write paths (SETUP-007)

## Expected Output

- prompt 6 ไฟล์ + 3 template + `CLAUDE.md` ที่แก้แล้วใน `code\`

## Acceptance

- grep แต่ละ prompt พบกติกาที่ระบุใน Scope · qa-engineer ไม่สั่งเขียน Status ใน orchestrated (AC-073) · engineer prompt ระบุ 7 output states + รูป blocker (AC-062, AC-068)
- reviewer/QA prompt ระบุ clean session + ไม่แก้ implementation (AC-049, AC-053) · test-planner ห้ามรัน check (AC-060) · ครบ 12 role และไม่มีสำเนา prompt ที่อื่น (AC-006, AC-023)

## Dependencies

- SETUP-007 — template/policy ที่ prompt อ้าง

## Handoff

- `DONE` + diff สรุปต่อ prompt → reviewer · แจ้ง driver เรื่อง sync ไป sta2
- Risk / Rollback: กลาง — พฤติกรรม agent ทุก session · rollback: คืนไฟล์จาก git

## Change Log

- 2026-10-05 — สร้าง (replan R1 ขยาย, design Rev 10 §Impact — pack ส่วน role prompts)
- 2026-10-06 — **amend ย้อนหลังหลัง verified** (review round 4 PASS, qa round 2 ✅): Write paths/Scope ฯลฯ ให้ตรงไฟล์ที่ follow-up Rev 11/12 แก้จริง · Acceptance/Status ไม่เปลี่ยน
- 2026-10-06 — ย่อ Goal/Scope ตามงบ (driver วัด 4,295 B) · Acceptance ไม่เปลี่ยน

Back-links: `plan\index.md`
