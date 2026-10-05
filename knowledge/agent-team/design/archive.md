# agent-team — Design Archive

> ไฟล์นี้เก็บคำถาม/คำตอบ (Q&A) ที่ปิดแล้วจาก `design.md` แบบ verbatim (ย้ายมาเก็บตามกติกา size budget — `policies/documentation.md` §4) พร้อมบรรทัด คำตอบ/วันที่/ผู้ยืนยัน ต่อท้ายแต่ละข้อ · เขียนโดย `system-analyst` เท่านั้น

## Closed Open Questions — ย้ายจาก design.md §Unresolved Open Questions (ปิดครบ 2026-10-04)

| ID | คำถาม (ถ้อยคำตรงตัว) | ผู้ตอบ | Blocking? |
|---|---|---|---|
| OQ-D1 | Layout เอกสารของโปรเจกต์นี้ยืนยันเป็น flat `knowledge\<module>\` (ตามที่ `knowledge\agent-team\` มีอยู่จริง) ไม่ใช่ `knowledge\module\<name>\` ตาม `policies\documentation.md:5` — ใช่ไหม | ผู้ใช้ | ต่ำ — มี default ตามของจริงใน registry.yaml แก้ได้ทีหลัง |
| OQ-D2 | ชุด writePaths ต่อ role ตั้งต้นใน routing.yaml (ตารางใน DES-006) ยืนยันก่อน dispatch จริงครั้งแรก — ถูกต้องครบทั้ง 12 role หรือไม่ | ผู้ใช้ | ใช่ — ก่อน dispatch จริงครั้งแรก |
| OQ-D3 | เมื่อ gate ถูกตอบ ระบบจะ dispatch "record-only" ไปยัง role เจ้าของเอกสารเพื่อบันทึก who/when ลงเอกสาร (+1 agent run ต่อ gate) — ยอมรับต้นทุนนี้ไหม หรือให้บันทึกเฉพาะ run state | ผู้ใช้ | ต่ำ — default: ยอมรับ (ตามกติกา `sta2\CLAUDE.md:71-72`) |
| OQ-D4 | ควร `git init` ที่ `C:\src\AICode\rong-ngang\` เพื่อให้ write audit อิง diff ของ git แทน manifest (แข็งแรงกว่า) — ทำไหม | ผู้ใช้ | ต่ำ — manifest ใช้ได้โดยไม่ต้องมี git |
| OQ-D5 | ชื่อ owner ใน gates.yaml (ผู้ตอบทุก gate ของ release นี้) จะใช้ชื่อ/รูปแบบใดให้บันทึกลง audit ได้ตรงตัว | ผู้ใช้ | ใช่ — ก่อน gate แรกที่ต้องตอบ |

**คำตอบ (ปิด 2026-10-04 — เจ้าของโปรเจกต์สั่ง "ปิด oq ก่อน" โดย BA บันทึกค่า default; ผู้ใช้ยังแก้กลับได้ที่จุดที่ระบุในแต่ละข้อ):**

- **OQ-D1 — คำตอบ:** flat `knowledge\<module>\` — ยืนยัน default ตามของจริง; คง `docsLayout: flat` ใน registry.yaml · หมายเหตุ: sta2 `policies\documentation.md:5` จะต้องแก้ตาม (เป็น policy alignment task ไม่ใช่ design blocker)
- **OQ-D2 — คำตอบ:** ยืนยันตาราง writePaths ใน DES-006 เป็นชุดตั้งต้น (แก้ภายหลังได้ที่ routing.yaml)
- **OQ-D3 — คำตอบ:** ยอมรับ (default) — record-only dispatch ต่อ gate ได้รับการยอมรับ · หมายเหตุ: ใน solo mode การบันทึก who/when ทำโดย session เองในขั้นตอนถัดไป (ไม่มี run เพิ่ม)
- **OQ-D4 — คำตอบ:** git init ที่ rong-ngang — **ใช่** แต่ init โดย **setup role ตอนขั้นตั้งโปรเจกต์** (task แรกของงาน build) ไม่ใช่ orchestrator/agent ทำระหว่าง pipeline (กติกา no state-changing git ของ sta2 ยังผูก) → DES-006 ชั้น 3 (write audit): หลัง git init แล้วใช้ **git เป็นหลัก** (status/diff ระบุไฟล์ที่เปลี่ยนแม่นกว่า mtime) โดย manifest (size/mtime) เป็น fallback เมื่อ repo ไม่มี/เสีย; ยังจับไม่ได้ระดับ cell — คงข้อจำกัดเดิม
- **OQ-D5 — คำตอบ:** ชื่อ owner คือ `jabja` — ค่าตั้งต้นใน gates.yaml (แก้ได้ที่ config)

**Superseded:**

- **2026-10-05 — OQ-D1 superseded โดย DES-014:** `docsLayout` เปลี่ยนเป็น **`split`** (โครงเอกสารแบบ index + ไฟล์ย่อย) — ยืนยันโดยเจ้าของ 2026-10-05; คำตอบเดิม (flat) คงอยู่ด้านบนเป็นประวัติ ค่า default ใน registry.yaml แก้แล้วตาม DES-011/014

**วันที่:** 2026-10-04 (ทุกข้อ) · **ผู้ยืนยัน:** เจ้าของโปรเจกต์ (สั่งปิด OQ — BA บันทึกค่า default ตามคำสั่ง; ผู้ใช้ยังแก้กลับได้)

## Superseded 2026-10-05 — draft `git: {remote}` และข้อความก่อน amend ตาม REQ-009 (verbatim)

> ย้ายในรอบ amend เดียวกับ design Rev 9 (`policies\documentation.md` §4) · draft `git: {remote}` (SA draft หยุดกลางคัน — ไม่เคยเป็น requirement) ถูกตัดโดยคำตอบเจ้าของ OQ-9 (4) "ตัดทิ้ง ใช้สวิตช์อย่างเดียว" → REQ-009 AC-032 · ด้านล่างคัดลอกตรงตัวจากไฟล์ก่อนแก้ (อยู่ใน fence เพื่อไม่ให้หัวข้อชนโครงไฟล์นี้) · กฎปัจจุบัน: DES-015 (`gituse`), DES-016, DES-006, DES-009, DES-012, DES-013, `data-model.md`

### des-015.md — ทั้งไฟล์ก่อนแก้

````text
## DES-015 — sta-config.json (machine-local registry)

**Traces:** REQ-001 (AC-001, AC-002), REQ-002 (AC-004 — codeRoots ของ run มาจาก target), DES-011

**Rule:** registry ผูก deployment กับ knowledge/target จริงของเครื่องนี้ เก็บที่ `code\sta-config.json` — **machine-local, gitignored ไม่ commit** (ยืนยันโดยเจ้าของ 2026-10-05) · schema (sample ตรงตัว — ดู §Data Model):

```json
{
  "main_root": "c:/src",
  "knowledge_roots": [
    { "name": "knowledge",
      "path": "c:/src/knowledge",
      "git": { "remote": "https://github.com/org/knowledge.git" },
      "targets": [ { "name": "target1", "path": "c:/src/knowledge/target1",
                     "git": { "remote": "https://github.com/org/target1.git" } } ] }
  ]
}
```

- **`git` (optional ทั้ง `knowledge_roots[]` และ `targets[]` — 2026-10-05):** `{ remote: string } | null` · ไม่มี field = `null` → audit root นั้นใช้ manifest (DES-006) · `remote` = origin URL ที่ประกาศ (https หรือ ssh `git@host:owner/repo.git`) · **ไม่มี field `branch`** — branch = branch ปัจจุบันของ repo, ไม่ประกาศ ไม่ validate; อ่าน read-only `git -C <path> branch --show-current` เพื่อแสดงบน UI/บันทึกใน audit (detached HEAD → ค่าว่าง ไม่ใช่ error) · knowledge กับ target อยู่ repo เดียวกันได้ (`remote` ซ้ำได้)
- **validate `git` (fail-closed ก่อน dispatch):** (1) `remote` ไม่ว่าง และ**ห้ามมี userinfo/credential** (`https://user[:token]@host/...`); (2) `git -C <path> rev-parse --show-toplevel` สำเร็จ; (3) `git -C <path> remote get-url origin` ตรง `remote` หลัง normalize (ตัด `.git`/`/` ท้าย, host เป็นตัวเล็ก) · ไม่ผ่านข้อใด หรือไม่มี `git` executable ทั้งที่ประกาศ `git` → ปฏิเสธ run พร้อม knowledge/target + path + ค่าคาด/ค่าพบ (ไม่ถอยไป manifest เงียบ ๆ)
- **ผลต่อ orchestrator:** git **อ่านอย่างเดียว** (`rev-parse`, `remote get-url`, `branch --show-current`, `status`, `diff`) — ห้าม `init`/`clone`/`fetch`/`pull`/`checkout`/`commit` · ใช้ 2 ที่: แสดงบน UI (DES-009) และเลือกโหมด audit ต่อ root (DES-006)

- **target = โปรเจกต์โค้ดจริง** ที่ knowledge root นั้นดูแล — codeRoots ของ run = path ของ target ที่เลือก (REQ-002 AC-004); รองรับ n knowledge × n target
- **ลำดับเลือกงานต่อ run: knowledge → target → module** (Web UI REQ-001 กรณีที่ 1 เดินตามลำดับนี้ — DES-009; docsRoot = knowledge root ที่เลือก — DES-011)
- **ผู้เขียนรายการ:** setup prompt (onboarding knowledge ใหม่ phase 1 — รันจากที่ติดตั้ง ชี้ path knowledge → ตรวจ/สร้างโครงตาม DES-014 → เพิ่มรายการ; เติม `git.remote` จาก `git -C <path> remote get-url origin` แบบ read-only ถ้า path อยู่ใน repo — ไม่ใช่ repo → ไม่ใส่ field; ไม่ clone/init) หรือคนแก้มือ — orchestrator/agent **อ่านอย่างเดียว** (deny ใน DES-006)
- **fail-closed:** path ใดใน config ไม่มีจริงบนดิสก์ → ปฏิเสธ run ก่อน dispatch (ไม่เดา path)

**Inputs/Outputs:** Input: driver อ่านตอนเริ่ม run และตอน UI ขอรายการเลือก (DES-009 `GET /api/config`). Output: docsRoot (knowledge root ที่เลือก) + codeRoots (target ที่เลือก) + `selectedTarget` ใน packet (DES-012) + โหมด audit ต่อ root (`git` | `manifest` — DES-006) + ข้อมูล `git` ที่ตรวจแล้วให้ UI (DES-009)

**Permissions/States/Errors:** รายการ knowledge/target ว่าง → UI แสดงข้อความให้รัน setup prompt; path ที่เลือกไม่มีจริง → ปฏิเสธ run พร้อมรายงาน path (fail visibly — DES-001) · **Compatibility:** additive ต่อระบบ แต่**แทน `docsRoot`/`codeRoots` ใน registry.yaml sample เดิม — breaking กับ sample เจ้าของยืนยันแล้ว 2026-10-05**; registry.yaml เหลือเฉพาะ product settings (§Data Model) · `git` **additive/optional — ไม่ breaking** (config ไม่มี `git` ยัง valid) · **Data/schema · Migration:** schema ตามด้านบน เพิ่มรายการได้โดยไม่แก้โค้ด; ไม่มี migration (ไฟล์เดียวต่อเครื่อง; เติม `git` ด้วยมือหรือรัน setup prompt ซ้ำ) · **Security:** path local ล้วน — **ไม่มี secret/token** (validator ปฏิเสธ URL ที่มี credential — ไม่เก็บ token และไม่ส่งออก `GET /api/config`); gitignored; เข้าถึงผ่าน local API เท่านั้น (DES-009) · abuse: แก้ `remote` ชี้ repo อื่น → ตรวจกับ origin จริงทุก run

**Fallback:** config หาย/corrupt → ปฏิเสธ run และแนะให้รัน setup prompt สร้างใหม่ (fail-closed — ระบบไม่ hard-code path แทน)

**Evidence:** ข้อความเจ้าของ 2026-10-05: "n knowledge, n target" (เลือก knowledge → target → module) · "sta-config.json เก็บใน local ของเครื่อง อยู่ใน rong-ngang" · pack ย้ายเข้า `code\` แล้ว (DES-003) · **`git`:** คำสั่งเจ้าของ 2026-10-05 "เพิ่ม `git` เข้าไปใน `knowledge` และ `target` ของ sta-config" + คำตอบเจ้าของ 2026-10-05: object `{remote}` — แก้เพิ่มวันเดียวกัน: ตัด `branch` ออก ใช้ branch ปัจจุบันของ repo · แสดง UI + ตรวจ origin + audit เลือกโหมดต่อ root (ไม่ clone) · optional · origin ไม่ตรง → ปฏิเสธ run · ตรวจ 2026-10-05: `code\sta-config.json:1-12` มี 1 knowledge + 1 target ยังไม่มี `git`; `rong-ngang\.git\HEAD:1` = `refs/heads/main`, `.git\config:8-11` origin `https://github.com/jtrp98/rong-ngang.git` (knowledge + target repo เดียวกัน)
````

### des-006.md — บรรทัดที่ถูกแทน (5, 7, แถว setup, universal deny, Fallback/Permissions, Evidence)

````text
**Rule:** บังคับ "เขียนได้เฉพาะที่ role เป็นเจ้าของ" (`sta2\CLAUDE.md:19-34` Roles table, `CLAUDE.md:86` hard rule) ด้วย 3 ชั้น — port แนวคิด 3 layers จาก `pathPermissions.ts:19-48` แต่เลือกชั้นที่ทำได้จริงบนเครื่องนี้ (ไม่พึ่ง hook ต่อ camp; git มาเป็นหลักของชั้น 3 หลัง setup role init — ด้านล่าง): ชั้น 1 — ประกาศใน packet: `writeScope.allow/deny` + ประโยคบังคับในบรีฟ (ทุก camp); ชั้น 2 — CLI-native เท่าที่มี: claude = `--permission-prompts none` + `--allowedTools/--disallowedTools` (path-rule เช่น `Edit(<allow glob>)` — mark `inferred`: ไม่ปรากฏใน help), codex = `--sandbox workspace-write` + cwd ที่รากโปรเจกต์, agy = `--sandbox` + `--add-dir` เฉพาะรากที่จำเป็น (ความละเอียดระดับไฟล์ไม่มีใน help); ชั้น 3 — **post-run write audit (ชั้นหลักที่บังคับได้จริงทุก camp) — git เป็นหลัก, manifest เป็น fallback (OQ-D4 ปิด 2026-10-04 → `archive.md`):** `git init` ที่ราก rong-ngang เป็นงานของ **setup role ตอนขั้นตั้งโปรเจกต์** (task แรกของงาน build — ไม่ใช่ orchestrator/agent ทำระหว่าง pipeline; กติกา no state-changing git ของ sta2 ยังผูก) หลัง init แล้ว audit ใช้ **git** (read-only `git status`/`git diff` — ระบุไฟล์ที่เปลี่ยนแม่นกว่า mtime) → ไฟล์ที่เปลี่ยน/เกิดใหม่ทั้งหมดต้องอยู่ใน `allow` ไม่เช่นนั้นบันทึก `violations` ใน StageRecord, outcome ของ stage เปลี่ยนเป็น failed และ run หยุดรอคนตัดสิน (แจ้งบน dashboard) — ไม่ auto-revert เพราะการย้อนไฟล์อัตโนมัติเสี่ยงทำลายเอกสารของ role อื่น · **fallback:** เมื่อ repo ไม่มี/เสีย ใช้ manifest (relative path, size, mtimeMs) ของ docsRoot + codeRoots — สแกนก่อน dispatch และหลัง stage จบแล้ว diff แทน; ทั้งสองโหมดยังจับไม่ได้ระดับ cell ของไฟล์ใหญ่ — ยกเว้น `plan/index.md` (ไฟล์เล็กแยก — ดูข้อจำกัดด้านล่าง)

**เลือกโหมด audit ต่อ root (2026-10-05 — DES-015 field `git`):** ตัดสินแยกกันสำหรับ docsRoot (knowledge ที่เลือก) และแต่ละ codeRoot (target ที่เลือก) ตอนเริ่ม run แล้ว freeze ไว้ใน run state จน run จบ: root ที่ประกาศ `git` และผ่าน validate ของ DES-015 → โหมด `git` (`git -C <root> status --porcelain` + `git -C <root> diff --name-only` จำกัด pathspec ใต้ root นั้น — read-only) · ไม่ประกาศ `git` (null/ไม่มี) → โหมด `manifest` · ประกาศ `git` แต่ไม่ผ่าน validate → **ปฏิเสธ run ก่อน dispatch** (ไม่ถอยไป manifest เงียบ ๆ) · knowledge กับ target อยู่ repo เดียวกันได้ (เช่น rong-ngang) — audit แยกตาม pathspec ของแต่ละ root จึงไม่ปนกัน · ถ้า repo เสียกลาง run (git error หลัง stage) → ใช้ manifest ของ root นั้นแทน + mark audit `partial` + บันทึกเหตุใน StageRecord · orchestrator ไม่ init/clone/fetch/checkout ใด ๆ

| setup | `codeRoots/**` (ครั้งเดียวต่อโปรเจกต์) + **pack ที่ `code\` (packRoot — DES-003)** (`CLAUDE.md`, `.claude\agents\*`, `policies\`, `templates\`) — setup มีสิทธิ์เขียน pack ที่ `code\` ตาม task ที่ plan กำหนดเท่านั้น (one-time fork จาก sta2) · เขียน `code\sta-config.json` ได้**เฉพาะผ่าน setup prompt/task** (DES-015) |

universal deny ทุก role (port แนวคิดจาก `pathPermissions.ts:51-64`): `.git/**`, `code/agent-team/**` (orchestrator home รวม state/config), ไฟล์ config ทั้ง 5 ใน `config/` และ `code\sta-config.json` (machine-local — อ่านอย่างเดียวยกเว้น setup ผ่าน setup prompt/task — DES-015), และ module folder อื่นที่ไม่ใช่ module ของ run นี้ — บวก `backlog.md` (PM เขียน, role อื่น append ได้อย่างเดียว — บังคับ append-only ด้วยบรีฟ ชั้น 1)

**Permissions/States/Errors:** violations ไม่ว่าง → stage failed, run → `stopped` (รอคน), รายการ violation แสดงบน dashboard พร้อม path · **Compatibility:** additive · **Data/schema · Migration:** ไม่มี (manifest ชั่วคราวใน run folder) · **Security:** ชั้น 3 เป็นการตรวจหลังเกิดเหตุ (detective) ไม่ใช่กันก่อน (preventive) เต็มรูป — ยอมรับอย่างเปิดเผยเพราะ OS-level sandbox ต่อไฟล์ไม่มีใน CLI ทั้งสาม · **Fallback:** root ที่ไม่ประกาศ `git` ใน sta-config → manifest; repo เสียกลาง run → manifest + `partial` (ประกาศ `git` แต่ตรวจไม่ผ่านตอนเริ่ม run = ปฏิเสธ run ไม่ใช่ fallback — DES-015); ถ้า manifest สแกนไม่ได้ (ไฟล์ล็อก ฯลฯ) → ทำเฉพาะ docsRoot และ mark audit ว่า partial

**ชุด writePaths ตั้งต้น (ฐานเดิมจาก sta2 CLAUDE.md Roles table ยืนยัน 2026-10-04 OQ-D2 → `archive.md` — ปรับใหม่ตามโครง split โดยเจ้าของ 2026-10-05, DES-014 — แก้ได้ที่ routing.yaml):**

| security | `knowledge/<module>/security.md` (ไฟล์เดียว — ตัดสิน SA 2026-10-05 ให้ตรงกับ role prompt ของ pack; โตเกิน 30 KB ค่อยแตก `security/**`) |

**Evidence:** `pathPermissions.ts:19-48,51-64` · `sta2\CLAUDE.md:19-34,84-92` · `policies\documentation.md:35-40` · `policies\security.md:3-10` · ตรวจ 2026-10-04: `rong-ngang` ยังไม่ใช่ git repo, `code\` ว่าง (ก่อน init — OQ-D4) · **ตรวจ 2026-10-05: `rong-ngang` เป็น git repo แล้ว** — `rong-ngang\.git\HEAD:1` = `refs/heads/main`, `.git\config:8-11` origin `https://github.com/jtrp98/rong-ngang.git` (knowledge + code อยู่ repo เดียวกัน) · โหมดต่อ root ตามคำตอบเจ้าของ 2026-10-05 (field `git` ใน sta-config — DES-015)
````

### des-009.md — บรรทัดที่ถูกแทน

````text
| `GET /api/config` | อ่าน config อย่างเดียว (routing/tiers/gates + รายการ knowledge/target จาก sta-config.json — DES-015) เพื่อโชว์ใน UI · ต่อ knowledge/target มี `git: {remote} \| null` + `currentBranch: string \| null` (อ่าน `git branch --show-current` — แสดงอย่างเดียว ไม่ validate) + `gitCheck: "ok" \| "mismatch" \| "not-repo" \| "none"` + `auditMode: "git" \| "manifest"` (ผลตรวจ read-only ตาม DES-015 — ไม่ fetch; `remote` ที่มี credential ไม่ผ่าน validator จึงไม่ถูกส่งออก) — 2026-10-05 |

**`gitCheck` (2026-10-05 — DES-015):** `none` = ไม่ประกาศ `git` (auditMode manifest) · `ok` = `remote` ตรง origin จริง (auditMode git) · `mismatch`/`not-repo` = ประกาศแต่ไม่ตรง/ไม่ใช่ repo → UI แสดงเหตุ + ค่าคาด/ค่าพบ และ `POST .../start` ของคู่นั้นคืน 422 (fail-closed)
````

### des-013.md — หมายเหตุประวัติที่ย้ายออก (กันไฟล์เกินงบ 8 KB)

````text
**หมายเหตุย้าย 2026-10-05:** ไฟล์จุดเข้าทุกไฟล์ย้ายจากราก repo เดิมตาม pack เข้า `code\` (pack เป็น asset ของสินค้า — git repo root ยังเป็นราก แต่ session เปิดที่ `code\`)
````

### data-model.md — ส่วนที่ถูกแทน/ย้าย (ลดขนาดให้ ≤ 15 KB)

````text
### code\sta-config.json — machine-local registry (gitignored — DES-015)

```json
{
  "main_root": "c:/src",
  "knowledge_roots": [
    { "name": "knowledge",
      "path": "c:/src/knowledge",
      "git": { "remote": "https://github.com/org/knowledge.git" },
      "targets": [ { "name": "target1", "path": "c:/src/knowledge/target1",
                     "git": { "remote": "https://github.com/org/target1.git" } } ] }
  ]
}
```

Field: `main_root` string (req) · `knowledge_roots[].{name,path}` + `targets[].{name,path}` string (req, path ต้องมีจริง; target path = codeRoots) · `git` ที่ทั้ง knowledge และ target: `{ remote: string } | null` (optional, default null → audit manifest — DES-006) · `git.remote` (req ถ้ามี `git`) https/ssh URL ห้ามมี credential, ต้องตรง origin จริงของ path · **ไม่มี `branch`** (ใช้ branch ปัจจุบัน อ่าน read-only)

ต่อเครื่อง ไม่ commit · fail-closed: path ไม่มีจริง หรือ `git.remote` ไม่ตรง origin จริง → ปฏิเสธ run · git read-only เท่านั้น — รายละเอียด DES-015 (`git` เพิ่ม 2026-10-05, additive)
````

````text
  # docsRoot + codeRoots ย้ายออก — มาจาก sta-config.json ตอนเลือก knowledge → target (DES-015)
````

````text
หมายเหตุ: ชื่อ camp ในไฟล์นี้เป็น `claude|codex|antigravity` (ชื่อ CLI จริงของระบบนี้) ต่างจากของเดิมที่ใช้ชื่อ provider (`anthropic|openai|google`) — port จาก `tierRouting.ts:12-17` แต่ตัด mapping ชั้น provider ทิ้งเพื่อลด indirection
````

บรรทัดที่ตัดข้อความหลักฐาน/ประวัติออก (ค่า config คงเดิม):

````text
Config ทั้งหมดเป็นไฟล์ที่ **คนเป็นเจ้าของ** อยู่ที่ `C:\src\AICode\rong-ngang\code\agent-team\config\` — ระบบอ่านอย่างเดียว ไม่มีโค้ดเขียนทับ (แนว `model-tiers.yaml` header ของเดิม — `software-team-agents\model-tiers.yaml:1-3`) — **ยกเว้น `sta-config.json` ที่ `code\` (machine-local gitignored — DES-015)** เริ่ม run ใหม่อ่าน config ใหม่ทุกครั้ง ส่วน route ที่ freeze ใน run state แล้วใช้ค่าที่บันทึกไว้ตอน resume (เหตุผลเดียวกับ `docs\tier-and-effort-run.md:68-70`)
docsLayout: split # enum: split (default, DES-014) | flat | module — OQ-D1 supersede (2026-10-05 → archive.md) — ใช้กับ knowledge root ที่เลือก (DES-011)
packRoot: C:\src\AICode\rong-ngang\code # string — ราก pack (asset ของสินค้า — ย้ายเข้า code\ 2026-10-05, DES-003)
    writePaths: # glob สัมพัทธ์ docsRoot/codeRoots — DES-006; ตั้งต้น OQ-D2 ปรับ split (DES-014)
 # ... เช่นเดียวกันสำหรับ role อื่นทั้ง 12 — ตาราง allow/deny ตั้งต้นอยู่ใน DES-006
owner_default: { name: "jabja" } # release นี้ทุก gate ชี้คนเดียว (REQ-006, AC-015) — ตั้งต้น jabja ยืนยันแล้ว 2026-10-04 (OQ-D5 → archive.md); แก้ได้ที่ config
  "recordDispatchSeq": null // int|null — stage "record-only" ที่บันทึกคำตอบลงเอกสาร (OQ-D3 ยอมรับแล้ว 2026-10-04)
````

camps.yaml ฉบับก่อนตัด comment หลักฐาน (ค่าทุกตัวคงเดิมใน `data-model.md`):

````text
```yaml
defaults: { timeoutSec: 1800, retryOnCrash: 1 } # int — หมดเวลาต่อ stage; จำนวน retry เมื่อ CLI พังก่อนทำงาน
camps:
  claude:
    command: claude # claude 2.1.287
    headlessArgs: ["-p", "--output-format", "json", "--permission-prompts", "none", "--permission-mode", "dontAsk"]
    modelFlag: "--model" # จาก claude --help
    effortFlag: "--effort" # จาก claude --help
    schemaFlag: "--json-schema" # บังคับผลลัพธ์สุดท้ายเป็น handoff JSON (claude --help: "only works with --print")
    rolePromptFlag: "--append-system-prompt-file" # claude --help อ้าง "--append-system-prompt[-file]"
    briefChannel: stdin # บรีฟยาว ส่งทาง stdin (กันขีดจำกัดความยาว command line ของ Windows)
    toolRuleFlags: ["--allowedTools", "--disallowedTools"] # ชื่อ tool จาก frontmatter `tools:` ของ role
    extraDirsFlag: "--add-dir" # ให้เข้าถึง docsRoot + codeRoots
  codex:
    command: codex # codex-cli 0.160.0
    subcommand: exec
    headlessArgs: ["--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "--output-last-message", "<lastMessagePath>"]
    modelFlag: "-m" # codex exec --help: "-m, --model <MODEL>"
    effortVia: ["-c", "model_reasoning_effort=<effort>"] # ไม่มี flag effort ตรง (codex exec --help ไม่มี) — key จาก docs/tier-and-effort-run.md:100
    schemaFlag: "--output-schema" # codex exec --help: "JSON Schema file describing the model's final response shape"
    rolePromptFlag: null # ไม่มีช่อง system prompt → role prompt ไปอยู่ใน packet (DES-003)
    briefChannel: packet-file # packet อยู่เป็นไฟล์, positional prompt ชี้ path สั้น ๆ
    cwdFlag: "-C" # codex exec --help: "-C, --cd <DIR>"
  antigravity:
    command: agy # agy 1.2.16
    headlessArgs: ["-p", "--output-format", "json", "--sandbox"]
    modelFlag: "--model"
    effortFlag: "--effort" # agy --help: "(low|medium|high|xhigh|max)"
    schemaFlag: "--json-schema"
    rolePromptFlag: null # agy --help ไม่มี append-system-prompt → packet (DES-003)
    briefChannel: packet-file
    extraDirsFlag: "--add-dir" # repeatable (agy --help)
    logFlag: "--log-file" # เก็บ log ฝั่ง CLI ต่อ stage
```
````

## Rev 9 ย่อขนาดรอบ 2 — 2026-10-05 (verbatim ก่อนตัด)

> driver วัด `wc -c` 2026-10-05: data-model 15,599 B · des-006 9,009 B · des-015 8,332 B · des-013 8,194 B (เกินงบ) → ย้ายเหตุผล/หลักฐาน/ประวัติ และข้อความ enforcement ที่ซ้ำกับ DES-016 ออก — rule ไม่เปลี่ยน · ด้านล่างคือข้อความฉบับก่อนตัดรอบนี้

### des-006.md

````text
**Rule:** บังคับ "เขียนได้เฉพาะที่ role เป็นเจ้าของ" (`sta2\CLAUDE.md:19-34` Roles table, `CLAUDE.md:86` hard rule) ด้วย 3 ชั้น — port แนวคิด 3 layers จาก `pathPermissions.ts:19-48` แต่เลือกชั้นที่ทำได้จริงบนเครื่องนี้ (ไม่พึ่ง hook ต่อ camp): ชั้น 1 — ประกาศใน packet: `writeScope.allow/deny` + ประโยคบังคับในบรีฟ (ทุก camp); ชั้น 2 — CLI-native เท่าที่มี: claude = `--permission-prompts none` + `--allowedTools/--disallowedTools` (path-rule เช่น `Edit(<allow glob>)` — mark `inferred`: ไม่ปรากฏใน help), codex = `--sandbox workspace-write` + cwd ที่รากโปรเจกต์, agy = `--sandbox` + `--add-dir` เฉพาะรากที่จำเป็น (ความละเอียดระดับไฟล์ไม่มีใน help); ชั้น 3 — **post-run write audit (ชั้นหลักที่บังคับได้จริงทุก camp) — git เมื่อ root เป็น repo, manifest เป็น fallback (OQ-D4 → `archive.md`):** ไฟล์ที่เปลี่ยน/เกิดใหม่ทั้งหมดต้องอยู่ใน `allow` ไม่เช่นนั้นบันทึก `violations` ใน StageRecord, outcome ของ stage เปลี่ยนเป็น failed และ run หยุดรอคนตัดสิน (แจ้งบน dashboard) — ไม่ auto-revert เพราะการย้อนไฟล์อัตโนมัติเสี่ยงทำลายเอกสารของ role อื่น · manifest = (relative path, size, mtimeMs) ของ root สแกนก่อน dispatch และหลัง stage แล้ว diff · ทั้งสองโหมดจับไม่ได้ระดับ cell ของไฟล์ใหญ่ — ยกเว้น `plan/index.md` (ดูข้อจำกัดด้านล่าง)

**git ต่อ role (REQ-009 — การบังคับเต็ม DES-016):** อ่านได้เสมอ · `git add`/`git commit` เฉพาะ root ที่ `commitAllowed: true` ใน packet — ปิด = deny เหมือนเดิม (AC-027) · push/branch/merge และ state-changing อื่นห้ามเสมอทุก root (AC-030) · commit ที่ root ปิด หรือ ref เปลี่ยนนอกกติกา = violation · orchestrator ไม่ commit/init/clone/fetch/checkout เอง

| project-manager | `knowledge/<module>/plan/**` (ยกเว้นคอลัมน์ Status ของ `plan/index.md` = qa-engineer — ตรวจได้จริงแล้วเพราะไฟล์เล็กแยก — ดูข้อจำกัดด้านล่าง) |

universal deny ทุก role (port แนวคิดจาก `pathPermissions.ts:51-64`): `.git/**` (เขียนตรง — `git add/commit` ที่อนุญาตตรวจด้วย ref audit DES-016), `code/agent-team/**` (orchestrator home รวม state/config), ไฟล์ config ทั้ง 5 ใน `config/` และ `code\sta-config.json` (อ่านอย่างเดียว — เขียนได้เฉพาะ setup prompt/task และ `/gituse` ตามคำสั่งผู้ใช้ใน solo — DES-015/017), และ module folder อื่นที่ไม่ใช่ module ของ run นี้ — บวก `backlog.md` (PM เขียน, role อื่น append ได้อย่างเดียว — บังคับ append-only ด้วยบรีฟ ชั้น 1)

**Permissions/States/Errors:** violations ไม่ว่าง → stage failed, run → `stopped` (รอคน), รายการ violation แสดงบน dashboard พร้อม path · **Compatibility:** additive · **Data/schema · Migration:** ไม่มี (manifest ชั่วคราวใน run folder) · **Security:** ชั้น 3 เป็นการตรวจหลังเกิดเหตุ (detective) ไม่ใช่กันก่อน (preventive) เต็มรูป — ยอมรับอย่างเปิดเผยเพราะ OS-level sandbox ต่อไฟล์ไม่มีใน CLI ทั้งสาม · **Fallback:** root ที่ไม่ใช่ repo → manifest (ไม่ปฏิเสธ run; สวิตช์เปิด = เตือน + ข้าม commit — DES-015); repo เสียกลาง run → manifest + `partial`; ถ้า manifest สแกนไม่ได้ (ไฟล์ล็อก ฯลฯ) → ทำเฉพาะ docsRoot และ mark audit ว่า partial

**Evidence:** `pathPermissions.ts:19-48,51-64` · `sta2\CLAUDE.md:19-34,84-92` · `policies\documentation.md:35-40` · `policies\security.md:3-10` · ตรวจ 2026-10-04 "ยังไม่ใช่ git repo" = **ล้าสมัย** · **ตรวจ 2026-10-05 (SA): เป็น git repo** — `rong-ngang\.git\HEAD:1` = `ref: refs/heads/main` (knowledge + code repo เดียว)
````

### des-015.md

````text
**Permissions/States/Errors:** รายการ knowledge/target ว่าง → UI แสดงข้อความให้รัน setup prompt; path ที่เลือกไม่มีจริง → ปฏิเสธ run พร้อมรายงาน path (fail visibly — DES-001) · **Compatibility:** additive ต่อระบบ แต่**แทน `docsRoot`/`codeRoots` ใน registry.yaml sample เดิม — breaking กับ sample เจ้าของยืนยันแล้ว 2026-10-05**; registry.yaml เหลือเฉพาะ product settings (§Data Model) · `gituse` **additive/optional — ไม่ breaking ต่อ schema** (config ปัจจุบันไม่มี key นี้ยัง valid → ทุก root = เปิด) แต่**เปลี่ยนพฤติกรรม** (เดิม no state-changing git เสมอ) — ชื่อ/ชนิด field รอเจ้าของยืนยัน (gate 2) · **Data/schema · Migration:** schema ตามด้านบน เพิ่มรายการได้โดยไม่แก้โค้ด; ไม่มี migration (ไม่ตั้ง = เปิด; ตั้งด้วย `/gituse` หรือมือ) · **Security:** path local + boolean ล้วน — **ไม่มี secret/token**; gitignored; เข้าถึงผ่าน local API เท่านั้น (DES-009) · abuse: role แก้ `gituse` ให้ตัวเอง → ไม่มีผลกับ run นั้น (freeze) แต่มีผล run ถัดไป — ความเสี่ยงคงเหลือ ดู DES-016

**Evidence:** ข้อความเจ้าของ 2026-10-05: "n knowledge, n target" (เลือก knowledge → target → module) · "sta-config.json เก็บใน local ของเครื่อง อยู่ใน rong-ngang" · pack ย้ายเข้า `code\` แล้ว (DES-003) · **`gituse`:** REQ-009 (AC-025…032) จากคำตอบเจ้าของ OQ-7/8/9 2026-10-05 · ตรวจ 2026-10-05 (SA): `code\sta-config.json:1-12` 1 knowledge + 1 target ไม่มี `gituse`/`git` (→ เปิดทั้งคู่เมื่อ implement); `rong-ngang\.git\HEAD:1` = `ref: refs/heads/main` — knowledge + target repo เดียว (แยกด้วย pathspec)
````

### des-013.md

````text
เหตุผลเลือก `AGENTS.md` เป็นจุดเข้ากลาง (เจ้าของยืนยันจุดเข้า 2026-10-04; packRoot ย้ายเข้า `code\` 2026-10-05 — ประวัติใน Change Log): สากลที่สุด — ทุก CLI อ่าน markdown ที่ผู้ใช้ชี้ได้ (prompt แรก: "อ่าน `AGENTS.md` ที่ `code\` แล้วทำตาม") และ codex ใช้ `AGENTS.md` เป็น convention อยู่แล้ว — ไฟล์เดียวรองรับทั้ง 4 agents

**Evidence:** `CLAUDE.md` ที่ packRoot (pipeline/gates/finish rules ของ solo session — fork ต้นฉบับจาก sta2 2026-10-05) · frontmatter model/effort ของ `.claude\agents\*.md` ที่ packRoot (ครบใน DES-003) · โปรเจกต์นี้ถูกขับแบบ solo ตลอด — BA/SA สวมบทใน session เดียว, 2026-10-04 · `sta2\README.md:68` (กติกาไม่มีอะไรบังคับนอกจาก prompt) · ตรวจ 2026-10-04: `~\.codex\AGENTS.md` มีอยู่จริง (ไฟล์เปล่า) · `agy --help`/`agy agents` — ไม่พบ convention ไฟล์ instructions ระดับโปรเจกต์ (ดูตาราง antigravity) · จุดเข้า `AGENTS.md` ยืนยันโดยเจ้าของ 2026-10-04 (Waiting on Human #1 ของ plan ปิด — ขณะนั้นตั้งที่ราก); ย้ายตาม pack เข้า `code\AGENTS.md` 2026-10-05
````

### data-model.md

````text
Config ทั้งหมดเป็นไฟล์ที่ **คนเป็นเจ้าของ** อยู่ที่ `C:\src\AICode\rong-ngang\code\agent-team\config\` — ระบบอ่านอย่างเดียว ไม่มีโค้ดเขียนทับ — **ยกเว้น `sta-config.json` ที่ `code\` (machine-local gitignored — DES-015)** เริ่ม run ใหม่อ่าน config ใหม่ทุกครั้ง ส่วน route ที่ freeze ใน run state แล้วใช้ค่าที่บันทึกไว้ตอน resume (หลักฐานเดิม `archive.md` §Superseded 2026-10-05)
ต่อเครื่อง ไม่ commit · fail-closed: path ไม่มีจริง/ค่าผิดชนิด → ปฏิเสธ run · ผู้เขียน: setup prompt (ไม่เขียน `gituse`), `/gituse` (DES-017), คนแก้มือ · resolve + freeze ลง `run.json.gitPolicy` — DES-015
  host: 127.0.0.1 # bind เฉพาะ loopback เท่านั้น (ดู DES-009 Security)
  maxConcurrentRuns: 1 # int — จำนวน run ที่ dispatch พร้อมกันทั้งระบบ (release นี้ = 1, DES-001)
  maxConcurrentStages: 1 # int — stage ที่ dispatch พร้อมกันต่อ run (release นี้ = 1, DES-001)
defaultCamp: claude # enum: claude|codex|antigravity — camp ที่ใช้เมื่อ role ไม่ระบุ (OQ-2: release นี้ทุก role ที่ claude)
ชื่อ camp = ชื่อ CLI (`claude|codex|antigravity`) — เหตุผลเดิม `archive.md` §Superseded 2026-10-05
camps: # หลักฐานต่อ flag (help output) — archive.md §Superseded 2026-10-05
  "gitPolicy": [ { "rootKind": "target", "path": "c:/src/knowledge/target1", "commitAllowed": true, "warning": null } ], // คัดจาก run.json.gitPolicy (DES-012/016)
````

## Change Log

- 2026-10-04 — สร้างไฟล์ — ย้าย OQ-D1…D5 จาก design.md (Rev 3 §Unresolved Open Questions) มาพร้อมคำตอบปิด — ดู design.md Change Log Rev 4
- 2026-10-05 — เพิ่มบรรทัด OQ-D1 superseded โดย DES-014 (docsLayout: split) · ไฟล์ย้ายจาก `design-archive.md` → `design\archive.md` ตามโครง split (Rev 7)
- 2026-10-05 — Rev 9 (REQ-009): ย้าย draft `git: {remote}` (DES-015/006/009/data-model) + ข้อความก่อน amend verbatim มาที่ §Superseded 2026-10-05 · ย้าย comment หลักฐานของ camps.yaml + หมายเหตุชื่อ camp + หมายเหตุย้ายของ DES-013 เพื่อลดขนาดไฟล์ต้นทาง
- 2026-10-05 — Rev 9 ย่อขนาดรอบ 2 (driver วัดแล้วเกินงบ): ย้ายข้อความก่อนตัดของ des-006/015/013 + data-model มาที่ §Rev 9 ย่อขนาดรอบ 2
