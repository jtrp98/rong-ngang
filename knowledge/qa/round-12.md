# agent-team — QA Round 12 — BE-003 + BE-004 + BE-005

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ถูกแทนคงอยู่เป็นไฟล์ของตัวเอง verbatim (ไฟล์เก่า = archive) · live Open Issues / Unverified Behaviour ให้ current อยู่ในไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| REV-033 | BE-005 | Minor | → backlog — owner `system-analyst`: pin รูป field run-override ลง DES-005/data-model ก่อน build BE-009/BE-011 (ดู `..\review\round-13.md`) |

ไม่มี QA finding ใหม่ในรอบนี้ (id ถัดไป = qa:QA-005) · พฤติกรรมที่ review:REV-033 รายงานยืนยันซ้ำด้วยการรันจริงแล้วตรง: `runOverrideCamp: ""` → `CampResolutionError`, ไม่ส่ง field = ไม่ระบุ (`test\routing.test.ts:90-93` + live run)

## Round 12

**Status:** ✅ Verified

รอบนี้รันเช็คด้วยตัวเอง (มี shell — ต่างจาก review round 13 ที่ 99/99 เป็น evidence ของ driver) + รัน loader/tier/routing จริงด้วย `npx tsx` กับ config/pack จริง

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` (ที่ `code\agent-team\`) | pass — tests 99 · pass 99 · fail 0 · skipped 0 |
| smoke | `npm start` | pass — ปรินต์ skeleton message (entry stub SETUP-001 — โปรเจกต์ไม่มี script typecheck/lint/build ให้รัน) |
| live BE-003 | `npx tsx <tmp>\be003.ts` | pass — โหลด 12/12 role จาก pack จริง + fail-closed (ผลด้านล่าง) |
| live BE-004 | `npx tsx <tmp>\be004.ts` | pass — resolve จริง + AC-010 sandbox ใน tmp (ผลด้านล่าง) |
| live BE-005 | `npx tsx <tmp>\be005.ts` | pass — precedence 3 ชั้น + AC-004 sandbox (ผลด้านล่าง) |

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-003 | verified | live: `rolePromptRoot = code\.claude\agents` (derive จาก packRoot) · 12/12 role มี body>0 + tools>0 + hash `sha256:<64 hex>` + warnings=0 · reviewer ไม่มี Bash / backend-engineer มี (ตรง pack จริง) · `ghost-role` และ `../business-analyst` → `RolePromptError` ก่อน spawn · hash นิ่ง 2 loads · test 8 ชิ้น (`test\role-prompts.test.ts:29-132`) ครบ AC |
| BE-004 | verified | live: BE/claude = sonnet/medium T5 · SA/codex = gpt-6.1-sol/xhigh T2 · QA/agy = gemini-3.8-flash-medium effort null T3 — ตรงตาราง REQ-004 · task cast T2 → opus/high + diagnostic · T1 cast → `ModelPolicyResolutionError` ระบุเหตุผล (AC-009) · camp `opencode` → ปฏิเสธ (ไม่มี cell) · AC-010 sandbox: แก้ tiers.yaml ใน tmp sonnet/medium → opus/high ผลเปลี่ยน, resolution เดิมที่ถือไว้ freeze · test 8 ชิ้น (`test\tiers.test.ts:53-246`) ครบ AC |
| BE-005 | verified | live: routing.yaml จริง 12/12 role → claude basis `role-route` · ghost role → claude `default` · override → codex `run-override` · `"gemini"`/`""` → `CampResolutionError` · AC-004 sandbox: แก้ routing.yaml ย้าย backend-engineer ไป codex โดยไม่แก้โค้ด — reviewer ไม่กระทบ, selection เดิม freeze · test 5 ชิ้น (`test\routing.test.ts:48-127`) ครบ AC รวม validate ก่อนเริ่ม run ผ่าน config store (`ConfigError` ระบุไฟล์ — BE-001) |

### AC coverage (test ไฟล์จริงเทียบ Acceptance ของ task file)

- **BE-003:** โหลดครบ 12 จาก packRoot: `test\role-prompts.test.ts:29-48` · hash นิ่ง: `:47` · เปลี่ยนเมื่อไฟล์เปลี่ยน: `:50-59` · role หาย/root หาย/ว่าง/มีแต่ frontmatter/frontmatter ไม่ปิด → ก่อน spawn: `:61-88` · ไม่มี `tools:` → default + warning: `:90-104` · `model:`/`effort:` ไม่ใช้: `:106-111` · role แปลก/traversal/ชื่อไฟล์: `:113-123` · key ซ้ำ/CRLF: `:125-132`
- **BE-004:** precedence ครบ model/effort (default 3 camp / task cast / override แยก field — model ล้วน → effort runtime-default): `test\tiers.test.ts:53-125` · T1 ปฏิเสธพร้อมเหตุผล (task cast + role default + นอก T1–T6): `:127-150` · basis (AC-008): `:152-161` · แก้ tiers.yaml ผลเปลี่ยน + freeze (AC-010): `:163-186` · tier ไม่มี cell / role ไม่มี route-default: `:188-219` · effort null (antigravity ทุก tier + T6/claude): `:221-246`
- **BE-005:** precedence 3 ชั้น + basis ถูกชั้น (AC-005): `test\routing.test.ts:48-58` · routing.yaml จริงทุก role claude: `:60-65` · AC-004 sandbox: `:67-82` · camp ไม่รู้จัก (override/route/default/ขาด/ค่าว่าง): `:84-115` · validate ก่อนเริ่ม run: `:117-127`

### Data Model check

เทียบ `design\data-model.md` กับ code — ตรงทุก field ไม่มี divergence:

- `PacketV2.rolePrompt {source, hash}` (data-model.md:151) ↔ `RolePrompt.source` (path ไฟล์จริง) + `.hash` `sha256:<hex>` — `role-prompts.ts:26-33,119`
- `SessionRecord.rolePromptHash` (data-model.md:115) ↔ hash รูปเดียวกัน — จุดบันทึกเป็นของ BE-011 (field มีใน `state-store.ts:83` แล้ว)
- `SessionRecord.modelBasis/effortBasis` (data-model.md:114) ↔ `ModelPolicyValueBasis` string — `tiers.ts:12-17,125-127`
- `SessionRecord.camp/model/effort/tier` (data-model.md:113) ↔ `CampSelection.camp` + `{model, effort, effectiveTier}` — output 6 field ตรง DES-004 §Inputs/Outputs (`tiers.ts:21-28`)
- `basisReason` `run-override|role-route|default` ↔ `CampSelectionBasis` — `routing.ts:11`

### ผลรัน live (output จริง)

- BE-003: `RESULT: 12/12 roles have body/tools/sha256-hash, warnings=0` · `ghost role -> RolePromptError` · `traversal -> RolePromptError` · `hash stable across 2 loads: true`
- BE-004: `{"model":"sonnet","effort":"medium","effectiveTier":"T5","modelBasis":"role-default-tier:T5",...}` · `T1 task cast -> ModelPolicyResolutionError | tier T1 reserved — … ห้าม cast อัตโนมัติจาก task/plan (AC-009)` · sandbox `before: sonnet/medium → after: opus/high` · `held resolution frozen: true`
- BE-005: `all 12 roles -> claude/role-route: true` · `ghost role -> {"camp":"claude","basis":"default"}` · `unknown camp -> CampResolutionError` · sandbox `after BE: {"camp":"codex","basis":"role-route"}` · `held selection frozen: true`

Teardown: fixture อยู่ใน OS temp เท่านั้น · sandbox ชั่วคราวที่ `code\qa-r12-sbx5` (ตกจากสคริปต์ตรวจของ QA เอง — ไม่ใช่โค้ด task) ลบแล้วคืนสภาพ repo

## Unverified Behaviour — undeployed phases

- **Phase 3:** ผูกผล resolve เข้าการ spawn จริงยังไม่มีใน repo — BE-006 (แนบ `rolePrompt{source,hash}` + body ลง packet / `--append-system-prompt-file`), BE-011 (เรียก resolve ต่อ dispatch + บันทึก `SessionRecord.basisReason/modelBasis/effortBasis/rolePromptHash`), BE-012 (ส่ง effort flag เมื่อ effort ≠ null / ไม่ส่งเมื่อ null — กติกา 3) · รอบนี้ยืนยันเฉพาะชั้น loader/resolve + validate
- **DES-003** "hash บันทึกต่อ session / เปลี่ยนกลาง run บันทึกใหม่ต่อ stage" — พฤติกรรมของผู้เรียก (BE-011) ยังไม่รันจริง
- **DES-004** resume-freeze ผ่าน StageRecord บนดิสก์ — freeze ที่พิสูจน์คือค่าในหน่วยความจำที่ถือไว้; freeze บนดิสก์เป็นของ BE-007/BE-011 (BE-007 อยู่ review round 14)

## Issues Found (defect packet — 1 ข้อ = 1 QA-NNN)

ไม่มี — ไม่เปิด QA-005

## Change Log

- 2026-10-06 — Round 12 — BE-003/BE-004/BE-005 ✅ Verified · รันเช็คเอง (npm test 99/99 · live loader 12/12 + tier/routing resolve จริง + sandbox AC-004/AC-010) · sync Status `pending → verified` 3 แถวใน `plan\index.md` · ไม่มี QA finding ใหม่ · review:REV-033 Minor → backlog ยืนยันพฤติกรรมตรงแล้ว

Back-links: `plan\index.md` · `..\index.md` · `..\review\round-13.md`
