# agent-team — QA Round 20 — BE-013 + BE-014 (Camp adapter: codex / antigravity — phase 4)

> Budget ≤ 10 KB (`policies\documentation.md` §4) · เขียนโดย `qa-engineer` เท่านั้น · ไฟล์นี้ = 1 round · live Open Issues / Unverified Behaviour อยู่ไฟล์รอบล่าสุดเท่านั้น

## Open Issues

| ID | Task | Severity | สถานะ |
|---|---|---|---|
| — | — | — | ไม่มี QA finding เปิดใหม่รอบนี้ |

- review:REV-056 (Minor — `codexOutputMeta` nested pick) → backlog คงเดิม — ที่ `review\round-21.md` · แก้หลังยืนยันรูป JSONL จริงที่ qa:QA-001
- Waiting on Human #9 (qa:QA-010 — phase 3) ยังค้าง เจ้าของ jtrp98 — ไม่ใช่ของ BE-013/014 · ตาม `plan\index.md` แถว #9 งาน phase 4/5 build ต่อได้ (ไม่แตะในรอบนี้)

## Round 20

**Status:** ✅ Verified

### Checks run

| Check | Command | Result |
|---|---|---|
| test | `npm test` (tsx --test) | pass — **324/324** fail 0 (9.3 s) · นับ `test(` ต่อไฟล์: camp-codex **17** · camp-antigravity **18** (grep -c) |
| typecheck/lint/build | — | none — `package.json` มีแค่ start/test (เหมือนรอบก่อน) |
| probe argv/behaviour | `npx tsx -e` 6 ชุด (single line) | ดูตารางด้านล่าง — spawn ทั้งหมดผ่าน SpawnFn ปลอม ไม่มี CLI จริงถูกเรียก |
| wiring | `npx tsx -e` constructor จริง + grep | ดูหัว Wiring |

### BE-013 — CampAdapter codex (ตรง AC be-013.md:31 ทุกข้อ)

Probe จาก camps.yaml จริง (`loadAppConfig().camps.camps.codex` — ไม่ hardcode) ผ่าน `buildArgv`/`CodexAdapter`:

| ตรวจ | ผล | หลักฐาน |
|---|---|---|
| argv ตรง DES-002 ตามลำดับ | pass | probe ARGV = `codex exec --json --skip-git-repo-check --sandbox workspace-write --output-last-message <sessions/<sid>/last-message.txt> -C <cwd> -m <model> -c model_reasoning_effort=high --output-schema <path> "อ่านและทำตาม dispatch packet ที่ <packet.json>"` — positional ท้ายเสมอ (posLast=true) · test `camp-codex.test.ts:161` |
| `--output-schema` = **path** ไฟล์ (pin DES-002 2026-10-07) | pass | schemaIsPath=true — ค่า = path ไฟล์ schema ที่ driver เขียน (ไฟล์คงเต็มรวม `$schema` ราก) · ไม่มี JSON inline หลุด argv · test :168 |
| effort ผ่าน `-c` (effortVia) · null → ไม่ส่ง | pass | effortViaC=true (`-c model_reasoning_effort=high`) · effortNullNoEffortVia=true · test :197 |
| AC-033 ไม่มี resume/bypass | pass | noForbidden=true ครบ 5 ชื่อ (`--continue`/`--resume`/`resume`/bypass ×2) · test :189 + FORBIDDEN_ARGS `config.ts:41,560-562` |
| last-message → handoff ผ่าน validator | pass | dispatch จำลอง exit 0 + เขียน last-message.txt → outcome.handoffRaw = เนื้อไฟล์ (rawFromLastMessage=true) · `handoffSchemaProblems(JSON.parse(handoffRaw))` = **[]** · soField = null (ไม่มี envelope) · test :267 |
| JSONL meta | pass | sid=th-abc ver=0.160.0 จาก event (`session_id`/`version` ชั้นบน + ซ้อน `msg`) — รูป mark `inferred` ตาม `codex.ts:12-15` |
| timeout/kill/retry เหมือน BE-012 | pass | probe: spawn fail ซ้ำ (calls=2, retryOnCrash=1) → failure=spawn exit=null · kill → interrupted · timeout 1 s → timeout exit=null · test :319,:335,:352,:372,:386 (taskkill /T /F อยู่ใน npm test) |
| fail-closed ก่อน spawn | pass | extraDirs ส่งมา (codex ไม่มี extraDirsFlag) → CampAdapterError · packet หาย → CampAdapterError · spawnFn ไม่ถูกเรียก (spawned=0) · test :218 |
| packet เดียวกับ camp อื่น (AC-004) | pass | test :399 (ใน npm test) |

### BE-014 — CampAdapter antigravity (ตรง AC be-014.md:31 ทุกข้อ)

| ตรวจ | ผล | หลักฐาน |
|---|---|---|
| argv ตรง camps.yaml/DES-002 | pass | probe ARGV = `agy -p --output-format json --sandbox --model gemini-3-pro --effort high --json-schema <path> --add-dir C:/k --add-dir C:/c --log-file <sessions/<sid>/session.log> "อ่านและทำตาม dispatch packet ที่ <packet.json>"` — positional ท้าย · test :162,:179 |
| logFlag เฉพาะ camp นี้ | pass | logFlagOnlyAgy: agy="--log-file" · codex=undefined · claude=undefined · test :162,:171 |
| effort null → ไม่ปรากฏใน argv | pass | effortNullNoFlag=true (กติกา 3 — DES-004) · มีค่า → `--effort high` (effortHigh=true, test :198) |
| `--json-schema` = path + ไม่มี envelope | pass | schemaIsPath=true · dispatch: sid=null ver=null soField=null ตามจริง ไม่เดา (DES-002 "agy ไม่ทราบ → null") · handoffRaw = stdout ผ่าน `handoffSchemaProblems` = [] · สมมติฐานจด mark ชัดที่ `antigravity.ts:33-41` ตรง pin DES-002 — ยืนยันจริงที่ QA-001 ตาม Risk `be-014.md:39` |
| AC-033 ไม่มี resume/bypass | pass | noForbidden=true · test :216 |
| log ต่อ session | pass | --log-file = `sessions/<sid>/session.log` (logFileValue=true) · test :224 |
| timeout/spawn fail เหมือน BE-012 | pass | ฐานร่วม `base.ts` เดียวกับ codex (probe kill/timeout/retry ผ่านบน codex — กลไกเดียวกัน) · test :307,:323,:340,:360,:374 |
| fail-closed ก่อน spawn | pass | schema path ไม่มีจริง → CampAdapterError · packet หาย → CampAdapterError · spawned=0 · test :242 |
| packet เดียวกัน (AC-004) | pass | test :387 |

### Wiring — REV-055 resolved (ยืนยันจากโค้ดจริง)

- register จุดเดียว `src/main.ts:94-100`: claude/codex/antigravity ด้วย constructor รูปเดียวกัน `(config.camps.camps.<camp>, { retryOnCrash: config.camps.defaults.retryOnCrash })` · comment `main.ts:92-93` ตรงจริง ("R1 มี 3 camp…" + "รูป handoff ของ agy ยัง mark สมมติฐาน — รอยืนยันที่ QA-001")
- probe constructor จริง: keys = **claude,codex,antigravity** · ทุกตัว `camp` ตรง key (`claude`/`codex`/`antigravity`, command claude/codex/agy) · `campAdapterProblems()` = **[] ทั้งสาม** (exit 0)
- grep "มี camp เดียว" ใน src\ = **0 hits** (comment เท็จเดิมหาย) · `KNOWN_CAMPS` = 3 camp (`config.ts:24`) · camps.yaml ประกาศครบ (`camps.yaml:5,15,25`) — flow phase 4 (ย้าย role ไป codex/agy) เดินได้

### perTask

| Task | Result | หลักฐาน |
|---|---|---|
| BE-013 | verified | ตาราง BE-013 ครบ · npm test 324/324 (17 test ของไฟล์) · review round 21/22 PASS |
| BE-014 | verified | ตาราง BE-014 ครบ · npm test 324/324 (18 test ของไฟล์) · review round 21/22 PASS |

### Status เขียนลง plan

- `plan\index.md` แถว BE-013: `pending → verified` · แถว BE-014: `pending → verified` — เฉพาะ 2 cell นี้ (Waiting on Human #9 ไม่แตะ)

## Unverified Behaviour — ของ Feature QA phase 4 (round ถัดไป)

- **spawn CLI จริงไม่เคยถูกเรียก** — ทุก evidence รอบนี้ใช้ SpawnFn ปลอม (ตามหลัก test ของ repo): `codex` 0.160.0 จริงและ `agy` 1.2.16 จริงยังไม่เคยถูก spawn ผ่าน adapter — ของ Feature QA phase 4 (`plan\index.md:32,91` — ย้าย role ไป codex/agy ใน routing.yaml แล้วรัน session จริง)
- รูป JSONL ของ codex (session_id/version) mark `inferred` (REV-056 ค้าง) · รูปค่า `--json-schema` ของ agy (path) + ไม่มี envelope mark `สมมติฐาน` — ยืนยันจริงที่ qa:QA-001 (phase 6) แล้วแก้ที่เดียวใน adapter
- `taskkill /PID <pid> /T /F` กับ process tree จริงบน Windows mark `inferred` (`base.ts:271`) — ตรวจต่อเมื่อมี session จริง

## Handoff

- **Verdict:** BE-013 ✅ · BE-014 ✅ — ตรง AC ครบ, argv จาก camps.yaml จริงตรง DES-002 ทั้งสอง camp, สมมติฐานจด mark ครบ, fail-closed ก่อน spawn, wiring REV-055 resolved ยืนยันแล้ว · ไม่มี finding ใหม่ · Blockers: ไม่มี
- **ต่อไป (driver):** phase 4 verified ครบ 2/2 → **Feature QA phase 4** (flow QA — ย้าย role ไป codex/agy ใน routing.yaml, spawn CLI จริง) · phase 5 (BE-010 → BE-015) เดินต่อได้ · Waiting on Human #9 (QA-010/phase 3) ยังรอเจ้าของ — ไม่ขวาง phase 4/5

## Change Log

- 2026-10-07 — Round 20 — BE-013 + BE-014 ✅ Verified · sync Status 2 แถว `pending → verified` — phase 4 verified ครบ 2/2 · ไม่มี QA finding ใหม่ · REV-055 (wiring) ยืนยัน resolved จากโค้ดจริง

Back-links: `plan\index.md` · `..\index.md`
