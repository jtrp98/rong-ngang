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

## Rev 10 — 2026-10-05 ข้อความก่อน amend ตาม REQ-010…021 (verbatim)

> amend session lifecycle / DAG / runtime state / orchestration (spec เจ้าของ jtrp98 2026-10-05) — ด้านล่างคือข้อความฉบับก่อนแก้ของแต่ละไฟล์ (เฉพาะส่วนที่ถูกแทน)

### des-001.md — ทั้งไฟล์ก่อนแก้

````text
## DES-001 — Pipeline driver และ stage state machine

**Traces:** REQ-001 (AC-003), REQ-002, REQ-007 (AC-019) · กติกา pipeline ตาม `sta2\CLAUDE.md:40-58` + `policies\agent-boundaries.md:27-37`

**Rule:** driver เป็นตัวเดียวที่ invoke agent — "No agent invokes the next agent" (`policies\agent-boundaries.md:4`) คงอยู่เพราะ role prompt เดิมห้ามไว้อยู่แล้ว และ CLI ที่ spawn ต่างกันคุยกันไม่ได้อยู่แล้ว ลำดับ stage มาจาก 2 แหล่งตามลำดับความชอบ: (1) `plan.md` ของ module (เมื่อมี) — task ที่ยัง `pending` เรียงตาม phase โดย backend ต้องเสร็จก่อน frontend เมื่อใช้ contract ร่วมกัน (`agent-boundaries.md:39-44`) และ stage ที่มี `🔒 Security gate` ตามด้วย security; (2) เมื่อยังไม่มี plan.md — ห่วงหน้าคงที่ `business-analyst → system-analyst → project-manager → [test-planner เมื่อ trigger] → backend-engineer → [uxui-designer → gate ux-signoff] → frontend-engineer → reviewer → qa-engineer → [security เมื่อ sensitive] → devops` พร้อมตาราง right-size คัดลอกตรงจาก `CLAUDE.md:49-54` สำหรับงานเล็ก หลัง qa ผ่านแล้ว driver ตรวจ loop กลับ: handoff ของ reviewer/qa ที่ชี้ contract gap → กลับ system-analyst, business gap → กลับ business-analyst, code bug → กลับ engineer (`agent-boundaries.md:30-37`) โดยจำกัดไม่เกิน **2 รอบ fix ต่อ task** แล้วเรียก gate qa-critical ให้คนตัดสิน (`CLAUDE.md:79`)

**Inputs/Outputs:** Input: run.json + เอกสาร module ใต้ docsRoot + config ทั้ง 5 ไฟล์. Output: ลำดับ dispatch ทีละ stage (StageRecord ใหม่ต่อ stage) — release นี้ `maxConcurrentRuns: 1`, `maxConcurrentStages: 1` (dispatch ไม่ซ้อนกันเลย) เพราะ (a) write audit แบบ manifest ก่อน/หลัง (DES-006) ระบุสิ่งที่เขียนให้ stage นั้นได้แม่นเมื่อไม่มีใครเขียนพร้อมกัน (b) เจ้าของ gate เป็นคนเดียว คำตอบใช้ร่วมกัน (c) กติกา backend-before-frontend ของ sta2 ยังผูกอยู่ — parallelism จริงไป backlog

**Permissions/States/Errors:** สถานะ run ตาม state machine: `queued → running ⇄ (stage loop) → waiting-on-human | failed | stopped | completed` ทุกการเปลี่ยนสถานะเขียน run.json ทันที (atomic: เขียนไฟล์ชั่วคราวแล้ว rename) — crash กลางทาง resume ได้จาก stage record สุดท้าย ข้อผิดพลาด: config ไม่ครบ/parse ไม่ผ่าน → run ไม่เริ่ม รายงาน path ของไฟล์ที่เพี้ยน; role ไม่พบใน rolePromptRoot → ปฏิเสธ dispatch; plan.md ระบุ owner role ที่ไม่รู้จัก → หยุดแล้วถามผ่าน gate business-choice

**Compatibility:** additive — ไม่มี consumer เดิม · **Data/schema · Migration:** ไม่มีข้อมูลเดิม; โครง run folder ใหม่ทั้งหมด · **Security:** driver spawn ด้วย argv array เสมอ ห้ามประกอบ shell string จากข้อความผู้ใช้ (DES-010) · **Fallback:** plan.md อ่านไม่ได้/ไม่มี → ใช้ห่วงหน้าคงที่ + บันทึกเหตุผลใน StageRecord.basisReason

**Evidence:** `sta2\CLAUDE.md:40-58` (pipeline + right-size), `sta2\policies\agent-boundaries.md:4,13-23,27-44` (handoff/gate/ลำดับ), `tierCampSelection.ts:27-33` (แนวคิดเลือก camp ต่อ stage — ใช้ config แทน TTY prompt เพราะ run นี้ headless ตลอด)
````

### des-007.md — ทั้งไฟล์ก่อนแก้

````text
## DES-007 — Run state store และการ resume

**Traces:** REQ-001 (AC-002, AC-003), REQ-006 (AC-013)

**Rule:** state ต่อ run อยู่ที่ `<orchestratorHome>\state\runs\<runId>\run.json` (+ `logs\`, `packets\`) และ pointer ต่อ module ที่ `state\modules\<module>.json` → `{currentRunId}` เมื่อกด "เริ่มงาน" บน module ที่มี pointer → resume: อ่าน run.json, ถ้า status=waiting-on-human → ส่งไปหน้าตอบ gate (REQ-001 กติกา OQ-5), ไม่เช่นนั้น dispatch stage ถัดไปจาก stage record ล่าสุด เมื่อ module ยังไม่เคยมี run (สร้างเอกสารไว้ก่อนด้วยมือหรือ session เดิม) → driver อ่านเอกสารจริงแล้ว derive stage ถัดไป: มี plan.md → task pending แรกตามลำดับ; ไม่มี → ห่วงหน้าคงที่ตาม DES-001 — ทั้งสองกรณีผู้ใช้ไม่ต้องพิมพ์บริบทซ้ำ (AC-003) สถานะที่ UI แสดง (AC-002) ประกอบจาก 2 แหล่งเสมอ: run state (สิ่งที่ orchestrator ทำ) + เอกสารจริง (plan.md `## Waiting on Human`, Status cells, qa.md Open Issues) — เอกสารเป็นพยานหลักเมื่อขัดกัน ("Verify against real files" — `sta2\CLAUDE.md:90`)

**Inputs/Outputs:** เขียน run.json เป็น atomic write (tmp + rename) ทุก transition; append log ต่อ stage ที่ `logs/<seq>-<role>.log` (stdout/stderr ของ CLI รวมถึงของ `--log-file` ฝั่ง agy) · **Permissions/States/Errors:** agent ทุก camp **deny** เขียน `state/**` (universal deny — DES-006) เพราะ run state คือบันทึกสิทธิ์และ gate ของตัวเอง (`pathPermissions.ts:55-57` ให้เหตุผลเดียวกัน); ไฟล์ run.json เสียหาย → ย้ายเป็น `run.json.corrupt-<ts>` และปฏิเสธ resume ให้คนตัดสิน ไม่เดาสร้างใหม่ทับ · **Compatibility:** additive · **Data/schema · Migration:** schema มี `packetVersion`/`configSnapshot` ไว้รองรับการเปลี่ยน schema ภายหลัง — ยังไม่มี migration จริง release แรก · **Security:** run.json ไม่เก็บ secret; เก็บข้อความงานใหม่ดิบได้ (จำเป็นต่อ AC-017) · **Fallback:** pointer หาย → derive จากเอกสารตามข้างบน

**Evidence:** `tier-and-effort-run.md:68-70` (freeze route เมื่อ resume) · `sta2\CLAUDE.md:80-81` (Waiting on Human รายงานก่อน) · โครง state ของเดิมใช้แนวคิด run record ต่อ run (runtimeRouting RunRecord — `runtimeRouting.ts:25-34` อ้าง routing_basis ใน run logs)
````

### des-006.md — บรรทัดที่ถูกแทน (ชั้น 3, โหมด audit, แถว PM/qa-engineer, ข้อจำกัด, Permissions)

````text
ไฟล์ที่เปลี่ยน/เกิดใหม่ทั้งหมดต้องอยู่ใน `allow` ไม่เช่นนั้นบันทึก `violations` ใน StageRecord, outcome ของ stage เปลี่ยนเป็น failed และ run หยุดรอคนตัดสิน (แจ้งบน dashboard) — ไม่ auto-revert · manifest = (relative path, size, mtimeMs) ของ root สแกนก่อน dispatch และหลัง stage แล้ว diff · ทั้งสองโหมดจับไม่ได้ระดับ cell ของไฟล์ใหญ่ — ยกเว้น `plan/index.md` (ดูข้อจำกัดด้านล่าง)

โหมด git: changed = `git diff --name-only <HEAD ก่อน stage>..HEAD` (commit ระหว่าง stage) ∪ `git status --porcelain -uall` จำกัด pathspec ใต้ root — read-only · knowledge/target repo เดียวกันได้ (rong-ngang) — แยกด้วย pathspec · repo เสียกลาง run → manifest ของ root นั้น + `partial` + เหตุใน StageRecord

| project-manager | `knowledge/<module>/plan/**` (ยกเว้นคอลัมน์ Status ของ `plan/index.md` = qa-engineer — ดูข้อจำกัดด้านล่าง) |
| qa-engineer | `knowledge/<module>/qa/**`, `knowledge/<module>/plan/index.md` (เฉพาะคอลัมน์ Status) |

**ข้อจำกัดที่ประกาศตรงไปตรงมา:** audit เป็นระดับไฟล์ แต่เมื่อไฟล์เล็กแยกตาม DES-014 audit อ่าน diff ได้ครบทั้งไฟล์ — กติกา "เฉพาะ qa-engineer เขียนคอลัมน์ Status ของ `plan/index.md`" และ "PM ห้ามเขียน verified/blocked" (`policies/documentation.md:40`) จึง**ตรวจได้จริงในโครง split** (ไฟล์ ≤ 3 KB — ตรวจว่า diff แตะคอลัมน์เดียวหรือไม่) ส่วนไฟล์ใหญ่/ไฟล์ที่ไม่แยก ยังบังคับด้วยบรีฟ (ชั้น 1) เท่านั้น จับการละเมิดได้เมื่อ qa\*/review\* ระบุเพิ่มภายหลัง

**Permissions/States/Errors:** violations ไม่ว่าง → stage failed, run → `stopped` (รอคน), รายการ violation แสดงบน dashboard พร้อม path · **Compatibility:** additive · **Data/schema · Migration:** ไม่มี (manifest ชั่วคราวใน run folder)
````

### des-008.md — ส่วนที่ถูกแทน

````text
(a) **handoff trigger:** machine handoff ของ stage ระบุ `questionsForHuman[].gate` หรือ `status: gate` (คำถามถ้อยคำตรงตัวมาจาก agent — AC-014);

(c) **doc trigger:** plan.md `## Waiting on Human` มีรายการค้าง → run ต้องอยู่สถานะ waiting-on-human เสมอ เมื่อ gate เปิด: หยุด dispatch ทันที (AC-013 — ไม่มี process ลูกค้างเพราะ dispatch เป็นแบบ one-shot ต่อ stage), ตั้ง run.status=waiting-on-human,

**การจับ "fail รอบที่ 3" ของ gate qa-critical:** นับจาก StageRecord ของ run (จำนวน stage ซ่อม task เดิม) ร่วมกับ qa handoff — เกิน 2 รอบ fix → gate เปิด (finish rules `sta2\CLAUDE.md:79`)

**Inputs/Outputs:** Input: handoff JSON, gates.yaml, plan.md, StageRecord. Output: GateRecord + สถานะ run
````

### des-012.md — ส่วนที่ถูกแทน

````text
**packet** (input — โครงใน §Data Model) และ **handoff-v1.json** (output สุดท้าย)

โดยเพิ่ม field ที่ driver ต้องใช้: `status`, `questionsForHuman` (gate + question ตรงตัว + owner), `changedDocs/changedCode`, `decision` (เฉพาะ BA งานใหม่)

**Permissions/States/Errors:** handoff ไม่ผ่าน schema / ไม่มี → stage failed (ห้ามเดา); handoff `status: gate` โดยไม่มี `questionsForHuman` → ปฏิเสธและถือว่า stage failed พร้อมเหตุผล · **Compatibility:** additive — packetVersion 1; เปลี่ยน schema ภายหลังต้อง bump version และ driver รองรับเวอร์ชันเก่าตอน resume · `gitPolicy` เข้า v1 โดยไม่ bump เพราะยังไม่มี packet จริง (BE-001 `Status: pending` — `plan\be-001.md:3`; สถานะทางการอยู่ที่ `plan\index.md`) · **Data/schema · Migration:** handoff-v1 เป็น contract ใหม่ — ยืนยันโดยเจ้าของแล้ว 2026-10-04 (ผ่านคำถาม BA)
````

### des-002.md — ส่วนที่ถูกแทน

````text
ต่อ stage มี timeout `defaults.timeoutSec` เกินเวลา → kill child process, outcome=timeout, retry ตาม `retryOnCrash` (default 1) ครบแล้วยังพัง → run failed รายงานผู้ใช้ (fail visibly ตาม architecture §2)
````

(และ `<handoff-v1.json>` ในบรรทัดคำสั่งของ claude/codex/agy — แทนด้วย `<handoff-v2.json>`)

### des-014.md — บรรทัดที่ถูกแทน

````text
├── plan\                    ← index.md (release scope, waiting-on-human, phase overview, ตาราง task: id|status) + <task-id>.md… (1 task ต่อ 1 ไฟล์)

**Status อยู่ที่ index เท่านั้น:** task status อยู่คอลัมน์เดียวใน `plan\index.md` (qa-engineer เขียนคอลัมน์นี้เท่านั้น — ไฟล์เล็กแยกทำให้ write audit ของ DES-006 ตรวจคอลัมน์ได้จริง แก้ข้อจำกัดเดิมที่ audit จับ cell ไม่ได้) · REQ status อยู่ `requirement\index.md`

**ผู้เขียน index ต่อหมวด = owner ของหมวดนั้น:** `requirement\index.md` = BA · `design\index.md` = SA · `plan\index.md` = PM (ยกเว้นคอลัมน์ Status = qa-engineer) · `open-questions\index.md` = BA · module `index.md` = BA

**Validator (ของ BE-001):** เพิ่ม check — ทุก id ในไฟล์ unit ต้องปรากฏใน index ของหมวด และกลับกัน (index กับไฟล์จริงต้องตรงกันสองทาง)

**Compatibility:** breaking กับคำตอบ OQ-D1 เดิม (flat `knowledge\<module>\` ไฟล์เดียวต่อฉบับ) — เจ้าของยืนยันแล้ว 2026-10-05 (ดู `archive.md` บรรทัด superseded) · module แรกที่ใช้โครงใหม่จริงคือ `agent-team` เอง (ย้าย 2026-10-05)
````

### des-014.md — หมายเหตุประวัติที่ย้ายออก (คุมงบ 8 KB หลังเพิ่ม plan v2)

````text
**Rule:** เอกสารของ module หนึ่งแตกเป็น **ไฟล์ย่อย + index เป็นสารบัญ** — หน่วยอ่านเล็กที่สุดคือไฟล์จริงหนึ่งไฟล์ (ตัดสินโดยเจ้าของ 2026-10-05 แก้ปัญหา AI อ่านเอกสารเยอะจน context พัง):
├── open-questions\          ← index.md (ตาราง: id|คำถามย่อ|ผู้ตอบ|สถานะ|ไฟล์) + oq-<id>.md… (1 OQ ต่อ 1 ไฟล์ — คำถาม/คำตอบบางข้อยาว ตัดสินโดยเจ้าของ 2026-10-05)
**Size budget:** unit files — req ≤ 4 KB · oq ≤ 4 KB · **task ≤ 4 KB** (ยกจาก 2 KB 2026-10-05 — 3 ไฟล์จริงเกิน 2 KB ทั้งที่สาระห้ามบีบ · งบ unit เล็กรวมเป็น 4 KB เท่ากันทั้งหมด) · scope.md (เนื้อหา module-level ของ BA) ≤ 12 KB · des ≤ 8 KB · qa/review/test-plan round ≤ 10 KB (ยืนยัน test-plan ใช้งบเดียวกัน 2026-10-05) · data-model ≤ 15 KB · **index ทุกตัวคำนวณด้วยสูตร (ตัดสินโดยเจ้าของ 2026-10-05 — "ทำกับทุกอันเลย"):**
- **median ไม่ใช่ mean** — กันไฟล์ใหญ่ตัวเดียวดึงเฉลี่ย (เช่น data-model 14 KB ทำให้ mean ของ design\ ฟุ้ง)
````

### des-009.md — แถวที่ถูกแทน

````text
| `POST /api/modules/<name>/start` | เริ่ม/resume run — body เลือก `knowledge` + `target` ตาม sta-config.json (DES-015); ถ้ามี gate open คืน 409 พร้อม gateId ให้ UI พาไปหน้าตอบ |
| `GET /api/runs/<runId>/events` | SSE — ส่ง event ต่อ stage transition/log tail แบบสด |
````

### des-013.md — เหตุผลที่ย้ายออก (คุมงบหลังเพิ่มหมายเหตุ R1)

````text
เหตุผลเลือก `AGENTS.md` เป็นจุดเข้ากลาง (เจ้าของยืนยัน 2026-10-04): สากลที่สุด — ทุก CLI อ่าน markdown ที่ผู้ใช้ชี้ได้ (prompt แรก: "อ่าน `AGENTS.md` ที่ `code\` แล้วทำตาม") และ codex ใช้ `AGENTS.md` เป็น convention อยู่แล้ว — ไฟล์เดียวรองรับทั้ง 4 agents
````

### data-model.md — block ที่ถูกแทน/ย่อ (Rev 10)

````text
concurrency:
  maxConcurrentRuns: 1 # int — run ที่ dispatch พร้อมกันทั้งระบบ (DES-001)
  maxConcurrentStages: 1 # int — stage ที่ dispatch พร้อมกันต่อ run (DES-001)
````

````yaml
role_defaults: # role → tier เมื่อ task ไม่ cast — ยืนยันแล้ว (OQ-4)
  business-analyst: T3
  system-analyst: T2
  project-manager: T2
  test-planner: T3
  reviewer: T3
  qa-engineer: T3
  security: T2
  setup: T6
  uxui-designer: T5
  backend-engineer: T5
  frontend-engineer: T5
  devops: T5
tiers:
  T1: { reserved: true, camps: {} } # ห้าม cast อัตโนมัติ (REQ-004, AC-009); camp ว่าง = คนระบุ model/effort เอง
  T2:
    camps:
      claude: { model: opus, effort: high } # ค่าตามตาราง requirement.md:65
      codex: { model: gpt-6.1-sol, effort: xhigh }
      antigravity: { model: gemini-3.8-flash-high, effort: null } # effort null = ฝังในชื่อ model (native) ตาม tier-and-effort-run.md:99
  T3:
    camps:
      claude: { model: opus, effort: medium }
      codex: { model: gpt-6.1-sol, effort: high }
      antigravity: { model: gemini-3.8-flash-medium, effort: null }
  T4:
    camps:
      claude: { model: sonnet, effort: high }
      codex: { model: gpt-6.1-sol, effort: high }
      antigravity: { model: gemini-3.7-flash-high, effort: null }
  T5:
    camps:
      claude: { model: sonnet, effort: medium }
      codex: { model: gpt-6.1-sol, effort: medium }
      antigravity: { model: gemini-3.7-flash-medium, effort: null }
  T6:
    camps:
      claude: { model: haiku, effort: null } # haiku ไม่รับ effort — ต่างกันที่ชื่อ model (tier-and-effort-run.md:97-98)
      codex: { model: gpt-6.1-sol, effort: low }
      antigravity: { model: gemini-3.6-flash-low, effort: null }
````

````yaml
defaults: { timeoutSec: 1800, retryOnCrash: 1 } # int — หมดเวลาต่อ stage; retry เมื่อ CLI พังก่อนทำงาน
camps: # หลักฐาน flag + เหตุผลชื่อ camp → archive.md
  claude:
    command: claude # 2.1.287
    headlessArgs: ["-p", "--output-format", "json", "--permission-prompts", "none", "--permission-mode", "dontAsk"]
    modelFlag: "--model"
    effortFlag: "--effort"
    schemaFlag: "--json-schema" # handoff JSON
    rolePromptFlag: "--append-system-prompt-file"
    briefChannel: stdin # กันขีดจำกัด command line ของ Windows
    toolRuleFlags: ["--allowedTools", "--disallowedTools"] # + กติกา git ต่อ stage (DES-016)
    extraDirsFlag: "--add-dir" # docsRoot + codeRoots
  codex:
    command: codex # codex-cli 0.160.0
    subcommand: exec
    headlessArgs: ["--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "--output-last-message", "<lastMessagePath>"]
    modelFlag: "-m"
    effortVia: ["-c", "model_reasoning_effort=<effort>"] # ไม่มี flag effort ตรง
    schemaFlag: "--output-schema"
    rolePromptFlag: null # → role prompt อยู่ใน packet (DES-003)
    briefChannel: packet-file
    cwdFlag: "-C"
  antigravity:
    command: agy # 1.2.16
    headlessArgs: ["-p", "--output-format", "json", "--sandbox"]
    modelFlag: "--model"
    effortFlag: "--effort" # low|medium|high|xhigh|max
    schemaFlag: "--json-schema"
    rolePromptFlag: null # → packet (DES-003)
    briefChannel: packet-file
    extraDirsFlag: "--add-dir" # repeatable
    logFlag: "--log-file"
````

````json
  "status": "waiting-on-human", // enum: queued|running|waiting-on-human|stopped|failed|completed
  "stages": [ /* StageRecord */ ],
````

`StageRecord`:

````json
{
  "seq": 3, // int เริ่ม 1
  "role": "system-analyst", // 1 ใน 12 role
  "phase": "design", // string — ป้าย phase ตาม pipeline (analysis|plan|impl|verify|ops)
  "taskId": null, // string|null — id จาก plan.md เมื่อทำงานตาม task
  "camp": "claude", "model": "opus", "effort": "high",
  "tier": "T2", // string|null
  "modelBasis": "tier:T2", "effortBasis": "tier:T2",
  "basisReason": "role default T2 ของ system-analyst จาก tiers.yaml", // string — ตอบ AC-005
  "packetPath": "packets/3.json", // สัมพัทธ์กับ run folder
  "rolePromptHash": "sha256:...", // hash ของ <role>.md ตอน dispatch — จับ prompt เปลี่ยนกลางทาง
  "startedAt": "...", "endedAt": "...", "exitCode": 0,
  "outcome": "gate-raised", // enum: completed|gate-raised|failed|timeout
  "handoff": { /* Handoff JSON — DES-012 */ },
  "logsPath": "logs/3-system-analyst.log",
  "writeAudit": { "mode": "git", "partial": false, // mode git|manifest · partial = ถอย manifest/สแกนไม่ครบ (DES-006)
    "changed": ["knowledge/agent-team/design/des-006.md"], // working tree ∪ commit ระหว่าง stage
    "violations": [], // { kind: write|git-commit-off|git-ref, path: string|null, detail: string } (DES-006/016)
    "gitRefs": [ { "repoTop": "C:/src/AICode/rong-ngang", "before": "<sha>", "after": "<sha>" } ] } // HEAD ก่อน/หลัง stage
}
````

````json
  "stageSeq": 3, // stage ที่ปล่อย gate นี้
  "recordDispatchSeq": null // int|null — stage "record-only" ที่บันทึกคำตอบลงเอกสาร (OQ-D3)
````

### packets/<seq>.json — dispatch packet (input ของ agent ต่อ stage)

````json
{
  "packetVersion": 1,
  "runId": "r-...", "seq": 3, "module": "agent-team",
  "role": "system-analyst", "phase": "design", "taskId": null,
  "dateFromUser": "2026-10-04", // string — วันที่จากผู้ใช้ (sta2 CLAUDE.md:88 hard rule)
  "docsRoot": "C:\\...\\knowledge", "docsLayout": "split",
  "selectedTarget": { "name": "target1", "path": "c:/src/knowledge/target1" }, // codeRoots ของ stage นี้ (DES-015)
  "gitPolicy": [ { "rootKind": "target", "path": "c:/src/knowledge/target1", "commitAllowed": true, "warning": null } ], // จาก run.json (DES-012)
  "readSections": ["design\\index.md", "design\\des-006.md"], // string[] — path ตรงที่ต้องอ่าน (DES-014)
  "writeScope": { "allow": ["knowledge/<module>/design/**"], "deny": [] },
  "rolePrompt": { "source": "C:\\...\\rong-ngang\\.claude\\agents\\system-analyst.md", "hash": "sha256:..." },
  "brief": "…ข้อความบรีฟ markdown…", // สิ่งที่ต้องทำ stage นี้ + context ของ gate answer เมื่อมี
  "outputContract": { "handoffSchema": "handoff-v1.json", "schemaEnforcedByCli": true }
}
````

### handoff-v1.json — ผลลัพธ์สุดท้ายของทุก stage (บังคับด้วย `--json-schema`/`--output-schema`)

````json
{
  "role": "string", "module": "string",
  "status": "done | blocked | gate", // gate = ปล่อย human gate ไว้ให้ตอบ
  "result": "string (1–3 บรรทัด นำด้วยผลลัพธ์)",
  "changedDocs": ["string"], "changedCode": ["string"],
  "evidence": ["path:line"],
  "blockers": ["string"],
  "questionsForHuman": [ { "gate": "business-choice|schema-breaking|ux-signoff|qa-critical|security-finding|deploy-real|release-cut|none", "question": "string ตรงตัว", "owner": "string" } ],
  "nextRole": "string (1 ใน 12 หรือ none)",
  "decision": { "action": "amend|create", "module": "string", "reason": "string" } // เฉพาะ business-analyst ตอนงานใหม่ (REQ-007, AC-018)
}
````

### data-model.md — comment ที่ย่อ (Rev 10 คุมงบ 15 KB — ค่า/ชื่อ field ไม่เปลี่ยน)

````text
docsLayout: split # enum: split (default, DES-014) | flat | module — ใช้กับ knowledge root ที่เลือก (DES-011)
packRoot: C:\src\AICode\rong-ngang\code # string — ราก pack (DES-003)
rolePromptRoot: <packRoot>\.claude\agents # derived — role prompt ทั้ง 12 (AC-006, DES-003)
templatesRoot: <packRoot>\templates # derived — template เอกสาร STA ทุกฉบับ (AC-012)
orchestratorHome: C:\src\AICode\rong-ngang\code\agent-team # string — ที่อยู่ state/logs/packets
  host: 127.0.0.1 # loopback เท่านั้น (DES-009)
  port: 7800 # int 1024–65535
  openBrowser: true # bool — เปิด browser อัตโนมัติเมื่อ start server
defaultCamp: claude # enum: claude|codex|antigravity — camp ที่ใช้เมื่อ role ไม่ระบุ (OQ-2)
role_routes: # กุญแจคือ role name ตรงกับชื่อไฟล์ใน rolePromptRoot ทั้ง 12
  business-analyst:
    camp: claude # enum: claude|codex|antigravity — ชนะ defaultCamp
    model: null # string|null — override model ต่อ role (precedence ดู DES-004)
    effort: null # string|null — override effort ต่อ role (แยก field ตาม tier-and-effort-run.md:53-54)
    writePaths: # glob สัมพัทธ์ docsRoot/codeRoots — DES-006
      allow: ["knowledge/<module>/requirement/**", "knowledge/<module>/open-questions/**", "knowledge/<module>/index.md"]
      deny:  []
 # ... role อื่นทั้ง 12 — ตาราง allow/deny ตั้งต้นที่ DES-006
owner_default: { name: "jtrp98" } # release นี้ทุก gate ชี้คนเดียว (REQ-006, AC-015; OQ-D5)
  business-choice:   { staGate: 1, trigger: handoff,  owner: owner_default } # 1: material business choice (sta2 CLAUDE.md:64)
  schema-breaking:   { staGate: 2, trigger: handoff,  owner: owner_default } # 2: schema/migration/breaking contract/Critical security consequence
  ux-signoff:        { staGate: 3, trigger: structural, owner: owner_default } # 3: ก่อน frontend ที่พึ่ง UX artifact
  qa-critical:       { staGate: 4, trigger: handoff,  owner: owner_default } # 4: Critical หรือ fail รอบที่ 3 ของ task เดิม
  security-finding:  { staGate: 5, trigger: handoff,  owner: owner_default } # 5: Critical/Important จาก security
  deploy-real:       { staGate: 6, trigger: structural, owner: owner_default } # 6: ก่อน devops execute deploy จริง
  release-cut:       { staGate: 7, trigger: structural, owner: owner_default } # 7: ยืนยัน Release Scope ก่อนเริ่ม build
channels: [] # string[] — ช่องทางแจ้งเพิ่ม (Telegram/LINE/Email) อยู่นอก release นี้; field สงวนไว้
  "runId": "r-20261004-143012-a1b2", // string — รูป r-<YYYYMMDD-HHmmss>-<4 hex>
  "module": "agent-team", // string — ชื่อ folder ใต้ docsRoot
  "mode": "resume", // enum: resume | new-work
  "newWorkText": null, // string|null — ข้อความงานใหม่ดิบ (เฉพาะ mode=new-work, REQ-007)
  "createdAt": "2026-10-04T14:30:12+07:00", // ISO 8601
  "updatedAt": "2026-10-04T15:02:40+07:00",
  "gitPolicy": [ // freeze ตอนสร้าง run — ทุก stage/resume ใช้ค่านี้ (DES-015, AC-029)
    { "rootKind": "knowledge", "name": "rong-ngang-knowledge", "path": "C:/src/AICode/rong-ngang/knowledge", // enum: knowledge|target
      "gituse": true, "basis": "default", // effective · basis enum: target|knowledge|default
      "repo": true, "repoTop": "C:/src/AICode/rong-ngang", // string|null (null เมื่อ repo=false)
      "commitAllowed": true, "auditMode": "git", // = gituse && repo · auditMode git|manifest ตาม repo (AC-026)
      "warning": null } // string|null — เปิดแต่ไม่ใช่ repo → ข้าม commit (AC-031)
  "gateId": "schema-breaking", // 1 ใน 7 จาก gates.yaml
  "question": "ถ้อยคำคำถามตรงตัวจาก agent", // string — ตอบ AC-014
  "owner": { "name": "<ชื่อ>" },
  "status": "open", // enum: open|answered
  "answeredBy": null, // string|null — ตามที่ผู้ตอบระบุเอง (AC-016)
  "answeredAt": null, // ISO 8601 — จากนาฬิกาเครื่องตอนบันทึกคำตอบ
  "answer": null, // string — คำตอบตรงตัว
  "note": null, // string|null
````

### quality-attributes.md — bullet ที่ถูกแทน

````text
- **Performance and load:** ผู้ใช้คนเดียว local — load จริงอยู่ที่ latency ของ CLI (นาทีต่อ stage) ไม่ใช่ server; จุดที่ degrades ก่อนคือ stage ยาวเกิน timeout (default 1800s) → fail ชัดเจน + retry; UI ไม่กระทบเพราะอ่าน state ไฟล์เท่านั้น
- **Failure modes:** ตัดสินไว้แล้ว ไม่ค้นพบตอนวิ่ง: CLI พัง → retry 1 ครั้ง → run failed รายงาน; handoff เสีย → failed ไม่เดา; gate ค้าง → หยุดจริงรอคน (นี่คือพฤติกรรมที่ต้องการ ไม่ใช่ความล้มเหลว); config เสีย → ปฏิเสธเริ่ม run พร้อมชี้ไฟล์
- **Observability:** StageRecord ต่อ stage (camp/model/effort/basis — AC-005), log ต่อ stage, GateRecord append-only, rolePromptHash ต่อ dispatch, configSnapshot (hash ของ config ทั้ง 5) ต่อ run — ใครอยู่นอกสามารถบอกได้ว่าอะไรทำไม
- **Operational cost / vendor lock-in / tech debt:** ต้นทุน = subscription ของ 3 camp เดิม (ไม่เพิ่ม API key); lock-in ถูกจำกัดที่ adapter (แต่ flags ต่างกันจริง — ยอมรับ); tech debt ที่ยอมรับพร้อมทิศทาง: (1) write audit แบบ detective (ทิศทาง: ย้ายไป preventive เมื่อมี git/sandbox ต่อไฟล์), (2) ไม่มี parallelism (ทิศทาง: เปิด maxConcurrent ต่อ module เมื่อ audit แยก per-module), (3) role prompt พึ่ง path ใน sta2 (ทิศทาง: ทำสัญญา version ถ้า sta2 เปลี่ยนโครง)
````

### design\index.md — ตาราง gate 2 + คำถาม BA ของ Rev 10 (ปิด 2026-10-05 — verbatim ก่อนปิด)

````text
**Rev 10 — ค้างฝั่งคน (gate 2 — schema/breaking contract):**

| # | ต้องยืนยัน | ข้อเสนอ SA |
|---|---|---|
| G2-a | registry.yaml `concurrency` → `scheduler` + `audit` (ชนโค้ดที่ build แล้ว) | ชื่อ/ชนิดตาม data-model |
| G2-b | กลไก audit ต่อ session: A worktree / B path claim / C สำเนา directory | B (DES-021) |
| G2-c | handoff-v1 (ยืนยัน 2026-10-04) → handoff-v2 + packetVersion 2 | ตาม data-model |
| G2-d | run.json `stages[]` → `sessions[]` + `tasks{}` + `phases{}` | ตาม data-model |
| G2-e | task file บรรทัดเครื่องอ่าน `- Write paths:` / `- Security-sensitive:` / `- Session group:` ใน `## Scope` (contract ใหม่ฝั่ง PM) | ตาม DES-014 |

**Rev 10 — คำถามถึง business-analyst (ห้าม SA ตัดสิน — ใช้ค่า default ใน design จนกว่าจะตอบ):**
1. task ที่ owner ไม่ผ่าน QA (uxui-designer, test-planner) ถือว่า "Depends ครบ" เมื่อไร — default: uxui = gate 3 ของ task นั้น answered · test-planner = มี TP ของ phase ใน `test-plan\index.md` (DES-001)
2. task ที่ verified แล้วแต่อยู่ใน impact ของ design/requirement change: ใครเปลี่ยน Status กลับ หรือเปิด task id ใหม่ — default: hold `reopen-needed` รอคน (R13)
3. orchestrated mode: PM เพิ่มแถว task ใหม่ด้วย Status `pending` ได้หรือไม่ (OQ-14 "agent session ใดแก้ Status = ผิด") — default: ได้เฉพาะแถวใหม่ (DES-021 ข้อ 5)
4. กด "เริ่มงาน" ขณะมี gate ค้างเฉพาะ task หนึ่ง (run ยังไม่วิ่ง): พาไปหน้าตอบ gate (OQ-5) หรือเริ่ม task อื่นที่ไม่ขึ้นกับ gate (AC-072) — default: OQ-5 เมื่อ run ไม่วิ่ง, AC-072 เมื่อ run วิ่งอยู่ (DES-009)
````

**คำตอบ — เจ้าของ (jtrp98) 2026-10-05 ผ่าน AskUserQuestion (ส่งต่อโดย driver):** "(1) G2-b = B path claim (ตามข้อเสนอ SA) (2) G2-a/c/d/e ยืนยันทั้ง 4 ข้อ (registry scheduler+audit, handoff-v2/packetVersion 2, run.json sessions[]/tasks{}/phases{}, บรรทัดใหม่ใน task file) (3) risk #14 / Waiting #7 = build orchestrator แบบ solo (ไม่แก้ deny, ไม่มีข้อยกเว้น) (4) คำถาม 4 ข้อถึง BA = ใช้ default ใน design\index.md"

## Rev 10 ย่อขนาด + ปิด gate — 2026-10-05 (verbatim ก่อนตัด)

> driver วัด `wc -c` 2026-10-05: data-model 16,245 B · des-013 9,079 B · des-014 9,314 B (เกินงบ) → ย้ายคำอธิบาย/หลักฐาน/ประวัติ และข้อความ "รอเจ้าของ" ที่ปิดแล้ว — rule/contract ไม่เปลี่ยน (data-model: รูป JSON-with-comments ของ run.json → TS ชนิดเดียวกัน)

### risks.md — ข้อความที่ถูกแทนเมื่อปิด #14/#16

````text
จนกว่าจะตัดสิน (แนวทางที่เป็นไปได้: deny เฉพาะ `code/agent-team/state/**` + `config/**` แทนทั้ง home — ต้องให้เจ้าของยืนยัน)
· ทางเลือก A/C รอเจ้าของ
````

### des-021.md / des-012.md / des-001.md — ป้ายที่ถูกแทน

````text
> Budget ≤ 8 KB · เขียนโดย `system-analyst` · 1 contract · แถวใน `design\index.md` · **รอเจ้าของยืนยันทางเลือก (gate 2)**
- **ทางเลือกที่ไม่เลือก (ให้เจ้าของยืนยัน):**
จึงไม่ต้องรองรับ v1 ตอน resume — **รอเจ้าของยืนยัน (gate 2)**
`test\config.test.ts:58` — **รอเจ้าของยืนยัน (gate 2)**
default ของ owner ที่ไม่ผ่าน QA (คำถามถึง BA — `design\index.md`):
````

### data-model.md

````text
Config ทั้งหมดเป็นไฟล์ที่ **คนเป็นเจ้าของ** อยู่ที่ `C:\src\AICode\rong-ngang\code\agent-team\config\` — ระบบอ่านอย่างเดียว ไม่มีโค้ดเขียนทับ — **ยกเว้น `sta-config.json` ที่ `code\` (machine-local gitignored — DES-015)** เริ่ม run ใหม่อ่าน config ใหม่ทุกครั้ง ส่วน route ที่ freeze ใน run state แล้วใช้ค่าที่บันทึกไว้ตอน resume

```json
{
  "main_root": "c:/src",
  "knowledge_roots": [
    { "name": "knowledge",
      "path": "c:/src/knowledge",
      "gituse": false,
      "targets": [ { "name": "target1", "path": "c:/src/knowledge/target1", "gituse": true },
                   { "name": "target2", "path": "c:/src/target2" } ] }
  ]
}
```

ต่อเครื่อง ไม่ commit · fail-closed → ปฏิเสธ run · ผู้เขียน/resolve/freeze — DES-015/017

scheduler: # Rev 10 แทน concurrency (DES-001/018/019) · freeze ลง run.json — gate 2 รอยืนยัน

role_routes: # key = role ทั้ง 12 (ครบ) · camp enum ชนะ defaultCamp · model/effort string|null override (DES-004)
  business-analyst:
    camp: claude
    model: null
    effort: null
    writePaths: { allow: ["knowledge/<module>/requirement/**", "knowledge/<module>/open-questions/**", "knowledge/<module>/index.md"], deny: [] } # DES-006
 # ... role อื่น — allow/deny ตั้งต้นที่ DES-006

camps: # หลักฐาน flag → archive.md · headlessArgs ห้ามมี --continue/--resume/resume (AC-033) + --dangerously-* (DES-002)

### state/runs/<runId>/run.json — state ต่อ run (orchestrator เขียน, agent ห้ามเขียน — DES-006)

```json
{
  "runId": "r-20261004-143012-a1b2", // r-<YYYYMMDD-HHmmss>-<4 hex>
  "module": "agent-team", "mode": "resume", // mode enum resume|new-work
  "status": "running", // enum: queued|running|idle|waiting-on-human|stopped|failed|completed (DES-001)
  "planFormat": "v2", // enum: v2|legacy|none (DES-001/014)
  "scheduler": { /* สำเนา registry.scheduler ตอนสร้าง run — resume ใช้ค่านี้ */ },
  "newWorkText": null, // string|null (new-work, REQ-007)
  "createdAt": "2026-10-04T14:30:12+07:00", "updatedAt": "2026-10-04T15:02:40+07:00", // ISO
  "configSnapshot": { "routing": "sha256:...", "tiers": "sha256:...", "camps": "sha256:...", "gates": "sha256:..." },
  "gitPolicy": [ // freeze ตอนสร้าง run (DES-015, AC-029)
    { "rootKind": "knowledge", "name": "rong-ngang-knowledge", "path": "C:/src/AICode/rong-ngang/knowledge", // rootKind enum knowledge|target
      "gituse": true, "basis": "default", "repo": true, "repoTop": "C:/src/AICode/rong-ngang", // basis enum target|knowledge|default · repoTop string|null
      "commitAllowed": true, "auditMode": "git", "warning": null } // = gituse && repo · git|manifest (AC-026) · string|null (AC-031)
  ],
  "tasks": { "BE-001": { /* TaskRuntime */ } }, // key = Task id ใน plan\index.md
  "phases": { "1": { "featureQa": "not-ready", "featureQaSessionId": null, "cleared": false, "hold": null } }, // featureQa enum: not-ready|queued|running|pass|fail
  "sessions": [ /* SessionRecord */ ],
  "gateLog": [ /* GateRecord */ ]
}
```

ชนิดด้านล่างเขียนแบบ TypeScript (`int` = integer, `ISO` = ISO 8601 string, `Role` = 1 ใน 12 role) — ชื่อ/ชนิดตรงตัว

### sessions/<sid>/packet.json — dispatch packet v2 (DES-012) · handoff-v2.json (บังคับด้วย `--json-schema`/`--output-schema`) — gate 2 รอยืนยัน

กฎ validate หลัง schema (outputState ↔ block ที่ต้องมี) — DES-012 · router — DES-018 · `GateId` = key ใน gates.yaml

Change Log: 2026-10-05 — Rev 9 (REQ-009) `gituse`, `gitPolicy`, `writeAudit` · Rev 10 (REQ-010…021) `scheduler`/`audit`, `TaskRuntime`, `SessionRecord` (แทน StageRecord), GateRecord scope, PacketV2, HandoffV2 · tiers/camps ย่อรูป (ค่าไม่เปลี่ยน) — ของเดิม verbatim → `archive.md` §Rev 10
````

### des-013.md (ย่อขนาด Rev 10)

````text
**Rule:** pack เดียวสองโหมด — role prompts (`<packRoot>\.claude\agents\*.md` — packRoot = `C:\src\AICode\rong-ngang\code\` (ย้ายจากราก 2026-10-05 — pack เป็น asset ของสินค้า — DES-003); fork จาก sta2 โดย setup role) + templates + policies + ตาราง tier เป็นไฟล์ชุดเดียวที่ทั้ง orchestrator อ่าน (DES-003) และ solo session อ่าน (AC-023 — ห้ามแตกสำเนาสองชุด) solo session (4 agents — AC-024; จุดเข้าดูด้านล่าง) สวม role ทีละตัวตาม pipeline ของ `CLAUDE.md` ที่ packRoot, จบแต่ละ role ด้วย handoff, หยุดถามผู้ใช้ที่ gate ทั้ง 7 จุด — **ไม่มี state machine**: หน้าที่ evaluate gate trigger ของ driver (DES-008) กลายเป็นหน้าที่ของ session เอง และ session บันทึก who/when ของการอนุมัติลงเอกสารเอง ("Agents record them with who/when exactly as the user stated" — `CLAUDE.md:71-72` ที่ packRoot) state ของ solo mode = เอกสารใน knowledge เท่านั้น — ไม่มี run.json/packet/GateRecord · plan `## Waiting on Human` คือสัญญาณ resume ร่วมกับ orchestrated mode (AC-021) · ตาราง tier ใช้เป็นคำแนะนำ model/effort ตอน spawn subagent ต่อ role (AC-022 — claude/zcode spawn ระบุ model ได้; codex/agy ยังไม่ยืนยัน)

**จุดเข้า (entry point) ต่อ agent — AC-024 (OQ-6 ปิด 2026-10-04):** solo mode = การใช้ prompt แบบที่ sta2 ทำ without orchestrator and web (นิยามเจ้าของ 2026-10-04) — รองรับ 4 coding agents: **claude, codex, antigravity, zcode** หลักการห้ามพัง (AC-023): แหล่งความจริงเดียวคือ pack ที่ packRoot (`code\` — **ทุก session เปิดที่ `code\`**) (`CLAUDE.md` + `.claude\agents\*.md` + `policies\` + `templates\` + ตาราง tier — fork จาก sta2 สร้างใหม่ 2026-10-05, role prompts แก้ตามโครง split: path ใหม่, index-first, status-at-index) — ไฟล์จุดเข้าต่อ agent เป็นเพียง **ดัชนี/wrapper** ที่ชี้มาที่แหล่งจริง **ห้ามสำเนาเนื้อหา role prompt** · ไฟล์จุดเข้าเหล่านี้ (AGENTS.md ฯลฯ) เป็น **task ของ setup role ตอน build (SETUP-003)**

| claude | `.claude\agents\*.md` + `CLAUDE.md` ที่ `code\` (packRoot) — อ่านตรงตาม native | pack fork จาก sta2 — role 12 ไฟล์ + `CLAUDE.md` แก้ตามโครง split (2026-10-05) | ยืนยัน |
| antigravity | `AGENTS.md` ที่ `code\AGENTS.md` เป็นจุดเข้ากลาง — สั่ง session ให้อ่านไฟล์นี้ก่อนเริ่ม | `agy --help` ไม่พบ convention เฉพาะ (ตรวจ 2026-10-04) · สำเนา role เก่าที่ `~\.gemini\config\agents\` backup แล้วลบ (2026-10-04) — backup คงอยู่ แต่ไม่ใช่จุดเข้า | `inferred` |

**Evidence:** `CLAUDE.md` ที่ packRoot (pipeline/gates/finish rules) · frontmatter model/effort ของ `.claude\agents\*.md` ที่ packRoot (ครบใน DES-003) · โปรเจกต์นี้ถูกขับแบบ solo ตลอด — BA/SA สวมบทใน session เดียว, 2026-10-04 · `sta2\README.md:68` (กติกาไม่มีอะไรบังคับนอกจาก prompt) · ตรวจ 2026-10-04: `~\.codex\AGENTS.md` มีอยู่จริง (ไฟล์เปล่า) · `agy --help`/`agy agents` — ไม่พบ convention ไฟล์ instructions ระดับโปรเจกต์ (ดูตาราง antigravity) · จุดเข้า `AGENTS.md` ยืนยันโดยเจ้าของ 2026-10-04 (ประวัติ `archive.md`)

- 2026-10-05 — Rev 9: ย้ายหมายเหตุย้าย packRoot (ประวัติ) verbatim → `archive.md` · เพิ่มตัวชี้ git ใน solo → DES-016/017 (REQ-009)
- 2026-10-05 — ย่อขนาด → `archive.md` §Rev 9 ย่อขนาดรอบ 2
````

### des-014.md (ย่อขนาด Rev 10 — รายการ pack ย้ายไป `design\index.md` §Impact on built code)

````text
**กติกาอ่าน (แทน "อ่านเป็น section" เดิม):**

├── index.md                 ← สารบัญหลัก module (BA เป็น owner) — สารบัญล้วน: ลิงก์ index ย่อยทั้งหมด + change log + วิธีอ่าน (ไม่มีเนื้อหา section — เนื้อหา module-level อยู่ requirement\scope.md)
├── requirement\             ← index.md (ตาราง: id|ชื่อ|status|AC รวมแถว scope.md) + scope.md (Overview/Target Users/Release Scope/Constraints/Declined/References — เนื้อหา module-level) + req-001.md… (1 REQ + AC ของมันต่อไฟล์)

**Pack ที่ต้องแก้ (งาน setup role ตาม task ใน plan — orchestrator/SA ไม่แก้):** `code\templates\plan-index.md` (ตาราง 5 คอลัมน์ ไม่มี Depends — บรรทัด 26-28 · หัวไฟล์ "Status ให้ qa-engineer เขียนเท่านั้น" บรรทัด 3) · `code\templates\plan-task.md` (`**Status:** pending` บรรทัด 5 + หัวข้อไม่ตรง 8 ข้อ) · template test-plan/review/qa (TP/REV/QA + ตารางใน index) · role prompts qa-engineer (Status ตามโหมด), reviewer (REV structured), project-manager (Depends/Write paths/flags), engineers (output state + blocker), test-planner (TP) · `policies\documentation.md` §1 (ตาราง task) + §3 (ผู้เขียน Status) · `CLAUDE.md` (โครง plan + ข้อยกเว้น orchestrated)

- เกิน budget = แตกหมวดนั้นเพิ่มหรือตัด scope (กติกาเดิม) · unit เกิน budget = ตัด/แตกเพิ่ม

**Compatibility:** breaking กับ OQ-D1 เดิม — เจ้าของยืนยัน 2026-10-05 · **plan v2 = breaking ต่อรูป `id|status` + task file ที่มี Status** — ยืนยันโดยเจ้าของแล้วผ่าน REQ-011/OQ-15 (อ่านรูปเดิมได้ ไม่ migrate ทั้งก้อน)

**Evidence:** `sta2\policies\documentation.md:70-81` (§5 read-the-section — ปัญหาที่โครงนี้แก้) · ขนาดจริงก่อน split: design.md 93.8 KB / requirement.md 28.6 KB / plan.md 43.4 KB (ตรวจ 2026-10-05) · `docs-validator.ts:25` (plan unit regex — แถวแรก = Task id ใช้ได้กับ 6 คอลัมน์) · `code\templates\plan-index.md:26-28`, `plan-task.md:5` (ตรวจ 2026-10-05)
````

## Rev 11 — 2026-10-05 ข้อความก่อน amend (verbatim)

DES-018 (kind table / R18 / R19 / Permissions):

```
| `review` `qa` `feature-qa` `security` | PASS FAIL BLOCKED NEEDS_HUMAN |
| R18 | ทุก task ใน phase verified | คิว `feature-qa` (DES-019) |
| R19 | Feature QA PASS | phase มี 🔒 → คิว `security` · ไม่มี → phase `cleared` |
- **Permissions / States / Errors:** router ไม่เขียนไฟล์ — scheduler (DES-001) apply · review perTask PASS แต่มี finding Critical/Important ของ task นั้น = ขัดกันเอง → R15
```

DES-019 (reviewer packet — ส่วนที่แทน): `finding ขาด id/severity/task/location/problem/reference → R15 (AC-050)`

DES-015 (Rule — sample ซ้ำ data-model + หัว bullet gituse + Compatibility):

````
**Rule:** registry ผูก deployment กับ knowledge/target จริงของเครื่องนี้ เก็บที่ `code\sta-config.json` — **machine-local, gitignored ไม่ commit** (ยืนยันโดยเจ้าของ 2026-10-05) · schema (sample ตรงตัว — ดู §Data Model):

```json
{
  "main_root": "c:/src",
  "knowledge_roots": [
    { "name": "knowledge",
      "path": "c:/src/knowledge",
      "gituse": false,
      "targets": [ { "name": "target1", "path": "c:/src/knowledge/target1", "gituse": true },
                   { "name": "target2", "path": "c:/src/target2" } ] }
  ]
}
```

- **`gituse` — สวิตช์สิทธิ์ git commit (REQ-009, 2026-10-05 · ชื่อ/ชนิด field = ข้อเสนอ SA รอเจ้าของยืนยัน):**
… — ชื่อ/ชนิด field รอเจ้าของยืนยัน (gate 2) · …
````

data-model: `gituse` boolean (optional ทั้ง knowledge และ target — REQ-009; ชื่อรอเจ้าของยืนยัน) · `type Severity = "Critical" | "Important" | "Minor"` · `QaDefect { id: string /* QA-NNN */,` · `Change Log: 2026-10-05 — Rev 9 + Rev 10 (gate 2 ยืนยัน jtrp98 2026-10-05) — รายละเอียด `design\index.md` · ของเดิม → `archive.md` §Rev 10`

### Rev 11 ย่อขนาด — des-019 (driver วัด 8,521 B) และ des-015 (8,265 B) ข้อความก่อนตัด (verbatim, rule ไม่เปลี่ยน)

DES-019:

```
ไม่ระบุ → R20 · phase ที่มี 🔒 Security gate หรือ devops ของ phase ไม่เริ่มจน Feature QA PASS (AC-057) · Feature QA เขียน `qa\round-N.md` (round ใหม่, หัวระบุ `Feature QA — Phase <n>`)
- **Task Owner = qa-engineer (anchor ของ phase — เช่น QA-001/002):** ไม่มี session `execution`/review/qa ของตัวเอง · Depends โดยนัย = task อื่นทุกตัวใน phase (รวมกับ Depends ที่เขียน — R8) · พร้อม = R18 → dispatch kind `feature-qa` ของ phase (`taskIds` = anchor ทุกตัวของ phase, role qa-engineer, context ตาม DES-020 แถว feature-qa) · ระหว่าง session step `qa` · PASS → Status `verified` (R19) · FAIL ระบุ task → task นั้น R4/R5 + anchor Status `blocked`, step `waiting-deps` (R18 เปิดใหม่เมื่อ task นั้น verified) · FAIL ไม่ระบุ → R20, anchor Status `blocked`, step `held` (`reason: "gate"`, `ref` = phase) · anchor ไม่นับ `fixRounds` (defect ไปที่ task เจ้าของ) · phase ไม่มี anchor → R18 เปิดเองเหมือนเดิม · solo (DES-013): qa-engineer ทำ Feature QA เมื่อ task อื่นของ phase verified แล้วเขียน Status ของ anchor เอง
· template review/qa/test-plan ต้องเพิ่มรูป REV/QA/TP + ตาราง TP ใน index (งาน setup — DES-014) · severity REV: `templates\review-round.md:7,11` + `.claude\agents\reviewer.md:32-35,42,49` ยังใช้ blocking/non-blocking → เปลี่ยนเป็น Critical|Important|Minor (setup — DES-018 §Severity)
- **Security:** packet ของ reviewer/QA ไม่มีข้อความจาก implementer นอกจากไฟล์ที่ commit ลง root (diff/code) — ลด prompt injection ข้าม session ได้บางส่วน; code ที่ implementer เขียนยังเป็น untrusted input ของ reviewer (ประกาศ)
- **Evidence:** req-015.md:9-13 · req-016.md:9-10 · req-017.md:7-11 · req-018.md:7-10 · `CLAUDE.md` ที่ packRoot "Check commands" (`npm test`)
- 2026-10-05 — สร้าง (Rev 10) จาก REQ-015…018 + OQ-12/13/16
- 2026-10-05 — Rev 11: task Owner qa-engineer = anchor ของ Feature QA · severity REV = Critical|Important|Minor (REV-005) · ข้อความเดิม → `archive.md` §Rev 11
```

DES-015:

```
> **REQ-009 ไม่อยู่ R1 — เลื่อนไป release ถัดไป (เจ้าของ jtrp98 2026-10-05):** bullet `gituse`/effective/freeze/validate `gituse` ด้านล่างคง rule ไว้ ไม่ build ใน R1 · **R1:** ไม่อ่าน `gituse` — `config.ts:555,574` (exact keys) ปฏิเสธ key นี้อยู่แล้ว (fail-closed) · repo check read-only + `auditMode` คงอยู่ (DES-006/021) · `gitPolicy` โครงเดิม ค่า R1 `gituse: false`, `basis: "default"`, `commitAllowed: false`, `warning: null` (กติกา No state-changing git — `CLAUDE.md` hard rule)
- **ผลต่อ orchestrator:** git **อ่านอย่างเดียว** (`rev-parse`, `status`, `diff`, `log`, `for-each-ref`, `symbolic-ref`) — ห้าม `init`/`clone`/`fetch`/`pull`/`checkout`/`commit` เองเสมอ · ใช้ที่: UI (DES-009), โหมด audit (DES-006), `gitPolicy` ใน packet (DES-012) + การบังคับ (DES-016)
- **ผู้เขียนรายการ:** setup prompt (onboarding knowledge ใหม่ phase 1 — รันจากที่ติดตั้ง ชี้ path knowledge → ตรวจ/สร้างโครงตาม DES-014 → เพิ่มรายการ; **ไม่เขียน `gituse`** (ไม่ตั้ง = เปิด — AC-028) และรักษา `gituse` เดิมของรายการที่มีอยู่; ไม่ clone/init) · key `gituse` แก้ด้วย `/gituse` (DES-017) · หรือคนแก้มือ — orchestrator/role ใน run **อ่านอย่างเดียว** (deny ใน DES-006)
· `gituse` **additive/optional — ไม่ breaking ต่อ schema** (config ปัจจุบันไม่มี key นี้ยัง valid → ทุก root = เปิด) แต่**เปลี่ยนพฤติกรรม** (เดิม no state-changing git เสมอ) — gate 2 ค้าง (เลื่อนพร้อม REQ-009) · **Data/schema · Migration:** schema ตามด้านบน เพิ่มรายการได้โดยไม่แก้โค้ด; ไม่มี migration (ไม่ตั้ง = เปิด; ตั้งด้วย `/gituse` หรือมือ) ·
- 2026-10-05 — Rev 9 (REQ-009) ตัด `git: {remote}` → `gituse` — ดู `design\index.md`; ข้อความเดิม → `archive.md`
- 2026-10-05 — ย่อขนาด → `archive.md` §Rev 9 ย่อขนาดรอบ 2
- 2026-10-05 — Rev 11: ป้าย REQ-009 ไม่อยู่ R1 + ค่า `gitPolicy` ของ R1 · sample JSON ซ้ำ data-model → `archive.md` §Rev 11
```

### Rev 11 ย่อขนาด — des-006 (driver วัด 8,463 B) ข้อความก่อนตัด (verbatim, rule ไม่เปลี่ยน)

```
(path-rule เช่น `Edit(<allow glob>)` — mark `inferred`: ไม่ปรากฏใน help), codex = `--sandbox workspace-write` + cwd ที่รากโปรเจกต์, agy = `--sandbox` + `--add-dir` เฉพาะรากที่จำเป็น (ความละเอียดระดับไฟล์ไม่มีใน help); ชั้น 3 — **post-run write audit (ชั้นหลักที่บังคับได้จริงทุก camp) — git เมื่อ root เป็น repo, manifest เป็น fallback (OQ-D4 → `archive.md`):** ไฟล์ที่ session เปลี่ยนต้องอยู่ใน `allow` ∩ `claim` ของ session — **กลไก snapshot/attribution ต่อ session (parallel) อยู่ที่ DES-021** (Rev 10 แทน manifest ก่อน/หลัง stage) ·
**Security:** ชั้น 3 เป็นการตรวจหลังเกิดเหตุ (detective) ไม่ใช่กันก่อน (preventive) เต็มรูป — ยอมรับอย่างเปิดเผย ·
- 2026-10-05 — Rev 9 (REQ-009) audit ไม่ขึ้นกับสวิตช์ + git ต่อ role — ดู `design\index.md`; ข้อความเดิม → `archive.md`
- 2026-10-05 — ย่อขนาด → `archive.md` §Rev 9 ย่อขนาดรอบ 2
- 2026-10-05 — Rev 10: ชั้น 3 → audit ต่อ session (DES-021) · qa-engineer ไม่เขียน Status ใน orchestrated (OQ-14) · PM เขียน Status ได้แค่แถวใหม่ `pending` · ข้อความเดิม → `archive.md` §Rev 10
- 2026-10-05 — Rev 11: ป้าย REQ-009 ไม่อยู่ R1 (เจ้าของ jtrp98 เลื่อนไป release ถัดไป) — rule ไม่เปลี่ยน · 🔒 ใน orchestrated เขียนโดย orchestrator (G2-f A)
```

### G2-f — คำถามและคำตอบ (ปิด 2026-10-05)

**คำถาม (SA → เจ้าของ ผ่าน driver):** 🔒 Security gate จาก QA ใน orchestrated — HandoffV2 ไม่มี field · `qa-engineer.md:27` ใช้ `questionsForHuman` ขึ้นต้น `🔒 Security gate` + `NEEDS_HUMAN` → R12 hold ทั้ง round (perTask ไม่ถูก apply) + ต้อง parse ข้อความอิสระ + ไม่ตรง gate 7 จุด · **A (SA แนะนำ):** HandoffV2 เพิ่ม `securityGate: { phase: string, reason: string }[] | null` (kind qa/feature-qa — additive optional) · router: ไม่ว่าง → orchestrator เขียน 🔒 ที่ Phase ใน `plan\index.md` (เพิ่มอย่างเดียว ไม่ลบ — แบบ Status write-back OQ-14) · R19 อ่าน 🔒 จาก doc (ไม่แตะ run.json) · state ปกติ PASS/FAIL · **B:** รับ workaround เป็นทางการ (schema ไม่เปลี่ยน แต่เปลี่ยนความหมาย `questionsForHuman` + R12) · ทั้งสองทาง ผู้เขียน 🔒 ใน orchestrated = orchestrator

**คำตอบ — เจ้าของ (jtrp98) 2026-10-05 ผ่าน AskUserQuestion (ส่งต่อโดย driver):** "(1) G2-f = **A** เพิ่ม field `securityGate: {phase, reason}[] | null` (optional, kind qa/feature-qa) ใน HandoffV2 + orchestrator เขียน 🔒 ลง plan\index.md (เพิ่มอย่างเดียว) — ทำเลย: แก้ data-model (HandoffV2), DES-012, DES-018 (router แถวใหม่/R19), DES-007 (อ่านเท่าที่จำเป็น), DES-019, DES-006 write audit ถ้าเกี่ยว; (2) ยืนยัน gitPolicy R1 = gituse:false, basis:"default", commitAllowed:false ทุก root (ไม่สร้าง /gituse, คง deny ใน settings.json)."

## Rev 12 — 2026-10-05 ข้อความก่อน amend ตาม OQ-20 (verbatim)

> OQ-20 ปิดโดยเจ้าของ (jtrp98) 2026-10-05 (ส่งต่อโดย driver): task ใน plan ห้ามมี Owner = reviewer/security; orchestrator สร้าง review เองตาม wave, security เป็น stage ท้าย phase ที่มี 🔒 เท่านั้น → AC-079 (req-011), AC-080 (req-015). ส่วนที่แก้แบบเพิ่มท้าย (append) ไม่คัดมา — เฉพาะข้อความที่ถูกแทน

### des-018.md

```
- **Traces:** REQ-021 (AC-068, AC-069, AC-070, AC-071, AC-076), REQ-019 (AC-062, AC-063, AC-064), REQ-016 (AC-055, AC-056), REQ-017 (AC-077), REQ-020 (AC-067, AC-075), REQ-006 (AC-078), REQ-011 (AC-073)
| R18 | ทุก task ใน phase verified (ไม่นับ anchor = Owner qa-engineer — DES-019) | คิว `feature-qa` · `taskIds` = anchor (ไม่มี = ว่าง) |
| R19 | Feature QA PASS | anchor Status `verified` · phase มี 🔒 (plan `## Phases` หรือ `securityGate` ใน `sessions[]` ของ phase) → คิว `security` · ไม่มี → phase `cleared` |
- **Evidence:** req-021.md:11-20 (ตาราง)
```

### des-019.md

```
- **Traces:** REQ-015 (AC-049–052), REQ-016 (AC-053–056), REQ-017 (AC-057, AC-058, AC-077), REQ-018 (AC-059–061), REQ-012 (AC-040)
— finding ขาด id/severity/task/location/problem/reference หรือ severity นอก `Critical|Important|Minor` (DES-018 §Severity) → R15 (AC-050)
  3. **Quiesce:** ก่อนเปิด QA round บน codeRoot หนึ่ง scheduler หยุดเริ่ม execution ใหม่บน codeRoot นั้นและรอตัวที่รันอยู่จบ — กัน shared checks เห็นไฟล์ครึ่งทาง · QA จบ → เดินต่อ
- **Task Owner = qa-engineer (anchor — เช่น QA-001/002):** ไม่มี execution/review/qa ของตัวเอง · Depends โดยนัย = task อื่นทุกตัวใน phase (+ที่เขียน — R8) · พร้อม → R18 dispatch `feature-qa` (`taskIds` = anchor ของ phase, context DES-020)
คงชื่อ artifact `review\`, `qa\`, `test-plan\`, TP-NNN · template/prompt ใน pack ต้องแก้ (REV/QA/TP + ตาราง TP, severity, `securityGate`) — งาน setup ตาม `design\index.md` §Impact
```

### des-014.md

```
**Traces:** REQ-005 (AC-011, AC-012), REQ-003, REQ-011 (AC-036, AC-038, AC-039, AC-074), REQ-008 (AC-021), REQ-018 (AC-059)
· Owner = ชื่อ role 1 ใน 12 ·
```

### des-001.md

```
**Traces:** REQ-001 (AC-003), REQ-002, REQ-007 (AC-019), REQ-011 (AC-036, AC-037, AC-039, AC-074), REQ-012 (AC-040, AC-041, AC-042), REQ-013 (AC-043, AC-044, AC-045), REQ-020 (AC-067) · router DES-018 · audit DES-021
| security | 1 phase ที่มี 🔒 |
```

## Rev 12 ย่อขนาด — 2026-10-05 (driver วัด des-018 8,643 · des-019 9,331 · des-014 9,087 B — ข้อความก่อนตัด verbatim, rule/ตาราง R1–R24/contract ไม่เปลี่ยน)

### des-019.md

```
`reviewInput.tasks[] = {taskId, changedFiles (touchedFiles ตั้งแต่ review รอบก่อน), diffPath (`sessions/<sid>/diff.patch` — DES-021 ข้อ 6), testFiles}`
orchestrator สร้างจาก handoff ไปไว้ `runs/<runId>/defects/<taskId>-<fixRound>.json` = `{taskId, source: review|qa|feature-qa, findings: [REV-NNN | QA-NNN ตาม data-model], roundFile}` — QA-NNN ต้องมี expected, actual, reproduce `{tp: TP-NNN|null, steps}`, evidence[] ·
**หรือ** wave เต็ม) — กันเปิด wave ละ 1 task
**≤ 1 ต่อ phase** (Feature QA 1 session ต่อ phase — `phases[].featureQaSessionId` ค่าเดียว) — > 1 → R24
dependents ของ anchor (เช่น devops) = งานหลัง
มี `Security-sensitive: yes` (REQ-015: flag เดียวกัน) ∨
· ผล → R21 (PASS `cleared` / Critical\|Important → gate 5) — gate คง 7
- **Compatibility:** แทน "reviewer → qa-engineer" ทีละ stage ของ DES-001 เดิม · คงชื่อ artifact `review\`, `qa\`, `test-plan\`, TP-NNN · pack ต้องแก้ — งาน setup ตาม `design\index.md` §Impact
- **Security:** packet reviewer/QA ไม่มีข้อความ implementer นอกจาก diff/code (ลด injection ข้าม session บางส่วน) · code ของ implementer = untrusted input ของ reviewer (ประกาศ)
- 2026-10-05 — สร้าง (Rev 10) · Rev 11: anchor qa-engineer, severity REV, `securityGate` (G2-f A — เจ้าของ jtrp98), ย่อขนาดจาก 8,521 B — ข้อความเดิม → `archive.md` §Rev 11
- 2026-10-05 — Rev 12 (OQ-20, เจ้าของ jtrp98): §Security stage (AC-080) · anchor ≤ 1 ต่อ phase + Depends โดยนัยไม่รวม dependents ของ anchor · ย่อถ้อยคำ Compatibility/Reviewer packet/Quiesce (rule ไม่เปลี่ยน) — ข้อความเดิม → `archive.md` §Rev 12
```

### des-019.md — รอบ 2 (driver วัด 8,385 B)

```
ผล `featureQa.flows[] = {flow, ref (TP-NNN หรือ REQ/AC), result}` (AC-058)
**≤ 1 ต่อ phase** (`phases[].featureQaSessionId` ค่าเดียว) — > 1 → R24
**ไม่ใช่ task** (แถว Owner นั้น → R24 — ไม่ถึง `awaiting-review`)
- **Test Planner (REQ-018 — คง trigger เดิม OQ-16):**
`TP | Phase | REQ/AC | ไฟล์` เป็นแหล่ง resolve TP → ไฟล์ (DES-020)
(data-model) · ไม่มีข้อมูลเดิม
→ ปฏิเสธเริ่ม run (fail-closed — config.ts)
- **Evidence:** req-015…018 (กติกา) · `CLAUDE.md` ที่ packRoot "Check commands"
```

### des-018.md

```
| `review` `qa` `feature-qa` `security` (task Owner qa-engineer = `feature-qa` — DES-019) | PASS FAIL BLOCKED NEEDS_HUMAN |
- **Compatibility:** แทนการนับรอบจาก StageRecord (DES-001/008 เดิม) — ไม่มีโค้ด build แล้วที่ใช้ (`code\agent-team\src\core\` มีแค่ `config.ts`, `docs-validator.ts`)
- **Evidence:** req-021.md:11-21 (ตาราง; :21 = AC-079) · finish rules "Max two fix rounds" (`CLAUDE.md` ที่ packRoot) · ไม่มีโค้ด router เดิม (`inferred` ไม่มีให้เทียบ)
- 2026-10-05 — สร้าง (Rev 10) จาก REQ-019/021 + OQ-11/14/19
- 2026-10-05 — Rev 11: §Severity (REV-005) · anchor qa-engineer (R18/R19) · R23 + 🔒 ใน R19 (G2-f A — เจ้าของ jtrp98) · ข้อความเดิม → `archive.md` §Rev 11
- 2026-10-05 — Rev 12 (OQ-20, เจ้าของ jtrp98): +R24 (Owner reviewer/security · anchor > 1) · R18 ไม่นับ dependents ของ anchor + กันแถว `plan-error` · R19 security = stage ไม่ใช่ task (AC-080) · ข้อความเดิม → `archive.md` §Rev 12
```

### des-014.md

````
**ยกเว้น `reviewer`/`security`** (OQ-20 — review มาจาก wave, security = stage ท้าย phase 🔒: DES-019)
**Size budget:** unit files — req ≤ 4 KB · oq ≤ 4 KB · **task ≤ 4 KB** · scope.md ≤ 12 KB · des ≤ 8 KB · qa/review/test-plan round ≤ 10 KB · data-model ≤ 15 KB · **index ทุกตัวคำนวณด้วยสูตร (เจ้าของ 2026-10-05):**

```
budget(index) = (median ขนาดไฟล์ย่อยที่ index นั้นระบุ × 0.75) × จำนวนไฟล์ + 2 KB
```

- **median ไม่ใช่ mean** — กันไฟล์ใหญ่ตัวเดียวดึงเฉลี่ย
- **+2 KB** — หัวไฟล์ + วิธีอ่าน + Change Log pointer ที่มีทุก index
- **กติกาแถว: 1 แถว = 1 บรรทัด** — แถวไหนต้องเขียนยาว = เนื้อหานั้นอยู่ในไฟล์ย่อย ไม่ใช่ index
- เกิน budget = แตกหมวดนั้นเพิ่มหรือตัด scope · unit เกิน budget = ตัด/แตกเพิ่ม
· issue ระดับแถว (AC-039/079/anchor) ไม่หยุดทั้ง run — scheduler hold แถวนั้น + dependents (R9/R24 — DES-018) task อื่นเดินต่อ
**Compatibility:** breaking (OQ-D1 เดิม; plan v2 ต่อรูป `id|status`) — เจ้าของยืนยันแล้ว (REQ-011/OQ-15: อ่านรูปเดิมได้ ไม่ migrate ทั้งก้อน) · บรรทัดเครื่องอ่านใน `## Scope` ยืนยัน jtrp98 2026-10-05 (gate 2)
- 2026-10-05 — Rev 10: plan v2 (6 คอลัมน์, Depends ใน index), task file 8 หัวข้อไม่มี Status, บรรทัดเครื่องอ่านใน Scope, ตาราง TP/REV/QA ใน index, ผู้เขียน Status ตามโหมด, รายการ pack ที่ setup ต้องแก้ · ข้อความเดิม → `archive.md` §Rev 10
- 2026-10-05 — ย่อขนาด (driver วัด 9,314 B): รายการ pack → `design\index.md` §Impact · ประวัติ/หลักฐาน → `archive.md` §Rev 10 ย่อขนาด · rule ไม่เปลี่ยน
- 2026-10-05 — Rev 12 (OQ-20, เจ้าของ jtrp98): Owner ห้าม `reviewer`/`security` + anchor ≤ 1 ต่อ phase + validator issue ระดับแถว (AC-079) · ข้อความเดิม → `archive.md` §Rev 12
````

## Change Log

- 2026-10-04 — สร้างไฟล์ — ย้าย OQ-D1…D5 จาก design.md (Rev 3 §Unresolved Open Questions) มาพร้อมคำตอบปิด — ดู design.md Change Log Rev 4
- 2026-10-05 — เพิ่มบรรทัด OQ-D1 superseded โดย DES-014 (docsLayout: split) · ไฟล์ย้ายจาก `design-archive.md` → `design\archive.md` ตามโครง split (Rev 7)
- 2026-10-05 — Rev 9 (REQ-009): ย้าย draft `git: {remote}` (DES-015/006/009/data-model) + ข้อความก่อน amend verbatim มาที่ §Superseded 2026-10-05 · ย้าย comment หลักฐานของ camps.yaml + หมายเหตุชื่อ camp + หมายเหตุย้ายของ DES-013 เพื่อลดขนาดไฟล์ต้นทาง
- 2026-10-05 — Rev 9 ย่อขนาดรอบ 2 (driver วัดแล้วเกินงบ): ย้ายข้อความก่อนตัดของ des-006/015/013 + data-model มาที่ §Rev 9 ย่อขนาดรอบ 2
- 2026-10-05 — Rev 10 (REQ-010…021): ข้อความก่อน amend ของ des-001 (ทั้งไฟล์), des-007 (ทั้งไฟล์), des-006/008/012/002/009/013/014, quality-attributes และ data-model (concurrency, tiers/camps รูปเดิม, StageRecord, packet v1, handoff-v1, comment ที่ย่อ) → §Rev 10
- 2026-10-05 — Rev 10 ปิด gate (เจ้าของ jtrp98 ผ่าน AskUserQuestion) + ย่อขนาด data-model/des-013/des-014 → §Rev 10 ย่อขนาด + ปิด gate และ §design\index.md ตาราง gate 2 (คำตอบตรงตัว)
- 2026-10-05 — Rev 11: ข้อความก่อน amend ของ des-018/019/015 + data-model (Severity ชุดเดียว, anchor qa-engineer, ป้าย REQ-009 ไม่อยู่ R1) → §Rev 11 · + ย่อขนาด des-019/015 และ G2-f คำถาม/คำตอบเจ้าของ (jtrp98 2026-10-05) → §Rev 11
- 2026-10-05 — Rev 12 (OQ-20): ข้อความก่อน amend ของ des-018/019/014/001 → §Rev 12
- 2026-10-05 — Rev 12 ย่อขนาด (driver วัด des-018/019/014 เกิน 8,192 B): ข้อความก่อนตัด verbatim → §Rev 12 ย่อขนาด
