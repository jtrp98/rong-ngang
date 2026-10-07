// BE-002 — knowledge path + template resolver (DES-011, DES-014)
// resolve docsRoot/docsLayout → path ของ module/เอกสาร/template อย่างปลอดภัยต่อ path (fail-closed)
// ไม่อ่าน/เขียนเอกสารจริง — คืนเฉพาะ path (resolve id → ไฟล์ = BE-020)
import { existsSync, statSync } from "node:fs";
import path from "node:path";

export type DocsLayout = "split" | "flat" | "module";

export class KnowledgePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgePathError";
  }
}

// DES-011: kebab-name ที่ปลอดภัยต่อ path
const MODULE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
// ชื่อไฟล์ย่อยใน split layout (req-001.md, round-1.md, UX-001-x.md ฯลฯ) — ไม่มี separator / ..
const FILE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;

export function assertModuleName(name: string): void {
  if (typeof name !== "string" || !MODULE_NAME_RE.test(name)) {
    throw new KnowledgePathError(`module name ไม่ถูกรูป ${JSON.stringify(name)} — ต้องตรง ^[a-z0-9][a-z0-9-]*$ (DES-011)`);
  }
}

// ปฏิเสธ `..` เป็น segment ใน path/allow glob (ทั้ง / และ \)
export function assertNoTraversal(p: string, label = "path"): void {
  if (typeof p !== "string" || p === "") throw new KnowledgePathError(`${label} ต้องเป็น string ไม่ว่าง`);
  if (p.includes("\0")) throw new KnowledgePathError(`${label} มี NUL byte`);
  if (p.split(/[\\/]+/).includes("..")) {
    throw new KnowledgePathError(`${label} ห้ามมี ".." (path traversal — DES-011): ${p}`);
  }
}

// p อยู่ภายใต้ root (หรือเท่ากับ root) หลัง resolve
export function isInside(root: string, p: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(p));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// path ต้อง resolve ภายใต้ root ใด root หนึ่ง (docsRoot/packRoot/codeRoots — DES-011) ไม่งั้นปฏิเสธ
export function assertUnderRoots(p: string, roots: readonly string[], label = "path"): string {
  assertNoTraversal(p, label);
  const abs = path.resolve(p);
  if (!roots.some((r) => isInside(r, abs))) {
    throw new KnowledgePathError(`${label} อยู่นอก docsRoot/packRoot/codeRoots: ${abs}`);
  }
  return abs;
}

function joinInside(root: string, ...segs: string[]): string {
  for (const s of segs) assertNoTraversal(s, "segment");
  const out = path.resolve(root, ...segs);
  if (!isInside(root, out)) throw new KnowledgePathError(`path หลุดนอก ${root}: ${out}`);
  return out;
}

// ไดเรกทอรี module ตาม layout: split|flat = <docsRoot>\<module> · module = <docsRoot>\module\<module> (policies\documentation.md:5)
export function moduleDir(docsRoot: string, layout: DocsLayout, module: string): string {
  assertModuleName(module);
  if (layout === "split" || layout === "flat") return joinInside(docsRoot, module);
  if (layout === "module") return joinInside(docsRoot, "module", module);
  throw new KnowledgePathError(`docsLayout ไม่รู้จัก ${JSON.stringify(layout)}`);
}

// หน่วยเอกสาร → { หมวด, template }. template = <templatesRoot>\<template>.md
interface UnitDef {
  category: string; // ชื่อหมวด (โฟลเดอร์ใน split · ชื่อไฟล์ <category>.md ใน flat/module)
  fixedFile?: string; // ไฟล์ตายตัวใน split · ไม่มี = ต้องระบุ name
  template: string;
}
export const DOC_UNITS = {
  "module-index": { category: "index", template: "", fixedFile: "index.md" },
  "requirement-index": { category: "requirement", fixedFile: "index.md", template: "requirement-index" },
  "requirement-scope": { category: "requirement", fixedFile: "scope.md", template: "requirement-scope" },
  "requirement-req": { category: "requirement", template: "requirement-req" },
  "design-index": { category: "design", fixedFile: "index.md", template: "design-index" },
  "design-data-model": { category: "design", fixedFile: "data-model.md", template: "design-data-model" },
  "design-des": { category: "design", template: "design-des" },
  "plan-index": { category: "plan", fixedFile: "index.md", template: "plan-index" },
  "plan-task": { category: "plan", template: "plan-task" },
  "test-plan": { category: "test-plan", template: "test-plan" },
  "review-round": { category: "review", template: "review-round" },
  "qa-round": { category: "qa", template: "qa-round" },
  "oq-index": { category: "open-questions", fixedFile: "index.md", template: "oq-index" },
  oq: { category: "open-questions", template: "oq" },
  "ux-artifact": { category: "uxui", template: "ux-artifact" },
  security: { category: "security", fixedFile: "security.md", template: "security" },
  deploy: { category: "deploy", fixedFile: "deploy.md", template: "deploy" },
  backlog: { category: "backlog", fixedFile: "backlog.md", template: "backlog" },
} as const satisfies Record<string, UnitDef>;
export type DocUnit = keyof typeof DOC_UNITS;

// หมวดที่เป็นไฟล์เดี่ยวที่ root ของ module เสมอ (ไม่แตกเป็นโฟลเดอร์ แม้ใน split)
const ROOT_FILE_UNITS: readonly DocUnit[] = ["security", "deploy", "backlog", "module-index"];

export interface DocRef {
  unit: DocUnit;
  name?: string; // ชื่อไฟล์ย่อย เช่น "req-001.md" — จำเป็นเมื่อ unit ไม่มี fixedFile (split เท่านั้น)
}

// path ของเอกสารหนึ่งฉบับ — split: <module>\<หมวด>\<ไฟล์>.md · flat/module: <module>\<หมวด>.md (ไฟล์เดี่ยว)
export function resolveDocPath(docsRoot: string, layout: DocsLayout, module: string, ref: DocRef): string {
  const def: UnitDef | undefined = (DOC_UNITS as Record<string, UnitDef>)[ref.unit];
  if (!def) throw new KnowledgePathError(`unit เอกสารไม่รู้จัก ${JSON.stringify(ref.unit)}`);
  const dir = moduleDir(docsRoot, layout, module);
  if (ROOT_FILE_UNITS.includes(ref.unit)) {
    return joinInside(dir, def.fixedFile as string);
  }
  if (layout !== "split") {
    // flat/module: หมวดเดียว = ไฟล์เดียว (ไม่มีไฟล์ย่อย)
    return joinInside(dir, `${def.category}.md`);
  }
  const file = def.fixedFile ?? ref.name;
  if (file === undefined) throw new KnowledgePathError(`unit ${ref.unit} ต้องระบุ name (ชื่อไฟล์ย่อย เช่น req-001.md)`);
  if (def.fixedFile !== undefined && ref.name !== undefined && ref.name !== def.fixedFile) {
    throw new KnowledgePathError(`unit ${ref.unit} เป็นไฟล์ตายตัว ${def.fixedFile} — ไม่รับ name ${JSON.stringify(ref.name)}`);
  }
  if (!FILE_NAME_RE.test(file)) throw new KnowledgePathError(`ชื่อไฟล์ไม่ถูกรูป ${JSON.stringify(file)}`);
  return joinInside(dir, def.category, file);
}

// template ของเอกสารใหม่ (AC-012) — fail-closed: templatesRoot/ไฟล์ template หาย → ปฏิเสธ
export function resolveTemplatePath(templatesRoot: string, unit: DocUnit): string {
  const def: UnitDef | undefined = (DOC_UNITS as Record<string, UnitDef>)[unit];
  if (!def) throw new KnowledgePathError(`unit เอกสารไม่รู้จัก ${JSON.stringify(unit)}`);
  if (def.template === "") throw new KnowledgePathError(`unit ${unit} ไม่มี template ใน templatesRoot`);
  if (!existsSync(templatesRoot) || !statSync(templatesRoot).isDirectory()) {
    throw new KnowledgePathError(`templatesRoot หาย: ${templatesRoot} — ปฏิเสธเอกสารใหม่ (fail-closed — DES-011)`);
  }
  const file = joinInside(templatesRoot, `${def.template}.md`);
  if (!existsSync(file)) throw new KnowledgePathError(`template ไม่พบ: ${file} — ปฏิเสธเอกสารใหม่ (fail-closed)`);
  return file;
}
