# agent-team — Review Round 13 — BE-003 + BE-004 + BE-005

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · open findings ที่ยังไม่จบอยู่ในไฟล์รอบล่าสุดเท่านั้น

ตรวจ artifact จริง ณ 2026-10-06 — BE-003 (role prompt loader) · BE-004 (tier engine port) · BE-005 (role routing) โหมด solo · session ไม่มี shell — `npm test` 99/99 เป็น evidence จาก driver; ยืนยันด้วย Read/Grep/Glob กับโค้ด/test/config จริง และ**ต้นฉบับ port** ที่ `C:\src\AICode\software-team-agents\orchestrator\` · ไม่อ่าน `qa\`/`security.md`

แก้ข้อเท็จจริงใน handoff: "ไม่มี `agents/agentModel.ts`" **ไม่จริง** — ไฟล์มีจริงที่ `software-team-agents\orchestrator\src\agents\agentModel.ts:74-84` (`parseFrontmatterField`) · ผลไม่เสียหาย: ตีความของ engineer ยืนยันกับต้นฉบับแล้วตรงทุกจุด (ดู BE-003)

## Findings

### REV-033

- **Severity:** Minor → backlog
- **Task:** BE-005 (contract gap)
- **Location:** `design\des-005.md:5` · `code\agent-team\src\core\routing.ts:21,41-47`
- **Problem:** DES-005 กำหนด precedence ชั้น 1 "override ต่อ run ที่ผู้ใช้ระบุใน UI" แต่ไม่ pin ชื่อ field/รูปค่า/กติกาค่าว่าง — โค้ดกำหนดเอง (`runOverrideCamp?: string`: undefined = ไม่ระบุ, `""` = ปฏิเสธ — test:90-93) ผู้เรียก (BE-009 UI → BE-011 driver) จะต้องอ่านโค้ดเป็นสเปก · ผู้ต้องแก้: `system-analyst` บันทึก rule ลง DES-005 หรือ data-model ก่อน build BE-009/BE-011
- **Reference:** DES-005 §Rule ชั้น 1 · AC-005 — ไม่ break AC ของ BE-005 (AC-004/005 ครบใน test จริง) จึงไม่ block

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
| REV-033 | Minor | `design\des-005.md:5` · `src/core/routing.ts:21` | system-analyst | → backlog |

## Round 13

**Verdict:** PASS

| Task | Verdict |
|---|---|
| BE-003 | PASS |
| BE-004 | PASS |
| BE-005 | PASS |

**BE-003 (role prompt loader — DES-003)**
- parser แบบแบนตรงต้นฉบับ `agentModel.ts:74-84`: `---` เปิด/ปิด + flat `key: value` บรรทัดเดียว · key ซ้ำ "ใช้ค่าแรก + warning" (role-prompts.ts:87-90) = `.find()` ของต้นฉบับ · tools ขาด/ว่าง → default `Read, Glob, Grep` + warning (:23-24,110-118) = DES-003 คำต่อคำ · ไม่มี frontmatter → เนื้อทั้งไฟล์
- fail-closed ก่อน spawn ครบ + test ครบ: ไฟล์หาย/root หาย/ว่าง/มีแต่ frontmatter/frontmatter ไม่ปิด (role-prompts.test.ts:61-88) · role ไม่รู้จัก/traversal/ใช้ชื่อไฟล์ (role-prompts.ts:36-48 + test:113-123)
- AC: โหลดจาก `loadAppConfig()` จริง, root = `packRoot\.claude\agents` (assert test:32) · pack มี 12 role จริง (Glob) tools ตรง grep `^tools:` ทั้ง 12 — reviewer ไม่มี Bash (test:44) BE มี (test:45) · hash sha256 นิ่งเมื่อไฟล์นิ่ง เปลี่ยนเมื่อไฟล์เปลี่ยน (test:47,50-59) · `model:`/`effort:` ไม่ใช้ + shape 6 field (test:106-111) · hash = ไฟล์ดิบ บันทึกต่อ session เป็นหน้าที่ผู้เรียก (state-store.ts:83 มี `rolePromptHash` รออยู่)
- ขอบเขต: เขียนเฉพาะ 2 ไฟล์ตาม Write paths (inventory src/core, test ไม่มีไฟล์เกิน)

**BE-004 (tier engine port — DES-004) — เทียบต้นฉบับ `tierRouting.ts` จริง ทั้ง 4 จุดเบี่ยง**
- (1) ไม่ port parser → parse อยู่ที่ BE-001 ConfigError ระบุไฟล์+line; validator ครอบ exact keys/enum/T1-reserved (config.ts:428-431,452-456) — สาระ "parse ล้มเหลว → error ระบุรายการปัญหา" ครบ (ชื่อ class `ModelTiersInvalidError` ไม่ port — ไม่ใช่สาระ contract)
- (2) role default ขาด/ไม่ถูกช่วง → ปฏิเสธ (tiers.ts:80-94) — ต้นฉบับมี `RUNTIME_DEFAULT_TIER` fallback (tierRouting.ts:113) แต่ DES-004 precedence จบที่ "ปฏิเสธ" → ตรง design ไม่ใช่ข้าม contract
- (3) ตัด `requested`/`modelExplicit` — output 6 field เป๊ะตาม DES-004 §Inputs/Outputs
- (4) tier ไม่มี cell ปฏิเสธแม้ override ชนะ = พฤติกรรมต้นฉบับจริง (tierRouting.ts:120-126 resolve binding ก่อน apply override) — comment "คงของเดิม" (tiers.ts:111) ถูกต้อง
- กติกา 2/3 + AC: model-only override → effort null runtime-default ไม่ดึง effort tier เดิม (test:94-125) · antigravity ทุก tier + T6/claude effort=null (test:221-246) · AC-008 basis `tier=<T>,model=<b>,effort=<b>` (port :167-169 — test:152-161) · AC-009 T1 ปฏิเสธพร้อมเหตุผล ทั้ง task cast และ role default (test:127-150) · AC-010 sandbox แก้ tiers.yaml ผลเปลี่ยน + resolution ที่ถือไว้ freeze (test:163-186) — ค่า assert ตรง `config\tiers.yaml`/`routing.yaml` จริงที่อ่านเอง (BE/claude = T5 sonnet/medium ฯลฯ)

**BE-005 (role routing — DES-005)**
- precedence 3 ชั้น + basis enum `run-override|role-route|default` ตรง DES-005 คำต่อคำ (routing.ts:11,40-60) · role ไม่มี route → defaultCamp = §Fallback ของ DES-005 ชัดเจน — ต่างจาก tiers ที่ปฏิเสธเพราะ design กำหนดต่างกันจริง (DES-005 มี Fallback, DES-004 ไม่มี)
- camp ไม่รู้จัก ปฏิเสธ 2 ชั้น: validate ก่อนเริ่ม run ที่ config store (ConfigError ระบุไฟล์ — routing.test.ts:117-127) + re-check ค่าในหน่วยความจำ (:84-115) — ตรง DES-005 §Errors
- override `""` → ปฏิเสธ (hardening เกิน AC — fail-closed มี test:90-93) · คำตอบคำถาม contract: โค้ดชัดพอ (JSDoc + comment routing.ts:41 + test) แต่รูป field ต้อง pin ใน design → REV-033
- AC-004: sandbox แก้ routing.yaml ย้าย codex โดยไม่แก้โค้ด + selection ที่ถือไว้ freeze (test:67-82) · AC-005: basis ถูกชั้นทั้ง 3 + routing จริงทุก role → claude (test:48-64 ตรง `config\routing.yaml` จริง)

Evidence จาก driver (12/12 role โหลด · BE/claude → sonnet medium · T1 ปฏิเสธ · routing resolve จริง) cross-check กับ config/pack/test จริงได้ตรงทุก assertion ที่ตรวจแบบ static ได้

**ไม่ได้ review:** รัน `npm test` เอง (session ไม่มี shell — 99/99 เป็น evidence ของ driver; ตรวจแล้วจำนวน test() = 8/8/5 ตรง +8/+8/+5 และ assertion ตรงของจริง) · โค้ด BE-020/BE-007 (round 14 ต่อ) · `qa\`/`security.md` (stay independent)

## Reviewed

- `plan\be-003.md` · `plan\be-004.md` · `plan\be-005.md` · `plan\be-011.md` (contract ผู้เรียก) · `design\index.md` · `design\des-003.md` · `design\des-004.md` · `design\des-005.md`
- `code\agent-team\src\core\role-prompts.ts` (ครบ) · `test\role-prompts.test.ts` (ครบ) · `src\core\tiers.ts` (ครบ) · `test\tiers.test.ts` (ครบ) · `src\core\routing.ts` (ครบ) · `test\routing.test.ts` (ครบ)
- `code\agent-team\src\core\config.ts:1-115,246-297,360-474,671-743` (types + validator + loader) · `config\tiers.yaml` (ครบ) · `config\routing.yaml` (ครบ) · `src\core\state-store.ts:82-83` (grep — integration fields)
- ต้นฉบับ port: `software-team-agents\orchestrator\src\runtime\tierRouting.ts` (ครบ) · `software-team-agents\orchestrator\src\agents\agentModel.ts:1-100`
- `code\.claude\agents\reviewer.md` (ครบ) · grep `^tools:` 12 ไฟล์ pack · Glob `code\.claude\agents\*.md`, `src\core\*.ts`, `test\*.ts`
- `review\index.md` · `review\round-12.md`

## Handoff

- Verdict: BE-003 PASS · BE-004 PASS · BE-005 PASS — ไม่มี blocking finding
- ใหม่: REV-033 (Minor → backlog — `system-analyst` pin field run-override ก่อน build BE-009/BE-011)
- ข้อเท็จจริงที่แก้: `agents/agentModel.ts` มีจริงที่ software-team-agents (handoff ว่าไม่มี — การตีความของ engineer ยังตรงต้นฉบับ)
- Next: driver → round 14 ตรวจ BE-020 + BE-007 ก่อนเข้า QA รวมเวฟ

## Change Log

- 2026-10-06 — Round 13 — BE-003/BE-004/BE-005 PASS · เพิ่ม REV-033 Minor → backlog · ยืนยันต้นฉบับ port ที่ software-team-agents

Back-links: `plan\index.md` · `..\index.md`
