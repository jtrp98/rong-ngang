## Data Model

Config ทั้งหมดเป็นไฟล์ที่ **คนเป็นเจ้าของ** อยู่ที่ `C:\src\AICode\rong-ngang\code\agent-team\config\` — ระบบอ่านอย่างเดียว ไม่มีโค้ดเขียนทับ — **ยกเว้น `sta-config.json` ที่ `code\` (machine-local gitignored — DES-015)** เริ่ม run ใหม่อ่าน config ใหม่ทุกครั้ง ส่วน route ที่ freeze ใน run state แล้วใช้ค่าที่บันทึกไว้ตอน resume

### code\sta-config.json — machine-local registry (gitignored — DES-015)

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

Field: `main_root` string (req) · `knowledge_roots[].{name,path}` + `targets[].{name,path}` string (req, path ต้องมีจริง; target path = codeRoots) · `gituse` boolean (optional ทั้ง knowledge และ target — REQ-009; ชื่อรอเจ้าของยืนยัน) — target ชนะ knowledge, ไม่ตั้ง = `true` (กฎเต็ม DES-015) · ค่าไม่ใช่ boolean หรือมี key `git` → ปฏิเสธ run · **ไม่มี `git`/remote/branch ไม่ตรวจ origin** (AC-032)

ต่อเครื่อง ไม่ commit · fail-closed → ปฏิเสธ run · ผู้เขียน/resolve/freeze — DES-015/017

### config/registry.yaml — product settings ของ deployment นี้

```yaml
project: rong-ngang
docsLayout: split # enum: split (default, DES-014) | flat | module — ใช้กับ knowledge root ที่เลือก (DES-011)
packRoot: C:\src\AICode\rong-ngang\code # string — ราก pack (DES-003)
rolePromptRoot: <packRoot>\.claude\agents # derived — role prompt ทั้ง 12 (AC-006, DES-003)
templatesRoot: <packRoot>\templates # derived — template เอกสาร STA ทุกฉบับ (AC-012)
orchestratorHome: C:\src\AICode\rong-ngang\code\agent-team # string — ที่อยู่ state/logs/packets
ui:
  host: 127.0.0.1 # loopback เท่านั้น (DES-009)
  port: 7800 # int 1024–65535
  openBrowser: true # bool — เปิด browser อัตโนมัติเมื่อ start server
concurrency:
  maxConcurrentRuns: 1 # int — run ที่ dispatch พร้อมกันทั้งระบบ (DES-001)
  maxConcurrentStages: 1 # int — stage ที่ dispatch พร้อมกันต่อ run (DES-001)
```

### config/routing.yaml — role → camp + write scope ต่อ role

```yaml
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
```

### config/tiers.yaml — tier binding (แทน model-tiers.yaml)

```yaml
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
```

### config/camps.yaml — spawn profile ต่อ camp

```yaml
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
```

### config/gates.yaml — human gate 7 จุด + เจ้าของ

```yaml
owner_default: { name: "jabja" } # release นี้ทุก gate ชี้คนเดียว (REQ-006, AC-015; OQ-D5)
gates:
  business-choice:   { staGate: 1, trigger: handoff,  owner: owner_default } # 1: material business choice (sta2 CLAUDE.md:64)
  schema-breaking:   { staGate: 2, trigger: handoff,  owner: owner_default } # 2: schema/migration/breaking contract/Critical security consequence
  ux-signoff:        { staGate: 3, trigger: structural, owner: owner_default } # 3: ก่อน frontend ที่พึ่ง UX artifact
  qa-critical:       { staGate: 4, trigger: handoff,  owner: owner_default } # 4: Critical หรือ fail รอบที่ 3 ของ task เดิม
  security-finding:  { staGate: 5, trigger: handoff,  owner: owner_default } # 5: Critical/Important จาก security
  deploy-real:       { staGate: 6, trigger: structural, owner: owner_default } # 6: ก่อน devops execute deploy จริง
  release-cut:       { staGate: 7, trigger: structural, owner: owner_default } # 7: ยืนยัน Release Scope ก่อนเริ่ม build
channels: [] # string[] — ช่องทางแจ้งเพิ่ม (Telegram/LINE/Email) อยู่นอก release นี้; field สงวนไว้
```

### state/runs/<runId>/run.json — state ต่อ run (orchestrator เขียน, agent ห้ามเขียน — DES-006)

```json
{
  "runId": "r-20261004-143012-a1b2", // string — รูป r-<YYYYMMDD-HHmmss>-<4 hex>
  "module": "agent-team", // string — ชื่อ folder ใต้ docsRoot
  "mode": "resume", // enum: resume | new-work
  "status": "waiting-on-human", // enum: queued|running|waiting-on-human|stopped|failed|completed
  "newWorkText": null, // string|null — ข้อความงานใหม่ดิบ (เฉพาะ mode=new-work, REQ-007)
  "createdAt": "2026-10-04T14:30:12+07:00", // ISO 8601
  "updatedAt": "2026-10-04T15:02:40+07:00",
  "configSnapshot": { "routing": "sha256:...", "tiers": "sha256:...", "camps": "sha256:...", "gates": "sha256:..." },
  "gitPolicy": [ // freeze ตอนสร้าง run — ทุก stage/resume ใช้ค่านี้ (DES-015, AC-029)
    { "rootKind": "knowledge", "name": "rong-ngang-knowledge", "path": "C:/src/AICode/rong-ngang/knowledge", // enum: knowledge|target
      "gituse": true, "basis": "default", // effective · basis enum: target|knowledge|default
      "repo": true, "repoTop": "C:/src/AICode/rong-ngang", // string|null (null เมื่อ repo=false)
      "commitAllowed": true, "auditMode": "git", // = gituse && repo · auditMode git|manifest ตาม repo (AC-026)
      "warning": null } // string|null — เปิดแต่ไม่ใช่ repo → ข้าม commit (AC-031)
  ],
  "stages": [ /* StageRecord */ ],
  "gateLog": [ /* GateRecord */ ]
}
```

`StageRecord`:

```json
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
```

`GateRecord`:

```json
{
  "gateId": "schema-breaking", // 1 ใน 7 จาก gates.yaml
  "stageSeq": 3, // stage ที่ปล่อย gate นี้
  "question": "ถ้อยคำคำถามตรงตัวจาก agent", // string — ตอบ AC-014
  "owner": { "name": "<ชื่อ>" },
  "status": "open", // enum: open|answered
  "answeredBy": null, // string|null — ตามที่ผู้ตอบระบุเอง (AC-016)
  "answeredAt": null, // ISO 8601 — จากนาฬิกาเครื่องตอนบันทึกคำตอบ
  "answer": null, // string — คำตอบตรงตัว
  "note": null, // string|null
  "recordDispatchSeq": null // int|null — stage "record-only" ที่บันทึกคำตอบลงเอกสาร (OQ-D3)
}
```

### packets/<seq>.json — dispatch packet (input ของ agent ต่อ stage)

```json
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
```

### handoff-v1.json — ผลลัพธ์สุดท้ายของทุก stage (บังคับด้วย `--json-schema`/`--output-schema`)

```json
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
```

Change Log: 2026-10-05 — Rev 9 (REQ-009) `gituse`, `gitPolicy`, `writeAudit` — รายละเอียด `design\index.md` · ย่อขนาด → `archive.md`
