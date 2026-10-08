# agent-team — Requirement Scope

> เนื้อหา module-level ของ BA · Budget ≤ 12 KB · เขียนโดย `business-analyst` เท่านั้น · ตาราง REQ: `index.md` ในโฟลเดอร์นี้ · สารบัญหลัก: `..\index.md`

## Overview

ปัจจุบันชุด STA (`sta2`) ขับ pipeline 12 บทบาทด้วย Claude Code เพียงค่ายเดียว และให้ session หลักเป็นคนขับเอง — ไม่มีหน้ารับงาน/แดชบอร์ด, ไม่มีการเลือก camp/CLI, และไม่มีกลไกบังคับ human gate

โปรเจกต์นี้สร้าง **"ทีม agent" แบบ multi-camp**: Web UI แบบ local เปิดมามี **2 กรณี** — (1) งานที่เริ่มไปแล้ว: เลือก knowledge/module เห็นสถานะว่างานถึงไหนแล้ว แล้วกดปุ่มเริ่มงานให้ pipeline วิ่งต่อ (2) งานใหม่: พิมพ์ลงช่องข้อความแล้วกดส่ง ข้อความถูกส่ง**ตรงถึง business-analyst** เป็นคนกรองเองว่าจะเพิ่มเข้า module เดิมหรือสร้าง module ใหม่ จากนั้นเข้า process เดิม — งานถูกส่งให้ CLI ของค่าย AI ต่างๆ (Claude Code, Codex, Antigravity) ทำในบทบาทชุดเดียวกับ 12 role ของ `sta2` โดยทุกบทบาทอ่าน-เขียน **knowledge เดียวกัน** ถูกกำกับด้วย **Tier 1–6** (แนวคิดเดียวกับ `model-tiers.yaml` ของชุด `software-team-agents`) และ human gate ทุกจุดถูกผูกกับเจ้าของที่ระบุชื่อ ระบบต้อง "วิ่งหา" เจ้าของ gate เพื่อขอคำตอบก่อนไปต่อ

ระบบมี **สองโหมดใช้งาน**: **orchestrated mode** — Web UI + orchestrator ขับเองตามที่อธิบายข้างบน และ **solo mode** — coding agent session เดียว (เช่น ZCode, Claude Code) ขับ pipeline แบบ manual ด้วย pack ชุดเดียวกัน (REQ-008)

## Target Users & Roles

| Role | ใช้ทำอย่างไร |
|---|---|
| ผู้ใช้/เจ้าของโปรเจกต์ (คุณ) | เลือก/เริ่มงานและพิมพ์งานใหม่ใน Web UI, ตอบ human gate ทุกตัว (release นี้), ดู dashboard |
| ตัวขับ pipeline (orchestrator) | อ่านสถานะจาก knowledge, ขับ pipeline ตาม process, บังคับ human gate แล้ววิ่งหาเจ้าของ |
| business-analyst | กรองงานใหม่ที่ส่งตรงถึง: เพิ่มเข้า module เดิม หรือสร้าง module ใหม่ |
| ทีม agent (12 บทบาท × 3 camps) | รับบรีฟผ่าน CLI ของ camp ที่ถูกมอบหมาย แล้วอ่าน/เขียนเอกสารใน knowledge เดียวกัน |
| Owner-A / Owner-B (อนาคต) | เจ้าของ gate เฉพาะตัว เช่น BA-gate → A, SA/Dev-gate → B — release นี้ยังไม่มีตัวจริง |

## Release Scope

**R2 (gate 7 — เจ้าของ jtrp98 2026-10-08, AskUserQuestion "เปิด R2 ด้วยเรื่องนี้"):** REQ-022 (แจกจ่ายเป็น npm package) + REQ-023 (`rong-ngang-workspace\` เก็บเฉพาะของ project) · OQ-21 (ที่เปิด session) ส่ง SA เสนอทางเลือก · route BA → SA → PM · ยังไม่มี project ที่ใช้จริง — ไม่ต้อง migrate · REQ-009 (`gituse`) ยังอยู่ backlog เว้นแต่เจ้าของย้ายเข้า

**R1 — ปิดแล้ว (DONE / RELEASED 2026-10-07):** REQ-001…008, REQ-010…021 — ขอบเขตเต็ม verbatim ย้ายไป `archive.md` § "scope.md — Release Scope R1 — ย้าย 2026-10-08"

## Constraints & Assumptions

- เครื่องพัฒนาคือ Windows (win32) + Git Bash — CLI ทั้ง 3 ต้องรันได้บนเครื่องนี้ — สภาพแวดล้อมเซสชันนี้
- ไม่มีชั้น intent classifier แยก — การกรองงานใหม่เป็นหน้าที่ของ business-analyst โดยตรง — ผู้ใช้ (2026-10-04)
- release นี้ไม่มี external API key ที่ต้องจัดการ (Gemini ถูกตัดทั้งหมด — OQ-1) — ผู้ใช้ 2026-10-04
- ตัวขับ pipeline **เขียนเอง** รัน Windows native โดยตรง (ไม่พึ่ง CAO/WSL/tmux) — ตัดสินโดย ผู้ใช้ 2026-10-04 (OQ-3)
- แนวคิด tier รวมทั้ง "T1 reserved", role defaults, precedence (override → tier → role default) ดึงจาก `software-team-agents\model-tiers.yaml` + `docs\tier-and-effort-run.md` — ผู้ใช้ (แนวคิด)
- กติกา pipeline และ finish rules ของ sta2 (`CLAUDE.md`) ยังใช้กับทีมนี้เหมือนเดิม — ผู้ใช้ · **แก้ 2026-10-05 (เจ้าของ jtrp98):** ยกเว้นใน orchestrated mode — (ก) เดินทีละ stage / "main session is the pipeline driver" → รัน task ที่ runnable พร้อมกัน และ orchestrator เป็นเจ้าของ runtime state (REQ-013, REQ-020) (ข) ตาราง task `id|status` → `Task|Name|Owner|Phase|Depends|Status` และไม่มี Status ใน task file (REQ-011) (ค) reviewer/QA เป็น clean session แบบ batch ต่อ wave/round (REQ-015, REQ-016) (ง) คอลัมน์ Status เขียนโดย orchestrator จาก verdict ของ qa-engineer (REQ-011, OQ-14) · finish rules, human gates 7 จุด (OQ-19) และ max two fix rounds คงเดิม (retry limit = 2 ตัวนับเดียวต่อ task — OQ-11) · solo mode คง serial และ qa-engineer เขียน Status เอง (OQ-17) · ตัวเลข config ตั้งต้น (เพดาน parallel 3, restart อัตโนมัติ 1, wave ≤ 4 task / 800 บรรทัด, task ใหญ่ > 400 บรรทัดหรือ > 10 ไฟล์) — สมมติฐาน — ยังไม่ยืนยัน
- R1 ใช้กติกา No state-changing git เดิม: AI/role ใด commit ไม่ได้ ทุก root (อ่าน git ได้) — สวิตช์ REQ-009 ยังไม่มีผลใน R1 — เจ้าของ (jtrp98) 2026-10-05
- หลักการ R1: Session = working memory ชั่วคราว · Artifact = project memory · Orchestrator state = runtime state — เจ้าของ (jtrp98) 2026-10-05 (REQ-010)
- CLI ทั้งสามติดตั้งแล้วบนเครื่องนี้ (ตรวจแล้ว 2026-10-04): claude 2.1.287, codex-cli 0.160.0, agy 1.2.16
- ชื่อ model ฝั่ง google ตรวจครบจาก `agy models` แล้ว; ฝั่ง codex ยืนยัน default `gpt-6.1-sol` จาก `~/.codex/config.toml` — catalog อื่นของ codex ยังไม่เปิดดู แก้ที่ config ได้ภายหลัง
- solo mode ใช้ไฟล์ชุดเดียวกับ orchestrated mode (role prompts ใน sta2, templates, policies, ตาราง tier) — ห้ามแตกสำเนาสองชุด — ผู้ใช้ (2026-10-04)

## Declined / Not Pursuing

- ให้ session หลักของ Claude Code เป็นคนขับ pipeline แบบ sta2 เดิม — ผู้ใช้ระบุให้ Gemini เป็นผู้รับ intent และกระจายงานหลายค่ายแทน · ตัดสินโดย ผู้ใช้ 2026-10-04
- ใช้ orchestrator + `sta` CLI เต็มรูปของชุด `software-team-agents` ต่อ — ผู้ใช้แยกมาเริ่มใหม่ที่ sta2 แล้ว โปรเจกต์นี้ดึงเฉพาะแนวคิด tier/human-gate กลับมาใช้ · ตัดสินโดย ผู้ใช้ 2026-10-04
- ชั้นรับ/จัดหมวด intent แยก (ร่างแรก: Gemini รับ intent แล้วแปลงเป็นบรีฟ) — ผู้ใช้แก้เป็น: เปิดมามี 2 กรณี และงานใหม่ส่งตรงถึง BA · ตัดสินโดย ผู้ใช้ 2026-10-04
- ใช้ Gemini API ใน release นี้ (ไม่ว่าเป็นตัวกลางหรือผู้ช่วยสรุปบน dashboard) — ตัดออกทั้งหมด · ตัดสินโดย ผู้ใช้ 2026-10-04 (OQ-1)
- ใช้ CAO (awslabs/cli-agent-orchestrator) เป็น runner — เลือกเขียน orchestrator เองแบบ Windows native (ไม่พึ่ง WSL/tmux) แทน · ตัดสินโดย ผู้ใช้ 2026-10-04 (OQ-3)

## References

| ข้อเท็จจริง | Source |
|---|---|
| role prompt ทั้ง 12 + human gates 7 จุด + finish rules | `C:\src\AICode\sta2\.claude\agents\*.md`, `C:\src\AICode\sta2\CLAUDE.md` |
| นิยาม Tier T1–T6, role default, precedence | `C:\src\AICode\software-team-agents\model-tiers.yaml`, `decisions\ADR-022-per-phase-model-tier.md`, `docs\tier-and-effort-run.md` |
| เครื่องมือ orchestrator หลาย CLI (supervisor, tmux isolation, Web UI :9889) | https://github.com/awslabs/cli-agent-orchestrator |
| template เอกสารทั้งหมดที่ทีมต้องใช้ร่วมกัน | `C:\src\AICode\sta2\templates\*.md`, `C:\src\AICode\sta2\policies\*.md` |

## Change Log

- 2026-10-05 — คุมงบ รอบ 2: Change Log เดิม + หมายเหตุประวัติ (OQ-10…19 ปิด, บันทึก REQ-009 เดิม, หมายเหตุวันที่ระบบ) verbatim → `archive.md` §scope.md (รอบ 2)
- 2026-10-08 — เปิด R2 (REQ-022, REQ-023, OQ-21) ตามคำตอบเจ้าของ (jtrp98) 2026-10-08 · ย้ายขอบเขต R1 (ปิดแล้ว) verbatim → `archive.md` เพื่อคุมงบ
