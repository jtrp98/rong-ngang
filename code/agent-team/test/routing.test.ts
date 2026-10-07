// BE-005 — node:test: role routing role → camp (DES-005 — REQ-002 AC-004/005) · fixture แก้ routing.yaml ใน temp เท่านั้น ไม่แตะ config จริง
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import {
  ConfigError,
  KNOWN_ROLES,
  defaultOrchestratorHome,
  loadAppConfig,
  type RoutingConfig,
} from "../src/core/config.ts";
import { CampResolutionError, resolveCamp } from "../src/core/routing.ts";

const realHome = defaultOrchestratorHome();
const realSta = path.resolve(realHome, "..", "sta-config.json");
const real = loadAppConfig(); // routing ของจริง — ผ่าน validator ของ config store แล้ว (BE-001)

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "be005-"));
after(() => rmSync(tmpRoot, { recursive: true, force: true }));

let n = 0;
// สำเนา config\ + sta-config ลง temp เพื่อแก้ routing.yaml ได้โดยไม่แตะของจริง (รูปเดียวกับ config.test.ts/tiers.test.ts)
function sandbox(): { home: string; sta: string; cfg: (f: string) => string } {
  const home = path.join(tmpRoot, `h${++n}`);
  mkdirSync(home, { recursive: true });
  cpSync(path.join(realHome, "config"), path.join(home, "config"), { recursive: true });
  const sta = path.join(home, "sta-config.json");
  const raw = JSON.parse(readFileSync(realSta, "utf8"));
  raw.main_root = tmpRoot;
  raw.knowledge_roots = [{ name: "k", path: tmpRoot, targets: [{ name: "t", path: tmpRoot }] }];
  writeFileSync(sta, JSON.stringify(raw));
  return { home, sta, cfg: (f) => path.join(home, "config", f) };
}

// routing fixture — defaultCamp codex + route เดียว เพื่อเห็นทั้ง 3 ชั้นของ precedence ใน fixture เดียว
function routingFixture(): RoutingConfig {
  return {
    defaultCamp: "codex",
    role_routes: {
      "backend-engineer": { camp: "claude", model: null, effort: null, writePaths: { allow: ["codeRoots/**"], deny: [] } },
    },
  };
}

test("precedence 3 ชั้น: run-override > role-route > default — basis รายงานถูกชั้น (AC-005)", () => {
  const f = routingFixture();
  assert.deepEqual(resolveCamp(f, { role: "backend-engineer", runOverrideCamp: "antigravity" }), {
    camp: "antigravity",
    basis: "run-override",
  });
  // override ชนะแม้ role ไม่มี route ก็ตาม
  assert.deepEqual(resolveCamp(f, { role: "ghost", runOverrideCamp: "claude" }), { camp: "claude", basis: "run-override" });
  assert.deepEqual(resolveCamp(f, { role: "backend-engineer" }), { camp: "claude", basis: "role-route" });
  assert.deepEqual(resolveCamp(f, { role: "ghost" }), { camp: "codex", basis: "default" });
});

test("routing.yaml จริง (OQ-2): ทุก role route ที่ claude — basis role-route · role ไม่มี route → defaultCamp basis default", () => {
  for (const role of KNOWN_ROLES) {
    assert.deepEqual(resolveCamp(real.routing, { role }), { camp: "claude", basis: "role-route" }, role);
  }
  assert.deepEqual(resolveCamp(real.routing, { role: "ghost" }), { camp: "claude", basis: "default" });
});

test("AC-004: แก้ routing.yaml ย้าย role หนึ่งไป codex → camp เปลี่ยนโดยไม่แก้โค้ด — ผลที่ถือไว้แล้ว (freeze) ไม่เปลี่ยนตาม", () => {
  const s = sandbox();
  const before = loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta });
  const held = resolveCamp(before.routing, { role: "backend-engineer" });
  assert.deepEqual(held, { camp: "claude", basis: "role-route" });

  const text = readFileSync(s.cfg("routing.yaml"), "utf8");
  const next = text.replace(/(^  backend-engineer:\r?\n    camp: )claude/m, "$1codex");
  assert.notEqual(next, text); // ต้องแทนที่ route ของ backend-engineer สำเร็จ
  writeFileSync(s.cfg("routing.yaml"), next);

  const reloaded = loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta });
  assert.deepEqual(resolveCamp(reloaded.routing, { role: "backend-engineer" }), { camp: "codex", basis: "role-route" });
  assert.deepEqual(resolveCamp(reloaded.routing, { role: "reviewer" }), { camp: "claude", basis: "role-route" }); // role อื่นไม่กระทบ
  assert.deepEqual(held, { camp: "claude", basis: "role-route" }); // selection ที่ถือไว้แล้วไม่ถูกแตะ
});

test("camp ไม่รู้จัก → ปฏิเสธ (fail-closed): override ไม่รู้จัก/ว่าง · route camp ไม่รู้จัก · defaultCamp ไม่รู้จัก/ขาด", () => {
  const f = routingFixture();
  assert.throws(
    () => resolveCamp(f, { role: "backend-engineer", runOverrideCamp: "gemini" }),
    (e: unknown) => e instanceof CampResolutionError && /override/.test(e.message) && /gemini/.test(e.message),
  );
  assert.throws(
    () => resolveCamp(f, { role: "backend-engineer", runOverrideCamp: "" }),
    CampResolutionError,
  );
  const badRoute: RoutingConfig = {
    ...f,
    role_routes: {
      "backend-engineer": { camp: "opencode" as never, model: null, effort: null, writePaths: { allow: ["codeRoots/**"], deny: [] } },
    },
  };
  assert.throws(
    () => resolveCamp(badRoute, { role: "backend-engineer" }),
    (e: unknown) => e instanceof CampResolutionError && /role_routes\["backend-engineer"\]\.camp/.test(e.message),
  );
  const badDefault: RoutingConfig = { ...f, defaultCamp: "gemini" as never };
  assert.throws(
    () => resolveCamp(badDefault, { role: "ghost" }),
    (e: unknown) => e instanceof CampResolutionError && /defaultCamp/.test(e.message) && /gemini/.test(e.message),
  );
  // role ไม่มี route และ defaultCamp ขาด → ไม่มีชั้นไหนให้คำตอบ → ปฏิเสธ (ไม่เดาแทน)
  const noDefault: RoutingConfig = { defaultCamp: undefined as never, role_routes: {} };
  assert.throws(
    () => resolveCamp(noDefault, { role: "ghost" }),
    (e: unknown) => e instanceof CampResolutionError && /defaultCamp/.test(e.message) && /ghost/.test(e.message),
  );
});

test("camp ไม่รู้จักใน routing.yaml → ปฏิเสธตอน validate ก่อนเริ่ม run (ConfigError ระบุไฟล์ — BE-001)", () => {
  const s = sandbox();
  const text = readFileSync(s.cfg("routing.yaml"), "utf8");
  const next = text.replace(/(^  backend-engineer:\r?\n    camp: )claude/m, "$1gemini");
  assert.notEqual(next, text);
  writeFileSync(s.cfg("routing.yaml"), next);
  assert.throws(
    () => loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta }),
    (e: unknown) => e instanceof ConfigError && e.file === s.cfg("routing.yaml") && /gemini/.test(e.message),
  );
});
