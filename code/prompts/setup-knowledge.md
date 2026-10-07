# Setup prompt — onboarding knowledge (DES-015)

prompt นี้รันจากที่ติดตั้ง (packRoot) — ผูก knowledge root ของเครื่องนี้เข้า registry: ชี้ path → ตรวจ/สร้างโครง module ตาม DES-014 → append รายการลง `sta-config.json` (machine-local) · ไม่ implement feature ใด ๆ

## Path ที่ใช้

- ไฟล์นี้อยู่ที่ `<packRoot>\prompts\setup-knowledge.md` → **packRoot = โฟลเดอร์แม่ของ `prompts\`**
- registry: `<packRoot>\sta-config.json` (machine-local — gitignored ไม่ commit)
- templates: `<packRoot>\templates\` — คัด verbatim ไม่ invent รูปใหม่

## Input ที่ต้องได้จากผู้ใช้ (ถามให้ครบก่อนแตะไฟล์ใด)

1. `name` ของ knowledge root — ต้องไม่ซ้ำกับที่มีอยู่ใน `knowledge_roots`
2. `path` ราก knowledge — absolute path
3. `targets` (ถ้ามี) — รายการ `name` + absolute path ของโปรเจกต์โค้ดที่ knowledge นี้ดูแล
4. ชื่อ module ที่ต้องการตรวจ/สร้างโครงให้ภายใต้ knowledge root (ถ้าไม่ระบุ = ข้ามขั้น 2)

## ขั้น 1 — ตรวจ path จริงก่อนเขียนอะไร (fail-closed — DES-015)

- ตรวจทุก path จาก Input (knowledge root + target ทุกตัว) ด้วย `stat`: ต้องมีจริงบนดิสก์และเป็น directory
- path ใดไม่ผ่าน → **ปฏิเสธทันที**: รายงาน path ที่ตกพร้อมเหตุผล แล้วจบ — **ห้ามเขียน/แก้ไฟล์ใดเลย** (ทั้ง `sta-config.json` และโครง module)
- **ห้ามสร้าง/clone/init path เอง** — ผู้ใช้ต้องสร้าง folder จริงก่อน แล้วรัน prompt นี้ซ้ำ

## ขั้น 2 — ตรวจ/สร้างโครง module ตาม DES-014 (ทำเฉพาะเมื่อ Input 4 ระบุ)

โครงอยู่ที่ `<knowledge-root>\<module>\` — สร้างเฉพาะสิ่งที่ยังไม่มี **ไฟล์ที่มีอยู่แล้วห้ามทับ** (เป็นของ role เจ้าของ) — แหล่งรูป: `CLAUDE.md` §โครงเอกสาร + `DES-014`

| ส่วน | ต้นแบบ | owner ผู้เขียนจริง |
|---|---|---|
| `index.md` (ราก module) | ไม่มี template — สร้าง stub สารบัญล้วนตามด้านล่าง | business-analyst |
| `requirement\index.md` | `templates\requirement-index.md` | business-analyst |
| `requirement\scope.md` | `templates\requirement-scope.md` | business-analyst |
| `design\index.md` | `templates\design-index.md` | system-analyst |
| `design\data-model.md` | `templates\design-data-model.md` | system-analyst |
| `plan\index.md` | `templates\plan-index.md` — ตาราง Tasks หัวตรง 6 คอลัมน์ `Task\|Name\|Owner\|Phase\|Depends\|Status` (AC-036) | project-manager |
| `open-questions\index.md` | `templates\oq-index.md` | business-analyst |
| `test-plan\index.md` | ไม่มี template index — สร้าง stub พร้อมหัวตารางตรงตัว `\| TP \| Phase \| REQ/AC \| ไฟล์ \|` | test-planner |
| `review\index.md` | ไม่มี template index — หัวตาราง finding ตรงตัว `\| ID \| Task \| Severity \| ไฟล์ \|` | reviewer |
| `qa\index.md` | ไม่มี template index — หัวตาราง finding ตรงตัว `\| ID \| Task \| Severity \| ไฟล์ \|` | qa-engineer |
| `backlog.md` | `templates\backlog.md` | append-only ใครก็เพิ่มแถวได้ |

โฟลเดอร์ที่สร้าง: `requirement\`, `design\`, `plan\`, `test-plan\`, `review\`, `qa\`, `open-questions\`

**ไม่สร้าง** (role เจ้าของทำเองตาม task — ใช้ template ตามชื่อไฟล์): `requirement\req-*.md` (`requirement-req.md`) · `design\des-*.md` (`design-des.md`) · `plan\<task-id>.md` (`plan-task.md`) · `review\round-N.md` (`review-round.md`) · `qa\round-N.md` (`qa-round.md`) · `test-plan\<slug>.md` (`test-plan.md`) · `uxui\UX-*.md` (`ux-artifact.md`) · `security.md` · `deploy.md`

Stub module `index.md` (แทน `<ชื่อ module>` ด้วยชื่อจริง):

```markdown
# <ชื่อ module> — Module Index

> หน่วยอ่าน = ไฟล์ · สารบัญล้วน — เนื้อหา module-level ทั้งหมดอยู่ที่ `requirement\scope.md` · เขียนโดย `business-analyst`
> วิธีอ่าน: อ่าน index ของหมวดที่ packet/brief ชี้ก่อน แล้วเปิดเฉพาะไฟล์ที่ระบุ — ห้าม ls ห้ามอ่านข้ามหมวด

## Documents

| ไฟล์ | เนื้อหา | สถานะ |
|---|---|---|
| `requirement\index.md` | สารบัญ requirement — ตาราง REQ + สถานะ + AC | โครงพร้อม |
| `requirement\scope.md` | เนื้อหา module-level | โครงพร้อม |
| `design\index.md` | สารบัญ design — feasibility + ตาราง DES | โครงพร้อม |
| `plan\index.md` | สารบัญ plan — release scope, phases, ตาราง Tasks 6 คอลัมน์ | โครงพร้อม |
| `test-plan\index.md` | สารบัญ test plan — ตาราง TP | โครงพร้อม |
| `review\index.md` | สารบัญ review findings | โครงพร้อม |
| `qa\index.md` | สารบัญ QA findings | โครงพร้อม |
| `open-questions\index.md` | สารบัญ OQ | โครงพร้อม |
| `backlog.md` | งานที่ทำทีหลัง (append-only) | โครงพร้อม |

## Change Log

- <วันที่จากผู้ใช้> — สร้างโครง module โดย setup prompt (onboarding knowledge — DES-015)
```

## ขั้น 3 — เขียน `sta-config.json` แบบ append รายการ

1. อ่านไฟล์เต็ม → `JSON.parse`
   - ไฟล์**ไม่มี** → ถาม `main_root` จากผู้ใช้ แล้วสร้าง config ใหม่ที่มี `knowledge_roots: []` (fallback ตาม DES-015)
   - ไฟล์มีแต่ **parse ไม่ผ่าน (corrupt)** → หยุดแจ้งผู้ใช้ — **ไม่ทับเอง** (machine-local — คนต้องตัดสิน)
2. ถ้า `name` ซ้ำกับ knowledge root ที่มีอยู่ → หยุดถามผู้ใช้ (ห้ามเขียนทับรายการเดิม)
3. เพิ่มรายการใหม่**ท้าย** `knowledge_roots[]`:

```json
{ "name": "<name>", "path": "<path>", "targets": [ { "name": "<name>", "path": "<path>" } ] }
```

- keys เฉพาะ schema — root: `main_root`, `knowledge_roots` · knowledge root: `name`, `path`, `targets` · target: `name`, `path`
- **ห้ามเขียน key อื่นโดยเด็ดขาด — โดยเฉพาะ `gituse` และ `git`**: validator ของ orchestrator (`agent-team\src\core\config.ts` `validateStaConfig` — exact keys) ปฏิเสธ key นอก schema · `gituse` เป็นของ REQ-009 เลื่อน release ถัดไป (backlog BL-017) — ไม่ใช่หน้าที่ prompt นี้
- `targets: []` ได้ถ้าผู้ใช้ไม่มี — เพิ่มทีหลังด้วยการแก้ไฟล์ (machine-local)
- เขียนคืน**ทั้งไฟล์** `JSON.stringify(config, null, 2)` + บรรทัดว่างท้าย — path เก็บรูป `C:/...` (forward slash) ตามรายการเดิม
- **รายการเดิมทุก key/ค่าต้องคงอยู่ครบ** — แก้แค่ "เพิ่มรายการ" ไม่ regenerate เนื้อหาอื่น

## ขั้น 4 — ตรวจหลังเขียน (บังคับ)

1. อ่านไฟล์กลับ → `JSON.parse` ผ่าน
2. รายการเดิมครบ: เทียบกับสิ่งที่อ่านไว้ก่อนเขียน (ทุก knowledge root และ targets ของมัน)
3. รายการใหม่อยู่ครบตาม schema (name/path/targets)
4. แนะนำ — พิสูจน์ผ่าน loader จริงของ orchestrator เมื่อ packRoot มี `agent-team\` (รันที่ `agent-team\`):

```
npx tsx -e "const {loadStaConfig, resolveRunRoots} = require('<packRoot>/agent-team/src/core/config.ts'); const c = loadStaConfig('<packRoot>/sta-config.json'); console.log(JSON.stringify(resolveRunRoots(c, {knowledge: '<name>', target: '<target-name>'}), null, 2));"
```

5. รายงานจบ: path ที่ลงทะเบียน, โครง module ที่สร้าง/ข้าม (ไฟล์ไหนมีอยู่แล้ว), ผลตรวจข้อ 1–4

## ขอบเขตเขียนของ prompt นี้

- เขียนได้เฉพาะ: `<packRoot>\sta-config.json` (append รายการ) + โครง module ใหม่ภายใต้ knowledge root ที่ผู้ใช้ชี้ (เฉพาะไฟล์ที่ยังไม่มี)
- ห้าม: แก้โค้ด orchestrator · แก้เอกสาร module ที่มีอยู่ · git ทุกชนิด · เขียน path ที่ไม่มีจริง · แตะ `sta-config.json` ของ deployment อื่น
