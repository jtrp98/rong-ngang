// BE-023 — Task dashboard API + human retry (DES-022 · DES-009)
// GET /api/modules/<name>/tasks · POST /api/modules/<name>/tasks/<taskId>/retry · GET /api/sessions/<sessionId>
import type http from "node:http";
import { EventEmitter } from "node:events";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { type AppConfig } from "../core/config.ts";
import { openGateRecords, latestGateRecord } from "../core/gates.ts";
import { parsePlanIndex, type PlanIndex, type PlanRow } from "../core/plan-parser.ts";
import {
  getPointer, loadRun, saveRun, statePaths,
  type GateId, type GateRecord, type RunJson, type SessionRecord, type Step,
} from "../core/state-store.ts";

const STEPS: readonly Step[] = [
  "waiting-deps", "runnable", "execution", "awaiting-review", "review", "awaiting-qa", "qa", "verified", "held",
];

export interface TasksApiOptions {
  config: AppConfig;
  events: EventEmitter;
  host: string;
  port: number;
}

const ALLOWED_RETRY_HOLDS = new Set([
  "crash-limit",
  "blocked",
  "audit-violation",
  "invalid-handoff",
  "context-error",
  "status-conflict",
]);

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function findModulePath(config: AppConfig, moduleName: string): string | null {
  for (const k of config.sta.knowledge_roots) {
    if (!existsSync(k.path)) continue;
    const candidate = path.join(k.path, moduleName);
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

function findSessionById(config: AppConfig, sessionId: string): { session: SessionRecord; run: RunJson; runDir: string } | null {
  const paths = statePaths(config.orchestratorHome);
  if (!existsSync(paths.runsDir)) return null;

  for (const dirent of readdirSync(paths.runsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const runId = dirent.name;
    const rDir = paths.runDir(runId);
    const rFile = paths.runJsonPath(runId);
    if (!existsSync(rFile)) continue;
    try {
      const run = loadRun(config.orchestratorHome, runId);
      const s = run.sessions.find((x) => x.sessionId === sessionId);
      if (s) {
        return { session: s, run, runDir: rDir };
      }
    } catch {}
  }
  return null;
}

export async function handleTasksApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  opts: TasksApiOptions,
): Promise<boolean> {
  const reqHost = req.headers.host ?? `${opts.host}:${opts.port}`;
  const urlObj = new URL(req.url ?? "/", `http://${reqHost}`);
  const pathname = urlObj.pathname;
  const method = req.method ?? "GET";

  const json = (status: number, data: any) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
    return true;
  };

  // ------------------------------------------------------------------
  // 1. GET /api/modules/<name>/tasks (DES-022)
  // ------------------------------------------------------------------
  const tasksMatch = /^\/api\/modules\/([a-z0-9][a-z0-9-]*)\/tasks$/.exec(pathname);
  if (method === "GET" && tasksMatch) {
    const modName = tasksMatch[1]!;
    const modPath = findModulePath(opts.config, modName);
    if (!modPath) {
      return json(404, { error: `Module not found: ${modName}` });
    }

    // โหลด plan doc
    let planIndex: PlanIndex | null = null;
    const planIndexFile = path.join(modPath, "plan", "index.md");
    const legacyPlanFile = path.join(modPath, "plan.md");

    if (existsSync(planIndexFile)) {
      try {
        planIndex = parsePlanIndex(readFileSync(planIndexFile, "utf8"), planIndexFile);
      } catch {}
    } else if (existsSync(legacyPlanFile)) {
      try {
        planIndex = parsePlanIndex(readFileSync(legacyPlanFile, "utf8"), legacyPlanFile);
      } catch {}
    }

    // โหลด run ถ้ามี
    const pointer = getPointer(opts.config.orchestratorHome, modName);
    let run: RunJson | null = null;
    if (pointer) {
      try {
        run = loadRun(opts.config.orchestratorHome, pointer);
      } catch {}
    }

    const planFormat = run?.planFormat ?? planIndex?.format ?? "none";
    const needsMigration = planIndex?.needsMigration ?? (planFormat === "legacy");

    const maxParallelSessions = run?.scheduler?.maxParallelSessions ?? opts.config.registry.scheduler.maxParallelSessions;
    const fixRoundLimit = run?.scheduler?.fixRoundLimit ?? opts.config.registry.scheduler.fixRoundLimit;

    // คำนวณ active sessions
    let active = 0;
    if (run) {
      for (const t of Object.values(run.tasks)) {
        if (["execution", "review", "qa"].includes(t.step)) {
          active++;
        }
      }
    }

    // ประกอบรายการ tasks
    const tasks: any[] = [];
    const rows = planIndex?.rows ?? [];

    for (const r of rows) {
      const taskId = r.id;
      const rt = run?.tasks[taskId];
      // Status มาจาก plan\index.md เท่านั้น (AC-034 / DES-022)
      const status = r.status ?? "pending";

      let step: string = "waiting-deps";
      if (rt) {
        step = rt.step;
      } else if (status === "verified") {
        step = "verified";
      } else {
        // เช็คว่า dependencies verified ครบไหม
        const allDepsVerified = r.depends.every((depId) => {
          const depRow = rows.find((x) => x.id === depId);
          return depRow?.status === "verified";
        });
        step = allDepsVerified ? "runnable" : "waiting-deps";
      }

      // คำนวณ waitingFor (Depends ที่ยังไม่ satisfied + เหตุคิว — DES-022)
      const waitingFor: string[] = [];
      for (const depId of r.depends) {
        const depRow = rows.find((x) => x.id === depId);
        if (!depRow || depRow.status !== "verified") {
          waitingFor.push(depId);
        }
      }

      if (rt) {
        if (rt.hold) {
          if (rt.hold.reason === "gate" && rt.hold.ref) {
            waitingFor.push(`gate:${rt.hold.ref}`);
          } else {
            waitingFor.push(`hold:${rt.hold.reason}`);
          }
        } else if (step === "runnable" && waitingFor.length === 0) {
          if (active >= maxParallelSessions) {
            waitingFor.push("ceiling");
          }
        }
      }

      tasks.push({
        taskId,
        name: r.name,
        owner: r.owner,
        planPhase: r.phase,
        depends: r.depends,
        status,
        step,
        attempt: rt?.attempt ?? 0,
        fixRounds: rt?.fixRounds ?? 0,
        fixRoundLimit,
        crashRestarts: rt?.crashRestarts ?? 0,
        sessionId: rt?.currentSessionId ?? null,
        hold: rt?.hold ? { reason: rt.hold.reason, ref: rt.hold.ref ?? null } : null,
        waitingFor,
      });
    }

    // ประกอบ phases
    const phases: any[] = [];
    const pRows = planIndex?.phases ?? [];
    for (const p of pRows) {
      const pLabel = p.label;
      const pRuntime = run?.phases[pLabel];
      phases.push({
        phase: pLabel,
        featureQa: pRuntime?.featureQa ?? "not-ready",
        cleared: pRuntime?.cleared ?? false,
      });
    }

    // ประกอบ waitingOnHuman (doc / gate / hold — DES-022)
    const waitingOnHuman: any[] = [];
    // 1. จาก doc (## Waiting on Human)
    if (planIndex?.waiting) {
      for (const w of planIndex.waiting) {
        waitingOnHuman.push({
          source: "doc",
          text: `${w.n}: ${w.decision} (${w.options}) — ${w.decider}`,
          taskIds: w.blocks,
        });
      }
    }
    // 2. จาก gate open ใน runtime
    if (run) {
      for (const g of openGateRecords(run)) {
        waitingOnHuman.push({
          source: "gate",
          text: g.question,
          gateId: g.gateId,
          taskIds: g.taskIds,
        });
      }
      // 3. จาก hold ใน runtime
      for (const [tId, t] of Object.entries(run.tasks)) {
        if (t.hold) {
          waitingOnHuman.push({
            source: "hold",
            text: `task ${tId} held: ${t.hold.reason}${t.hold.ref ? ` (${t.hold.ref})` : ""}`,
            taskIds: [tId],
          });
        }
      }
    }

    return json(200, {
      planFormat,
      needsMigration,
      active,
      maxParallelSessions,
      tasks,
      phases,
      waitingOnHuman,
    });
  }

  // ------------------------------------------------------------------
  // 2. POST /api/modules/<name>/tasks/<taskId>/retry (DES-022)
  // ------------------------------------------------------------------
  const retryMatch = /^\/api\/modules\/([a-z0-9][a-z0-9-]*)\/tasks\/([A-Za-z]+-\d+)\/retry$/.exec(pathname);
  if (method === "POST" && retryMatch) {
    const modName = retryMatch[1]!;
    const taskId = retryMatch[2]!;

    // 🔒 CSRF Guard: ตรวจ Origin header (DES-022)
    const origin = req.headers.origin;
    let isAllowedOrigin = false;
    try {
      if (origin) {
        const u = new URL(origin);
        isAllowedOrigin = u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === opts.host);
      }
    } catch {}
    if (!isAllowedOrigin) {
      return json(403, { error: "Origin not allowed (CSRF guard)" });
    }

    const body = await parseJsonBody(req);
    const { by, note } = body;
    if (!by || typeof by !== "string" || !by.trim()) {
      return json(400, { error: "Missing or empty 'by' in request body" });
    }

    const pointer = getPointer(opts.config.orchestratorHome, modName);
    if (!pointer) {
      return json(404, { error: `No active run found for module: ${modName}` });
    }

    let run: RunJson;
    try {
      run = loadRun(opts.config.orchestratorHome, pointer);
    } catch {
      return json(404, { error: `Run not found: ${pointer}` });
    }

    const task = run.tasks[taskId];
    if (!task) {
      return json(404, { error: `Task not found in run: ${taskId}` });
    }

    // ตรวจสอบสถานะ hold (DES-022)
    if (!task.hold) {
      return json(409, { error: `Task ${taskId} is not held` });
    }

    const reason = task.hold.reason;
    let canRetry = false;

    if (ALLOWED_RETRY_HOLDS.has(reason)) {
      canRetry = true;
    } else if (reason === "gate") {
      // gate 4 (qa-critical/qa-fail-3) หรือ gate อื่นที่ answered แล้ว
      const gateId = task.hold.ref as GateId;
      const g = latestGateRecord(run, gateId);
      if (g && g.status === "answered") {
        canRetry = true;
      }
    }

    if (!canRetry) {
      return json(409, {
        error: `Cannot retry task ${taskId} with hold reason '${reason}' (prohibited or gate still open)`,
      });
    }

    // ปลด hold (DES-022) — บันทึก humanActions โดยไม่ reset ตัวนับ
    const nowIso = new Date().toISOString();
    task.humanActions.push({
      action: "retry",
      by: by.trim(),
      note: note ? String(note).trim() : null,
      at: nowIso,
    });

    const prev = task.hold.prevStep;
    task.hold = null;
    task.step = (STEPS as readonly string[]).includes(prev) ? (prev as Step) : "waiting-deps";

    saveRun(opts.config.orchestratorHome, run);

    opts.events.emit("human-retry", {
      runId: run.runId,
      module: modName,
      taskId,
      by: by.trim(),
      at: nowIso,
      step: task.step,
    });

    return json(200, {
      taskId,
      step: task.step,
    });
  }

  // ------------------------------------------------------------------
  // 3. GET /api/sessions/<sessionId> (DES-022)
  // ------------------------------------------------------------------
  const sessionMatch = /^\/api\/sessions\/([a-zA-Z0-9_-]+)$/.exec(pathname);
  if (method === "GET" && sessionMatch) {
    const targetSessionId = sessionMatch[1]!;
    const found = findSessionById(opts.config, targetSessionId);
    if (!found) {
      return json(404, { error: `Session not found: ${targetSessionId}` });
    }

    const s = found.session;
    let logTail = "";
    const logPath = s.logsPath ? (path.isAbsolute(s.logsPath) ? s.logsPath : path.join(found.runDir, s.logsPath)) : path.join(found.runDir, "sessions", s.sessionId, "session.log");

    if (existsSync(logPath)) {
      try {
        const fullLog = readFileSync(logPath, "utf8");
        const logLines = fullLog.split(/\r?\n/);
        logTail = logLines.slice(-50).join("\n");
      } catch {}
    }

    return json(200, {
      sessionId: s.sessionId,
      kind: s.kind,
      role: s.role,
      taskIds: s.taskIds,
      camp: s.camp,
      model: s.model,
      effort: s.effort,
      basisReason: s.basisReason,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      outcome: s.outcome,
      contextFiles: s.contextFiles ?? [],
      writeAudit: s.writeAudit ?? null,
      priorSession: s.priorSession ?? null,
      logTail,
    });
  }

  return false;
}
