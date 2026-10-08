// BE-020 — minimum context loader: ID → ไฟล์ (DES-020)
// คำนวณ readSections ของทุก packet จาก **ID ที่ถูกอ้าง** ผ่าน index ของหมวด (แหล่งรายชื่อเดียว — DES-014)
// — agent ไม่เลือกไฟล์เอง · หน่วย = ไฟล์ (ไม่ resolve section ในไฟล์ — data-model.md อ่านทั้งไฟล์เมื่อถูกอ้าง)
// อ่านอย่างเดียว ไม่เขียนไฟล์ใด (AC-035 — ลบ session log ทิ้ง context เท่าเดิม)
// fail-closed (AC-048): id หาไม่เจอ / index ชี้ไฟล์ที่ไม่มี / index parse ไม่ผ่าน → error (id + index ที่หา) — ไม่เดาไฟล์
// path สร้างผ่าน knowledge-paths (BE-002) · parse plan\index.md ผ่าน plan-parser (BE-018) — ไม่เขียน parser ซ้ำ
// regex id + ลำดับ resolve เมื่อ id ชน = DES-020 Rev 11 (plan-parser จับเฉพาะ REQ/AC/DES/TP/UX — ไม่ครอบ REV/QA/รูปหมวดนำ)
// แถว execution: uxui (REV-036) — UX artifact ที่แก้ของเดิม resolve เดียวกับ FE · artifact ใหม่ยังไม่มีไฟล์ = 0-hit
// ไม่ resolve (fail-closed ไม่เดา path — driver ส่ง path ของ artifact ใหม่ใน brief) · attachments เหมือนแถว execution
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { KnowledgePathError, moduleDir, resolveDocPath, type DocUnit, type DocsLayout } from "./knowledge-paths.ts";
import { parsePlanIndex, ROLES, splitRow, type PlanIndex } from "./plan-parser.ts";

export type SessionKind = "change" | "execution" | "review" | "qa" | "feature-qa" | "security" | "record-only";
export type Role = (typeof ROLES)[number];

// ชนิดของไฟล์บริบท — บันทึกลง contextFiles เพื่อให้คนตรวจ AC-046/AC-047 เห็นชนิดที่ resolve (เช่น task vs finding)
export type ContextKind =
  | "index" | "task" | "req" | "ac" | "des" | "tp" | "rev" | "qa" | "ux"
  | "data-model" | "scope" | "oq-index" | "security" | "deploy";

export interface ContextEntry { id: string | null; kind: ContextKind; path: string }
export interface ContextError { id: string; index: string; message: string }

export interface DefectFindingRef {
  id: string; // REV-NNN / QA-NNN — resolve ตามชนิด field เสมอ (DES-020 ข้อ 1) แม้ id นั้นชนกับ task id
  reference?: string | null; // ข้อความอิสระ (DES/REQ/AC id) — ข้อ 2/3
  reproduce?: { tp?: string | null } | null; // TP-NNN — resolve เป็น TP เสมอ
}

export interface DefectPacketRef {
  taskId: string;
  source: "review" | "qa" | "feature-qa";
  roundFile: string;
  findings: DefectFindingRef[];
}

export interface ContextRefs {
  blockerReference?: string | null; // blocker.reference — ข้อความอิสระ
  newWorkText?: string | null; // BA งานใหม่ — REQ ที่ข้อความอ้าง
  defectPacket?: DefectPacketRef | null; // execution (fix session) — defect packet ที่แนบ
  changedDocs?: string[]; // PM — DES ที่ SA เปลี่ยน (จาก handoff SA changedDocs)
  reviewRefs?: string[]; // qa — REV ids จาก verdict review รอบล่าสุด (REV ids เท่านั้น — DES-020)
  planPhase?: string | null; // feature-qa — TP ของ phase (คอลัมน์ Phase ในตาราง TP ของ test-plan\index.md)
  priorSession?: { sessionId: string; touchedFiles: string[] } | null; // execution restart — ไฟล์แนบ
  reviewInput?: boolean; // review — code/diff แนบ (label เท่านั้น)
  phaseChangedFiles?: string[]; // security — รายชื่อไฟล์ที่เปลี่ยนใน phase (ไฟล์แนบ)
}

export interface ContextLoad {
  readSections: string[]; // path ตรง สัมพัทธ์ module folder (DES-012/014) — ว่างเมื่อ error (ไม่ dispatch)
  contextFiles: string[]; // AC-047 — ไฟล์ใน packet (พร้อมชนิดของ id ที่ resolve) + ไฟล์แนบ — SessionRecord.contextFiles + บรรทัดแรกของ session log
  resolved: ContextEntry[]; // structured ต่อ id ที่ resolve — BE-006/BE-011 ใช้ต่อ
  attachments: string[]; // label ไฟล์แนบ (defect/priorSession/reviewInput/changedFiles)
  error: ContextError | null; // null = ผ่าน · ไม่ null = hold context-error (fail-closed AC-048)
}

class ContextFail extends Error {
  constructor(readonly id: string, readonly index: string, message: string) {
    super(message);
    this.name = "ContextFail";
  }
}

// path สัมพัทธ์ module folder รูปเดียวกับ contract (DES-012: ["design\\index.md", …]) — backslash ทุกแพลตฟอร์ม
const toRel = (dir: string, abs: string): string => path.relative(dir, abs).split(path.sep).join("\\");

// ตัด markdown ห่อในเซลล์ index: [text](link) · `code` · **bold** (รูปเดียวกับ docs-validator)
const cleanCell = (c: string): string => c.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").trim();

interface Table { header: string[]; rows: string[][] }

// ตาราง markdown ทั้งหมดในไฟล์ — เซลล์ผ่าน splitRow ของ plan-parser (แหล่งเดียว ไม่เขียน parser ซ้ำ)
function allTables(text: string): Table[] {
  const ls = text.split(/\r?\n/);
  const out: Table[] = [];
  for (let i = 0; i < ls.length; i++) {
    if (!ls[i]!.trimStart().startsWith("|")) continue;
    if (i > 0 && ls[i - 1]!.trimStart().startsWith("|")) continue; // แถวกลางตารางเดิม
    const header = splitRow(ls[i]!).map(cleanCell);
    const rows: string[][] = [];
    for (let k = i + 1; k < ls.length && ls[k]!.trimStart().startsWith("|"); k++) {
      const cells = splitRow(ls[k]!).map(cleanCell);
      if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // แถวคั่น header
      rows.push(cells);
    }
    out.push({ header, rows });
  }
  return out;
}

const CATEGORY_ID = /^(REQ|AC|DES|TP|REV|QA)-\d{3}$/; // regex ของ DES-020 (เทียบหลัง uppercase)
const TASK_TOKEN = /\b[A-Za-z][A-Za-z0-9]*-\d+\b/g; // ตัวเลือก task id — ตัดสินด้วยคอลัมน์ Task ของ plan\index.md เท่านั้น
const PREFIXED_TOKEN = /\b(qa|review|test-plan):(QA|REV|TP)-\d{3}\b/g; // DES-020 Rev 11 — รูปมีหมวดนำ
const UX_ID = /^UX-\d{3}$/;
const DATA_MODEL_TOKEN = /\bdata-model\.md\b/g; // แถว `data-model` ของตาราง resolve — ชื่อไฟล์ตรง
const DEFECT_ID = /^(REV|QA)-\d{3}$/i;
const TP_ID = /^TP-\d{3}$/i;
const REV_ONLY = /^REV-\d{3}$/i;

interface Token { text: string; kind: ContextKind; explicit?: boolean }
// explicit = รูปมีหมวดนำ (DES-020 Rev 11 ข้อ 3) หรือ field ที่มีชนิด (ข้อ 1 — findings[].id / reproduce.tp /
// reviewRefs / TP ของ phase) — resolve ตามชนิดนั้นเสมอ และคงอยู่แม้ไม่อยู่ใน keep-list ของแถว role

// ตัด id จากข้อความอิสระ — ลำดับ resolve เมื่อ id ชน (DES-020 Rev 11 ข้อ 1–3):
// (1) รูปมีหมวดนำ qa:/review:/test-plan: → resolve ในหมวดนั้นเท่านั้น (span ถูกตัดออกจากการสแกน token เปลือกนอก)
// (2) token ตรงคอลัมน์ Task ของ plan\index.md → task id ก่อนเสมอ ทุก prefix
// (3) ที่เหลือ → หมวดตาม regex REQ|AC|DES|TP|REV|QA-NNN · UX-NNN · data-model.md
function extractTokens(text: string, taskIds: ReadonlySet<string>): Token[] {
  const out: Token[] = [];
  const seen = new Set<string>();
  const push = (t: Token): void => {
    const key = `${t.kind}:${t.text}`;
    if (!seen.has(key)) { seen.add(key); out.push(t); }
  };
  const spans: [number, number][] = [];
  for (const m of text.matchAll(PREFIXED_TOKEN)) {
    spans.push([m.index!, m.index! + m[0]!.length]);
    const cat = m[1]!.toLowerCase();
    push({ text: m[0]!.slice(m[1]!.length + 1).toUpperCase(), kind: cat === "qa" ? "qa" : cat === "review" ? "rev" : "tp", explicit: true });
  }
  const inPrefixed = (i: number): boolean => spans.some(([a, b]) => i >= a && i < b);
  for (const m of text.matchAll(TASK_TOKEN)) {
    if (inPrefixed(m.index!)) continue;
    const raw = m[0]!;
    const id = taskIds.has(raw) ? raw : taskIds.has(raw.toUpperCase()) ? raw.toUpperCase() : null;
    if (id !== null) { push({ text: id, kind: "task" }); continue; } // ข้อ 2 — task ก่อนเสมอ
    const cat = CATEGORY_ID.exec(raw.toUpperCase());
    if (cat) push({ text: cat[0], kind: cat[1]!.toLowerCase() as ContextKind });
    else if (UX_ID.test(raw.toUpperCase())) push({ text: raw.toUpperCase(), kind: "ux" });
  }
  for (const m of text.matchAll(DATA_MODEL_TOKEN)) {
    if (!inPrefixed(m.index!)) push({ text: "data-model", kind: "data-model" });
  }
  return out;
}

// body ของ `## References` ใน task file (แหล่ง id ตาม DES-020 — id ในหัวข้ออื่นไม่นับ) · null = ไม่มีหัวข้อ
function referencesSection(text: string): string | null {
  const ls = text.split(/\r?\n/);
  const i = ls.findIndex((l) => /^##\s+references\b/i.test(l));
  if (i < 0) return null;
  let end = ls.length;
  for (let j = i + 1; j < ls.length; j++) if (/^##\s/.test(ls[j]!)) { end = j; break; }
  return ls.slice(i + 1, end).join("\n");
}

type RowName = "execution" | "uxui" | "ba" | "sa" | "pm" | "test-planner" | "review" | "qa" | "feature-qa" | "security" | "devops-stage";

interface RowCfg {
  bases: string[]; // ไฟล์โครงตามแถวตาราง DES-020 (ยืนยันบนดิสก์ — หาย = context-error)
  trailing: string[]; // ไฟล์โครงที่อยู่หลัง id ที่อ้างในแถว (ใส่ก่อน task/resolved — index-first)
  tasks: boolean; // แนบ task file ของ taskIds
  refKinds: ContextKind[]; // ชนิด id ที่รับจาก ## References ของ task file
  blockerKinds: ContextKind[]; // ชนิด id ที่รับจาก blocker.reference (ข้อความอิสระ)
  ux: boolean; // UX artifact เมื่อ task อ้าง UX-NNN (FE — แถว execution · uxui — แถว uxui REV-036)
}

// index ของหมวดที่ module อาจยังไม่มี (fallback DES-020: อ้าง id เข้าหมวดนี้ไม่ได้ → context-error แต่ไม่ถือเป็นไฟล์โครงหาย)
// เปิด session แรกของ role เจ้าของจึงสร้าง index เองได้ — id ใดอ้างเข้าหมวดที่ยังไม่มีก็ยัง fail-closed เสมอ
const OPTIONAL_INDEXES: ReadonlySet<string> = new Set<string>(["oq-index", "test-plan-index", "review-index", "qa-index"]);

export function loadContext(
  target: { docsRoot: string; layout: DocsLayout; module: string },
  kind: SessionKind,
  role: Role,
  taskIds: readonly string[],
  refs: ContextRefs = {},
): ContextLoad {
  const fail = (id: string, index: string, message: string): ContextLoad => ({
    readSections: [], contextFiles: [], resolved: [], attachments: [],
    error: { id, index, message },
  });
  try {
    return compute(target, kind, role, taskIds, refs);
  } catch (e) {
    if (e instanceof ContextFail) return fail(e.id, e.index, e.message);
    if (e instanceof KnowledgePathError) return fail("*", "-", e.message);
    throw e;
  }
}

function compute(
  target: { docsRoot: string; layout: DocsLayout; module: string },
  kind: SessionKind,
  role: Role,
  taskIds: readonly string[],
  refs: ContextRefs,
): ContextLoad {
  if (target.layout !== "split") {
    throw new ContextFail("*", "-", `docsLayout ${JSON.stringify(target.layout)} ไม่รองรับ — ตาราง resolve ของ DES-020 เป็นรูป split (DES-014)`);
  }
  const dir = moduleDir(target.docsRoot, target.layout, target.module);
  const rel = (unit: DocUnit, name?: string): string => toRel(dir, resolveDocPath(target.docsRoot, target.layout, target.module, { unit, name }));
  // index ของหมวด round/TP ไม่มี unit ตายตัวใน DOC_UNITS (knowledge-paths) — ใช้ unit ของไฟล์ย่อย + ชื่อ index.md
  const INDEX_REF: Record<string, { unit: DocUnit; name?: string }> = {
    "plan-index": { unit: "plan-index" },
    "requirement-index": { unit: "requirement-index" },
    "design-index": { unit: "design-index" },
    "oq-index": { unit: "oq-index" },
    "test-plan-index": { unit: "test-plan", name: "index.md" },
    "review-index": { unit: "review-round", name: "index.md" },
    "qa-index": { unit: "qa-round", name: "index.md" },
  };
  const relIndex = (label: string): string => {
    const r = INDEX_REF[label];
    return r ? rel(r.unit, r.name) : rel(label as DocUnit);
  };
  const absOf = (relPath: string): string => path.join(dir, ...relPath.split("\\"));
  const existsRel = (p: string): boolean => existsSync(absOf(p));
  const readRel = (p: string): string | null => {
    const f = absOf(p);
    return existsSync(f) ? readFileSync(f, "utf8") : null;
  };

  // --- plan\index.md — แหล่ง task id เดียว (แถวของตาราง resolve) ---
  const planRel = relIndex("plan-index");
  const planText = readRel(planRel);
  if (planText === null) throw new ContextFail("*", planRel, `ไม่พบ ${planRel} — resolve task id ไม่ได้ (fail-closed — DES-020)`);
  const plan: PlanIndex = parsePlanIndex(planText, absOf(planRel));
  if (plan.format === "invalid") {
    throw new ContextFail("*", planRel, `parse ${planRel} ไม่ผ่าน (fail-closed): ${plan.issues[0]?.message ?? "header ไม่ตรงรูป plan v2"}`);
  }
  const taskSet = new Set(plan.rows.map((r) => r.id));
  for (const t of taskIds) {
    if (!taskSet.has(t)) throw new ContextFail(t, planRel, `task id ${t} ไม่อยู่ในคอลัมน์ Task ของ ${planRel} (fail-closed — ไม่เดาไฟล์)`);
  }

  if (kind === "record-only") {
    // session จด gate — packet มีข้อมูล gate ตรงตัว ไม่มีบริบทเอกสาร (ตาราง DES-020 ไม่มีแถวนี้ — คืนว่าง)
    return { readSections: [], contextFiles: [], resolved: [], attachments: [], error: null };
  }

  // --- เลือกแถวตาราง DES-020 (ตายตัว) ---
  const row: RowName =
    role === "devops" && taskIds.length === 0 ? "devops-stage" // stage release (ไม่ผูก task) — แถว devops
    : kind === "execution" && (["backend-engineer", "frontend-engineer", "setup", "devops"] as readonly string[]).includes(role) ? "execution"
    : kind === "execution" && role === "uxui-designer" ? "uxui" // REV-036 — แถว execution: uxui
    : kind === "change" && role === "business-analyst" ? "ba"
    : kind === "change" && role === "system-analyst" ? "sa"
    : kind === "change" && role === "project-manager" ? "pm"
    : role === "test-planner" ? "test-planner"
    : kind === "review" && role === "reviewer" ? "review"
    : kind === "qa" && role === "qa-engineer" ? "qa"
    : kind === "feature-qa" && role === "qa-engineer" ? "feature-qa"
    : kind === "security" && role === "security" ? "security"
    : (() => { throw new ContextFail("*", "-", `kind ${kind} + role ${role} ไม่ตรงตาราง context ของ DES-020 (fail-closed)`); })();

  const CFG: Record<RowName, RowCfg> = {
    execution: { bases: ["plan-index"], trailing: [], tasks: true, refKinds: ["req", "ac", "des", "task"], blockerKinds: ["req", "ac", "des", "task"], ux: role === "frontend-engineer" },
    // REV-036 — req index + scope + design index + task file ที่ dispatch ผูก + REQ/DES ที่อ้าง · UX artifact
    // เมื่อ task อ้าง UX-NNN (resolve เดียวกับ FE) · attachments (defect/priorSession) เหมือนแถว execution
    uxui: { bases: ["requirement-index", "requirement-scope"], trailing: ["design-index"], tasks: true, refKinds: ["req", "ac", "des", "task"], blockerKinds: ["req", "ac", "des", "task"], ux: true },
    ba: { bases: ["requirement-index", "requirement-scope"], trailing: ["oq-index"], tasks: false, refKinds: [], blockerKinds: ["req", "ac"], ux: false },
    sa: { bases: ["requirement-index", "requirement-scope"], trailing: ["design-index", "design-data-model"], tasks: false, refKinds: [], blockerKinds: ["req", "ac", "des"], ux: false },
    pm: { bases: ["plan-index", "design-index", "requirement-index"], trailing: [], tasks: true, refKinds: [], blockerKinds: ["task", "des"], ux: false },
    "test-planner": { bases: ["plan-index"], trailing: ["test-plan-index"], tasks: true, refKinds: ["req", "ac", "des"], blockerKinds: [], ux: false },
    review: { bases: [], trailing: ["review-index"], tasks: true, refKinds: ["req", "ac", "des"], blockerKinds: [], ux: false },
    qa: { bases: ["design-data-model"], trailing: ["qa-index"], tasks: true, refKinds: ["req", "ac", "tp"], blockerKinds: [], ux: false },
    "feature-qa": { bases: ["plan-index"], trailing: ["qa-index"], tasks: true, refKinds: ["req", "ac"], blockerKinds: [], ux: false },
    security: { bases: ["security"], trailing: [], tasks: false, refKinds: ["des"], blockerKinds: [], ux: false },
    "devops-stage": { bases: ["deploy", "plan-index"], trailing: ["security"], tasks: false, refKinds: [], blockerKinds: [], ux: false },
  };
  const cfg = CFG[row];

  const BASE_KIND: Partial<Record<string, ContextKind>> = {
    "plan-index": "index", "requirement-index": "index", "design-index": "index",
    "test-plan-index": "index", "review-index": "index", "qa-index": "index",
    "requirement-scope": "scope", "design-data-model": "data-model", "oq-index": "oq-index",
    security: "security", deploy: "deploy",
  };

  // --- ประกอบผลลัพธ์ — ลำดับ: ไฟล์โครง (bases → devops qa round → trailing) → task file → ไฟล์จาก id ที่อ้าง ---
  const sections: string[] = [];
  const entries: ContextEntry[] = [];
  const attachments: string[] = [];
  const seen = new Set<string>();
  const add = (p: string, entry: ContextEntry): void => {
    if (!seen.has(p)) { seen.add(p); sections.push(p); }
    entries.push(entry);
  };

  for (const b of cfg.bases) {
    const p = relIndex(b);
    if (!existsRel(p)) throw new ContextFail("*", p, `ไฟล์บริบทตามตาราง DES-020 หาย: ${p} (fail-closed)`);
    add(p, { id: null, kind: BASE_KIND[b] ?? "index", path: p });
  }

  // --- index resolve (memoized ต่อการเรียกหนึ่งครั้ง — อ่านเฉพาะหมวดที่จำเป็น) ---
  const tableIndex = new Map<string, Table[] | null>();
  function tables(pathRel: string): Table[] | null {
    if (!tableIndex.has(pathRel)) {
      const text = readRel(pathRel);
      tableIndex.set(pathRel, text === null ? null : allTables(text));
    }
    return tableIndex.get(pathRel)!;
  }
  const byFirstHeader = (ts: Table[], first: string): Table | undefined =>
    ts.find((t) => (t.header[0] ?? "").toLowerCase() === first);
  const fileCol = (header: string[]): number => header.findIndex((h) => h === "ไฟล์");

  let reqIdx: { rows: Map<string, string[]>; ac: Map<string, string[]> } | null | undefined;
  function requirementIndex(): { rows: Map<string, string[]>; ac: Map<string, string[]> } | null {
    if (reqIdx === undefined) {
      const p = relIndex("requirement-index");
      const ts = tables(p);
      if (ts === null) { reqIdx = null; return null; }
      const t = byFirstHeader(ts, "req");
      if (!t) throw new ContextFail("*", p, `${p} ไม่มีตาราง REQ (index parse ไม่ผ่าน — fail-closed)`);
      const acCol = t.header.findIndex((h) => /^ac\b/i.test(h));
      const rows = new Map<string, string[]>();
      const ac = new Map<string, string[]>();
      for (const cells of t.rows) {
        const id = /^REQ-\d{3}$/i.exec(cells[0] ?? "")?.[0]?.toUpperCase();
        if (!id) continue; // แถวอื่นของ index (scope.md, archive.md) ไม่ใช่ unit REQ
        rows.set(id, cells);
        if (acCol >= 0) {
          for (const m of (cells[acCol] ?? "").matchAll(/\bAC-\d{3}\b/gi)) {
            const k = m[0].toUpperCase();
            ac.set(k, [...(ac.get(k) ?? []), id]);
          }
        }
      }
      reqIdx = { rows, ac };
    }
    return reqIdx;
  }

  let desIdx: Set<string> | null | undefined;
  function designIndex(): Set<string> | null {
    if (desIdx === undefined) {
      const ts = tables(relIndex("design-index"));
      if (ts === null) { desIdx = null; return null; }
      const ids = new Set<string>();
      for (const t of ts.filter((x) => (x.header[0] ?? "").toLowerCase() === "id")) {
        for (const cells of t.rows) {
          const id = /^DES-\d{3}$/i.exec(cells[0] ?? "")?.[0]?.toUpperCase();
          if (id) ids.add(id);
        }
      }
      desIdx = ids;
    }
    return desIdx;
  }

  const findingCache = new Map<"review" | "qa", Map<string, string> | null>();
  function findingIndex(cat: "review" | "qa"): Map<string, string> | null {
    if (!findingCache.has(cat)) {
      const p = cat === "review" ? relIndex("review-index") : relIndex("qa-index");
      const ts = tables(p);
      if (ts === null) { findingCache.set(cat, null); return null; }
      const map = new Map<string, string>();
      const re = cat === "review" ? /^REV-\d{3}$/i : /^QA-\d{3}$/i;
      for (const t of ts.filter((x) => (x.header[0] ?? "").toLowerCase() === "id")) {
        const fc = fileCol(t.header);
        if (fc < 0) continue;
        for (const cells of t.rows) {
          const id = re.exec(cells[0] ?? "")?.[0]?.toUpperCase();
          if (id) map.set(id, cells[fc] ?? "");
        }
      }
      findingCache.set(cat, map);
    }
    return findingCache.get(cat)!;
  }

  let tpIdx: Map<string, { file: string; phase: string }> | null | undefined;
  function tpIndex(): Map<string, { file: string; phase: string }> | null {
    if (tpIdx === undefined) {
      const p = relIndex("test-plan-index");
      const ts = tables(p);
      if (ts === null) { tpIdx = null; return null; }
      const map = new Map<string, { file: string; phase: string }>();
      for (const t of ts.filter((x) => (x.header[0] ?? "").toLowerCase() === "tp")) {
        const fc = fileCol(t.header);
        const pc = t.header.findIndex((h) => h.toLowerCase() === "phase");
        if (fc < 0) continue;
        for (const cells of t.rows) {
          const id = /^TP-\d{3}$/i.exec(cells[0] ?? "")?.[0]?.toUpperCase();
          if (id) map.set(id, { file: cells[fc] ?? "", phase: pc >= 0 ? (cells[pc] ?? "").trim() : "" });
        }
      }
      tpIdx = map;
    }
    return tpIdx;
  }

  // TP ของ phase (feature-qa) — คอลัมน์ Phase ของตาราง TP · module ไม่มี test-plan → ไม่มี TP (REQ ที่อ้างยังครอบ)
  const phaseTps = (phase: string): string[] => {
    const idx = tpIndex();
    if (idx === null) return [];
    const out: string[] = [];
    for (const [id, r] of idx) if (r.phase === phase.trim()) out.push(id);
    return out;
  };

  const unitFile = (unit: DocUnit, name: string, tok: Token, index: string): { path: string; entry: ContextEntry } => {
    let p: string;
    try {
      p = rel(unit, name);
    } catch (err) {
      throw new ContextFail(tok.text, index, `ชื่อไฟล์จาก index ไม่ถูกรูป (${name}): ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!existsRel(p)) throw new ContextFail(tok.text, index, `index ชี้ไฟล์ที่ไม่มี: ${p} (fail-closed)`);
    return { path: p, entry: { id: tok.text, kind: tok.kind, path: p } };
  };
  const reqFile = (reqId: string, tok: Token): { path: string; entry: ContextEntry } =>
    unitFile("requirement-req", `req-${reqId.slice(4)}.md`, tok, relIndex("requirement-index"));

  // null = id ถูกอ้างแต่จงใจไม่ resolve (เฉพาะ UX artifact ใหม่ของแถว uxui — DES-020 REV-036) — caller ข้ามโดยไม่ error
  function resolveOne(tok: Token): { path: string; entry: ContextEntry } | null {
    const up = tok.text.toUpperCase();
    switch (tok.kind) {
      case "task": {
        const p = rel("plan-task", `${tok.text.toLowerCase()}.md`);
        if (!existsRel(p)) throw new ContextFail(tok.text, planRel, `index ชี้ไฟล์ที่ไม่มี: ${p} (fail-closed)`);
        return { path: p, entry: { id: tok.text, kind: "task", path: p } };
      }
      case "req": {
        const idx = requirementIndex();
        if (idx === null || !idx.rows.has(up)) {
          throw new ContextFail(tok.text, relIndex("requirement-index"), `REQ ${up} ไม่พบใน requirement\\index.md (fail-closed — ไม่เดาไฟล์)`);
        }
        return reqFile(up, tok);
      }
      case "ac": {
        const idx = requirementIndex();
        const owners = idx?.ac.get(up);
        if (!idx || !owners || owners.length === 0) {
          throw new ContextFail(tok.text, relIndex("requirement-index"), `AC ${up} ไม่พบในคอลัมน์ AC ids ของ requirement\\index.md (fail-closed)`);
        }
        if (owners.length > 1) {
          throw new ContextFail(tok.text, relIndex("requirement-index"), `AC ${up} ปรากฏในหลาย REQ (${owners.join(", ")}) — resolve ซ้ำไม่ชัด (fail-closed)`);
        }
        return reqFile(owners[0]!, tok);
      }
      case "des": {
        const idx = designIndex();
        const desRel = relIndex("design-index");
        if (idx === null) throw new ContextFail(tok.text, desRel, `ไม่พบ ${desRel} — อ้าง ${up} ไม่ได้ (fail-closed)`);
        if (!idx.has(up)) throw new ContextFail(tok.text, desRel, `DES ${up} ไม่พบใน design\\index.md (fail-closed — ไม่เดาไฟล์)`);
        return unitFile("design-des", `des-${up.slice(4)}.md`, tok, desRel);
      }
      case "tp": {
        const idx = tpIndex();
        const p = relIndex("test-plan-index");
        const hit = idx?.get(up);
        if (idx === null || !hit) {
          throw new ContextFail(tok.text, p, `TP ${up} ไม่พบใน test-plan\\index.md — module ไม่มีตาราง TP ก็อ้างไม่ได้ (fallback DES-020 — ไม่เดา path)`);
        }
        return unitFile("test-plan", hit.file, tok, p);
      }
      case "rev":
      case "qa": {
        const cat: "review" | "qa" = tok.kind === "rev" ? "review" : "qa";
        const idx = findingIndex(cat);
        const p = cat === "review" ? relIndex("review-index") : relIndex("qa-index");
        const hit = idx?.get(up);
        if (idx === null || hit === undefined) {
          throw new ContextFail(tok.text, p, `${up} ไม่พบในตาราง finding ของ ${p} — module ไม่มีตารางก็อ้างไม่ได้ (fallback DES-020 — ไม่เดา path)`);
        }
        return unitFile(cat === "review" ? "review-round" : "qa-round", hit, tok, p);
      }
      case "ux": {
        const m = /^UX-(\d{3})$/.exec(up)!;
        const uxDir = path.join(dir, "uxui");
        // uxui ไม่มี index ใน DES-014 — รูปชื่อไฟล์ UX-NNN-<slug>.md ตายตัว → scan prefix แบบ deterministic
        // แถว uxui (REV-036): artifact ใหม่ยังไม่มีไฟล์/ยังไม่มีหมวด uxui → 0-hit ไม่ resolve (fail-closed ไม่เดา path)
        // — driver ส่ง path ใน brief · FE (แถว execution) คง fail-closed ทุกกรณีเพราะได้เฉพาะ artifact ที่ sign แล้ว
        if (!existsSync(uxDir)) {
          if (row === "uxui") return null;
          throw new ContextFail(tok.text, "uxui\\", `ไม่มีหมวด uxui — อ้าง ${up} ไม่ได้ (fail-closed)`);
        }
        const hits = readdirSync(uxDir).filter((f) => new RegExp(`^ux-${m[1]}-`, "i").test(f) && /\.md$/i.test(f));
        if (hits.length === 0) {
          if (row === "uxui") return null;
          throw new ContextFail(tok.text, "uxui\\", `ไม่พบ UX artifact ของ ${up} ใน uxui\\ (fail-closed — ไม่เดา path)`);
        }
        if (hits.length > 1) throw new ContextFail(tok.text, "uxui\\", `${up} ตรงหลายไฟล์ (${hits.join(", ")}) — resolve ซ้ำไม่ชัด (fail-closed)`);
        const p = toRel(dir, path.join(uxDir, hits[0]!));
        return { path: p, entry: { id: tok.text, kind: "ux", path: p } };
      }
      case "data-model": {
        const p = rel("design-data-model");
        if (!existsRel(p)) throw new ContextFail("data-model", p, `index ชี้ไฟล์ที่ไม่มี: ${p} (fail-closed)`);
        return { path: p, entry: { id: null, kind: "data-model", path: p } };
      }
      default:
        throw new ContextFail(tok.text, "-", `ชนิด id ${tok.kind} ไม่ resolve ได้ในแถว role นี้`);
    }
  }

  // --- devops stage: qa\ round ล่าสุด (แถวสุดท้ายของตาราง Rounds ใน qa\index.md) ---
  if (row === "devops-stage") {
    const p = relIndex("qa-index");
    const ts = tables(p);
    if (ts === null) throw new ContextFail("*", p, `devops ต้องมี qa round ล่าสุด — ไม่พบ ${p} (fail-closed)`);
    const t = byFirstHeader(ts, "round");
    const fc = t ? fileCol(t.header) : -1;
    const last = t && fc >= 0 ? [...t.rows].reverse().find((r) => r[fc]) : undefined;
    if (!t || fc < 0 || !last) throw new ContextFail("*", p, `${p} ไม่มีตาราง Rounds ที่อ่านได้ (fail-closed)`);
    const roundRel = unitFile("qa-round", last[fc]!, { text: "qa-round ล่าสุด", kind: "qa" }, p);
    add(roundRel.path, roundRel.entry);
  }

  // --- trailing ไฟล์โครง ---
  for (const b of cfg.trailing) {
    const p = relIndex(b);
    if (!existsRel(p)) {
      if (OPTIONAL_INDEXES.has(b)) continue; // fallback DES-020 — หมวดยังไม่มี (id เข้าหมวดนี้ error อยู่แล้ว)
      throw new ContextFail("*", p, `ไฟล์บริบทตามตาราง DES-020 หาย: ${p} (fail-closed)`);
    }
    add(p, { id: null, kind: BASE_KIND[b] ?? "index", path: p });
  }

  // --- task file ของ taskIds (แหล่ง id: คอลัมน์ Task) ---
  const taskRels: string[] = [];
  for (const t of taskIds) {
    const p = rel("plan-task", `${t.toLowerCase()}.md`);
    if (!existsRel(p)) throw new ContextFail(t, planRel, `index ชี้ไฟล์ที่ไม่มี: ${p} (task ${t} — fail-closed)`);
    taskRels.push(p);
    if (cfg.tasks) add(p, { id: t, kind: "task", path: p });
  }

  // --- เก็บ id ที่ถูกอ้าง (DES-020: ## References + blocker.reference + defect findings[].reference + reproduce.tp) ---
  const collected: Token[] = [];
  if (cfg.refKinds.length > 0 || cfg.ux) {
    for (let i = 0; i < taskIds.length; i++) {
      const sec = referencesSection(readRel(taskRels[i])!);
      if (sec !== null) collected.push(...extractTokens(sec, taskSet));
    }
  }
  if (cfg.blockerKinds.length > 0 && refs.blockerReference) {
    collected.push(...extractTokens(refs.blockerReference, taskSet));
  }
  if (row === "ba" && refs.newWorkText) collected.push(...extractTokens(refs.newWorkText, taskSet));
  if ((row === "execution" || row === "uxui") && refs.defectPacket) {
    for (const f of refs.defectPacket.findings) {
      const fm = DEFECT_ID.exec(f.id ?? "");
      if (!fm) throw new ContextFail(f.id ?? "?", "defectPacket.findings[].id", `finding id "${f.id}" ไม่ตรงรูป REV-NNN/QA-NNN (fail-closed)`);
      // ข้อ 1 — field ที่มีชนิด resolve ตามชนิดเสมอ: findings[].id = finding (ไม่ใช่ task แม้ id จะชน)
      collected.push({ text: fm[0].toUpperCase(), kind: fm[1]!.toUpperCase() === "REV" ? "rev" : "qa", explicit: true });
      const tp = f.reproduce?.tp;
      if (tp) {
        const tm = TP_ID.exec(tp);
        if (!tm) throw new ContextFail(tp, "defectPacket.findings[].reproduce.tp", `reproduce.tp "${tp}" ไม่ตรงรูป TP-NNN (fail-closed)`);
        collected.push({ text: tm[0].toUpperCase(), kind: "tp", explicit: true });
      }
      if (f.reference) collected.push(...extractTokens(f.reference, taskSet));
    }
    attachments.push("attachment:defectPacket");
  }
  if (row === "qa" && refs.reviewRefs?.length) {
    for (const r of refs.reviewRefs) {
      const m = REV_ONLY.exec(r ?? "");
      if (!m) throw new ContextFail(r ?? "?", "refs.reviewRefs", `reviewRefs รับเฉพาะ REV-NNN (REV ids เท่านั้น — DES-020) — พบ "${r}"`);
      collected.push({ text: m[0].toUpperCase(), kind: "rev", explicit: true });
    }
  }
  if (row === "pm" && refs.changedDocs?.length) {
    for (const d of refs.changedDocs) {
      const m = /(?:^|[\\/])des-(\d{3})\.md$/i.exec(d ?? "");
      if (m) collected.push({ text: `DES-${m[1]}`, kind: "des", explicit: true }); // แถว PM ขอเฉพาะ DES ที่ SA เปลี่ยน
    }
  }
  if (row === "feature-qa" && refs.planPhase) {
    for (const tpId of phaseTps(refs.planPhase)) collected.push({ text: tpId, kind: "tp", explicit: true });
  }
  if ((row === "execution" || row === "uxui") && refs.priorSession) attachments.push("attachment:priorSession");
  if (row === "review" && refs.reviewInput) attachments.push("attachment:reviewInput");
  if (row === "security" && refs.phaseChangedFiles?.length) attachments.push("attachment:changedFiles");

  // --- resolve เฉพาะ id ที่แถว role นี้รับ (ห้ามเกินโดยไม่มี ID อ้าง — DES-020) ---
  // token explicit (รูปมีหมวดนำ / field ที่มีชนิด — ข้อ 1/3 ของ Rev 11) คงอยู่เสมอ — เป็นการอ้างที่ชัดเจนตาม design
  const keep = new Set<ContextKind>([...cfg.refKinds, ...cfg.blockerKinds]);
  if (cfg.ux) keep.add("ux"); // UX artifact เฉพาะ FE เมื่อ task อ้าง UX-NNN
  const uniq = new Map<string, Token>();
  for (const t of collected) {
    const key = `${t.kind}:${t.text}`;
    if (uniq.has(key)) continue;
    if (!keep.has(t.kind) && !t.explicit) continue;
    uniq.set(key, t);
  }
  for (const tok of uniq.values()) {
    const hit = resolveOne(tok);
    if (hit === null) continue; // artifact ใหม่ยังไม่มีไฟล์ (แถว uxui — REV-036) — ไม่ resolve ไม่ error
    add(hit.path, hit.entry);
  }

  // --- contextFiles (AC-047): ไฟล์ใน packet + ชนิดของ id ที่ resolve + ไฟล์แนบ — บรรทัดแรกของ session log ---
  const cfLabel = (e: ContextEntry): string => {
    if (e.id === null) return e.path;
    switch (e.kind) {
      case "task": return `task:${e.id}`;
      case "tp": return `test-plan:${e.id}`;
      case "rev": return `review:${e.id}`;
      case "qa": return `qa:${e.id}`;
      default: return e.id; // REQ/AC/DES/UX — ชนิดชัดจากรูป id อยู่แล้ว
    }
  };
  const contextFiles: string[] = [];
  const seenCf = new Set<string>();
  for (const e of entries) {
    if (seenCf.has(e.path)) continue;
    seenCf.add(e.path);
    const label = cfLabel(e);
    contextFiles.push(label === e.path ? e.path : `${label} -> ${e.path}`);
  }
  contextFiles.push(...attachments);

  return { readSections: sections, contextFiles, resolved: entries, attachments, error: null };
}
