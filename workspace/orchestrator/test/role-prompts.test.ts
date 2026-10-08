// BE-003 — node:test: role prompt loader แหล่งเดียว (DES-003, REQ-003 AC-006)
// แพ็กจริงที่ packRoot (SETUP-004) ใช้พิสูจน์ "โหลดครบ 12" · แพ็กปลอมใน temp ใช้ทดสอบการเปลี่ยนแปลง/กรณีผิด
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { KNOWN_ROLES, loadAppConfig } from "../src/core/config.ts";
import { DEFAULT_TOOLS, RolePromptError, loadRolePrompt, rolePromptFile } from "../src/core/role-prompts.ts";

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "be003-"));
after(() => rmSync(tmpRoot, { recursive: true, force: true }));

let n = 0;
// แพ็กปลอม <tmp>\.claude\agents — แก้/ลบไฟล์ได้โดยไม่แตะ pack จริง (AC-006 ห้ามสำเนาเข้า repo นี้ ยกเว้น fixture ชั่วคราวใน test)
function pack(files: Record<string, string>): string {
  const agents = path.join(tmpRoot, `p${++n}`, ".claude", "agents");
  mkdirSync(agents, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(agents, name), text);
  return agents;
}

// frontmatter รูปเดียวกับแพ็กจริง — tools: null = ไม่มี field, "" = field ว่าง
function fm(tools: string | null): string {
  return ["---", "name: backend-engineer", "description: d", ...(tools === null ? [] : [`tools: ${tools}`]), "model: sonnet", "effort: medium", "---", "", "You implement **backend tasks**.", ""].join("\n");
}

test("โหลด role ครบ 12 จาก packRoot ของจริง (AC-006 — แหล่งเดียว, hash รูป sha256)", () => {
  const cfg = loadAppConfig();
  const root = cfg.registry.rolePromptRoot;
  assert.equal(root, path.join(cfg.registry.packRoot, ".claude", "agents"));
  for (const role of KNOWN_ROLES) {
    const p = loadRolePrompt(root, role);
    assert.equal(p.role, role);
    assert.equal(p.source, path.join(root, `${role}.md`));
    assert.ok(p.body.length > 0, `${role}: เนื้อ prompt ไม่ว่าง`);
    assert.equal(p.body.startsWith("---"), false, `${role}: frontmatter ถูกตัดออก`);
    assert.ok(p.tools.length > 0 && p.tools.every((t) => t.length > 0), `${role}: tools อ่านได้`);
    assert.match(p.hash, /^sha256:[0-9a-f]{64}$/, `${role}: hash รูป sha256:<hex>`);
    assert.deepEqual(p.warnings, [], `${role}: แพ็กจริงประกาศ tools ครบ ไม่มีเตือน`);
  }
  // parser ตรง frontmatter จริง: reviewer ไม่มี Bash · backend-engineer มี Bash
  assert.deepEqual(loadRolePrompt(root, "reviewer").tools, ["Read", "Write", "Edit", "Glob", "Grep"]);
  assert.equal(loadRolePrompt(root, "backend-engineer").tools.includes("Bash"), true);
  // hash นิ่งเมื่อไฟล์ไม่เปลี่ยน (โหลดซ้ำ ณ คนละเวลา)
  assert.equal(loadRolePrompt(root, "business-analyst").hash, loadRolePrompt(root, "business-analyst").hash);
});

test("hash เปลี่ยนเมื่อไฟล์เปลี่ยน + อ่านเนื้อ/tools ใหม่ ณ เวลา dispatch (ไม่มี cache)", () => {
  const root = pack({ "backend-engineer.md": fm("Read, Bash") });
  const before = loadRolePrompt(root, "backend-engineer");
  writeFileSync(path.join(root, "backend-engineer.md"), fm("Read").replace("You implement", "You implement MORE"));
  const after = loadRolePrompt(root, "backend-engineer");
  assert.notEqual(after.hash, before.hash);
  assert.match(after.hash, /^sha256:[0-9a-f]{64}$/);
  assert.ok(after.body.includes("MORE"));
  assert.deepEqual(after.tools, ["Read"]);
});

test("role หาย / rolePromptRoot หาย → ปฏิเสธก่อน spawn ระบุ path (fail-closed — DES-003)", () => {
  const root = pack({ "backend-engineer.md": fm("Read") });
  assert.throws(
    () => loadRolePrompt(root, "devops"),
    (e: unknown) => e instanceof RolePromptError && e.file === path.join(root, "devops.md") && /ไม่พบไฟล์ role prompt/.test(e.message),
  );
  assert.throws(() => loadRolePrompt(path.join(tmpRoot, "ghost-root"), "backend-engineer"), RolePromptError);
});

test("ไฟล์ว่าง / มีแต่ frontmatter / frontmatter ไม่ปิด → ปฏิเสธก่อน spawn (fail-closed)", () => {
  const root = pack({
    "business-analyst.md": "",
    "system-analyst.md": "---\nname: x\n---\n",
    "project-manager.md": "---\nname: x\ntools: Read\n",
  });
  const cases: Array<[string, RegExp]> = [
    ["business-analyst", /ไฟล์ role prompt ว่าง/],
    ["system-analyst", /เนื้อ role prompt ว่าง/],
    ["project-manager", /ไม่มีบรรทัดปิด `---`/],
  ];
  for (const [role, re] of cases) {
    assert.throws(
      () => loadRolePrompt(root, role),
      (e: unknown) => e instanceof RolePromptError && re.test(e.message),
      role,
    );
  }
});

test("frontmatter ไม่มี tools: (ขาด/ว่าง/ไม่มี frontmatter) → default Read, Glob, Grep + warning (DES-003)", () => {
  const root = pack({
    "test-planner.md": fm(null),
    "uxui-designer.md": "เนื้ออย่างเดียว ไม่มี frontmatter\n",
    "security.md": fm(""),
  });
  const tp = loadRolePrompt(root, "test-planner");
  assert.deepEqual(tp.tools, [...DEFAULT_TOOLS]);
  assert.equal(tp.warnings.length, 1);
  assert.match(tp.warnings[0]!, /tools:/);
  const ux = loadRolePrompt(root, "uxui-designer");
  assert.deepEqual(ux.tools, [...DEFAULT_TOOLS]);
  assert.ok(ux.body.startsWith("เนื้ออย่างเดียว"));
  assert.equal(loadRolePrompt(root, "security").warnings.length, 1);
});

test("model:/effort: ใน frontmatter ไม่ใช้ — policy authority คือ tiers.yaml · shape ตรง data-model", () => {
  const p = loadRolePrompt(pack({ "backend-engineer.md": fm("Read, Bash") }), "backend-engineer");
  assert.deepEqual(Object.keys(p).sort(), ["body", "hash", "role", "source", "tools", "warnings"]);
  assert.deepEqual(p.tools, ["Read", "Bash"]);
  assert.equal(p.body.includes("model: sonnet"), false);
});

test("role ไม่รู้จัก / ใช้ชื่อไฟล์แทน role → ปฏิเสธ (ชื่อไฟล์ = ชื่อ role, fail-closed)", () => {
  const root = pack({ "backend-engineer.md": fm("Read") });
  for (const bad of ["ghost-role", "../backend-engineer", "backend-engineer.md", "."]) {
    assert.throws(
      () => loadRolePrompt(root, bad),
      (e: unknown) => e instanceof RolePromptError && e.message.includes(JSON.stringify(bad)),
      bad,
    );
  }
  assert.equal(rolePromptFile(root, "backend-engineer"), path.join(root, "backend-engineer.md"));
});

test("frontmatter key ซ้ำ → ใช้ค่าแรก + warning · CRLF อ่านได้", () => {
  const dup = loadRolePrompt(pack({ "devops.md": "---\ntools: Read\ntools: Bash\n---\nbody\n" }), "devops");
  assert.deepEqual(dup.tools, ["Read"]);
  assert.ok(dup.warnings.some((w) => w.includes("ซ้ำ")));
  const crlf = loadRolePrompt(pack({ "reviewer.md": fm("Read, Glob").replace(/\n/g, "\r\n") }), "reviewer");
  assert.deepEqual(crlf.tools, ["Read", "Glob"]);
  assert.equal(crlf.body, "You implement **backend tasks**.");
});
