# rong-ngang — dev team (ทีมที่ใช้สร้าง rong-ngang)

session ที่เปิดที่ราก `C:\src\AICode\rong-ngang\` คือ **ทีมสำหรับสร้าง rong-ngang** ทำงานกับสองโฟลเดอร์เท่านั้น:

| โฟลเดอร์ | บทบาท |
|---|---|
| `knowledge\` | เอกสารประกอบการสร้าง rong-ngang (requirement, design, plan, review, qa, open-questions, backlog, security, deploy) — **แหล่งความจริงของสิ่งที่ต้องสร้าง** |
| `workspace\` | **ตัวสินค้า / ผลลัพธ์** — pack ที่ผู้ใช้ปลายทางได้รับ (`.claude\agents`, `policies`, `templates`, `prompts`, `CLAUDE.md`, `AGENTS.md`, `sta-config.json`) + `workspace\orchestrator\` (TypeScript, Node ≥ 20) |

ห้ามอ่าน/เขียนนอกสองโฟลเดอร์นี้ (ยกเว้นผู้ใช้สั่งชัดเจน)

## ทีมนี้ ≠ ทีมใน workspace

ที่ราก repo มี **สำเนาของทีม** (`.claude\agents`, `.claude\settings.json`, `policies\`, `templates\`, และกติกาในไฟล์นี้) แยกออกมาจาก `workspace\` เพื่อให้ปรับแต่ง agent ให้เหมาะกับ *การสร้าง* ได้โดยไม่กระทบสินค้า:

- แก้ทีมนี้ (ราก) → มีผลกับการสร้าง rong-ngang เท่านั้น ไม่ถูก install
- แก้ `workspace\` → คือการแก้ตัวสินค้า ต้องทำผ่าน task ตาม pipeline และมีเอกสารใน `knowledge\` รองรับ
- สำเนาไม่ sync อัตโนมัติ — ถ้าปรับปรุงที่ฝั่งไหนแล้วอยากให้อีกฝั่งได้ด้วย ให้ตัดสินใจและทำเอง (ถือเป็นการเปลี่ยนสินค้า ผ่าน task)
- ถ้าสองฝั่งต่างกัน ฝั่งที่ราก = กติกาของ session นี้, ฝั่ง `workspace\` = สิ่งที่สินค้าส่งมอบ

## วิธีทำงาน — solo mode, ไม่ใช้ orchestrator

- **main session เป็นคนขับ pipeline** — อ่านเอกสาร, เรียก subagent, หยุดที่ human gate ทุกจุด
- **ไม่ใช้ `workspace\orchestrator\` ขับงานของ repo นี้** — เป็นสิ่งที่เรากำลังสร้าง ไม่ใช่เครื่องมือที่ใช้สร้าง
- subagent = `.claude\agents\<role>.md` ที่ราก (12 บทบาท)
- engineer เขียนโค้ดที่ `workspace\` เท่านั้น; ไม่แก้เอกสารใน `knowledge\`

## ความสัมพันธ์ workspace\ กับการ install ใช้งานจริง

`workspace\` ถูก install ไปใน project จริง เช่น `C:\src\schoolbright\`:

```
C:\src\schoolbright\
├── knowledge\            ← เอกสารของ project นั้น
├── rong-ngang-workspace\ ← สำเนา pack ที่ install (= workspace\ ของ repo นี้)
└── target\               ← โค้ดจริงของ project ที่ agent ไปพัฒนา
```

- `workspace\` ต้อง **portable** — ห้าม hard-code path เครื่อง/โปรเจกต์ ผูกผ่าน `workspace\sta-config.json` และ Project config ใน `workspace\CLAUDE.md` เท่านั้น
- กติกาของทีมที่ราก (ไฟล์นี้) ต้องไม่รั่วเข้า `workspace\`

## Project config (ของทีมที่ราก)

| Key | Value |
|---|---|
| Docs root | `C:\src\AICode\rong-ngang\knowledge\` — module เดียว: `knowledge\agent-team\` ตามหัวข้อ "โครงเอกสาร" ด้านล่าง |
| Code roots | `C:\src\AICode\rong-ngang\workspace` — read-only unless a stage is told to write |
| Stack | Orchestrator: TypeScript, Node ≥ 20, run with tsx. อย่างอื่น: ตรวจโค้ดจริงแล้วค่อยกรอก ห้ามเดา |
| Check commands | `npm install` · `npm test` · `npm start` / `npm run serve` — รันที่ `workspace\orchestrator\` · **ไม่มี typecheck/lint script** → รายงาน "not run" |
| Language | Converse and write documents in Thai; keep technical terms, identifiers, paths in English |

---

# กติกาทีม (สำเนาจาก workspace\CLAUDE.md — ปรับแต่งได้โดยไม่กระทบสินค้า)

## โครงเอกสาร (DES-014 — split layout)

เอกสารของ module หนึ่งแตกเป็น**ไฟล์ย่อย + index เป็นสารบัญ** — หน่วยอ่านเล็กที่สุดคือไฟล์จริงหนึ่งไฟล์:

```
knowledge\agent-team\
├── index.md            ← สารบัญหลัก (BA เป็น owner) — สารบัญล้วน: ลิงก์ index ย่อย + change log + วิธีอ่าน
├── requirement\        ← index.md (ตาราง REQ + status) + scope.md (เนื้อหา module-level) + req-001.md… (1 REQ ต่อไฟล์)
├── design\             ← index.md (feasibility + ตาราง DES) + data-model.md + des-001.md… (1 contract ต่อไฟล์) + archive.md
├── plan\               ← index.md (release scope, waiting-on-human, phases, ตาราง Tasks 6 คอลัมน์ `Task|Name|Owner|Phase|Depends|Status`) + <task-id>.md… (1 task ต่อไฟล์ · 8 หัวข้อ ไม่มี Status)
├── test-plan\ review\ qa\   ← โครงเดียวกัน (qa/review แตกต่อ round: round-N.md)
├── open-questions\     ← index.md (ตาราง OQ) + oq-<id>.md… (1 OQ ต่อ 1 ไฟล์)
├── uxui\               ← UX-NNN-<slug>.md
└── security.md  deploy.md  backlog.md   ← ไฟล์เดี่ยว (backlog append-only)
```

**กติกาอ่าน — index-first:** อ่าน index ของหมวดที่ packet/brief ชี้ก่อน แล้วเปิดเฉพาะไฟล์ที่ระบุ
(packet `readSections` เป็น **path ตรง** เช่น `design\des-006.md`) **ห้าม ls ห้ามอ่านข้ามหมวด** —
grep ภายในไฟล์ที่ได้รับอนุญาตทำได้ · index ของหมวดคือแหล่งรายชื่อไฟล์เดียว · **Status อยู่ที่ index
เท่านั้น** — task status = คอลัมน์เดียวใน `plan\index.md` (ผู้เขียนตามโหมด: orchestrated = orchestrator คัดลอกจาก verdict ของ qa-engineer · solo = qa-engineer เขียนเอง), REQ status = `requirement\index.md`.

## Roles

ขอบเขตเขียนของทุก role มี **สองโซนเท่านั้น** (path แบบ `design\…` `plan\…` ในกติกาและ role prompt = ใต้ `knowledge\agent-team\`):

- **โซนเอกสาร = `knowledge\**`** — เขียนโดย role สายเอกสารตามตาราง
- **โซนงาน = `workspace\**`** — โค้ด pack และ orchestrator เขียนโดย engineer / setup / devops เท่านั้น

| Agent | Owns (writes) | Reads |
|---|---|---|
| `business-analyst` | `knowledge\agent-team\requirement\**`, `knowledge\agent-team\open-questions\**`, `knowledge\agent-team\index.md` | user, `requirement\index.md` + req/scope ที่เกี่ยว, qa/design สำหรับ amends |
| `system-analyst` | `knowledge\agent-team\design\**` | `requirement\index.md` + `scope.md` + req ที่ brief ชี้, real code/schema ใน `workspace\` |
| `project-manager` | `knowledge\agent-team\plan\**`, `knowledge\agent-team\backlog.md` (ยกเว้นคอลัมน์ Status ของ `plan\index.md` = ผลจาก qa) | design\, requirement |
| `test-planner` | `knowledge\agent-team\test-plan\**` (only when triggered) | requirement, design, plan |
| `uxui-designer` | `knowledge\agent-team\uxui\UX-*.md` drafts | requirement, design, design sources |
| `setup` | `workspace\**` (skeleton ครั้งเดียว + pack ตาม task เท่านั้น) | design, stack |
| `backend-engineer` | `workspace\**` | plan task, design\des ที่ task ชี้, requirement\req ที่ task ชี้, review/qa rounds |
| `frontend-engineer` | `workspace\**` | same + signed UX artifact + real backend contract |
| `reviewer` | `knowledge\agent-team\review\**` | requirement, design, plan task, changed code ใน `workspace\` |
| `qa-engineer` | `knowledge\agent-team\qa\**` + คอลัมน์ Status ของ `plan\index.md` (solo: เขียนเอง) | everything + real code + check results |
| `security` | `knowledge\agent-team\security.md` (ไฟล์เดียว) | requirement, design, real code |
| `devops` | `knowledge\agent-team\deploy.md`, infra files ใน `workspace\` | qa, security, plan, design |

**ห้ามเขียนนอกสองโซน** — โดยเฉพาะไฟล์ของทีมที่ราก (`CLAUDE.md`, `.claude\`, `policies\`, `templates\`): agent **อ่านได้ ห้ามแก้** ทีมนี้ปรับโดยเจ้าของ repo เท่านั้น ·
`workspace\` ทำเป็น solo mode เสมอ — ไม่มี orchestrated mode ที่ repo นี้ (Status ใน `plan\index.md` เขียนโดย qa-engineer เอง)

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
- **Write only where the active role allows.** Engineers never edit module docs; the Status column of `plan\index.md` comes only from `qa-engineer`'s verdict — solo: qa-engineer writes it; orchestrated: the orchestrator copies it.
- **Amend, never regenerate** an existing file: `Edit` the affected sub-file, add a dated Change Log line, update the index row if status changed.
- **Dates come from the user.** Ask once per session, reuse the answer. Never infer a date.
- **Unsourced numbers are assumptions** — mark `(สมมติฐาน — ยังไม่ยืนยัน)` until a person confirms.
- **Verify against real files, not memory.** If a recalled fact and the file disagree, the file wins.
- **Read index-first, then the exact paths.** Open only the files the brief/packet names (`policies/documentation.md` §5); no ls, no cross-category reading. Grep inside allowed files.
- **Handoffs are short**: lead with the result; explain only what the next reader must decide.

## Where things are

- `policies/*.md` — shared rules; read the section you need (`policies/README.md` is the index).
- `templates/*.md` — skeletons for every document unit (1 file ย่อย ต่อ template). Copy one; don't invent a new shape.
- `.claude/agents/*.md` — role prompts.
