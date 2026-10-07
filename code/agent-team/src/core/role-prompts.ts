// BE-003 — role prompt loader แหล่งเดียว (DES-003, REQ-003 AC-006)
// อ่าน role prompt จาก <rolePromptRoot>\<role>.md (rolePromptRoot = <packRoot>\.claude\agents จาก registry — BE-001)
// ณ เวลา dispatch — ไม่มีสำเนาต่อ camp/solo (AC-006, DES-013) · fail-closed: ไฟล์ไม่มี/ว่าง → ปฏิเสธก่อน spawn
// frontmatter แบบแบน: `tools:` → รายชื่อ tool ฝั่ง claude (--allowedTools) + เป็นข้อความ advisory ใน packet ฝั่ง codex/agy
// `model:`/`effort:` ไม่ใช้เลย — policy authority คือ tiers.yaml (frontmatter เป็น compatibility output)
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { KNOWN_ROLES } from "./config.ts";
import { assertNoTraversal, isInside } from "./knowledge-paths.ts";

export class RolePromptError extends Error {
  readonly file: string;

  constructor(file: string, message: string) {
    super(`${file} — ${message}`);
    this.name = "RolePromptError";
    this.file = file;
  }
}

// DES-003: frontmatter ไม่มี `tools:` → ใช้ default อ่านอย่างเดียว และบันทึกเตือน
export const DEFAULT_TOOLS = ["Read", "Glob", "Grep"] as const;

export interface RolePrompt {
  role: string;
  source: string; // path ไฟล์จริง — PacketV2.rolePrompt.source (data-model.md)
  body: string; // เนื้อ prompt (frontmatter ตัดแล้ว) — --append-system-prompt-file / section ROLE PROMPT
  tools: string[]; // จาก `tools:` · ไม่มีใน frontmatter → DEFAULT_TOOLS
  hash: string; // sha256:<hex> ของไฟล์ดิบ — SessionRecord.rolePromptHash บันทึกต่อ session (DES-001)
  warnings: string[]; // เช่น ไม่มี tools: / key ซ้ำ — ผู้เรียกบันทึกลง session log
}

// path ของไฟล์ role prompt — role ต้องเป็น role ใน pack (ชื่อไฟล์ = ชื่อ role, routing.yaml ผูกด้วยชื่อเดียวกัน)
export function rolePromptFile(rolePromptRoot: string, role: string): string {
  if (typeof role !== "string" || !(KNOWN_ROLES as readonly string[]).includes(role)) {
    throw new RolePromptError(
      path.join(rolePromptRoot, `${role}.md`),
      `role ไม่รู้จัก ${JSON.stringify(role)} — ต้องเป็น role ใน pack ทั้ง ${KNOWN_ROLES.length} (fail-closed — DES-003)`,
    );
  }
  assertNoTraversal(rolePromptRoot, "rolePromptRoot");
  const file = path.resolve(rolePromptRoot, `${role}.md`);
  if (!isInside(rolePromptRoot, file)) {
    throw new RolePromptError(file, `path หลุดนอก rolePromptRoot: ${file}`);
  }
  return file;
}

interface Frontmatter {
  body: string;
  fields: Map<string, string>;
  warnings: string[];
}

// parser แบบแบน (port แนว parseFrontmatterField — DES-003): บรรทัดระหว่าง `---` เปิด/ปิด เท่านั้น
// ไม่มีโครงซ้อน (list/map) — แพ็กจริงทั้ง 12 role เป็น key: value บรรทัดเดียว
function parseFrontmatter(file: string, raw: string): Frontmatter {
  const warnings: string[] = [];
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    // ไม่มี frontmatter เลย = เนื้อ prompt ทั้งไฟล์ · tools ถือว่าไม่มี → default + เตือน (DES-003)
    return { body: raw.trim(), fields: new Map(), warnings };
  }
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      close = i;
      break;
    }
  }
  if (close < 0) {
    throw new RolePromptError(file, "frontmatter เปิด `---` แต่ไม่มีบรรทัดปิด `---` — ปฏิเสธ dispatch ก่อน spawn (fail-closed)");
  }
  const fields = new Map<string, string>();
  for (let i = 1; i < close; i++) {
    const line = lines[i] as string;
    if (line.trim() === "") continue;
    const m = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]?(.*)$/.exec(line);
    if (!m) {
      throw new RolePromptError(
        file,
        `frontmatter บรรทัด ${i + 1} ไม่อยู่รูป \`key: value\` แบบแบน: ${JSON.stringify(line)} — ปฏิเสธ dispatch ก่อน spawn (fail-closed)`,
      );
    }
    if (fields.has(m[1]!)) {
      warnings.push(`frontmatter key "${m[1]}" ซ้ำ (บรรทัด ${i + 1}) — ใช้ค่าแรก`);
      continue;
    }
    fields.set(m[1]!, m[2]!.trim());
  }
  return { body: lines.slice(close + 1).join("\n").trim(), fields, warnings };
}

// โหลด role prompt ของ role หนึ่ง ณ เวลาเรียก (ไม่ cache — ไฟล์เปลี่ยนกลาง run อ่านค่าใหม่และ hash เปลี่ยนตาม)
export function loadRolePrompt(rolePromptRoot: string, role: string): RolePrompt {
  const file = rolePromptFile(rolePromptRoot, role);
  if (!existsSync(file) || !statSync(file).isFile()) {
    throw new RolePromptError(file, `ไม่พบไฟล์ role prompt — ปฏิเสธ dispatch ก่อน spawn (fail-closed — DES-003, AC-006)`);
  }
  const raw = readFileSync(file, "utf8");
  if (raw.trim() === "") {
    throw new RolePromptError(file, "ไฟล์ role prompt ว่าง — ปฏิเสธ dispatch ก่อน spawn (fail-closed — DES-003)");
  }
  const { body, fields, warnings } = parseFrontmatter(file, raw);
  if (body === "") {
    throw new RolePromptError(file, "เนื้อ role prompt ว่าง (มีแต่ frontmatter) — ปฏิเสธ dispatch ก่อน spawn (fail-closed — DES-003)");
  }
  const fmTools = fields.get("tools");
  const parsed = (fmTools ?? "").split(",").map((t) => t.trim()).filter((t) => t !== "");
  let tools: string[];
  if (parsed.length === 0) {
    tools = [...DEFAULT_TOOLS];
    warnings.push(`frontmatter ไม่มี \`tools:\` — ใช้ default อ่านอย่างเดียว (${tools.join(", ")}) (DES-003)`);
  } else {
    tools = parsed;
  }
  const hash = `sha256:${createHash("sha256").update(raw, "utf8").digest("hex")}`;
  return { role, source: file, body, tools, hash, warnings };
}
