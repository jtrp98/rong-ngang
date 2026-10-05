# agent-team — Design

> หน่วยอ่าน = ไฟล์ · Budget ต่อหน่วย (DES-014): des ≤ 8 KB · data-model ≤ 15 KB · index ใช้สูตร `(median ขนาดไฟล์ย่อย × 0.75) × จำนวนไฟล์ + 2 KB` — index นี้ระบุ 22 ไฟล์ (des-001…017 + data-model, quality-attributes, modules, risks, archive) median ~4.6 KB (ประมาณ — ยังไม่วัดครบ) → budget ≈ 4.6×0.75×22+2 ≈ 77.9 KB · actual 15,935 B (driver วัด 2026-10-05) ✓ — ต่อให้ median ต่ำเพียง 1 KB budget ยัง ≈ 18.5 KB ≥ actual · 1 แถว = 1 บรรทัด · เขียนโดย `system-analyst` เท่านั้น

**วิธีอ่าน:** packet `readSections` เป็น path ตรง — อ่าน index หมวดที่ถูกชี้ก่อน แล้วอ่านเฉพาะไฟล์ที่ packet ระบุเท่านั้น · ห้าม ls ห้ามอ่านข้ามหมวด (grep ในไฟล์ที่ได้รับอนุญาตทำได้) · ตาราง DES ด้านล่างคือรายชื่อไฟล์ contract ทั้งหมด (DES-014) · ไฟล์เก่า `design.md`/`design-archive.md` กลายเป็นโครงนี้ตั้งแต่ Rev 7

## Feature-by-Feature Feasibility

> 2026-10-05: pack fork สร้างใหม่ที่ `code\` (packRoot — DES-003/013 — ย้ายเข้า `code\` แล้วเพราะ pack เป็น asset ของสินค้า) — path ของ sta2 ในตารางนี้เป็นหลักฐาน ณ วันตรวจ 2026-10-04

ประเมินจาก requirement ฉบับ OQ ปิดครบ (2026-10-04) และของจริงบนเครื่อง: claude 2.1.287, codex-cli 0.160.0, agy 1.2.16, `rong-ngang` ไม่ใช่ git repo, `knowledge\agent-team\` เป็น flat folder, `code\` ว่าง (ตรวจ 2026-10-04) · **อัปเดต 2026-10-05:** "ไม่ใช่ git repo" ล้าสมัย — `rong-ngang\.git\HEAD:1` = `ref: refs/heads/main` (repo เดียวทั้ง knowledge + code); layout เป็น split (DES-014); `code\` มี pack + `sta-config.json`

| REQ | Verdict | เหตุผล + evidence |
|---|---|---|
| REQ-001 Web UI 2 กรณี (งานเดิม/งานใหม่) | ทำได้ทันที | local HTTP server + static page (DES-009); กรณีที่ 1 เลือกงานเดิมเป็นลำดับ **knowledge → target → module** อ่านรายการจาก `code\sta-config.json` (DES-015); สถานะต่อ module อ่านได้จาก run state (DES-007) ประกอบเอกสารจริง (plan.md `## Waiting on Human`, Status cells) — `C:\src\AICode\sta2\CLAUDE.md:75-82` finish rules, DES-011 |
| REQ-002 multi-camp 3 CLI | ทำได้ทันที | headless mode ยืนยันทั้ง 3: `claude -p` (claude --help: "-p, --print"), `codex exec` (codex --help: "Run Codex non-interactively"), `agy -p/--print` (agy --help) — DES-002; default camp claude ต่อ role แก้ที่ routing config — DES-005 |
| REQ-003 12 role ชุดเดียวกับ sta2 | ทำได้ทันที | dispatch อ่าน prompt จาก `C:\src\AICode\sta2\.claude\agents\<role>.md` ที่เดียว (ไม่ทำสำเนาต่อ camp) แนบต่อ dispatch — DES-003; write scope ต่อ role บังคับ 2 ชั้น (brief + post-run audit) — DES-006. ข้อจำกัด: กติกา "Status cells เฉพาะ qa-engineer" เป็นระดับ cell ซึ่ง audit ระดับไฟล์จับไม่ได้ บังคับด้วยบรีฟเท่านั้น (บันทึกใน DES-006) |
| REQ-004 Tier T1–T6 | ทำได้ทันที | port tier engine จาก `orchestrator/src/runtime/tierRouting.ts` (resolveEffectiveModelPolicy — precedence ตามเดิม, ปฏิเสธ T1 จาก auto-cast ที่ tierRouting.ts:78-87, รายงาน basis ที่ tierRouting.ts:167-169); binding อยู่ `config/tiers.yaml` คนเป็นเจ้าของ — DES-004 |
| REQ-005 knowledge เดียวกัน | ทำได้ทันที | docsRoot + templatesRoot เป็น config (DES-011); ทุก camp อ่าน-เขียน path/format เดียวกันเพราะ dispatch packet ชี้ path ตรงตัว. layout ยืนยันแล้ว (OQ-D1 ปิด 2026-10-04 → design-archive.md): flat `knowledge\<module>\` ตามของจริง — sta2 `policies/documentation.md:5` จะต้องแก้ตาม (policy alignment task ไม่ใช่ design blocker) |
| REQ-006 human gate 7 จุด ผูกเจ้าของ | ทำได้ทันทีในขอบเขต release | gate เป็น state ของ orchestrator ไม่ใช่พฤติกรรม agent: driver หยุด dispatch ก่อนข้าม gate (DES-008) — ตอบ AC-013 แบบ deterministic; เจ้าของต่อ gate จาก `config/gates.yaml`; แจ้งผ่าน dashboard + terminal (ช่องทางภายนอกอยู่นอก scope ตาม requirement §Scope) |
| REQ-007 งานใหม่ส่งตรงถึง BA | ทำได้ทันที | ข้อความดิบส่งเป็น dispatch packet ตรงถึง business-analyst โดยไม่มีชั้นจัดหมวด (DES-010); ผลตัดสินของ BA อ่านจาก machine handoff ของ BA เอง (DES-012) แสดงบน UI; จากนั้น driver เดินตาม plan/process เดิม |
| REQ-008 solo mode (manual pipeline ใน coding agent session) | ทำได้ทันที | sta2 ทำแบบนี้อยู่แล้ว (`sta2\CLAUDE.md` — main session เป็น pipeline driver, gate 7 จุด, finish rules) และโปรเจกต์นี้ถูกขับแบบ solo ตลอด (BA/SA สวมบทใน session เดียว, 2026-10-04) — ใช้ pack ชุดเดียวกับ orchestrated ไม่เพิ่มโค้ด; รองรับ 4 agents (AC-024): claude/zcode อ่าน `.claude\agents\*.md` + `CLAUDE.md` ตรง (sta2 ใช้จริง) · codex — `~\.codex\AGENTS.md` มีจริง (`inferred`) · antigravity — `agy --help` ไม่พบ convention → `AGENTS.md` ที่ `code\` (packRoot) เป็นจุดเข้ากลาง (`inferred`) — จุดเข้าเป็น task ของ setup role (SETUP-003) — DES-013 |
| REQ-009 สวิตช์ git commit (`gituse`) | ทำได้ — ต้องแก้ pack | resolve/validate/freeze ใน config layer (DES-015) · บังคับ 3 ชั้น: กันก่อนได้เฉพาะ claude (`--disallowedTools`), codex/agy = บรีฟ + ref audit หลัง stage (DES-016, DES-006) · `code\.claude\settings.json:5-6,24-25` deny `git add`/`git commit` แบบ static → ต้องถอดออก ไม่งั้นสวิตช์เปิดไม่มีผลใน claude/zcode · `/gituse` = slash command ใน pack (DES-017, รูปไฟล์ต่อ agent `inferred`) · audit ใช้ git เพราะ rong-ngang เป็น repo (`.git\HEAD:1`) |

สรุป: ทุก REQ ทำได้ทันที ไม่มีรายการ "ทำไม่ได้" และไม่ต้องเปลี่ยน requirement ใด — ข้อเสนอทางเทคนิคทั้งหมดเป็น additive ต่อ sta2 (ไม่แตะไฟล์ sta2 เลย นอกจากอ่าน) · ปรับปรุง 2026-10-05: packRoot = `code\` (pack เป็น asset ของสินค้า), layout เป็น split (DES-014), knowledge/target ผูกด้วย sta-config.json (DES-015) · ปรับปรุง 2026-10-05 (Rev 9): REQ-009 ทำได้แต่ต้องแก้ pack ที่ `code\` (settings.json deny + hard rule git ใน `CLAUDE.md` + `/gituse`)

## Design Contracts

| ID | ชื่อ | Traces | ไฟล์ |
|---|---|---|---|
| DES-001 | Pipeline driver และ stage state machine | REQ-001 (AC-003), REQ-002, REQ-007 (AC-019) | `des-001.md` |
| DES-002 | Camp adapters: headless spawn ต่อ camp | REQ-002 (AC-004, AC-005) | `des-002.md` |
| DES-003 | Role prompt แหล่งเดียว และวิธีแนบต่อ dispatch | REQ-003 (AC-006, AC-007), REQ-005 (AC-012) | `des-003.md` |
| DES-004 | Tier engine (port จาก orchestrator เดิม) | REQ-004 (AC-008, AC-009, AC-010) | `des-004.md` |
| DES-005 | Role routing (role → camp) | REQ-002 (AC-004, AC-005), REQ-006 (AC-015) | `des-005.md` |
| DES-006 | Write scope ต่อ role + post-run write audit | REQ-003 (AC-007), REQ-005 (AC-011, AC-012), REQ-009 (AC-026, AC-027, AC-030) | `des-006.md` |
| DES-007 | Run state store และการ resume | REQ-001 (AC-002, AC-003), REQ-006 (AC-013) | `des-007.md` |
| DES-008 | Human gate enforcement (7 จุด) | REQ-006 (AC-013, AC-014, AC-015, AC-016) | `des-008.md` |
| DES-009 | Web UI และ local API server | REQ-001 (AC-001, AC-002, AC-003), REQ-006 (AC-014), REQ-007 (AC-017, AC-018), REQ-009 (AC-029, AC-031, AC-032) | `des-009.md` |
| DES-010 | งานใหม่ส่งตรงถึง business-analyst | REQ-007 (AC-017, AC-018, AC-019), REQ-001 | `des-010.md` |
| DES-011 | Knowledge integration (docsRoot, template, amend) | REQ-005 (AC-011, AC-012), REQ-001 (AC-002) | `des-011.md` |
| DES-012 | Dispatch packet และ machine handoff contract | REQ-002 (AC-004), REQ-003 (AC-006), REQ-006 (AC-014), REQ-007 (AC-018), REQ-009 (AC-027, AC-029, AC-030, AC-031) | `des-012.md` |
| DES-013 | Solo mode (manual pipeline ใน coding agent session) | REQ-008 (AC-020, AC-021, AC-022, AC-023, AC-024), REQ-009 (ตัวชี้ → DES-016/017) | `des-013.md` |
| DES-014 | โครงสร้างเอกสาร module (split layout) | REQ-005 (AC-011, AC-012), REQ-003 | `des-014.md` |
| DES-015 | sta-config.json (machine-local registry) + สวิตช์ `gituse` | REQ-001 (AC-001, AC-002), REQ-002 (AC-004), REQ-009 (AC-025, AC-026, AC-028, AC-029, AC-031, AC-032), DES-011 | `des-015.md` |
| DES-016 | สิทธิ์ git commit ต่อ root (`gituse`): การบังคับ | REQ-009 (AC-026, AC-027, AC-029, AC-030, AC-031), REQ-008 | `des-016.md` |
| DES-017 | `/gituse` slash command (solo mode) | REQ-009 (AC-025, AC-028, AC-029), REQ-008 (AC-023, AC-024) | `des-017.md` |

## ไฟล์อื่นในหมวดนี้

| ไฟล์ | เนื้อหา |
|---|---|
| `data-model.md` | config ทั้ง 5 ไฟล์ (registry/routing/tiers/camps/gates) + sta-config.json machine-local + `gituse` (DES-015), run state + `gitPolicy`, packet, handoff-v1 |
| `quality-attributes.md` | performance, failure modes, observability, deployment, tech debt |
| `modules.md` | โครง package + port/adapter (+ pack fork ที่ packRoot) |
| `risks.md` | dependencies + risks (+ index drift) |
| `archive.md` | OQ ที่ปิดแล้ว verbatim (เดิม `design-archive.md`) |

## Unresolved Open Questions

ทุกข้อปิดแล้ว 2026-10-04 — ดู `archive.md` (OQ-D1…D5) · OQ-D1 superseded โดย DES-014 (2026-10-05) · OQ-7/8/9 (business — BA) ปิดแล้ว → REQ-009 · ค้างฝั่งคน (gate 2): ยืนยันชื่อ/ชนิด field `gituse` และการถอด `git add`/`git commit` ออกจาก `code\.claude\settings.json` (DES-015/016)

## Change Log

- 2026-10-04 — Rev 1 — สร้าง design จาก requirement.md ฉบับ OQ ปิดครบ
- 2026-10-04 — Rev 2 — เจ้าของสั่งเปลี่ยนภาษาเป็น C# (.NET LTS): แก้ Modules เป็น Clean Architecture solution (Domain/Application/Infrastructure/Web + xUnit), DES-009 เป็น ASP.NET Core minimal API, แทน toolchain Node/tsx ทุกจุด — headless flags, JSON-schema enforcement, tier engine logic, และ OQ-D ทั้งหมดไม่เปลี่ยน
- 2026-10-04 — Rev 3 — เจ้าของสั่งกลับไปใช้ TypeScript/Node (ยกเลิก Rev 2): คืน Node http server + tsx + dep เดียว `yaml`, Modules เป็น single TS package (core/camps/web + node:test) — headless flags, JSON-schema enforcement, tier engine logic, OQ-D ทั้งหมดไม่เปลี่ยน
- 2026-10-04 — Rev 4 — ปิด OQ-D1…D5 (ย้าย Q&A ไป design-archive.md): flat layout · writePaths ยืนยัน · record-only ยอมรับ · git init โดย setup role → audit git-primary · owner=jabja — เพิ่ม DES-013 solo mode ตาม REQ-008
- 2026-10-04 — Rev 5 — เจ้าของยืนยัน handoff-v1 (DES-012) · DES-013 ขยายรองรับ 4 agents (claude/codex/antigravity/zcode) ตาม OQ-6: จุดเข้าต่อ agent เป็น wrapper ชี้ pack ชุดเดิม (task ของ PM) — แหล่งความจริงเดียวคงเดิม
- 2026-10-04 — Rev 6 — ปิด Waiting on Human #1/#2 ของ plan ตามคำตอบเจ้าของ: ตำแหน่ง `AGENTS.md` = ราก `rong-ngang` (เดิม "ราก sta2/pack" — ชนหลักการไม่แตะ sta2) · สำเนา role เดิมที่ `~\.gemini\config\agents\` = backup แล้วลบโดย setup role — จุดเข้าย้ายเป็น task ของ setup role (SETUP-003) ตาม plan
- 2026-10-05 — Rev 7 — โครงเอกสาร split + index (DES-014) ตามคำตอบเจ้าของ: ทำทั้งโครง · fork pack ที่ราก rong-ngang ทันที (packRoot — DES-003/006/011/012/013 แก้ตาม) · plan 1 task ต่อไฟล์ — ย้าย design.md เข้า design\ folder (ไฟล์นี้ + ไฟล์ย่อย 19 ไฟล์)
- 2026-10-05 — Rev 8 — packRoot = code\ (pack เป็น asset ของสินค้า) · DES-015 sta-config.json machine-local (n knowledge × n target, เลือก knowledge→target→module) · code = package ติดตั้ง private · onboarding knowledge ด้วย setup prompt (phase 1)
- 2026-10-05 — Rev 9 — REQ-009 (สวิตช์ git commit, OQ-7/8/9): DES-015 ตัด draft `git: {remote}`/ตรวจ origin → `gituse` (knowledge + target, target ชนะ, default เปิด, freeze `gitPolicy`) · DES-006 audit ใช้ git ตาม repo ไม่ขึ้นกับสวิตช์ + git ต่อ role · DES-009 แสดงสวิตช์ · DES-012 packet `gitPolicy` · ใหม่ DES-016 (การบังคับ) + DES-017 (`/gituse`) · data-model ย่อ (comment หลักฐาน/ประวัติ) · แก้หลักฐาน "ไม่ใช่ git repo" · ข้อความเดิม verbatim → `archive.md` §Superseded 2026-10-05 · risks.md +#13 (gituse default เปิด) +#14 (target = orchestrator home ชน universal deny) · modules.md ผู้เขียน `gituse` · ชื่อ field + settings.json รอเจ้าของยืนยัน (gate 2)
- 2026-10-05 — Rev 9 ย่อขนาด (driver วัด: data-model 15,599 · des-006 9,009 · des-015 8,332 · des-013 8,194 B เกินงบ) — ย้ายเหตุผล/หลักฐาน/ประวัติ + ย่อหน้า git ต่อ role ที่ซ้ำ DES-016 → `archive.md` §Rev 9 ย่อขนาดรอบ 2 (rule ไม่เปลี่ยน) · แก้หัว budget: 22 ไฟล์
