// BE-023 — Task dashboard API + human retry tests (DES-022 · DES-009)
import test, { after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type AppConfig, type CampProfile, type RegistryConfig,
  type RoutingConfig, type TiersConfig, type CampsConfig, type GatesConfig,
  KNOWN_GATES,
} from "../src/core/config.ts";
import type { CampAdapter, CampDispatch, CampOutcome, CampSessionHandle } from "../src/core/contract/camp-adapter.ts";
import type { HandoffV2 } from "../src/core/contract/types.ts";
import { openGate, answerGate } from "../src/core/gates.ts";
import {
  createRun, saveRun, setPointer, statePaths,
  type GateRecord, type RunJson, type SessionRecord, type TaskRuntime,
} from "../src/core/state-store.ts";
import { startWebServer, type WebServerInstance } from "../src/web/server.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be023-tasks-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

class FakeAdapter implements CampAdapter {
  readonly camp = "claude" as const;
  readonly profile: CampProfile = {
    command: "fake-cli", headlessArgs: ["-p"], modelFlag: "--model", schemaFlag: null,
    rolePromptFlag: "--append-system-prompt-file", briefChannel: "stdin",
  };
  dispatched: CampDispatch[] = [];
  dispatch(req: CampDispatch): CampSessionHandle {
    this.dispatched.push(req);
    const outcome: CampOutcome = {
      exitCode: 0,
      handoffRaw: JSON.stringify({
        role: req.packet.role, module: req.packet.module, sessionId: req.packet.sessionId, outputState: "DONE",
        result: "ok", changedDocs: [], changedCode: [], evidence: [], nextRole: "none",
        questionsForHuman: [], blocker: null, impactedTasks: null, decision: null,
        review: null, qa: null, featureQa: null, security: null, securityGate: null,
      } satisfies HandoffV2),
      cliSessionId: null, cliVersion: "1.0.0", logsPath: null, failure: null,
    };
    return { pid: 43000, outcome: Promise.resolve(outcome), kill: () => {} };
  }
}

function mkFixtureWorld() {
  const root = path.join(tmp, `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const home = path.join(root, "home");
  const docsRoot = path.join(root, "knowledge");
  const codeRoot = path.join(root, "target");
  const packRoot = path.join(root, "pack");
  const agents = path.join(packRoot, ".claude", "agents");
  const configDir = path.join(home, "config");
  const moduleDir = path.join(docsRoot, "alpha");

  mkdirSync(agents, { recursive: true });
  mkdirSync(configDir, { recursive: true });
  mkdirSync(codeRoot, { recursive: true });
  mkdirSync(path.join(moduleDir, "plan"), { recursive: true });

  for (const role of ["business-analyst", "system-analyst", "project-manager"]) {
    writeFileSync(path.join(agents, `${role}.md`), `---\nname: ${role}\ntools: Read, Write\n---\n\nRole ${role} body.\n`);
  }
  for (const f of ["routing.yaml", "tiers.yaml", "camps.yaml", "gates.yaml"]) {
    writeFileSync(path.join(configDir, f), `# fixture ${f}\n`);
  }

  // สร้าง plan/index.md v2
  const planIndexContent = `# alpha — Plan

## Phases

| Phase | Name | Tasks | หมายเหตุ |
|---|---|---|---|
| 1 | Skeleton | BE-001 | 🔒 |
| 2 | Implementation | BE-002, BE-003 | — |

## Waiting on Human

| # | ข้อตัดสินใจ | ทางเลือก | ผู้ตัดสิน | ขวางงาน |
|---|---|---|---|---|
| 1 | เลือกโมเดล | A, B | สมชาย | BE-002 |

## Tasks

| Task | Name | Owner | Phase | Depends | Status |
|---|---|---|---|---|---|
| BE-001 | Init setup | backend-engineer | 1 | — | verified |
| BE-002 | Logic engine | backend-engineer | 2 | BE-001 | pending |
| BE-003 | Integration | backend-engineer | 2 | BE-002 | pending |
`;
  writeFileSync(path.join(moduleDir, "plan", "index.md"), planIndexContent, "utf8");

  const registry: RegistryConfig = {
    project: "t", docsLayout: "split", packRoot, rolePromptRoot: agents, templatesRoot: path.join(packRoot, "templates"),
    orchestratorHome: home, ui: { host: "127.0.0.1", port: 0, openBrowser: false },
    scheduler: {
      maxParallelSessions: 2, fixRoundLimit: 2, crashRestartLimit: 1,
      reviewWave: { maxTasks: 4, maxDiffLines: 800 }, largeTask: { diffLines: 400, files: 10 },
    },
    audit: { manifestIgnore: ["node_modules/**", ".git/**"], preimageMaxMB: 20 },
  };

  const routes: RoutingConfig = {
    defaultCamp: "claude",
    role_routes: {
      "backend-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["codeRoots/**"], deny: [] } },
    },
  };
  const tiers: TiersConfig = {
    role_defaults: { "backend-engineer": "T5" },
    tiers: {
      T1: { reserved: true, camps: {} },
      T5: { reserved: false, camps: { claude: { model: "sonnet", effort: "medium" } } },
    },
  };
  const camps: CampsConfig = {
    defaults: { timeoutSec: 60, retryOnCrash: 0 },
    camps: {
      claude: { command: "fake-cli", headlessArgs: ["-p"], modelFlag: "--model", schemaFlag: null, rolePromptFlag: "--append-system-prompt-file", briefChannel: "stdin" },
    },
  };
  const gates: GatesConfig = {
    owner_default: { name: "owner-j" },
    gates: Object.fromEntries(KNOWN_GATES.map((g, i) => [g, {
      staGate: i + 1,
      trigger: "handoff" as const,
      owner: "owner_default",
    }])) as GatesConfig["gates"],
    channels: [],
  };

  const config: AppConfig = {
    orchestratorHome: home, configDir, staConfigPath: path.join(root, "sta-config.json"),
    registry,
    routing: routes,
    tiers,
    camps,
    gates,
    sta: {
      main_root: root,
      knowledge_roots: [{ name: "k", path: docsRoot, targets: [{ name: "t", path: codeRoot }] }],
    },
  };

  return { root, home, docsRoot, codeRoot, config, moduleDir };
}

function request(port: number, path: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string; json: () => any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path,
      method: options.method ?? "GET",
      headers: {
        host: `127.0.0.1:${port}`,
        ...(options.headers ?? {}),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: data,
          json: () => JSON.parse(data),
        });
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function mkTestRun(home: string, module = "alpha", config?: AppConfig): RunJson {
  return createRun(home, {
    module,
    mode: "resume",
    planFormat: "v2",
    scheduler: config?.registry.scheduler ?? {
      maxParallelSessions: 2, fixRoundLimit: 2, crashRestartLimit: 1,
      reviewWave: { maxTasks: 5, maxDiffLines: 400 }, largeTask: { diffLines: 300, files: 8 },
    },
    newWorkText: null,
    configSnapshot: { routing: "sha256:aaa", tiers: "sha256:bbb", camps: "sha256:ccc", gates: "sha256:ddd" },
    tasks: {
      "BE-001": {
        taskId: "BE-001", owner: "backend-engineer", planPhase: "1", group: null,
        step: "verified", hold: null, attempt: 1, fixRounds: 0, crashRestarts: 0,
        currentSessionId: null, sessionIds: ["s-1-aaaa"], touchedFiles: [],
        lastVerdict: null, defectPacket: null, humanActions: [],
      },
      "BE-002": {
        taskId: "BE-002", owner: "backend-engineer", planPhase: "2", group: null,
        step: "execution", hold: null, attempt: 1, fixRounds: 0, crashRestarts: 0,
        currentSessionId: "s-2-bbbb", sessionIds: ["s-2-bbbb"], touchedFiles: [],
        lastVerdict: null, defectPacket: null, humanActions: [],
      },
      "BE-003": {
        taskId: "BE-003", owner: "backend-engineer", planPhase: "2", group: null,
        step: "waiting-deps", hold: null, attempt: 0, fixRounds: 0, crashRestarts: 0,
        currentSessionId: null, sessionIds: [], touchedFiles: [],
        lastVerdict: null, defectPacket: null, humanActions: [],
      },
    },
    phases: {
      "1": { featureQa: "pass", featureQaSessionId: null, cleared: true, hold: null },
      "2": { featureQa: "not-ready", featureQaSessionId: null, cleared: false, hold: null },
    },
  });
}

test("BE-023: GET /api/modules/<name>/tasks — คืนครบ field DES-022 + Status จาก plan + waitingFor + waitingOnHuman", async () => {
  const w = mkFixtureWorld();
  const inst = await startWebServer({ config: w.config, port: 0 });
  const port = (inst.server.address() as any).port;
  try {
    // 1. ไม่มี run → อ่านจากเอกสารล้วน
    const resNoRun = await request(port, "/api/modules/alpha/tasks");
    assert.equal(resNoRun.status, 200);
    const bodyNoRun = resNoRun.json();
    assert.equal(bodyNoRun.planFormat, "v2");
    assert.equal(bodyNoRun.needsMigration, false);
    assert.equal(bodyNoRun.active, 0);
    assert.equal(bodyNoRun.maxParallelSessions, 2);
    assert.equal(bodyNoRun.tasks.length, 3);
    assert.equal(bodyNoRun.tasks[0].status, "verified");
    assert.equal(bodyNoRun.tasks[0].step, "verified");
    assert.equal(bodyNoRun.tasks[1].status, "pending");
    assert.equal(bodyNoRun.tasks[1].step, "runnable"); // BE-001 verified แล้ว
    assert.equal(bodyNoRun.tasks[2].step, "waiting-deps"); // BE-002 ยัง pending
    assert.deepEqual(bodyNoRun.tasks[2].waitingFor, ["BE-002"]);
    assert.equal(bodyNoRun.waitingOnHuman.length, 1);
    assert.equal(bodyNoRun.waitingOnHuman[0].source, "doc");

    // 2. มี run บนดิสก์
    const run = mkTestRun(w.home, "alpha", w.config);
    // เพิ่ม gate open และ task hold
    const { run: runWithGate } = openGate(run, {
      gateId: "business-choice",
      scope: "task",
      taskIds: ["BE-003"],
      phase: null,
      question: "คำถามเรื่อง business",
    }, w.config.gates);
    runWithGate.tasks["BE-003"]!.hold = { reason: "blocked", ref: "BL-001", prevStep: "waiting-deps" };
    runWithGate.tasks["BE-003"]!.step = "held";

    saveRun(w.home, runWithGate);
    setPointer(w.home, "alpha", runWithGate.runId);

    const resWithRun = await request(port, "/api/modules/alpha/tasks");
    assert.equal(resWithRun.status, 200);
    const bodyWithRun = resWithRun.json();
    assert.equal(bodyWithRun.active, 1); // BE-002 execution
    assert.equal(bodyWithRun.tasks[1].taskId, "BE-002");
    assert.equal(bodyWithRun.tasks[1].step, "execution");
    assert.equal(bodyWithRun.tasks[1].sessionId, "s-2-bbbb");
    assert.equal(bodyWithRun.tasks[2].taskId, "BE-003");
    assert.equal(bodyWithRun.tasks[2].step, "held");
    assert.equal(bodyWithRun.tasks[2].hold.reason, "blocked");
    assert.ok(bodyWithRun.tasks[2].waitingFor.includes("BE-002"));
    assert.ok(bodyWithRun.tasks[2].waitingFor.includes("hold:blocked"));

    // waitingOnHuman: doc (1) + gate (1) + hold (1) = 3 ตัว
    assert.equal(bodyWithRun.waitingOnHuman.length, 3);
    const sources = bodyWithRun.waitingOnHuman.map((x: any) => x.source);
    assert.ok(sources.includes("doc"));
    assert.ok(sources.includes("gate"));
    assert.ok(sources.includes("hold"));
  } finally {
    await inst.close();
  }
});

test("BE-023: POST /api/modules/<name>/tasks/<taskId>/retry — ปลด hold ตามสิทธิ์ + ตรวจ Origin CSRF + ไม่ reset ตัวนับ", async () => {
  const w = mkFixtureWorld();
  const inst = await startWebServer({ config: w.config, port: 0 });
  const port = (inst.server.address() as any).port;
  try {
    const run = mkTestRun(w.home, "alpha", w.config);
    run.tasks["BE-002"]!.hold = { reason: "crash-limit", ref: null, prevStep: "execution" };
    run.tasks["BE-002"]!.step = "held";
    run.tasks["BE-002"]!.attempt = 2;
    run.tasks["BE-002"]!.fixRounds = 1;

    run.tasks["BE-003"]!.hold = { reason: "design-change", ref: "DES-001", prevStep: "waiting-deps" };
    run.tasks["BE-003"]!.step = "held";

    saveRun(w.home, run);
    setPointer(w.home, "alpha", run.runId);

    // 1. Origin header ผิด (CSRF guard) → 403
    const resBadOrigin = await request(port, "/api/modules/alpha/tasks/BE-002/retry", {
      method: "POST",
      headers: {
        origin: "http://malicious-site.com",
        "content-type": "application/json",
      },
      body: JSON.stringify({ by: "Tester" }),
    });
    assert.equal(resBadOrigin.status, 403);

    // 2. 'by' ว่าง → 400
    const resEmptyBy = await request(port, "/api/modules/alpha/tasks/BE-002/retry", {
      method: "POST",
      headers: {
        origin: `http://127.0.0.1:${port}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ by: "   " }),
    });
    assert.equal(resEmptyBy.status, 400);

    // 3. Hold ที่ห้ามปลด (design-change) → 409
    const resProhibited = await request(port, "/api/modules/alpha/tasks/BE-003/retry", {
      method: "POST",
      headers: {
        origin: `http://127.0.0.1:${port}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ by: "Developer", note: "Try again" }),
    });
    assert.equal(resProhibited.status, 409);

    // 4. ปลดสำเร็จ (crash-limit) → 200 + humanActions บันทึก + ตัวนับไม่ reset
    const resSuccess = await request(port, "/api/modules/alpha/tasks/BE-002/retry", {
      method: "POST",
      headers: {
        origin: `http://127.0.0.1:${port}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ by: "Operator", note: "Retry after crash" }),
    });
    assert.equal(resSuccess.status, 200);
    assert.equal(resSuccess.json().taskId, "BE-002");
    assert.equal(resSuccess.json().step, "execution");

    // ตรวจสอบข้อมูลบนดิสก์จริง
    const updatedRun = createRun; // dummy
    const paths = statePaths(w.home);
    const diskRun: RunJson = JSON.parse(readFileSync(paths.runJsonPath(run.runId), "utf8"));
    const taskOnDisk = diskRun.tasks["BE-002"]!;
    assert.equal(taskOnDisk.hold, null);
    assert.equal(taskOnDisk.step, "execution");
    assert.equal(taskOnDisk.attempt, 2); // ไม่ reset (DES-018)
    assert.equal(taskOnDisk.fixRounds, 1); // ไม่ reset
    assert.equal(taskOnDisk.humanActions.length, 1);
    assert.equal(taskOnDisk.humanActions[0]!.action, "retry");
    assert.equal(taskOnDisk.humanActions[0]!.by, "Operator");
    assert.equal(taskOnDisk.humanActions[0]!.note, "Retry after crash");
  } finally {
    await inst.close();
  }
});

test("BE-023: GET /api/sessions/<sessionId> — คืน metadata ละเอียด + contextFiles + logTail", async () => {
  const w = mkFixtureWorld();
  const inst = await startWebServer({ config: w.config, port: 0 });
  const port = (inst.server.address() as any).port;
  try {
    const run = mkTestRun(w.home, "alpha", w.config);
    const sessionDir = path.join(w.home, "state", "runs", run.runId, "sessions", "s-1-test");
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(path.join(sessionDir, "session.log"), "line 1\nline 2\nline 3\nlog tail content\n", "utf8");

    const sessionRecord: SessionRecord = {
      sessionId: "s-1-test",
      seq: 1,
      kind: "execution",
      role: "backend-engineer",
      taskIds: ["BE-002"],
      planPhase: "2",
      attempt: 1,
      camp: "claude",
      model: "sonnet",
      effort: "medium",
      tier: "T5",
      modelBasis: "role-default",
      effortBasis: "role-default",
      basisReason: "T5 tier default",
      packetPath: "sessions/s-1-test/packet.json",
      rolePromptHash: "sha256:111",
      cliVersion: "1.0.0",
      pid: 1234,
      cliSessionId: "cli-123",
      claim: ["codeRoots/**"],
      contextFiles: ["knowledge/alpha/plan/be-002.md", "knowledge/alpha/design/des-022.md"],
      priorSession: null,
      startedAt: "2026-10-07T10:00:00.000Z",
      endedAt: "2026-10-07T10:05:00.000Z",
      exitCode: 0,
      outcome: "completed",
      handoff: null,
      logsPath: "sessions/s-1-test/session.log",
      writeAudit: { files: ["code/agent-team/src/main.ts"] },
    };

    run.sessions.push(sessionRecord);
    saveRun(w.home, run);
    setPointer(w.home, "alpha", run.runId);

    // 1. Session ไม่มีจริง → 404
    const resNotFound = await request(port, "/api/sessions/non-existent-session");
    assert.equal(resNotFound.status, 404);

    // 2. Session มีจริง → 200 ครบ field
    const resFound = await request(port, "/api/sessions/s-1-test");
    assert.equal(resFound.status, 200);
    const sBody = resFound.json();
    assert.equal(sBody.sessionId, "s-1-test");
    assert.equal(sBody.kind, "execution");
    assert.equal(sBody.role, "backend-engineer");
    assert.deepEqual(sBody.taskIds, ["BE-002"]);
    assert.equal(sBody.model, "sonnet");
    assert.equal(sBody.effort, "medium");
    assert.deepEqual(sBody.contextFiles, ["knowledge/alpha/plan/be-002.md", "knowledge/alpha/design/des-022.md"]);
    assert.deepEqual(sBody.writeAudit, { files: ["code/agent-team/src/main.ts"] });
    assert.ok(sBody.logTail.includes("log tail content"));
  } finally {
    await inst.close();
  }
});
