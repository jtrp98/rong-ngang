# agent-team — Review Round 17 — BE-012, BE-019, BE-021

> Budget ≤ 10 KB · เขียนโดย `reviewer` เท่านั้น · ไฟล์นี้ = 1 round · รอบที่ปิดแล้วคงอยู่เป็นไฟล์ของตัวเอง verbatim

## Findings

### REV-042

- **Severity:** Minor
- **Task:** BE-019
- **Location:** `src/core/router.ts:773`
- **Problem:** `handleCrash` เดา kind เมื่อ event ไม่ส่ง `sessionKind` — default `"execution"` ทั้งที่ฝั่ง handoff มี `deriveSessionKind` ให้แล้ว · session review/qa ที่ล่มโดย driver ลืมส่ง `sessionKind/sessionRole` จะถูก re-dispatch เป็น execution ของ owner (R16 ผิด kind) · กันไว้ได้ที่ router เอง (derive จาก handoff/role หรือ R15) — hardening เกิน AC
- **Reference:** DES-018 R16 · AC-075 (driver contract — BE-011 ต้องส่งจาก SessionRecord)

### REV-043

- **Severity:** Minor
- **Task:** BE-019
- **Location:** `src/core/router.ts:632` (รูปเดียวกันที่ `:654`)
- **Problem:** `review.perTask` / `qa.perTask` ที่อ้าง task id ที่ไม่มีใน module ถูกข้ามเงียบ ๆ (`if (!t …) continue`) — FAIL โดนตรวจ §Severity จับ (→ R15) แต่ PASS ของ task แหล่งอื่นผ่านไปเงียบ · ควรนับเป็น R15 (handoff ขัดกันเอง) — hardening เกิน AC
- **Reference:** DES-018 R15 · AC-068

## Open Findings

| ID | Severity | path:line | Owner | Status (open/resolved/→ backlog) |
|---|---|---|---|---|
| REV-042 | Minor | `src/core/router.ts:773` | backend-engineer | → backlog |
| REV-043 | Minor | `src/core/router.ts:632` | backend-engineer | → backlog |

## Round 17

**Verdict:** PASS

| Task | Verdict |
|---|---|
| BE-012 | PASS |
| BE-019 | PASS |
| BE-021 | PASS |

> ไม่มี Critical/Important · Minor ทั้งสอง → backlog ตาม finish rules

**ตีความของ engineer — ตัดสินแล้ว (รวมตามกลุ่ม):**

- **BE-012 ทั้ง 5 จุด ตรง design:** (1) บรีฟ stdin ตรงตัว DES-002 (`base.ts:74-78`, test `camp-claude.test.ts:211`) (2) `cliVersion` จาก stdout field `version` + mark `inferred` ขาด → null ไม่เดา (`claude.ts:25-41`) (3) `retryOnCrash` ทาง opts ไม่แตะ contract camp-adapter.ts (BE-006 คงเดิม) — caller อ่าน camps.yaml (4) timeout/interrupt → `handoffRaw: null` ผลจาก kill ไม่ใช้เป็น handoff (fail-closed — `base.ts:248-255`) (5) fail-closed เช็ค packet/rolePrompt/schema มีจริงก่อน spawn (`base.ts:82-90`) — เพิ่มจาก design แต่สอด philosophy fail-closed ยอมรับ · argv ไม่ผ่าน shell (`base.ts:265-267`), FORBIDDEN_ARGS สองชั้น (config.ts:41,560 + test AC-033), `Edit(<claim>)/Write(<claim>)` + test-planner `--disallowedTools Bash` ตรง DES-021/AC-060, camps.yaml จริง = DES-002/data-model ทุก flag · ไม่แตะ REQ-009/camps.yaml
- **BE-019 ทั้ง 6 จุด ตรง design:** field เสริม RouterEvent/Decision/RouterTask เป็น additive จาก sketch (counters/phaseHolds/phaseCleared/log จำเป็นต่อ R4/R16/R20/R19/21 + Scope คืน log line) · sessionKind derive มี event มาก่อน (`router.ts:115-127`) · GATE_RECORD_ROLE map 7 gate = ตีความ DES-008 OQ-D3 แจ้งไว้ใน comment · BA DONE nextRole none → ปลด chain / งานใหม่นอก chain → R15 fallback ตรง "event ไม่ตรงแถวใด" · R7 เด่นกว่า R4, R21 FAIL Minor-only → cleared (§Severity Minor → backlog), R8 ข้าม anchor (`router.ts:333`) · gate ของระบบ `owner: null` ให้ driver เติม owner_default · test ครบ 24 แถว (36 test) + AC-069 deepEqual + AC-073 + AC-067 + วงจร fixRounds ตัวเดียว 3 event
- **BE-021 ทั้ง 5 จุด ตรง design:** ปิด wave ก่อนล้นเพดาน (`batching.ts:83` — AC-051 "จนเกิน" ตีเป็นปิดก่อนเกิน ถูก: wave ล้นเพดานผิด design เอง) · solo เดี่ยวเกินเพดาน wave = แยก session mark `solo` (ข้อ 2 ครอบ — ทางเดียวที่ไม่ pack ล้น) · wave เต็ม = ครบเพดานพอดี + solo (`:99-100`) + quiesce flag ต่อ qa (`:128`) · defect packet fields verbatim data-model + `roundFile` เป็น metadata ไม่แนบเนื้อหา (pin REV-034 — `:280`) · `diffPath` จาก execution ล่าสุด + `testFiles` พารามิเตอร์ของ driver (`:224-234`) · security เปิดโดย R19 เท่านั้น + 🔒 3 แหล่ง + ตัด FORBIDDEN_OWNERS/plan-error (`:188-198`) — AC-080/079 · ขาด: ไม่พบ — readSections union TP+REQ/AC (pin REV-035) อยู่ที่ context-loader.ts:261,567-569 (BE-020) ถูกชั้นถูก task

**Evidence (จาก driver — ไม่ใช่การรันของ reviewer):** `npm test` 239/239 ผ่านสะสม (BE-012 +16, BE-019 +36, BE-021 +18 — นับจำนวน test() ในไฟล์จริงตรง) · argv จาก camps.yaml จริง (test โหลด `loadAppConfig()`) · regression R18 Depends ของ anchor บน plan จริง phase 6/7 (`router.test.ts:589-616`)

## Reviewed

- `plan\be-012.md` · `plan\be-019.md` · `plan\be-021.md`
- `design\des-002.md` · `des-006.md` · `des-007.md` · `des-018.md` · `des-019.md` · `design\data-model.md` (§camps.yaml, §run.json/TaskRuntime/SessionRecord, §PacketV2/HandoffV2)
- `config\camps.yaml` (จริง)
- `src\camps\base.ts` · `src\camps\claude.ts` · `test\camp-claude.test.ts`
- `src\core\router.ts` · `test\router.test.ts`
- `src\core\batching.ts` · `test\batching.test.ts`
- อ้างอิง cross-check: `src\core\contract\camp-adapter.ts`, `contract\types.ts:56-80`, `contract\schema.ts`, `contract\validate.ts`, `core\config.ts` (FORBIDDEN_ARGS/CampProfile), `state-store.ts` (Step/Severity/newSessionId), `plan-parser.ts` (ROLES/FORBIDDEN_OWNERS), `context-loader.ts:560-589` (feature-qa union)

## Change Log

- 2026-10-06 — Round 17 — PASS ทั้งสาม task · เพิ่ม REV-042/043 Minor → backlog

Back-links: `plan\index.md` · `..\index.md`
