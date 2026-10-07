# <ชื่อ module> — Test Plan: <slug>

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `test-planner` เฉพาะเมื่อมี trigger · cases ไม่ใช่ essay · `test-plan\index.md` ต้องมีตารางสารบัญ (1 แถว = 1 บรรทัด) `| TP | Phase | REQ/AC | ไฟล์ |` เช่น `| TP-001 | 1 | REQ-001/AC-001 | <slug>.md |`

## Trigger

cross-task | multi-system | migration | security | release — <เหตุผล 1 บรรทัด>

## Affected

Tasks: … · REQ/AC: … · DES: …

## Test Framework

มี: `<command>` | ไม่มี — cases ด้านล่างเป็น checklist ให้ `qa-engineer` ตรวจด้วยมือ

## Cases

> 1 case = 1 TP-NNN · ต้องมี Given/When/Then และ REQ/AC ที่อ้าง (AC-059)

### TP-001 — <ชื่อ case>

- **Level:** unit / integration / API / E2E
- **REQ/AC:** REQ-001 / AC-001 (+ DES-001)
- **Given:** <สถานะตั้งต้น>
- **When:** <การกระทำ>
- **Then:** <ผลที่คาดหวัง>

## Unresolved Open Questions

| ID | ช่องว่างของพฤติกรรม | ส่งไปที่ |
|---|---|---|

## Change Log

- YYYY-MM-DD — <สิ่งที่เปลี่ยน>

Back-links: `plan\index.md` · `..\index.md`
