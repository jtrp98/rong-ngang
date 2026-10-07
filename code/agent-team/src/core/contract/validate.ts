// BE-006 — validator ของ contract (DES-012): ตรวจ 2 ชั้น —
// (ก) schema: รูป field/type/enum ตาม data-model (ตรง handoffV2JsonSchema/packetV2JsonSchema — schema.ts)
// (ข) กฎ (1)–(7) ที่ code ตรวจหลัง schema (DES-012 Permissions/States/Errors v2 — Rev 10/11) ต้องมี packet เทียบ
// คืนรายการปัญหา (ไม่ throw) — handoff ไม่ผ่าน → driver hold `invalid-handoff` R15 (AC-068 — ปฏิเสธพร้อมเหตุ ไม่เดา)
// packet ไม่ผ่าน → builder (packet-builder.ts) โยน ContractError ก่อนส่งลง camp ใด
import { KNOWN_GATES, KNOWN_ROLES } from "../config.ts";
import { assertNoTraversal } from "../knowledge-paths.ts";
import { allowedStatesFor, type Blocker, type HandoffV2, type OutputState, type PacketV2, type QaDefect, type ReviewFinding } from "./types.ts";

const isStr = (v: unknown): v is string => typeof v === "string";
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

const OUTPUT_STATES: readonly string[] = ["DONE", "PASS", "FAIL", "BLOCKED", "NEEDS_DESIGN_CHANGE", "NEEDS_REQUIREMENT_CHANGE", "NEEDS_HUMAN"];
const SEVERITIES: readonly string[] = ["Critical", "Important", "Minor"];
const KINDS: readonly string[] = ["change", "execution", "review", "qa", "feature-qa", "security", "record-only"];
const LAYOUTS: readonly string[] = ["split", "flat", "module"];
const BLOCKER_TYPES: readonly string[] = ["design", "requirement", "environment", "dependency", "access", "other"];
// DES-018 §รูป blocker: BLOCKED ใช้เฉพาะ type environment|dependency|access|other (design/requirement ไปทาง NEEDS_*)
const BLOCKED_TYPES: readonly string[] = ["environment", "dependency", "access", "other"];

const HASH_RE = /^sha256:[0-9a-f]{64}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DES_ID_RE = /^DES-\d{3}$/;
const REQ_AC_ID_RE = /^(REQ|AC)-\d{3}$/;
const REV_ID_RE = /^REV-\d{3}$/;
const QA_ID_RE = /^QA-\d{3}$/;
const TP_ID_RE = /^TP-\d{3}$/;

function isIsoDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// path ของ readSections — สัมพัทธ์ module folder (DES-014) — ไม่รับ absolute/`..` (fail-closed)
function readSectionPathProblems(p: unknown): string | null {
  if (!isStr(p) || p.trim() === "") return `readSections ต้องเป็น string[] ของ path ไม่ว่าง — ได้รับ ${JSON.stringify(p)}`;
  if (/^[a-zA-Z]:[\\/]/.test(p) || p.startsWith("/") || p.startsWith("\\") || p.includes(":")) {
    return `readSections ต้องเป็น path สัมพัทธ์ module folder — ได้รับ ${JSON.stringify(p)}`;
  }
  try {
    assertNoTraversal(p, "readSections[]");
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return null;
}

function nonEmptyStringArrayProblems(v: unknown, label: string): string[] {
  if (!isArr(v) || v.some((x) => !isStr(x) || x.trim() === "")) return [`${label} ต้องเป็น string[] (ค่าใน list ไม่ว่าง)`];
  return [];
}

function nullableStringProblems(v: unknown, label: string): string[] {
  if (v === null) return [];
  if (!isStr(v) || v.trim() === "") return [`${label} ต้องเป็น string ไม่ว่าง หรือ null`];
  return [];
}

// --- ชิ้นส่วนที่ใช้ร่วมกันทั้ง handoff และ defectPacket (ReviewFinding/QaDefect — data-model verbatim) ---
// taskNullable: QaDefect.task = null ได้เฉพาะ featureQa (data-model comment — rule (4)/AC-055)
export function reviewFindingProblems(v: unknown, label: string): string[] {
  const p: string[] = [];
  if (!isObj(v)) return [`${label} ต้องเป็น ReviewFinding`];
  for (const k of ["id", "severity", "task", "location", "problem", "reference"]) {
    if (v[k] === undefined) p.push(`${label} ขาด field "${k}" (AC-050)`);
  }
  if (v.id !== undefined && (!isStr(v.id) || !REV_ID_RE.test(v.id))) p.push(`${label}.id "${JSON.stringify(v.id)}" ไม่ตรงรูป REV-NNN`);
  if (v.severity !== undefined && !(isStr(v.severity) && SEVERITIES.includes(v.severity))) {
    p.push(`${label}.severity ต้องเป็นหนึ่งใน ${SEVERITIES.join(" | ")}`);
  }
  for (const k of ["task", "location", "problem", "reference"] as const) {
    if (v[k] !== undefined && (!isStr(v[k]) || (v[k] as string).trim() === "")) p.push(`${label}.${k} ต้องเป็น string ไม่ว่าง`);
  }
  return p;
}

export function qaDefectProblems(v: unknown, label: string, taskNullable: boolean): string[] {
  const p: string[] = [];
  if (!isObj(v)) return [`${label} ต้องเป็น QaDefect`];
  for (const k of ["id", "task", "severity", "expected", "actual", "reproduce", "evidence"] as const) {
    if (v[k] === undefined) p.push(`${label} ขาด field "${k}" (AC-055)`);
  }
  if (v.id !== undefined && (!isStr(v.id) || !QA_ID_RE.test(v.id))) p.push(`${label}.id "${JSON.stringify(v.id)}" ไม่ตรงรูป QA-NNN (ชน task id — DES-020)`);
  const task = v.task;
  if (task !== undefined) {
    if (task === null) {
      if (!taskNullable) p.push(`${label}.task = null ไม่ได้ — null ได้เฉพาะ defect ของ featureQa (data-model)`);
    } else if (!isStr(task) || task.trim() === "") {
      p.push(`${label}.task ต้องเป็น string ไม่ว่าง หรือ null เฉพาะ featureQa`);
    }
  }
  if (v.severity !== undefined && !(isStr(v.severity) && SEVERITIES.includes(v.severity))) {
    p.push(`${label}.severity ต้องเป็นหนึ่งใน ${SEVERITIES.join(" | ")}`);
  }
  for (const k of ["expected", "actual"] as const) {
    if (v[k] !== undefined && (!isStr(v[k]) || (v[k] as string).trim() === "")) p.push(`${label}.${k} ต้องเป็น string ไม่ว่าง`);
  }
  const rep = v.reproduce;
  if (rep !== undefined) {
    if (!isObj(rep)) p.push(`${label}.reproduce ต้องเป็น object {tp, steps}`);
    else {
      if (rep.tp === undefined) p.push(`${label}.reproduce ขาด field "tp" (AC-055)`);
      else if (rep.tp !== null && (!isStr(rep.tp) || !TP_ID_RE.test(rep.tp))) {
        p.push(`${label}.reproduce.tp ${JSON.stringify(rep.tp)} ต้องเป็น TP-NNN หรือ null`);
      }
      if (rep.steps === undefined) p.push(`${label}.reproduce ขาด field "steps" (AC-055)`);
      else if (!isStr(rep.steps) || rep.steps.trim() === "") p.push(`${label}.reproduce.steps ต้องเป็น string ไม่ว่าง`);
    }
  }
  if (v.evidence !== undefined) p.push(...nonEmptyStringArrayProblems(v.evidence, `${label}.evidence`));
  return p;
}

function blockerProblems(v: unknown, label: string): string[] {
  if (!isObj(v)) return [`${label} ต้องเป็น Blocker`];
  const p: string[] = [];
  for (const k of ["type", "task", "reference", "reason"] as const) {
    if (v[k] === undefined) p.push(`${label} ขาด field "${k}"`);
  }
  if (v.type !== undefined && !(isStr(v.type) && BLOCKER_TYPES.includes(v.type))) {
    p.push(`${label}.type ต้องเป็นหนึ่งใน ${BLOCKER_TYPES.join(" | ")}`);
  }
  if (v.task !== undefined && (!isStr(v.task) || v.task.trim() === "")) p.push(`${label}.task ต้องเป็น string ไม่ว่าง`);
  p.push(...nullableStringProblems(v.reference, `${label}.reference`));
  if (v.reason !== undefined && (!isStr(v.reason) || v.reason.trim() === "")) p.push(`${label}.reason ต้องเป็น string ไม่ว่าง`);
  return p;
}

// --- (ก) schema: packet ---
export function packetProblems(value: unknown): string[] {
  if (!isObj(value)) return ["packet root ต้องเป็น object"];
  const p: string[] = [];
  const req = [
    "packetVersion", "runId", "sessionId", "seq", "module", "role", "kind", "taskIds", "planPhase", "attempt",
    "dateFromUser", "docsRoot", "docsLayout", "selectedTarget", "gitPolicy", "readSections", "writeScope",
    "claim", "priorSession", "defectPacket", "reviewInput", "blocker", "rolePrompt", "brief", "outputContract",
  ] as const;
  for (const k of req) if (value[k] === undefined) p.push(`ขาด field "${k}"`);
  for (const k of Object.keys(value)) {
    if (!req.includes(k as (typeof req)[number])) p.push(`field ไม่รู้จัก "${k}" — packet ไม่มี field นอก data-model (AC-033)`);
  }
  if (value.packetVersion !== undefined && value.packetVersion !== 2) {
    p.push(`packetVersion ต้องเป็น 2 — ได้รับ ${JSON.stringify(value.packetVersion)}`);
  }
  for (const k of ["runId", "sessionId", "module", "docsRoot", "brief"] as const) {
    if (value[k] !== undefined && (!isStr(value[k]) || (value[k] as string).trim() === "")) p.push(`${k} ต้องเป็น string ไม่ว่าง`);
  }
  if (value.seq !== undefined && !isInt(value.seq)) p.push("seq ต้องเป็น int");
  if (value.attempt !== undefined && !isInt(value.attempt)) p.push("attempt ต้องเป็น int");
  if (value.role !== undefined && !(isStr(value.role) && (KNOWN_ROLES as readonly string[]).includes(value.role))) {
    p.push(`role ${JSON.stringify(value.role)} ไม่รู้จัก — ต้องเป็น 1 ใน 12 role`);
  }
  const kind = value.kind;
  if (kind !== undefined && !(isStr(kind) && KINDS.includes(kind))) p.push(`kind ${JSON.stringify(kind)} ไม่รู้จัก`);
  if (value.taskIds !== undefined) {
    if (!isArr(value.taskIds) || value.taskIds.some((t) => !isStr(t) || t.trim() === "")) {
      p.push("taskIds ต้องเป็น string[] (ค่าใน list ไม่ว่าง)");
    } else if (new Set(value.taskIds).size !== value.taskIds.length) {
      p.push("taskIds มี id ซ้ำ");
    } else if (value.taskIds.length === 0 && isStr(kind) && !["feature-qa", "record-only"].includes(kind)) {
      // R18: feature-qa taskIds = anchor (ไม่มี = ว่าง) · record-only จด gate ไม่ผูก task
      p.push(`taskIds ว่างได้เฉพาะ kind feature-qa/record-only — kind "${String(kind)}" ต้องมี task id อย่างน้อย 1 (AC-041)`);
    }
  }
  if (value.planPhase !== undefined) p.push(...nullableStringProblems(value.planPhase, "planPhase"));
  if (value.dateFromUser !== undefined && (!isStr(value.dateFromUser) || !isIsoDate(value.dateFromUser))) {
    p.push(`dateFromUser ${JSON.stringify(value.dateFromUser)} ต้องเป็นวันที่ YYYY-MM-DD (จากผู้ใช้ — ระบบไม่เดาวันที่)`);
  }
  if (value.docsLayout !== undefined && !(isStr(value.docsLayout) && LAYOUTS.includes(value.docsLayout))) {
    p.push(`docsLayout ${JSON.stringify(value.docsLayout)} ไม่รู้จัก`);
  }
  const st = value.selectedTarget;
  if (st !== undefined) {
    if (!isObj(st)) p.push("selectedTarget ต้องเป็น object {name, path}");
    else {
      for (const k of ["name", "path"] as const) {
        if (st[k] === undefined || !isStr(st[k]) || (st[k] as string).trim() === "") p.push(`selectedTarget.${k} ต้องเป็น string ไม่ว่าง`);
      }
    }
  }
  const gp = value.gitPolicy;
  if (gp !== undefined) {
    if (!isArr(gp)) p.push("gitPolicy ต้องเป็น list (คัดจาก run.json — DES-015)");
    else {
      gp.forEach((g, i) => {
        if (!isObj(g)) { p.push(`gitPolicy[${i}] ต้องเป็น object`); return; }
        for (const k of ["rootKind", "path", "commitAllowed", "warning"] as const) {
          if (g[k] === undefined) p.push(`gitPolicy[${i}] ขาด field "${k}"`);
        }
        if (g.rootKind !== undefined && !["knowledge", "target"].includes(g.rootKind as string)) {
          p.push(`gitPolicy[${i}].rootKind ต้องเป็น knowledge | target`);
        }
        if (g.path !== undefined && (!isStr(g.path) || g.path.trim() === "")) p.push(`gitPolicy[${i}].path ต้องเป็น string ไม่ว่าง`);
        if (g.commitAllowed !== undefined && typeof g.commitAllowed !== "boolean") p.push(`gitPolicy[${i}].commitAllowed ต้องเป็น boolean`);
        if (g.warning !== undefined) p.push(...nullableStringProblems(g.warning, `gitPolicy[${i}].warning`));
      });
    }
  }
  const rs = value.readSections;
  if (rs !== undefined) {
    if (!isArr(rs)) p.push("readSections ต้องเป็น string[]");
    else for (const [i, x] of rs.entries()) {
      const bad = readSectionPathProblems(x);
      if (bad) p.push(`readSections[${i}]: ${bad}`);
    }
  }
  const ws = value.writeScope;
  if (ws !== undefined) {
    if (!isObj(ws)) p.push("writeScope ต้องเป็น object {allow, deny}");
    else {
      if (ws.allow === undefined) p.push('writeScope ขาด field "allow"');
      else p.push(...nonEmptyStringArrayProblems(ws.allow, "writeScope.allow").concat(ws.allow !== undefined && (!isArr(ws.allow) || ws.allow.length < 1) ? ["writeScope.allow ต้องมีอย่างน้อย 1 รายการ (DES-006)"] : []));
      if (ws.deny === undefined) p.push('writeScope ขาด field "deny"');
      else p.push(...nonEmptyStringArrayProblems(ws.deny, "writeScope.deny"));
    }
  }
  if (value.claim !== undefined) p.push(...nonEmptyStringArrayProblems(value.claim, "claim"));
  const ps = value.priorSession;
  if (ps !== undefined && ps !== null) {
    if (!isObj(ps)) p.push("priorSession ต้องเป็น object {sessionId, touchedFiles} หรือ null");
    else {
      if (!isStr(ps.sessionId) || ps.sessionId.trim() === "") p.push("priorSession.sessionId ต้องเป็น string ไม่ว่าง");
      if (ps.touchedFiles !== undefined) p.push(...nonEmptyStringArrayProblems(ps.touchedFiles, "priorSession.touchedFiles"));
    }
  }
  const dp = value.defectPacket;
  if (dp !== undefined && dp !== null) {
    if (!isObj(dp)) p.push("defectPacket ต้องเป็น object หรือ null");
    else {
      if (!isStr(dp.taskId) || dp.taskId.trim() === "") p.push("defectPacket.taskId ต้องเป็น string ไม่ว่าง");
      if (!isStr(dp.source) || !["review", "qa", "feature-qa"].includes(dp.source)) p.push("defectPacket.source ต้องเป็น review | qa | feature-qa");
      if (!isStr(dp.roundFile) || dp.roundFile.trim() === "") p.push("defectPacket.roundFile ต้องเป็น string ไม่ว่าง (round ของ finding — DES-019/REV-034)");
      if (!isArr(dp.findings) || dp.findings.length < 1) p.push("defectPacket.findings ต้องมี finding อย่างน้อย 1 (AC-055)");
      else for (const [i, f] of dp.findings.entries()) {
        const isQa = isObj(f) && isStr(f.id) && QA_ID_RE.test(f.id);
        p.push(...(isQa ? qaDefectProblems(f, `defectPacket.findings[${i}]`, false) : reviewFindingProblems(f, `defectPacket.findings[${i}]`)));
      }
    }
  }
  const ri = value.reviewInput;
  if (ri !== undefined && ri !== null) {
    if (!isObj(ri)) p.push("reviewInput ต้องเป็น object หรือ null");
    else {
      if (!isArr(ri.tasks) || ri.tasks.length < 1) p.push("reviewInput.tasks ต้องมี task อย่างน้อย 1 (DES-019)");
      else ri.tasks.forEach((t, i) => {
        if (!isObj(t)) { p.push(`reviewInput.tasks[${i}] ต้องเป็น object`); return; }
        for (const k of ["taskId", "changedFiles", "diffPath", "testFiles"] as const) {
          if (t[k] === undefined) p.push(`reviewInput.tasks[${i}] ขาด field "${k}"`);
        }
        if (t.taskId !== undefined && (!isStr(t.taskId) || t.taskId.trim() === "")) p.push(`reviewInput.tasks[${i}].taskId ต้องเป็น string ไม่ว่าง`);
        if (t.changedFiles !== undefined) p.push(...nonEmptyStringArrayProblems(t.changedFiles, `reviewInput.tasks[${i}].changedFiles`));
        if (t.diffPath !== undefined) p.push(...nullableStringProblems(t.diffPath, `reviewInput.tasks[${i}].diffPath`));
        if (t.testFiles !== undefined) p.push(...nonEmptyStringArrayProblems(t.testFiles, `reviewInput.tasks[${i}].testFiles`));
      });
    }
  }
  const bl = value.blocker;
  if (bl !== undefined && bl !== null) p.push(...blockerProblems(bl, "blocker"));
  const rp = value.rolePrompt;
  if (rp !== undefined) {
    if (!isObj(rp)) p.push("rolePrompt ต้องเป็น object {source, hash}");
    else {
      if (!isStr(rp.source) || rp.source.trim() === "") p.push("rolePrompt.source ต้องเป็น string ไม่ว่าง");
      if (!isStr(rp.hash) || !HASH_RE.test(rp.hash)) p.push("rolePrompt.hash ต้องเป็น sha256:<64 hex> (BE-003)");
    }
  }
  const oc = value.outputContract;
  if (oc !== undefined) {
    if (!isObj(oc)) p.push("outputContract ต้องเป็น object");
    else {
      if (oc.handoffSchema !== "handoff-v2.json") p.push('outputContract.handoffSchema ต้องเป็น "handoff-v2.json"');
      if (oc.schemaEnforcedByCli !== undefined && typeof oc.schemaEnforcedByCli !== "boolean") {
        p.push("outputContract.schemaEnforcedByCli ต้องเป็น boolean");
      }
      const allowed = oc.allowedStates;
      if (!isArr(allowed) || allowed.length < 1 || allowed.some((s) => !OUTPUT_STATES.includes(s as string))) {
        p.push("outputContract.allowedStates ต้องเป็น OutputState[] ที่ไม่ว่าง (ชุด 7 ค่า)");
      } else if (isStr(kind) && isStr(value.role) && (KNOWN_ROLES as readonly string[]).includes(value.role)) {
        // ชุดที่ประกาศต้องตรงตาราง DES-018 ของ kind/role — ไม่งั้น rule (1) ตัดสินผิด
        const expect = [...allowedStatesFor(kind as PacketV2["kind"], value.role as PacketV2["role"])].sort();
        const got = [...allowed].sort();
        if (expect.join("|") !== got.join("|")) {
          p.push(`outputContract.allowedStates ไม่ตรงชุดของ kind "${kind}"/role "${value.role}" (DES-018) — ต้องเป็น ${expect.join(", ")}`);
        }
      }
    }
  }
  return p;
}

// --- (ก) schema: handoff ---
export function handoffSchemaProblems(value: unknown): string[] {
  if (!isObj(value)) return ["handoff root ต้องเป็น object"];
  const p: string[] = [];
  const req = [
    "role", "module", "sessionId", "outputState", "result", "changedDocs", "changedCode", "evidence",
    "nextRole", "questionsForHuman", "blocker", "impactedTasks", "decision", "review", "qa", "featureQa", "security",
  ] as const;
  for (const k of req) if (value[k] === undefined) p.push(`ขาด field "${k}"`);
  for (const k of Object.keys(value)) {
    if (!req.includes(k as (typeof req)[number]) && k !== "securityGate") {
      p.push(`field ไม่รู้จัก "${k}" — handoff-v2 ไม่มี field นอก data-model (เช่น status ของ v1 ถูกยกเลิก)`);
    }
  }
  if (value.role !== undefined && !(isStr(value.role) && (KNOWN_ROLES as readonly string[]).includes(value.role))) {
    p.push(`role ${JSON.stringify(value.role)} ไม่รู้จัก`);
  }
  for (const k of ["module", "sessionId", "result"] as const) {
    if (value[k] !== undefined && !isStr(value[k])) p.push(`${k} ต้องเป็น string`);
  }
  // module = STRING_MIN ตาม schema.ts — ชั้น validator ต้องตรงกันเสมอ ไม่ว่า CLI จะ enforce schema หรือไม่
  // (schemaEnforcedByCli = false ก็ต้องติด — DES-012 ตรวจ 2 ชั้น)
  if (value.module !== undefined && (!isStr(value.module) || value.module.trim() === "")) p.push("module ต้องเป็น string ไม่ว่าง");
  if (value.sessionId !== undefined && (!isStr(value.sessionId) || value.sessionId.trim() === "")) p.push("sessionId ต้องเป็น string ไม่ว่าง");
  // AC-068 — outputState นอก 7 ค่า → ระบบไม่เดินต่อ (R15)
  if (value.outputState !== undefined && !(isStr(value.outputState) && OUTPUT_STATES.includes(value.outputState))) {
    p.push(`outputState ${JSON.stringify(value.outputState)} นอกชุด 7 ค่า (DONE | PASS | FAIL | BLOCKED | NEEDS_DESIGN_CHANGE | NEEDS_REQUIREMENT_CHANGE | NEEDS_HUMAN)`);
  }
  for (const k of ["changedDocs", "changedCode", "evidence"] as const) {
    if (value[k] !== undefined) p.push(...nonEmptyStringArrayProblems(value[k], k));
  }
  if (value.nextRole !== undefined && !(isStr(value.nextRole) && [...KNOWN_ROLES, "none"].includes(value.nextRole))) {
    p.push(`nextRole ${JSON.stringify(value.nextRole)} ต้องเป็น role หนึ่งใน 12 หรือ "none"`);
  }
  const q = value.questionsForHuman;
  if (q !== undefined) {
    if (!isArr(q)) p.push("questionsForHuman ต้องเป็น list");
    else q.forEach((item, i) => {
      if (!isObj(item)) { p.push(`questionsForHuman[${i}] ต้องเป็น object`); return; }
      for (const k of ["gate", "question", "owner", "touchesSchemaOrContract"] as const) {
        if (item[k] === undefined) p.push(`questionsForHuman[${i}] ขาด field "${k}"`);
      }
      if (item.gate !== undefined && !(isStr(item.gate) && [...KNOWN_GATES, "none"].includes(item.gate))) {
        p.push(`questionsForHuman[${i}].gate ${JSON.stringify(item.gate)} ไม่รู้จัก — ต้องเป็น key ใน gates.yaml หรือ "none"`);
      }
      if (item.question !== undefined && (!isStr(item.question) || item.question.trim() === "")) p.push(`questionsForHuman[${i}].question ต้องเป็น string ไม่ว่าง (AC-014)`);
      if (item.owner !== undefined && (!isStr(item.owner) || item.owner.trim() === "")) p.push(`questionsForHuman[${i}].owner ต้องเป็น string ไม่ว่าง`);
      if (item.touchesSchemaOrContract !== undefined && item.touchesSchemaOrContract !== null && typeof item.touchesSchemaOrContract !== "boolean") {
        p.push(`questionsForHuman[${i}].touchesSchemaOrContract ต้องเป็น boolean หรือ null`);
      }
    });
  }
  const bl = value.blocker;
  if (bl !== undefined && bl !== null) p.push(...blockerProblems(bl, "blocker"));
  const it = value.impactedTasks;
  if (it !== undefined && it !== null) p.push(...nonEmptyStringArrayProblems(it, "impactedTasks"));
  const dec = value.decision;
  if (dec !== undefined && dec !== null) {
    if (!isObj(dec)) p.push("decision ต้องเป็น object หรือ null (AC-018)");
    else {
      for (const k of ["action", "module", "reason"] as const) {
        if (dec[k] === undefined) p.push(`decision ขาด field "${k}"`);
      }
      if (dec.action !== undefined && !["amend", "create"].includes(dec.action as string)) p.push("decision.action ต้องเป็น amend | create");
      if (dec.module !== undefined && (!isStr(dec.module) || dec.module.trim() === "")) p.push("decision.module ต้องเป็น string ไม่ว่าง");
      if (dec.reason !== undefined && (!isStr(dec.reason) || dec.reason.trim() === "")) p.push("decision.reason ต้องเป็น string ไม่ว่าง");
    }
  }
  const rv = value.review;
  if (rv !== undefined && rv !== null) {
    if (!isObj(rv)) p.push("review ต้องเป็น object หรือ null");
    else {
      for (const k of ["roundFile", "perTask", "findings"] as const) {
        if (rv[k] === undefined) p.push('review ขาด field "' + k + '"');
      }
      if (rv.roundFile !== undefined && (!isStr(rv.roundFile) || rv.roundFile.trim() === "")) p.push("review.roundFile ต้องเป็น string ไม่ว่าง");
      if (rv.perTask !== undefined) {
        if (!isArr(rv.perTask)) p.push("review.perTask ต้องเป็น list");
        else rv.perTask.forEach((t, i) => {
          if (!isObj(t)) { p.push(`review.perTask[${i}] ต้องเป็น object`); return; }
          if (t.task === undefined || !isStr(t.task) || t.task.trim() === "") p.push(`review.perTask[${i}].task ต้องเป็น string ไม่ว่าง`);
          if (t.verdict !== undefined && !["PASS", "FAIL"].includes(t.verdict as string)) p.push(`review.perTask[${i}].verdict ต้องเป็น PASS | FAIL`);
        });
      }
      if (rv.findings !== undefined) {
        if (!isArr(rv.findings)) p.push("review.findings ต้องเป็น list");
        else for (const [i, f] of rv.findings.entries()) p.push(...reviewFindingProblems(f, `review.findings[${i}]`));
      }
    }
  }
  const qa = value.qa;
  if (qa !== undefined && qa !== null) {
    if (!isObj(qa)) p.push("qa ต้องเป็น object หรือ null");
    else {
      for (const k of ["roundFile", "checks", "perTask", "defects"] as const) {
        if (qa[k] === undefined) p.push('qa ขาด field "' + k + '"');
      }
      if (qa.roundFile !== undefined && (!isStr(qa.roundFile) || qa.roundFile.trim() === "")) p.push("qa.roundFile ต้องเป็น string ไม่ว่าง");
      if (qa.checks !== undefined) {
        if (!isArr(qa.checks)) p.push("qa.checks ต้องเป็น list");
        else qa.checks.forEach((c, i) => {
          if (!isObj(c)) { p.push(`qa.checks[${i}] ต้องเป็น object`); return; }
          for (const k of ["command", "exitCode", "logRef"] as const) {
            if (c[k] === undefined) p.push(`qa.checks[${i}] ขาด field "${k}"`);
          }
          if (c.command !== undefined && (!isStr(c.command) || c.command.trim() === "")) p.push(`qa.checks[${i}].command ต้องเป็น string ไม่ว่าง`);
          if (c.exitCode !== undefined && !isInt(c.exitCode)) p.push(`qa.checks[${i}].exitCode ต้องเป็น int`);
          if (c.logRef !== undefined && (!isStr(c.logRef) || c.logRef.trim() === "")) p.push(`qa.checks[${i}].logRef ต้องเป็น string ไม่ว่าง`);
        });
      }
      if (qa.perTask !== undefined) {
        if (!isArr(qa.perTask)) p.push("qa.perTask ต้องเป็น list");
        else qa.perTask.forEach((t, i) => {
          if (!isObj(t)) { p.push(`qa.perTask[${i}] ต้องเป็น object`); return; }
          if (t.task === undefined || !isStr(t.task) || t.task.trim() === "") p.push(`qa.perTask[${i}].task ต้องเป็น string ไม่ว่าง`);
          if (t.verdict !== undefined && !["verified", "blocked"].includes(t.verdict as string)) p.push(`qa.perTask[${i}].verdict ต้องเป็น verified | blocked`);
        });
      }
      if (qa.defects !== undefined) {
        if (!isArr(qa.defects)) p.push("qa.defects ต้องเป็น list");
        else for (const [i, d] of qa.defects.entries()) p.push(...qaDefectProblems(d, `qa.defects[${i}]`, false));
      }
    }
  }
  const fq = value.featureQa;
  if (fq !== undefined && fq !== null) {
    if (!isObj(fq)) p.push("featureQa ต้องเป็น object หรือ null");
    else {
      for (const k of ["phase", "roundFile", "flows", "defects"] as const) {
        if (fq[k] === undefined) p.push('featureQa ขาด field "' + k + '"');
      }
      if (fq.phase !== undefined && (!isStr(fq.phase) || fq.phase.trim() === "")) p.push("featureQa.phase ต้องเป็น string ไม่ว่าง");
      if (fq.roundFile !== undefined && (!isStr(fq.roundFile) || fq.roundFile.trim() === "")) p.push("featureQa.roundFile ต้องเป็น string ไม่ว่าง");
      if (fq.flows !== undefined) {
        if (!isArr(fq.flows)) p.push("featureQa.flows ต้องเป็น list");
        else fq.flows.forEach((f, i) => {
          if (!isObj(f)) { p.push(`featureQa.flows[${i}] ต้องเป็น object`); return; }
          for (const k of ["flow", "ref", "result"] as const) {
            if (f[k] === undefined) p.push(`featureQa.flows[${i}] ขาด field "${k}"`);
          }
          for (const k of ["flow", "ref"] as const) {
            if (f[k] !== undefined && (!isStr(f[k]) || (f[k] as string).trim() === "")) p.push(`featureQa.flows[${i}].${k} ต้องเป็น string ไม่ว่าง`);
          }
          if (f.result !== undefined && !["PASS", "FAIL"].includes(f.result as string)) p.push(`featureQa.flows[${i}].result ต้องเป็น PASS | FAIL`);
        });
      }
      if (fq.defects !== undefined) {
        if (!isArr(fq.defects)) p.push("featureQa.defects ต้องเป็น list");
        else for (const [i, d] of fq.defects.entries()) p.push(...qaDefectProblems(d, `featureQa.defects[${i}]`, true));
      }
    }
  }
  const sec = value.security;
  if (sec !== undefined && sec !== null) {
    if (!isObj(sec)) p.push("security ต้องเป็น object หรือ null");
    else {
      if (sec.findings === undefined) p.push('security ขาด field "findings"');
      else if (!isArr(sec.findings)) p.push("security.findings ต้องเป็น list");
      else sec.findings.forEach((f, i) => {
        if (!isObj(f)) { p.push(`security.findings[${i}] ต้องเป็น object`); return; }
        for (const k of ["id", "severity", "ref"] as const) {
          if (f[k] === undefined) p.push(`security.findings[${i}] ขาด field "${k}"`);
        }
        if (f.id !== undefined && (!isStr(f.id) || f.id.trim() === "")) p.push(`security.findings[${i}].id ต้องเป็น string ไม่ว่าง`);
        if (f.severity !== undefined && !(isStr(f.severity) && SEVERITIES.includes(f.severity))) {
          p.push(`security.findings[${i}].severity ต้องเป็นหนึ่งใน ${SEVERITIES.join(" | ")}`);
        }
        if (f.ref !== undefined && (!isStr(f.ref) || f.ref.trim() === "")) p.push(`security.findings[${i}].ref ต้องเป็น string ไม่ว่าง`);
      });
    }
  }
  // securityGate — optional (ไม่มี field → ผ่าน, additive G2-f) · มี → ต้องเป็น list/null ของ {phase, reason}
  const sg = value.securityGate;
  if (sg !== undefined && sg !== null) {
    if (!isArr(sg)) p.push("securityGate ต้องเป็น list หรือ null");
    else sg.forEach((g, i) => {
      if (!isObj(g)) { p.push(`securityGate[${i}] ต้องเป็น object {phase, reason}`); return; }
      if (g.phase === undefined || !isStr(g.phase) || g.phase.trim() === "") p.push(`securityGate[${i}].phase ต้องเป็น string ไม่ว่าง`);
      if (g.reason === undefined || !isStr(g.reason) || g.reason.trim() === "") p.push(`securityGate[${i}].reason ต้องเป็น string ไม่ว่าง`);
    });
  }
  return p;
}

// --- (ข) กฎ (1)–(7) หลัง schema — DES-012 (เรียกเมื่อ handoffSchemaProblems ว่างแล้วเท่านั้น) ---
export function handoffRuleProblems(h: HandoffV2, packet: PacketV2): string[] {
  const p: string[] = [];
  const state = h.outputState as OutputState;

  // (1) outputState ต้องอยู่ในชุดของ session kind (DES-018) — ชุดประกาศใน packet.outputContract.allowedStates
  if (!packet.outputContract.allowedStates.includes(state)) {
    p.push(`(1) outputState ${state} นอกชุดของ kind "${packet.kind}" (${packet.outputContract.allowedStates.join(", ")}) — R15 (AC-068)`);
  }

  // (2) NEEDS_HUMAN ⇒ questionsForHuman ไม่ว่าง
  if (state === "NEEDS_HUMAN" && h.questionsForHuman.length === 0) {
    p.push("(2) NEEDS_HUMAN ต้องมี questionsForHuman อย่างน้อย 1 (gate + คำถามตรงตัว + owner — DES-012)");
  }

  // (3) BLOCKED / NEEDS_DESIGN_CHANGE / NEEDS_REQUIREMENT_CHANGE ⇒ blocker ครบ (AC-062)
  if (state === "NEEDS_DESIGN_CHANGE" || state === "NEEDS_REQUIREMENT_CHANGE" || state === "BLOCKED") {
    if (h.blocker === null) {
      p.push(`(3) outputState ${state} ต้องมี blocker {type, task, reference, reason} ครบ`);
    } else {
      const b: Blocker = h.blocker;
      if (state === "NEEDS_DESIGN_CHANGE") {
        if (b.type !== "design") p.push(`(3) NEEDS_DESIGN_CHANGE ต้องมี blocker.type = "design" — ได้รับ "${b.type}"`);
        if (!isStr(b.reference) || !DES_ID_RE.test(b.reference)) {
          p.push(`(3) NEEDS_DESIGN_CHANGE ต้องมี blocker.reference = DES-id — ได้รับ ${JSON.stringify(b.reference)} (AC-062)`);
        }
      } else if (state === "NEEDS_REQUIREMENT_CHANGE") {
        if (b.type !== "requirement") p.push(`(3) NEEDS_REQUIREMENT_CHANGE ต้องมี blocker.type = "requirement" — ได้รับ "${b.type}"`);
        if (!isStr(b.reference) || !REQ_AC_ID_RE.test(b.reference)) {
          p.push(`(3) NEEDS_REQUIREMENT_CHANGE ต้องมี blocker.reference = REQ/AC-id — ได้รับ ${JSON.stringify(b.reference)} (AC-062)`);
        }
      } else if (!BLOCKED_TYPES.includes(b.type)) {
        // DES-018 §รูป blocker: BLOCKED ใช้เฉพาะ environment|dependency|access|other
        p.push(`(3) BLOCKED ใช้เฉพาะ blocker.type ${BLOCKED_TYPES.join(" | ")} — ได้รับ "${b.type}" (design/requirement ไปทาง NEEDS_*)`);
      }
    }
  }

  // (4) kind review ⇒ review ครบทุก finding field (AC-050) · qa ⇒ checks command ไม่ซ้ำ + perTask ครบทุก task
  //     ใน packet · feature-qa ⇒ featureQa.flows ไม่ว่าง (AC-058)
  if (packet.kind === "review") {
    if (h.review === null) p.push("(4) kind review ต้องมี review block ครบ (roundFile/perTask/findings — AC-050)");
    else {
      for (const [i, f] of h.review.findings.entries()) p.push(...reviewFindingProblems(f, `review.findings[${i}]`));
    }
  }
  if (packet.kind === "qa") {
    if (h.qa === null) p.push("(4) kind qa ต้องมี qa block ครบ (roundFile/checks/perTask/defects)");
    else {
      const seen = new Set<string>();
      for (const c of h.qa.checks) {
        if (seen.has(c.command)) p.push(`(4) qa.checks command ซ้ำ: "${c.command}" — shared checks รันครั้งเดียวต่อรอบ (AC-054)`);
        seen.add(c.command);
      }
      const inPacket = new Set(packet.taskIds);
      const reported = new Set(h.qa.perTask.map((t) => t.task));
      for (const t of packet.taskIds) {
        if (!reported.has(t)) p.push(`(4) qa.perTask ขาด task "${t}" ของ packet — ต้องครบทุก task`);
      }
      for (const t of reported) {
        if (!inPacket.has(t)) p.push(`(4) qa.perTask มี task "${t}" นอก packet (${packet.taskIds.join(", ") || "ว่าง"})`);
      }
      for (const [i, d] of h.qa.defects.entries()) p.push(...qaDefectProblems(d, `qa.defects[${i}]`, false));
    }
  }
  if (packet.kind === "feature-qa") {
    if (h.featureQa === null) p.push("(4) kind feature-qa ต้องมี featureQa block ครบ (phase/roundFile/flows/defects)");
    else if (h.featureQa.flows.length === 0) p.push("(4) featureQa.flows ว่าง — ต้องระบุ user flow ที่ทดสอบพร้อมผล (AC-058)");
  }

  // (5) PM ใน change chain ⇒ impactedTasks (ว่างได้) — R13 ใช้ตอน PM DONE จึงบังคับเมื่อ outputState DONE
  if (packet.kind === "change" && packet.role === "project-manager" && state === "DONE" && h.impactedTasks === null) {
    p.push("(5) PM DONE ใน change chain ต้องมี impactedTasks (ว่างได้ — R13 ใช้ dispatch งานที่กระทบ)");
  }

  // (6) sessionId ตรงกับ packet
  if (h.sessionId !== packet.sessionId) {
    p.push(`(6) sessionId "${h.sessionId}" ไม่ตรงกับ packet "${packet.sessionId}"`);
  }

  // (7) securityGate (optional — G2-f): ไม่ null ได้เฉพาะ kind qa/feature-qa · phase = planPhase · reason ไม่ว่าง → R23
  if (h.securityGate !== undefined && h.securityGate !== null) {
    if (packet.kind !== "qa" && packet.kind !== "feature-qa") {
      p.push(`(7) securityGate ได้เฉพาะ kind qa/feature-qa — kind "${packet.kind}" ต้องไม่มี (หรือ null)`);
    } else {
      for (const g of h.securityGate) {
        if (g.reason.trim() === "") p.push("(7) securityGate.reason ว่างไม่ได้ — ต้องอธิบายเหตุผลที่ phase ต้องมี 🔒 (R23)");
        if (g.phase !== packet.planPhase) {
          p.push(`(7) securityGate.phase "${g.phase}" ≠ planPhase ของ packet "${packet.planPhase}" — R15 (R23)`);
        }
      }
    }
  }
  return p;
}

// ตรวจครบทั้ง 2 ชั้นตามลำดับ — schema ไม่ผ่านไม่รันกฎ (กฎอ่าน field ที่ schema การันตีแล้ว)
export function handoffProblems(value: unknown, packet: PacketV2): string[] {
  const schema = handoffSchemaProblems(value);
  if (schema.length > 0) return schema;
  return handoffRuleProblems(value as HandoffV2, packet);
}
