// BE-004 — node:test: tier engine (DES-004 — REQ-004 AC-008/009/010) · fixture สร้างใน test เท่านั้น ไม่แตะ config จริง
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import {
  defaultOrchestratorHome,
  loadAppConfig,
  type CampName,
  type RoutingConfig,
  type TiersConfig,
} from "../src/core/config.ts";
import {
  ModelPolicyResolutionError,
  formatModelPolicyBasis,
  resolveEffectiveModelPolicy,
  resolveTierBinding,
} from "../src/core/tiers.ts";

const realHome = defaultOrchestratorHome();
const realSta = path.resolve(realHome, "..", "sta-config.json");
const real = loadAppConfig(); // tiers/routing ของจริง — ผ่าน validator ของ config store แล้ว (BE-001)

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "be004-"));
after(() => rmSync(tmpRoot, { recursive: true, force: true }));

let n = 0;
// สำเนา config\ + sta-config ลง temp เพื่อแก้ tiers.yaml ได้โดยไม่แตะของจริง (รูปเดียวกับ config.test.ts)
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

// routing fixture — override model/effort แยก field ตาม routing.yaml (null = ไม่ override)
function routeFixture(model: string | null, effort: string | null): RoutingConfig {
  return {
    defaultCamp: "claude",
    role_routes: { "backend-engineer": { camp: "claude", model, effort, writePaths: { allow: ["codeRoots/**"], deny: [] } } },
  };
}

const throwsPolicy = (re: RegExp) => (e: unknown): boolean => e instanceof ModelPolicyResolutionError && re.test(e.message);

test("precedence: ไม่มี override/task tier → role default tier ของ role นั้น ตาม camp ที่เลือก (ครบ 3 camp)", () => {
  const be = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "claude" });
  assert.deepEqual(be, {
    model: "sonnet",
    effort: "medium",
    effectiveTier: "T5",
    modelBasis: "role-default-tier:T5",
    effortBasis: "role-default-tier:T5",
    diagnostics: [],
  });
  const sa = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "system-analyst", camp: "codex" });
  assert.equal(sa.model, "gpt-6.1-sol");
  assert.equal(sa.effort, "xhigh");
  assert.equal(sa.effectiveTier, "T2");
  const qa = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "qa-engineer", camp: "antigravity" });
  assert.deepEqual(qa, {
    model: "gemini-3.8-flash-medium",
    effort: null,
    effectiveTier: "T3",
    modelBasis: "role-default-tier:T3",
    effortBasis: "role-default-tier:T3",
    diagnostics: [],
  });
});

test("precedence: tier ที่ task cast ชนะ role default — model/effort มาจาก tier เดียวกัน + diagnostic เมื่อต่างจาก default", () => {
  const r = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "claude", taskTier: "T2" });
  assert.deepEqual(r, {
    model: "opus",
    effort: "high",
    effectiveTier: "T2",
    modelBasis: "task-tier:T2",
    effortBasis: "task-tier:T2",
    diagnostics: ["task Tier T2 overrides role default T5 for backend-engineer"],
  });
  const same = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "claude", taskTier: "T5" });
  assert.equal(same.effectiveTier, "T5");
  assert.equal(same.modelBasis, "task-tier:T5");
  assert.deepEqual(same.diagnostics, []); // tier เท่ากับ default → ไม่มี diagnostic
});

test("precedence: override จาก routing.yaml แยก field — override model ล้วน → effort ตกเป็น runtime default ไม่ดึง effort ของ tier เดิม", () => {
  // override model ล้วน (กติกา 2 — DES-004): model จาก operator, effort = null (runtime default) แม้ tier T3 มี effort medium
  const m = resolveEffectiveModelPolicy(real.tiers, routeFixture("opus", null), { role: "backend-engineer", camp: "claude", taskTier: "T3" });
  assert.deepEqual(m, {
    model: "opus",
    effort: null,
    effectiveTier: "T3",
    modelBasis: "operator-model",
    effortBasis: "runtime-default",
    diagnostics: ["task Tier T3 overrides role default T5 for backend-engineer"],
  });
  // override effort ล้วน — model จาก Tier ยังใช้ได้ (ค่าที่ชนะแยกกันระหว่าง model กับ effort)
  const e = resolveEffectiveModelPolicy(real.tiers, routeFixture(null, "xhigh"), { role: "backend-engineer", camp: "claude", taskTier: "T3" });
  assert.deepEqual(e, {
    model: "opus",
    effort: "xhigh",
    effectiveTier: "T3",
    modelBasis: "task-tier:T3",
    effortBasis: "operator-effort",
    diagnostics: ["task Tier T3 overrides role default T5 for backend-engineer"],
  });
  // override ทั้งคู่ — operator ชนะทั้ง model/effort, effectiveTier ยังอ่านได้
  const both = resolveEffectiveModelPolicy(real.tiers, routeFixture("haiku", "low"), { role: "backend-engineer", camp: "claude" });
  assert.deepEqual(both, {
    model: "haiku",
    effort: "low",
    effectiveTier: "T5",
    modelBasis: "operator-model",
    effortBasis: "operator-effort",
    diagnostics: [],
  });
});

test("AC-009: T1 จาก task cast / จาก role default + tier นอก T1–T6 → ปฏิเสธพร้อมเหตุผล", () => {
  assert.throws(
    () => resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "claude", taskTier: "T1" }),
    throwsPolicy(/T1/),
  );
  assert.throws(
    () => resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "claude", taskTier: "T1" }),
    throwsPolicy(/cast อัตโนมัติ/),
  );
  assert.throws(
    () => resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "claude", taskTier: "T7" }),
    throwsPolicy(/T7/),
  );
  const t1Default: TiersConfig = { role_defaults: { "backend-engineer": "T1" }, tiers: real.tiers.tiers };
  assert.throws(
    () => resolveEffectiveModelPolicy(t1Default, real.routing, { role: "backend-engineer", camp: "claude" }),
    throwsPolicy(/T1.*reserved/),
  );
  const badDefault: TiersConfig = { role_defaults: { "backend-engineer": "T9" }, tiers: real.tiers.tiers };
  assert.throws(
    () => resolveEffectiveModelPolicy(badDefault, real.routing, { role: "backend-engineer", camp: "claude" }),
    throwsPolicy(/T9/),
  );
});

test("AC-008: basis อ่านได้ทุกครั้งที่ resolve — tier=<T>,model=<basis>,effort=<basis>", () => {
  const def = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "claude" });
  assert.equal(formatModelPolicyBasis(def), "tier=T5,model=role-default-tier:T5,effort=role-default-tier:T5");
  const task = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "qa-engineer", camp: "claude", taskTier: "T4" });
  assert.equal(formatModelPolicyBasis(task), "tier=T4,model=task-tier:T4,effort=task-tier:T4");
  const modelOnly = resolveEffectiveModelPolicy(real.tiers, routeFixture("opus", null), { role: "backend-engineer", camp: "claude" });
  assert.equal(formatModelPolicyBasis(modelOnly), "tier=T5,model=operator-model,effort=runtime-default");
  const effortOnly = resolveEffectiveModelPolicy(real.tiers, routeFixture(null, "high"), { role: "backend-engineer", camp: "claude" });
  assert.equal(formatModelPolicyBasis(effortOnly), "tier=T5,model=role-default-tier:T5,effort=operator-effort");
});

test("AC-010: แก้ tiers.yaml แล้ว run ถัดไป resolve ค่าใหม่ (ไม่แก้โค้ด) — ผลเดิมที่ถือไว้ (freeze) ไม่เปลี่ยนตาม", () => {
  const s = sandbox();
  const before = loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta });
  const r1 = resolveEffectiveModelPolicy(before.tiers, before.routing, { role: "backend-engineer", camp: "claude" });
  assert.equal(r1.model, "sonnet");
  assert.equal(r1.effort, "medium");

  const text = readFileSync(s.cfg("tiers.yaml"), "utf8");
  const next = text.replace("{ model: sonnet,           effort: medium }", "{ model: opus,             effort: high }");
  assert.notEqual(next, text); // ต้องแทนที่ T5/claude สำเร็จ
  writeFileSync(s.cfg("tiers.yaml"), next);

  const reloaded = loadAppConfig({ orchestratorHome: s.home, staConfigPath: s.sta });
  const r2 = resolveEffectiveModelPolicy(reloaded.tiers, reloaded.routing, { role: "backend-engineer", camp: "claude" });
  assert.deepEqual(r2, {
    model: "opus",
    effort: "high",
    effectiveTier: "T5",
    modelBasis: "role-default-tier:T5", // basis ชี้แหล่งเดิม — ค่าที่อ่านมาเปลี่ยนเพราะแก้ไฟล์
    effortBasis: "role-default-tier:T5",
    diagnostics: [],
  });
  assert.equal(r1.model, "sonnet"); // resolution ที่ถือไว้แล้วไม่ถูกแตะ
});

test("tier ไม่มี cell ของ camp นั้น → ปฏิเสธ (fail closed ไม่แทนค่าแทน) · role ไม่มีใน routing/role_defaults → ปฏิเสธ", () => {
  const t5NoAntigravity: TiersConfig = {
    role_defaults: real.tiers.role_defaults,
    tiers: {
      ...real.tiers.tiers,
      T5: {
        reserved: false,
        camps: { claude: { model: "sonnet", effort: "medium" }, codex: { model: "gpt-6.1-sol", effort: "medium" } },
      },
    },
  };
  assert.equal(resolveTierBinding(t5NoAntigravity, "T5", "antigravity"), null);
  assert.equal(resolveTierBinding(real.tiers, "T5", "antigravity")?.model, "gemini-3.7-flash-medium");
  assert.throws(
    () => resolveEffectiveModelPolicy(t5NoAntigravity, real.routing, { role: "backend-engineer", camp: "antigravity" }),
    throwsPolicy(/antigravity/),
  );
  // camp ไม่รู้จัก (ไม่ใช่ claude/codex/antigravity) → ไม่มี cell → ปฏิเสธเช่นกัน
  assert.throws(
    () => resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "backend-engineer", camp: "opencode" as CampName }),
    throwsPolicy(/camp "opencode"/),
  );
  assert.throws(
    () => resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "ghost", camp: "claude" }),
    throwsPolicy(/role_routes/),
  );
  const noDefault: TiersConfig = { role_defaults: {}, tiers: real.tiers.tiers };
  assert.throws(
    () => resolveEffectiveModelPolicy(noDefault, real.routing, { role: "backend-engineer", camp: "claude" }),
    throwsPolicy(/role_defaults/),
  );
});

test("effort null = reasoning เลือกโดยชื่อ model เอง ห้ามส่ง flag (กติกา 3): antigravity ทุก tier + T6/claude", () => {
  for (const [role, tier, model] of [
    ["system-analyst", "T2", "gemini-3.8-flash-high"],
    ["reviewer", "T3", "gemini-3.8-flash-medium"],
    ["setup", "T6", "gemini-3.6-flash-low"],
  ] as const) {
    const r = resolveEffectiveModelPolicy(real.tiers, real.routing, { role, camp: "antigravity" });
    assert.deepEqual(r, {
      model,
      effort: null,
      effectiveTier: tier,
      modelBasis: `role-default-tier:${tier}`,
      effortBasis: `role-default-tier:${tier}`,
      diagnostics: [],
    });
  }
  const t6 = resolveEffectiveModelPolicy(real.tiers, real.routing, { role: "setup", camp: "claude" });
  assert.deepEqual(t6, {
    model: "haiku",
    effort: null,
    effectiveTier: "T6",
    modelBasis: "role-default-tier:T6",
    effortBasis: "role-default-tier:T6",
    diagnostics: [],
  });
});
