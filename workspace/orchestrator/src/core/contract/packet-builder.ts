// BE-006 — packet v2 builder (DES-012 §Inputs/Outputs): ประกอบ packet ต่อ session จาก component ที่มี —
// role prompt BE-003 (packet จด {source, hash}; body/tools อยู่กับ CampDispatch ตอนแนบ CLI) ·
// readSections จาก context loader BE-020 (loadContext — error ไม่ null = ไม่ dispatch) ·
// writeScope จาก routing.yaml + claim ของ task (DES-006 ชั้น 1 / DES-021) ·
// gitPolicy คัด verbatim จาก run.json.gitPolicy (freeze — DES-015: ทุก stage ของ run เดียวได้ค่าเดียวกัน,
// agent ใช้ค่านี้เท่านั้น ห้ามอ่าน sta-config เอง) · outputContract.allowedStates ตามตาราง DES-018 (allowedStatesFor)
// brief = ข้อความสั่งของ driver (+คำตอบ gate ที่เกี่ยว) ตามด้วยข้อความดิบของผู้ใช้ที่มี USER_TEXT_GUARD นำหน้า
// (task Scope 🔒 — ประโยคกำกับเมื่อ brief มีข้อความดิบ · packet ไม่มี field conversation/history ใด — AC-033)
// fail-closed (AC-068): context error / role prompt ผิดรูป / packet ไม่ผ่าน schema → ContractError ก่อนส่ง packet ลง camp ใด
import { USER_TEXT_GUARD, allowedStatesFor, ContractError, type PacketV2 } from "./types.ts";
import { packetProblems } from "./validate.ts";
import type { RolePrompt } from "../role-prompts.ts";
import type { ContextLoad } from "../context-loader.ts";
import type { Blocker, Role, RunJson, SessionKind } from "../state-store.ts";
import type { WriteScope } from "../config.ts";
import type { DocsLayout } from "../knowledge-paths.ts";

const HASH_RE = /^sha256:[0-9a-f]{64}$/;

export interface PacketBuildInput {
  runId: string;
  sessionId: string; // "s-<seq>-<4 hex>" (BE-007)
  seq: number;
  module: string;
  role: Role;
  kind: SessionKind;
  taskIds: string[]; // ว่างได้เฉพาะ feature-qa (R18 anchor) / record-only — schema ตรวจต่อ
  planPhase: string | null;
  attempt: number;
  dateFromUser: string; // YYYY-MM-DD จากผู้ใช้ — ระบบไม่เดาวันที่เอง
  docsRoot: string;
  docsLayout: DocsLayout;
  selectedTarget: { name: string; path: string }; // codeRoots ของ stage นี้ (DES-015)
  gitPolicy: RunJson["gitPolicy"]; // freeze ของ run — คัด verbatim เฉพาะ 4 field ของ packet (data-model)
  context: ContextLoad; // BE-020 — error ไม่ null → ปฏิเสธ (driver hold context-error)
  writeScope: WriteScope; // role route ของ routing.yaml (allow ≥ 1 — DES-006)
  claim: string[]; // Write paths ของ task (DES-021)
  rolePrompt: RolePrompt; // BE-003 loadRolePrompt แล้ว — ตรวจซ้ำแบบ fail-closed ก่อนประกอบ
  brief: string; // ข้อความสั่งของ driver + คำตอบ gate ที่เกี่ยว
  userRawText?: string | null; // ข้อความดิบของผู้ใช้ (new-work/คำตอบ gate) — มี → USER_TEXT_GUARD นำหน้า
  priorSession?: PacketV2["priorSession"]; // restart R16 (DES-007)
  defectPacket?: PacketV2["defectPacket"]; // fix session (DES-019)
  reviewInput?: PacketV2["reviewInput"]; // review wave (DES-019)
  blocker?: Blocker | null; // change chain R10–R13 (DES-018)
  schemaEnforcedByCli: boolean; // camp ที่เลือก (BE-005) มี schemaFlag จริง — อ่านจาก camps.yaml
}

// ประกอบ brief: ข้อความดิบของผู้ใช้ (ถ้ามี) ต้องมีประโยคกำกับนำหน้าเสมอ — วางชิดก่อนข้อความดิบ
// ("ก่อนข้อความดิบจากผู้ใช้" — DES-012 Security) เพื่อลด prompt injection จากงานใหม่ (DES-010)
export function composeBrief(driverBrief: string, userRawText?: string | null): string {
  const raw = userRawText ?? "";
  if (raw.trim() === "") return driverBrief;
  return `${driverBrief}\n\n${USER_TEXT_GUARD}\n${raw}`;
}

export function buildPacketV2(input: PacketBuildInput): PacketV2 {
  const problems: string[] = [];
  const ctx = input.context;
  if (ctx.error !== null) {
    problems.push(`context-error (id ${ctx.error.id}, index ${ctx.error.index}): ${ctx.error.message} — ไม่ dispatch (fail-closed — DES-020, AC-048)`);
  }
  // role prompt (BE-003) — loadRolePrompt การันตีอยู่แล้ว แต่ builder fail-closed กับค่าที่ผู้เรียกประกอบเอง
  const rp = input.rolePrompt;
  if (typeof rp.source !== "string" || rp.source.trim() === "") problems.push("rolePrompt.source ต้องเป็น path ไฟล์ role prompt จริง (BE-003)");
  if (typeof rp.hash !== "string" || !HASH_RE.test(rp.hash)) problems.push("rolePrompt.hash ต้องเป็น sha256:<64 hex> ของไฟล์ role prompt (BE-003)");
  if (typeof rp.body !== "string" || rp.body.trim() === "") problems.push("เนื้อ role prompt ว่าง — ปฏิเสธ dispatch ก่อน spawn (fail-closed — DES-003)");
  if (!Array.isArray(rp.tools) || rp.tools.length === 0 || rp.tools.some((t) => typeof t !== "string" || t.trim() === "")) {
    problems.push("rolePrompt.tools ต้องเป็น string[] ไม่ว่าง (BE-003)");
  }
  if (problems.length > 0) throw new ContractError("packet", problems);

  const packet: PacketV2 = {
    packetVersion: 2,
    runId: input.runId,
    sessionId: input.sessionId,
    seq: input.seq,
    module: input.module,
    role: input.role,
    kind: input.kind,
    taskIds: [...input.taskIds],
    planPhase: input.planPhase,
    attempt: input.attempt,
    dateFromUser: input.dateFromUser,
    docsRoot: input.docsRoot,
    docsLayout: input.docsLayout,
    selectedTarget: { ...input.selectedTarget },
    gitPolicy: input.gitPolicy.map((g) => ({
      rootKind: g.rootKind,
      path: g.path,
      commitAllowed: g.commitAllowed,
      warning: g.warning,
    })),
    readSections: [...ctx.readSections],
    writeScope: { allow: [...input.writeScope.allow], deny: [...input.writeScope.deny] },
    claim: [...input.claim],
    priorSession: input.priorSession ?? null,
    defectPacket: input.defectPacket ?? null,
    reviewInput: input.reviewInput ?? null,
    blocker: input.blocker ?? null,
    rolePrompt: { source: rp.source, hash: rp.hash },
    brief: composeBrief(input.brief, input.userRawText),
    outputContract: {
      handoffSchema: "handoff-v2.json",
      schemaEnforcedByCli: input.schemaEnforcedByCli,
      allowedStates: allowedStatesFor(input.kind, input.role), // ชุดต่อ kind — rule (1)/(7) ใช้ตรวจ handoff
    },
  };
  // ประตูสุดท้าย — packet ที่จะลงดิสก์/ลง camp ต้องผ่าน validator ครบ (fail-closed — AC-068)
  const schemaProblems = packetProblems(packet);
  if (schemaProblems.length > 0) throw new ContractError("packet", schemaProblems);
  return packet;
}
