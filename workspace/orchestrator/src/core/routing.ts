// BE-005 — role routing role → camp (DES-005): เลือก camp ต่อ session จาก precedence 3 ชั้น —
// (1) override ต่อ run ที่ผู้ใช้ระบุใน UI ตอนกดเริ่ม (optional) → (2) role_routes.<role>.camp → (3) defaultCamp
// แนวเดียวกับ tierCampSelection.ts:27-33 เดิม (flag > config > default) แต่ตัดชั้น TTY prompt — ระบบ headless ตลอด
// การเปลี่ยน camp ของ role ทำได้โดยแก้ routing.yaml อย่างเดียว ไม่แก้โค้ด (OQ-2 — AC-004) ·
// role ไม่มี route → defaultCamp (DES-005 Fallback) · ทุก dispatch ต้องบันทึก camp + basis ลง SessionRecord.basisReason (AC-005)
// รูป routing.yaml (ครบ 12 role / camp ต้องประกาศใน camps.yaml) validate ที่ config store แล้ว (BE-001 — ConfigError ระบุไฟล์+line/column)
// ที่นี่ fail-closed กันค่าในหน่วยความจำที่ไม่ถูกต้อง: camp ไม่รู้จัก → ปฏิเสธ ระบบไม่เดาค่าแทน
import { KNOWN_CAMPS, type CampName, type RoutingConfig } from "./config.ts";

// แหล่งที่มาของ camp ที่เลือก — ค่าตรงตาม DES-005 (run-override | role-route | default)
export type CampSelectionBasis = "run-override" | "role-route" | "default";

// ผล resolve ตาม DES-005 (Output: camp id + basis) — BE-006 (adapter) ใช้ camp, BE-011 (driver) บันทึก basis
export interface CampSelection {
  camp: CampName;
  basis: CampSelectionBasis;
}

export interface ResolveCampOptions {
  readonly role: string;
  readonly runOverrideCamp?: string; // ชั้น 1 — optional; ระบุ = ใช้กับทุก session ของ run นี้
}

export class CampResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampResolutionError";
  }
}

function checkedKnownCamp(value: unknown, subject: string): CampName {
  if (typeof value !== "string" || !(KNOWN_CAMPS as readonly string[]).includes(value)) {
    throw new CampResolutionError(
      `${subject} = ${JSON.stringify(value)} ไม่รู้จัก — ต้องเป็นหนึ่งใน ${KNOWN_CAMPS.join(" | ")} (fail-closed)`,
    );
  }
  return value as CampName;
}

export function resolveCamp(routing: RoutingConfig, opts: ResolveCampOptions): CampSelection {
  // ชั้น 1 — run override: ค่าว่างก็ปฏิเสธ (ไม่ตีความแทนผู้ใช้ว่า "ไม่ระบุ" — fail-closed)
  if (opts.runOverrideCamp !== undefined) {
    return {
      camp: checkedKnownCamp(opts.runOverrideCamp, `camp override ต่อ run สำหรับ role "${opts.role}"`),
      basis: "run-override",
    };
  }
  // ชั้น 2 — route ต่อ role จาก routing.yaml (คนเป็นเจ้าของไฟล์ — ระบบอ่านอย่างเดียว)
  const route = routing.role_routes[opts.role];
  if (route !== undefined) {
    return { camp: checkedKnownCamp(route.camp, `role_routes["${opts.role}"].camp`), basis: "role-route" };
  }
  // ชั้น 3 — fallback: role ที่ไม่มี route → defaultCamp (DES-005) — ขาด field ก็ปฏิเสธ ไม่เดาแทน
  if (routing.defaultCamp === undefined) {
    throw new CampResolutionError(
      `routing.yaml ขาด defaultCamp และ role "${opts.role}" ไม่มีใน role_routes — ระบบไม่เดาค่าแทน (fail-closed)`,
    );
  }
  return { camp: checkedKnownCamp(routing.defaultCamp, "defaultCamp"), basis: "default" };
}
