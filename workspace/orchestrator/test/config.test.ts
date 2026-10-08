// BE-001 — node:test: config store + validator (DES-004/005/007/008/014/015, data-model.md)
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import {
  ConfigError,
  KNOWN_CAMPS,
  KNOWN_GATES,
  KNOWN_ROLES,
  configSnapshot,
  defaultOrchestratorHome,
  loadAppConfig,
  loadStaConfig,
  resolveRunRoots,
} from "../src/core/config.ts";
import { assertModuleDocs, indexBudgetBytes, validateModuleDocs } from "../src/core/docs-validator.ts";

const realHome = defaultOrchestratorHome();
const realSta = path.resolve(realHome, "..", "sta-config.json");
const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "be001-"));
after(() => rmSync(tmpRoot, { recursive: true, force: true }));

let n = 0;
// สำเนา config\ + sta-config ลง temp เพื่อแก้ไฟล์ได้โดยไม่แตะของจริง
function sandbox(): { home: string; sta: string; cfg: (f: string) => string } {
  const home = path.join(tmpRoot, `h${++n}`);
  mkdirSync(home, { recursive: true });
  cpSync(path.join(realHome, "config"), path.join(home, "config"), { recursive: true });
  const sta = path.join(home, "sta-config.json");
  const real = JSON.parse(readFileSync(realSta, "utf8"));
  real.main_root = tmpRoot;
  real.knowledge_roots = [{ name: "k", path: tmpRoot, targets: [{ name: "t", path: tmpRoot }] }];
  writeFileSync(sta, JSON.stringify(real));
  return { home, sta, cfg: (f) => path.join(home, "config", f) };
}

test("โหลด + validate ครบ 5 yaml + sta-config.json ของจริง", () => {
  const c = loadAppConfig();
  assert.equal(c.sta.knowledge_roots.length > 0, true);
  assert.deepEqual(Object.keys(c.camps.camps).sort(), [...KNOWN_CAMPS].sort());
  assert.deepEqual(Object.keys(c.gates.gates), [...KNOWN_GATES]);
  assert.deepEqual(Object.keys(c.routing.role_routes).sort(), [...KNOWN_ROLES].sort());
  assert.equal(loadStaConfig().main_root, c.sta.main_root);
});

test("ค่าตั้งต้นตรง data-model.md ทุก field", () => {
  const c = loadAppConfig();
  assert.equal(c.registry.project, "rong-ngang");
  assert.equal(c.registry.docsLayout, "split");
  assert.equal(c.registry.packRoot, "C:\\src\\AICode\\rong-ngang\\workspace");
  assert.equal(c.registry.orchestratorHome, "C:\\src\\AICode\\rong-ngang\\workspace\\orchestrator");
  assert.equal(c.registry.rolePromptRoot, path.join(c.registry.packRoot, ".claude", "agents"));
  assert.equal(c.registry.templatesRoot, path.join(c.registry.packRoot, "templates"));
  assert.deepEqual(c.registry.ui, { host: "127.0.0.1", port: 7800, openBrowser: true });
  assert.deepEqual(c.registry.scheduler, {
    maxParallelSessions: 3,
    fixRoundLimit: 2,
    crashRestartLimit: 1,
    reviewWave: { maxTasks: 4, maxDiffLines: 800 },
    largeTask: { diffLines: 400, files: 10 },
  });
  assert.deepEqual(c.registry.audit, { manifestIgnore: ["node_modules/**", ".git/**"], preimageMaxMB: 50 });
  assert.equal("concurrency" in c.registry, false);

  assert.equal(c.routing.defaultCamp, "claude");
  for (const role of KNOWN_ROLES) {
    const r = c.routing.role_routes[role]!;
    assert.equal(r.camp, "claude");
    assert.equal(r.model, null);
    assert.equal(r.effort, null);
    assert.deepEqual(r.writePaths.deny, []);
  }
  const allow = (r: string): string[] => c.routing.role_routes[r]!.writePaths.allow;
  assert.deepEqual(allow("business-analyst"), ["knowledge/<module>/requirement/**", "knowledge/<module>/open-questions/**", "knowledge/<module>/index.md"]);
  assert.deepEqual(allow("system-analyst"), ["knowledge/<module>/design/**"]);
  assert.deepEqual(allow("backend-engineer"), ["codeRoots/**"]);

  assert.deepEqual(c.tiers.role_defaults, {
    "business-analyst": "T3", "system-analyst": "T2", "project-manager": "T2", "test-planner": "T3",
    reviewer: "T3", "qa-engineer": "T3", security: "T2", setup: "T6", "uxui-designer": "T5",
    "backend-engineer": "T5", "frontend-engineer": "T5", devops: "T5",
  });
  assert.deepEqual(c.tiers.tiers["T1"], { reserved: true, camps: {} });
  const b = (t: string, camp: string): unknown => (c.tiers.tiers[t]!.camps as Record<string, unknown>)[camp];
  assert.deepEqual(b("T2", "claude"), { model: "opus", effort: "high" });
  assert.deepEqual(b("T2", "codex"), { model: "gpt-6.1-sol", effort: "xhigh" });
  assert.deepEqual(b("T2", "antigravity"), { model: "gemini-3.8-flash-high", effort: null });
  assert.deepEqual(b("T3", "claude"), { model: "opus", effort: "medium" });
  assert.deepEqual(b("T3", "codex"), { model: "gpt-6.1-sol", effort: "high" });
  assert.deepEqual(b("T3", "antigravity"), { model: "gemini-3.8-flash-medium", effort: null });
  assert.deepEqual(b("T4", "claude"), { model: "sonnet", effort: "high" });
  assert.deepEqual(b("T4", "codex"), { model: "gpt-6.1-sol", effort: "high" });
  assert.deepEqual(b("T4", "antigravity"), { model: "gemini-3.7-flash-high", effort: null });
  assert.deepEqual(b("T5", "claude"), { model: "sonnet", effort: "medium" });
  assert.deepEqual(b("T5", "codex"), { model: "gpt-6.1-sol", effort: "medium" });
  assert.deepEqual(b("T5", "antigravity"), { model: "gemini-3.7-flash-medium", effort: null });
  assert.deepEqual(b("T6", "claude"), { model: "haiku", effort: null });
  assert.deepEqual(b("T6", "codex"), { model: "gpt-6.1-sol", effort: "low" });
  assert.deepEqual(b("T6", "antigravity"), { model: "gemini-3.6-flash-low", effort: null });

  assert.deepEqual(c.camps.defaults, { timeoutSec: 1800, retryOnCrash: 1 });
  const cl = c.camps.camps.claude;
  assert.equal(cl.command, "claude");
  assert.deepEqual(cl.headlessArgs, ["-p", "--output-format", "json", "--permission-prompts", "none", "--permission-mode", "dontAsk"]);
  assert.equal(cl.modelFlag, "--model");
  assert.equal(cl.effortFlag, "--effort");
  assert.equal(cl.schemaFlag, "--json-schema");
  assert.equal(cl.rolePromptFlag, "--append-system-prompt-file");
  assert.equal(cl.briefChannel, "stdin");
  assert.deepEqual(cl.toolRuleFlags, ["--allowedTools", "--disallowedTools"]);
  assert.equal(cl.extraDirsFlag, "--add-dir");
  const cx = c.camps.camps.codex;
  assert.equal(cx.command, "codex");
  assert.equal(cx.subcommand, "exec");
  assert.deepEqual(cx.headlessArgs, ["--json", "--skip-git-repo-check", "--sandbox", "workspace-write", "--output-last-message", "<lastMessagePath>"]);
  assert.equal(cx.modelFlag, "-m");
  assert.deepEqual(cx.effortVia, ["-c", "model_reasoning_effort=<effort>"]);
  assert.equal(cx.schemaFlag, "--output-schema");
  assert.equal(cx.rolePromptFlag, null);
  assert.equal(cx.briefChannel, "packet-file");
  assert.equal(cx.cwdFlag, "-C");
  const ag = c.camps.camps.antigravity;
  assert.equal(ag.command, "agy");
  assert.deepEqual(ag.headlessArgs, ["-p", "--output-format", "json", "--sandbox"]);
  assert.equal(ag.modelFlag, "--model");
  assert.equal(ag.effortFlag, "--effort");
  assert.equal(ag.schemaFlag, "--json-schema");
  assert.equal(ag.rolePromptFlag, null);
  assert.equal(ag.briefChannel, "packet-file");
  assert.equal(ag.extraDirsFlag, "--add-dir");
  assert.equal(ag.logFlag, "--log-file");

  assert.deepEqual(c.gates.owner_default, { name: "jtrp98" });
  assert.deepEqual(c.gates.channels, []);
  const expectGates: Record<string, [number, string]> = {
    "business-choice": [1, "handoff"], "schema-breaking": [2, "handoff"], "ux-signoff": [3, "structural"],
    "qa-critical": [4, "handoff"], "security-finding": [5, "handoff"], "deploy-real": [6, "structural"], "release-cut": [7, "structural"],
  };
  for (const [id, [staGate, trigger]] of Object.entries(expectGates)) {
    assert.deepEqual(c.gates.gates[id], { staGate, trigger, owner: "owner_default" });
  }
});

test("sta-config.json ตรง DES-015 (schema main_root + knowledge_roots[name,path,targets[name,path]])", () => {
  const sta = JSON.parse(readFileSync(realSta, "utf8"));
  assert.deepEqual(Object.keys(sta).sort(), ["knowledge_roots", "main_root"]);
  for (const k of sta.knowledge_roots) {
    assert.deepEqual(Object.keys(k).sort(), ["name", "path", "targets"]);
    for (const t of k.targets) assert.deepEqual(Object.keys(t).sort(), ["name", "path"]);
  }
});

test("AC-010: แก้ tiers.yaml แล้ว store อ่านค่าใหม่ใน run ถัดไป + snapshot hash เปลี่ยน", () => {
  const s = sandbox();
  const before = loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta });
  const snap1 = configSnapshot(path.join(s.home, "config"));
  assert.equal(before.tiers.tiers["T2"]!.camps.claude!.model, "opus");
  const text = readFileSync(s.cfg("tiers.yaml"), "utf8");
  writeFileSync(s.cfg("tiers.yaml"), text.replace("claude:       { model: opus,             effort: high }", "claude:       { model: sonnet,           effort: low }"));
  const after2 = loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta });
  assert.deepEqual(after2.tiers.tiers["T2"]!.camps.claude, { model: "sonnet", effort: "low" });
  assert.notEqual(configSnapshot(path.join(s.home, "config")).tiers, snap1.tiers);
  assert.equal(configSnapshot(path.join(s.home, "config")).routing, snap1.routing);
  // run ที่ถือ config ไปแล้ว (freeze) ไม่ถูกแตะ
  assert.equal(before.tiers.tiers["T2"]!.camps.claude!.model, "opus");
});

test("ไฟล์เสีย → ConfigError ระบุ path (fail-closed): parse ผิด, ไฟล์หาย, ค่าผิดช่วง, camp ไม่รู้จัก", () => {
  const cases: Array<[string, (s: ReturnType<typeof sandbox>) => void, RegExp]> = [
    ["tiers.yaml", (s) => writeFileSync(s.cfg("tiers.yaml"), "role_defaults: [unclosed\n  x: : :"), /parse YAML/],
    ["camps.yaml", (s) => rmSync(s.cfg("camps.yaml")), /ไม่พบไฟล์/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace("port: 7800", "port: 80")), /ui\.port/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace("host: 127.0.0.1", "host: 0.0.0.0")), /loopback/],
    ["routing.yaml", (s) => writeFileSync(s.cfg("routing.yaml"), readFileSync(s.cfg("routing.yaml"), "utf8").replace("defaultCamp: claude", "defaultCamp: gemini")), /defaultCamp/],
    ["gates.yaml", (s) => writeFileSync(s.cfg("gates.yaml"), readFileSync(s.cfg("gates.yaml"), "utf8").replace("staGate: 7", "staGate: 9")), /staGate/],
    ["tiers.yaml", (s) => writeFileSync(s.cfg("tiers.yaml"), readFileSync(s.cfg("tiers.yaml"), "utf8").replace("business-analyst: T3", "business-analyst: T1")), /T1/],
    ["camps.yaml", (s) => writeFileSync(s.cfg("camps.yaml"), readFileSync(s.cfg("camps.yaml"), "utf8").replace('"dontAsk"]', '"dontAsk", "--dangerously-skip-permissions"]')), /dangerously/],
    ["camps.yaml", (s) => writeFileSync(s.cfg("camps.yaml"), readFileSync(s.cfg("camps.yaml"), "utf8").replace('"dontAsk"]', '"dontAsk", "--continue"]')), /--continue/],
    ["camps.yaml", (s) => writeFileSync(s.cfg("camps.yaml"), readFileSync(s.cfg("camps.yaml"), "utf8").replace('"dontAsk"]', '"dontAsk", "--resume"]')), /--resume/],
    ["camps.yaml", (s) => writeFileSync(s.cfg("camps.yaml"), readFileSync(s.cfg("camps.yaml"), "utf8").replace('"dontAsk"]', '"dontAsk", "resume"]')), /resume/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8") + "concurrency:\n  maxConcurrentRuns: 1\n"), /concurrency/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace(/^scheduler:[\s\S]*?(?=^audit:)/m, "")), /scheduler/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace(/^audit:[\s\S]*$/m, "")), /audit/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace("maxParallelSessions: 3", "maxParallelSessions: 0")), /maxParallelSessions/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace("maxTasks: 4", "maxTasks: 0")), /maxTasks/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace("preimageMaxMB: 50", "preimageMaxMB: -1")), /preimageMaxMB/],
    ["registry.yaml", (s) => writeFileSync(s.cfg("registry.yaml"), readFileSync(s.cfg("registry.yaml"), "utf8").replace("crashRestartLimit: 1", "crashRestartLimit: 1.5")), /crashRestartLimit/],
  ];
  for (const [file, mutate, re] of cases) {
    const s = sandbox();
    mutate(s);
    assert.throws(
      () => loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }),
      (e: unknown) => e instanceof ConfigError && e.file === s.cfg(file) && e.message.includes(s.cfg(file)) && re.test(e.message),
      `${file}: ${re}`,
    );
  }
});

test("camp ไม่รู้จักใน routing / tiers → ปฏิเสธพร้อม path (ข้ามไฟล์ camps.yaml)", () => {
  const s = sandbox();
  const camps = readFileSync(s.cfg("camps.yaml"), "utf8");
  // ตัด antigravity ออกจาก camps.yaml ไม่ได้โดย schema (ต้องครบ 3) → ตรวจว่า schema เองก็ปฏิเสธ
  writeFileSync(s.cfg("camps.yaml"), camps.replace("  antigravity:", "  gemini:"));
  assert.throws(() => loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }), (e: unknown) => e instanceof ConfigError && e.file === s.cfg("camps.yaml"));
});

test("sta-config.json: JSON เสีย / ไฟล์หาย / path ไม่มีจริง → ปฏิเสธก่อน dispatch ระบุ path", () => {
  const s = sandbox();
  writeFileSync(s.sta, "{ not json");
  assert.throws(() => loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }), (e: unknown) => e instanceof ConfigError && e.file === s.sta && /parse JSON/.test(e.message));

  rmSync(s.sta);
  assert.throws(() => loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }), (e: unknown) => e instanceof ConfigError && e.file === s.sta && /ไม่พบไฟล์/.test(e.message));

  const ghost = path.join(tmpRoot, "ghost-target");
  writeFileSync(s.sta, JSON.stringify({ main_root: tmpRoot, knowledge_roots: [{ name: "k", path: tmpRoot, targets: [{ name: "t", path: ghost }] }] }));
  assert.throws(
    () => loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }),
    (e: unknown) => e instanceof ConfigError && e.file === s.sta && e.message.includes(path.resolve(ghost)) && /ไม่มีจริง/.test(e.message),
  );
  writeFileSync(s.sta, JSON.stringify({ main_root: path.join(tmpRoot, "nope"), knowledge_roots: [] }));
  assert.throws(() => loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }), /main_root/);
  // knowledge_roots ว่างได้ (UI แจ้งให้รัน setup prompt)
  writeFileSync(s.sta, JSON.stringify({ main_root: tmpRoot, knowledge_roots: [] }));
  assert.deepEqual(loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }).sta.knowledge_roots, []);
});

test("resolveRunRoots: knowledge→target → docsRoot/codeRoots; ไม่มี/ถูกลบหลังโหลด → ปฏิเสธก่อน dispatch", () => {
  const dk = path.join(tmpRoot, "rk");
  const dt = path.join(tmpRoot, "rt");
  mkdirSync(dk);
  mkdirSync(dt);
  const sta = { main_root: tmpRoot, knowledge_roots: [{ name: "k", path: dk, targets: [{ name: "t", path: dt }] }] };
  const r = resolveRunRoots(sta, { knowledge: "k", target: "t" });
  assert.deepEqual(r, { docsRoot: dk, codeRoots: [dt], selectedTarget: { name: "t", path: dt } });
  assert.throws(() => resolveRunRoots(sta, { knowledge: "x", target: "t" }), ConfigError);
  assert.throws(() => resolveRunRoots(sta, { knowledge: "k", target: "x" }), ConfigError);
  rmSync(dt, { recursive: true });
  assert.throws(() => resolveRunRoots(sta, { knowledge: "k", target: "t" }), (e: unknown) => e instanceof ConfigError && e.message.includes(dt));
});

// ---------- DES-014 docs validator ----------
function mkModule(): string {
  const m = path.join(tmpRoot, `m${++n}`);
  mkdirSync(path.join(m, "requirement"), { recursive: true });
  mkdirSync(path.join(m, "plan"), { recursive: true });
  mkdirSync(path.join(m, "qa"), { recursive: true });
  writeFileSync(path.join(m, "requirement", "req-001.md"), "# REQ-001\nx\n");
  writeFileSync(path.join(m, "requirement", "req-002.md"), "# REQ-002\nx\n");
  writeFileSync(path.join(m, "requirement", "index.md"), "| id | ชื่อ | status |\n|---|---|---|\n| REQ-001 | a | open |\n| [REQ-002](req-002.md) | b | open |\n");
  writeFileSync(path.join(m, "plan", "be-001.md"), "task\n");
  writeFileSync(path.join(m, "plan", "index.md"), "| id | status |\n|---|---|\n| BE-001 | pending |\n");
  writeFileSync(path.join(m, "qa", "round-1.md"), "r\n");
  writeFileSync(path.join(m, "qa", "index.md"), "| round | result |\n|---|---|\n| Round 1 | pass |\n");
  return m;
}

test("docs validator: โครงถูก → ไม่มี issue", () => {
  const m = mkModule();
  assert.deepEqual(validateModuleDocs(m), []);
  assert.doesNotThrow(() => assertModuleDocs(m));
});

test("docs validator: index↔ไฟล์ สองทาง", () => {
  const m = mkModule();
  writeFileSync(path.join(m, "requirement", "req-003.md"), "orphan\n"); // มีไฟล์ ไม่มีใน index
  writeFileSync(path.join(m, "plan", "index.md"), "| id | status |\n|---|---|\n| BE-001 | pending |\n| BE-002 | pending |\n"); // index ระบุ ไม่มีไฟล์
  const issues = validateModuleDocs(m);
  assert.ok(issues.some((i) => i.kind === "file-not-in-index" && i.file.endsWith("req-003.md")));
  assert.ok(issues.some((i) => i.kind === "index-row-no-file" && i.message.includes("be-002")));
  assert.throws(() => assertModuleDocs(m), /file-not-in-index/);
});

test("docs validator: หมวดไม่มี index.md → issue", () => {
  const m = mkModule();
  rmSync(path.join(m, "qa", "index.md"));
  assert.ok(validateModuleDocs(m).some((i) => i.kind === "index-missing"));
});

test("docs validator: size budget ต่อหน่วย (req 4 KB, task 4 KB, round 10 KB, scope 12 KB)", () => {
  const m = mkModule();
  writeFileSync(path.join(m, "requirement", "req-001.md"), "x".repeat(4 * 1024 + 1));
  writeFileSync(path.join(m, "plan", "be-001.md"), "x".repeat(4 * 1024)); // พอดีงบ — ผ่าน
  writeFileSync(path.join(m, "qa", "round-1.md"), "x".repeat(10 * 1024 + 1));
  writeFileSync(path.join(m, "requirement", "scope.md"), "x".repeat(12 * 1024 + 1));
  const over = validateModuleDocs(m).filter((i) => i.kind === "unit-over-budget").map((i) => path.basename(i.file)).sort();
  assert.deepEqual(over, ["req-001.md", "round-1.md", "scope.md"]);
});

test("docs validator: สูตร budget(index) = median×0.75×จำนวน + 2 KB", () => {
  assert.equal(indexBudgetBytes([]), 2048);
  assert.equal(indexBudgetBytes([1000, 1000, 1000]), 1000 * 0.75 * 3 + 2048);
  // median ไม่ใช่ mean — ไฟล์ใหญ่ตัวเดียวไม่ดึงงบ
  assert.equal(indexBudgetBytes([1000, 1000, 100000]), 1000 * 0.75 * 3 + 2048);
  assert.equal(indexBudgetBytes([1000, 3000]), 2000 * 0.75 * 2 + 2048);

  const m = mkModule(); // unit 2 ไฟล์ ~12 B → budget ≈ 2 KB + เล็กน้อย
  writeFileSync(path.join(m, "requirement", "index.md"), "| REQ-001 | a |\n| REQ-002 | b |\n" + "pad ".repeat(1000));
  const issues = validateModuleDocs(m);
  assert.ok(issues.some((i) => i.kind === "index-over-budget" && i.file.endsWith(path.join("requirement", "index.md"))));
});
