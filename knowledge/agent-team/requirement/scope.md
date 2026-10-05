# agent-team — Requirement Scope

> เนื้อหา module-level ของ BA (ย้าย verbatim จาก `..\index.md` ตาม DES-014 ฉบับปรับปรุง 2026-10-05 — module index เป็นสารบัญล้วน) · Budget ≤ 12 KB · เขียนโดย `business-analyst` เท่านั้น · ตาราง REQ: `index.md` ในโฟลเดอร์นี้ · สารบัญหลัก: `..\index.md`

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

> Scope ยืนยันโดยผู้ใช้ 2026-10-04

**อยู่ใน release นี้:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008 — solo mode รองรับ 4 agents ตั้งแต่ release นี้: claude, codex, antigravity, zcode (จุดเข้าต่อ agent ออกแบบใน design — DES-013)

**ไม่อยู่ใน release นี้** (ไป `..\backlog.md` เมื่อ PM เปิด module นี้): แจ้ง gate ผ่าน Telegram/LINE/Email, เจ้าของ gate หลายคนพร้อมช่องทางติดต่อจริง (config รองรับแล้ว แต่ไม่กรอกตัวจริง), camp เพิ่มนอกจาก 3 ตัว (เช่น opencode/zai ตามของเดิม), รายงานต้นทุน/โควตาต่อ camp, รันต่างเครื่อง/บน server, self-learning/memory ของ CAO

## Constraints & Assumptions

- เครื่องพัฒนาคือ Windows (win32) + Git Bash — CLI ทั้ง 3 ต้องรันได้บนเครื่องนี้ — สภาพแวดล้อมเซสชันนี้
- ไม่มีชั้น intent classifier แยก — การกรองงานใหม่เป็นหน้าที่ของ business-analyst โดยตรง — ผู้ใช้ (2026-10-04)
- release นี้ไม่มี external API key ที่ต้องจัดการ (Gemini ถูกตัดทั้งหมด — OQ-1) — ผู้ใช้ 2026-10-04
- ตัวขับ pipeline **เขียนเอง** รัน Windows native โดยตรง (ไม่พึ่ง CAO/WSL/tmux) — ตัดสินโดย ผู้ใช้ 2026-10-04 (OQ-3)
- แนวคิด tier รวมทั้ง "T1 reserved", role defaults, precedence (override → tier → role default) ดึงจาก `software-team-agents\model-tiers.yaml` + `docs\tier-and-effort-run.md` — ผู้ใช้ (แนวคิด)
- กติกา pipeline และ finish rules ของ sta2 (`CLAUDE.md`) ยังใช้กับทีมนี้เหมือนเดิม — ผู้ใช้
- CLI ทั้งสามติดตั้งแล้วบนเครื่องนี้ (ตรวจแล้ว 2026-10-04): claude 2.1.287, codex-cli 0.160.0, agy 1.2.16
- ชื่อ model ฝั่ง google ตรวจครบจาก `agy models` แล้ว; ฝั่ง codex ยืนยัน default `gpt-6.1-sol` จาก `~/.codex/config.toml` — catalog อื่นของ codex ยังไม่เปิดดู แก้ที่ config ได้ภายหลัง
- solo mode ใช้ไฟล์ชุดเดียวกับ orchestrated mode (role prompts ใน sta2, templates, policies, ตาราง tier) — ห้ามแตกสำเนาสองชุด — ผู้ใช้ (2026-10-04)
- วันที่ทั้งหมดในเอกสารนี้อ้างจากวันที่ระบบของเซสชัน (2026-10-04) ไม่ได้มาจากปฏิทินของผู้ใช้

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

- 2026-10-05 — สร้างไฟล์ — ย้าย section module-level ทั้งหมด (Overview, Target Users & Roles, Release Scope, Constraints & Assumptions, Declined / Not Pursuing, References) จาก `..\index.md` verbatim ตาม DES-014 ฉบับปรับปรุง 2026-10-05 (module index เป็นสารบัญล้วน)
