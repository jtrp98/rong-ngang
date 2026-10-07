// BE-011 — Pipeline driver (DES-001/007/018/019): ตัว invoke เดียวของระบบ — วงจร tick → route (BE-019) →
// apply Decision → dispatch ผ่าน CampAdapter (BE-006/012) → รับ handoff → audit (BE-008) → Status write-back (BE-022)
// → gate (BE-009) → resume · DAG scheduler ใต้เพดาน (scheduler.ts + batching.ts) · restart หลัง kill (DES-007)
// ทางเขียน state ทางเดียว: run.json ผ่าน saveRun (atomic ทุก transition) · router.log/status-journal ตาม path ของ BE-019/022
// ตัดสินจาก state + เอกสารล้วน ไม่ถาม LLM (AC-067) · spawn เฉพาะผ่าน adapter argv · ไม่เรียก git เปลี่ยนสถานะ · ไม่แตะ .git
// run.status transition (DES-001): queued → running ⇄ idle → waiting-on-human | stopped | completed — เขียนทุก transition
// satisfied(anchor) ⇔ phase cleared (DES-019 Rev 11/12) · hold R9/R24 + dependents จาก issue ของ BE-018 — task อื่นเดินต่อ
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import * as path from "node:path";
import { ConfigError, configSnapshot, resolveRunRoots, type AppConfig } from "./config.ts";
import { buildDefectPacket, defectPacketPath, newDispatchSessionIds, reviewInputForTask } from "./batching.ts";
import { buildPacketV2 } from "./contract/packet-builder.ts";
import { handoffV2JsonSchema } from "./contract/schema.ts";
import { handoffProblems } from "./contract/validate.ts";
import type { CampAdapter, CampDispatch, CampOutcome, CampSessionHandle } from "./contract/camp-adapter.ts";
import type { PacketV2 } from "./contract/types.ts";
import { answerGate, dispatchBlocker, openGate, openGateRecords, routerGateProposals, shouldWaitOnHuman } from "./gates.ts";
import { loadContext, type ContextRefs } from "./context-loader.ts";
import { resolveDocPath, type DocsLayout } from "./knowledge-paths.ts";
import { parsePlanIndex, parseTaskFile, type PlanIndex, type PlanIssue, type PlanRow, type TaskFile } from "./plan-parser.ts";
import { resolveCamp } from "./routing.ts";
import { route, type Decision, type RouterDispatch, type RouterEvent, type RouterEventKind, type RouterTask } from "./router.ts";
import { formatModelPolicyBasis, resolveEffectiveModelPolicy } from "./tiers.ts";
import { loadRolePrompt } from "./role-prompts.ts";
import {
  appendRouterLog, createRun, findOpenSessions, getPointer, loadRun, reconcileRun, saveRun, statePaths,
  StateError, type CreateRunInit, type GateId, type GateRecord, type HandoffV2, type PhaseRuntime,
  type PlanFormat, type Role, type RunJson, type RunStatus, type SessionKind, type SessionRecord,
} from "./state-store.ts";
import { applyStatusWrites, marksFromRun, type SecurityMarkItem, type StatusWriteItem } from "./status-writer.ts";
import { ClaimError, finishSessionAudit, resolveClaim, startSessionAudit, type AuditRoot, type PatternScope, type DenyPaths } from "./session-audit.ts";
import * as scheduler from "./scheduler.ts";

export class DriverError extends Error {
  constructor(
    readonly kind: "config" | "state" | "plan",
    message: string,
  ) {
    super(message);
    this.name = "DriverError";
  }
}

export interface DriverOptions {
  config: AppConfig; // โหลด + validate แล้วโดย BE-001 (entry จริง) — driver อ่านอย่างเดียว
  selection: { knowledge: string; target: string }; // sta-config → docsRoot + codeRoots (DES-015)
  module: string;
  dateFromUser: string; // YYYY-MM-DD จากผู้ใช้ — ระบบไม่เดาวันที่ (data-model)
  newWorkText?: string | null; // งานใหม่ REQ-007 — เก็บใน run.json (intake เป็นของ BE-010)
  runOverrideCamp?: string; // ชั้น 1 ของ routing (DES-005)
  adapters: Readonly<Record<string, CampAdapter>>; // camp → adapter (ทดสอบ = fake — core ไม่ import camps)
  now?: () => Date; // fake clock ของ test — default นาฬิกาเครื่อง
}

// dispatch ที่ router สั่ง (Decision.dispatch) — คิวจนกว่า slot/claim/context พร้อม
interface PendingDispatch {
  kind: SessionKind;
  role: Role;
  taskIds: string[];
  phase: string | null;
  blockerRef: string | null; // change chain — blocker.reference ของ handoff ที่สั่ง (context ของ SA/PM)
  defect: { taskId: string; source: "review" | "qa" | "feature-qa"; handoff: HandoffV2 } | null; // R4
  priorSession: { sessionId: string; touchedFiles: string[] } | null; // R16
  gateId: GateId | null; // record-only หลัง gate answered (OQ-D3) — backfill GateRecord.recordSessionId
}

interface LiveSession {
  record: SessionRecord; // object เดียวกับใน run.sessions — แก้ในที่แล้ว save
  packet: PacketV2;
  handle: CampSessionHandle;
  outcome: Promise<CampOutcome>;
}

interface PendingWrite {
  items: { taskId: string; value: "verified" | "blocked" }[];
  marks: SecurityMarkItem[];
  ruleId: string;
}

const RUN_STATUS_LOG = "run-status"; // ruleId ของบรรทัด log ฝั่ง driver (transition ของ run.status — DES-001)
const DISPATCH_LOG = "dispatch"; // บรรทัด log ของ driver เอง (session เริ่ม) — decision ของ router คง ruleId R*
const ISSUE_HOLD_KINDS = new Set<PlanIssue["kind"]>([
  "plan-row-malformed", "plan-duplicate-id", "plan-owner-unknown", "plan-phase-unknown",
]);
// ref ของ hold plan-error ที่ router (R24) เป็นเจ้าของ — ปลดด้วย router เท่านั้น (driver ไม่แตะ)
const routerOwnedRef = (ref: string): boolean =>
  ref === "multi-anchor" || ref.startsWith("owner:reviewer") || ref.startsWith("owner:security");

const isTestPath = (f: string): boolean =>
  /(^|[/\\])(tests?|__tests__)([/\\])/.test(f) || /\.(test|spec)\.[^./\\]+$/.test(f);

export class PipelineDriver {
  private readonly opts: DriverOptions;
  private readonly home: string;
  private readonly paths: ReturnType<typeof statePaths>;
  private readonly now: () => Date;

  private _run: RunJson | null = null;
  private docsRoot = "";
  private knowledgeName = "";
  private target: { name: string; path: string } = { name: "", path: "" };
  private codeRoots: string[] = [];
  private planPath = "";
  private planText: string | null = null;
  private planHash = "";
  private plan: PlanIndex | null = null;
  private planDirty = false;
  private firstPump = true;
  private taskFiles = new Map<string, TaskFile>();
  private tpPhases: ReadonlySet<string> = new Set();
  private order: Map<string, number> = new Map();
  private handles = new Map<string, LiveSession>();
  private pending: PendingDispatch[] = [];
  private pendingWrites: PendingWrite[] = [];
  private journal: { path: string; hash: string }[] = []; // self-write journal ของ BE-022 → audit ข้าม (DES-021 ข้อ 4)
  private notes: string[] = []; // dashboard — plan เสีย / needsMigration / audit note
  private stopped = false;
  private fqaDroppedNote = false; // บันทึกครั้งเดียว — feature-qa ที่ไม่มี phase (legacy)
  private lastProblems: string[] = [];
  private watcher: { close(): void } | null = null;

  constructor(opts: DriverOptions) {
    this.opts = opts;
    this.home = opts.config.registry.orchestratorHome;
    this.paths = statePaths(this.home);
    this.now = opts.now ?? (() => new Date());
  }

  // --- อ่านสถานะสำหรับ dashboard/test ---
  get run(): RunJson | null {
    return this._run;
  }

  get planIssues(): PlanIssue[] {
    return this.plan?.issues ?? [];
  }

  get needsMigration(): boolean {
    return this.plan?.needsMigration ?? false; // AC-074 — legacy plan
  }

  get dashboardNotes(): readonly string[] {
    return this.notes;
  }

  get activeCount(): number {
    return this._run === null ? 0 : scheduler.activeSessions(this._run).length;
  }

  openGates(): GateRecord[] {
    return this._run === null ? [] : openGateRecords(this._run);
  }

  // --- เริ่ม/resume (AC-003 — กดเริ่มงานแล้ววิ่งต่อจากขั้นล่าสุด ไม่พิมพ์บริบทซ้ำ) ---
  start(): RunJson {
    this.resolveRoots();
    this.refreshPlan();
    const pointer = getPointer(this.home, this.opts.module);
    if (pointer !== null) {
      this.resumeFrom(pointer);
    } else {
      this.createNewRun();
    }
    this.pump();
    return this._run!;
  }

  resume(): RunJson {
    this.resolveRoots();
    const pointer = getPointer(this.home, this.opts.module);
    if (pointer === null) throw new StateError("missing", `ไม่มี pointer ของ module ${this.opts.module} — เริ่มใหม่ด้วย start()`, "");
    this.resumeFrom(pointer);
    this.pump();
    return this._run!;
  }

  // tick ด้วยมือ (fs.watch plan เปลี่ยน / human action — DES-001 Tick)
  refresh(): RunJson {
    this.pump();
    return this._run!;
  }

  // fs.watch plan\index.md → refresh (DES-001 "fs.watch + re-read") — คืนฟังก์ชันปิด
  watchPlan(): () => void {
    if (this.watcher !== null) return () => this.watcher?.close();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const w = watch(path.dirname(this.planPath), () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        try {
          this.pump();
        } catch (e) {
          this.notes.push(`tick หลัง plan เปลี่ยนล้มเหลว: ${(e as Error).message}`);
        }
      }, 50);
    });
    this.watcher = w;
    return () => {
      w.close();
      this.watcher = null;
    };
  }

  // --- คำตอบ gate (BE-009 — driver เป็นผู้ตัดสิน run.status เท่านั้น) ---
  answerGate(gateId: GateId, input: { answeredBy: string; answer: string; note?: string | null }): GateRecord {
    if (this._run === null) throw new DriverError("state", "ยังไม่มี run — เรียก start() ก่อน");
    const res = answerGate(this._run, gateId, input, { now: this.now() });
    this._run = res.run;
    this.save();
    appendDriverLog(this.home, { ruleId: "gate-answered", taskId: "", from: gateId, to: "answered", reason: `โดย ${input.answeredBy}` });
    const d = this.routeNow({ kind: "gate-answered", sessionId: "", taskIds: [], gateId });
    this.applyDecision(d, "", null, null, gateId);
    this.pump();
    return res.record;
  }

  // คนกด retry หลัง gate 4 (DES-009/018 R22 — ตัวนับไม่ reset)
  humanRetry(taskIds: readonly string[], actor: { by: string; note?: string | null }): void {
    const run = this._run;
    if (run === null) throw new DriverError("state", "ยังไม่มี run — เรียก start() ก่อน");
    for (const id of taskIds) {
      const rt = run.tasks[id];
      if (!rt) continue;
      rt.humanActions.push({ action: "retry", by: actor.by, note: actor.note ?? null, at: this.now().toISOString() });
    }
    this.save();
    const d = this.routeNow({ kind: "human-retry", sessionId: "", taskIds: [...taskIds] });
    this.applyDecision(d, "", null, null, null);
    this.pump();
  }

  // หยุด run — kill session ที่รันค้าง (outcome interrupted) แล้วไม่ re-dispatch
  stop(reason: string): void {
    if (this._run === null) return;
    this.stopped = true;
    for (const live of [...this.handles.values()]) {
      live.handle.kill(`stop: ${reason}`);
    }
    this._run.status = "stopped";
    this.save();
    appendDriverLog(this.home, { ruleId: RUN_STATUS_LOG, taskId: "", from: "running", to: "stopped", reason });
  }

  // รอ session ที่ active ทั้งหมดจบ + ประมวลผลต่อจนเงียบ (test — ของจริงใช้ event ผ่าน outcome.then)
  async settle(maxLoops = 200): Promise<RunJson> {
    for (let i = 0; i < maxLoops && this.handles.size > 0; i++) {
      await Promise.all([...this.handles.values()].map((h) => h.outcome));
    }
    return this._run!;
  }

  // ------------------------------------------------------------------
  // ภายใน — roots / plan
  // ------------------------------------------------------------------

  private resolveRoots(): void {
    try {
      const roots = resolveRunRoots(this.opts.config.sta, this.opts.selection); // fail-closed — path ไม่มีจริง → ปฏิเสธ (DES-015)
      this.docsRoot = roots.docsRoot;
      this.codeRoots = roots.codeRoots;
      this.target = roots.selectedTarget;
      this.knowledgeName = this.opts.selection.knowledge;
    } catch (e) {
      if (e instanceof ConfigError) throw new DriverError("config", e.message);
      throw e;
    }
    this.planPath = resolveDocPath(this.docsRoot, this.opts.config.registry.docsLayout, this.opts.module, { unit: "plan-index" });
  }

  private auditRoots(): AuditRoot[] {
    return (this._run?.gitPolicy ?? this.deriveGitPolicy()).map((g) => ({
      rootKind: g.rootKind, name: g.name, path: g.path, auditMode: g.auditMode, repoTop: g.repoTop,
    }));
  }

  // freeze (DES-015/006) — REQ-009 (gituse/commit) ไม่อยู่ R1: commitAllowed false เสมอ (BL-017)
  private deriveGitPolicy(): RunJson["gitPolicy"] {
    const mk = (rootKind: "knowledge" | "target", name: string, p: string): RunJson["gitPolicy"][number] => {
      const repo = existsSync(path.join(p, ".git"));
      return {
        rootKind, name, path: p, gituse: false, basis: "default", repo,
        repoTop: repo ? p : null, commitAllowed: false,
        auditMode: repo ? "git" : "manifest",
        warning: "REQ-009 (gituse) ไม่อยู่ R1 — ห้าม commit (BL-017)",
      };
    };
    return [mk("knowledge", this.knowledgeName, this.docsRoot), mk("target", this.target.name, this.target.path)];
  }

  private readTaskFile(id: string): TaskFile | null {
    try {
      const file = resolveDocPath(this.docsRoot, this.opts.config.registry.docsLayout, this.opts.module, { unit: "plan-task", name: `${id}.md` });
      if (!existsSync(file)) return null;
      return parseTaskFile(readFileSync(file, "utf8"), id, `plan/${id.toLowerCase()}.md`);
    } catch {
      return null; // path ผิดรูป — context loader จะ fail-closed แทนตอน dispatch
    }
  }

  // อ่าน plan ใหม่ทุก tick (DES-001) — คืน true เมื่อเนื้อหาเปลี่ยน (รวมครั้งแรก)
  private refreshPlan(): boolean {
    const text = existsSync(this.planPath) ? readFileSync(this.planPath, "utf8") : null;
    const hash = text === null ? "none" : createHash("sha256").update(text).digest("hex");
    const changed = hash !== this.planHash;
    if (!changed && !this.planDirty) return false;
    this.planHash = hash;
    this.planText = text;
    this.planDirty = false;
    this.plan = text === null ? null : parsePlanIndex(text, this.planPath);
    this.order = scheduler.rowOrder(this.plan);
    this.taskFiles = new Map();
    if (this.plan !== null) {
      for (const row of this.plan.rows) {
        const tf = this.readTaskFile(row.id);
        this.taskFiles.set(row.id, tf);
      }
      this.syncGroups();
    }
    this.tpPhases = scheduler.tpPhasesOf(this.readTestPlanIndex());
    return changed;
  }

  // Session group (OQ-12) อ่านจาก task file — runtime เท่านั้น (เรียกหลัง create/resume ด้วย — task ใหม่ยัง group null)
  private syncGroups(): void {
    const run = this._run;
    if (run === null || this.plan === null) return;
    let changed = false;
    for (const row of this.plan.rows) {
      const rt = run.tasks[row.id];
      if (rt === undefined) continue;
      const group = this.taskFiles.get(row.id)?.sessionGroup ?? null;
      if (rt.group !== group) {
        rt.group = group;
        changed = true;
      }
    }
    if (changed) this.save();
  }

  private readTestPlanIndex(): string | null {
    try {
      const file = resolveDocPath(this.docsRoot, this.opts.config.registry.docsLayout, this.opts.module, { unit: "test-plan", name: "index.md" });
      return existsSync(file) ? readFileSync(file, "utf8") : null;
    } catch {
      return null;
    }
  }

  private planRowStatus(taskId: string): PlanRow["status"] {
    return this.plan?.rows.find((r) => r.id === taskId)?.status ?? null; // expectedCurrent — PlanRow.status ตอน emit (BE-022)
  }

  // ------------------------------------------------------------------
  // ภายใน — สร้าง / resume
  // ------------------------------------------------------------------

  private createNewRun(): void {
    if (this.planText === null) {
      // ไม่มี plan — กรณี 1 ของ DES-001 (change chain) เป็นพื้นที่ของ BE-010 (intake) — run ว่าง + note
      this.notes.push("ไม่มี plan\\index.md — run ว่าง รอ intake งานใหม่ (BE-010 — นอก scope BE-011)");
    } else if (this.plan === null || this.plan.format === "invalid") {
      // มีไฟล์แต่เสีย — hold module plan-error: tick นี้ไม่ dispatch ใหม่จน PM แก้ (DES-001)
      this.notes.push(`plan อ่านไม่ผ่าน (plan-error) — ไม่มี dispatch จน PM แก้: ${this.plan?.issues[0]?.message ?? "-"}`);
    }
    const planFormat: PlanFormat =
      this.plan !== null && (this.plan.format === "v2" || this.plan.format === "legacy") ? this.plan.format : "none";
    const init: CreateRunInit = {
      module: this.opts.module,
      mode: "new-work",
      planFormat,
      scheduler: this.opts.config.registry.scheduler, // freeze ลง run.json (data-model)
      newWorkText: this.opts.newWorkText ?? null,
      configSnapshot: configSnapshot(this.opts.config.configDir),
      gitPolicy: this.deriveGitPolicy(),
      phases: this.phaseSeeds(),
    };
    this._run = createRun(this.home, init);
    if (this.plan !== null && this.plan.format !== "invalid") {
      this._run = reconcileRun(this._run, this.plan, { depsSatisfied: (dep) => this.reconcileSatisfied(dep) });
      this.save();
    }
    this.syncGroups();
    this.journal = this.loadJournal();
    this.needsMigrationNote();
    appendDriverLog(this.home, { ruleId: RUN_STATUS_LOG, taskId: "", from: "-", to: "queued", reason: `สร้าง run ${this._run.runId} (plan ${planFormat})` });
  }

  private phaseSeeds(): RunJson["phases"] {
    const out: RunJson["phases"] = {};
    for (const p of this.plan?.phases ?? []) {
      out[p.label] = { featureQa: "not-ready", featureQaSessionId: null, cleared: false, hold: null };
    }
    return out;
  }

  private reconcileSatisfied(dep: PlanRow): boolean {
    const run = this._run;
    const rt = run?.tasks[dep.id];
    const ctx = this.satisfiedCtx();
    if (dep.owner === "qa-engineer") return (rt?.step === "verified") || ctx.clearedPhases.has(dep.phase);
    if (dep.owner === "test-planner") return ctx.tpPhases.has(dep.phase);
    if (dep.owner === "uxui-designer") return rt !== undefined ? scheduler.uxuiAnsweredOf(run!, dep.taskId) : false;
    return (rt?.step === "verified") || dep.status === "verified";
  }

  // resume ตาม DES-007: kill tree orphan (inferred) → ปิด snapshot + attribution → R16/R17 → reconcile (เอกสารชนะ)
  private resumeFrom(pointer: string): void {
    const run = loadRun(this.home, pointer); // corrupt → StateError — ปฏิเสธ resume ให้คนตัดสิน (fail-closed)
    this._run = run;
    this.journal = this.loadJournal();
    this.refreshPlan();
    const open = findOpenSessions(this.home, run.runId).filter((o) => o.runId === run.runId);
    for (const o of open) this.killOrphan(o.session); // (1) kill ก่อนทำอย่างอื่น
    for (const o of open) this.finalizeOrphan(o.session); // (2) attribution + R16/R17
    if (this.plan !== null && this.plan.format !== "invalid") {
      this._run = reconcileRun(this._run, this.plan, { depsSatisfied: (dep) => this.reconcileSatisfied(dep) });
      this.save();
    }
    // 🔒 write-back ที่ยังไม่อยู่ใน doc — mark ใน handoff ของ run เขียนซ้ำ (DES-007 §🔒 resume · BE-022 idempotent)
    this.doWrites([], marksFromRun(this._run), "resume");
    this.needsMigrationNote();
    appendDriverLog(this.home, { ruleId: RUN_STATUS_LOG, taskId: "", from: this._run.status, to: this._run.status, reason: `resume ${run.runId} — orphan ${open.length} session` });
  }

  // kill ทั้ง tree เมื่อ pid ยังอยู่ (DES-007 — `taskkill /PID <pid> /T /F` รูป inferred ยังไม่ทดสอบเครื่องจริง)
  private killOrphan(session: SessionRecord): void {
    const pid = session.pid;
    if (pid === null || !this.pidAlive(pid)) return;
    const command = this.opts.config.camps.camps[session.camp as keyof typeof this.opts.config.camps.camps]?.command ?? session.camp;
    if (process.platform === "win32") {
      // ตรวจชื่อ process แบบเนิบน้ำด้วย tasklist — ไม่ตรงคำสั่งของ camp → ไม่ kill (กัน kill ของแปลก)
      const image = this.winImageName(pid);
      if (image !== null && !image.toLowerCase().startsWith(String(command).toLowerCase())) {
        this.notes.push(`pid ${pid} ไม่ใช่ process ของ camp "${command}" (${image}) — ข้าม kill`);
        return;
      }
      try {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { shell: false });
      } catch { /* ตายเองแล้ว — ตัดสินต่อที่ finalize */ }
    } else {
      try {
        process.kill(-pid, "SIGKILL");
      } catch { /* ตายเองแล้ว */ }
    }
  }

  private pidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private winImageName(pid: number): string | null {
    try {
      const r = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { shell: false, encoding: "utf8" });
      const first = (r.stdout ?? "").split(/\r?\n/).find((l) => l.trim() !== "");
      if (!first || first.startsWith("INFO:")) return null;
      return first.split('","')[0]?.replace(/^"/, "") ?? null;
    } catch {
      return null;
    }
  }

  // ปิด orphan: snapshot ปิด + attribution (AC-066) → outcome interrupted → R16/R17 ผ่าน router — ไม่ revert ไฟล์
  private finalizeOrphan(session: SessionRecord): void {
    const run = this._run!;
    const rec = run.sessions.find((s) => s.sessionId === session.sessionId);
    if (rec === undefined || rec.endedAt !== null) return;
    let writeAudit = rec.writeAudit;
    try {
      const packet = this.loadPacket(rec);
      const res = finishSessionAudit({
        home: this.home, runId: run.runId, sessionId: rec.sessionId, roots: this.auditRoots(),
        docsRoot: this.docsRoot, docsLayout: this.layout(), module: this.opts.module,
        packRoot: this.opts.config.registry.packRoot, claim: rec.claim,
        manifestIgnore: this.opts.config.registry.audit.manifestIgnore,
        preimageMaxMB: this.opts.config.registry.audit.preimageMaxMB,
        role: rec.role, allow: packet?.writeScope.allow ?? this.roleAllow(rec.role), deny: packet?.writeScope.deny ?? this.roleDeny(rec.role),
        journal: this.journal,
      });
      writeAudit = res.writeAudit;
      this.notes.push(...res.notes);
    } catch (e) {
      writeAudit = { ...rec.writeAudit, partial: true };
      this.notes.push(`resume: audit ของ session ${rec.sessionId} ตัดสินไม่ได้ (${(e as Error).message}) — partial`);
    }
    rec.writeAudit = writeAudit;
    rec.endedAt = this.now().toISOString();
    rec.outcome = "interrupted";
    rec.exitCode = null;
    for (const id of rec.taskIds) {
      const rt = run.tasks[id];
      if (rt === undefined) continue;
      for (const f of writeAudit.touchedFiles) if (!rt.touchedFiles.includes(f)) rt.touchedFiles.push(f);
      if (rt.currentSessionId === rec.sessionId) rt.currentSessionId = null;
    }
    this.save();
    const d = this.routeNow({ kind: "interrupted", sessionId: rec.sessionId, taskIds: [...rec.taskIds], sessionKind: rec.kind, sessionRole: rec.role });
    this.applyDecision(d, rec.sessionId, null, rec.sessionId, null);
  }

  private loadPacket(rec: SessionRecord): PacketV2 | null {
    try {
      const file = path.join(this.paths.sessionDir(this._run!.runId, rec.sessionId), "packet.json");
      return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as PacketV2) : null;
    } catch {
      return null;
    }
  }

  private loadJournal(): { path: string; hash: string }[] {
    try {
      const file = path.join(this.paths.runDir(this._run!.runId), "status-journal.jsonl");
      if (!existsSync(file)) return [];
      return (readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "")).map((l) => {
        const j = JSON.parse(l) as { path: string; sha256: string };
        return { path: j.path, hash: j.sha256 };
      });
    } catch {
      return [];
    }
  }

  private needsMigrationNote(): void {
    if (this.needsMigration) this.notes.push("plan เป็นรูปเดิม (legacy) — ต้อง migrate (AC-074): dispatch ทีละ session ต่อ module");
  }

  // ------------------------------------------------------------------
  // ภายใน — tick
  // ------------------------------------------------------------------

  // วงจร tick (DES-001): อ่าน plan ใหม่ → route plan-changed (R24/R9/R8/R18 — ทุก tick) → hold จาก issue ของ
  // BE-018 → statusWrites ค้าง → เริ่ม session ที่คิวไว้ → DAG dispatch → run.status
  private pump(): void {
    const run = this._run;
    if (run === null) return;
    if (!this.stopped) {
      this.refreshPlan();
      this.applyPendingWrites();
      this.applyDecision(this.routeNow({ kind: "plan-changed", sessionId: "", taskIds: [] }), "", null, null, null);
      this.applyParserIssueHolds();
      this.startPendingDispatch();
      this.dispatchLoop();
    }
    this.transitionRunStatus();
    this.save();
  }

  private routeNow(partial: Omit<RouterEvent, "phases">): Decision {
    const run = this._run!;
    const tasks = this.routerTasks();
    const event: RouterEvent = { ...partial, phases: scheduler.phaseInfos(run, this.plan, tasks) };
    const ctx = this.satisfiedCtx();
    return route(event, tasks, run.scheduler, { depsSatisfied: (dep) => scheduler.depsSatisfiedFull(dep, ctx) });
  }

  private satisfiedCtx(): scheduler.SatisfiedCtx {
    const run = this._run!;
    const cleared = new Set(Object.keys(run.phases).filter((p) => run.phases[p]!.cleared));
    return {
      clearedPhases: cleared,
      tpPhases: this.tpPhases,
      uxuiAnswered: (taskId) => scheduler.uxuiAnsweredOf(run, taskId),
    };
  }

  private routerTasks(): Record<string, RouterTask> {
    const run = this._run!;
    const out: Record<string, RouterTask> = {};
    for (const [id, rt] of Object.entries(run.tasks)) {
      const row = this.plan?.rows.find((r) => r.id === id);
      out[id] = {
        ...rt,
        depends: row?.depends ?? [],
        securitySensitive: this.taskFiles.get(id)?.securitySensitive === true,
      };
    }
    return out;
  }

  // ------------------------------------------------------------------
  // ภายใน — apply Decision (router ไม่เขียนไฟล์ — scheduler/driver apply — DES-018)
  // ------------------------------------------------------------------

  private applyDecision(d: Decision, sessionId: string, handoff: HandoffV2 | null, crashedSessionId: string | null, gateId: GateId | null): void {
    const run = this._run!;
    let changed = false;
    for (const t of d.transitions) {
      const rt = run.tasks[t.taskId];
      if (rt === undefined) continue;
      if (rt.step !== t.step) {
        rt.step = t.step;
        changed = true;
      }
      if (t.hold !== undefined && JSON.stringify(rt.hold ?? null) !== JSON.stringify(t.hold ?? null)) {
        rt.hold = t.hold; // มี key (รวม null) = ตั้ง/ล้าง · ไม่มี key = คงเดิม (BE-019)
        changed = true;
      }
    }
    for (const c of d.counters) {
      const rt = run.tasks[c.taskId];
      if (rt === undefined) continue;
      rt.fixRounds += c.fixRounds; // delta — scheduler บวกตาม (BE-019)
      rt.crashRestarts += c.crashRestarts;
      changed = true;
    }
    for (const ph of d.phaseHolds) {
      const pr = this.ensurePhase(ph.phase);
      if (pr.hold === null) {
        pr.hold = { reason: ph.reason };
        changed = true;
      }
    }
    for (const p of d.phaseCleared) {
      const pr = this.ensurePhase(p);
      if (!pr.cleared || pr.hold !== null) {
        pr.cleared = true;
        pr.hold = null;
        changed = true;
      }
    }
    // Feature QA ผูกกับ phase (OQ-13) — คำนวณ phase ครั้งเดียวต่อ dispatch (ใช้ทั้ง mark queued และตอนคิว)
    const fqaPhase = new Map<RouterDispatch, string | null>();
    for (const dp of d.dispatch) {
      if (dp.kind !== "feature-qa") continue;
      const phase = this.phaseOfTaskIds(dp.taskIds) ?? this.featureQaCandidatePhase();
      fqaPhase.set(dp, phase);
      if (phase === null) continue; // plan ไม่มี phase (legacy) — ไม่มีอะไรให้ mark
      const pr = this.ensurePhase(phase);
      if (pr.featureQa === "not-ready" || pr.featureQa === "fail") {
        pr.featureQa = "queued"; // กัน R18 dispatch ซ้ำระหว่างรอเริ่ม session
        changed = true;
      }
    }
    if (changed) this.save();

    this.applyWrites(d);

    for (const proposal of routerGateProposals(d, sessionId)) {
      const res = openGate(this._run!, proposal, this.opts.config.gates, { dependentsOf: (roots) => this.dependentsOf(roots) });
      this._run = res.run;
    }
    this.save();

    for (const line of d.log) this.appendLog(line); // router.log — 1 บรรทัดต่อผล (DES-018)

    for (const dp of d.dispatch) {
      if (dp.kind === "feature-qa" && (fqaPhase.get(dp) ?? null) === null) {
        // plan legacy ไม่มี ## Phases → ไม่มี phase ให้เปิด Feature QA → ไม่คิว (กัน R18 ยิงซ้ำทุก tick)
        if (!this.fqaDroppedNote) {
          this.fqaDroppedNote = true;
          this.notes.push("ไม่เปิด Feature QA — plan ไม่มี ## Phases (legacy — AC-074): ข้ามหลัง task verified");
          this.appendLog(JSON.stringify({ ruleId: "R18", taskId: "", from: "", to: "", reason: "ข้าม feature-qa — plan ไม่มี phase (legacy)" }));
        }
        continue;
      }
      this.pending.push(this.toPending(dp, d, handoff, crashedSessionId, gateId, dp.kind === "feature-qa" ? fqaPhase.get(dp) ?? null : null));
    }
  }

  private ensurePhase(phase: string): PhaseRuntime {
    const run = this._run!;
    const existing = run.phases[phase];
    if (existing !== undefined) return existing;
    const fresh: PhaseRuntime = { featureQa: "not-ready", featureQaSessionId: null, cleared: false, hold: null };
    run.phases[phase] = fresh;
    return fresh;
  }

  private phaseOfTaskIds(taskIds: readonly string[]): string | null {
    const ps = [...new Set(taskIds.map((id) => this._run?.tasks[id]?.planPhase).filter((p): p is string => p !== undefined && p !== ""))];
    return ps.length === 1 ? ps[0]! : null;
  }

  // phase สมควรได้ feature-qa (dispatch แบบไม่มี anchor — taskIds ว่าง): phase แรกที่ verified ครบและยังไม่ queued
  private featureQaCandidatePhase(): string | null {
    const run = this._run!;
    const tasks = this.routerTasks();
    for (const phase of Object.keys(run.phases).sort()) {
      const pr = run.phases[phase]!;
      if (pr.hold !== null || (pr.featureQa !== "not-ready" && pr.featureQa !== "fail")) continue;
      const members = Object.values(tasks).filter((t) => t.planPhase === phase);
      const anchors = members.filter((m) => m.owner === "qa-engineer");
      const anchorDeps = new Set<string>();
      for (const a of anchors) for (const id of scheduler.anchorImplicitDepends(a.taskId, tasks)) anchorDeps.add(id);
      const must = members.filter((m) => m.owner !== "qa-engineer" && !anchorDeps.has(m.taskId));
      if (members.length > 0 && must.every((m) => m.step === "verified")) return phase;
    }
    return null;
  }

  private toPending(dp: RouterDispatch, d: Decision, handoff: HandoffV2 | null, crashedSessionId: string | null, gateId: GateId | null, phaseOverride: string | null = null): PendingDispatch {
    const p: PendingDispatch = {
      kind: dp.kind,
      role: dp.role,
      taskIds: [...dp.taskIds],
      phase: phaseOverride ?? this.phaseOfTaskIds(dp.taskIds) ?? (dp.kind === "feature-qa" ? this.featureQaCandidatePhase() : null),
      blockerRef: handoff?.blocker?.reference ?? null,
      defect: null,
      priorSession: null,
      gateId: dp.kind === "record-only" ? gateId : null,
    };
    if (dp.kind === "execution" && d.ruleId === "R4" && handoff !== null && dp.taskIds.length === 1) {
      const source = handoff.review !== null ? "review" : handoff.qa !== null ? "qa" : "feature-qa";
      p.defect = { taskId: dp.taskIds[0]!, source, handoff };
    }
    if (d.ruleId === "R16" && crashedSessionId !== null) {
      const dead = this._run?.sessions.find((s) => s.sessionId === crashedSessionId);
      p.priorSession = { sessionId: crashedSessionId, touchedFiles: dead ? [...dead.writeAudit.touchedFiles] : [] };
    }
    return p;
  }

  // --- Status write-back + 🔒 (BE-022) — expectedCurrent = PlanRow.status ตอน emit Decision ---
  private applyWrites(d: Decision): void {
    const items: StatusWriteItem[] = d.statusWrites.map((w) => ({
      taskId: w.taskId, value: w.value, expectedCurrent: this.planRowStatus(w.taskId),
    }));
    const marks: SecurityMarkItem[] = d.securityMarks.map((m) => ({ phase: m.phase, reason: m.reason }));
    const res = this.doWrites(items, marks, d.ruleId);
    if (res.deferred) {
      this.pendingWrites.push({ items: items.map(({ taskId, value }) => ({ taskId, value })), marks, ruleId: d.ruleId });
    }
  }

  private doWrites(items: StatusWriteItem[], marks: SecurityMarkItem[], ruleId: string): { deferred: boolean; applied: boolean } {
    const run = this._run!;
    if (items.length === 0 && marks.length === 0) return { deferred: false, applied: false };
    const result = applyStatusWrites({
      planPath: this.planPath,
      module: this.opts.module,
      ruleId,
      statusWrites: items,
      securityMarks: marks,
      activeSessions: scheduler.activeSessions(run).map((s) => ({ sessionId: s.sessionId, claim: s.claim })),
      journalPath: path.join(this.paths.runDir(run.runId), "status-journal.jsonl"), // DES-021 ข้อ 4 — BE-022 path
      now: this.now(),
    });
    for (const j of result.journal) this.journal.push({ path: j.path, hash: j.sha256 });
    for (const n of result.notes) this.notes.push(n);
    for (const o of result.statusWrites) {
      if (o.kind !== "conflict") continue;
      // ค่าเดิมไม่ตรง/หาแถวไม่เจอ → ไม่เขียน + hold status-conflict (DES-007)
      const rt = run.tasks[o.taskId];
      if (rt !== undefined && rt.hold === null) {
        rt.hold = { reason: "status-conflict", ref: o.detail, prevStep: rt.step };
        rt.step = "held";
        this.appendLog(JSON.stringify({ ruleId, taskId: o.taskId, from: "", to: "held", reason: `status-conflict: ${o.detail}` }));
      }
    }
    if (result.deferred) {
      return { deferred: true, applied: false }; // ผู้เรียกคิว pendingWrites เอง (กันซ้ำจาก applyPendingWrites)
    }
    const applied = result.statusWrites.some((o) => o.kind === "applied") || result.securityMarks.some((o) => o.kind === "applied");
    if (applied) this.planDirty = true; // ไฟล์ plan เปลี่ยน — อ่านใหม่ tick ถัดไป (expectedCurrent รอบหน้าตรงกับของจริง)
    return { deferred: false, applied };
  }

  private applyPendingWrites(): void {
    if (this.pendingWrites.length === 0) return;
    const still: PendingWrite[] = [];
    for (const w of this.pendingWrites) {
      const items: StatusWriteItem[] = w.items.map((i) => ({ ...i, expectedCurrent: this.planRowStatus(i.taskId) }));
      const res = this.doWrites(items, w.marks, w.ruleId);
      if (res.deferred) still.push(w); // ยังเลื่อน — รอ session ที่ claim plan จบ (DES-021 §Permissions)
    }
    this.pendingWrites = still;
  }

  // --- hold แถว + dependents จาก issue ระดับแถวของ BE-018 (R9 dep-error เป็นของ router — ที่นี่ plan-error ที่เหลือ) ---
  private applyParserIssueHolds(): void {
    const run = this._run!;
    const issues = (this.plan?.issues ?? []).filter((i) => i.level === "row" && ISSUE_HOLD_KINDS.has(i.kind));
    const flagged = new Map<string, string>();
    for (const i of issues) for (const id of i.taskIds) if (!flagged.has(id)) flagged.set(id, i.reason);
    // dependents (ตรง/ทอด) — ref ตามรากที่ดึงเข้ามา (แบบเดียวกับ dependentsOf ของ router)
    const targets = new Map<string, string>(flagged);
    const tasks = this.routerTasks();
    const rev = new Map<string, string[]>();
    for (const t of Object.values(tasks)) {
      for (const d of t.depends) rev.set(d, [...(rev.get(d) ?? []), t.taskId]);
    }
    const q = [...flagged.keys()];
    while (q.length > 0) {
      const x = q.shift()!;
      for (const dep of [...(rev.get(x) ?? [])].sort()) {
        if (targets.has(dep)) continue;
        targets.set(dep, targets.get(x)!);
        q.push(dep);
      }
    }
    let changed = false;
    for (const [id, ref] of [...targets].sort((a, b) => a[0].localeCompare(b[0]))) {
      const rt = run.tasks[id];
      if (rt === undefined || rt.step === "verified" || rt.hold !== null) continue; // verified เอกสารชนะ · hold อื่นไม่ทับ
      rt.hold = { reason: "plan-error", ref, prevStep: rt.step };
      rt.step = "held";
      changed = true;
      this.notes.push(`plan-error (${ref}): ${id} — ห้าม dispatch แถวนี้ + dependents (AC-079)`);
      this.appendLog(JSON.stringify({ ruleId: "R24", taskId: id, from: rt.hold.prevStep, to: "held", reason: `plan-error (${ref}) — issue ของ BE-018 (AC-079)` }));
    }
    for (const [id, rt] of Object.entries(run.tasks)) {
      if (rt.hold?.reason !== "plan-error") continue;
      const ref = rt.hold.ref ?? "";
      if (routerOwnedRef(ref)) continue; // ของ router R24 — router ปลดเองเมื่อ plan แก้
      if (targets.has(id)) continue; // ยังผิด — คง hold
      const prev = rt.hold.prevStep;
      rt.step = prev === "held" || prev === "" ? "waiting-deps" : prev;
      rt.hold = null;
      changed = true;
      this.appendLog(JSON.stringify({ ruleId: "R24", taskId: id, from: "held", to: rt.step, reason: "plan แก้แล้ว — ปลด hold plan-error" }));
    }
    if (changed) this.save();
  }

  private dependentsOf(roots: readonly string[]): string[] {
    const tasks = this.routerTasks();
    const rev = new Map<string, string[]>();
    for (const t of Object.values(tasks)) {
      for (const d of t.depends) rev.set(d, [...(rev.get(d) ?? []), t.taskId]);
    }
    const out = new Set<string>();
    const q = [...roots];
    while (q.length > 0) {
      const x = q.shift()!;
      for (const dep of [...(rev.get(x) ?? [])].sort()) {
        if (out.has(dep) || roots.includes(dep)) continue;
        out.add(dep);
        q.push(dep);
      }
    }
    return [...out];
  }

  // ------------------------------------------------------------------
  // ภายใน — dispatch (เริ่ม session ผ่าน CampAdapter — DES-001/002)
  // ------------------------------------------------------------------

  private startPendingDispatch(): void {
    if (this.pending.length === 0) return;
    const still: PendingDispatch[] = [];
    for (const p of this.pending) {
      if (this.tryStart(p) === "queued") still.push(p); // started/dropped ออกจากคิว — queued รอ slot/gate tick ถัดไป
    }
    this.pending = still;
  }

  private dispatchLoop(): void {
    const run = this._run!;
    if (run.planFormat === "none") return; // ไม่มี plan — ไม่ dispatch (intake เป็นของ BE-010)
    const tasks = this.routerTasks();
    const qaActive = scheduler.activeSessions(run).some((s) => s.kind === "qa");
    // quiesce (DES-019 QA ข้อ 3 — codeRoot เดียวต่อ run): มี QA round รันอยู่ → ห้ามเริ่ม execution ใหม่
    if (!qaActive && scheduler.dispatchCap(run) > 0) {
      const runnable = scheduler.orderedRunnable(run, tasks, this.order);
      for (const e of scheduler.groupExecutions(runnable)) {
        if (scheduler.dispatchCap(run) < 1) break;
        this.tryStart({ kind: "execution", role: e.role, taskIds: e.taskIds, phase: this.phaseOfTaskIds(e.taskIds), blockerRef: null, defect: null, priorSession: null, gateId: null }, e.note);
      }
    }
    const sizes = this.sizeFn();
    // re-dispatch task ที่ปลด hold กลับ step เดิม (gate answered / retry — R22) แต่ยังไม่มี session
    for (const r of scheduler.orderedResumable(run, tasks, this.order)) {
      if (scheduler.dispatchCap(run) < 1) break;
      if (r.kind === "execution" && qaActive) break; // quiesce เดียวกับ execution ใหม่
      this.tryStart({ kind: r.kind, role: r.role, taskIds: [r.taskId], phase: r.phase, blockerRef: null, defect: null, priorSession: null, gateId: null });
    }
    for (const w of scheduler.reviewDispatches(run, tasks, run.scheduler, sizes, this.order)) { // order = ลำดับแถว plan (DES-019 ข้อ 3 — REV-046)
      if (scheduler.dispatchCap(run) < 1) break;
      this.tryStart({ kind: "review", role: "reviewer", taskIds: [...w.taskIds], phase: w.phase, blockerRef: null, defect: null, priorSession: null, gateId: null });
    }
    const q = scheduler.qaDispatch(run, tasks, (phase) => scheduler.tpReadyOf(tasks, phase));
    if (q !== null) {
      this.tryStart({ kind: "qa", role: "qa-engineer", taskIds: [...q.taskIds], phase: q.phase, blockerRef: null, defect: null, priorSession: null, gateId: null });
    }
  }

  private sizeFn(): (taskId: string) => scheduler.DiffSize | null {
    const run = this._run!;
    const cache = new Map<string, scheduler.DiffSize | null>();
    return (taskId: string) => {
      if (!cache.has(taskId)) {
        cache.set(taskId, scheduler.sizeOf(run, taskId, (sid) => path.join(this.paths.sessionDir(run.runId, sid), "diff.patch"), (abs) => existsSync(abs) ? readFileSync(abs, "utf8") : null));
      }
      return cache.get(taskId) ?? null;
    };
  }

  // คืน "started" | "queued" (slot/gate/claim — รอ tick ถัดไป) | "dropped" (ปฏิเสธถาวร — hold + log ตาม design)
  private tryStart(p: PendingDispatch, note: string | null = null): "started" | "queued" | "dropped" {
    const run = this._run!;
    // plan legacy ไม่มีคอลัมน์ Phase → planPhase "" — packet/SessionRecord รับเฉพาะ string ไม่ว่าง หรือ null
    const phase = p.phase !== null && p.phase.trim() !== "" ? p.phase : null;
    if (p.kind !== "record-only") {
      if (dispatchBlocker(run, p.taskIds) !== null) return "queued"; // gate ครอบ (AC-013/AC-072)
      if (p.taskIds.some((id) => run.tasks[id]?.currentSessionId !== null)) return "queued"; // active — ไม่ dispatch ทับ
    }
    const layout = this.layout();
    const registry = this.opts.config.registry;
    const scope: PatternScope = {
      docsRoot: this.docsRoot, codeRoots: this.codeRoots, packRoot: registry.packRoot,
      module: this.opts.module, docsLayout: layout,
    };
    const denyPaths: DenyPaths = { orchestratorHome: this.home, staConfigPath: this.opts.config.staConfigPath };

    // claim (DES-021 ข้อ 1) — execution = Write paths ของ task · อื่น = allow ของ role
    let claim: string[];
    try {
      const routeDef = this.opts.config.routing.role_routes[p.role];
      const allow = routeDef?.writePaths.allow ?? [];
      const deny = routeDef?.writePaths.deny ?? [];
      let writePaths: string[] | null = null;
      if (p.kind === "execution") {
        const wp = new Set<string>();
        for (const id of p.taskIds) for (const w of this.taskFiles.get(id)?.writePaths ?? []) wp.add(w);
        if (wp.size > 0) writePaths = [...wp];
      }
      claim = resolveClaim({ writePaths, allow, deny, scope, denyPaths }).claim;
    } catch (e) {
      if (e instanceof ClaimError) {
        this.holdTasks(p.taskIds, "plan-error", "write-paths", e.message);
        this.appendLog(JSON.stringify({ ruleId: "R24", taskId: p.taskIds.join(","), from: "", to: "held", reason: `claim: ${e.message}` }));
        return "dropped";
      }
      throw e;
    }
    if (scheduler.claimCollides(scheduler.activeSessions(run), claim)) return "queued"; // DES-021 ข้อ 2

    // role prompt (BE-003) — role ไม่พบใน rolePromptRoot → ปฏิเสธ dispatch (DES-001)
    let rolePrompt;
    try {
      rolePrompt = loadRolePrompt(registry.rolePromptRoot, p.role);
    } catch (e) {
      this.appendLog(JSON.stringify({ ruleId: DISPATCH_LOG, taskId: p.taskIds.join(","), from: "", to: "", reason: `ปฏิเสธ dispatch: ${(e as Error).message}` }));
      return "dropped";
    }

    // context (BE-020) — fail-closed: error → hold context-error (AC-048)
    const ctx = loadContext({ docsRoot: this.docsRoot, layout, module: this.opts.module }, p.kind, p.role, p.taskIds, this.contextRefs(p));
    if (ctx.error !== null) {
      this.holdTasks(p.taskIds, "context-error", ctx.error.id, ctx.error.message);
      this.appendLog(JSON.stringify({ ruleId: DISPATCH_LOG, taskId: p.taskIds.join(","), from: "", to: "held", reason: `context-error: ${ctx.error.message}` }));
      return "dropped";
    }

    // camp + model policy (BE-005/BE-004)
    let campSel: ReturnType<typeof resolveCamp>;
    let policy: ReturnType<typeof resolveEffectiveModelPolicy>;
    try {
      campSel = resolveCamp(this.opts.config.routing, { role: p.role, runOverrideCamp: this.opts.runOverrideCamp });
      policy = resolveEffectiveModelPolicy(this.opts.config.tiers, this.opts.config.routing, { role: p.role, camp: campSel.camp });
    } catch (e) {
      this.appendLog(JSON.stringify({ ruleId: DISPATCH_LOG, taskId: p.taskIds.join(","), from: "", to: "", reason: `ปฏิเสธ dispatch — camp/model: ${(e as Error).message}` }));
      return "dropped";
    }
    const adapter = this.opts.adapters[campSel.camp];
    if (adapter === undefined) throw new DriverError("config", `ไม่มี adapter ของ camp "${campSel.camp}" ลงทะเบียน`);

    const used = new Set<string>([...run.sessions.map((s) => s.sessionId), ...this.handles.keys()]);
    const seq = this.nextSeq();
    const [sid] = newDispatchSessionIds(1, seq, used);
    const profile = adapter.profile;
    const sessionDir = this.paths.sessionDir(run.runId, sid);
    mkdirSync(sessionDir, { recursive: true });

    // defect packet (R4 — DES-019 §Defect packet) — ไฟล์เดียวต่อ fixRound
    let defectPacketJson: ReturnType<typeof buildDefectPacket> = null;
    if (p.defect !== null) {
      const rt = run.tasks[p.defect.taskId];
      const round = Math.max(1, rt?.fixRounds ?? 1);
      defectPacketJson = buildDefectPacket({ taskId: p.defect.taskId, source: p.defect.source, fixRound: round, handoff: p.defect.handoff });
    }

    // packet v2 (BE-006) — fail-closed ก่อนแตะ run state
    let packet: PacketV2;
    try {
      packet = buildPacketV2({
        runId: run.runId,
        sessionId: sid,
        seq,
        module: this.opts.module,
        role: p.role,
        kind: p.kind,
        taskIds: [...p.taskIds],
        planPhase: phase,
        attempt: this.attemptOf(p),
        dateFromUser: this.opts.dateFromUser,
        docsRoot: this.docsRoot,
        docsLayout: layout,
        selectedTarget: { name: this.target.name, path: this.target.path },
        gitPolicy: run.gitPolicy,
        context: ctx,
        writeScope: this.writeScopeOf(p.role),
        claim,
        rolePrompt,
        brief: this.briefOf(p),
        priorSession: p.priorSession,
        defectPacket: defectPacketJson,
        reviewInput: p.kind === "review"
          ? { tasks: p.taskIds.map((id) => this.reviewInputOf(id)) }
          : null,
        blocker: null,
        schemaEnforcedByCli: profile.schemaFlag !== null,
      });
    } catch (e) {
      this.appendLog(JSON.stringify({ ruleId: DISPATCH_LOG, taskId: p.taskIds.join(","), from: "", to: "", reason: `packet ไม่ผ่าน contract — ไม่ dispatch: ${(e as Error).message}` }));
      return "dropped";
    }

    const packetPath = path.join(sessionDir, "packet.json");
    writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
    let handoffSchemaPath: string | null = null;
    if (profile.schemaFlag !== null) {
      handoffSchemaPath = path.join(sessionDir, "handoff-schema.json");
      writeFileSync(handoffSchemaPath, `${JSON.stringify(handoffV2JsonSchema(), null, 2)}\n`, "utf8");
    }
    if (defectPacketJson !== null) {
      const rel = defectPacketPath(p.defect!.taskId, Math.max(1, run.tasks[p.defect!.taskId]?.fixRounds ?? 1));
      writeFileSync(path.join(this.paths.defectsDir(run.runId), path.basename(rel)), `${JSON.stringify(defectPacketJson, null, 2)}\n`, "utf8");
      const rt = run.tasks[p.defect!.taskId];
      if (rt !== undefined) rt.defectPacket = rel; // path ใต้ defects/ (data-model)
    }

    // SessionRecord + state ของ task
    const attemptDelta = p.kind === "execution";
    if (attemptDelta) for (const id of p.taskIds) {
      const rt = run.tasks[id];
      if (rt !== undefined) rt.attempt += 1; // attempt = execution session ที่ dispatch แล้ว (DES-007)
    }
    const record: SessionRecord = {
      sessionId: sid,
      seq,
      kind: p.kind,
      role: p.role,
      taskIds: [...p.taskIds],
      planPhase: phase,
      attempt: this.attemptOf(p),
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
      priorSession: p.priorSession,
      startedAt: this.now().toISOString(),
      endedAt: null,
      exitCode: null,
      outcome: null,
      handoff: null,
      logsPath: `sessions/${sid}/session.log`,
      writeAudit: { mode: "manifest", partial: false, diffApprox: false, changed: [], touchedFiles: [], violations: [], gitRefs: [] },
    };
    run.sessions.push(record);
    const step = scheduler.stepForKind(p.kind);
    for (const id of p.taskIds) {
      const rt = run.tasks[id];
      if (rt === undefined) continue;
      rt.currentSessionId = sid;
      if (!rt.sessionIds.includes(sid)) rt.sessionIds.push(sid);
      if (step !== null && rt.step !== "verified" && rt.hold === null) rt.step = step;
    }
    if (p.kind === "feature-qa" && phase !== null) {
      const pr = this.ensurePhase(phase);
      pr.featureQa = "running";
      pr.featureQaSessionId = sid;
    }
    if (p.kind === "record-only" && p.gateId !== null) {
      const g = run.gateLog[run.gateLog.length - 1];
      if (g !== undefined && g.gateId === p.gateId && g.status === "answered") g.recordSessionId = sid; // OQ-D3
    }

    // audit เริ่ม session (BE-008) — snapshot + pre-image ก่อน spawn
    const startRes = startSessionAudit({
      home: this.home, runId: run.runId, sessionId: sid, roots: this.auditRoots(),
      docsRoot: this.docsRoot, docsLayout: layout, module: this.opts.module,
      packRoot: registry.packRoot, claim,
      manifestIgnore: registry.audit.manifestIgnore,
      preimageMaxMB: registry.audit.preimageMaxMB,
    });
    for (const n of startRes.notes) this.notes.push(n);

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
      timeoutSec: this.opts.config.camps.defaults.timeoutSec,
      cwd: registry.packRoot, // DES-013 — เปิด session ที่ code\
      extraDirs: profile.extraDirsFlag ? [this.docsRoot, ...this.codeRoots] : [],
    };
    const handle = adapter.dispatch(req);
    record.pid = handle.pid;
    const live: LiveSession = { record, packet, handle, outcome: handle.outcome };
    this.handles.set(sid, live);
    handle.outcome.then(
      (o) => this.processSessionEnd(sid, o),
      () => this.processSessionEnd(sid, { exitCode: null, handoffRaw: null, cliSessionId: null, cliVersion: null, logsPath: null, failure: "crash" }),
    );
    this.appendLog(JSON.stringify({
      ruleId: DISPATCH_LOG, taskId: p.taskIds.join(",") || "-", from: p.taskIds[0] !== undefined ? run.tasks[p.taskIds[0]]?.step ?? "" : "", to: sid,
      reason: `${p.kind}/${p.role}${note !== null ? ` — ${note}` : ""} (pid ${handle.pid ?? "-"})`,
    }));
    this.save();
    return "started";
  }

  private nextSeq(): number {
    const run = this._run!;
    return run.sessions.reduce((m, s) => Math.max(m, s.seq), -1) + 1;
  }

  private attemptOf(p: PendingDispatch): number {
    const run = this._run!;
    if (p.taskIds.length === 0) return 0;
    return Math.max(...p.taskIds.map((id) => run.tasks[id]?.attempt ?? 0));
  }

  private layout(): DocsLayout {
    return this.opts.config.registry.docsLayout;
  }

  private roleAllow(role: Role): string[] {
    return this.opts.config.routing.role_routes[role]?.writePaths.allow ?? [];
  }

  private roleDeny(role: Role): string[] {
    return this.opts.config.routing.role_routes[role]?.writePaths.deny ?? [];
  }

  private writeScopeOf(role: Role): { allow: string[]; deny: string[] } {
    const wp = this.opts.config.routing.role_routes[role]?.writePaths;
    return { allow: [...(wp?.allow ?? [])], deny: [...(wp?.deny ?? [])] };
  }

  private holdTasks(taskIds: readonly string[], reason: "plan-error" | "context-error", ref: string | null, detail: string): void {
    const run = this._run!;
    let changed = false;
    for (const id of taskIds) {
      const rt = run.tasks[id];
      if (rt === undefined || rt.hold !== null || rt.step === "verified") continue;
      rt.hold = { reason, ref, prevStep: rt.step };
      rt.step = "held";
      changed = true;
    }
    if (changed) {
      this.save();
      this.notes.push(`${reason}: ${detail}`);
    }
  }

  private contextRefs(p: PendingDispatch): ContextRefs {
    const refs: ContextRefs = {};
    if (p.kind === "change" && p.blockerRef !== null) refs.blockerReference = p.blockerRef;
    if (p.kind === "execution" && p.defect !== null) {
      const built = buildDefectPacket({ taskId: p.defect.taskId, source: p.defect.source, fixRound: Math.max(1, this._run?.tasks[p.defect.taskId]?.fixRounds ?? 1), handoff: p.defect.handoff });
      if (built !== null) {
        refs.defectPacket = {
          taskId: built.taskId, source: built.source, roundFile: built.roundFile,
          findings: built.findings.map((f) => ({
            id: f.id, reference: f.reference, // ReviewFinding ไม่มี reproduce — QaDefect เท่านั้น (DES-020 ข้อ 1)
            reproduce: { tp: "reproduce" in f && f.reproduce !== undefined && f.reproduce !== null ? f.reproduce.tp ?? null : null },
          })),
        };
      }
    }
    if (p.priorSession !== null) refs.priorSession = p.priorSession;
    if (p.kind === "review") refs.reviewInput = true;
    if (p.kind === "feature-qa" && p.phase !== null) refs.planPhase = p.phase;
    if (p.kind === "security" && p.phase !== null) {
      refs.phaseChangedFiles = this.phaseChangedFiles(p.phase);
    }
    return refs;
  }

  private phaseChangedFiles(phase: string): string[] {
    const run = this._run!;
    const ids = new Set(Object.values(run.tasks).filter((t) => t.planPhase === phase).map((t) => t.taskId));
    const out: string[] = [];
    for (const s of [...run.sessions].sort((a, b) => a.seq - b.seq)) {
      if (!s.taskIds.some((id) => ids.has(id))) continue;
      for (const f of s.writeAudit.touchedFiles) if (!out.includes(f)) out.push(f);
    }
    return out;
  }

  private reviewInputOf(taskId: string): ReturnType<typeof reviewInputForTask> {
    const run = this._run!;
    const base = reviewInputForTask(taskId, run.sessions);
    return { ...base, testFiles: base.changedFiles.filter(isTestPath) }; // testFiles = คัดจาก changedFiles โดย driver (BE-021)
  }

  private briefOf(p: PendingDispatch): string {
    const ids = p.taskIds.length > 0 ? `task ${p.taskIds.join(", ")}` : "ไม่ผูก task";
    const phase = p.phase !== null ? ` (phase ${p.phase})` : "";
    const extra = p.priorSession !== null ? ` · ต่อจาก session ${p.priorSession.sessionId} — ไฟล์ที่แตะก่อนหน้า: ${p.priorSession.touchedFiles.length}` : "";
    const defect = p.defect !== null ? ` · แก้ตาม defect packet ของ ${p.defect.taskId}` : "";
    return `ทำงานตาม task ใน packet · ${ids}${phase}${extra}${defect} · คืน handoff-v2 ตาม outputContract`;
  }

  // ------------------------------------------------------------------
  // ภายใน — session จบ → audit → route
  // ------------------------------------------------------------------

  private processSessionEnd(sid: string, outcome: CampOutcome): void {
    const run = this._run;
    const live = this.handles.get(sid);
    if (run === null || live === undefined) return;
    this.handles.delete(sid);
    const rec = run.sessions.find((s) => s.sessionId === sid);
    if (rec === undefined) return;

    // audit จบ session (BE-008) — snapshot ปิด + attribution + diff.patch (ขนาดให้ BE-021)
    let writeAudit = rec.writeAudit;
    if (outcome.failure !== "spawn") {
      try {
        const res = finishSessionAudit({
          home: this.home, runId: run.runId, sessionId: sid, roots: this.auditRoots(),
          docsRoot: this.docsRoot, docsLayout: this.layout(), module: this.opts.module,
          packRoot: this.opts.config.registry.packRoot, claim: rec.claim,
          manifestIgnore: this.opts.config.registry.audit.manifestIgnore,
          preimageMaxMB: this.opts.config.registry.audit.preimageMaxMB,
          role: rec.role,
          allow: live.packet.writeScope.allow, deny: live.packet.writeScope.deny,
          activeSessions: scheduler.activeSessions(run)
            .filter((s) => s.sessionId !== sid)
            .map((s) => ({ sessionId: s.sessionId, claim: s.claim })),
          journal: this.journal, // self-write ของ orchestrator — audit ข้าม (DES-021 ข้อ 4)
        });
        writeAudit = res.writeAudit;
        this.notes.push(...res.notes);
      } catch (e) {
        writeAudit = { ...rec.writeAudit, partial: true };
        this.notes.push(`audit ของ session ${sid} ตัดสินไม่ได้: ${(e as Error).message} — partial`);
      }
    }
    rec.writeAudit = writeAudit;
    rec.exitCode = outcome.exitCode;
    rec.cliSessionId = outcome.cliSessionId;
    rec.cliVersion = outcome.cliVersion;
    if (outcome.logsPath !== null) rec.logsPath = outcome.logsPath;
    rec.endedAt = this.now().toISOString();

    for (const id of rec.taskIds) {
      const rt = run.tasks[id];
      if (rt === undefined) continue;
      for (const f of writeAudit.touchedFiles) if (!rt.touchedFiles.includes(f)) rt.touchedFiles.push(f);
      if (rt.currentSessionId === sid) rt.currentSessionId = null;
    }

    if (this.stopped) {
      rec.outcome = "interrupted"; // stop — ไม่ route ไม่ re-dispatch
      this.save();
      return;
    }

    // ตัดสิน outcome + event (DES-007/012/018)
    let eventKind: RouterEventKind;
    let handoff: HandoffV2 | null = null;
    let problems: string[] | null = null;
    if (outcome.failure === null) {
      const parsed = this.extractHandoff(outcome.handoffRaw, outcome.structuredOutputField, live.packet);
      if (parsed === "invalid") {
        rec.outcome = "failed"; // DES-012 Fallback — extract fenced แล้วยังไม่ผ่าน → failed + R15
        eventKind = "handoff";
        problems = [...this.lastProblems];
      } else {
        rec.outcome = "completed";
        rec.handoff = parsed;
        eventKind = "handoff";
        handoff = parsed;
      }
    } else if (outcome.failure === "timeout") {
      rec.outcome = "timeout";
      eventKind = "timeout";
    } else if (outcome.failure === "interrupted") {
      rec.outcome = "interrupted";
      eventKind = "interrupted";
    } else if (outcome.failure === "spawn") {
      rec.outcome = "failed"; // spawn ไม่สำเร็จหลัง retryOnCrash → R16 เดียวกับ session ล่ม (ตีความ — handoff)
      eventKind = "crash";
    } else {
      rec.outcome = "crashed";
      eventKind = "crash";
    }

    if (rec.kind === "feature-qa" && rec.planPhase !== null) {
      const pr = this.ensurePhase(rec.planPhase);
      pr.featureQa = handoff !== null && handoff.outputState === "PASS" ? "pass" : "fail";
    }
    if (handoff !== null) this.recordVerdicts(rec, handoff);

    const crashed = eventKind === "crash" || eventKind === "timeout" || eventKind === "interrupted" ? sid : null;
    this.save();
    const d = this.routeNow({
      kind: eventKind,
      sessionId: sid,
      taskIds: [...rec.taskIds],
      handoff,
      sessionKind: rec.kind,
      sessionRole: rec.role,
      handoffInvalid: problems,
      auditSuspects: this.suspectTasks(writeAudit),
    });
    this.applyDecision(d, sid, handoff, crashed, null);
    this.pump();
  }

  // handoffRaw → HandoffV2 — schema + กฎ (BE-006) · Fallback extract fenced JSON (DES-012):
  // ลอง parse ตรงก่อน · ถ้าไม่ผ่านตรวจ (เช่น stdout เป็น result wrapper ของ CLI ที่ไม่ enforce schema —
  // ข้อความ agent อยู่ใน string field) ลอง fenced JSON ในค่า string ทุกชั้น แล้วใน raw · ไม่ผ่าน = "invalid" → R15
  // QA-009: camp ที่ CLI enforce schema ครอบ handoff ไว้ใน object field ของ result envelope (claude =
  // structured_output — DES-002) — ชื่อ field มาจาก outcome (CampOutcome.structuredOutputField) ไม่ hardcode
  // ใน driver · unwrap วางก่อน candidates เดิมเสมอ (เชื่อ CLI) · field ไม่มี/ไม่ใช่ object → candidates เดิม
  private extractHandoff(raw: string | null, structuredField: string | null | undefined, packet: PacketV2): HandoffV2 | "invalid" {
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
        if (field !== null && typeof direct === "object" && direct !== null && !Array.isArray(direct)) {
          const wrapped = (direct as Record<string, unknown>)[field];
          // เฉพาะ object — primitive/string ไม่เดา (fail-closed) · string ที่มี fenced JSON เจอที่ collect ด้านล่างอยู่แล้ว
          if (typeof wrapped === "object" && wrapped !== null && !Array.isArray(wrapped)) candidates.push(wrapped);
        }
        candidates.push(direct);
        const collect = (v: unknown, depth: number): void => {
          if (depth > 3) return;
          if (typeof v === "string") pushFenced(v);
          else if (Array.isArray(v)) for (const x of v) collect(x, depth + 1);
          else if (v !== null && typeof v === "object") for (const x of Object.values(v)) collect(x, depth + 1);
        };
        collect(direct, 0);
      } catch {
        pushFenced(raw); // stdout ไม่ใช่ JSON — fenced ใน raw ตรง ๆ
      }
    }
    for (const value of candidates) {
      if (handoffProblems(value, packet).length === 0) return value as HandoffV2;
    }
    this.lastProblems = candidates.length === 0
      ? ["handoffRaw parse เป็น JSON ไม่ได้ (fallback extract fenced JSON แล้ว — DES-012)"]
      : handoffProblems(candidates[0]!, packet);
    return "invalid";
  }

  private recordVerdicts(rec: SessionRecord, h: HandoffV2): void {
    const run = this._run!;
    const put = (taskId: string, verdict: "PASS" | "FAIL" | "verified" | "blocked", ref: string, source: "review" | "qa" | "feature-qa"): void => {
      const rt = run.tasks[taskId];
      if (rt === undefined) return;
      rt.lastVerdict = { source, verdict, ref, sessionId: rec.sessionId }; // DES-007
    };
    if (rec.kind === "review" && h.review !== null) {
      for (const p of h.review.perTask) put(p.task, p.verdict, h.review.roundFile, "review");
    }
    if (rec.kind === "qa" && h.qa !== null) {
      for (const p of h.qa.perTask) put(p.task, p.verdict, h.qa.roundFile, "qa");
    }
    if (rec.kind === "feature-qa" && h.featureQa !== null) {
      for (const id of rec.taskIds) put(id, h.outputState === "PASS" ? "PASS" : "FAIL", h.featureQa.roundFile, "feature-qa");
    }
  }

  // suspects (session id) ของ violation → task id ของ session เหล่านั้น (R2 — BE-019 รับ task id)
  private suspectTasks(writeAudit: SessionRecord["writeAudit"]): string[] {
    const ids = new Set(writeAudit.violations.flatMap((v) => v.suspects));
    const out = new Set<string>();
    for (const s of this._run?.sessions ?? []) {
      if (!ids.has(s.sessionId)) continue;
      for (const t of s.taskIds) out.add(t);
    }
    return [...out].sort();
  }

  // ------------------------------------------------------------------
  // ภายใน — run.status transition (DES-001)
  // ------------------------------------------------------------------

  private transitionRunStatus(): void {
    const run = this._run!;
    if (run.status === "stopped") return; // คนสั่ง stop — คงเดิม
    const active = scheduler.activeSessions(run).length > 0;
    const gates = openGateRecords(run);
    const taskIds = Object.keys(run.tasks);
    const allVerified = taskIds.length > 0 && Object.values(run.tasks).every((t) => t.step === "verified");
    const phaseIds = Object.keys(run.phases);
    const allCleared = phaseIds.length > 0 && Object.values(run.phases).every((p) => p.cleared);
    const dispatchable = Object.values(run.tasks).some((t) =>
      t.hold === null && t.currentSessionId === null
      && (t.step === "runnable" || t.step === "awaiting-review" || t.step === "awaiting-qa"));
    let next: RunStatus;
    if (allVerified && allCleared && !active && gates.length === 0) {
      next = "completed"; // task ใน Release Scope verified + phase cleared (DES-001)
    } else if (shouldWaitOnHuman(run)) {
      next = "waiting-on-human"; // gate scope module หรือไม่มี task ใดเดินได้ (BE-009)
    } else if (active || dispatchable) {
      next = "running";
    } else {
      next = "idle"; // ไม่มีอะไร runnable/active
    }
    if (next !== run.status) {
      appendDriverLog(this.home, { ruleId: RUN_STATUS_LOG, taskId: "", from: run.status, to: next, reason: `active=${active} dispatchable=${dispatchable} gates=${gates.length}` });
      run.status = next;
    }
  }

  private save(): void {
    if (this._run === null) return;
    this._run = saveRun(this.home, this._run); // atomic ทุก transition (DES-007) — updatedAt ใหม่เสมอ
  }

  private appendLog(line: string): void {
    appendRouterLog(this.home, line); // router.log ที่ state root (BE-007) — 1 บรรทัดต่อผลตัดสิน (DES-018)
  }
}

// log ฝั่ง driver เอง (append ท้ายไฟล์ — ไม่ใช่ transition ของ run.json)
function appendDriverLog(home: string, line: { ruleId: string; taskId: string; from: string; to: string; reason: string }): void {
  appendRouterLog(home, JSON.stringify(line));
}
