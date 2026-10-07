// BE-018 — plan v2 parser (DES-014 §plan v2): plan\index.md + task file → โครงข้อมูลเดียว
// อ่านอย่างเดียว ไม่แปลง/ไม่เขียนไฟล์ (OQ-15) · รูปผิด → issue (fail-closed): ค่าที่ผิดรูปไม่ถูกใช้ (status = null)
// ตัดสิน runnable/hold ไม่ใช่งานของไฟล์นี้ (BE-011/BE-019) — คืนแค่ issue ระดับ module vs แถว + task id

export const ROLES = [
  "business-analyst", "system-analyst", "project-manager", "test-planner", "uxui-designer", "setup",
  "backend-engineer", "frontend-engineer", "reviewer", "qa-engineer", "security", "devops",
] as const;
export const FORBIDDEN_OWNERS = ["reviewer", "security"] as const; // AC-079 (OQ-20)
export const STATUS_VALUES = ["pending", "verified", "blocked"] as const;
export type TaskStatus = (typeof STATUS_VALUES)[number];

export const V2_HEADER = ["Task", "Name", "Owner", "Phase", "Depends", "Status"] as const;
export const TASK_FILE_HEADINGS = [
  "Goal", "References", "Scope", "Out of Scope", "Expected Output", "Acceptance", "Dependencies", "Handoff",
] as const;

export type PlanIssueKind =
  // ระดับ module
  | "plan-header-invalid" | "plan-section-missing" | "plan-row-unidentified" | "plan-table-malformed"
  // ระดับแถว (ผูก task id — hold แถว + dependents ไม่หยุดทั้ง run: R9/R24)
  | "plan-row-malformed" | "plan-duplicate-id" | "plan-status-invalid" | "plan-depends-malformed"
  | "plan-depends-missing" | "plan-depends-cycle" | "plan-owner-forbidden" | "plan-owner-unknown"
  | "plan-multi-anchor" | "plan-phase-unknown"
  | "task-file-status-field" | "task-file-heading-missing" | "task-file-machine-line";

export interface PlanIssue {
  kind: PlanIssueKind;
  level: "module" | "row";
  file: string;
  location: string; // แถว (เช่น "Tasks:BE-001") หรือหัวข้อ
  reason: string; // เช่น owner:reviewer · multi-anchor · missing:BE-099
  message: string;
  taskIds: string[];
}

export interface PlanRow {
  id: string;
  name: string;
  owner: string;
  phase: string;
  depends: string[];
  status: TaskStatus | null; // null = ค่านอก 3 ค่า (ไม่ใช้)
  line: number; // 1-based
}
export interface PhaseRow { label: string; name: string; tasks: string[]; note: string; locked: boolean; }
export interface WaitingRow { n: string; decision: string; options: string; decider: string; blocks: string[]; }

export interface PlanIndex {
  format: "v2" | "legacy" | "invalid";
  needsMigration: boolean; // legacy (ไม่มี Depends) — AC-074
  rows: PlanRow[];
  phases: PhaseRow[];
  waiting: WaitingRow[];
  issues: PlanIssue[];
}

export interface TaskFile {
  id: string;
  headings: string[]; // หัวข้อ ## ที่พบ
  references: string[]; // REQ/AC/DES/TP/UX ids จาก ## References
  writePaths: string[];
  securitySensitive: boolean | null;
  sessionGroup: string | null;
  issues: PlanIssue[];
}

const lines = (t: string): string[] => t.split(/\r?\n/);
const isTableLine = (l: string): boolean => l.trimStart().startsWith("|");
const isSep = (cells: string[]): boolean => cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
const unwrap = (s: string): string => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").trim();
const TASK_ID = /^[A-Za-z]+-\d+$/;
const NONE = /^(—|–|-|)$/;

export function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

// body ของ section `## <name>` (เทียบ prefix, ไม่สนตัวพิมพ์) · คืน null ถ้าไม่มีหัวข้อ
function section(text: string, name: string): { start: number; body: string[] } | null {
  const ls = lines(text);
  const want = name.toLowerCase();
  const i = ls.findIndex((l) => /^##\s/.test(l) && l.replace(/^##\s+/, "").trim().toLowerCase().startsWith(want));
  if (i < 0) return null;
  let end = ls.length;
  for (let j = i + 1; j < ls.length; j++) if (/^##\s/.test(ls[j]!)) { end = j; break; }
  return { start: i + 1, body: ls.slice(i + 1, end) };
}

interface Table { header: string[]; rows: { cells: string[]; line: number }[] }
// ตารางแรกใน section (header + แถว จนถึงบรรทัดที่ไม่ใช่ตาราง) — null ถ้าไม่มี
export function firstTable(body: string[], startLine: number): Table | null {
  const h = body.findIndex(isTableLine);
  if (h < 0) return null;
  const header = splitRow(body[h]!).map(unwrap);
  const rows: Table["rows"] = [];
  for (let k = h + 1; k < body.length && isTableLine(body[k]!); k++) {
    const cells = splitRow(body[k]!);
    if (isSep(cells)) continue;
    rows.push({ cells, line: startLine + k + 1 });
  }
  return { header, rows };
}

export function tableAt(text: string, heading: string): Table | null {
  const s = section(text, heading);
  return s ? firstTable(s.body, s.start) : null;
}

const mk = (file: string, kind: PlanIssueKind, level: PlanIssue["level"], location: string, reason: string, message: string, taskIds: string[] = []): PlanIssue =>
  ({ kind, level, file, location, reason, message, taskIds });

export function parsePlanIndex(text: string, file = "plan/index.md"): PlanIndex {
  const out: PlanIndex = { format: "invalid", needsMigration: false, rows: [], phases: [], waiting: [], issues: [] };
  const I = out.issues;

  const tasks = section(text, "Tasks");
  // รูปเดิม `id|status` อาจไม่มีหัวข้อ ## Tasks — ถอยไปใช้ตารางแรกของไฟล์ (เฉพาะ legacy; v2 ต้องมีหัวข้อ)
  let table = tasks ? firstTable(tasks.body, tasks.start) : null;
  if (!tasks) {
    const any = firstTable(lines(text), 0);
    if (any && !any.header.map((c) => c.toLowerCase()).includes("depends")) table = any;
  }
  if (!table) {
    I.push(mk(file, "plan-section-missing", "module", "## Tasks", "missing:tasks-table", "ไม่มีตารางใน ## Tasks — ใช้ plan นี้ไม่ได้"));
    return out;
  }
  const hl = table.header.map((c) => c.toLowerCase());
  const exactV2 = V2_HEADER.every((h, i) => table.header[i] === h) && table.header.length === V2_HEADER.length;
  const hasDepends = hl.includes("depends");
  const hasStatus = hl.includes("status");
  if (exactV2) out.format = "v2";
  else if (!hasDepends && hasStatus && (hl[0] === "task" || hl[0] === "id")) {
    out.format = "legacy"; // DES-001 กรณี 3 — อ่าน Task+Status ได้ ไม่แปลงไฟล์
    out.needsMigration = true;
  } else {
    I.push(mk(file, "plan-header-invalid", "module", "## Tasks:header", "header", `header ตาราง Tasks ต้องเป็น \`| ${V2_HEADER.join(" | ")} |\` (หรือรูปเดิมที่ไม่มี Depends) — พบ \`${table.header.join(" | ")}\``));
    return out;
  }
  const v2 = out.format === "v2";

  // Phases / Waiting on Human
  const ph = tableAt(text, "Phases");
  if (!ph) {
    if (v2) I.push(mk(file, "plan-section-missing", "module", "## Phases", "missing:phases", "plan v2 ต้องมี ## Phases (ป้าย phase + 🔒)"));
  } else {
    for (const r of ph.rows) {
      const c = r.cells;
      out.phases.push({ label: unwrap(c[0] ?? ""), name: c[1] ?? "", tasks: (c[2] ?? "").match(/[A-Za-z]+-\d+/g) ?? [], note: c[3] ?? "", locked: r.cells.join("|").includes("🔒") });
    }
  }
  const wt = tableAt(text, "Waiting on Human");
  if (!wt) {
    if (v2) I.push(mk(file, "plan-section-missing", "module", "## Waiting on Human", "missing:waiting", "plan v2 ต้องมี ## Waiting on Human"));
  } else {
    for (const r of wt.rows) {
      const c = r.cells;
      if (!/^\d+$/.test(unwrap(c[0] ?? ""))) continue;
      out.waiting.push({ n: unwrap(c[0]!), decision: c[1] ?? "", options: c[2] ?? "", decider: c[3] ?? "", blocks: (c[4] ?? "").match(/[A-Za-z]+-\d+/g) ?? [] });
    }
  }

  // แถว Tasks
  const col = (name: string): number => hl.indexOf(name);
  const seen = new Set<string>();
  for (const r of table.rows) {
    const id = unwrap(r.cells[0] ?? "");
    const loc = `Tasks:${id || `line ${r.line}`}`;
    if (!TASK_ID.test(id)) {
      I.push(mk(file, "plan-row-unidentified", "module", `Tasks:line ${r.line}`, "task-id", `แถวบรรทัด ${r.line} ไม่มี task id ที่อ่านได้ ("${id}") — hold แถวไม่ได้`));
      continue;
    }
    if (r.cells.length !== table.header.length) {
      I.push(mk(file, "plan-row-malformed", "row", loc, "cell-count", `แถว ${id}: ${r.cells.length} คอลัมน์ แต่ header มี ${table.header.length}`, [id]));
      continue;
    }
    if (seen.has(id)) {
      I.push(mk(file, "plan-duplicate-id", "row", loc, "duplicate", `task id ${id} ซ้ำในตาราง`, [id]));
      continue;
    }
    seen.add(id);
    const get = (name: string): string => { const i = col(name); return i < 0 ? "" : unwrap(r.cells[i] ?? ""); };
    const dep = v2 ? get("depends") : "";
    let depends: string[] = [];
    if (!NONE.test(dep)) {
      depends = dep.split(",").map((s) => s.trim());
      const bad = depends.filter((d) => !TASK_ID.test(d));
      if (bad.length) {
        I.push(mk(file, "plan-depends-malformed", "row", loc, "depends-format", `${id}: Depends ต้องเป็น \`—\` หรือ task id คั่น \`,\` — พบ "${dep}"`, [id]));
        depends = depends.filter((d) => TASK_ID.test(d));
      }
    }
    const st = get("status");
    const status = (STATUS_VALUES as readonly string[]).includes(st) ? (st as TaskStatus) : null;
    if (status === null) I.push(mk(file, "plan-status-invalid", "row", loc, "status", `${id}: Status "${st}" ไม่ใช่ pending|verified|blocked — ไม่ใช้ค่า`, [id]));
    out.rows.push({ id, name: get("name"), owner: get("owner"), phase: get("phase"), depends, status, line: r.line });
  }

  // Depends ต้องมีอยู่จริง / ไม่วงวน (AC-039)
  const ids = new Set(out.rows.map((r) => r.id));
  for (const r of out.rows) {
    const missing = r.depends.filter((d) => !ids.has(d));
    for (const d of missing) I.push(mk(file, "plan-depends-missing", "row", `Tasks:${r.id}`, `missing:${d}`, `${r.id}: Depends อ้าง ${d} ที่ไม่มีใน plan`, [r.id]));
  }
  const dependsOf = new Map(out.rows.map((r) => [r.id, r.depends.filter((d) => ids.has(d))]));
  const onCycle = (start: string): boolean => {
    const stack = [...(dependsOf.get(start) ?? [])];
    const visited = new Set<string>();
    while (stack.length) {
      const x = stack.pop()!;
      if (x === start) return true;
      if (visited.has(x)) continue;
      visited.add(x);
      stack.push(...(dependsOf.get(x) ?? []));
    }
    return false;
  };
  for (const r of out.rows) {
    if (onCycle(r.id)) I.push(mk(file, "plan-depends-cycle", "row", `Tasks:${r.id}`, "cycle", `${r.id}: Depends วนกลับมาที่ตัวเอง (AC-039)`, [r.id]));
  }

  // Owner (AC-079) + anchor ≤ 1 ต่อ phase (R24) — ทั้ง v2 และ legacy ที่มีคอลัมน์ Owner
  if (col("owner") >= 0) {
    for (const r of out.rows) {
      if ((FORBIDDEN_OWNERS as readonly string[]).includes(r.owner)) {
        I.push(mk(file, "plan-owner-forbidden", "row", `Tasks:${r.id}`, `owner:${r.owner}`, `${r.id}: Owner "${r.owner}" ห้ามเป็น task (AC-079) — security/review เป็น stage ไม่ใช่ task`, [r.id]));
      } else if (!(ROLES as readonly string[]).includes(r.owner)) {
        I.push(mk(file, "plan-owner-unknown", "row", `Tasks:${r.id}`, `owner:${r.owner}`, `${r.id}: Owner "${r.owner}" ไม่ใช่ role ที่รู้จัก`, [r.id]));
      }
    }
    const byPhase = new Map<string, string[]>();
    for (const r of out.rows) if (r.owner === "qa-engineer") byPhase.set(r.phase, [...(byPhase.get(r.phase) ?? []), r.id]);
    for (const [phase, anchors] of byPhase) {
      if (anchors.length > 1) {
        I.push(mk(file, "plan-multi-anchor", "row", `Phase ${phase}`, "multi-anchor", `phase ${phase}: Owner qa-engineer ${anchors.length} แถว (${anchors.join(", ")}) — anchor ต้อง ≤ 1 ต่อ phase`, anchors));
      }
    }
  }
  // Phase ต้องเป็นป้ายใน ## Phases (เฉพาะ v2 ที่มี Phases)
  if (v2 && ph) {
    const labels = new Set(out.phases.map((p) => p.label));
    for (const r of out.rows) {
      if (!labels.has(r.phase)) I.push(mk(file, "plan-phase-unknown", "row", `Tasks:${r.id}`, `phase:${r.phase}`, `${r.id}: Phase "${r.phase}" ไม่มีใน ## Phases`, [r.id]));
    }
  }
  return out;
}

export function parseTaskFile(text: string, id: string, file = `plan/${id.toLowerCase()}.md`): TaskFile {
  const out: TaskFile = { id, headings: [], references: [], writePaths: [], securitySensitive: null, sessionGroup: null, issues: [] };
  const I = out.issues;
  const ls = lines(text);
  let fence = false;
  for (const l of ls) {
    if (/^\s*```/.test(l)) { fence = !fence; continue; }
    if (fence) continue;
    const h = /^##\s+(.+?)\s*$/.exec(l);
    if (h) out.headings.push(h[1]!);
    if (/^\s*(?:[-*]\s+)?\**Status\**\s*:/i.test(l) || (h && /^status\b/i.test(h[1]!))) {
      I.push(mk(file, "task-file-status-field", "row", "Status", "status-field", `${id}: task file มี Status — ไม่ตรงรูป ไม่ใช้ค่า (Status อยู่ที่ plan\\index.md — AC-038)`, [id]));
    }
  }
  for (const want of TASK_FILE_HEADINGS) {
    if (!out.headings.some((x) => x.toLowerCase().startsWith(want.toLowerCase()))) {
      I.push(mk(file, "task-file-heading-missing", "row", `## ${want}`, `missing:${want}`, `${id}: ขาดหัวข้อ ## ${want} (AC-038)`, [id]));
    }
  }
  const refs = section(text, "References");
  if (refs) out.references = [...new Set(refs.body.join("\n").match(/\b(?:REQ|AC|DES|TP|UX)-\d+\b/g) ?? [])];
  const scope = section(text, "Scope");
  for (const l of scope?.body ?? []) {
    const m = /^\s*[-*]\s+(Write paths|Security-sensitive|Session group)\s*:\s*(.*)$/i.exec(l);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!.trim();
    if (key === "write paths") out.writePaths = [...val.matchAll(/`([^`]+)`/g)].map((x) => x[1]!);
    else if (key === "session group") out.sessionGroup = unwrap(val) || null;
    else if (/^(yes|no)(\s|\(|$)/i.test(val)) out.securitySensitive = /^yes/i.test(val); // ตามด้วยคำอธิบายในวงเล็บได้
    else I.push(mk(file, "task-file-machine-line", "row", "Security-sensitive", "security-sensitive", `${id}: Security-sensitive ต้องเป็น yes|no — พบ "${val}"`, [id]));
  }
  return out;
}
