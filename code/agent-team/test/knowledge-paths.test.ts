// BE-002 — node:test: knowledge path + template resolver (DES-011/014, AC-011/AC-012)
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { defaultOrchestratorHome, loadAppConfig } from "../src/core/config.ts";
import {
  DOC_UNITS,
  KnowledgePathError,
  assertModuleName,
  assertNoTraversal,
  assertUnderRoots,
  isInside,
  moduleDir,
  resolveDocPath,
  resolveTemplatePath,
  type DocUnit,
} from "../src/core/knowledge-paths.ts";

const R = path.resolve("/k"); // docsRoot สมมติ (ไม่แตะดิสก์)

test("moduleDir ถูกทุก layout ที่ registry รับ", () => {
  assert.equal(moduleDir(R, "split", "agent-team"), path.join(R, "agent-team"));
  assert.equal(moduleDir(R, "flat", "agent-team"), path.join(R, "agent-team"));
  assert.equal(moduleDir(R, "module", "agent-team"), path.join(R, "module", "agent-team"));
  assert.throws(() => moduleDir(R, "weird" as never, "a"), KnowledgePathError);
});

test("resolveDocPath: split = ไฟล์ย่อยตามหมวด", () => {
  const m = path.join(R, "agent-team");
  assert.equal(resolveDocPath(R, "split", "agent-team", { unit: "requirement-index" }), path.join(m, "requirement", "index.md"));
  assert.equal(resolveDocPath(R, "split", "agent-team", { unit: "requirement-req", name: "req-005.md" }), path.join(m, "requirement", "req-005.md"));
  assert.equal(resolveDocPath(R, "split", "agent-team", { unit: "design-data-model" }), path.join(m, "design", "data-model.md"));
  assert.equal(resolveDocPath(R, "split", "agent-team", { unit: "qa-round", name: "round-2.md" }), path.join(m, "qa", "round-2.md"));
  assert.equal(resolveDocPath(R, "split", "agent-team", { unit: "backlog" }), path.join(m, "backlog.md"));
  assert.equal(resolveDocPath(R, "split", "agent-team", { unit: "module-index" }), path.join(m, "index.md"));
  assert.throws(() => resolveDocPath(R, "split", "agent-team", { unit: "plan-task" }), KnowledgePathError); // ขาด name
  assert.throws(() => resolveDocPath(R, "split", "agent-team", { unit: "plan-index", name: "x.md" }), KnowledgePathError);
});

test("resolveDocPath: flat/module = ไฟล์เดี่ยวต่อหมวด", () => {
  assert.equal(resolveDocPath(R, "flat", "m1", { unit: "design-des" }), path.join(R, "m1", "design.md"));
  assert.equal(resolveDocPath(R, "module", "m1", { unit: "plan-index" }), path.join(R, "module", "m1", "plan.md"));
  assert.equal(resolveDocPath(R, "flat", "m1", { unit: "security" }), path.join(R, "m1", "security.md"));
});

test("ชื่อ module ผิดรูปถูกปฏิเสธ", () => {
  for (const bad of ["", "..", "../x", "a/b", "a\\b", "A", "-a", "a_b", "a b", "a.b", "ก"]) {
    assert.throws(() => assertModuleName(bad), KnowledgePathError, bad);
    assert.throws(() => moduleDir(R, "split", bad), KnowledgePathError, bad);
  }
  assertModuleName("agent-team");
  assertModuleName("a1");
});

test("`..` ใน path/allow glob/ชื่อไฟล์ถูกปฏิเสธ", () => {
  for (const bad of ["../x", "a/../b", "a\\..\\b", "design/**/../x", ".."]) {
    assert.throws(() => assertNoTraversal(bad), KnowledgePathError, bad);
  }
  assertNoTraversal("design/**");
  assertNoTraversal("a..b/c");
  for (const name of ["../x.md", "a/b.md", "a\\b.md", "x", "..md", ""]) {
    assert.throws(() => resolveDocPath(R, "split", "m", { unit: "requirement-req", name }), KnowledgePathError, name);
  }
});

test("path ต้องอยู่ภายใต้ docsRoot/packRoot/codeRoots", () => {
  const roots = [R, path.resolve("/p")];
  assert.ok(isInside(R, path.join(R, "a", "b")));
  assert.ok(!isInside(R, path.resolve("/k2/a")));
  assert.equal(assertUnderRoots(path.join(R, "m", "x.md"), roots), path.join(R, "m", "x.md"));
  assert.throws(() => assertUnderRoots(path.resolve("/etc/passwd"), roots), KnowledgePathError);
  assert.throws(() => assertUnderRoots(path.join(R, "..", "x"), roots), KnowledgePathError);
});

test("template: ทุก unit ที่มี template resolve ไปไฟล์จริงใน templatesRoot (AC-012)", () => {
  const cfg = loadAppConfig();
  for (const unit of Object.keys(DOC_UNITS) as DocUnit[]) {
    if (unit === "module-index") continue;
    const p = resolveTemplatePath(cfg.registry.templatesRoot, unit);
    assert.ok(existsSync(p), `${unit} → ${p}`);
    assert.ok(isInside(cfg.registry.templatesRoot, p));
  }
  assert.throws(() => resolveTemplatePath(cfg.registry.templatesRoot, "module-index"), KnowledgePathError);
});

test("template: templatesRoot หาย / ไฟล์หาย → fail-closed", () => {
  assert.throws(() => resolveTemplatePath(path.resolve("/no/such/templates"), "oq"), /templatesRoot หาย/);
  assert.throws(() => resolveTemplatePath(path.resolve(defaultOrchestratorHome(), "config"), "oq"), /template ไม่พบ/);
});

test("resolve แล้วชี้ไฟล์จริงใน knowledge\\agent-team\\ (AC-011)", () => {
  const cfg = loadAppConfig();
  const kr = cfg.sta.knowledge_roots.find((k) => existsSync(path.join(k.path, "agent-team", "plan", "index.md")));
  assert.ok(kr, "ต้องมี knowledge root ที่มี agent-team ใน sta-config");
  const L = cfg.registry.docsLayout;
  assert.equal(L, "split");
  const at = (ref: Parameters<typeof resolveDocPath>[3]): string => resolveDocPath(kr.path, L, "agent-team", ref);
  for (const ref of [
    { unit: "module-index" },
    { unit: "requirement-index" },
    { unit: "requirement-scope" },
    { unit: "requirement-req", name: "req-005.md" },
    { unit: "design-index" },
    { unit: "design-data-model" },
    { unit: "design-des", name: "des-011.md" },
    { unit: "plan-index" },
    { unit: "plan-task", name: "be-002.md" },
    { unit: "oq-index" },
    { unit: "backlog" },
  ] as const) {
    const p = at(ref);
    assert.ok(existsSync(p), `${ref.unit} → ${p}`);
    assert.ok(isInside(kr.path, p));
  }
});
