# STA — Software Team Agents (lean)

A prompt-only pipeline: twelve role prompts, split module documents, plus shared policies.
No orchestrator required. **The main session is the pipeline driver**: it reads the documents,
invokes the next subagent, and stops at every human gate.

Pack root (`packRoot`) = `code\` (โฟลเดอร์นี้ — pack ย้ายจากราก repo เข้า `code\` 2026-10-05 เพราะ pack เป็น asset ของสินค้า agent-team: `code\` = ตัวสินค้าทั้งก้อน, `knowledge\` ผูกด้วย `code\sta-config.json` เท่านั้น) — fork จาก sta2 โดย setup role (SETUP-004, 2026-10-05).
**sta2 = พื้นที่ขับงาน (driver workspace)** — pack ชุดเดียวกันถูก sync ไว้ที่นั่นตามคำสั่งเจ้าของ (2026-10-05); การแก้ pack ฝั่ง sta2 ทำเพื่อ sync ให้ตรงกันเท่านั้น

## Project config — fill this in per project

| Key | Value |
|---|---|
| Docs root | `C:\src\AICode\rong-ngang\knowledge\` (module docs live in `knowledge\<module>\` — split layout, see below) |
| Code roots | `C:\src\AICode\rong-ngang\code` — read-only unless a stage is told to write |
| Stack | Orchestrator: TypeScript, Node ≥ 20, run with tsx — see `knowledge\agent-team\plan\` tasks BE-001…015. Anything else: inspect the real code and fill this in, never guess |
| Check commands | `npm install` · `npm test` · `npm start` — รันที่ `code\agent-team\` (SETUP-001 ตรวจผ่านจริง 2026-10-05) |
| Language | Converse and write documents in Thai; keep technical terms, identifiers, paths in English |

Agents read this table instead of guessing the stack or the commands. If a value is missing, ask.
ค่าในตารางนี้เป็น config ของ deployment นี้ (dogfood) — แก้ได้; ระบบไม่ hard-code — knowledge/target จริงอยู่ที่ `code\sta-config.json`

## โครงเอกสาร (DES-014 — split layout)

เอกสารของ module หนึ่งแตกเป็น**ไฟล์ย่อย + index เป็นสารบัญ** — หน่วยอ่านเล็กที่สุดคือไฟล์จริงหนึ่งไฟล์:

```
knowledge\<module>\
├── index.md            ← สารบัญหลัก (BA เป็น owner) — สารบัญล้วน: ลิงก์ index ย่อย + change log + วิธีอ่าน
├── requirement\        ← index.md (ตาราง REQ + status) + scope.md (เนื้อหา module-level) + req-001.md… (1 REQ ต่อไฟล์)
├── design\             ← index.md (feasibility + ตาราง DES) + data-model.md + des-001.md… (1 contract ต่อไฟล์) + archive.md
├── plan\               ← index.md (release scope, waiting-on-human, phases, ตาราง task: id|status) + <task-id>.md… (1 task ต่อไฟล์)
├── test-plan\ review\ qa\   ← โครงเดียวกัน (qa/review แตกต่อ round: round-N.md)
├── open-questions\     ← index.md (ตาราง OQ) + oq-<id>.md… (1 OQ ต่อ 1 ไฟล์)
├── uxui\               ← UX-NNN-<slug>.md
└── security.md  deploy.md  backlog.md   ← ไฟล์เดี่ยว (backlog append-only)
```

**กติกาอ่าน — index-first:** อ่าน index ของหมวดที่ packet/brief ชี้ก่อน แล้วเปิดเฉพาะไฟล์ที่ระบุ
(packet `readSections` เป็น **path ตรง** เช่น `design\des-006.md`) **ห้าม ls ห้ามอ่านข้ามหมวด** —
grep ภายในไฟล์ที่ได้รับอนุญาตทำได้ · index ของหมวดคือแหล่งรายชื่อไฟล์เดียว · **Status อยู่ที่ index
เท่านั้น** — task status = คอลัมน์เดียวใน `plan\index.md`, REQ status = `requirement\index.md`.

## Roles

| Agent | Owns (writes) | Reads |
|---|---|---|
| `business-analyst` | `requirement\**`, `open-questions\**`, module `index.md` | user, `requirement\index.md` + req/scope ที่เกี่ยว, qa/design สำหรับ amends |
| `system-analyst` | `design\**` | `requirement\index.md` + `scope.md` + req ที่ brief ชี้, real code/schema |
| `project-manager` | `plan\**`, `backlog.md` (ยกเว้นคอลัมน์ Status ของ `plan\index.md` = qa) | design\, requirement |
| `test-planner` | `test-plan\**` (only when triggered) | requirement, design, plan |
| `uxui-designer` | `uxui\UX-*.md` drafts | requirement, design, design sources |
| `setup` | project skeleton (once) + pack ตาม task เท่านั้น | design, stack |
| `backend-engineer` | `code\**` | plan task, design\des ที่ task ชี้, requirement\req ที่ task ชี้, review/qa rounds |
| `frontend-engineer` | `code\**` | same + signed UX artifact + real backend contract |
| `reviewer` | `review\**` | requirement, design, plan task, changed code |
| `qa-engineer` | `qa\**` + **คอลัมน์ Status ของ `plan\index.md` เท่านั้น** | everything + real code + check results |
| `security` | `security.md` (ไฟล์เดียว) | requirement, design, real code |
| `devops` | `deploy.md`, infra files in code | qa, security, plan, design |

No subagent invokes another. Each ends with a short handoff: result, evidence, blockers, next role.

## The pipeline (main session drives)

```
business-analyst → system-analyst → project-manager → [test-planner if triggered]
   → backend-engineer → [uxui-designer draft → human sign-off] → frontend-engineer
   → reviewer → qa-engineer → [security if sensitive] → devops (human-confirmed)
```

Right-size it — never run more than the change needs, never skip a stage it does need:

| The work is | Run |
|---|---|
| Copy/styling tweak | engineer only |
| Bug, rule and schema already clear | engineer → reviewer → qa-engineer |
| Adds/alters a field, table, relation | system-analyst (amend) → engineer → reviewer → qa-engineer (+security) |
| Changes a business rule, no schema | business-analyst (amend) → system-analyst (amend) → engineer → reviewer → qa-engineer |
| New feature or module | full chain; `project-manager` only when there are 3+ tasks to phase |

When driving: give each subagent a self-contained brief — module, phase, task ids, the exact
document paths to read (`plan\<task-id>.md`, `design\des-NNN.md`, `requirement\req-NNN.md`), and
what it may write. Report each handoff to the user in a few lines before starting the next stage.
Continue automatically only when the user asked for a continuous run; the human gates below stop
it either way.

## Human gates — the driver stops and asks; no agent decides these

1. A material business choice or a missing confirming owner.
2. Schema / migration / breaking-contract confirmation.
3. UX artifact sign-off before frontend work that depends on it.
4. QA: a Critical failure, or the **third** failed round on the same task.
5. Security: any Critical/Important finding (fix it, or a human accepts the risk in writing).
6. Any real deploy or migration against a shared environment.
7. **Release scope cut** — what is in this release, what goes to backlog.

Approvals and sign-offs are human acts. Agents record them with who/when exactly as the user
stated; they never write one themselves.

## Finish rules — learned the hard way

- **Done = released.** A module is done when its release scope is deployed or a human accepts it — not when tasks are "verified".
- **Scope is frozen per release.** `plan\index.md` `## Release Scope` lists what is in. New ideas and findings go to `backlog.md`, not into the plan, unless the user moves them in.
- **Findings don't become tasks by themselves.** Non-blocking findings (Minor, hygiene, nice-to-have) go to `backlog.md`. Only a Critical/Important finding that breaks an in-scope AC re-opens work.
- **Max two fix rounds per task**, then a human decides: accept, re-scope, or drop.
- **Surface human decisions first.** `plan\index.md` `## Waiting on Human` is the first thing `/next` reports. Agent work queued behind an unanswered human question is wasted work.
- **Documents have a size budget** (`policies/documentation.md` §4 — งบต่อไฟล์ย่อย + สูตร index). Over budget → archive closed material verbatim first; still over → the release is too big, cut it.

## Hard rules nothing enforces except you

- **No state-changing git.** Read-only `status/log/diff/show` is fine; commit/push/branch/merge are the user's (`.claude/settings.json` denies the common ones — that list is not complete, the rule is).
- **Write only where the active role allows.** Engineers never edit module docs; only `qa-engineer` sets the Status column of `plan\index.md`.
- **Amend, never regenerate** an existing file: `Edit` the affected sub-file, add a dated Change Log line, update the index row if status changed.
- **Dates come from the user.** Ask once per session, reuse the answer. Never infer a date.
- **Unsourced numbers are assumptions** — mark `(สมมติฐาน — ยังไม่ยืนยัน)` until a person confirms.
- **Verify against real files, not memory.** If a recalled fact and the file disagree, the file wins.
- **Read index-first, then the exact paths.** Open only the files the brief/packet names (`policies/documentation.md` §5); no ls, no cross-category reading. Grep inside allowed files.
- **Handoffs are short**: lead with the result; explain only what the next reader must decide.

## Where things are

- `policies/*.md` — shared rules; read the section you need (`policies/README.md` is the index).
- `templates/*.md` — skeletons for every document unit (1 file ย่อย ต่อ template). Copy one; don't invent a new shape.
- `.claude/agents/*.md` — role prompts. `AGENTS.md` — entry point for codex/antigravity sessions.
