# agent-team — Review Round 16 — BE-008 (fix round 1)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · open findings ที่ยังไม่จบอยู่ในไฟล์รอบล่าสุดเท่านั้น

ตรวจ follow-up ณ 2026-10-06 — เฉพาะการแก้ REV-039 (Important) + REV-037/038 (Minor) ของ backend-engineer ใน fix round 1 ของ BE-008 · REV-040 คงของ system-analyst (contract gap — ไม่ตรวจรอบนี้) · อ่านไฟล์ที่แก้ครบทั้งไฟล์ ณ artifact จริง · `npm test` 145/145 = evidence จาก driver (นับ test() ในไฟล์จริง: contract.test.ts 22→23, session-audit.test.ts 18→20 — 142+3 = 145 ตรง) · ไม่อ่าน `qa\`/`security.md` — stay independent

## Findings (ตรวจการแก้ — อ่าน fix ก่อนปิดทุกตัว)

### REV-039 — resolved

- **Severity:** Important (blocking) — ปิดแล้ว
- **Task:** BE-008
- **Location:** `code\agent-team\src\core\session-audit.ts:713` (กิ่ง fallback ใน buildDiff)
- **หลักฐาน fix ตรง DES-021 ข้อ 6 (pin ตรงตัว "git diff HEAD --numstat -- <file> + diffApprox: true — นับเกิน = ปลอดภัย"):**
  - `diffApprox: true` ตั้งระดับกิ่งก่อนแตก sub-path (`:713`) — ครอบทั้ง untracked / `git diff HEAD` สำเร็จ/ว่าง/ล้ม · กิ่ง fallback ที่เหลือผ่าน `pushApprox` (`:701`, `:736`) และกิ่งไฟล์ถูกลบ (`:707`) — ทุกกิ่ง "ไม่มี pre-image" ตั้ง flag หมด
  - ไฟล์ใหม่ untracked ไม่หายเงียบ: `untrackedOf` ถาม `git ls-files --others --exclude-standard` lazy ต่อ repoTop ด้วย argv array ไม่มี shell (`:667-679`, call `:672`) · numstat สังเคราะห์ added = ทุกบรรทัด, deleted = 0 + `# approx` กำกับ (`untrackedNumstat :681-690` · กิ่ง `:715-724`) — ขนาดไม่ต่ำกว่าจริง
  - `git diff HEAD` (`:726`) ว่าง → `# approx` (`:729`) · ล้มเหลว → `# approx` (`:732`) — approx ไม่หายเงียบ
  - test ใหม่ 2: `test\session-audit.test.ts:423-450` (pre-image เกินเพดาน → diffApprox: true แม้ diff HEAD สำเร็จ + numstat ยังปรากฏ) · `:452-478` (untracked นับ `2\t0` + `# approx`) — ปิดช่อง "กิ่งไม่มี test"
- **Reference:** DES-021 ข้อ 6 · data-model writeAudit.diffApprox

### REV-037 — resolved

- **Severity:** Minor
- **Task:** BE-006
- **Location:** `code\agent-team\src\core\contract\schema.ts:4-6` · `test\contract.test.ts:265`
- **หลักฐาน:** header comment แก้เป็นชุดจริง `type/enum/const/pattern/minLength/anyOf/properties/required/additionalProperties/items/minItems` (+ `$schema/title` metadata · nullable = type array) และชี้แหล่ง lock ที่ SCHEMA_KEYWORDS — ตรง SCHEMA_KEYWORDS ใน test (`:265`) และตรง keyword ที่ schema.ts ใช้จริงทั้งไฟล์ (อ่านครบ — ไม่มี keyword นอกชุด)
- **Reference:** DES-012 §Data/schema

### REV-038 — resolved

- **Severity:** Minor
- **Task:** BE-006
- **Location:** `code\agent-team\src\core\contract\validate.ts:315-317` · `schema.ts:218`
- **หลักฐาน:** handoffSchemaProblems บังคับ `module` เป็น string ไม่ว่าง (trim) เสมอ — ตรง STRING_MIN ของ schema (`schema.ts:218`) ไม่ว่า CLI จะ enforce schema หรือไม่ (schemaEnforcedByCli = false ก็ติด) · why-comment ระบุเหตุ (2 ชั้น — DES-012) · test ใหม่ `test\contract.test.ts:452-460`: `""`/`"   "` ติดทั้ง handoffSchemaProblems และ handoffProblems · ค่าปกติไม่ติด
- **Reference:** DES-012 (ตรวจ 2 ชั้น) · data-model HandoffV2.module

### REV-041 (ใหม่)

- **Severity:** Minor → backlog
- **Task:** BE-008
- **Location:** `code\agent-team\src\core\session-audit.ts:688`
- **Problem:** untrackedNumstat นับ "added" ด้วยจำนวนบรรทัด (utf8 + split "\n") — ไฟล์ untracked แบบ binary ("\n" น้อย) นับต่ำกว่าขนาดจริงได้ ขัดแนว "ไม่ต่ำกว่าจริง" ที่ fix นี้ตั้งใจ (git numstat เองรายงาน `-` สำหรับ binary) · pipeline นี้ agent เขียน text เป็นหลัก — hardening ไม่ break AC · ผู้ต้องแก้: backend-engineer (รายงาน `-` เหมือน git หรือนับ byte)
- **Reference:** DES-021 ข้อ 6 (นับเกิน = ปลอดภัย)

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
| REV-034 | Minor | `src/core/context-loader.ts:523` · `design\des-019.md:20` | system-analyst | → backlog |
| REV-035 | Minor | `src/core/context-loader.ts:255` · `design\des-019.md:21` | system-analyst | → backlog |
| REV-036 | Minor | `src/core/context-loader.ts:234` · `design\des-020.md:22-35` | system-analyst | → backlog |
| REV-037 | Minor | `src/core/contract/schema.ts:4-6` | backend-engineer | resolved (round 16) |
| REV-038 | Minor | `src/core/contract/validate.ts:317` | backend-engineer | resolved (round 16) |
| REV-039 | Important | `src/core/session-audit.ts:713` | backend-engineer | resolved (round 16) |
| REV-040 | Minor | `src/core/session-audit.ts:640-643` · `design\des-007.md` | system-analyst | → backlog |
| REV-041 | Minor | `src/core/session-audit.ts:688` | backend-engineer | → backlog |

## Round 16

**Verdict:** PASS

| Task | Verdict |
|---|---|
| BE-006 | PASS (คงเดิม — REV-037/038 resolved) |
| BE-008 | PASS (หลัง fix round 1 — REV-039 resolved) |

**ตรวจว่า fix ไม่ทำ AC เดิมของ BE-006/BE-008 เสีย (อ่านจุดที่เกี่ยว):**
- กฎ (1)–(7) ไม่ถูกแตะ (`validate.ts:480-573`) — fix REV-038 เพิ่มเงื่อนไขชั้น schema เท่านั้น · schema.ts แก้เฉพาะ comment ไม่เปลี่ยนรูป schema (test required/properties ยัง pin ครบ — `contract.test.ts:283-297`)
- attribution 5 ขั้น + status-write ไม่ถูกแตะ (`session-audit.ts:546-568`, `:593-647`) · buildDiff คืนรูปเดิม `{diffApprox, lines}` (`:572`, `:580`) · fail-closed ลบแถว plan (REV-040) คงอยู่ (`:642-645`)
- git ทั้งหมดยัง read-only argv array ไม่มี shell — รวมกิ่งใหม่ทั้งหมด (`:672`, `:726`)
- header comment อัปเดตตรงพฤติกรรมใหม่ (`:17-20`, `:649-660`) — why-comment ไม่ค้างเก่า
- นับ test() ในไฟล์จริง: contract.test.ts 23 (+1) · session-audit.test.ts 20 (+2) — ตรง evidence 145/145 ของ driver

ไม่ได้ review: รัน `npm test` เอง (evidence ของ driver) · REV-040 (system-analyst — ไม่ตรวจรอบนี้) · `qa\`/`security.md`

## Reviewed

- `design\des-021.md` (ข้อ 6)
- `code\agent-team\src\core\session-audit.ts` (ครบ) · `src\core\contract\schema.ts` (ครบ) · `src\core\contract\validate.ts` (ครบ)
- `code\agent-team\test\session-audit.test.ts` (ครบ) · `test\contract.test.ts` (ครบ)
- `review\round-15.md` · `review\index.md` · `code\.claude\agents\reviewer.md` · `code\templates\review-round.md`

## Handoff

- REV-037/038/039: **resolved ทั้งสาม** — fix ตรง design/fail-closed ครบ ไม่มีเงื่อนไขค้าง (หลักฐาน file:line ในหัวข้อ Findings)
- Findings ใหม่: REV-041 (Minor → backlog — backend-engineer: untracked binary นับบรรทัดต่ำกว่าจริงได้) · REV-040 คง → backlog (system-analyst pin ก่อนเวฟ PM replan)
- Blockers: ไม่มี · **Next:** driver ส่ง BE-006 + BE-008 เข้า qa-engineer (phase 3)

## Change Log

- 2026-10-06 — Round 16 — BE-006 คง PASS · BE-008 PASS (หลัง fix round 1) — REV-037/038/039 resolved · เพิ่ม REV-041 (Minor → backlog)

Back-links: `plan\index.md` · `..\index.md`
