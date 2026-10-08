// BE-010 — Intake งานใหม่ → BA packet (DES-010 · REQ-007 AC-017/018/019): ทางเข้าที่ BE-015 เรียกจาก
// `POST /api/tasks/new` — ข้อความดิบ (untrusted) กลายเป็น run mode=new-work ที่ dispatch ตรงถึง
// business-analyst (session kind `change`) โดยไม่มีชั้นจัดหมวด (AC-017) แล้วเดิน change chain
// กรณี 1 ของ DES-001 ต่อเอง (BA → SA → PM) จนถึง gate ถัดไป (AC-019)
// ทำไมไม่ใช้ PipelineDriver: driver ไม่ dispatch เมื่อ run.planFormat === "none" (driver.ts dispatchLoop —
// "intake เป็นของ BE-010" ตามที่ BE-011 จงใจเว้นไว้) และ tryStart เป็น private — intake เลยเป็นตัวเดิน
// change chain เอง โดย reuse component เดิมทุกชั้น (packet BE-006 · role prompt BE-003 · camp/model
// BE-005/004 · claim/audit BE-021/008 · gate BE-009 · state BE-007) ไม่เขียน mechanism ซ้ำนอกชั้นจำเป็น
// ความต่างจาก driver ที่จงใจ (รายงาน handoff): (1) readSections ของ intake คัดเฉพาะไฟล์ที่ "มีจริง" ของ
// แถว ba/sa/pm ใน DES-020 — module งานใหม่ยังไม่มี plan\index.md จึงเรียก loadContext ไม่ได้ (BE-020
// fail-closed ที่ plan-index ก่อนแถว role) (2) task id ของ chain = NEW_WORK_TASK_ID ("NW-1") เพราะ
// packet kind change ต้องมี task id ≥ 1 (AC-041 — BE-006) ทั้งที่ยังไม่มี plan — reconcileRun (BE-007)
// ลบ task ที่ไม่อยู่ใน plan ทิ้งเองเมื่อ PM เขียน plan แล้ว (เอกสารชนะ) (3) fail-closed ทุกจุดเดียวกับ
// driver: ข้อความว่าง/เกินลิมิต/module ไม่ถูกรูป → ปฏิเสธ "ก่อน" สร้าง run · context/handoff ผิดรูป → hold
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { ConfigError, configSnapshot, resolveRunRoots, type AppConfig } from "./config.ts";
import { newDispatchSessionIds } from "./batching.ts";
import { buildPacketV2 } from "./contract/packet-builder.ts";
import { handoffV2JsonSchema } from "./contract/schema.ts";
import { handoffProblems } from "./contract/validate.ts";
import type { CampAdapter, CampDispatch, CampOutcome } from "./contract/camp-adapter.ts";
import type { PacketV2 } from "./contract/types.ts";
import { answerGate, dispatchBlocker, handoffGateProposals, openGate, openGateRecords } from "./gates.ts";
import { KnowledgePathError, assertModuleName, moduleDir, resolveDocPath, type DocUnit, type DocsLayout } from "./knowledge-paths.ts";
import { resolveCamp } from "./routing.ts";
import { formatModelPolicyBasis, resolveEffectiveModelPolicy } from "./tiers.ts";
import { loadRolePrompt } from "./role-prompts.ts";
import { ClaimError, finishSessionAudit, resolveClaim, startSessionAudit, type AuditRoot, type DenyPaths, type PatternScope } from "./session-audit.ts";
import {
  appendRouterLog, createRun, saveRun, setPointer, statePaths,
  type CreateRunInit, type GateId, type GateRecord, type HandoffV2, type RunJson, type RunStatus,
  type SessionRecord, type TaskRuntime,
} from "./state-store.ts";

export class IntakeError extends Error {
  constructor(
    readonly kind:
      | "empty-text" // ข้อความว่าง (AC-017/DES-010 — ปฏิเสธก่อนสร้าง run)
      | "text-too-long" // เกิน 20,000 ตัวอักษร (DES-009/010)
      | "bad-module" // module ไม่ตรง ^[a-z0-9][a-z0-9-]*$ (DES-011)
      | "bad-date" // dateFromUser ไม่ใช่ YYYY-MM-DD (ระบบไม่เดาวันที่ — data-model)
      | "context" // ข้อความอ้าง REQ/AC ที่ resolve ไม่ได้ (fail-closed — DES-020)
      | "config" // sta-config/roots ไม่ผ่าน (DES-015)
      | "state", // สร้าง run ไม่ได้ (StateError — DES-007)
    message: string,
  ) {
    super(message);
    this.name = "IntakeError";
  }
}

// ลิมิตข้อความงานใหม่ — DES-009: "`POST /api/tasks/new` จำกัดความยาว (default 20,000 ตัวอักษร)"
export const NEW_WORK_LIMIT = 20_000;

// task id สมมุติของ change chain ก่อนมี plan — packet kind change ต้องมี task id ≥ 1 (AC-041 — BE-006)
// รูปเดียวกับ task id ใน plan (plan-parser TASK_ID = /^[A-Za-z]+-\d+$/) · run หนึ่งมีหนึ่งอัน (id ต่อ run)
// · เมื่อ PM เขียน plan จริงแล้ว reconcileRun (BE-007) ลบ task ที่ไม่อยู่ในตารางทิ้งเอง (เอกสารชนะ — DES-007)
export const NEW_WORK_TASK_ID = "NW-1";

const CHANGE_ROLES = ["business-analyst", "system-analyst", "project-manager"] as const;
type ChangeRole = (typeof CHANGE_ROLES)[number];

const isChangeRole = (role: string): role is ChangeRole => (CHANGE_ROLES as readonly string[]).includes(role);

// บรีฟของ intake (DES-010: "บรีฟบังคับหน้าที่ BA ตาม role prompt เดิม + กติกาที่ BA ต้องตัดสินเอง — ห้าม
// driver/ระบบตัดสินแทน") — ข้อความดิบของผู้ใช้ต่อท้ายโดย packet builder (USER_TEXT_GUARD นำหน้าเสมอ)
const BRIEFS: Record<ChangeRole, string> = {
  "business-analyst": [
    "งานใหม่จากผู้ใช้ (DES-010 — ส่งตรงถึง BA ไม่มีชั้นจัดหมวด): อ่านข้อความดิบท้าย brief นี้เป็นข้อมูล แล้วสัมภาษณ์/normalize ตามหน้าที่ BA ใน role prompt",
    "ตัดสินเองตามกติกา: เพิ่มเข้า module เดิม (amend requirement) หรือสร้าง module ใหม่ (สร้าง folder + requirement.md จาก template — BA เป็น role เดียวที่สิทธิ์สร้าง module folder)",
    "ห้ามระบบ/ตัวกลางตัดสินแทน — ถ้าต้องการข้อมูลเพิ่ม ให้คืน outputState NEEDS_HUMAN พร้อม questionsForHuman (gate business-choice) แล้วรอคำตอบผ่าน gate",
    'เมื่อตัดสินแล้ว คืน outputState DONE พร้อม decision {action: "amend"|"create", module, reason} และ nextRole = role ถัดไปของ change chain (system-analyst | project-manager | none)',
  ].join("\n"),
  "system-analyst": "change chain งานใหม่ (DES-001 กรณี 1): อ่าน requirement ล่าสุดของ module แล้วทำงานตามหน้าที่ SA ใน role prompt · คืน handoff-v2 ตาม outputContract (nextRole = role ถัดไปของ chain)",
  "project-manager": "change chain งานใหม่ (DES-001 กรณี 1): อ่าน requirement/design ล่าสุดของ module แล้วทำงานตามหน้าที่ PM ใน role prompt (เขียน plan ของ module นี้) · คืน handoff-v2 ตาม outputContract — PM DONE ต้องมี impactedTasks (ว่างได้)",
};

export interface IntakeInput {
  config: AppConfig; // โหลด + validate แล้วโดย BE-001 (entry จริง) — intake อ่านอย่างเดียว
  selection: { knowledge: string; target: string }; // sta-config → docsRoot + codeRoots (DES-015)
  module: string; // module ตั้งต้นที่ผูก run งานใหม่ (BE-015 ส่งจาก UI) — BA ยังอาจตัดสิน module อื่นภายหลัง (AC-018)
  text: string; // ข้อความดิบจากผู้ใช้ — untrusted (AC-017) — เป็นข้อมูลใน packet เท่านั้น (DES-012 Security)
  dateFromUser: string; // YYYY-MM-DD จากผู้ใช้ — ระบบไม่เดาวันที่ (data-model)
  adapters: Readonly<Record<string, CampAdapter>>; // camp → adapter (ทดสอบ = fake — core ไม่ import camps)
  runOverrideCamp?: string; // ชั้น 1 ของ routing (DES-005)
  now?: () => Date; // fake clock ของ test — default นาฬิกาเครื่อง
}

// ตัวควบคุม run งานใหม่ — BE-015 เก็บไว้เรียกต่อใน process เดียวกัน (DES-009: server รันใน process เดียวกับ driver)
export interface NewWorkHandle {
  readonly runId: string;
  run(): RunJson;
  notes(): readonly string[]; // dashboard — เหตุผลการตัดสิน/ข้อผิดพลาดที่ไม่งั้น run จะเงียบ
  openGates(): GateRecord[];
  // ตอบ gate ของงานใหม่ (BE-009 lifecycle เดิม) — แล้วบรีฟรอบถัดไปฉีดคำตอบ + เดิน chain ต่อ (DES-010)
  answerGate(gateId: GateId, input: { answeredBy: string; answer: string; note?: string | null }): GateRecord;
  settle(maxLoops?: number): Promise<RunJson>; // รอ change chain เงียบ (test/UI)
}

// ผลตัดสินล่าสุดของ BA งานใหม่ (AC-018 — "เพิ่มเข้า module X" / "สร้าง module ใหม่ Y" พร้อมเหตุผล) —
// แหล่งเดียวคือ handoff ที่เก็บใน run.json (SessionRecord.handoff.decision — UI อ่านจาก state ไม่อุปโลกน์)
export function newWorkDecision(run: RunJson): HandoffV2["decision"] {
  for (let i = run.sessions.length - 1; i >= 0; i--) {
    const s = run.sessions[i]!;
    if (s.role === "business-analyst" && s.handoff?.decision) return s.handoff.decision;
  }
  return null;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// gitPolicy freeze (DES-015) — replicate ตรงจาก driver.deriveGitPolicy (private — แก้ driver.ts ไม่ได้):
// REQ-009 (gituse/commit) ไม่อยู่ R1 → commitAllowed false เสมอ (BL-017)
function deriveGitPolicy(knowledgeName: string, docsRoot: string, target: { name: string; path: string }): RunJson["gitPolicy"] {
  const mk = (rootKind: "knowledge" | "target", name: string, p: string): RunJson["gitPolicy"][number] => {
    const repo = existsSync(path.join(p, ".git"));
    return {
      rootKind, name, path: p, gituse: false, basis: "default", repo,
      repoTop: repo ? p : null, commitAllowed: false,
      auditMode: repo ? "git" : "manifest",
      warning: "REQ-009 (gituse) ไม่อยู่ R1 — ห้าม commit (BL-017)",
    };
  };
  return [mk("knowledge", knowledgeName, docsRoot), mk("target", target.name, target.path)];
}

// --- readSections ของ intake — แถว ba/sa/pm ของตาราง DES-020 เฉพาะไฟล์ที่ "มีจริง" (ไม่เดาไฟล์ — DES-020) ---
// เรียก loadContext (BE-020) ตรง ๆ ไม่ได้เพราะต้องมี plan\index.md ซึ่งงานใหม่ยังไม่มี — ความต่างที่จงใจ
// (รายงาน handoff): ไม่ fail กับไฟล์โครงที่ยังไม่เกิด (design docs เป็น "ผลลัพธ์" ของ chain เอง)
// แต่ REQ/AC ที่ "ข้อความงานใหม่อ้าง" ยัง fail-closed เต็มรูป (DES-020 แถว ba: "+ REQ ที่ blocker/งานใหม่อ้าง")
interface IntakeContext {
  readSections: string[]; // path สัมพัทธ์ module folder รูป packet (DES-012 — backslash)
  contextFiles: string[]; // AC-047 — ไฟล์ใน packet + id ที่ resolve
  error: string | null; // ไม่ null = ปฏิเสธก่อนสร้าง run (fail-closed)
}

interface ReqIndex {
  reqs: Map<string, string[]>; // REQ-NNN → AC ids ในคอลัมน์ AC ids (รูปเดียวกับ requirementIndex ของ BE-020)
}

// ตาราง REQ แรกของ requirement\index.md (header คอลัมน์แรก = "REQ") — scan เบา ไม่แทน parser ของ BE-020
function scanRequirementIndex(text: string): ReqIndex {
  const ls = text.split(/\r?\n/);
  const reqs = new Map<string, string[]>();
  for (let i = 0; i < ls.length; i++) {
    if (!ls[i]!.trimStart().startsWith("|")) continue;
    const header = ls[i]!.split("|").map((c) => c.replace(/[`*]/g, "").trim());
    if ((header[1] ?? "").toLowerCase() !== "req") continue;
    const acCol = header.findIndex((h, j) => j > 0 && /^ac\b/i.test(h));
    for (let k = i + 2; k < ls.length && ls[k]!.trimStart().startsWith("|"); k++) {
      const cells = ls[k]!.split("|").map((c) => c.replace(/[`*]/g, "").trim());
      const id = /^REQ-\d{3}$/.exec(cells[1] ?? "")?.[0]?.toUpperCase();
      if (!id) continue;
      const acs = acCol > 0 ? [...(cells[acCol] ?? "").matchAll(/\bAC-\d{3}\b/gi)].map((m) => m[0].toUpperCase()) : [];
      reqs.set(id, acs);
    }
    break; // ตาราง REQ แรกพอ — รูปเดียวกับ BE-020 (byFirstHeader "req")
  }
  return { reqs };
}

function intakeContext(docsRoot: string, layout: DocsLayout, module: string, role: ChangeRole, userText: string | null): IntakeContext {
  const dir = moduleDir(docsRoot, layout, module);
  const toRel = (abs: string): string => path.relative(dir, abs).split(path.sep).join("\\");
  const sections: string[] = [];
  const contextFiles: string[] = [];
  const addUnit = (unit: DocUnit, entry?: { id: string }): boolean => {
    const abs = resolveDocPath(docsRoot, layout, module, { unit });
    if (!existsSync(abs)) return false;
    const rel = toRel(abs);
    if (!sections.includes(rel)) sections.push(rel);
    contextFiles.push(entry === undefined ? rel : `${entry.id} -> ${rel}`);
    return true;
  };
  // ไฟล์โครงตามแถว DES-020 — มีจริงเท่านั้น (bases → trailing)
  const bases: Record<ChangeRole, DocUnit[]> = {
    "business-analyst": ["requirement-index", "requirement-scope"],
    "system-analyst": ["requirement-index", "requirement-scope"],
    "project-manager": ["plan-index", "design-index", "requirement-index"],
  };
  const trailing: Record<ChangeRole, DocUnit[]> = {
    "business-analyst": ["oq-index"],
    "system-analyst": ["design-index", "design-data-model"],
    "project-manager": [],
  };
  for (const u of bases[role]) addUnit(u);
  for (const u of trailing[role]) addUnit(u);

  // REQ/AC ที่ข้อความงานใหม่อ้าง (เฉพาะ BA — DES-020 แถว ba) — อ้างแล้ว resolve ไม่ได้ = ปฏิเสธ (fail-closed)
  if (role === "business-analyst" && userText !== null) {
    const ids = [...new Set([...userText.matchAll(/\b(?:REQ|AC)-\d{3}\b/g)].map((m) => m[0].toUpperCase()))].sort();
    if (ids.length > 0) {
      const idxAbs = resolveDocPath(docsRoot, layout, module, { unit: "requirement-index" });
      if (!existsSync(idxAbs)) {
        return { readSections: sections, contextFiles, error: `ข้อความอ้าง ${ids.join(", ")} แต่ไม่พบ requirement\\index.md ของ module ${module} — ปฏิเสธก่อนสร้าง run (fail-closed — DES-020)` };
      }
      const idx = scanRequirementIndex(readFileSync(idxAbs, "utf8"));
      for (const id of ids) {
        const owners = id.startsWith("AC-")
          ? [...idx.reqs.entries()].filter(([, acs]) => acs.includes(id)).map(([req]) => req)
          : [id];
        if (owners.length === 0) {
          return { readSections: sections, contextFiles, error: `${id} ไม่พบใน requirement\\index.md ของ module ${module} — ปฏิเสธก่อนสร้าง run (fail-closed — DES-020 ไม่เดาไฟล์)` };
        }
        if (owners.length > 1) {
          return { readSections: sections, contextFiles, error: `${id} ปรากฏในหลาย REQ (${owners.join(", ")}) — resolve ซ้ำไม่ชัด (fail-closed — DES-020)` };
        }
        const reqId = owners[0]!;
        if (!idx.reqs.has(reqId)) {
          return { readSections: sections, contextFiles, error: `${reqId} (จาก ${id}) ไม่พบใน requirement\\index.md — ปฏิเสธก่อนสร้าง run (fail-closed — DES-020)` };
        }
        // ชื่อไฟล์มาจาก REQ เจ้าของเสมอ (context-loader รูปเดียวกัน — req-<เลข REQ>.md) ไม่ใช่ id ที่อ้าง (AC สั้นกว่า)
        const fileAbs = resolveDocPath(docsRoot, layout, module, { unit: "requirement-req", name: `req-${reqId.slice(4)}.md` });
        if (!existsSync(fileAbs)) {
          return { readSections: sections, contextFiles, error: `index ชี้ไฟล์ที่ไม่มี: ${toRel(fileAbs)} (fail-closed — DES-020)` };
        }
        const rel = toRel(fileAbs);
        if (!sections.includes(rel)) sections.push(rel);
        contextFiles.push(`${id} -> ${rel}`);
      }
    }
  }
  return { readSections: sections, contextFiles, error: null };
}

const RUN_STATUS_LOG = "run-status"; // transition ของ run.status (DES-001) — รูปเดียวกับ driver
const DISPATCH_LOG = "dispatch"; // บรรทัด dispatch ของตัวเดิน pipeline (driver ใช้ชื่อเดียวกัน)
const INTAKE_LOG = "intake"; // การตัดสินเฉพาะของ intake (pointer/AC-018/chain) — แยกจาก R* ของ router

class NewWorkRun {
  private readonly cfg: AppConfig;
  private readonly home: string;
  private readonly paths: ReturnType<typeof statePaths>;
  private readonly docsRoot: string;
  private readonly codeRoots: string[];
  private readonly target: { name: string; path: string };
  private readonly knowledgeName: string;
  private readonly adapters: Readonly<Record<string, CampAdapter>>;
  private readonly dateFromUser: string;
  private readonly now: () => Date;
  private readonly packets = new Map<string, PacketV2>();
  private readonly live = new Map<string, Promise<CampOutcome>>();
  private readonly _notes: string[] = [];
  private run: RunJson;

  constructor(cfg: AppConfig, docsRoot: string, codeRoots: string[], target: { name: string; path: string }, knowledgeName: string, adapters: Readonly<Record<string, CampAdapter>>, dateFromUser: string, run: RunJson, now: () => Date) {
    this.cfg = cfg;
    this.home = cfg.registry.orchestratorHome;
    this.paths = statePaths(this.home);
    this.docsRoot = docsRoot;
    this.codeRoots = codeRoots;
    this.target = target;
    this.knowledgeName = knowledgeName;
    this.adapters = adapters;
    this.dateFromUser = dateFromUser;
    this.run = run;
    this.now = now;
  }

  runId(): string {
    return this.run.runId;
  }

  getRun(): RunJson {
    return this.run;
  }

  notes(): readonly string[] {
    return this._notes;
  }

  openGates(): GateRecord[] {
    return openGateRecords(this.run);
  }

  private note(message: string): void {
    this._notes.push(message);
  }

  private log(ruleId: string, taskId: string, from: string, to: string, reason: string): void {
    appendRouterLog(this.home, JSON.stringify({ ruleId, taskId, from, to, reason }));
  }

  private save(): void {
    this.run = saveRun(this.home, this.run); // atomic ทุก transition (DES-007)
  }

  private auditRoots(): AuditRoot[] {
    return this.run.gitPolicy.map((g) => ({ rootKind: g.rootKind, name: g.name, path: g.path, auditMode: g.auditMode, repoTop: g.repoTop }));
  }

  private scope(): PatternScope {
    return { docsRoot: this.docsRoot, codeRoots: this.codeRoots, packRoot: this.cfg.registry.packRoot, module: this.run.module, docsLayout: this.cfg.registry.docsLayout };
  }

  private denyPaths(): DenyPaths {
    return { orchestratorHome: this.home, staConfigPath: this.cfg.staConfigPath };
  }

  // --- transition ของ run.status (DES-001: queued → running ⇄ idle → waiting-on-human) — ตัดสินจาก state ล้วน ---
  private transitionStatus(): void {
    const active = this.run.sessions.some((s) => s.endedAt === null);
    const gates = openGateRecords(this.run).length;
    const rt = this.run.tasks[NEW_WORK_TASK_ID];
    let next: RunStatus;
    if (active) next = "running";
    else if (gates > 0 || (rt !== undefined && rt.hold !== null)) next = "waiting-on-human"; // gate รอเจ้าของ / hold ของ chain
    else next = "idle"; // chain จบ — งานต่อไปเป็นของ driver เมื่อ resume (plan เขียนแล้ว)
    if (next !== this.run.status) {
      this.log(RUN_STATUS_LOG, "", this.run.status, next, `intake: active=${active} gates=${gates} hold=${rt?.hold?.reason ?? "-"}`);
      this.run.status = next;
    }
  }

  // --- dispatch 1 session ของ change chain (kind change — serial ต่อ run, DES-001 กรณี 1) ---
  private dispatchChain(role: ChangeRole, opts: { gateAnswer?: { gateId: GateId; answeredBy: string; answer: string }; priorSession?: { sessionId: string; touchedFiles: string[] } } = {}): void {
    const run = this.run;
    const rt = run.tasks[NEW_WORK_TASK_ID]!;
    if (dispatchBlocker(run, [NEW_WORK_TASK_ID]) !== null) {
      this.note("gate เปิดอยู่ — ไม่ dispatch จนตอบ (AC-013)"); // กันเผื่อเรียกซ้อน — ปกติ chain หยุดที่ gate แล้ว
      return;
    }
    const registry = this.cfg.registry;
    const layout = registry.docsLayout;

    // role prompt (BE-003) — ไม่พบ → ปฏิเสธ dispatch (fail-closed เดียวกับ driver)
    let rolePrompt;
    try {
      rolePrompt = loadRolePrompt(registry.rolePromptRoot, role);
    } catch (e) {
      this.note(`ปฏิเสธ dispatch ${role}: ${(e as Error).message}`);
      this.log(DISPATCH_LOG, NEW_WORK_TASK_ID, "", "", `ปฏิเสธ dispatch: ${(e as Error).message}`);
      return;
    }

    // readSections ของ intake (ดูหัวไฟล์) — error = fail-closed ไม่ dispatch
    const userText = opts.gateAnswer === undefined ? run.newWorkText : this.gateAnswerText(opts.gateAnswer);
    const ctx = intakeContext(this.docsRoot, layout, run.module, role, role === "business-analyst" ? userText : null);
    if (ctx.error !== null) {
      this.note(ctx.error);
      this.log(DISPATCH_LOG, NEW_WORK_TASK_ID, "", "", `context-error: ${ctx.error}`);
      return;
    }

    // claim (DES-021 ข้อ 1) — change session ไม่มี task file → claim = allow ของ role
    const routeDef = this.cfg.routing.role_routes[role];
    let claim: string[];
    try {
      claim = resolveClaim({ writePaths: null, allow: routeDef?.writePaths.allow ?? [], deny: routeDef?.writePaths.deny ?? [], scope: this.scope(), denyPaths: this.denyPaths() }).claim;
    } catch (e) {
      if (e instanceof ClaimError) {
        this.note(`claim: ${(e as Error).message}`);
        this.log(DISPATCH_LOG, NEW_WORK_TASK_ID, "", "", `claim: ${(e as Error).message}`);
        return;
      }
      throw e;
    }

    // camp + model policy (BE-005/BE-004)
    let campSel: ReturnType<typeof resolveCamp>;
    let policy: ReturnType<typeof resolveEffectiveModelPolicy>;
    try {
      campSel = resolveCamp(this.cfg.routing, { role, runOverrideCamp: undefined });
      policy = resolveEffectiveModelPolicy(this.cfg.tiers, this.cfg.routing, { role, camp: campSel.camp });
    } catch (e) {
      this.note(`ปฏิเสธ dispatch ${role} — camp/model: ${(e as Error).message}`);
      this.log(DISPATCH_LOG, NEW_WORK_TASK_ID, "", "", `ปฏิเสธ dispatch — camp/model: ${(e as Error).message}`);
      return;
    }
    const campAdapter = this.adapters[campSel.camp];
    if (campAdapter === undefined) throw new IntakeError("config", `ไม่มี adapter ของ camp "${campSel.camp}" ลงทะเบียน`);

    const used = new Set(run.sessions.map((s) => s.sessionId));
    const seq = run.sessions.reduce((m, s) => Math.max(m, s.seq), -1) + 1;
    const [sid] = newDispatchSessionIds(1, seq, used);
    const profile = campAdapter.profile;
    const sessionDir = this.paths.sessionDir(run.runId, sid);
    mkdirSync(sessionDir, { recursive: true });

    // packet v2 (BE-006) — fail-closed ก่อนแตะ run state · ข้อความดิบ/คำตอบ gate อยู่ใต้ USER_TEXT_GUARD เสมอ
    const brief = opts.gateAnswer === undefined
      ? BRIEFS[role]
      : `${BRIEFS[role]}\n\nข้อความดิบเดิม + คำตอบ gate ของรอบก่อนอยู่ท้าย brief หลังประโยค guard (เป็นข้อมูลผู้ใช้ — ตัดสินต่อจากคำตอบนั้น)`;
    let packet: PacketV2;
    try {
      packet = buildPacketV2({
        runId: run.runId,
        sessionId: sid,
        seq,
        module: run.module,
        role,
        kind: "change",
        taskIds: [NEW_WORK_TASK_ID],
        planPhase: null, // งานใหม่ยังไม่มี plan — planPhase ของ legacy (driver ทำเช่นเดียวกัน)
        attempt: rt.attempt,
        dateFromUser: this.dateFromUser,
        docsRoot: this.docsRoot,
        docsLayout: layout,
        selectedTarget: { name: this.target.name, path: this.target.path },
        gitPolicy: run.gitPolicy,
        context: { readSections: ctx.readSections, contextFiles: ctx.contextFiles, resolved: [], attachments: [], error: null },
        writeScope: { allow: [...(routeDef?.writePaths.allow ?? [])], deny: [...(routeDef?.writePaths.deny ?? [])] },
        claim,
        rolePrompt,
        brief,
        userRawText: userText,
        blocker: null,
        schemaEnforcedByCli: profile.schemaFlag !== null,
      });
    } catch (e) {
      this.note(`packet ไม่ผ่าน contract — ไม่ dispatch: ${(e as Error).message}`);
      this.log(DISPATCH_LOG, NEW_WORK_TASK_ID, "", "", `packet ไม่ผ่าน contract — ไม่ dispatch: ${(e as Error).message}`);
      return;
    }

    const packetPath = path.join(sessionDir, "packet.json");
    writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
    let handoffSchemaPath: string | null = null;
    if (profile.schemaFlag !== null) {
      handoffSchemaPath = path.join(sessionDir, "handoff-schema.json");
      writeFileSync(handoffSchemaPath, `${JSON.stringify(handoffV2JsonSchema(), null, 2)}\n`, "utf8");
    }

    const record: SessionRecord = {
      sessionId: sid,
      seq,
      kind: "change",
      role,
      taskIds: [NEW_WORK_TASK_ID],
      planPhase: null,
      attempt: rt.attempt,
      camp: campSel.camp,
      model: policy.model,
      effort: policy.effort,
      tier: policy.effectiveTier,
      modelBasis: policy.modelBasis,
      effortBasis: policy.effortBasis,
      basisReason: `camp=${campSel.camp}(${campSel.basis}); ${formatModelPolicyBasis(policy)}`, // AC-005
      packetPath: `sessions/${sid}/packet.json`,
      rolePromptHash: rolePrompt.hash,
      cliVersion: null,
      pid: null,
      cliSessionId: null,
      claim,
      contextFiles: ctx.contextFiles, // AC-047
      priorSession: opts.priorSession ?? null, // restart (DES-007)
      startedAt: this.now().toISOString(),
      endedAt: null,
      exitCode: null,
      outcome: null,
      handoff: null,
      logsPath: `sessions/${sid}/session.log`,
      writeAudit: { mode: "manifest", partial: false, diffApprox: false, changed: [], touchedFiles: [], violations: [], gitRefs: [] },
    };
    run.sessions.push(record);
    rt.currentSessionId = sid;
    if (!rt.sessionIds.includes(sid)) rt.sessionIds.push(sid);

    // audit เริ่ม session (BE-008) — snapshot + pre-image ก่อน spawn
    const startRes = startSessionAudit({
      home: this.home, runId: run.runId, sessionId: sid, roots: this.auditRoots(),
      docsRoot: this.docsRoot, docsLayout: layout, module: run.module,
      packRoot: registry.packRoot, claim,
      manifestIgnore: registry.audit.manifestIgnore,
      preimageMaxMB: registry.audit.preimageMaxMB,
    });
    for (const n of startRes.notes) this.note(n);

    // dispatch ผ่าน adapter — spawn ด้วย argv array เท่านั้น (DES-002/010)
    const req: CampDispatch = {
      packet,
      packetPath,
      rolePromptFile: rolePrompt.source,
      rolePromptBody: rolePrompt.body,
      rolePromptTools: rolePrompt.tools,
      model: policy.model,
      effort: policy.effort,
      handoffSchemaPath,
      timeoutSec: this.cfg.camps.defaults.timeoutSec,
      cwd: registry.packRoot, // DES-013 — เปิด session ที่ codeRoot (packRoot)
      extraDirs: profile.extraDirsFlag ? [this.docsRoot, ...this.codeRoots] : [],
    };
    const handle = campAdapter.dispatch(req);
    record.pid = handle.pid;
    this.packets.set(sid, packet);
    const outcome = handle.outcome;
    this.live.set(sid, outcome);
    outcome.then(
      (o) => this.processEnd(sid, o),
      () => this.processEnd(sid, { exitCode: null, handoffRaw: null, cliSessionId: null, cliVersion: null, logsPath: null, failure: "crash" }),
    );
    this.log(DISPATCH_LOG, NEW_WORK_TASK_ID, "", sid, `change/${role} (intake BE-010 — pid ${handle.pid ?? "-"})`);
    this.transitionStatus();
    this.save();
  }

  // บรีฟรอบถัดไปฉีดคำตอบ gate (DES-010: "gate business-choice ตอบผ่าน UI แล้วบรีฟรอบถัดไปฉีดคำตอบ")
  private gateAnswerText(a: { gateId: GateId; answeredBy: string; answer: string }): string {
    return `${this.run.newWorkText ?? ""}\n\n[คำตอบ gate ${a.gateId} — ตอบโดย ${a.answeredBy}]\n${a.answer}`;
  }

  // --- session จบ → audit → ตัดสินต่อด้วยกฎตายตัวของ change chain (mirror R10–R15 ที่เกี่ยว — DES-018) ---
  private processEnd(sid: string, outcome: CampOutcome): void {
    const run = this.run;
    const rec = run.sessions.find((s) => s.sessionId === sid);
    if (rec === undefined || rec.endedAt !== null) return;
    this.live.delete(sid);
    const packet = this.packets.get(sid)!;

    // audit จบ session (BE-008) — snapshot ปิด + attribution ก่อนตัดสินใด ๆ
    let writeAudit = rec.writeAudit;
    if (outcome.failure !== "spawn") {
      try {
        const res = finishSessionAudit({
          home: this.home, runId: run.runId, sessionId: sid, roots: this.auditRoots(),
          docsRoot: this.docsRoot, docsLayout: this.cfg.registry.docsLayout, module: run.module,
          packRoot: this.cfg.registry.packRoot, claim: rec.claim,
          manifestIgnore: this.cfg.registry.audit.manifestIgnore,
          preimageMaxMB: this.cfg.registry.audit.preimageMaxMB,
          role: rec.role,
          allow: packet.writeScope.allow, deny: packet.writeScope.deny,
          journal: [], // intake ไม่เขียนเอกสารเอง — ไม่มี self-write ให้ข้าม (DES-021 ข้อ 4)
        });
        writeAudit = res.writeAudit;
        for (const n of res.notes) this.note(n);
      } catch (e) {
        writeAudit = { ...rec.writeAudit, partial: true };
        this.note(`audit ของ session ${sid} ตัดสินไม่ได้: ${(e as Error).message} — partial`);
      }
    }
    rec.writeAudit = writeAudit;
    rec.exitCode = outcome.exitCode;
    rec.cliSessionId = outcome.cliSessionId;
    rec.cliVersion = outcome.cliVersion;
    if (outcome.logsPath !== null) rec.logsPath = outcome.logsPath;
    rec.endedAt = this.now().toISOString();
    const rt = run.tasks[NEW_WORK_TASK_ID]!;
    for (const f of writeAudit.touchedFiles) if (!rt.touchedFiles.includes(f)) rt.touchedFiles.push(f);
    if (rt.currentSessionId === sid) rt.currentSessionId = null;
    this.save();

    // ความล้มเหลวระดับ camp — mirror R16/R17 (DES-018): restart 1 ครั้ง + priorSession, ครบ limit → hold
    if (outcome.failure !== null) {
      rec.outcome = outcome.failure === "spawn" ? "failed" : outcome.failure === "crash" ? "crashed" : outcome.failure;
      if (rt.crashRestarts < run.scheduler.crashRestartLimit) {
        rt.crashRestarts += 1;
        const role = isChangeRole(rec.role) ? rec.role : "business-analyst";
        this.log("R16", NEW_WORK_TASK_ID, "crashed", "execution", `crash/timeout/interrupted — restart ${rt.crashRestarts}/${run.scheduler.crashRestartLimit} (ไม่ revert ไฟล์ ไม่นับ fix round)`);
        this.dispatchChain(role, { priorSession: { sessionId: sid, touchedFiles: [...writeAudit.touchedFiles] } });
      } else {
        rt.hold = { reason: "crash-limit", ref: null, prevStep: rt.step };
        rt.step = "held";
        this.log("R17", NEW_WORK_TASK_ID, "crashed", "held", `crash ครบ crashRestartLimit (${run.scheduler.crashRestartLimit}) — hold (AC-075)`);
      }
      this.transitionStatus();
      this.save();
      return;
    }

    // handoff (DES-012) — extract + ตรวจ 2 ชั้น · ไม่ผ่าน = fail-closed (mirror R15 — AC-068)
    const parsed = this.extractHandoff(outcome.handoffRaw, outcome.structuredOutputField, packet);
    if (parsed.handoff === null) {
      rec.outcome = "failed";
      rt.hold = { reason: "invalid-handoff", ref: parsed.problems[0] ?? null, prevStep: rt.step };
      rt.step = "held";
      this.note(`handoff ของ ${sid} ไม่ผ่าน contract — hold invalid-handoff: ${parsed.problems[0] ?? "-"}`);
      this.log("R15", NEW_WORK_TASK_ID, "", "held", parsed.problems.join(" · "));
      this.transitionStatus();
      this.save();
      return;
    }
    rec.outcome = "completed";
    rec.handoff = parsed.handoff;
    this.save();
    this.applyChainDecision(rec, parsed.handoff);
    this.transitionStatus();
    this.save();
  }

  // กฎตายตัวหลัง change session จบ (mirror R10–R14 ของ DES-018 เฉพาะที่เกี่ยวกับ chain งานใหม่ —
  // router ประกาศชัดว่า "งานใหม่ให้ driver เดินตาม DES-010 นอก router" — router.ts R11 BA DONE นอก chain)
  private applyChainDecision(rec: SessionRecord, h: HandoffV2): void {
    const rt = this.run.tasks[NEW_WORK_TASK_ID]!;
    const state = h.outputState;
    if (state === "NEEDS_HUMAN") {
      // gate ตาม questionsForHuman (BE-009) — mapping เดียวกับ R12/handoffGateProposals (AC-014/AC-015)
      for (const proposal of handoffGateProposals(h, { taskIds: [NEW_WORK_TASK_ID], phase: null })) {
        const res = openGate(this.run, proposal, this.cfg.gates);
        this.run = res.run;
        this.log(INTAKE_LOG, NEW_WORK_TASK_ID, "", `gate:${res.record.gateId}`, `เปิด gate (owner ${res.record.owner.name}) — ${res.record.question}`);
      }
      this.save();
      return; // หยุดรอเจ้าของ — "ไม่ตกไปไหน ไม่เดา" (DES-010 Fallback)
    }
    if (state === "BLOCKED") {
      rt.hold = { reason: "blocked", ref: h.blocker?.reference ?? null, prevStep: rt.step }; // mirror R14 — ไม่นับรอบ
      rt.step = "held";
      return;
    }
    // DONE
    if (rec.role === "business-analyst") {
      const decision = h.decision;
      if (decision === null) {
        // BA จบโดยไม่ตัดสิน — งานใหม่ไม่มีทางเดินต่อ (DES-010 ผลลัพธ์หลักคือ decision) — fail-closed ไม่เดา
        rt.hold = { reason: "invalid-handoff", ref: "BA DONE ไม่มี decision", prevStep: rt.step };
        rt.step = "held";
        this.log("R15", NEW_WORK_TASK_ID, "", "held", "BA DONE ไม่มี decision — งานใหม่ไม่เดินต่อ (fail-closed — DES-010)");
        return;
      }
      // AC-018 — module ปลายทาง (เดิม/ใหม่) ปรากฏใน run.json + pointer ของ module นั้นถูกสร้าง (DES-010 Output)
      try {
        assertModuleName(decision.module);
        this.run.module = decision.module; // run เดินต่อใน module ปลายทาง — packet/context/audit ของ chain ถัดไปตรงกัน
        setPointer(this.home, decision.module, this.run.runId);
        this.log(INTAKE_LOG, NEW_WORK_TASK_ID, "", decision.module, `AC-018 — BA ตัดสิน ${decision.action}: ${decision.reason}`);
      } catch (e) {
        this.note(`decision.module ไม่ถูกรูป ${JSON.stringify(decision.module)} — ไม่สลับ module/ไม่สร้าง pointer (fail-closed): ${(e as Error).message}`);
        this.log(INTAKE_LOG, NEW_WORK_TASK_ID, "", "", "AC-018 — decision.module ไม่ถูกรูป — ข้าม pointer (fail-closed)");
      }
      this.save();
      if (h.nextRole === "system-analyst") {
        this.dispatchChain("system-analyst"); // AC-019 — งานเดิน process เดิมต่อเอง
      } else if (h.nextRole === "none") {
        this.chainEnd("BA เก็บงานได้เอง (nextRole none) — กลิ่นเดียวกับ R11 (BA ปิด chain)");
      } else {
        // nextRole PM หรือ role แปลก → PM ตัดสินท้าย chain เสมอ (กติกาเดียวกับ R11 ของ router)
        this.dispatchChain("project-manager");
      }
    } else if (rec.role === "system-analyst") {
      this.dispatchChain("project-manager"); // SA ตามด้วย PM เสมอ (R10/R11)
    } else {
      this.chainEnd("PM จบ change chain — plan เขียนแล้ว รอ resume ด้วย driver (BE-011) เดิน DAG ต่อ");
    }
  }

  private chainEnd(why: string): void {
    const rt = this.run.tasks[NEW_WORK_TASK_ID]!;
    if (rt.hold === null) rt.step = "waiting-deps"; // งานถัดไป "ขึ้นกับ plan" — ไม่ใช่ runnable และไม่ใช่งานค้าง
    this.note(`${why} — งานเดิน DAG ต่อเมื่อ resume ด้วย driver (BE-011)`);
    this.log(INTAKE_LOG, NEW_WORK_TASK_ID, "", "waiting-deps", why);
  }

  // handoffRaw → HandoffV2 — ตรวจ 2 ชั้น (BE-006) · Fallback extract fenced JSON (DES-012) — รูปย่อจาก
  // driver.extractHandoff (private — แก้ driver.ts ไม่ได้): unwrap structured field ของ camp → direct →
  // fenced ใน string ทุกชั้น (ลึก ≤ 3) · ตัวไหนผ่าน handoffProblems ตัวแรกชนะ · ไม่ผ่านเลย = null + เหตุผล
  private extractHandoff(raw: string | null, structuredField: string | null | undefined, packet: PacketV2): { handoff: HandoffV2 | null; problems: string[] } {
    const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
    const candidates: unknown[] = [];
    const pushFenced = (text: string): void => {
      const m = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
      if (m === null) return;
      try {
        candidates.push(JSON.parse(m[1]!.trim()));
      } catch { /* ปฏิเสธด้านล่าง */ }
    };
    if (raw !== null) {
      try {
        const direct: unknown = JSON.parse(raw);
        const field = typeof structuredField === "string" && structuredField.trim() !== "" ? structuredField : null;
        if (field !== null && isObj(direct)) {
          const wrapped = direct[field];
          if (isObj(wrapped)) candidates.push(wrapped); // เฉพาะ object — primitive/string ไม่เดา (fail-closed)
        }
        candidates.push(direct);
        const collect = (v: unknown, depth: number): void => {
          if (depth > 3) return;
          if (typeof v === "string") pushFenced(v);
          else if (Array.isArray(v)) for (const x of v) collect(x, depth + 1);
          else if (isObj(v)) for (const x of Object.values(v)) collect(x, depth + 1);
        };
        collect(direct, 0);
      } catch {
        pushFenced(raw); // stdout ไม่ใช่ JSON — fenced ใน raw ตรง ๆ
      }
    }
    for (const value of candidates) {
      if (handoffProblems(value, packet).length === 0) return { handoff: value as HandoffV2, problems: [] };
    }
    return {
      handoff: null,
      problems: candidates.length === 0
        ? ["handoffRaw parse เป็น JSON ไม่ได้ (fallback extract fenced JSON แล้ว — DES-012)"]
        : handoffProblems(candidates[0]!, packet),
    };
  }

  // --- ตอบ gate (BE-009 lifecycle เดิม) — แล้วบรีฟรอบถัดไปฉีดคำตอบ + เดิน chain ต่อ (DES-010) ---
  answerGate(gateId: GateId, input: { answeredBy: string; answer: string; note?: string | null }): GateRecord {
    const res = answerGate(this.run, gateId, input, { now: this.now() });
    this.run = res.run;
    this.save();
    this.log("gate-answered", NEW_WORK_TASK_ID, gateId, "answered", `โดย ${input.answeredBy}`);
    const rt = this.run.tasks[NEW_WORK_TASK_ID]!;
    const active = this.run.sessions.some((s) => s.endedAt === null);
    if (rt.hold === null && !active) {
      // role เดิมของ session ที่เปิด gate — บรีฟรอบถัดไปเป็นของ role นั้น (คำตอบฉีดใต้ guard — DES-010)
      const raiser = res.record.sessionId !== null ? this.run.sessions.find((s) => s.sessionId === res.record.sessionId) : undefined;
      const role: ChangeRole = raiser !== undefined && isChangeRole(raiser.role) ? raiser.role : "business-analyst";
      this.dispatchChain(role, { gateAnswer: { gateId, answeredBy: input.answeredBy, answer: input.answer } });
    }
    this.transitionStatus();
    this.save();
    return res.record;
  }

  // รอ session ที่ active ทั้งหมดจบ + ประมวลผลต่อจนเงียบ (รูปเดียวกับ driver.settle)
  async settle(maxLoops = 200): Promise<RunJson> {
    for (let i = 0; i < maxLoops && this.live.size > 0; i++) {
      await Promise.all([...this.live.values()]);
    }
    return this.run;
  }
}

// --- ทางเข้าเดียวของ intake (Expected Output — BE-015 เรียกจาก POST /api/tasks/new) ---
// fail-closed ทุกขั้น "ก่อน" สร้าง run: ข้อความว่าง/เกินลิมิต (task Scope 🔒) · module ไม่ถูกรูป (DES-011) ·
// วันที่ไม่ใช่ YYYY-MM-DD · roots ไม่มีจริง (DES-015) · ข้อความอ้าง REQ/AC ที่ resolve ไม่ได้ (DES-020)
export function submitNewWork(input: IntakeInput): NewWorkHandle {
  const text = input.text;
  if (typeof text !== "string" || text.trim() === "") {
    throw new IntakeError("empty-text", `ข้อความงานใหม่ว่าง — ปฏิเสธก่อนสร้าง run (AC-017 · DES-010)`);
  }
  if (text.length > NEW_WORK_LIMIT) {
    throw new IntakeError("text-too-long", `ข้อความยาว ${text.length} ตัวอักษร เกินลิมิต ${NEW_WORK_LIMIT} — ปฏิเสธก่อนสร้าง run (DES-009/010)`);
  }
  try {
    assertModuleName(input.module);
  } catch (e) {
    if (e instanceof KnowledgePathError) throw new IntakeError("bad-module", `module ไม่ถูกรูป — ปฏิเสธก่อนสร้าง run (DES-011): ${(e as Error).message}`);
    throw e;
  }
  if (!isIsoDate(input.dateFromUser)) {
    throw new IntakeError("bad-date", `dateFromUser ${JSON.stringify(input.dateFromUser)} ต้องเป็น YYYY-MM-DD — ระบบไม่เดาวันที่ (data-model)`);
  }
  let roots: ReturnType<typeof resolveRunRoots>;
  try {
    roots = resolveRunRoots(input.config.sta, input.selection); // fail-closed — path ไม่มีจริง → ปฏิเสธ (DES-015)
  } catch (e) {
    if (e instanceof ConfigError) throw new IntakeError("config", e.message);
    throw e;
  }
  // context ของ BA packet — ตรวจ "ก่อน" สร้าง run เพื่อให้ปฏิเสธได้สะอาด (ไม่ทิ้ง run ว่างค้าง)
  const ctx = intakeContext(roots.docsRoot, input.config.registry.docsLayout, input.module, "business-analyst", text);
  if (ctx.error !== null) throw new IntakeError("context", ctx.error);

  const seed: TaskRuntime = {
    taskId: NEW_WORK_TASK_ID,
    owner: "business-analyst",
    planPhase: "", // ยังไม่มี plan — task id/phase จริงมาจาก PM ภายหลัง (reconcileRun เอกสารชนะ — BE-007)
    group: null,
    step: "runnable",
    hold: null,
    attempt: 0, fixRounds: 0, crashRestarts: 0,
    currentSessionId: null, sessionIds: [], touchedFiles: [],
    lastVerdict: null, defectPacket: null, humanActions: [],
  };
  const init: CreateRunInit = {
    module: input.module,
    mode: "new-work",
    planFormat: "none", // งานใหม่ไม่ผ่าน plan ตาราง — change chain กรณี 1 ของ DES-001
    scheduler: input.config.registry.scheduler, // freeze ลง run.json (data-model)
    newWorkText: text, // ข้อความดิบครบทุกตัวอักษร (AC-017 — run.json เก็บได้ จำเป็นต่อ AC-017)
    configSnapshot: configSnapshot(input.config.configDir),
    gitPolicy: deriveGitPolicy(input.selection.knowledge, roots.docsRoot, roots.selectedTarget),
    tasks: { [NEW_WORK_TASK_ID]: seed },
    phases: {},
  };
  const home = input.config.registry.orchestratorHome;
  let run: RunJson;
  try {
    run = createRun(home, init); // setPointer(module, runId) ให้แล้ว (BE-007)
  } catch (e) {
    if (e instanceof Error && e.name === "StateError") throw new IntakeError("state", (e as Error).message);
    throw e;
  }
  const ctrl = new NewWorkRun(input.config, roots.docsRoot, roots.codeRoots, roots.selectedTarget, input.selection.knowledge, input.adapters, input.dateFromUser, run, input.now ?? (() => new Date()));
  ctrl.dispatchChain("business-analyst"); // stage แรก = dispatch BA ทันที (DES-010 Rule)
  return {
    get runId() { return ctrl.runId(); },
    run: () => ctrl.getRun(),
    notes: () => ctrl.notes(),
    openGates: () => ctrl.openGates(),
    answerGate: (gateId, ans) => ctrl.answerGate(gateId, ans),
    settle: (maxLoops?: number) => ctrl.settle(maxLoops),
  };
}
