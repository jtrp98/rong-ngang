# agent-team — Open Questions

> หน่วยอ่าน = ไฟล์ · Budget(index) = (median ขนาดไฟล์ย่อยที่ระบุ × 0.75) × จำนวนไฟล์ + 2 KB (DES-014) → ไฟล์ย่อย 11 ตัว (oq-1…6, oq-d1…d5) median 1.34 KB → budget ≈ 13.1 KB · unit: oq ≤ 4 KB ต่อไฟล์ · เขียนโดย `business-analyst` เท่านั้น
> วิธีอ่าน: เปิดเฉพาะไฟล์ OQ ที่ packet ระบุ — ตารางนี้คือแหล่งรายชื่อไฟล์เดียว · ถ้อยคำคำถาม/คำตอบเต็มอยู่ในไฟล์ของแต่ละข้อ · ref `req-00N.md` = `..\requirement\req-00N.md`

| ID | คำถามย่อ | ผู้ตอบ | สถานะ | ไฟล์ |
|---|---|---|---|---|
| OQ-1 | Gemini API ยังใช้ไหม | ผู้ใช้ | answered | `oq-1.md` |
| OQ-2 | role เริ่มรันที่ camp ใด | ผู้ใช้ | answered | `oq-2.md` |
| OQ-3 | ใช้ CAO หรือเขียน orchestrator เอง | ผู้ใช้ | answered | `oq-3.md` |
| OQ-4 | ตาราง tier binding ฉบับตั้งต้น | ผู้ใช้ | answered | `oq-4.md` |
| OQ-5 | เริ่มงานทั้งที่ gate ค้าง ทำอย่างไร | ผู้ใช้ | answered | `oq-5.md` |
| OQ-6 | solo mode นิยาม + รองรับ agents ใด | ผู้ใช้ | answered | `oq-6.md` |
| OQ-D1 | layout ยืนยัน flat หรือไม่ | ผู้ใช้ | answered — superseded โดย DES-014 | `oq-d1.md` |
| OQ-D2 | writePaths ต่อ role ยืนยันก่อน dispatch แรก | ผู้ใช้ | answered | `oq-d2.md` |
| OQ-D3 | record-only dispatch ต่อ gate ยอมรับไหม | ผู้ใช้ | answered | `oq-d3.md` |
| OQ-D4 | git init ที่ rong-ngang หรือไม่ | ผู้ใช้ | answered | `oq-d4.md` |
| OQ-D5 | ชื่อ owner ใน gates.yaml | ผู้ใช้ | answered | `oq-d5.md` |
| OQ-7 | สวิตช์ git ต่อ knowledge/module: "บล็อก" คืออะไร อยู่ที่ไหน ใครสลับ | ผู้ใช้ | answered → REQ-009 | `oq-7.md` |
| OQ-8 | git commit: ใครทำ เมื่อไร ขอบเขต push ไหม ข้อยกเว้น no state-changing git | ผู้ใช้ | answered → REQ-009 | `oq-8.md` |
| OQ-9 | `/gituse` อยู่ที่ไหน, ผลต่อ write audit, draft `git: {remote}`, ใครสลับได้ | ผู้ใช้ | answered → REQ-009 | `oq-9.md` |
| OQ-10 | เพดาน parallel session + นิยาม "BE เสร็จจริง" ที่ unlock FE | เจ้าของ (jtrp98) | closed → REQ-013 | `oq-10.md` |
| OQ-11 | retry limit เท่าไร + สัมพันธ์กับ max two fix rounds เดิม | เจ้าของ (jtrp98) | closed → REQ-021, REQ-020 | `oq-11.md` |
| OQ-12 | นิยาม small execution wave + เกณฑ์ multi-task session | เจ้าของ (jtrp98) | closed → REQ-012, REQ-015 | `oq-12.md` |
| OQ-13 | ขอบเขต "feature" สำหรับ Feature/Integration QA | เจ้าของ (jtrp98) | closed → REQ-017 | `oq-13.md` |
| OQ-14 | ผู้เขียนคอลัมน์ Status: orchestrator หรือ qa-engineer | เจ้าของ (jtrp98) | closed → REQ-003/011/020/021 | `oq-14.md` |
| OQ-15 | migrate task file ที่มี Status + plan index รูปเดิมหรือไม่ | เจ้าของ (jtrp98) | closed → REQ-011 | `oq-15.md` |
| OQ-16 | ชื่อ artifact ใน spec ต่างของเดิม + 10 vs 12 role + test-planner trigger | เจ้าของ (jtrp98) | closed → REQ-003, REQ-018 | `oq-16.md` |
| OQ-17 | solo mode ใช้กติกา session/parallel ใหม่ด้วยหรือไม่ | เจ้าของ (jtrp98) | closed → REQ-008 | `oq-17.md` |
| OQ-18 | task ค้างตอน restart + รอบแก้ใช้ session เดิมหรือใหม่ | เจ้าของ (jtrp98) | closed → REQ-012, REQ-020 | `oq-18.md` |
| OQ-19 | สถานการณ์ที่ spec เน้น เป็น gate ใหม่หรือรวม gate เดิม | เจ้าของ (jtrp98) | closed → REQ-006 | `oq-19.md` |
| OQ-20 | task Owner = reviewer/security ใน orchestrated mode ทำอย่างไร (DES-018 ไม่มี kind) | เจ้าของ (jtrp98) | closed → REQ-011/012/015/021 | `oq-20.md` |

## Change Log

- 2026-10-05 — แตก OQ เป็นไฟล์รายตัว 1 OQ ต่อ 1 ไฟล์ (ตัดสินโดยเจ้าของ 2026-10-05 — "บางคำถามอาจจะยาว บางคำตอบก็เช่นกัน"): oq-1…6 ยกถ้อยคำเต็มจาก `..\index.md` §Change Log, oq-d1…d5 จาก `..\design\archive.md` (OQ-D1 ระบุ superseded โดย DES-014) — index นี้เหลือตารางสารบัญ แทนตารางเดิมที่ยุบคำตอบไว้ในแถว
- 2026-10-05 — เปิด OQ-7 (สวิตช์ git ต่อ knowledge/module — จากคำพูดเจ้าของ 2026-10-05) รอคำตอบเจ้าของ; ยังไม่เขียน REQ
- 2026-10-05 — OQ-7 answered บางส่วน (เจ้าของตอบผ่าน driver) → REQ-009 · เปิด OQ-8 (commit: ผู้ทำ/จังหวะ/push/ข้อยกเว้น) และ OQ-9 (`/gituse`/audit/remote/สิทธิ์สลับ)
- 2026-10-05 — ปิด OQ-7, OQ-8, OQ-9 ตามคำตอบเจ้าของ → REQ-009 ครบ (AC-025…AC-032)
- 2026-10-05 — เปิด OQ-10…OQ-19 จาก spec refactor session/orchestration ของเจ้าของ (jtrp98) → REQ-010…021 · หัว budget: ไฟล์ย่อย 24 ตัว (oq-1…19, oq-d1…d5) — median/budget ยังไม่ได้วัดใหม่ด้วย `wc -c` (BA ไม่มี shell)
- 2026-10-05 — ปิด OQ-10…19: เจ้าของ (jtrp98) ตอบผ่าน AskUserQuestion โดยเลือกตัวเลือกตามข้อเสนอของ BA ทุกข้อ (ตามรายงาน handoff ของ BA 2026-10-05) → propagate เข้า REQ-003/006/008/011/012/013/015/017/018/020/021 + scope.md · ตัวเลข config ตั้งต้น (เพดาน 3, restart 1, wave 4/800, task ใหญ่ 400/10) ยังเป็นสมมติฐาน
- 2026-10-05 — เปิด OQ-20 (task Owner reviewer/security ใน orchestrated mode) รอเจ้าของ (jtrp98) — BA ไม่มี AskUserQuestion ใน session นี้ ส่งคำถามให้ driver ถาม
- 2026-10-05 — ปิด OQ-20: เจ้าของ (jtrp98) เลือกข้อ (ก) ตามข้อเสนอของ BA ผ่าน AskUserQuestion — ห้าม task Owner reviewer/security → propagate REQ-011 (AC-079), REQ-012, REQ-015 (AC-080), REQ-021
