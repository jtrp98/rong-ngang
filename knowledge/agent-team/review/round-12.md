# agent-team — Review Round 12 — SETUP-005

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · open findings ที่ยังไม่จบอยู่ในไฟล์รอบล่าสุดเท่านั้น

ตรวจ artifact จริง ณ 2026-10-06 — SETUP-005 (setup prompt onboarding knowledge — DES-015): `code\prompts\setup-knowledge.md` + ส่วนใหม่ใน `code\AGENTS.md` · session ไม่มี shell — ยืนยันด้วย Read/Grep/Glob · ไม่อ่าน `qa\`/`security.md`

## Findings

### REV-031

- **Severity:** Minor → backlog
- **Task:** SETUP-005
- **Location:** `code\prompts\setup-knowledge.md:44` (เทียบ `code\templates\design-index.md:22-26`)
- **Problem:** รายการ "ไม่สร้าง" ไม่ครอบคลุม `design\quality-attributes.md` / `modules.md` / `risks.md` / `archive.md` ที่ DES-014 นับใน layout หมวด design · โครงใหม่จึงได้ `design\index.md` (คัด verbatim) ที่ตาราง "ไฟล์อื่นในหมวดนี้" ระบุ 4 ไฟล์ที่ยังไม่มี — ขัดหลัก index/ไฟล์จริงสัมพันธ์กัน (DES-014 Fallback) ตั้งแต่วันแรก และ validator id-level จับไม่ได้ (unitFile ของ design = `des-\d+\.md` — docs-validator.ts:28) · ผู้ต้องแก้: `system-analyst` ตัดสิน contract ก่อน (เติม stub ใน skeleton หรือประกาศว่าตารางนั้น = แผนไฟล์) แล้ว `setup` แก้ตาราง mapping ใน prompt
- **Reference:** DES-014 (tree design\ + Fallback) · plan Acceptance "โครง module ครบตาม DES-014" — validator ผ่านและไฟล์เหล่านี้เป็นของ SA เขียนตามงาน (เทียบ des-*.md) จึงไม่ block

### REV-032

- **Severity:** Minor → backlog
- **Task:** SETUP-005
- **Location:** `code\prompts\setup-knowledge.md:76`
- **Problem:** สาขา "sta-config.json ไม่มี → ถาม `main_root` แล้วสร้าง config ใหม่" ไม่สั่งตรวจ main_root มีจริงก่อนเขียน — ขัด fail-closed ของ DES-015 ("path ใดใน config ไม่มีจริง → ปฏิเสธ") · validator จะปฏิเสธเองภายหลัง (config.ts:574 `checkDirExists` บน main_root) แต่ prompt ควรกันตั้งแต่ขั้น 1 · เกิดเฉพาะเครื่องแรกที่ยังไม่มี config — ไม่มีความเสี่ยงข้อมูลสูญ (orchestrator ปฏิเสธ run แล้วผู้ใช้รัน setup ซ้ำ) · ผู้ต้องแก้: `setup`
- **Reference:** DES-015 §Fallback + fail-closed (des-015.md:19,25)

## Open Findings

| ID | Severity | path:line | Owner | Status |
|---|---|---|---|---|
| REV-023 | Minor | `src/core/knowledge-paths.ts:74` | system-analyst → setup, backend-engineer | → backlog |
| REV-025 | Minor | `requirement\req-006.md:1` ฯลฯ | business-analyst | → backlog |
| REV-026 | Minor | `review\round-1.md:1` ฯลฯ | reviewer / qa-engineer | → backlog |
| REV-027 | Minor | `review\round-7.md:1` | reviewer | → backlog |
| REV-028 | Minor | `src/main.ts:2` · `package.json:5` | backend-engineer | → backlog |
| REV-029 | Minor | `code\.claude\agents\setup.md:22` | setup | → backlog |
| REV-030 | Minor | `code\AGENTS.md:26` | system-analyst | → backlog |
| REV-031 | Minor | `code\prompts\setup-knowledge.md:44` | system-analyst → setup | → backlog |
| REV-032 | Minor | `code\prompts\setup-knowledge.md:76` | setup | → backlog |

## Round 12

**Verdict:** PASS

| Task | Verdict |
|---|---|
| SETUP-005 | PASS |

- **Input + fail-closed (AC "path ผิด → ปฏิเสธ")** — รับ name/path/targets (+module) ครบ (`setup-knowledge.md:11-16`) · ขั้น 1 stat ทุก path ก่อนแตะไฟล์ ไม่ผ่าน → ปฏิเสธ "ห้ามเขียน/แก้ไฟล์ใดเลย" + ห้าม clone/init เอง (`:18-22`) — ตรง DES-015:19
- **โครง module v2 (AC-036)** — mapping ชัด 11 ไฟล์ ต่อ template + owner (`:28-40`) · สร้างเฉพาะที่ยังไม่มี ห้ามทับของเดิม (`:26`) · `plan\index.md` มาจาก `templates\plan-index.md` ซึ่ง header ตาราง Tasks = 6 คอลัมน์จริง (plan-index.md:26) · template ที่ prompt อ้างมีครบใน pack (Glob `code\templates\`)
- **append + schema exact keys** — corrupt → หยุดให้คนตัดสิน ไม่ทับเอง (`:77` — สอดคล้อง fail-closed machine-local, DES-015:25) · name ซ้ำ → หยุดถาม (`:78`) · keys ตรง validator ทุกชั้น: root `{main_root, knowledge_roots}` config.ts:572 · knowledge root `{name, path, targets}` config.ts:585 · target `{name, path}` config.ts:604 — ไม่มี `gituse` ตรง R1 · ห้าม `gituse`/`git` ชัดเจนพร้อมเหตุผล BL-017 (`:85-86`) · "รายการเดิมทุก key/ค่าต้องคงอยู่ครบ" (`:89`) · forward-slash ตามไฟล์จริง (`:88`)
- **ตรวจหลังเขียน + loader จริง** — อ่านกลับ parse / เทียบรายการเดิม / ตรวจรายการใหม่ (`:91-95`) · คำสั่งพิสูจน์ตรง signature จริงของ BE-001: `loadStaConfig(path)` config.ts:751 + `resolveRunRoots(sta, {knowledge, target})` config.ts:762
- **ขอบเขตเขียน** — เฉพาะ `<packRoot>\sta-config.json` + โครง module ใต้ knowledge root ผู้ใช้ (`:104-107`) — ไม่แตะ orchestrator code (loader = อ่านอย่างเดียว), ไม่แตะ sta2, ห้าม git
- **AGENTS.md amend ไม่ทับ SETUP-003** — ส่วนใหม่ `:28-32` แทรกระหว่าง "อ่านอะไร" กับ "คู่มือเปิด solo session" · จุดที่ round-11 ตรวจไว้คงครบ เลื่อน +6 บรรทัดสม่ำเสมอ (Waiting on Human :32→:38 · qa Status :36,43→:42,49 · no post-run audit :40→:46 · serial :42→:48 · รูป v2 :44→:50 · /gituse :46→:52 · tiers.yaml :26 คงที่) · เนื้อหาส่วนใหม่ตรง DES-015 (fail-closed, schema/ห้าม gituse/append)
- **sta-config + state สะอาด** — `sta-config.json` = 12 บรรทัดรูปเดิม (เทียบ DES-015 Evidence `sta-config.json:1-12`) มีแค่ `rong-ngang-knowledge` + target `agent-team-code` — ไม่มีรายการทดสอบค้าง · `state\` มีแค่ `.gitkeep` (Glob) — ไม่มี `tmp-setup005\` · packRoot ไม่มี sta-config .bak/.tmp (Glob `code\sta-config*`)
- **evidence การทดสอบ 4 กรณี — เพียงพอต่อ AC** — (ก) append + ของเดิม deep-equal = ขั้น 4.1-2 ของ prompt ครอบ · (ข) โครง 11 ไฟล์ + 6 คอลัมน์ = ตรง mapping + template จริง · (ค) loader จริง = signature ตรง (ตรวจแล้ว) · (ง) path ผิด ปฏิเสธ + ไฟล์ไม่เปลี่ยน = ขั้น 1 + สภาพไฟล์วันนี้ไม่มีรายการทดสอบ · qa-engineer รอบ verify ถัดไปรันซ้ำอยู่แล้ว — ไม่ต้องข้าม

**ไม่ได้ review:** sha256 ของ `sta-config.json` เทียบ backup (ไม่มี shell — ยืนยันได้เฉพาะเนื้อหา/จำนวนรายการ/ไม่มีรายการทดสอบ) · การรันจริงของ engineer (ตัดสินจาก artifact + ความสอดคล้องของ evidence) · `qa\`/`security.md` (stay independent) · design หมวดอื่นที่ task ไม่ระบุ

## Reviewed

- `plan\setup-005.md` · `design\des-015.md` · `design\des-014.md` · `requirement\req-001.md` (AC-001/002) · `requirement\req-011.md` (AC-036) — grep ตาม AC · `requirement\index.md` (grep) · `code\.claude\agents\reviewer.md`
- `code\prompts\setup-knowledge.md` (ครบ) · `code\AGENTS.md` (ครบ — เทียบ round-11) · `code\sta-config.json` (ครบ) · `code\agent-team\src\core\config.ts:540-629,751-766` · `code\agent-team\src\core\docs-validator.ts` (grep ขอบเขต two-way) · `code\templates\design-index.md` · `code\templates\plan-index.md` (grep header) · Glob: `code\templates\*` · `code\agent-team\state\**` · `code\sta-config*`
- `review\index.md` · `review\round-11.md`

## Change Log

- 2026-10-06 — Round 12 — SETUP-005 PASS · เพิ่ม REV-031/REV-032 Minor → backlog · sta-config.json + `state\` สะอาด

Back-links: `plan\index.md` · `..\index.md`
