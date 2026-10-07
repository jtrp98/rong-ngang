// BE-015 — Local API server + composition root tests (DES-009 · DES-010 · DES-015)
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type AppConfig, type CampProfile, type RegistryConfig,
  type RoutingConfig, type TiersConfig, type CampsConfig, type GatesConfig,
  KNOWN_GATES,
} from "../src/core/config.ts";
import type { CampAdapter, CampDispatch, CampOutcome, CampSessionHandle } from "../src/core/contract/camp-adapter.ts";
import type { HandoffV2 } from "../src/core/contract/types.ts";
import { openGate } from "../src/core/gates.ts";
import { createRun, saveRun, setPointer, type GateRecord, type RunJson } from "../src/core/state-store.ts";
import { createWebServer, startWebServer, type WebServerInstance } from "../src/web/server.ts";
import { main } from "../src/main.ts";

const tmp = mkdtempSync(path.join(os.tmpdir(), "be015-web-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

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
    tasks: {},
    phases: {},
  });
}

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
    return { pid: 42000, outcome: Promise.resolve(outcome), kill: () => {} };
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
  mkdirSync(path.join(moduleDir, "requirement"), { recursive: true });

  for (const role of ["business-analyst", "system-analyst", "project-manager"]) {
    writeFileSync(path.join(agents, `${role}.md`), `---\nname: ${role}\ntools: Read, Write, Edit, Glob, Grep, Bash\n---\n\nRole ${role} body.\n`);
  }
  for (const f of ["routing.yaml", "tiers.yaml", "camps.yaml", "gates.yaml"]) {
    writeFileSync(path.join(configDir, f), `# fixture ${f}\n`);
  }

  const registry: RegistryConfig = {
    project: "t", docsLayout: "split", packRoot, rolePromptRoot: agents, templatesRoot: path.join(packRoot, "templates"),
    orchestratorHome: home, ui: { host: "127.0.0.1", port: 0, openBrowser: false },
    scheduler: {
      maxParallelSessions: 3, fixRoundLimit: 2, crashRestartLimit: 1,
      reviewWave: { maxTasks: 4, maxDiffLines: 800 }, largeTask: { diffLines: 400, files: 10 },
    },
    audit: { manifestIgnore: ["node_modules/**", ".git/**"], preimageMaxMB: 20 },
  };

  const routes: RoutingConfig = {
    defaultCamp: "claude",
    role_routes: {
      "business-analyst": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/requirement/**", "knowledge/<module>/index.md"], deny: [] } },
      "system-analyst": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/design/**"], deny: [] } },
      "project-manager": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/plan/**"], deny: [] } },
      "test-planner": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/test-plan/**"], deny: [] } },
      "backend-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["codeRoots/**"], deny: [] } },
      "frontend-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["codeRoots/**"], deny: [] } },
      "reviewer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/review/**"], deny: [] } },
      "qa-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/qa/**", "knowledge/<module>/plan/index.md"], deny: [] } },
      "security": { camp: "claude", model: null, effort: null, writePaths: { allow: ["knowledge/<module>/security.md"], deny: [] } },
    },
  };
  const tiers: TiersConfig = {
    role_defaults: {
      "business-analyst": "T3", "system-analyst": "T2", "project-manager": "T2", "test-planner": "T3",
      "backend-engineer": "T5", "frontend-engineer": "T5", "reviewer": "T3", "qa-engineer": "T3", "security": "T2",
    },
    tiers: {
      T1: { reserved: true, camps: {} },
      T2: { reserved: false, camps: { claude: { model: "opus", effort: "high" } } },
      T3: { reserved: false, camps: { claude: { model: "opus", effort: "medium" } } },
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
      trigger: g === "ux-signoff" || g === "deploy-real" || g === "release-cut" ? "structural" as const : "handoff" as const,
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

test("BE-015: Host header validation ป้องกัน DNS rebinding", async () => {
  const w = mkFixtureWorld();
  const inst = await startWebServer({ config: w.config, port: 0 });
  try {
    // 1. Host header ปลอม → 403 Forbidden
    const resForbidden = await request(inst.server.address() !== null ? (inst.server.address() as any).port : inst.port, "/api/config", {
      headers: { host: "attacker.com" },
    });
    assert.equal(resForbidden.status, 403);
    assert.ok(resForbidden.body.includes("DNS rebinding guard"));

    // 2. Host header ถูกต้อง → 200 OK
    const resOk = await request((inst.server.address() as any).port, "/api/config");
    assert.equal(resOk.status, 200);
  } finally {
    await inst.close();
  }
});

test("BE-015: GET / และ GET /api/config", async () => {
  const w = mkFixtureWorld();
  const inst = await startWebServer({ config: w.config, port: 0 });
  const port = (inst.server.address() as any).port;
  try {
    // 1. GET / → 200 OK HTML
    const resHome = await request(port, "/");
    assert.equal(resHome.status, 200);
    assert.ok(resHome.headers["content-type"]?.includes("text/html"));

    // 2. GET /api/config → 200 OK JSON ตรง sta-config (DES-015)
    const resConfig = await request(port, "/api/config");
    assert.equal(resConfig.status, 200);
    const data = resConfig.json();
    assert.equal(data.sta.knowledge_roots[0].name, "k");
    assert.equal(data.sta.knowledge_roots[0].targets[0].name, "t");
    assert.equal(data.sta.knowledge_roots[0].targets[0].auditMode, "manifest");
  } finally {
    await inst.close();
  }
});

test("BE-015: GET /api/modules และ GET /api/modules/<name>", async () => {
  const w = mkFixtureWorld();
  const inst = await startWebServer({ config: w.config, port: 0 });
  const port = (inst.server.address() as any).port;
  try {
    // 1. GET /api/modules ขาด query → 400
    const resBad = await request(port, "/api/modules");
    assert.equal(resBad.status, 400);

    // 2. GET /api/modules?knowledge=k&target=t → คืน module alpha
    const resList = await request(port, "/api/modules?knowledge=k&target=t");
    assert.equal(resList.status, 200);
    const listData = resList.json();
    assert.ok(listData.modules.some((m: any) => m.name === "alpha"));

    // 3. GET /api/modules/alpha → คืนสถานะโมดูล
    const resMod = await request(port, "/api/modules/alpha");
    assert.equal(resMod.status, 200);
    assert.equal(resMod.json().name, "alpha");
  } finally {
    await inst.close();
  }
});

test("BE-015: POST /api/modules/<name>/start — กติกา OQ-5 (409 gate) และ AC-072 (200 running)", async () => {
  const w = mkFixtureWorld();
  const logs: string[] = [];
  const fakeAdapter = new FakeAdapter();
  const inst = await startWebServer({
    config: w.config,
    adapters: { claude: fakeAdapter, codex: fakeAdapter, antigravity: fakeAdapter },
    port: 0,
    out: (l) => logs.push(l),
  });
  const port = (inst.server.address() as any).port;
  try {
    // 1. Target path ไม่มีจริง → 400
    const resNoTarget = await request(port, "/api/modules/alpha/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledge: "k", target: "bad-target" }),
    });
    assert.equal(resNoTarget.status, 404);

    // 2. สร้าง run จำลองที่มี gate open และไม่ได้ running → OQ-5: ต้อง 409 พร้อม gateIds[]
    const run = mkTestRun(w.home, "alpha", w.config);
    const { run: runWithGate } = openGate(run, {
      gateId: "business-choice",
      scope: "module",
      taskIds: [],
      phase: null,
      question: "คำถามทดสอบ",
    }, w.config.gates);
    runWithGate.status = "waiting-on-human";
    saveRun(w.home, runWithGate);
    setPointer(w.home, "alpha", runWithGate.runId);

    const resGateConflict = await request(port, "/api/modules/alpha/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledge: "k", target: "t" }),
    });
    assert.equal(resGateConflict.status, 409);
    assert.deepEqual(resGateConflict.json().gateIds, ["business-choice"]);

    // 3. run กำลัง running อยู่ → AC-072: ต้อง 200 คืน runId เดิม
    runWithGate.status = "running";
    saveRun(w.home, runWithGate);
    setPointer(w.home, "alpha", runWithGate.runId);
    const resRunning = await request(port, "/api/modules/alpha/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledge: "k", target: "t" }),
    });
    assert.equal(resRunning.status, 200);
    assert.equal(resRunning.json().runId, runWithGate.runId);
  } finally {
    await inst.close();
  }
});

test("BE-015: POST /api/tasks/new — ข้อความ untrusted ว่าง/เกินลิมิต ปฏิเสธ 400 (AC-017 / DES-009)", async () => {
  const w = mkFixtureWorld();
  const fakeAdapter = new FakeAdapter();
  const inst = await startWebServer({
    config: w.config,
    adapters: { claude: fakeAdapter, codex: fakeAdapter, antigravity: fakeAdapter },
    port: 0,
  });
  const port = (inst.server.address() as any).port;
  try {
    // 1. ว่าง → 400
    const resEmpty = await request(port, "/api/tasks/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    });
    assert.equal(resEmpty.status, 400);

    // 2. เกิน 20,000 ตัวอักษร → 400
    const resTooLong = await request(port, "/api/tasks/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(20_001) }),
    });
    assert.equal(resTooLong.status, 400);

    // 3. ถูกต้อง → 200
    const resOk = await request(port, "/api/tasks/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "งานใหม่จากผู้ใช้", knowledge: "k", target: "t" }),
    });
    assert.equal(resOk.status, 200);
    assert.ok(resOk.json().runId);
  } finally {
    await inst.close();
  }
});

test("BE-015: ตอบ gate ผ่าน POST /api/gates/<gateId>/answer + แจ้ง terminal banner (AC-014 / AC-016)", async () => {
  const w = mkFixtureWorld();
  const terminalLogs: string[] = [];
  const inst = await startWebServer({
    config: w.config,
    port: 0,
    out: (l) => terminalLogs.push(l),
  });
  const port = (inst.server.address() as any).port;
  try {
    const run = mkTestRun(w.home, "alpha", w.config);
    const { run: runWithGate } = openGate(run, {
      gateId: "business-choice",
      scope: "module",
      taskIds: [],
      phase: null,
      question: "เลือกแนวทางใด",
    }, w.config.gates);
    saveRun(w.home, runWithGate);
    setPointer(w.home, "alpha", runWithGate.runId);

    // 1. GET /api/gates/business-choice
    const resGet = await request(port, "/api/gates/business-choice");
    assert.equal(resGet.status, 200);
    assert.equal(resGet.json().gate.question, "เลือกแนวทางใด");

    // 2. POST answer gate
    const resAns = await request(port, "/api/gates/business-choice/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer: "เลือกแนวทาง A", answeredBy: "user-test" }),
    });
    assert.equal(resAns.status, 200);
    assert.equal(resAns.json().gate.status, "answered");
    assert.equal(resAns.json().gate.answeredBy, "user-test");

    // 3. ตรวจ terminal banner (AC-014)
    assert.ok(terminalLogs.some((l) => l.includes("[GATE ANSWERED]") && l.includes("user-test")));
  } finally {
    await inst.close();
  }
});

test("BE-015: main({ argv: ['--serve'] }) เริ่มต้น web server ได้ที่ composition root", async () => {
  const w = mkFixtureWorld();
  const outLogs: string[] = [];
  // ปรับ port ให้เป็น 0 ชั่วคราวเพื่อ test ไม่แย่ง port
  const testCfg = {
    ...w.config,
    registry: {
      ...w.config.registry,
      ui: { host: "127.0.0.1", port: 0, openBrowser: false },
    },
  };
  const r = await main({
    argv: ["--serve"],
    config: testCfg,
    out: (l) => outLogs.push(l),
  });
  assert.equal(r.code, 0);
  assert.ok(r.server);
  try {
    const sPort = (r.server.server.address() as any).port;
    const res = await request(sPort, "/api/config");
    assert.equal(res.status, 200);
  } finally {
    await r.server.close();
  }
});

test("Feature QA — Phase 5: Web UI + intake + tasks dashboard + human retry flow", async () => {
  const w = mkFixtureWorld();
  const fakeAdapter = new FakeAdapter();
  const inst = await startWebServer({
    config: w.config,
    adapters: { claude: fakeAdapter, codex: fakeAdapter, antigravity: fakeAdapter },
    port: 0,
    uiRoot: path.resolve("ui"),
  });
  const port = (inst.server.address() as any).port;
  try {
    // 1. เปิด browser → GET / ได้ index.html พร้อม script ป้องกัน XSS
    const resHome = await request(port, "/");
    assert.equal(resHome.status, 200);
    assert.ok(resHome.body.includes("agent-team Web Dashboard"));
    assert.ok(resHome.body.includes("safeText"));
    assert.ok(!resHome.body.includes("http://")); // Zero external CDN

    // 2. งานใหม่ถึง BA (Intake) → POST /api/tasks/new
    // 2.1 เกิน limit 20,000 หรือ ว่าง ปฏิเสธ 400
    const resEmpty = await request(port, "/api/tasks/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "  ", knowledge: "k", target: "t" }),
    });
    assert.equal(resEmpty.status, 400);

    // 2.2 ข้อความปกติ → รับงานสำเร็จ ส่งถึง BA
    const resNew = await request(port, "/api/tasks/new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "สร้างฟีเจอร์รายงานสรุปยอดขาย", knowledge: "k", target: "t" }),
    });
    assert.equal(resNew.status, 200);
    assert.equal(resNew.json().status, "running");

    // 3. เลือกงานเดิม → เริ่ม / Resume
    const planIndexContent = `# alpha — Plan

## Phases

| Phase | Name | Tasks | หมายเหตุ |
|---|---|---|---|
| 1 | Skeleton | BE-001 | 🔒 |
| 2 | Implementation | BE-002 | — |

## Waiting on Human

| # | ข้อตัดสินใจ | ทางเลือก | ผู้ตัดสิน | ขวางงาน |
|---|---|---|---|---|
| 1 | เลือกโมเดล | A, B | สมชาย | BE-002 |

## Tasks

| Task | Name | Owner | Phase | Depends | Status |
|---|---|---|---|---|---|
| BE-001 | Init setup | backend-engineer | 1 | — | verified |
| BE-002 | Logic engine | backend-engineer | 2 | BE-001 | pending |
`;
    writeFileSync(path.join(w.moduleDir, "plan", "index.md"), planIndexContent, "utf8");

    const run = mkTestRun(w.home, "alpha", w.config);
    // เพิ่ม gate open
    const { run: runWithGate, record } = openGate(run, {
      gateId: "business-choice",
      scope: "task",
      taskIds: ["BE-002"],
      phase: null,
      question: "กรุณาเลือกโมเดลการประมวลผล",
    }, w.config.gates);
    runWithGate.tasks["BE-002"] = {
      taskId: "BE-002", owner: "backend-engineer", planPhase: "2", group: null,
      step: "held", hold: { reason: "crash-limit", ref: null, prevStep: "execution" },
      attempt: 2, fixRounds: 1, crashRestarts: 1, currentSessionId: null, sessionIds: [],
      touchedFiles: [], lastVerdict: null, defectPacket: null, humanActions: [],
    };
    saveRun(w.home, runWithGate);
    setPointer(w.home, "alpha", runWithGate.runId);

    // 3.1 เริ่ม run ที่มี open gate → ติด OQ-5 (409 Conflict)
    const resConflict = await request(port, "/api/modules/alpha/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ knowledge: "k", target: "t" }),
    });
    assert.equal(resConflict.status, 409);
    assert.ok(resConflict.json().gateIds.includes(record.gateId));

    // 4. ดูงานต่อ task (GET /api/modules/alpha/tasks)
    const resTasks = await request(port, "/api/modules/alpha/tasks");
    assert.equal(resTasks.status, 200);
    const tasksData = resTasks.json();
    assert.equal(tasksData.planFormat, "v2");
    assert.equal(tasksData.active, 0);
    assert.equal(tasksData.maxParallelSessions, 3);
    assert.ok(tasksData.waitingOnHuman.length >= 2); // gate + hold + doc
    const be002 = tasksData.tasks.find((t: any) => t.taskId === "BE-002");
    assert.equal(be002.status, "pending"); // Status มาจาก docs จริง
    assert.equal(be002.step, "held");

    // 5. ตอบ gate (POST /api/gates/<gateId>/answer)
    const resAnswer = await request(port, `/api/gates/${record.gateId}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answeredBy: "Operator-Somchai", answer: "เลือก โมเดล B" }),
    });
    assert.equal(resAnswer.status, 200);

    // 6. ปลด hold / Retry (POST /api/modules/alpha/tasks/BE-002/retry)
    const resRetry = await request(port, "/api/modules/alpha/tasks/BE-002/retry", {
      method: "POST",
      headers: {
        origin: `http://127.0.0.1:${port}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ by: "Operator-Somchai", note: "เริ่มรอบใหม่หลังแก้ปัญหา" }),
    });
    assert.equal(resRetry.status, 200);
    assert.equal(resRetry.json().step, "execution");

    // 7. ตรวจสอบ tasks หลังตอบ gate และ retry
    const resTasksAfter = await request(port, "/api/modules/alpha/tasks");
    assert.equal(resTasksAfter.status, 200);
    const be002After = resTasksAfter.json().tasks.find((t: any) => t.taskId === "BE-002");
    assert.equal(be002After.hold, null);
    assert.equal(be002After.step, "execution");
  } finally {
    await inst.close();
  }
});

