// BE-015 — Local API server + composition root (DES-009 · DES-010 · DES-015)
// node:http bind loopback 127.0.0.1:<port> เท่านั้น (ไม่มี CDN, ไม่มี auth นอกเครื่อง)
// ตรวจ Host header ป้องกัน DNS rebinding · serve ui/index.html
import http from "node:http";
import { EventEmitter } from "node:events";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  ConfigError, loadAppConfig, resolveRunRoots, type AppConfig,
} from "../core/config.ts";
import type { CampAdapter } from "../core/contract/camp-adapter.ts";
import { PipelineDriver } from "../core/driver.ts";
import { answerGate, latestGateRecord, openGateRecords } from "../core/gates.ts";
import { NEW_WORK_LIMIT, submitNewWork, type NewWorkHandle } from "../core/intake.ts";
import { assertModuleName, moduleDir } from "../core/knowledge-paths.ts";
import {
  getPointer, loadRun, saveRun, type GateId, type GateRecord, type RunJson,
} from "../core/state-store.ts";
import { AntigravityAdapter } from "../camps/antigravity.ts";
import { ClaudeAdapter } from "../camps/claude.ts";
import { CodexAdapter } from "../camps/codex.ts";
import { handleTasksApi } from "./tasks-api.ts";

export interface WebServerOptions {
  config?: AppConfig;
  adapters?: Readonly<Record<string, CampAdapter>>;
  port?: number;
  host?: string;
  uiRoot?: string;
  out?: (line: string) => void;
}

export interface WebServerInstance {
  server: http.Server;
  port: number;
  host: string;
  close: () => Promise<void>;
  events: EventEmitter;
  activeDrivers: Map<string, PipelineDriver>;
}

// ข้อความแจ้งเตือน gate ทาง terminal เสมอ (AC-014 — UI ล่มไม่กระทบ)
function printGateBanner(g: GateRecord, print: (line: string) => void): void {
  const scope = g.phase !== null ? `${g.scope} ${g.phase}` : g.taskIds.length > 0 ? `${g.scope} ${g.taskIds.join(",")}` : g.scope;
  print(`[GATE BANNER] gate ${g.gateId} (${scope}) รอคำตอบ: "${g.question}" — ผู้ตัดสิน: ${g.owner.name}`);
}

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
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export function createWebServer(opts: WebServerOptions = {}): WebServerInstance {
  const config = opts.config ?? loadAppConfig();
  const host = opts.host ?? config.registry.ui?.host ?? "127.0.0.1";
  const port = opts.port ?? config.registry.ui?.port ?? 7800;
  const print = opts.out ?? console.log;
  const projectRoot = path.resolve(config.orchestratorHome, "..");
  const uiRoot = opts.uiRoot ?? path.join(projectRoot, "code", "agent-team", "ui");

  const adapters: Record<string, CampAdapter> = opts.adapters !== undefined
    ? { ...opts.adapters }
    : {
        claude: new ClaudeAdapter(config.camps.camps.claude, { retryOnCrash: config.camps.defaults.retryOnCrash }),
        codex: new CodexAdapter(config.camps.camps.codex, { retryOnCrash: config.camps.defaults.retryOnCrash }),
        antigravity: new AntigravityAdapter(config.camps.camps.antigravity, { retryOnCrash: config.camps.defaults.retryOnCrash }),
      };

  const events = new EventEmitter();
  const activeDrivers = new Map<string, PipelineDriver>(); // module -> PipelineDriver

  const server = http.createServer(async (req, res) => {
    // 🔒 Security: Host header check — ป้องกัน DNS rebinding (DES-009)
    const reqHost = req.headers.host ?? "";
    const allowedHostPrefix = `${host}:`;
    const isAllowedHost = reqHost === host || reqHost.startsWith(allowedHostPrefix) || reqHost === "127.0.0.1" || reqHost.startsWith("127.0.0.1:");
    if (!isAllowedHost) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Host header not allowed (DNS rebinding guard)" }));
      return;
    }

    const urlObj = new URL(req.url ?? "/", `http://${reqHost}`);
    const pathname = urlObj.pathname;
    const method = req.method ?? "GET";

    const json = (status: number, data: any) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(data));
    };

    try {
      // ----------------------------------------------------------------
      // Static UI files
      // ----------------------------------------------------------------
      if (method === "GET" && (pathname === "/" || pathname === "/index.html")) {
        const indexPath = path.join(uiRoot, "index.html");
        if (existsSync(indexPath)) {
          const content = readFileSync(indexPath);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(content);
        } else {
          // Placeholder ก่อนสร้าง FE-001
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<!doctype html><html><head><meta charset=\"utf-8\"><title>agent-team UI</title></head><body><h1>agent-team Web UI</h1><p>Ready for FE-001</p></body></html>");
        }
        return;
      }

      if (method === "GET" && pathname.startsWith("/ui/")) {
        const rel = pathname.slice("/ui/".length);
        const file = path.join(uiRoot, rel);
        if (existsSync(file) && statSync(file).isFile()) {
          const ext = path.extname(file).toLowerCase();
          const mime = ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : ext === ".json" ? "application/json" : "text/plain";
          res.writeHead(200, { "Content-Type": `${mime}; charset=utf-8` });
          res.end(readFileSync(file));
          return;
        }
      }

      // ----------------------------------------------------------------
      // GET /api/config — อ่าน config + sta-config.json (DES-009, DES-015)
      // ----------------------------------------------------------------
      if (method === "GET" && pathname === "/api/config") {
        const kRoots = config.sta.knowledge_roots.map((k) => ({
          name: k.name,
          path: k.path,
          targets: k.targets.map((t) => {
            const hasGit = existsSync(path.join(t.path, ".git"));
            return {
              name: t.name,
              path: t.path,
              repo: hasGit,
              auditMode: hasGit ? "git" : "manifest",
            };
          }),
        }));
        return json(200, {
          registry: {
            ui: config.registry.ui,
            scheduler: config.registry.scheduler,
          },
          routing: config.routing,
          tiers: config.tiers,
          gates: config.gates,
          sta: {
            main_root: config.sta.main_root,
            knowledge_roots: kRoots,
          },
        });
      }

      // ----------------------------------------------------------------
      // GET /api/modules?knowledge=<name>&target=<name>
      // ----------------------------------------------------------------
      if (method === "GET" && pathname === "/api/modules") {
        const kName = urlObj.searchParams.get("knowledge");
        const tName = urlObj.searchParams.get("target");
        if (!kName || !tName) {
          return json(400, { error: "Missing knowledge or target query parameter" });
        }
        const kEntry = config.sta.knowledge_roots.find((k) => k.name === kName);
        if (!kEntry) return json(404, { error: `Knowledge root not found: ${kName}` });
        const tEntry = kEntry.targets.find((t) => t.name === tName);
        if (!tEntry) return json(404, { error: `Target not found: ${tName}` });

        const docsRoot = kEntry.path;
        if (!existsSync(docsRoot)) return json(200, { modules: [] });

        // รายชื่อไดเรกทอรี module
        const entries = readdirSync(docsRoot, { withFileTypes: true });
        const modules: any[] = [];
        for (const dirent of entries) {
          if (!dirent.isDirectory()) continue;
          const modName = dirent.name;
          if (modName.startsWith(".") || modName === "node_modules") continue;

          // ดึง pointer / state ล่าสุด
          const pointer = getPointer(config.orchestratorHome, modName);
          let runSummary: any = null;
          let openGates: GateRecord[] = [];
          if (pointer) {
            try {
              const run = loadRun(config.orchestratorHome, pointer);
              openGates = openGateRecords(run);
              runSummary = {
                runId: run.runId,
                status: run.status,
                openGatesCount: openGates.length,
                planFormat: run.planFormat,
              };
            } catch {}
          }
          modules.push({
            name: modName,
            pointer,
            run: runSummary,
            openGates,
          });
        }
        return json(200, { modules });
      }

      // ----------------------------------------------------------------
      // GET /api/modules/<name> — สถานะละเอียด
      // ----------------------------------------------------------------
      const modMatch = /^\/api\/modules\/([a-z0-9][a-z0-9-]*)$/.exec(pathname);
      if (method === "GET" && modMatch) {
        const modName = modMatch[1]!;
        const pointer = getPointer(config.orchestratorHome, modName);
        if (!pointer) {
          return json(200, {
            name: modName,
            pointer: null,
            run: null,
            openGates: [],
            tasks: {},
            phases: {},
          });
        }
        try {
          const run = loadRun(config.orchestratorHome, pointer);
          const openGates = openGateRecords(run);
          const latestSession = run.sessions.length > 0 ? run.sessions[run.sessions.length - 1] : null;
          return json(200, {
            name: modName,
            pointer,
            run: {
              runId: run.runId,
              status: run.status,
              mode: run.mode,
              planFormat: run.planFormat,
              createdAt: run.createdAt,
              updatedAt: run.updatedAt,
              gitPolicy: run.gitPolicy,
            },
            openGates,
            latestSession,
            tasks: run.tasks,
            phases: run.phases,
          });
        } catch (e) {
          return json(500, { error: `Failed to load run: ${(e as Error).message}` });
        }
      }

      // ----------------------------------------------------------------
      // POST /api/modules/<name>/start — เริ่ม / resume run
      // ----------------------------------------------------------------
      const startMatch = /^\/api\/modules\/([a-z0-9][a-z0-9-]*)\/start$/.exec(pathname);
      if (method === "POST" && startMatch) {
        const modName = startMatch[1]!;
        const body = await parseJsonBody(req);
        const { knowledge, target, dateFromUser } = body;
        if (!knowledge || !target) {
          return json(400, { error: "Missing knowledge or target in request body" });
        }
        const kEntry = config.sta.knowledge_roots.find((k) => k.name === knowledge);
        if (!kEntry) return json(404, { error: `Knowledge root not found: ${knowledge}` });
        const tEntry = kEntry.targets.find((t) => t.name === target);
        if (!tEntry) return json(404, { error: `Target not found: ${target}` });

        // ตรวจสอบ path target ต้องมีจริง (DES-015)
        if (!existsSync(tEntry.path)) {
          return json(400, { error: `Target path does not exist: ${tEntry.path}` });
        }

        const date = dateFromUser ?? new Date().toISOString().slice(0, 10);
        const selection = { knowledge, target };

        // ตรวจสอบสถานะ run ปัจจุบัน
        const pointer = getPointer(config.orchestratorHome, modName);
        if (pointer) {
          try {
            const existingRun = loadRun(config.orchestratorHome, pointer);
            const openGates = openGateRecords(existingRun);
            // run ไม่ได้วิ่งอยู่ + มี gate open → 409 พร้อม gateIds[] (OQ-5)
            if (existingRun.status !== "running" && openGates.length > 0) {
              return json(409, {
                error: "Run has open gates waiting for decision",
                gateIds: openGates.map((g) => g.gateId),
                gates: openGates,
              });
            }
            // run กำลังวิ่งอยู่ → 200 คืน runId เดิม (AC-072)
            if (existingRun.status === "running") {
              return json(200, {
                runId: existingRun.runId,
                status: existingRun.status,
                message: "Run is already running",
              });
            }
          } catch {}
        }

        // เริ่มต้น driver
        const driver = new PipelineDriver({
          config, selection, module: modName, dateFromUser: date, adapters,
        });
        activeDrivers.set(modName, driver);

        let runResult: RunJson;
        if (pointer) {
          runResult = driver.resume();
        } else {
          runResult = driver.start();
        }

        events.emit("run-start", { runId: runResult.runId, module: modName });

        // ปล่อยให้ settle ในพื้นหลัง
        driver.settle().then(() => {
          events.emit("run-settle", { runId: driver.run?.runId, status: driver.run?.status });
          if (driver.run?.status === "waiting-on-human") {
            for (const g of driver.openGates()) {
              printGateBanner(g, print);
            }
          }
        }).catch((err) => {
          print(`Driver error on module ${modName}: ${err.message}`);
        });

        return json(200, {
          runId: runResult.runId,
          status: runResult.status,
          module: modName,
        });
      }

      // ----------------------------------------------------------------
      // POST /api/tasks/new — งานใหม่ (DES-010)
      // ----------------------------------------------------------------
      if (method === "POST" && pathname === "/api/tasks/new") {
        const body = await parseJsonBody(req);
        const { text, knowledge, target, module: targetModule, dateFromUser } = body;
        if (!text || typeof text !== "string" || !text.trim()) {
          return json(400, { error: "Text is empty (AC-017 / DES-010)" });
        }
        if (text.length > NEW_WORK_LIMIT) {
          return json(400, { error: `Text exceeds limit of ${NEW_WORK_LIMIT} characters` });
        }

        const kName = knowledge ?? config.sta.knowledge_roots[0]?.name;
        const kEntry = config.sta.knowledge_roots.find((k) => k.name === kName);
        if (!kEntry) return json(404, { error: `Knowledge root not found: ${kName}` });
        const tName = target ?? kEntry.targets[0]?.name;
        const tEntry = kEntry.targets.find((t) => t.name === tName);
        if (!tEntry) return json(404, { error: `Target not found: ${tName}` });

        const date = dateFromUser ?? new Date().toISOString().slice(0, 10);
        const mod = targetModule ?? "new-module";

        const handle = submitNewWork({
          config,
          selection: { knowledge: kName, target: tName },
          module: mod,
          text,
          dateFromUser: date,
          adapters,
        });

        // settle ใน background
        handle.settle().then(() => {
          events.emit("new-work-settle", { runId: handle.runId, status: handle.run().status });
          for (const g of handle.openGates()) {
            printGateBanner(g, print);
          }
        }).catch((err) => {
          print(`New work settle error: ${err.message}`);
        });

        return json(200, {
          runId: handle.runId,
          status: handle.run().status,
          mode: handle.run().mode,
        });
      }

      // ----------------------------------------------------------------
      // GET /api/gates/<gateId>
      // ----------------------------------------------------------------
      const gateGetMatch = /^\/api\/gates\/([a-zA-Z0-9_-]+)$/.exec(pathname);
      if (method === "GET" && gateGetMatch) {
        const gateId = gateGetMatch[1] as GateId;
        // ค้นหาจาก runs ทั้งหมด
        let foundGate: GateRecord | null = null;
        for (const k of config.sta.knowledge_roots) {
          if (!existsSync(k.path)) continue;
          for (const dirent of readdirSync(k.path, { withFileTypes: true })) {
            if (!dirent.isDirectory()) continue;
            const ptr = getPointer(config.orchestratorHome, dirent.name);
            if (!ptr) continue;
            try {
              const run = loadRun(config.orchestratorHome, ptr);
              const g = latestGateRecord(run, gateId);
              if (g) {
                foundGate = g;
                break;
              }
            } catch {}
          }
          if (foundGate) break;
        }
        if (!foundGate) return json(404, { error: `Gate not found: ${gateId}` });
        return json(200, { gate: foundGate });
      }

      // ----------------------------------------------------------------
      // POST /api/gates/<gateId>/answer
      // ----------------------------------------------------------------
      const gateAnsMatch = /^\/api\/gates\/([a-zA-Z0-9_-]+)\/answer$/.exec(pathname);
      if (method === "POST" && gateAnsMatch) {
        const gateId = gateAnsMatch[1] as GateId;
        const body = await parseJsonBody(req);
        const { answer, answeredBy, note } = body;
        if (!answer || typeof answer !== "string" || !answeredBy || typeof answeredBy !== "string") {
          return json(400, { error: "Missing answer or answeredBy in request body" });
        }

        let targetRun: RunJson | null = null;
        for (const k of config.sta.knowledge_roots) {
          if (!existsSync(k.path)) continue;
          for (const dirent of readdirSync(k.path, { withFileTypes: true })) {
            if (!dirent.isDirectory()) continue;
            const ptr = getPointer(config.orchestratorHome, dirent.name);
            if (!ptr) continue;
            try {
              const run = loadRun(config.orchestratorHome, ptr);
              const openGates = openGateRecords(run);
              if (openGates.some((x) => x.gateId === gateId)) {
                targetRun = run;
                break;
              }
            } catch {}
          }
          if (targetRun) break;
        }

        if (!targetRun) {
          return json(404, { error: `Open gate not found: ${gateId}` });
        }

        const { run: updatedRun, record } = answerGate(targetRun, gateId, { answer, answeredBy, note: note ?? null });
        saveRun(config.orchestratorHome, updatedRun);

        print(`[GATE ANSWERED] gate ${gateId} ได้รับคำตอบจาก "${answeredBy}": "${answer}"`);
        events.emit("gate-answered", { gateId, answeredBy, answer });

        return json(200, { success: true, gate: record });
      }

      // ----------------------------------------------------------------
      // GET /api/runs/<runId>/events — SSE (DES-009)
      // ----------------------------------------------------------------
      const sseMatch = /^\/api\/runs\/([a-zA-Z0-9_-]+)\/events$/.exec(pathname);
      if (method === "GET" && sseMatch) {
        const targetRunId = sseMatch[1]!;
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });
        res.write(`data: ${JSON.stringify({ type: "connected", runId: targetRunId })}\n\n`);

        const listener = (eventData: any) => {
          res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        };

        events.on("run-start", listener);
        events.on("run-settle", listener);
        events.on("gate-answered", listener);

        req.on("close", () => {
          events.off("run-start", listener);
          events.off("run-settle", listener);
          events.off("gate-answered", listener);
        });
        return;
      }

      // ----------------------------------------------------------------
      // Tasks API (DES-022 / BE-023)
      // ----------------------------------------------------------------
      const tasksHandled = await handleTasksApi(req, res, {
        config,
        events,
        host,
        port,
      });
      if (tasksHandled) return;

      // Not found
      return json(404, { error: `Route not found: ${method} ${pathname}` });
    } catch (e) {
      return json(500, { error: `Internal server error: ${(e as Error).message}` });
    }
  });

  return {
    server,
    port,
    host,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }),
    events,
    activeDrivers,
  };
}

export function startWebServer(opts: WebServerOptions = {}): Promise<WebServerInstance> {
  const instance = createWebServer(opts);
  return new Promise((resolve, reject) => {
    instance.server.listen(instance.port, instance.host, () => {
      const print = opts.out ?? console.log;
      print(`agent-team API server listening on http://${instance.host}:${instance.port}`);
      resolve(instance);
    });
    instance.server.on("error", reject);
  });
}
