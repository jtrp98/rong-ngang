## Data Model

Config = ไฟล์ของคนที่ `C:\src\AICode\rong-ngang\code\agent-team\config\` ระบบอ่านอย่างเดียว (ยกเว้น `sta-config.json` — DES-015) · run ใหม่อ่านใหม่ · resume ใช้ค่าที่ freeze

### code\sta-config.json — machine-local registry (gitignored — DES-015)

```json
{ "main_root": "c:/src", "knowledge_roots": [ { "name": "knowledge", "path": "c:/src/knowledge", "gituse": false,
  "targets": [ { "name": "target1", "path": "c:/src/knowledge/target1", "gituse": true }, { "name": "target2", "path": "c:/src/target2" } ] } ] }
```

Field: `main_root` string (req) · `knowledge_roots[].{name,path}` + `targets[].{name,path}` string (req, path ต้องมีจริง; target path = codeRoots) · `gituse` boolean (optional ทั้ง knowledge และ target — REQ-009 **ไม่อยู่ R1** — DES-015) — target ชนะ knowledge, ไม่ตั้ง = `true` (กฎเต็ม DES-015) · ค่าไม่ใช่ boolean หรือมี key `git` → ปฏิเสธ run · **ไม่มี `git`/remote/branch ไม่ตรวจ origin** (AC-032) · ไม่ commit · fail-closed (DES-015/017)

### config/registry.yaml — product settings ของ deployment นี้

```yaml
project: rong-ngang
docsLayout: split # enum split|flat|module (DES-011/014)
packRoot: C:\src\AICode\rong-ngang\code # string (DES-003)
rolePromptRoot: <packRoot>\.claude\agents # derived (AC-006)
templatesRoot: <packRoot>\templates # derived (AC-012)
orchestratorHome: C:\src\AICode\rong-ngang\code\agent-team # string — state/
ui: { host: 127.0.0.1, port: 7800, openBrowser: true } # host loopback เท่านั้น (DES-009) · port int 1024–65535 · bool
scheduler: # DES-001/018/019 · freeze ลง run.json
  maxParallelSessions: 3 # int ≥1 — session active ทั้งระบบ (สมมติฐาน)
  fixRoundLimit: 2 # int ≥0 — CLAUDE.md finish rules
  crashRestartLimit: 1 # int ≥0 (สมมติฐาน)
  reviewWave: { maxTasks: 4, maxDiffLines: 800 } # int ≥1 (สมมติฐาน)
  largeTask: { diffLines: 400, files: 10 } # int ≥1 — เกิน = review แยก (สมมติฐาน)
audit: # DES-021
  manifestIgnore: ["node_modules/**", ".git/**"] # string[] — root ที่ไม่ใช่ repo
  preimageMaxMB: 50 # int ≥0 ต่อ session (สมมติฐาน)
```

### config/routing.yaml — role → camp + write scope ต่อ role

```yaml
defaultCamp: claude # enum claude|codex|antigravity (OQ-2)
role_routes: # key = role ทั้ง 12 (ครบ) · camp enum ชนะ defaultCamp · model/effort string|null override (DES-004)
  business-analyst: { camp: claude, model: null, effort: null, writePaths: { allow: [...], deny: [] } } # allow string[] ≥1 — ค่าตั้งต้นต่อ role ที่ DES-006
```

### config/tiers.yaml — tier binding (แทน model-tiers.yaml)

```yaml
role_defaults: { business-analyst: T3, system-analyst: T2, project-manager: T2, test-planner: T3, reviewer: T3, qa-engineer: T3, security: T2, setup: T6, uxui-designer: T5, backend-engineer: T5, frontend-engineer: T5, devops: T5 } # OQ-4
tiers: # T2–T6 ต้องมีครบ 3 camp · effort null = ไม่ส่ง flag (haiku / antigravity ฝังในชื่อ model)
  T1: { reserved: true, camps: {} } # ห้าม cast อัตโนมัติ (AC-009)
  T2: { camps: { claude: { model: opus, effort: high }, codex: { model: gpt-6.1-sol, effort: xhigh }, antigravity: { model: gemini-3.8-flash-high, effort: null } } }
  T3: { camps: { claude: { model: opus, effort: medium }, codex: { model: gpt-6.1-sol, effort: high }, antigravity: { model: gemini-3.8-flash-medium, effort: null } } }
  T4: { camps: { claude: { model: sonnet, effort: high }, codex: { model: gpt-6.1-sol, effort: high }, antigravity: { model: gemini-3.7-flash-high, effort: null } } }
  T5: { camps: { claude: { model: sonnet, effort: medium }, codex: { model: gpt-6.1-sol, effort: medium }, antigravity: { model: gemini-3.7-flash-medium, effort: null } } }
  T6: { camps: { claude: { model: haiku, effort: null }, codex: { model: gpt-6.1-sol, effort: low }, antigravity: { model: gemini-3.6-flash-low, effort: null } } }
```

### config/camps.yaml — spawn profile ต่อ camp

```yaml
defaults: { timeoutSec: 1800, retryOnCrash: 1 } # int — timeout ต่อ session (→ R16) · retryOnCrash = spawn ไม่สำเร็จเท่านั้น (DES-007)
camps: # headlessArgs ห้ามมี --continue/--resume/resume (AC-033) + --dangerously-* (DES-002)
  claude: { command: claude, headlessArgs: ["-p", "--output-format", "json", "--permission-prompts", "none", "--permission-mode", "dontAsk"], modelFlag: "--model", effortFlag: "--effort", schemaFlag: "--json-schema", rolePromptFlag: "--append-system-prompt-file", briefChannel: stdin, toolRuleFlags: ["--allowedTools", "--disallowedTools"], extraDirsFlag: "--add-dir" }
  codex: { command: codex, subcommand: exec, headlessArgs: ["--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "--output-last-message", "<lastMessagePath>"], modelFlag: "-m", effortVia: ["-c", "model_reasoning_effort=<effort>"], schemaFlag: "--output-schema", rolePromptFlag: null, briefChannel: packet-file, cwdFlag: "-C" }
  antigravity: { command: agy, headlessArgs: ["-p", "--output-format", "json", "--sandbox"], modelFlag: "--model", effortFlag: "--effort", schemaFlag: "--json-schema", rolePromptFlag: null, briefChannel: packet-file, extraDirsFlag: "--add-dir", logFlag: "--log-file" }
```
Field ต่อ camp: required `command, headlessArgs, modelFlag, schemaFlag, rolePromptFlag, briefChannel (stdin|packet-file)` · optional `subcommand, effortFlag, effortVia, toolRuleFlags, extraDirsFlag, cwdFlag, logFlag` (ตรง `config.ts:487-488`)

### config/gates.yaml — human gate 7 จุด + เจ้าของ

```yaml
owner_default: { name: "jtrp98" } # AC-015; OQ-D5
gates: # ครบ 7 ตัว staGate = ลำดับ (คง 7 — OQ-19) · trigger enum handoff|structural · ความหมาย DES-008
  business-choice:   { staGate: 1, trigger: handoff,  owner: owner_default }
  schema-breaking:   { staGate: 2, trigger: handoff,  owner: owner_default }
  ux-signoff:        { staGate: 3, trigger: structural, owner: owner_default }
  qa-critical:       { staGate: 4, trigger: handoff,  owner: owner_default } # Critical หรือ fail ครั้งที่ 3 (R5/R7)
  security-finding:  { staGate: 5, trigger: handoff,  owner: owner_default }
  deploy-real:       { staGate: 6, trigger: structural, owner: owner_default }
  release-cut:       { staGate: 7, trigger: structural, owner: owner_default }
channels: [] # string[] — สงวนไว้ (นอก release)
```

### state/runs/<runId>/run.json — orchestrator เขียน, agent ห้าม (DES-006/007)

TS: `int` = integer · `ISO` = ISO 8601 · `Role` = 1 ใน 12 role — ชื่อ/ชนิดตรงตัว

```ts
RunJson {
  runId: string /* r-<YYYYMMDD-HHmmss>-<4 hex> */; module: string; mode: "resume" | "new-work"
  status: "queued" | "running" | "idle" | "waiting-on-human" | "stopped" | "failed" | "completed"; planFormat: "v2" | "legacy" | "none"
  scheduler: object /* สำเนา registry.scheduler ตอนสร้าง run */; newWorkText: string | null /* new-work (REQ-007) */; createdAt: ISO; updatedAt: ISO
  configSnapshot: { routing: string, tiers: string, camps: string, gates: string } // "sha256:..."
  gitPolicy: { rootKind: "knowledge" | "target", name: string, path: string, gituse: boolean, basis: "target" | "knowledge" | "default",
    repo: boolean, repoTop: string | null, commitAllowed: boolean /* gituse && repo */, auditMode: "git" | "manifest", warning: string | null }[] // freeze (DES-015, AC-026/029/031)
  tasks: Record<string /* Task id */, TaskRuntime>
  phases: Record<string /* Phase */, { featureQa: "not-ready" | "queued" | "running" | "pass" | "fail", featureQaSessionId: string | null, cleared: boolean, hold: object | null }>
  sessions: SessionRecord[]; gateLog: GateRecord[]
}
TaskRuntime { // DES-007/018 — runtime เท่านั้น ไม่ลง docs
  taskId: string; owner: Role; planPhase: string; group: string | null
  step: "waiting-deps" | "runnable" | "execution" | "awaiting-review" | "review" | "awaiting-qa" | "qa" | "verified" | "held"
  hold: { reason: "audit-violation" | "dep-error" | "plan-error" | "design-change" | "requirement-change" | "reopen-needed"
          | "blocked" | "invalid-handoff" | "crash-limit" | "context-error" | "status-conflict" | "gate", ref: string | null, prevStep: string } | null
  attempt: int; fixRounds: int; crashRestarts: int // attempt = execution session ที่ dispatch แล้ว
  currentSessionId: string | null; sessionIds: string[]; touchedFiles: string[]
  lastVerdict: { source: "review" | "qa" | "feature-qa", verdict: "PASS" | "FAIL" | "verified" | "blocked", ref: string, sessionId: string } | null
  defectPacket: string | null // path ใต้ defects/ (DES-019)
  humanActions: { action: "retry", by: string, note: string | null, at: ISO }[]
}
SessionRecord { // = StageRecord เดิม (DES-002…005/016 ยังเรียกชื่อเดิม)
  sessionId: string; seq: int // sessionId = "s-<seq>-<4 hex>"
  kind: "change" | "execution" | "review" | "qa" | "feature-qa" | "security" | "record-only"
  role: Role; taskIds: string[]; planPhase: string | null; attempt: int
  camp: string; model: string; effort: string | null; tier: string | null
  modelBasis: string; effortBasis: string; basisReason: string // AC-005
  packetPath: string; rolePromptHash: string; cliVersion: string | null // packetPath = "sessions/<sid>/packet.json"
  pid: int | null; cliSessionId: string | null
  claim: string[]; contextFiles: string[] // DES-021 / DES-020 (AC-047)
  priorSession: { sessionId: string, touchedFiles: string[] } | null
  startedAt: ISO; endedAt: ISO | null; exitCode: int | null
  outcome: "completed" | "gate-raised" | "failed" | "timeout" | "interrupted" | "crashed" | null
  handoff: HandoffV2 | null; logsPath: string
  writeAudit: { mode: "git" | "manifest", partial: boolean, diffApprox: boolean, changed: string[], touchedFiles: string[],
    violations: { kind: "write" | "unclaimed-write" | "status-write" | "git-commit-off" | "git-ref", path: string | null, detail: string, suspects: string[] }[],
    gitRefs: { repoTop: string, before: string, after: string }[] } // DES-006/016/021
}
GateRecord { // append-only (DES-008)
  gateId: GateId; sessionId: string | null /* null = structural/doc trigger */
  scope: "task" | "phase" | "module"; taskIds: string[]; phase: string | null // AC-072
  question: string /* ตรงตัว AC-014 */; owner: { name: string }; status: "open" | "answered"
  answeredBy: string | null /* ผู้ตอบระบุเอง AC-016 */; answeredAt: ISO | null; answer: string | null; note: string | null
  recordSessionId: string | null // session record-only (OQ-D3)
}
```

### PacketV2 (`sessions/<sid>/packet.json`) + HandoffV2 (`handoff-v2.json` — DES-012)

```ts
PacketV2 {
  packetVersion: 2; runId: string; sessionId: string; seq: int; module: string
  role: Role; kind: SessionRecord["kind"]; taskIds: string[]; planPhase: string | null; attempt: int
  dateFromUser: string // YYYY-MM-DD จากผู้ใช้
  docsRoot: string; docsLayout: "split" | "flat" | "module"
  selectedTarget: { name: string, path: string } // codeRoots (DES-015)
  gitPolicy: { rootKind: "knowledge" | "target", path: string, commitAllowed: boolean, warning: string | null }[] // จาก run.json
  readSections: string[] // path ตรง (DES-014/020)
  writeScope: { allow: string[], deny: string[] }; claim: string[] // DES-006/021
  priorSession: { sessionId: string, touchedFiles: string[] } | null // restart (DES-007)
  defectPacket: { taskId: string, source: "review" | "qa" | "feature-qa", roundFile: string, findings: (ReviewFinding | QaDefect)[] } | null
  reviewInput: { tasks: { taskId: string, changedFiles: string[], diffPath: string | null, testFiles: string[] }[] } | null
  blocker: Blocker | null // change chain
  rolePrompt: { source: string, hash: string }; brief: string
  outputContract: { handoffSchema: "handoff-v2.json", schemaEnforcedByCli: boolean, allowedStates: OutputState[] }
}
type OutputState = "DONE" | "PASS" | "FAIL" | "BLOCKED" | "NEEDS_DESIGN_CHANGE" | "NEEDS_REQUIREMENT_CHANGE" | "NEEDS_HUMAN"
type Severity = "Critical" | "Important" | "Minor" // REV/QA/SEC ชุดเดียว (DES-018)
Blocker { type: "design" | "requirement" | "environment" | "dependency" | "access" | "other", task: string, reference: string | null, reason: string }
ReviewFinding { id: string /* REV-NNN */, severity: Severity, task: string, location: string /* file:line */, problem: string, reference: string /* DES/REQ/AC id */ }
QaDefect { id: string /* QA-NNN — ชน task id: DES-020 */, task: string | null /* null ได้เฉพาะ featureQa */, severity: Severity, expected: string, actual: string,
  reproduce: { tp: string | null /* TP-NNN */, steps: string }, evidence: string[] }
HandoffV2 {
  role: Role; module: string; sessionId: string; outputState: OutputState
  result: string; changedDocs: string[]; changedCode: string[]; evidence: string[]; nextRole: Role | "none"
  questionsForHuman: { gate: GateId | "none", question: string, owner: string, touchesSchemaOrContract: boolean | null }[]
  blocker: Blocker | null; impactedTasks: string[] | null // PM ใน change chain
  decision: { action: "amend" | "create", module: string, reason: string } | null // BA งานใหม่ (AC-018)
  review: { roundFile: string, perTask: { task: string, verdict: "PASS" | "FAIL" }[], findings: ReviewFinding[] } | null
  qa: { roundFile: string, checks: { command: string, exitCode: int, logRef: string }[], perTask: { task: string, verdict: "verified" | "blocked" }[], defects: QaDefect[] } | null
  featureQa: { phase: string, roundFile: string, flows: { flow: string, ref: string, result: "PASS" | "FAIL" }[], defects: QaDefect[] } | null
  security: { findings: { id: string, severity: Severity, ref: string }[] } | null
  securityGate: { phase: string, reason: string }[] | null // optional = null · qa/feature-qa เท่านั้น → 🔒 (R23, G2-f)
}
```

`GateId` = key ใน gates.yaml · validate หลัง schema — DES-012 · router — DES-018

Change Log: 2026-10-05 — Rev 9 + Rev 10 (gate 2 ยืนยัน jtrp98 2026-10-05) + Rev 11 (`securityGate` — gate 2 G2-f jtrp98 2026-10-05) — รายละเอียด `design\index.md` · ของเดิม → `archive.md`
