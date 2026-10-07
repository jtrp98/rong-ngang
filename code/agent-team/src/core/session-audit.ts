// BE-008 — write scope + session audit ด้วย path claim (DES-006 ชั้น 3 + DES-021 ข้อ 1–6)
// audit ต่อ session (detective ไม่ใช่ preventive — DES-006) ทำงานบนทุก root ของ run (จาก run.json.gitPolicy
// ที่ freeze แล้ว — derive ยังไม่ทำใน BE-007 ผู้เรียกจึงส่ง roots เข้ามา):
//   เริ่ม session → snapshot {abs path → sha256} ต่อ root (git root: `git ls-files -co --exclude-standard`,
//   non-repo: เดินไฟล์ตัด audit.manifestIgnore) ลง sessions/<sid>/snapshot.json (persist — รอด crash, AC-066)
//   + pre-image ของไฟล์ใต้ claim ตามเพดาน audit.preimageMaxMB + pre-image plan/index.md เสมอ (DES-021 ข้อ 3)
//   จบ session → snapshot ซ้ำ → changed = path ที่ hash ต่าง/เกิด/หาย → attribution (DES-021 ข้อ 4):
//     journal (self-write ของ orchestrator — BE-022: path + hash หลังเขียน) → ข้าม ·
//     ใต้ claim ของ session อื่นที่ active ทับช่วง → ข้าม (ของ session นั้น) ·
//     ติด universal deny / deny ของ role / นอก allow ของ role → violation kind "write" (AC-007/052/060) ·
//     ใต้ claim ตัวเอง → touchedFiles · นอกนั้น → violation kind "unclaimed-write" + suspects (fail-closed —
//     suspects = session ทุกตัวที่ active ทับช่วงและไม่ claim f รวม session นี้ · dedupe ข้าม restart เป็นหน้าที่
//     ของ driver ด้วย path+hash — ที่นี่ 1 file = 1 violation เสมอ)
//   status column (AC-073 — DES-021 ข้อ 5): parse ตาราง Tasks ของ plan/index.md ก่อน/หลัง — เปลี่ยน Status
//     แถวเดิม (รวม qa-engineer) / แถวใหม่ที่ไม่ใช่ PM+pending / ค่านอก pending|verified|blocked → "status-write" ·
//     ไฟล์ที่ journal ครอบ (path+hash ตรง) ข้ามทั้งไฟล์ — Status write-back ของ orchestrator ไม่โดน
//   diff (DES-021 ข้อ 6): git diff --no-index --numstat <pre-image> <file> → diff.patch (ขนาดให้ BE-021) ·
//     ไม่มี pre-image → ทุกกิ่ง fallback ตั้ง diffApprox: true (นับเกิน = ปลอดภัย): ไฟล์ tracked ได้ numstat จาก
//     git diff HEAD · ไฟล์ใหม่ untracked (diff HEAD ไม่แสดง) นับทุกบรรทัดเป็น added จาก
//     git ls-files --others --exclude-standard · ไม่มี git → รายชื่อไฟล์
// git ทั้งหมด read-only ผ่าน argv array เท่านั้น (ไม่มี shell) · ไม่ auto-revert เด็ดขาด (DES-006/021) ·
// gitRefs/kind "git-commit-off"/"git-ref" เป็นของ DES-016 (REQ-009 ไม่อยู่ R1 — BL-015/017) → คงค่าว่าง
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type DocsLayout, assertNoTraversal, isInside, moduleDir } from "./knowledge-paths.ts";
import { parsePlanIndex } from "./plan-parser.ts";
import { ensureSessionDir, type Role, type SessionRecord } from "./state-store.ts";

export type AuditMode = "git" | "manifest";
export type WriteAudit = SessionRecord["writeAudit"];
export type AuditViolation = WriteAudit["violations"][number];

// รากหนึ่งรากของ run — โครงย่อยของ run.json.gitPolicy (freeze — DES-015/006) ส่ง verbatim ได้
export interface AuditRoot {
  rootKind: "knowledge" | "target";
  name: string;
  path: string;
  auditMode: AuditMode;
  repoTop: string | null;
}

// จุดเสียบ git เพื่อทดสอบโดยไม่ยุ่ง repo จริง — default = spawnSync argv array (scope BE-008: read-only เท่านั้น)
export type GitRunner = (args: readonly string[], cwd: string) => { status: number; stdout: string };

export function defaultGitRunner(gitBin = "git"): GitRunner {
  return (args, cwd) => {
    try {
      const r = spawnSync(gitBin, [...args], { cwd, encoding: "utf8" });
      return { status: r.status ?? 127, stdout: r.stdout ?? "" };
    } catch {
      // ไม่มี git binary → DES-021 Fallback: diff = รายชื่อไฟล์อย่างเดียว + diffApprox
      return { status: 127, stdout: "" };
    }
  };
}

export class SessionAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionAuditError";
  }
}

// claim จาก Write paths ไม่อยู่ใต้ allow/deny ของ role → driver hold `plan-error` (DES-021 ข้อ 1)
export class ClaimError extends Error {
  constructor(
    message: string,
    readonly entries: string[],
  ) {
    super(message);
    this.name = "ClaimError";
  }
}

// --- glob ย่อ: `**` ข้าม segment ได้ไม่จำกัด, `*` ภายใน segment เดียว — รูปเดียวที่ routing.yaml/DES-021 ใช้ ---
function globToRegExp(pattern: string): RegExp {
  const norm = pattern.split(/[\\/]+/).join("/");
  let re = "^";
  for (let i = 0; i < norm.length; i++) {
    const c = norm[i]!;
    if (c === "*") {
      if (norm[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else {
      re += c.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
    }
  }
  return new RegExp(`${re}$`);
}

function relFrom(base: string, abs: string): string {
  return path.relative(path.resolve(base), path.resolve(abs)).split(path.sep).join("/");
}

// --- แปลง allow/deny pattern → คู่ (base, rel-glob) — รูปเดียวกับ routing.yaml (DES-006/DES-003) ---
// `knowledge/<module>/…` = สัมพัทธ์ docsRoot (`<module>` → โครง moduleDir ตาม docsLayout) ·
// `codeRoots/…` = ทุก target ของ run (DES-015) · `<packRoot>/…` = ราก pack (DES-003) · อื่น = ปฏิเสธ (fail-closed)
export interface PatternScope {
  docsRoot: string;
  codeRoots: readonly string[];
  packRoot: string;
  module: string;
  docsLayout: DocsLayout;
}

function patternBases(pattern: string, scope: PatternScope): { base: string; rel: string }[] {
  assertNoTraversal(pattern, "allow/deny pattern");
  if (pattern === "<packRoot>" || pattern.startsWith("<packRoot>/")) {
    return [{ base: scope.packRoot, rel: pattern.slice("<packRoot>".length).replace(/^\//, "") }];
  }
  if (pattern === "codeRoots" || pattern.startsWith("codeRoots/")) {
    const rel = pattern === "codeRoots" ? "**" : pattern.slice("codeRoots/".length);
    return scope.codeRoots.map((base) => ({ base, rel }));
  }
  if (pattern === "knowledge" || pattern.startsWith("knowledge/")) {
    // module layout เก็บ module ใต้ docsRoot/module/<module> (DES-011/014) — allow `<module>` ต้องตามโครงจริง
    const modRel = scope.docsLayout === "module" ? `module/${scope.module}` : scope.module;
    const rel = (pattern === "knowledge" ? "<module>" : pattern.slice("knowledge/".length)).split("<module>").join(modRel);
    return [{ base: scope.docsRoot, rel }];
  }
  throw new SessionAuditError(
    `รูป allow/deny ไม่รู้จัก ${JSON.stringify(pattern)} — รับเฉพาะ knowledge/… · codeRoots/… · <packRoot>/… (routing.yaml — fail-closed)`,
  );
}

function coversPattern(bases: { base: string; rel: string }[], abs: string): boolean {
  for (const { base, rel } of bases) {
    // จำกัดที่ inside base เท่านั้น — rel นอกรากขึ้นต้น ".." และ `**` ต้องไม่ครอบมัน (fail-closed)
    if (!isInside(base, abs)) continue;
    if (globToRegExp(rel).test(relFrom(base, abs))) return true;
  }
  return false;
}

// claim เป็น path สัมพัทธ์ราก (DES-021 ข้อ 1: path ไฟล์ตรง หรือ <dir>/**) — เทียบกับรากที่เป็นได้ทั้งหมด:
// codeRoots → docsRoot → packRoot (Write paths ของ engineer สัมพัทธ์ codeRoot · ของ setup สัมพัทธ์ packRoot)
// claim รูป prefixed (กรณี claim = allow ของ role เอกสาร) ใช้การแปลงชุดเดียวกับ allow
const PREFIXED_CLAIM_RE = /^(knowledge(\/|$)|codeRoots(\/|$)|<packRoot>(\/|$))/;

function claimCandidates(entry: string, scope: PatternScope): string[] {
  if (PREFIXED_CLAIM_RE.test(entry)) {
    return patternBases(entry, scope).map(({ base, rel }) => path.resolve(base, rel));
  }
  return [...scope.codeRoots, scope.docsRoot, scope.packRoot].map((base) => path.resolve(base, entry));
}

function claimCovers(entry: string, abs: string, scope: PatternScope): boolean {
  if (PREFIXED_CLAIM_RE.test(entry)) {
    return coversPattern(patternBases(entry, scope), abs);
  }
  for (const base of [...scope.codeRoots, scope.docsRoot, scope.packRoot]) {
    if (!isInside(base, abs)) continue;
    if (globToRegExp(entry).test(relFrom(base, abs))) return true;
  }
  return false;
}

// --- universal deny ทุก role (DES-006) — `code/agent-team/**` (orchestrator home) ไม่มีข้อยกเว้น (risk #14) ---
export interface DenyPaths {
  orchestratorHome: string;
  staConfigPath: string;
}

export function universalDenyReason(abs: string, deny: DenyPaths): string | null {
  if (isInside(deny.orchestratorHome, abs)) {
    return `อยู่ใต้ orchestrator home — universal deny code/agent-team/** ไม่มีข้อยกเว้น (DES-006, risk #14): ${abs}`;
  }
  if (path.resolve(abs) === path.resolve(deny.staConfigPath)) {
    return `code\\sta-config.json อ่านอย่างเดียว — เขียนได้เฉพาะ setup prompt/task (DES-015): ${abs}`;
  }
  if (abs.split(/[\\/]+/).includes(".git")) {
    return `.git/** เขียนตรงห้ามเด็ดขาด (universal deny — DES-006/DES-016): ${abs}`;
  }
  return null;
}

// --- claim (DES-021 ข้อ 1) ---
export interface ClaimResolution {
  claim: string[];
  basis: "task-write-paths" | "role-allow";
}

// รูป claim ที่รับมีสองแบบเท่านั้น (DES-021 ข้อ 1): path ไฟล์ตรง หรือ <dir>/**
function assertClaimForm(entry: string): void {
  if (typeof entry !== "string" || entry.trim() === "") {
    throw new SessionAuditError(`claim ต้องเป็น string ไม่ว่าง — ได้รับ ${JSON.stringify(entry)}`);
  }
  if (/^([a-zA-Z]:)?[\\/]/.test(entry)) {
    throw new SessionAuditError(`claim ต้องเป็น path สัมพัทธ์ราก — ได้รับ ${JSON.stringify(entry)}`);
  }
  assertNoTraversal(entry, "claim");
  if (entry.endsWith("/**")) {
    const dir = entry.slice(0, -3);
    if (dir === "" || dir.endsWith("/")) {
      throw new SessionAuditError(`claim รูป <dir>/** ต้องมี dir — ได้รับ ${JSON.stringify(entry)}`);
    }
  } else if (entry.includes("*")) {
    throw new SessionAuditError(`claim รับเฉพาะ path ไฟล์ตรง หรือ <dir>/** — ได้รับ ${JSON.stringify(entry)}`);
  }
}

export function resolveClaim(input: {
  writePaths: readonly string[] | null | undefined; // จาก parseTaskFile (BE-018).writePaths — ไม่ระบุ = allow ทั้งหมดของ role
  allow: readonly string[];
  deny: readonly string[];
  scope: PatternScope;
  denyPaths: DenyPaths;
}): ClaimResolution {
  const wp = input.writePaths ?? [];
  if (wp.length === 0) {
    // role เอกสาร / engineer ที่ไม่ระบุ → claim = allow ของ role (DES-021 ข้อ 1)
    for (const p of input.allow) patternBases(p, input.scope); // fail-closed: allow รูปแปลกต้องแตกก่อนใช้
    return { claim: [...input.allow], basis: "role-allow" };
  }
  const bad: string[] = [];
  for (const entry of wp) {
    try {
      assertClaimForm(entry);
    } catch (e) {
      bad.push(`${entry} — ${(e as Error).message}`);
      continue;
    }
    // claim ต้องอยู่ใต้ allow ∩ ไม่ติด deny/universal deny เมื่อ resolve กับรากใดรากหนึ่ง — ไม่งั้น task hold plan-error
    // (candidate ใด candidate หนึ่งที่ "สะอาด" พอ — จุดเขียนจริงยังถูก audit ตัดสินอีกชั้นตอนจบ session)
    const candidates = claimCandidates(entry, input.scope);
    const clean = (abs: string): boolean =>
      input.allow.some((p) => coversPattern(patternBases(p, input.scope), abs)) &&
      !input.deny.some((p) => coversPattern(patternBases(p, input.scope), abs)) &&
      universalDenyReason(abs, input.denyPaths) === null;
    if (!candidates.some(clean)) {
      bad.push(`${entry} — อยู่นอก writeScope.allow ของ role หรือติด deny/universal deny (DES-021 ข้อ 1 → hold plan-error)`);
    }
  }
  if (bad.length > 0) {
    throw new ClaimError(`Write paths นอก write scope ของ role — ${bad.join(" · ")}`, [...wp]);
  }
  return { claim: [...wp], basis: "task-write-paths" };
}

// --- overlap แบบ prefix (DES-021 ข้อ 2) — scheduler (BE-011) ห้ามเริ่ม session ที่ claim ชนกับ session ที่กำลังรัน ---
export function claimsOverlap(a: readonly string[], b: readonly string[]): boolean {
  const norm = (entries: readonly string[]): string[][] =>
    entries.map((e) =>
      e
        .replace(/\/\*\*$/, "")
        .split(/[\\/]+/)
        .filter((s) => s !== ""),
    );
  const prefixOf = (x: string[], y: string[]): boolean => x.length <= y.length && x.every((seg, i) => seg === y[i]);
  const A = norm(a);
  const B = norm(b);
  return A.some((x) => B.some((y) => prefixOf(x, y) || prefixOf(y, x)));
}

// --- options ร่วมของ start/finish ---
export interface AuditOptions {
  home: string; // orchestratorHome — state/ + universal deny (DES-006)
  staConfigPath?: string; // default = <home>/../sta-config.json (แนวเดียวกับ config.ts DES-015)
  runId: string;
  sessionId: string;
  roots: readonly AuditRoot[]; // ทุก root ของ run — docsRoot ต้องอยู่ด้วย ไม่งั้น audit มองไม่เห็น plan/index.md
  docsRoot: string;
  docsLayout: DocsLayout;
  module: string;
  packRoot: string;
  claim: readonly string[]; // จาก packet.claim (resolveClaim แล้ว)
  manifestIgnore: readonly string[]; // registry.audit.manifestIgnore
  preimageMaxMB: number; // registry.audit.preimageMaxMB
  gitRunner?: GitRunner;
}

interface AuditContext {
  opts: AuditOptions;
  scope: PatternScope;
  denyPaths: DenyPaths;
  gitRunner: GitRunner;
  preimageDir: string;
}

function auditContext(opts: AuditOptions): AuditContext {
  if (!opts.roots.some((r) => path.resolve(r.path) === path.resolve(opts.docsRoot))) {
    throw new SessionAuditError(
      `docsRoot ไม่อยู่ใน roots ของ run — audit จะมองไม่เห็น plan/index.md (fail-closed — DES-021 ข้อ 3)`,
    );
  }
  const scope: PatternScope = {
    docsRoot: opts.docsRoot,
    codeRoots: opts.roots.filter((r) => r.rootKind === "target").map((r) => r.path),
    packRoot: opts.packRoot,
    module: opts.module,
    docsLayout: opts.docsLayout,
  };
  return {
    opts,
    scope,
    denyPaths: {
      orchestratorHome: opts.home,
      staConfigPath: opts.staConfigPath ?? path.resolve(opts.home, "..", "sta-config.json"),
    },
    gitRunner: opts.gitRunner ?? defaultGitRunner(),
    preimageDir: path.join(ensureSessionDir(opts.home, opts.runId, opts.sessionId), "preimage"),
  };
}

// --- snapshot ต่อ root (DES-021 ข้อ 3) ---
interface Collected {
  hash: Map<string, string>; // abs path → sha256
  rootOf: Map<string, { rootIndex: number; rel: string }>;
  unreadable: string[];
  fallback: boolean; // git root ที่ต้อง fallback manifest กลางทาง (repo เสีย — DES-006)
  rootMissing: boolean; // รากไม่มีจริงบนดิสก์ตอนเดินไฟล์
  notes: string[];
}

// mode ของ session: "git" เมื่อทุก root เป็น git mode และไม่มี fallback — root ใดเป็น manifest/fallback →
// ทั้ง session นับ manifest (ค่าเดียวตาม data-model · ตัดสินแบบ conservative)
function auditModeOf(roots: readonly AuditRoot[], c: Collected): "git" | "manifest" {
  return roots.every((r) => r.auditMode === "git") && !c.fallback ? "git" : "manifest";
}
function auditPartialOf(c: Collected): boolean {
  return c.fallback || c.rootMissing || c.unreadable.length > 0;
}

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function isIgnored(rel: string, isDir: boolean, ignore: readonly string[]): boolean {
  for (const pat of ignore) {
    if (globToRegExp(pat).test(rel)) return true;
    // `x/**` ต้องตัด x ทั้งก้อนตั้งแต่เดินถึง x (prune ก่อนลงลึก)
    if (isDir && pat.endsWith("/**") && globToRegExp(pat.slice(0, -3)).test(rel)) return true;
  }
  return false;
}

function walkManifest(root: string, ignore: readonly string[], notes: string[]): { files: string[]; missing: boolean } {
  if (!existsSync(root) || !statDir(root)) {
    notes.push(`รากไม่มีจริง/ไม่ใช่ไดเรกทอรี — ข้ามรากนี้ + partial (DES-006 Fallback): ${root}`);
    return { files: [], missing: true };
  }
  const out: string[] = [];
  const walk = (rel: string): void => {
    const abs = rel === "" ? root : path.join(root, rel);
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const r = rel === "" ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) {
        if (!isIgnored(r, true, ignore)) walk(r);
      } else if (e.isFile() && !isIgnored(r, false, ignore)) {
        out.push(r);
      }
    }
  };
  walk("");
  return { files: out.sort(), missing: false };
}

function statDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function collect(ctx: AuditContext): Collected {
  const out: Collected = { hash: new Map(), rootOf: new Map(), unreadable: [], fallback: false, rootMissing: false, notes: [] };
  ctx.opts.roots.forEach((root, rootIndex) => {
    let files: string[] | null = null;
    if (root.auditMode === "git") {
      // read-only ผ่าน argv array เท่านั้น (scope BE-008) — ห้าม shell
      const r = ctx.gitRunner(["-C", root.path, "ls-files", "-co", "--exclude-standard"], root.path);
      if (r.status === 0) {
        files = r.stdout.split(/\r?\n/).filter((s) => s.trim() !== "").sort();
      } else {
        // repo เสียกลาง run → manifest ของ root นั้น + partial (DES-006)
        out.fallback = true;
        out.notes.push(`git ls-files ล้มเหลว (status ${r.status}) ที่ ${root.path} → fallback manifest + partial (DES-006)`);
      }
    }
    if (files === null) {
      const walked = walkManifest(root.path, ctx.opts.manifestIgnore, out.notes);
      files = walked.files;
      if (walked.missing) out.rootMissing = true;
    }
    for (const rel of files) {
      const abs = path.resolve(root.path, rel);
      let h: string;
      try {
        h = sha256File(abs);
      } catch {
        out.unreadable.push(abs);
        out.notes.push(`อ่านไฟล์เพื่อ hash ไม่ได้ (ไฟล์ล็อก/สิทธิ์) → partial (DES-021 Errors): ${abs}`);
        continue;
      }
      out.hash.set(abs, h);
      out.rootOf.set(abs, { rootIndex, rel });
    }
  });
  return out;
}

function preimageFileFor(ctx: AuditContext, abs: string): string | null {
  const roots = ctx.opts.roots;
  for (const [i, root] of roots.entries()) {
    if (!isInside(root.path, abs)) continue;
    const rel = relFrom(root.path, abs);
    assertNoTraversal(rel, "preimage rel");
    return path.join(ctx.preimageDir, `root-${i}`, ...rel.split("/"));
  }
  return null;
}

function copyPreimage(ctx: AuditContext, abs: string): string | null {
  const target = preimageFileFor(ctx, abs);
  if (!target) return null;
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(abs)); // binary-safe
  return target;
}

function writeAtomic(file: string, data: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(2).toString("hex")}`;
  writeFileSync(tmp, data, "utf8");
  renameSync(tmp, file);
}

function planIndexPath(ctx: AuditContext): string {
  return path.join(moduleDir(ctx.opts.docsRoot, ctx.opts.docsLayout, ctx.opts.module), "plan", "index.md");
}

// --- เริ่ม session: snapshot + pre-image → persist (DES-021 ข้อ 3) ---
export interface StartAuditResult {
  sessionDir: string;
  snapshotPath: string;
  preimageDir: string;
  partial: boolean;
  notes: string[];
}

export function startSessionAudit(opts: AuditOptions): StartAuditResult {
  const ctx = auditContext(opts);
  const snap = collect(ctx);
  const planPath = planIndexPath(ctx);
  // ลำดับ pre-image: plan/index.md เสมอ (ไม่อยู่ใต้เพดาน — DES-021 ข้อ 3) แล้วไฟล์ใต้ claim ตามเพดาน
  const pre: string[] = [];
  if (snap.rootOf.has(planPath)) pre.push(planPath);
  let budget = opts.preimageMaxMB * 1024 * 1024;
  for (const abs of [...snap.hash.keys()].sort()) {
    if (abs === planPath) continue;
    if (!opts.claim.some((c) => claimCovers(c, abs, ctx.scope))) continue;
    let size = 0;
    try {
      size = readFileSync(abs).byteLength;
    } catch {
      continue; // unreadable ถูกจดใน collect แล้ว
    }
    if (size > budget) {
      snap.notes.push(`ข้าม pre-image — รวมเกินเพดาน audit.preimageMaxMB (${opts.preimageMaxMB} MB): ${abs}`);
      continue;
    }
    budget -= size;
    pre.push(abs);
  }
  for (const abs of pre) copyPreimage(ctx, abs);
  const sorted: Record<string, string> = {};
  for (const k of [...snap.hash.keys()].sort()) sorted[k] = snap.hash.get(k)!;
  const snapshotPath = path.join(ensureSessionDir(opts.home, opts.runId, opts.sessionId), "snapshot.json");
  // รูป {path → sha256} ตรงตาม data-model — pure map เพื่อโหลดซ้ำหลัง restart (AC-066)
  writeAtomic(snapshotPath, `${JSON.stringify(sorted, null, 2)}\n`);
  const partial = auditPartialOf(snap);
  return {
    sessionDir: path.dirname(snapshotPath),
    snapshotPath,
    preimageDir: ctx.preimageDir,
    partial,
    notes: snap.notes,
  };
}

// --- จบ session (หรือหลัง crash — snapshot.json ที่ persist ไว้ใช้ได้เสมอ, AC-066) ---
export interface FinishAuditOptions extends AuditOptions {
  role: Role;
  allow: readonly string[]; // writeScope.allow ของ role จาก routing.yaml (ผ่าน packet)
  deny: readonly string[];
  activeSessions?: readonly { sessionId: string; claim: readonly string[] }[]; // session อื่นที่ active ทับช่วง (driver คัด — DES-021 ข้อ 4)
  journal?: readonly { path: string; hash: string }[]; // self-write journal ของ orchestrator (BE-022)
  snapshotPath?: string; // default = snapshot.json ของ session dir
}

export interface SessionAuditResult {
  writeAudit: WriteAudit; // รูป SessionRecord.writeAudit ตรงตาม data-model — driver ใส่ลง record ได้ทันที
  notes: string[]; // เหตุ partial/unreadable (นอก writeAudit — ไว้ log/dashboard)
}

export function finishSessionAudit(opts: FinishAuditOptions): SessionAuditResult {
  // fail-closed กับค่าที่ผู้เรียกประกอบเอง (type บังคับอยู่แล้ว — กันเรียกจาก JS ที่ไม่ผ่าน typecheck)
  if (!Array.isArray(opts.allow) || !Array.isArray(opts.deny) || typeof opts.role !== "string" || opts.role.trim() === "") {
    throw new SessionAuditError("finishSessionAudit ต้องรับ role/allow/deny ครบ (FinishAuditOptions)");
  }
  const ctx = auditContext(opts);
  const sessionDir = ensureSessionDir(opts.home, opts.runId, opts.sessionId);
  const snapshotPath = opts.snapshotPath ?? path.join(sessionDir, "snapshot.json");
  if (!existsSync(snapshotPath)) {
    throw new SessionAuditError(
      `ไม่พบ snapshot.json: ${snapshotPath} — audit ตัดสินไม่ได้ (fail-closed — session ต้องเริ่มด้วย startSessionAudit)`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(snapshotPath, "utf8"));
  } catch {
    throw new SessionAuditError(`snapshot.json parse ไม่ผ่าน: ${snapshotPath} (fail-closed — DES-021)`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)
    || Object.values(parsed).some((v) => typeof v !== "string")) {
    throw new SessionAuditError(`snapshot.json ผิดรูป — ต้องเป็น {path → sha256} (fail-closed — DES-021): ${snapshotPath}`);
  }
  const before = new Map(Object.entries(parsed as Record<string, string>));
  const after = collect(ctx);

  const changed = [...new Set([...before.keys(), ...after.hash.keys()])]
    .filter((abs) => before.get(abs) !== after.hash.get(abs))
    .sort();

  const allowBases = opts.allow.flatMap((p) => patternBases(p, ctx.scope));
  const denyBases = opts.deny.flatMap((p) => patternBases(p, ctx.scope));
  // suspects = session ทุกตัวที่ active ทับช่วงและไม่ claim f รวม session นี้ (fail-closed — DES-021 ข้อ 4)
  const suspectsFor = (abs: string): string[] =>
    [...new Set([
      opts.sessionId,
      ...(opts.activeSessions ?? [])
        .filter((s) => !s.claim.some((c) => claimCovers(c, abs, ctx.scope)))
        .map((s) => s.sessionId),
    ])].sort();

  const touchedFiles: string[] = [];
  const violations: AuditViolation[] = [];
  for (const abs of changed) {
    const curHash = after.hash.get(abs);
    // (1) journal ของ orchestrator (path + hash หลังเขียน) → ข้าม (DES-021 ข้อ 4) — วางก่อน deny เพราะ
    //     state/ ของ orchestrator เองอยู่ใต้ universal deny ถ้ารากใดทับ home
    if (curHash !== undefined && opts.journal?.some((j) => path.resolve(j.path) === abs && j.hash === curHash)) continue;
    // (2) ใต้ claim ของ session อื่นที่ active ทับช่วง → ของ session นั้น (audit ของ session นั้นตัดสินต่อ)
    if (opts.activeSessions?.some((s) => s.claim.some((c) => claimCovers(c, abs, ctx.scope)))) continue;
    // (3) universal deny / deny ของ role / นอก allow → kind "write" (AC-007/052/060 — DES-006)
    const ud = universalDenyReason(abs, ctx.denyPaths);
    const denyHit = coversPattern(denyBases, abs);
    if (ud || denyHit || !coversPattern(allowBases, abs)) {
      const why = ud ?? (denyHit ? "อยู่ใน writeScope.deny ของ role (deny ชนะ — DES-006)" : "อยู่นอก writeScope.allow ของ role (AC-007 — DES-006)");
      violations.push({ kind: "write", path: abs, detail: `${why}`, suspects: suspectsFor(abs) });
      continue;
    }
    // (4) ใต้ claim ตัวเอง → touchedFiles
    if (opts.claim.some((c) => claimCovers(c, abs, ctx.scope))) {
      touchedFiles.push(abs);
      continue;
    }
    // (5) ใน allow แต่นอก claim → unclaimed-write + suspects (fail-closed — DES-021 ข้อ 4)
    violations.push({ kind: "unclaimed-write", path: abs, detail: `นอก claim ของ session (DES-021 ข้อ 4): ${abs}`, suspects: suspectsFor(abs) });
  }

  violations.push(...statusColumnViolations(ctx, opts, after));

  const diff = buildDiff(changed, ctx, after);
  writeAtomic(path.join(sessionDir, "diff.patch"), `${diff.lines.join("\n")}\n`);

  const partial = auditPartialOf(after);
  return {
    writeAudit: {
      mode: auditModeOf(ctx.opts.roots, after),
      partial,
      diffApprox: diff.diffApprox,
      changed,
      touchedFiles,
      violations,
      gitRefs: [], // ref audit = DES-016 (REQ-009 ไม่อยู่ R1 — BL-015/017)
    },
    notes: after.notes,
  };
}

// --- status column (AC-073 — DES-021 ข้อ 5) ---
const fmtStatus = (s: string | null): string => s ?? "(ค่านอก pending|verified|blocked)";

function statusColumnViolations(ctx: AuditContext, opts: FinishAuditOptions, after: Collected): AuditViolation[] {
  const planPath = planIndexPath(ctx);
  // journal ครอบ (path + hash หลังเขียน) → orchestrator เขียน Status เอง (BE-022) — ข้ามทั้งไฟล์ (AC-073)
  if (existsSync(planPath)) {
    const cur = sha256File(planPath);
    if (opts.journal?.some((j) => path.resolve(j.path) === planPath && j.hash === cur)) return [];
  }
  // pre-image ของ plan/index.md ถูกเก็บเสมอที่ root-<i ของ docsRoot> — หา จาก rootOf (deterministic)
  const ro = after.rootOf.get(planPath) ?? ctx.opts.roots.reduce<{ rootIndex: number; rel: string } | null>((acc, r, i) => {
    if (acc === null && path.resolve(r.path) === path.resolve(ctx.opts.docsRoot)) {
      return { rootIndex: i, rel: relFrom(ctx.opts.docsRoot, planPath) };
    }
    return acc;
  }, null);
  const preFile = ro ? path.join(ctx.preimageDir, `root-${ro.rootIndex}`, ...ro.rel.split("/")) : null;
  const preExists = preFile !== null && existsSync(preFile);
  const postExists = existsSync(planPath);
  const violation = (detail: string): AuditViolation => ({ kind: "status-write", path: planPath, detail, suspects: [] });
  if (!preExists && !postExists) return [];
  if (preExists && !postExists) {
    return [violation("plan/index.md ถูกลบ — session ห้ามลบ (fail-closed — DES-021 ข้อ 5)")];
  }
  if (preExists && postExists && sha256File(preFile!) === sha256File(planPath)) return [];

  const rowsOf = (text: string): Map<string, string | null> => {
    const m = new Map<string, string | null>();
    for (const r of parsePlanIndex(text).rows) m.set(r.id, r.status);
    return m;
  };
  const pre = preExists ? rowsOf(readFileSync(preFile!, "utf8")) : new Map<string, string | null>();
  const post = rowsOf(readFileSync(planPath, "utf8"));
  const out: AuditViolation[] = [];
  for (const [id, postStatus] of post) {
    if (!pre.has(id)) {
      if (opts.role === "project-manager" && postStatus === "pending") continue; // PM เพิ่มแถวใหม่ pending ได้ (DES-021 ข้อ 5)
      out.push(
        violation(
          postStatus === null
            ? `${id}: แถวใหม่มี Status นอก pending|verified|blocked (DES-021 ข้อ 5)`
            : `แถวใหม่ ${id} โดย ${opts.role} — เฉพาะ PM เพิ่มแถวได้และต้อง pending (DES-021 ข้อ 5)`,
        ),
      );
      continue;
    }
    const preStatus = pre.get(id) ?? null;
    if (preStatus !== postStatus) {
      out.push(violation(`${id}: Status ${fmtStatus(preStatus)} → ${fmtStatus(postStatus)} — session ห้ามเขียน Status (AC-073, รวม ${opts.role})`));
    }
  }
  // แถวหายจากตาราง = Status ถูกลบพร้อมแถว — ไม่มีใน design ตรง ๆ แต่ fail-closed ตามโจทย์ BE-008 (ตีความ — ดู handoff)
  for (const id of pre.keys()) {
    if (!post.has(id)) out.push(violation(`${id}: แถวถูกลบจากตาราง Tasks — Status หายพร้อมแถว (fail-closed — DES-021 ข้อ 5)`));
  }
  return out;
}

// --- diff สำหรับ review/size (DES-021 ข้อ 6) → diff.patch (BE-021 อ่านขนาดจาก numstat) ---
// กิ่ง fallback (ไม่มี pre-image) ทุกกิ่งตั้ง diffApprox: true — นับเกิน = ปลอดภัย (DES-021 ข้อ 6 pin ตรงตัว) ·
// `git diff HEAD` ไม่แสดงไฟล์ untracked → ไฟล์ใหม่ของ session ต้องรวมเข้า numstat เอง (added = ทุกบรรทัด)
// จากรายชื่อ untracked (git ls-files --others — read-only ผ่าน argv array เดิม) เพื่อให้ขนาด/จำนวนไฟล์
// ใน diff.patch ไม่ต่ำกว่าจริงเงียบ ๆ
function buildDiff(changed: string[], ctx: AuditContext, after: Collected): { diffApprox: boolean; lines: string[] } {
  const lines = [
    `# diff.patch — DES-021 ข้อ 6 — session ${ctx.opts.sessionId} — ${new Date().toISOString()}`,
    `# numstat: added<TAB>deleted<TAB>path จาก git diff (read-only) — BE-021 อ่านขนาดจาก 2 คอลัมน์แรก`,
    `# (คอลัมน์ path ของ --no-index อาจเป็นรูป "old" => "new") · บรรทัด # approx/# deleted = ไม่มี diff แม่นยำ (diffApprox: true)`,
    `# numstat ที่ไม่มี pre-image (มาจาก git diff HEAD หรือนับไฟล์ใหม่เอง) = โดยประมาณ — diffApprox: true เสมอ (นับเกิน = ปลอดภัย)`,
  ];
  let diffApprox = false;
  const pushApprox = (abs: string, why: string): void => {
    lines.push(`# approx: ${abs} (${why})`);
    diffApprox = true;
  };
  // ชุดไฟล์ untracked ต่อ repoTop — ถาม git ครั้งเดียว lazy (read-only ls-files ผ่าน argv array — ไม่มี shell)
  const untrackedCache = new Map<string, Set<string>>();
  const untrackedOf = (repoTop: string): Set<string> => {
    let s = untrackedCache.get(repoTop);
    if (s === undefined) {
      s = new Set();
      const r = ctx.gitRunner(["-C", repoTop, "ls-files", "--others", "--exclude-standard"], repoTop);
      if (r.status === 0) {
        for (const l of r.stdout.split(/\r?\n/)) if (l.trim() !== "") s.add(l);
      }
      untrackedCache.set(repoTop, s);
    }
    return s;
  };
  // ไฟล์ใหม่ (untracked) ไม่มีอะไรให้ diff กับ HEAD — นับทุกบรรทัดเป็น added (deleted = 0) — ไม่ต่ำกว่าจริง
  const untrackedNumstat = (abs: string, rel: string): string | null => {
    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      return null;
    }
    const added = text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
    return `${added}\t0\t${rel}`;
  };
  for (const abs of changed) {
    const preFile = preimageFileFor(ctx, abs);
    const preOk = preFile !== null && existsSync(preFile);
    const curOk = existsSync(abs);
    if (preOk && curOk) {
      const r = ctx.gitRunner(["diff", "--no-index", "--numstat", preFile!, abs], ctx.opts.home);
      if (r.status === 0 || r.status === 1) {
        // exit 1 = มีความต่าง (ปกติสำหรับ --no-index) — ไม่ใช่ error
        lines.push(...r.stdout.split(/\r?\n/).filter((s) => s.trim() !== ""));
      } else {
        pushApprox(abs, `git diff ล้มเหลว status ${r.status}`);
      }
      continue;
    }
    if (preOk && !curOk) {
      lines.push(`# deleted: ${abs}`);
      diffApprox = true;
      continue;
    }
    const root = ctx.opts.roots.find((r) => isInside(r.path, abs));
    if (!preOk && curOk && root?.auditMode === "git" && root.repoTop !== null && isInside(root.repoTop, abs)) {
      // ไม่มี pre-image → ไม่มี diff แม่นยำ — ทุกกิ่งในนี้ diffApprox: true (DES-021 ข้อ 6: นับเกิน = ปลอดภัย)
      diffApprox = true;
      const rel = relFrom(root.repoTop, abs);
      if (untrackedOf(root.repoTop).has(rel)) {
        // git diff HEAD ไม่แสดงไฟล์ untracked — ไฟล์ใหม่ของ session ห้ามหายเงียบจาก numstat:
        // นับทุกบรรทัดเป็น added (deleted = 0) — conservative ไม่ต่ำกว่าจริง
        const ns = untrackedNumstat(abs, rel);
        if (ns === null) lines.push(`# approx: ${abs} (ไฟล์ใหม่ untracked — อ่านไฟล์เพื่อนับบรรทัดไม่ได้)`);
        else {
          lines.push(`# approx: ${abs} (ไฟล์ใหม่ untracked — added = ทุกบรรทัด)`);
          lines.push(ns);
        }
        continue;
      }
      const r = ctx.gitRunner(["-C", root.repoTop, "diff", "HEAD", "--numstat", "--", rel], root.repoTop);
      if (r.status === 0 || r.status === 1) {
        const rows = r.stdout.split(/\r?\n/).filter((s) => s.trim() !== "");
        if (rows.length === 0) lines.push(`# approx: ${abs} (git diff HEAD ว่าง — ไฟล์ไม่ต่างจาก HEAD/untracked)`);
        else lines.push(...rows);
      } else {
        lines.push(`# approx: ${abs} (git diff HEAD ล้มเหลว status ${r.status})`);
      }
      continue;
    }
    pushApprox(abs, !preOk && !curOk ? "ไฟล์หายและไม่มี pre-image" : "ไม่มี pre-image และไม่อยู่ใน git repo");
  }
  return { diffApprox, lines };
}
