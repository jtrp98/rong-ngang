# agent-team — QA Round 10 — SETUP-005

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| review:REV-031 | SETUP-005 | Minor | → backlog (system-analyst → setup — `review\round-12.md:9-15`) |
| review:REV-032 | SETUP-005 | Minor | → backlog (setup — `review\round-12.md:17-24`) |

## Round 10

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` (ที่ `code\agent-team\`) | pass — 43/43, fail 0 |
| fail-closed | รัน `code\prompts\setup-knowledge.md` ขั้น 1 (`stat`) กับ path ไม่มีจริง | pass — ปฏิเสธ + sta-config sha256 ไม่เปลี่ยน |
| onboarding run | รัน prompt ขั้น 1–4 ครบกับ path จริง (fixture ใน `state\tmp-setup005-qa\`) | pass — ครบทุกขั้น |
| loader จริง | `npx tsx -e` → `loadStaConfig` + `resolveRunRoots` (config.ts:751,762) | pass — รายการใหม่และเดิม resolve ได้ |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| SETUP-005 | verified | รัน prompt ซ้ำเองทีละขั้น (ไม่ใช้ evidence ส่งต่อ) — รายละเอียดด้านล่าง · Status `pending` → `verified` |

### ผลรัน prompt ซ้ำเอง (fixture: `code\agent-team\state\tmp-setup005-qa\` — ลบแล้วเมื่อจบ round)

- **สภาพต้น + backup:** `sta-config.json` 12 บรรทัด — 1 knowledge root (`rong-ngang-knowledge`) + 1 target (`agent-team-code`) ไม่มีร่องรอยทดสอบจาก engineer · backup sha256 `392519480e3652474088a9e7f704d977724a2eb7e4a8ef11adfb1ca6536ae94f` · `state\` มีแค่ `.gitkeep`
- **กรณี A — path ผิด (AC "path ผิด → ปฏิเสธ")**: Input knowledge root = `...\tmp-setup005-qa\missing-dir` (ไม่มีจริง) → ขั้น 1 `stat` ตกทั้ง knowledge root และ target → ปฏิเสธทันที รายงาน path ที่ตก · ไม่เขียน/แก้/สร้างไฟล์ใดเลย · sha256 sta-config คงเดิม · ไม่มีโครง module ถูกสร้าง · ตรง `setup-knowledge.md:18-22` + DES-015 fail-closed
- **กรณี B — path จริง**: Input `tmp-qa-knowledge` / `tmp-qa-target` / module `tmp-qa-module` (folder จริงสร้างโดย "ผู้ใช้" ก่อนรัน ตามที่ prompt กำหนด)
  - **ขั้น 2 — โครง module ตาม DES-014:** 11 ไฟล์ครบตามตาราง mapping — 7 ไฟล์คัด template verbatim (diff `plan\index.md` กับ `templates\plan-index.md` = ตรงเป๊ะ) + 4 stub (root `index.md`, `test-plan\index.md`, `review\index.md`, `qa\index.md` หัวตารางตรงตัว) · ไฟล์หมวด "ไม่สร้าง" หลุดมา 0 (req-*/des-*/round-*/security.md/deploy.md/UX-*)
  - **AC-036:** `plan\index.md:26` หัวตาราง `| Task | Name | Owner | Phase | Depends | Status |` ครบ 6 คอลัมน์
  - **ขั้น 3 — append:** รายการใหม่ท้าย `knowledge_roots[]` · keys ตรง schema (root: `name,path,targets` · target: `name,path`) · forward slash · `JSON.stringify(config, null, 2)` + บรรทัดว่างท้าย · **ไม่มี key `gituse`/`git`** (grep = 0) · รายการเดิม deep-equal กับ backup ครบทุก key/ค่า
  - **ขั้น 4 — ตรวจหลังเขียน:** อ่านกลับ parse ผ่าน · **loader จริง:** `loadStaConfig` ผ่าน `validateStaConfig` (exact keys — `config.ts:572,585,604` + `checkDirExists` ทุก path) · `resolveRunRoots({knowledge:'tmp-qa-knowledge', target:'tmp-qa-target'})` คืน `docsRoot`/`codeRoots`/`selectedTarget` ถูกต้อง — orchestrator อ่านรายการใหม่ได้จริง · รายการเดิม (`rong-ngang-knowledge`/`agent-team-code`) resolve ผ่านเช่นกัน
- **Teardown:** คืนค่า sta-config จาก backup — **sha256 ตรงเป๊ะทุกไบต์** `392519480e3652474088a9e7f704d977724a2eb7e4a8ef11adfb1ca6536ae94f` · ลบ `state\tmp-setup005-qa\` ทั้งโฟลเดอร์ (`state\` เหลือ `.gitkeep`) · ไม่มี .bak/.tmp หลงเหลือใน packRoot
- **`code\AGENTS.md` — แทรกไม่ทับ SETUP-003:** หัวข้อใหม่ "Onboarding knowledge ใหม่ — setup prompt" (`AGENTS.md:28-32`) แทรกระหว่าง "อ่านอะไร" (`:20`) กับ "คู่มือเปิด solo session" (`:34`) — ตาราง 4 agents `:13-18`, tiers.yaml `:26`, serial `:48`, qa-engineer เขียน Status `:42,49`, no post-run audit `:46`, รูป v2 `:50`, `/gituse` `:52` ครบทั้งหมด — โครง SETUP-003 ไม่หาย

### Data Model check

- sta-config ขณะทดสอบ เทียบ `design\data-model.md` §sta-config ผ่าน validator จริงของ BE-001: root exact keys `[main_root, knowledge_roots]` (`config.ts:572`) · knowledge root `[name, path, targets]` (`config.ts:585`) · target `[name, path]` (`config.ts:604`) — ผ่านหมด · key นอก schema (เช่น `gituse`) ถูก exact-keys ปฏิเสธ — ยืนยันว่าไม่มีเขียนแทรก

### Issues Found

ไม่มี — ไม่เปิด QA-004 · review:REV-031/032 Minor → backlog แล้ว (จดที่ `review\round-12.md` — ไฟล์นี้อ้าง Back-links ในตาราง Open Issues)

## Unverified Behaviour — undeployed phases

- สาขาของ prompt ที่อ่านโค้ด/prompt แล้วแต่ไม่ได้รันจริงใน round นี้: config corrupt → "หยุดแจ้งผู้ใช้ ไม่ทับเอง" (`setup-knowledge.md:77`) · ไฟล์ไม่มี → ถาม `main_root` แล้วสร้าง config ใหม่ (`:76` — review:REV-032 ธง fail-closed ไว้แล้ว) · name ซ้ำ → หยุดถาม (`:78`) · ไฟล์ skeleton มีอยู่แล้ว → ข้ามไม่ทับ (`:26`) · `targets: []` (`:87`)
- prompt เป็นคำสั่งให้ agent อ่านและทำตาม — การเชื่อฟังขอบเขตเขียน (fail-closed, ห้าม gituse) ไม่มี enforcement ในตัว ยืนยันได้เฉพาะต่อ session ที่รันจริง (QA-002 ครอบ solo 4 agents)

## Handoff

- SETUP-005 ✅ Verified — Status `pending` → `verified` เขียนแล้วใน `plan\index.md` (คอลัมน์เดียว) · sta-config คืนค่า byte-exact + fixture ลบแล้ว · ไม่มี finding ใหม่ · ไม่มี blocker
- **Phase 2 ครบ:** SETUP-004, SETUP-007, SETUP-008, SETUP-009, SETUP-003, SETUP-005 → verified 6/6 — next: driver รัน **Feature QA phase 2** (flow: เปิด solo session ที่ `code\` → ขับ pipeline แบบ serial ด้วย template/prompt v2 · onboarding knowledge ใหม่ด้วย setup prompt)

## Change Log

- 2026-10-06 — Round 10 — SETUP-005 ✅ Verified — รัน prompt ซ้ำเอง 2 กรณี (path ผิด → ปฏิเสธ · path จริง → โครง 11 ไฟล์ + AC-036 + append schema ไม่มี gituse + รายการเดิมครบ) + loader จริง + npm test 43/43 · teardown คืน sta-config byte-exact + ลบ fixture · sync Status `pending → verified`

Back-links: `plan\index.md` · `..\index.md`
