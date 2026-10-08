// BE-001 — config store: โหลด + validate config ทั้ง 6 ไฟล์ (5 yaml ใน config\ + <packRoot>\sta-config.json) แบบ fail-closed
// ตาม design\data-model.md (verbatim) · DES-015 (sta-config machine-local — path ไม่มีจริง → ปฏิเสธ)
// ระบบอ่านอย่างเดียว — เริ่ม run ใหม่อ่านไฟล์ใหม่ทุกครั้ง (AC-010); error ระบุไฟล์ + line/column เสมอ
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

export const KNOWN_ROLES = [
  "business-analyst",
  "system-analyst",
  "project-manager",
  "test-planner",
  "uxui-designer",
  "setup",
  "backend-engineer",
  "frontend-engineer",
  "reviewer",
  "qa-engineer",
  "security",
  "devops",
] as const;
export const KNOWN_CAMPS = ["claude", "codex", "antigravity"] as const;
export const KNOWN_GATES = [
  "business-choice",
  "schema-breaking",
  "ux-signoff",
  "qa-critical",
  "security-finding",
  "deploy-real",
  "release-cut",
] as const;
export const TIER_IDS = ["T1", "T2", "T3", "T4", "T5", "T6"] as const;
export const EFFORT_VALUES = ["low", "medium", "high", "xhigh", "max"] as const;
export const DOCS_LAYOUTS = ["split", "flat", "module"] as const;
export const BRIEF_CHANNELS = ["stdin", "packet-file"] as const;
export const GATE_TRIGGERS = ["handoff", "structural"] as const;
// DES-002: ชื่อ flag มีจริงใน help แต่ห้ามใช้เด็ดขาด
// + arg ที่ resume session เดิม (--continue/--resume/codex `resume`) — ทุก stage ต้องเป็น session ใหม่ (REQ-013 AC-033)
const FORBIDDEN_ARGS = ["--dangerously-skip-permissions", "--dangerously-bypass-approvals-and-sandbox", "--continue", "--resume", "resume"];
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export type CampName = (typeof KNOWN_CAMPS)[number];

export interface WriteScope {
  allow: string[];
  deny: string[];
}
export interface RoleRoute {
  camp: CampName;
  model: string | null;
  effort: string | null;
  writePaths: WriteScope;
}
export interface RoutingConfig {
  defaultCamp: CampName;
  role_routes: Record<string, RoleRoute>;
}
export interface TierBinding {
  model: string;
  effort: string | null;
}
export interface TierDef {
  reserved: boolean;
  camps: Partial<Record<CampName, TierBinding>>;
}
export interface TiersConfig {
  role_defaults: Record<string, string>;
  tiers: Record<string, TierDef>;
}
export interface CampProfile {
  command: string;
  subcommand?: string;
  headlessArgs: string[];
  modelFlag: string | null;
  effortFlag?: string | null;
  effortVia?: string[] | null;
  schemaFlag: string | null;
  rolePromptFlag: string | null;
  briefChannel: (typeof BRIEF_CHANNELS)[number];
  toolRuleFlags?: string[];
  extraDirsFlag?: string | null;
  cwdFlag?: string | null;
  logFlag?: string | null;
}
export interface CampsConfig {
  defaults: { timeoutSec: number; retryOnCrash: number };
  camps: Record<CampName, CampProfile>;
}
export interface GateDef {
  staGate: number;
  trigger: (typeof GATE_TRIGGERS)[number];
  owner: string;
}
export interface GatesConfig {
  owner_default: { name: string };
  gates: Record<string, GateDef>;
  channels: string[];
}
export interface RegistryConfig {
  project: string;
  docsLayout: (typeof DOCS_LAYOUTS)[number];
  packRoot: string;
  rolePromptRoot: string; // derived — <packRoot>\.claude\agents
  templatesRoot: string; // derived — <packRoot>\templates
  orchestratorHome: string;
  ui: { host: string; port: number; openBrowser: boolean };
  scheduler: {
    maxParallelSessions: number;
    fixRoundLimit: number;
    crashRestartLimit: number;
    reviewWave: { maxTasks: number; maxDiffLines: number };
    largeTask: { diffLines: number; files: number };
  };
  audit: { manifestIgnore: string[]; preimageMaxMB: number };
}
export interface StaTarget {
  name: string;
  path: string;
}
export interface StaKnowledgeRoot {
  name: string;
  path: string;
  targets: StaTarget[];
}
export interface StaConfig {
  main_root: string;
  knowledge_roots: StaKnowledgeRoot[];
}
export interface AppConfig {
  orchestratorHome: string;
  configDir: string;
  staConfigPath: string;
  registry: RegistryConfig;
  routing: RoutingConfig;
  tiers: TiersConfig;
  camps: CampsConfig;
  gates: GatesConfig;
  sta: StaConfig;
}

export class ConfigError extends Error {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;

  constructor(file: string, message: string, pos?: Pos) {
    super(pos ? `${file}:${pos.line}:${pos.column} — ${message}` : `${file} — ${message}`);
    this.name = "ConfigError";
    this.file = file;
    this.line = pos?.line;
    this.column = pos?.column;
  }
}

interface Pos {
  line: number;
  column: number;
}
type Violation = { path: (string | number)[]; message: string };
type YamlNodeLike = { range: readonly number[] | null };

export function defaultOrchestratorHome(): string {
  // src/core/config.ts → ราก orchestrator (orchestratorHome ของ deployment นี้)
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function defaultStaConfigPath(home: string = defaultOrchestratorHome()): string {
  // <packRoot>\orchestrator\ → <packRoot>\sta-config.json (machine-local — DES-015)
  return path.resolve(home, "..", "sta-config.json");
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function offsetToPos(text: string, offset: number): Pos {
  const at = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < at; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: at - lineStart + 1 };
}

function readText(file: string): string {
  if (!existsSync(file)) {
    throw new ConfigError(file, "ไม่พบไฟล์ config — ระบบไม่เดาค่าแทน (fail-closed)");
  }
  return readFileSync(file, "utf8");
}

function parseYamlDocument(file: string, text: string): ReturnType<typeof parseDocument> {
  const doc = parseDocument(text, { uniqueKeys: true });
  const err = doc.errors[0];
  if (err) {
    const lp = err.linePos?.[0];
    const pos = lp ? { line: lp.line, column: lp.col } : offsetToPos(text, err.pos?.[0] ?? 0);
    throw new ConfigError(file, `parse YAML ไม่ผ่าน: ${err.message.split("\n")[0]}`, pos);
  }
  return doc;
}

// context ต่อไฟล์ — เก็บ text/doc เพื่อแปลง path → line/column ตอนรายงาน violation
class FileContext {
  readonly violations: Violation[] = [];

  constructor(
    readonly file: string,
    readonly text: string,
    private readonly doc: ReturnType<typeof parseDocument> | null,
  ) {}

  add(vpath: (string | number)[], message: string): void {
    this.violations.push({ path: vpath, message });
  }

  posOf(vpath: (string | number)[]): Pos {
    if (!this.doc) return { line: 1, column: 1 };
    let p = vpath;
    let node: YamlNodeLike | undefined;
    while (p.length > 0) {
      node = this.doc.getIn(p, true) as unknown as YamlNodeLike | undefined;
      if (node) break;
      p = p.slice(0, -1);
    }
    node ??= this.doc.contents as unknown as YamlNodeLike | undefined;
    return node?.range ? offsetToPos(this.text, node.range[0]) : { line: 1, column: 1 };
  }

  throwFirst(): void {
    const v = this.violations[0];
    if (v) throw new ConfigError(this.file, v.message, this.posOf(v.path));
  }
}

function missing(ctx: FileContext, vpath: (string | number)[], label: string): void {
  ctx.add(vpath, `ขาด field ${label}`);
}

function expectString(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string, opts: { allowEmpty?: boolean } = {}): void {
  if (v === undefined) return missing(ctx, vpath, label);
  if (typeof v !== "string" || (!opts.allowEmpty && v.trim() === "")) {
    ctx.add(vpath, `${label} ต้องเป็น string ไม่ว่าง`);
  }
}

function expectNullableString(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string): void {
  if (v === undefined) return missing(ctx, vpath, label);
  if (v !== null && (typeof v !== "string" || v.trim() === "")) {
    ctx.add(vpath, `${label} ต้องเป็น string ไม่ว่าง หรือ null`);
  }
}

function expectInt(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string, min: number, max?: number): void {
  if (v === undefined) return missing(ctx, vpath, label);
  const ok = typeof v === "number" && Number.isInteger(v) && v >= min && (max === undefined || v <= max);
  if (!ok) ctx.add(vpath, `${label} ต้องเป็น int ในช่วง ${min}${max === undefined ? "" : `–${max}`}`);
}

function expectBool(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string): void {
  if (v === undefined) return missing(ctx, vpath, label);
  if (typeof v !== "boolean") ctx.add(vpath, `${label} ต้องเป็น boolean`);
}

function expectEnum(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string, allowed: readonly string[]): void {
  if (v === undefined) return missing(ctx, vpath, label);
  if (typeof v !== "string" || !allowed.includes(v)) {
    ctx.add(vpath, `${label} ต้องเป็นหนึ่งใน: ${allowed.join(" | ")} (ได้รับ ${JSON.stringify(v)})`);
  }
}

function expectStringArray(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string, opts: { minItems?: number } = {}): void {
  if (v === undefined) return missing(ctx, vpath, label);
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || x.trim() === "")) {
    return void ctx.add(vpath, `${label} ต้องเป็น string[] (ค่าใน list ไม่ว่าง)`);
  }
  const min = opts.minItems ?? 0;
  if (v.length < min) ctx.add(vpath, `${label} ต้องมีอย่างน้อย ${min} รายการ`);
}

function expectNullableStringArray(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string): void {
  if (v === undefined) return missing(ctx, vpath, label);
  if (v === null) return;
  expectStringArray(ctx, vpath, v, label);
}

function expectMap(ctx: FileContext, vpath: (string | number)[], v: unknown, label: string): Record<string, unknown> | null {
  if (v === undefined) {
    missing(ctx, vpath, label);
    return null;
  }
  if (!isObject(v)) {
    ctx.add(vpath, `${label} ต้องเป็น map`);
    return null;
  }
  return v;
}

function expectExactKeys(ctx: FileContext, vpath: (string | number)[], v: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(v)) {
    if (!allowed.includes(key)) {
      ctx.add([...vpath, key], `field ไม่รู้จัก "${key}" — schema ตาม design\data-model.md เท่านั้น (fail-closed)`);
    }
  }
}

function expectRequiredKeys(ctx: FileContext, vpath: (string | number)[], v: Record<string, unknown>, required: readonly string[]): void {
  for (const key of required) {
    if (v[key] === undefined) ctx.add([...vpath, key], `ขาด field "${key}"`);
  }
}

// --- registry.yaml ---
function validateRegistry(ctx: FileContext, v: unknown): void {
  const root = expectMap(ctx, [], v, "registry.yaml root");
  if (!root) return;
  if (root.concurrency !== undefined) {
    ctx.add(["concurrency"], "`concurrency` ถูกแทนที่ด้วย `scheduler` + `audit` (breaking — Rev 10) — ลบ block นี้ออก (fail-closed)");
  }
  expectExactKeys(ctx, [], root, ["project", "docsLayout", "packRoot", "orchestratorHome", "ui", "scheduler", "audit"]);
  expectString(ctx, ["project"], root.project, "project");
  expectEnum(ctx, ["docsLayout"], root.docsLayout, "docsLayout", DOCS_LAYOUTS);
  expectString(ctx, ["packRoot"], root.packRoot, "packRoot");
  expectString(ctx, ["orchestratorHome"], root.orchestratorHome, "orchestratorHome");
  const ui = expectMap(ctx, ["ui"], root.ui, "ui");
  if (ui) {
    expectExactKeys(ctx, ["ui"], ui, ["host", "port", "openBrowser"]);
    expectString(ctx, ["ui", "host"], ui.host, "ui.host");
    if (typeof ui.host === "string" && !LOOPBACK_HOSTS.has(ui.host)) {
      ctx.add(["ui", "host"], "ui.host ต้อง bind loopback เท่านั้น (127.0.0.1 | ::1 | localhost — DES-009 Security)");
    }
    expectInt(ctx, ["ui", "port"], ui.port, "ui.port", 1024, 65535);
    expectBool(ctx, ["ui", "openBrowser"], ui.openBrowser, "ui.openBrowser");
  }
  const sch = expectMap(ctx, ["scheduler"], root.scheduler, "scheduler");
  if (sch) {
    expectExactKeys(ctx, ["scheduler"], sch, ["maxParallelSessions", "fixRoundLimit", "crashRestartLimit", "reviewWave", "largeTask"]);
    expectInt(ctx, ["scheduler", "maxParallelSessions"], sch.maxParallelSessions, "scheduler.maxParallelSessions", 1);
    expectInt(ctx, ["scheduler", "fixRoundLimit"], sch.fixRoundLimit, "scheduler.fixRoundLimit", 0);
    expectInt(ctx, ["scheduler", "crashRestartLimit"], sch.crashRestartLimit, "scheduler.crashRestartLimit", 0);
    const rw = expectMap(ctx, ["scheduler", "reviewWave"], sch.reviewWave, "scheduler.reviewWave");
    if (rw) {
      expectExactKeys(ctx, ["scheduler", "reviewWave"], rw, ["maxTasks", "maxDiffLines"]);
      expectInt(ctx, ["scheduler", "reviewWave", "maxTasks"], rw.maxTasks, "reviewWave.maxTasks", 1);
      expectInt(ctx, ["scheduler", "reviewWave", "maxDiffLines"], rw.maxDiffLines, "reviewWave.maxDiffLines", 1);
    }
    const lt = expectMap(ctx, ["scheduler", "largeTask"], sch.largeTask, "scheduler.largeTask");
    if (lt) {
      expectExactKeys(ctx, ["scheduler", "largeTask"], lt, ["diffLines", "files"]);
      expectInt(ctx, ["scheduler", "largeTask", "diffLines"], lt.diffLines, "largeTask.diffLines", 1);
      expectInt(ctx, ["scheduler", "largeTask", "files"], lt.files, "largeTask.files", 1);
    }
  }
  const audit = expectMap(ctx, ["audit"], root.audit, "audit");
  if (audit) {
    expectExactKeys(ctx, ["audit"], audit, ["manifestIgnore", "preimageMaxMB"]);
    expectStringArray(ctx, ["audit", "manifestIgnore"], audit.manifestIgnore, "audit.manifestIgnore");
    expectInt(ctx, ["audit", "preimageMaxMB"], audit.preimageMaxMB, "audit.preimageMaxMB", 0);
  }
}

// --- routing.yaml ---
function validateRouting(ctx: FileContext, v: unknown): void {
  const root = expectMap(ctx, [], v, "routing.yaml root");
  if (!root) return;
  expectExactKeys(ctx, [], root, ["defaultCamp", "role_routes"]);
  expectEnum(ctx, ["defaultCamp"], root.defaultCamp, "defaultCamp", KNOWN_CAMPS);
  const routes = expectMap(ctx, ["role_routes"], root.role_routes, "role_routes");
  if (!routes) return;
  for (const key of Object.keys(routes)) {
    if (!KNOWN_ROLES.includes(key as (typeof KNOWN_ROLES)[number])) {
      ctx.add(["role_routes", key], `role ไม่รู้จัก "${key}" — ต้องตรงชื่อไฟล์ใน rolePromptRoot ทั้ง ${KNOWN_ROLES.length}`);
    }
  }
  for (const role of KNOWN_ROLES) {
    const entry = routes[role];
    if (entry === undefined) {
      ctx.add(["role_routes"], `ขาด role "${role}" — routing ต้องครบทั้ง ${KNOWN_ROLES.length} role`);
      continue;
    }
    const route = isObject(entry) ? entry : null;
    if (!route) {
      ctx.add(["role_routes", role], `route ของ "${role}" ต้องเป็น map`);
      continue;
    }
    expectExactKeys(ctx, ["role_routes", role], route, ["camp", "model", "effort", "writePaths"]);
    expectRequiredKeys(ctx, ["role_routes", role], route, ["camp", "model", "effort", "writePaths"]);
    expectEnum(ctx, ["role_routes", role, "camp"], route.camp, "camp", KNOWN_CAMPS);
    expectNullableString(ctx, ["role_routes", role, "model"], route.model, "model");
    if (route.effort !== undefined && route.effort !== null) {
      expectEnum(ctx, ["role_routes", role, "effort"], route.effort, "effort", EFFORT_VALUES);
    }
    const wp = expectMap(ctx, ["role_routes", role, "writePaths"], route.writePaths, "writePaths");
    if (wp) {
      expectExactKeys(ctx, ["role_routes", role, "writePaths"], wp, ["allow", "deny"]);
      expectStringArray(ctx, ["role_routes", role, "writePaths", "allow"], wp.allow, "allow", { minItems: 1 });
      expectStringArray(ctx, ["role_routes", role, "writePaths", "deny"], wp.deny, "deny");
    }
  }
}

// --- tiers.yaml ---
function validateTiers(ctx: FileContext, v: unknown): void {
  const root = expectMap(ctx, [], v, "tiers.yaml root");
  if (!root) return;
  expectExactKeys(ctx, [], root, ["role_defaults", "tiers"]);
  const defaults = expectMap(ctx, ["role_defaults"], root.role_defaults, "role_defaults");
  if (defaults) {
    for (const key of Object.keys(defaults)) {
      if (!KNOWN_ROLES.includes(key as (typeof KNOWN_ROLES)[number])) {
        ctx.add(["role_defaults", key], `role ไม่รู้จัก "${key}"`);
      }
    }
    for (const role of KNOWN_ROLES) {
      const tier = defaults[role];
      if (tier === undefined) {
        ctx.add(["role_defaults"], `ขาด role "${role}" — role_defaults ต้องครบทั้ง ${KNOWN_ROLES.length} role`);
        continue;
      }
      if (typeof tier !== "string" || !TIER_IDS.includes(tier as (typeof TIER_IDS)[number])) {
        ctx.add(["role_defaults", role], `tier ไม่รู้จัก ${JSON.stringify(tier)} — ต้องเป็นหนึ่งใน ${TIER_IDS.join("|")}`);
      } else if (tier === "T1") {
        // T1 reserved — ห้าม cast อัตโนมัติ แม้เป็น role default (REQ-004, AC-009)
        ctx.add(["role_defaults", role], `role default ห้ามใช้ T1 (reserved — คนเลือกเองเท่านั้น, AC-009)`);
      }
    }
  }
  const tiers = expectMap(ctx, ["tiers"], root.tiers, "tiers");
  if (!tiers) return;
  expectExactKeys(ctx, ["tiers"], tiers, TIER_IDS);
  for (const tierId of TIER_IDS) {
    const raw = tiers[tierId];
    if (raw === undefined) {
      ctx.add(["tiers"], `ขาด tier "${tierId}"`);
      continue;
    }
    const tier = isObject(raw) ? raw : null;
    if (!tier) {
      ctx.add(["tiers", tierId], `tier "${tierId}" ต้องเป็น map`);
      continue;
    }
    expectExactKeys(ctx, ["tiers", tierId], tier, ["reserved", "camps"]);
    if (tier.reserved !== undefined) expectBool(ctx, ["tiers", tierId, "reserved"], tier.reserved, "reserved");
    const camps = expectMap(ctx, ["tiers", tierId, "camps"], tier.camps, "camps");
    if (!camps) continue;
    if (tierId === "T1") {
      if (tier.reserved !== true) ctx.add(["tiers", "T1", "reserved"], "T1 ต้อง reserved: true (ห้าม cast อัตโนมัติ — REQ-004)");
      if (Object.keys(camps).length > 0) {
        ctx.add(["tiers", "T1", "camps"], "T1 ต้องมี camps ว่าง — คนระบุ model/effort เองเท่านั้น (AC-009)");
      }
      continue;
    }
    expectExactKeys(ctx, ["tiers", tierId, "camps"], camps, KNOWN_CAMPS);
    for (const camp of KNOWN_CAMPS) {
      const binding = camps[camp];
      if (binding === undefined) {
        ctx.add(["tiers", tierId, "camps"], `tier ${tierId} ขาด camp "${camp}"`);
        continue;
      }
      const b = isObject(binding) ? binding : null;
      if (!b) {
        ctx.add(["tiers", tierId, "camps", camp], `binding ของ ${tierId}/${camp} ต้องเป็น map`);
        continue;
      }
      expectExactKeys(ctx, ["tiers", tierId, "camps", camp], b, ["model", "effort"]);
      expectString(ctx, ["tiers", tierId, "camps", camp, "model"], b.model, "model");
      if (b.effort !== undefined && b.effort !== null) {
        expectEnum(ctx, ["tiers", tierId, "camps", camp, "effort"], b.effort, "effort", EFFORT_VALUES);
      }
    }
  }
}

// --- gates.yaml ---
function validateGates(ctx: FileContext, v: unknown): void {
  const root = expectMap(ctx, [], v, "gates.yaml root");
  if (!root) return;
  expectExactKeys(ctx, [], root, ["owner_default", "gates", "channels"]);
  const owner = expectMap(ctx, ["owner_default"], root.owner_default, "owner_default");
  if (owner) {
    expectExactKeys(ctx, ["owner_default"], owner, ["name"]);
    expectString(ctx, ["owner_default", "name"], owner.name, "owner_default.name");
  }
  const gates = expectMap(ctx, ["gates"], root.gates, "gates");
  if (gates) {
    expectExactKeys(ctx, ["gates"], gates, KNOWN_GATES);
    for (const gateId of KNOWN_GATES) {
      const raw = gates[gateId];
      if (raw === undefined) {
        ctx.add(["gates"], `ขาด gate "${gateId}" — human gate ต้องครบ 7 จุด`);
        continue;
      }
      const gate = isObject(raw) ? raw : null;
      if (!gate) {
        ctx.add(["gates", gateId], `gate "${gateId}" ต้องเป็น map`);
        continue;
      }
      expectExactKeys(ctx, ["gates", gateId], gate, ["staGate", "trigger", "owner"]);
      expectInt(ctx, ["gates", gateId, "staGate"], gate.staGate, "staGate", 1, KNOWN_GATES.length);
      if (gate.staGate !== KNOWN_GATES.indexOf(gateId) + 1) {
        ctx.add(["gates", gateId, "staGate"], `gate "${gateId}" ต้องมี staGate = ${KNOWN_GATES.indexOf(gateId) + 1} ตาม data-model`);
      }
      expectEnum(ctx, ["gates", gateId, "trigger"], gate.trigger, "trigger", GATE_TRIGGERS);
      expectString(ctx, ["gates", gateId, "owner"], gate.owner, "owner");
    }
  }
  expectStringArray(ctx, ["channels"], root.channels, "channels");
}

// --- camps.yaml ---
const CAMP_REQUIRED = ["command", "headlessArgs", "modelFlag", "schemaFlag", "rolePromptFlag", "briefChannel"] as const;
const CAMP_OPTIONAL = ["subcommand", "effortFlag", "effortVia", "toolRuleFlags", "extraDirsFlag", "cwdFlag", "logFlag"] as const;

function validateCamps(ctx: FileContext, v: unknown): void {
  const root = expectMap(ctx, [], v, "camps.yaml root");
  if (!root) return;
  expectExactKeys(ctx, [], root, ["defaults", "camps"]);
  const defaults = expectMap(ctx, ["defaults"], root.defaults, "defaults");
  if (defaults) {
    expectExactKeys(ctx, ["defaults"], defaults, ["timeoutSec", "retryOnCrash"]);
    expectInt(ctx, ["defaults", "timeoutSec"], defaults.timeoutSec, "timeoutSec", 1);
    expectInt(ctx, ["defaults", "retryOnCrash"], defaults.retryOnCrash, "retryOnCrash", 0);
  }
  const camps = expectMap(ctx, ["camps"], root.camps, "camps");
  if (!camps) return;
  expectExactKeys(ctx, ["camps"], camps, KNOWN_CAMPS);
  for (const camp of KNOWN_CAMPS) {
    const raw = camps[camp];
    if (raw === undefined) {
      ctx.add(["camps"], `ขาด camp "${camp}" — adapter ต้องมีครบ 3 camp`);
      continue;
    }
    const profile = isObject(raw) ? raw : null;
    if (!profile) {
      ctx.add(["camps", camp], `camp "${camp}" ต้องเป็น map`);
      continue;
    }
    expectExactKeys(ctx, ["camps", camp], profile, [...CAMP_REQUIRED, ...CAMP_OPTIONAL]);
    expectRequiredKeys(ctx, ["camps", camp], profile, CAMP_REQUIRED);
    expectString(ctx, ["camps", camp, "command"], profile.command, "command");
    if (profile.subcommand !== undefined) expectString(ctx, ["camps", camp, "subcommand"], profile.subcommand, "subcommand");
    expectStringArray(ctx, ["camps", camp, "headlessArgs"], profile.headlessArgs, "headlessArgs");
    for (const flag of ["modelFlag", "schemaFlag", "rolePromptFlag"] as const) {
      expectNullableString(ctx, ["camps", camp, flag], profile[flag], flag);
    }
    expectEnum(ctx, ["camps", camp, "briefChannel"], profile.briefChannel, "briefChannel", BRIEF_CHANNELS);
    if (profile.effortFlag !== undefined) expectNullableString(ctx, ["camps", camp, "effortFlag"], profile.effortFlag, "effortFlag");
    if (profile.effortVia !== undefined) expectNullableStringArray(ctx, ["camps", camp, "effortVia"], profile.effortVia, "effortVia");
    if (profile.toolRuleFlags !== undefined) expectStringArray(ctx, ["camps", camp, "toolRuleFlags"], profile.toolRuleFlags, "toolRuleFlags");
    for (const flag of ["extraDirsFlag", "cwdFlag", "logFlag"] as const) {
      if (profile[flag] !== undefined) expectNullableString(ctx, ["camps", camp, flag], profile[flag], flag);
    }
    const args = Array.isArray(profile.headlessArgs) ? profile.headlessArgs : [];
    for (const forbidden of FORBIDDEN_ARGS) {
      if (args.includes(forbidden)) {
        ctx.add(["camps", camp, "headlessArgs"], `ห้ามใช้ ${forbidden} เด็ดขาด (DES-002 Security)`);
      }
    }
  }
}

// --- <packRoot>\sta-config.json (DES-015) ---
function validateStaConfig(ctx: FileContext, v: unknown): void {
  const root = expectMap(ctx, [], v, "sta-config root");
  if (!root) return;
  expectExactKeys(ctx, [], root, ["main_root", "knowledge_roots"]);
  expectString(ctx, ["main_root"], root.main_root, "main_root");
  checkDirExists(ctx, ["main_root"], root.main_root, "main_root");
  const roots = root.knowledge_roots;
  if (roots === undefined) return missing(ctx, ["knowledge_roots"], "knowledge_roots");
  // knowledge_roots ว่างได้ (DES-015: UI แสดงข้อความให้รัน setup prompt) — แต่ shape ต้องถูก
  if (!Array.isArray(roots)) return void ctx.add(["knowledge_roots"], "knowledge_roots ต้องเป็น list");
  for (const [i, item] of roots.entries()) {
    const kr = isObject(item) ? item : null;
    if (!kr) {
      ctx.add(["knowledge_roots", i], `knowledge_roots[${i}] ต้องเป็น map`);
      continue;
    }
    expectExactKeys(ctx, ["knowledge_roots", i], kr, ["name", "path", "targets"]);
    expectString(ctx, ["knowledge_roots", i, "name"], kr.name, "name");
    expectString(ctx, ["knowledge_roots", i, "path"], kr.path, "path");
    checkDirExists(ctx, ["knowledge_roots", i, "path"], kr.path, `knowledge root "${String(kr.name ?? i)}"`);
    const targets = kr.targets;
    if (targets === undefined) {
      missing(ctx, ["knowledge_roots", i, "targets"], "targets");
      continue;
    }
    if (!Array.isArray(targets)) {
      ctx.add(["knowledge_roots", i, "targets"], "targets ต้องเป็น list");
      continue;
    }
    for (const [j, t] of targets.entries()) {
      const target = isObject(t) ? t : null;
      if (!target) {
        ctx.add(["knowledge_roots", i, "targets", j], `targets[${j}] ต้องเป็น map`);
        continue;
      }
      expectExactKeys(ctx, ["knowledge_roots", i, "targets", j], target, ["name", "path"]);
      expectString(ctx, ["knowledge_roots", i, "targets", j, "name"], target.name, "name");
      expectString(ctx, ["knowledge_roots", i, "targets", j, "path"], target.path, "path");
      checkDirExists(ctx, ["knowledge_roots", i, "targets", j, "path"], target.path, `target "${String(target.name ?? j)}"`);
    }
  }
}

// fail-closed (DES-015): path ไม่มีจริงบนดิสก์ → violation ที่ตำแหน่ง node นั้น — ระบบไม่เดา path
function checkDirExists(ctx: FileContext, vpath: (string | number)[], value: unknown, label: string): void {
  if (typeof value !== "string" || value.trim() === "") return;
  const p = path.resolve(value);
  if (!path.isAbsolute(p)) {
    ctx.add(vpath, `${label}: path ต้องเป็น absolute path — ได้รับ ${JSON.stringify(value)}`);
    return;
  }
  let stat: { isDirectory(): boolean } | null = null;
  try {
    stat = existsSync(p) ? statSync(p) : null;
  } catch {
    stat = null;
  }
  if (!stat || !stat.isDirectory()) {
    ctx.add(vpath, `${label}: path ไม่มีจริงบนดิสก์ (fail-closed — DES-015): ${p}`);
  }
}

interface LoadedFile {
  ctx: FileContext;
  value: unknown;
}

function loadValidatedFile(file: string, validate: (ctx: FileContext, value: unknown) => void, isJson = false): LoadedFile {
  const text = readText(file);
  // .json: parse JSON ก่อน (error ต้องเป็น "parse JSON") — yaml doc ใช้เฉพาะหาตำแหน่ง line/column ของ violation
  const doc = isJson ? parseDocument(text) : parseYamlDocument(file, text);
  let value: unknown;
  if (isJson) {
    // .json ต้องเป็น JSON แท้ — parse ด้วย JSON.parse (yaml doc ใช้เฉพาะหาตำแหน่ง line/column)
    try {
      value = JSON.parse(text);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const lineCol = /\(line (\d+) column (\d+)\)/.exec(raw);
      const atPos = /at position (\d+)/.exec(raw);
      const pos = lineCol
        ? { line: Number(lineCol[1]), column: Number(lineCol[2]) }
        : atPos
          ? offsetToPos(text, Number(atPos[1]))
          : undefined;
      throw new ConfigError(file, `parse JSON ไม่ผ่าน: ${raw.split("\n")[0]}`, pos);
    }
  } else {
    value = doc.toJS();
  }
  const ctx = new FileContext(file, text, doc);
  validate(ctx, value);
  ctx.throwFirst();
  return { ctx, value };
}

export interface LoadAppConfigOptions {
  orchestratorHome?: string;
  staConfigPath?: string;
}

export function loadAppConfig(opts: LoadAppConfigOptions = {}): AppConfig {
  const home = opts.orchestratorHome ?? defaultOrchestratorHome();
  const configDir = path.join(home, "config");
  const staConfigPath = opts.staConfigPath ?? defaultStaConfigPath(home);

  const registryFile = path.join(configDir, "registry.yaml");
  const routingFile = path.join(configDir, "routing.yaml");
  const tiersFile = path.join(configDir, "tiers.yaml");
  const campsFile = path.join(configDir, "camps.yaml");
  const gatesFile = path.join(configDir, "gates.yaml");

  const registryCtx = loadValidatedFile(registryFile, validateRegistry);
  const routingCtx = loadValidatedFile(routingFile, validateRouting);
  const tiersCtx = loadValidatedFile(tiersFile, validateTiers);
  const campsCtx = loadValidatedFile(campsFile, validateCamps);
  const gatesCtx = loadValidatedFile(gatesFile, validateGates);
  const staCtx = loadValidatedFile(staConfigPath, validateStaConfig, true);

  const registryValue = registryCtx.value as Record<string, unknown>;
  const routingValue = routingCtx.value as Record<string, unknown>;
  const tiersValue = tiersCtx.value as Record<string, unknown>;
  const campsValue = campsCtx.value as Record<string, unknown>;

  // cross-file: camp ใด ๆ ที่อ้างถึงต้องประกาศใน camps.yaml ("camp ไม่รู้จัก" → ปฏิเสธเริ่ม run)
  const declaredCamps = isObject(campsValue["camps"]) ? Object.keys(campsValue["camps"] as object) : [];
  const defaultCamp = routingValue["defaultCamp"];
  if (typeof defaultCamp === "string" && !declaredCamps.includes(defaultCamp)) {
    routingCtx.ctx.add(["defaultCamp"], `defaultCamp "${defaultCamp}" ไม่ใช่ camp ที่ประกาศใน camps.yaml (camp ไม่รู้จัก)`);
  }
  const routes = isObject(routingValue["role_routes"]) ? (routingValue["role_routes"] as Record<string, unknown>) : {};
  for (const role of Object.keys(routes)) {
    const entry = routes[role];
    const camp = isObject(entry) ? entry["camp"] : undefined;
    if (typeof camp === "string" && !declaredCamps.includes(camp)) {
      routingCtx.ctx.add(["role_routes", role, "camp"], `camp "${camp}" ไม่ใช่ camp ที่ประกาศใน camps.yaml (camp ไม่รู้จัก)`);
    }
  }
  const tiersMap = isObject(tiersValue["tiers"]) ? (tiersValue["tiers"] as Record<string, unknown>) : {};
  for (const tierId of Object.keys(tiersMap)) {
    const tier = tiersMap[tierId];
    const tierCamps = isObject(tier) ? (tier as Record<string, unknown>)["camps"] : undefined;
    if (!isObject(tierCamps)) continue;
    for (const camp of Object.keys(tierCamps)) {
      if (!declaredCamps.includes(camp)) {
        tiersCtx.ctx.add(["tiers", tierId, "camps", camp], `camp "${camp}" ไม่ใช่ camp ที่ประกาศใน camps.yaml (camp ไม่รู้จัก)`);
      }
    }
  }
  routingCtx.ctx.throwFirst();
  tiersCtx.ctx.throwFirst();

  // path ของ registry ต้องมีจริง (fail-closed — ไม่มีโค้ดสร้างแทน)
  const packRoot = String(registryValue["packRoot"] ?? "");
  if (packRoot !== "") {
    checkDirExists(registryCtx.ctx, ["packRoot"], packRoot, "packRoot");
    checkDirExists(registryCtx.ctx, ["packRoot"], path.join(packRoot, ".claude", "agents"), "rolePromptRoot (derived จาก packRoot)");
    checkDirExists(registryCtx.ctx, ["packRoot"], path.join(packRoot, "templates"), "templatesRoot (derived จาก packRoot)");
  }
  checkDirExists(registryCtx.ctx, ["orchestratorHome"], registryValue["orchestratorHome"], "orchestratorHome");
  registryCtx.ctx.throwFirst();
  campsCtx.ctx.throwFirst();
  gatesCtx.ctx.throwFirst();

  return {
    orchestratorHome: home,
    configDir,
    staConfigPath,
    registry: {
      ...(registryValue as unknown as RegistryConfig),
      rolePromptRoot: path.join(packRoot, ".claude", "agents"),
      templatesRoot: path.join(packRoot, "templates"),
    },
    routing: routingValue as unknown as RoutingConfig,
    tiers: tiersValue as unknown as TiersConfig,
    camps: campsValue as unknown as CampsConfig,
    gates: gatesCtx.value as unknown as GatesConfig,
    sta: staCtx.value as unknown as StaConfig,
  };
}

// โหลด sta-config.json เดี่ยว (DES-015) — ใช้ตอน UI ขอรายการเลือก knowledge → target
export function loadStaConfig(staConfigPath: string = defaultStaConfigPath()): StaConfig {
  return loadValidatedFile(staConfigPath, validateStaConfig, true).value as unknown as StaConfig;
}

export interface RunRoots {
  docsRoot: string; // knowledge root ที่เลือก (DES-011)
  codeRoots: string[]; // path ของ target ที่เลือก (REQ-002 AC-004)
  selectedTarget: StaTarget;
}

// เลือก knowledge → target ของ run (DES-015) — เช็ค path บนดิสก์ซ้ำก่อน dispatch ทุกครั้ง (fail-closed)
export function resolveRunRoots(sta: StaConfig, sel: { knowledge: string; target: string }): RunRoots {
  const kr = sta.knowledge_roots.find((k) => k.name === sel.knowledge);
  if (!kr) throw new ConfigError("sta-config.json", `knowledge root "${sel.knowledge}" ไม่มีในรายการ — ปฏิเสธ run`);
  const target = kr.targets.find((t) => t.name === sel.target);
  if (!target) throw new ConfigError("sta-config.json", `target "${sel.target}" ไม่มีใน knowledge "${kr.name}" — ปฏิเสธ run`);
  for (const [label, p] of [["knowledge root", kr.path], ["target", target.path]] as const) {
    if (!existsSync(p) || !statSync(p).isDirectory()) {
      throw new ConfigError("sta-config.json", `${label} path ไม่มีจริงบนดิสก์: ${p} — ปฏิเสธ run ก่อน dispatch (fail-closed — DES-015)`);
    }
  }
  return { docsRoot: kr.path, codeRoots: [target.path], selectedTarget: target };
}

// hash ไฟล์ config ตอนเริ่ม run → run.json configSnapshot (data-model) — resume ใช้ค่าที่ freeze แล้ว ไม่อ่านใหม่
export function configSnapshot(configDir: string): { routing: string; tiers: string; camps: string; gates: string } {
  const h = (name: string): string => `sha256:${createHash("sha256").update(readFileSync(path.join(configDir, name))).digest("hex")}`;
  return { routing: h("routing.yaml"), tiers: h("tiers.yaml"), camps: h("camps.yaml"), gates: h("gates.yaml") };
}
