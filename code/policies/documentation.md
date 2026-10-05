# Policy — Documentation

## 1. The module folder — split layout (DES-014)

All module documents live under `knowledge\<kebab-name>\` as **ไฟล์ย่อย + index เป็นสารบัญ** — หน่วยอ่าน
เล็กที่สุดคือไฟล์จริงหนึ่งไฟล์. Only `business-analyst` creates a module folder. Every other agent
resolves an existing one: exactly one folder → use it; several → ask the user which; none → stop and
send the user to `business-analyst`.

A module folder is a **delivery unit** with its own business conversation (purpose, users, a scope
that could ship or be cancelled alone). A `modules.md` entry inside `design\` is a feature group
within one delivery unit. When unsure, ask, and record the reason in `requirement\scope.md`.

```
knowledge\<module>\
├── index.md            ← สารบัญหลัก — สารบัญล้วน (ลิงก์ index ย่อย + change log + วิธีอ่าน)
├── requirement\        ← index.md + scope.md + req-NNN.md…
├── design\             ← index.md + data-model.md + des-NNN.md… + modules.md + quality-attributes.md + risks.md + archive.md
├── plan\               ← index.md + <task-id>.md…
├── test-plan\ review\ qa\   ← โครงเดียวกัน (qa/review แตกต่อ round: round-N.md)
├── open-questions\     ← index.md + oq-<id>.md…
├── uxui\               ← UX-NNN-<slug>.md
└── security.md  deploy.md  backlog.md   ← ไฟล์เดี่ยว (backlog append-only)
```

Writer ต่อไฟล์/โฟลเดอร์ — เขียนได้เฉพาะที่ role ตัวเองเป็นเจ้าของ:

| ไฟล์ / โฟลเดอร์ | Writer | Holds |
|---|---|---|
| `<module>\index.md` | business-analyst | สารบัญหลัก module — ลิงก์ index ย่อย + change log + วิธีอ่าน |
| `requirement\index.md` | business-analyst | ตาราง REQ: id\|ชื่อ\|status\|AC\|ไฟล์ — **REQ status อยู่ที่นี่เท่านั้น** |
| `requirement\scope.md` | business-analyst | Overview · Target Users · Release Scope · Constraints · Declined · References (เนื้อหา module-level) |
| `requirement\req-NNN.md` | business-analyst | 1 REQ + AC ของมัน ต่อ 1 ไฟล์ |
| `open-questions\index.md` + `oq-<id>.md` | business-analyst | ตาราง OQ + คำถาม/คำตอบเต็ม 1 ข้อต่อ 1 ไฟล์ |
| `design\index.md` | system-analyst | Feasibility + ตาราง DES + how-to-read |
| `design\data-model.md` | system-analyst | schema contract — qa อ่านเต็มทุกรอบ |
| `design\des-NNN.md` | system-analyst | 1 contract ต่อ 1 ไฟล์ |
| `design\modules.md` · `quality-attributes.md` · `risks.md` · `archive.md` | system-analyst | กลุ่ม feature · quality attributes · risks · ของที่ปิดแล้ว verbatim |
| `plan\index.md` | project-manager (**คอลัมน์ Status: qa-engineer เท่านั้น**) | Release Scope · Waiting on Human · phases · ตาราง task: id\|status |
| `plan\<task-id>.md` | project-manager | 1 task ต่อ 1 ไฟล์ |
| `test-plan\*` | test-planner | shared test strategy (trigger-based) |
| `uxui\UX-NNN-*.md` | uxui-designer (sign-off: คน) | UX drafts |
| `review\round-N.md` | reviewer | findings + verdict ต่อรอบ |
| `qa\round-N.md` | qa-engineer | checks · per-task results · open issues ต่อรอบ |
| `security.md` | security | findings, accepted risks (ไฟล์เดียวต่อ module) |
| `deploy.md` | devops | environments, runbook, deploy history (ไฟล์เดียว) |
| `backlog.md` | project-manager (role อื่น append ได้ — append-only) | everything not in the current release |

Templates for each are in `templates\`. Use them; don't invent a new shape.

## 2. Dates

You don't reliably know today's date. Before writing any dated entry, ask the user once per session
and reuse the answer, in `YYYY-MM-DD`. Never estimate it, and never copy it from another entry.

## 3. Amend the sub-file, never regenerate

Once a file exists you amend it:

- `Edit` only the sub-file your change affects. Never `Write` over an existing file — that destroys other roles' work and history.
- Append a dated line to the `## Change Log` of the file you touched; don't rewrite existing entries (moving them to an archive is allowed, §4).
- Status lives at the index, single-writer: `plan\index.md`'s Status column — `project-manager` writes `pending`; only `qa-engineer` writes `verified` or `blocked`. Engineers report progress in their handoff and never edit `plan\index.md`. REQ status lives in `requirement\index.md` (BA).
- `qa-engineer` may add a `🔒 Security gate` to a phase in `plan\index.md`, never remove one.
- Because status files are small and separate, the post-run write audit reads the whole diff and can enforce single-writer for real — a violation stops the run.

## 4. Size budget, index formula, archiving

Every run re-reads these files from scratch, so size is paid on every run. Unit budgets, measured as
file size (`wc -c`; Thai text is ~3 bytes per character):

| หน่วย | Budget |
|---|---|
| `requirement\req-NNN.md` | 4 KB |
| `open-questions\oq-<id>.md` | 4 KB |
| `plan\<task-id>.md` | 4 KB |
| `requirement\scope.md` | 12 KB |
| `design\des-NNN.md` | 8 KB |
| `qa\` / `review\` / `test-plan\` round files | 10 KB ต่อไฟล์ |
| `design\data-model.md` | 15 KB |

**Index ทุกตัวคำนวณด้วยสูตร:**

```
budget(index) = (median ขนาดไฟล์ย่อยที่ index นั้นระบุ × 0.75) × จำนวนไฟล์ + 2 KB
```

- **median ไม่ใช่ mean** — กันไฟล์ใหญ่ตัวเดียวดึงเฉลี่ย.
- **+2 KB** — หัวไฟล์ + วิธีอ่าน + Change Log pointer ที่มีทุก index.
- **1 แถว = 1 บรรทัด** — แถวไหนต้องเขียนยาว = เนื้อหานั้นอยู่ในไฟล์ย่อย ไม่ใช่ index.
- Index เกิน budget = แตกหมวดนั้นเพิ่มหรือตัด scope · unit file เกิน budget = ตัด/แตกเพิ่ม.

**Archive continuously, not later.** Move closed material verbatim — never summarize, never delete:

- `design\` → `design\archive.md`: a question-and-answer record once its rule lives in a contract file (do it in the same amend that settles it); Change Log entries of superseded revisions.
- `qa\` / `review\` / `test-plan\`: a superseded round stays as its own file, untouched — that file **is** the archive; live open issues and undeployed unverified behaviour stay current in the latest round file.
- `security.md` / `deploy.md` (ไฟล์เดี่ยว): closed rounds/eras move verbatim to `security\archive.md` / `deploy\archive.md` with a one-line pointer.

**Two-way rule:** ทุก id ในไฟล์ย่อยต้องปรากฏใน index ของหมวด และกลับกัน — index กับไฟล์จริงต้องตรงกัน
สองทาง (validator ตรวจ) · ไม่ครบ = fail-closed, run หยุดรอคน. Never read an archive file at normal
startup — only when a specific open item sends you there.

**Over budget after archiving means the release is too big.** Stop adding scope; raise it with the
user as a release-cut decision.

## 5. Read index-first, then the exact paths you are given

The packet/brief's `readSections` is a **path list** (เช่น `design\des-006.md`). อ่าน index ของหมวดที่ถูก
ชี้ก่อน แล้วเปิดเฉพาะไฟล์ที่ระบุเท่านั้น — **ห้าม ls ห้ามอ่านข้ามหมวด** (grep ภายในไฟล์ที่ได้รับอนุญาต
ทำได้) · index ของหมวดคือแหล่งรายชื่อไฟล์เดียว. Search for the id (`REQ-`, `AC-`, `DES-`, task id)
with grep before opening anything bigger than you need.

- `plan\index.md`: `## Release Scope`, `## Waiting on Human`, phases, ตาราง Tasks.
- `design\index.md`: feasibility + ตาราง DES — ใช้เลือก `des-*.md` ที่ task ระบุ; `qa-engineer` อ่าน `design\data-model.md` เต็มทุกรอบ.
- `qa\` / `review\`: latest round file first (`## Open Issues` / `## Open Findings`).

Owners (`system-analyst` for `design\`, `project-manager` for `plan\`) read more when amending —
still file by file, plus a grep for every id the change touches.

## 6. Language

Talk to the user in Thai, and write every module document in Thai. Keep technical vocabulary in
English: identifiers, field/model names, file paths, stack terms (endpoint, migration, schema), code
blocks. Amending a document written in another language doesn't mean retranslating it.

## 7. Handoff messages are concise

The message an agent ends with leads with the result: what changed, what's blocking, who's next — a
few lines. Explain reasoning only where the next reader has to decide something. This governs the
chat message, not the document.
