// BE-004 — tier engine (DES-004): resolve model/effort ต่อ session พร้อม basis — port จาก orchestrator เดิม
// (software-team-agents orchestrator/src/runtime/tierRouting.ts) เกือบ 1:1 — ตัดสิ่งที่ระบบนี้ไม่มี:
// legacy frontmatter, camp zai, TTY prompt และการ parse tiers.yaml เอง (BE-001 config store validate แล้ว —
// parse ล้มเหลว → ConfigError ระบุไฟล์ + line/column ที่นั่น) · precedence ทีละ field: override จาก routing.yaml
// (model/effort แยก field) → tier ที่ task cast → role default → ปฏิเสธ · camp ที่ส่งเข้ามา = camp ที่ DES-005
// เลือกแล้ว (engine ไม่เลือก camp เอง) · fail-closed: ไม่แทนค่า ไม่เดา default ไม่มี fallback ข้าม camp
import { TIER_IDS, type CampName, type RoleRoute, type RoutingConfig, type TierBinding, type TiersConfig } from "./config.ts";

export type TierId = (typeof TIER_IDS)[number];

// ผู้ชนะของ model/effort แต่ละ field — ตัด legacy-frontmatter ออกจากชุดเดิม (tierRouting.ts:29-35)
export type ModelPolicyValueBasis =
  | "operator-model"
  | "operator-effort"
  | `task-tier:${TierId}`
  | `role-default-tier:${TierId}`
  | "runtime-default";

// ผล resolve ตาม DES-004 (output ตรงตัว) — driver (BE-011) เรียกต่อ dispatch
// effort null = ห้ามส่ง effort flag (antigravity/T6 ระดับ reasoning ฝังในชื่อ model หรือ runtime default เอง — กติกา 3)
export interface EffectiveModelPolicyResolution {
  model: string;
  effort: string | null;
  effectiveTier: TierId;
  modelBasis: ModelPolicyValueBasis;
  effortBasis: ModelPolicyValueBasis;
  diagnostics: string[];
}

export interface ResolveEffectiveModelPolicyOptions {
  readonly role: string;
  readonly camp: CampName; // camp ที่ DES-005 เลือกแล้ว
  readonly taskTier?: string; // tier ที่ task/plan cast (ถ้ามี — ไม่ cast ก็ไม่ส่ง)
}

export class ModelPolicyResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelPolicyResolutionError";
  }
}

// cell ของ tier/camp จาก tiers.yaml (port resolveTierBinding — tierRouting.ts:24-27) —
// tier ไม่มีในตาราง หรือ camp นั้นไม่มี cell → null (ผู้เรียกต้องปฏิเสธ ห้ามแทนค่าข้าม camp)
export function resolveTierBinding(tiers: TiersConfig, tier: TierId, camp: CampName): TierBinding | null {
  const def = tiers.tiers[tier];
  if (!def) return null;
  return def.camps[camp] ?? null;
}

// tier ที่ task cast (port checkedTaskTier — tierRouting.ts:78-87): ต้องเป็น T1–T6 และห้าม T1 —
// T1 reserved ให้คนเลือกเอง (override model/effort ที่ routing.yaml) ห้าม cast อัตโนมัติ (AC-009)
function checkedTaskTier(taskTier: string | undefined): TierId | undefined {
  if (taskTier === undefined) return undefined;
  if (!(TIER_IDS as readonly string[]).includes(taskTier)) {
    throw new ModelPolicyResolutionError(
      `tier ที่ task cast "${taskTier}" ไม่ถูกต้อง — ต้องเป็นหนึ่งใน ${TIER_IDS.join(", ")}`,
    );
  }
  if (taskTier === "T1") {
    throw new ModelPolicyResolutionError(
      "tier T1 reserved — สงวนไว้ให้คนเลือกเอง (operator ระบุ model/effort ที่ routing.yaml) ห้าม cast อัตโนมัติจาก task/plan (AC-009)",
    );
  }
  return taskTier as TierId;
}

export function resolveEffectiveModelPolicy(
  tiers: TiersConfig,
  routing: RoutingConfig,
  opts: ResolveEffectiveModelPolicyOptions,
): EffectiveModelPolicyResolution {
  const taskTier = checkedTaskTier(opts.taskTier);

  const route: RoleRoute | undefined = routing.role_routes[opts.role];
  if (!route) {
    throw new ModelPolicyResolutionError(`role "${opts.role}" ไม่มีใน routing.yaml role_routes — ปฏิเสธ (fail-closed)`);
  }
  const roleDefaultTier: string | undefined = tiers.role_defaults[opts.role];
  if (roleDefaultTier === undefined) {
    throw new ModelPolicyResolutionError(
      `role "${opts.role}" ไม่มี role_defaults ใน tiers.yaml — precedence ถึงขั้นปฏิเสธ ระบบไม่เดาค่าแทน (DES-004)`,
    );
  }
  if (!(TIER_IDS as readonly string[]).includes(roleDefaultTier)) {
    throw new ModelPolicyResolutionError(
      `role_defaults ของ "${opts.role}" = ${JSON.stringify(roleDefaultTier)} ไม่ใช่ T1–T6 — ปฏิเสธ (fail-closed)`,
    );
  }
  if (roleDefaultTier === "T1") {
    throw new ModelPolicyResolutionError(
      `role_defaults ของ "${opts.role}" เป็น T1 (reserved) — ห้าม cast อัตโนมัติจาก config (AC-009)`,
    );
  }
  const defaultTier = roleDefaultTier as TierId;

  const diagnostics: string[] = [];
  let effectiveTier: TierId;
  let tierBasis: `task-tier:${TierId}` | `role-default-tier:${TierId}`;
  if (taskTier) {
    effectiveTier = taskTier;
    tierBasis = `task-tier:${taskTier}`;
    if (defaultTier !== taskTier) {
      diagnostics.push(`task Tier ${taskTier} overrides role default ${defaultTier} for ${opts.role}`);
    }
  } else {
    effectiveTier = defaultTier;
    tierBasis = `role-default-tier:${defaultTier}`;
  }

  // tier ที่ camp นั้นไม่มี cell → ปฏิเสธ (fail closed ไม่แทนค่าแทน — DES-004) แม้ override จะชนะก็ตาม (คงของเดิม)
  const binding = resolveTierBinding(tiers, effectiveTier, opts.camp);
  if (!binding) {
    throw new ModelPolicyResolutionError(
      `${tierBasis} ไม่มี cell สำหรับ camp "${opts.camp}" — ปฏิเสธ ห้ามแทนค่าข้าม camp (fail closed — DES-004)`,
    );
  }

  // precedence ทีละ field คงของเดิม (tierRouting.ts:140-153): ค่าที่ชนะแยกระหว่าง model กับ effort —
  // effort ผูกกับ model ของ tier เดียวกัน: override model ล้วน ๆ → effort ตกเป็น runtime default (null)
  // ไม่ดึง effort ของ tier เดิมมาผูกกับ model คนละตัว (กติกา 2 — DES-004)
  const model = route.model ?? binding.model;
  const effort = route.effort ?? (route.model === null ? binding.effort : null);

  const modelBasis: ModelPolicyValueBasis = route.model !== null ? "operator-model" : tierBasis;
  const effortBasis: ModelPolicyValueBasis =
    route.effort !== null ? "operator-effort" : route.model !== null ? "runtime-default" : tierBasis;

  return { model, effort, effectiveTier, modelBasis, effortBasis, diagnostics };
}

// basis ที่อ่านได้ทุกครั้งที่ resolve (AC-008) — port จาก formatModelPolicyBasis (tierRouting.ts:167-169)
export function formatModelPolicyBasis(res: EffectiveModelPolicyResolution): string {
  return `tier=${res.effectiveTier},model=${res.modelBasis},effort=${res.effortBasis}`;
}
