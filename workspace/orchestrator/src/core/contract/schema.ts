// BE-006 — JSON Schema ของ packet v2 + handoff-v2 (DES-012, data-model.md §PacketV2/HandoffV2 — verbatim)
// adapter (BE-012/013/014) เขียนเป็นไฟล์แล้วส่ง flag ให้ CLI — claude/agy `--json-schema` · codex `--output-schema`
// (DES-002) เพื่อให้ handoff parse ได้ deterministic ไม่อาศัยการอ่านข้อความอิสระ
// ใช้ชุดคีย์เวิร์ดย่อยที่ CLI ทั้งสองฝั่งรองรับร่วมกัน: type/enum/const/pattern/minLength/anyOf/
// properties/required/additionalProperties/items/minItems ($schema/title เป็น metadata ประกอบ) —
// nullable เป็น type array (draft 2020-12) · ชุดจริงถูกล็อกที่ SCHEMA_KEYWORDS ใน test\contract.test.ts ·
// `securityGate` ไม่ required (optional additive — G2-f Rev 11: ไม่มี field → ผ่าน) ·
// handoff schema ใช้ที่ outputContract.handoffSchema = "handoff-v2.json"
import { KNOWN_GATES, KNOWN_ROLES } from "../config.ts";

const STRING = { type: "string" } as const;
const STRING_MIN = { type: "string", minLength: 1 } as const;
const INT = { type: "integer" } as const;
const stringArray = (minItems?: number): object =>
  minItems === undefined ? { type: "array", items: STRING_MIN } : { type: "array", items: STRING_MIN, minItems };

// ชื่อ role/gate มาจาก config store (BE-001) — KNOWN_ROLES/KNOWN_GATES เป็นแหล่งเดียว

const ROLE_ENUM = { enum: [...KNOWN_ROLES] } as const;
const GATE_OR_NONE = { enum: [...KNOWN_GATES, "none"] } as const;
const NULLABLE_STRING = { type: ["string", "null"] } as const;

// Blocker (data-model) — type enum 6 ค่า · reference ว่างได้ (null) แต่ rule (3) ผูกกับ outputState
const blockerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "task", "reference", "reason"],
  properties: {
    type: { enum: ["design", "requirement", "environment", "dependency", "access", "other"] },
    task: STRING_MIN,
    reference: NULLABLE_STRING,
    reason: STRING_MIN,
  },
} as const;

// ReviewFinding — id REV-NNN (รูป id ตรวจที่ rule (4) — หลัง schema)
const reviewFindingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "severity", "task", "location", "problem", "reference"],
  properties: {
    id: STRING_MIN,
    severity: { enum: ["Critical", "Important", "Minor"] }, // REV/QA/SEC ชุดเดียว (DES-018)
    task: STRING_MIN,
    location: STRING_MIN, // file:line
    problem: STRING_MIN,
    reference: STRING_MIN, // DES/REQ/AC id
  },
} as const;

// QaDefect — task null ได้เฉพาะ featureQa (data-model comment) — rule (4) บังคับต่อ kind
const qaDefectSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "task", "severity", "expected", "actual", "reproduce", "evidence"],
  properties: {
    id: STRING_MIN,
    task: NULLABLE_STRING,
    severity: { enum: ["Critical", "Important", "Minor"] },
    expected: STRING_MIN,
    actual: STRING_MIN,
    reproduce: {
      type: "object",
      additionalProperties: false,
      required: ["tp", "steps"],
      properties: { tp: NULLABLE_STRING, steps: STRING_MIN },
    },
    evidence: { type: "array", items: STRING_MIN },
  },
} as const;

// --- packet v2 (`sessions/<sid>/packet.json`) — ครบทุก field, additionalProperties false (AC-033) ---
export function packetV2JsonSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "STA dispatch packet v2",
    type: "object",
    additionalProperties: false,
    required: [
      "packetVersion", "runId", "sessionId", "seq", "module", "role", "kind", "taskIds", "planPhase",
      "attempt", "dateFromUser", "docsRoot", "docsLayout", "selectedTarget", "gitPolicy", "readSections",
      "writeScope", "claim", "priorSession", "defectPacket", "reviewInput", "blocker", "rolePrompt",
      "brief", "outputContract",
    ],
    properties: {
      packetVersion: { const: 2 },
      runId: STRING_MIN,
      sessionId: STRING_MIN,
      seq: INT,
      module: STRING_MIN,
      role: ROLE_ENUM,
      kind: { enum: ["change", "execution", "review", "qa", "feature-qa", "security", "record-only"] },
      taskIds: { type: "array", items: STRING_MIN },
      planPhase: NULLABLE_STRING,
      attempt: INT,
      dateFromUser: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, // YYYY-MM-DD จากผู้ใช้
      docsRoot: STRING_MIN,
      docsLayout: { enum: ["split", "flat", "module"] },
      selectedTarget: {
        type: "object",
        additionalProperties: false,
        required: ["name", "path"],
        properties: { name: STRING_MIN, path: STRING_MIN },
      },
      gitPolicy: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["rootKind", "path", "commitAllowed", "warning"],
          properties: {
            rootKind: { enum: ["knowledge", "target"] },
            path: STRING_MIN,
            commitAllowed: { type: "boolean" },
            warning: NULLABLE_STRING,
          },
        },
      },
      readSections: { type: "array", items: STRING_MIN }, // path ตรง (DES-014/020)
      writeScope: {
        type: "object",
        additionalProperties: false,
        required: ["allow", "deny"],
        properties: { allow: stringArray(1), deny: stringArray() },
      },
      claim: stringArray(),
      priorSession: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["sessionId", "touchedFiles"],
            properties: { sessionId: STRING_MIN, touchedFiles: stringArray() },
          },
        ],
      },
      defectPacket: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["taskId", "source", "roundFile", "findings"],
            properties: {
              taskId: STRING_MIN,
              source: { enum: ["review", "qa", "feature-qa"] },
              roundFile: STRING_MIN,
              findings: { type: "array", minItems: 1, items: { anyOf: [reviewFindingSchema, qaDefectSchema] } },
            },
          },
        ],
      },
      reviewInput: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["tasks"],
            properties: {
              tasks: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["taskId", "changedFiles", "diffPath", "testFiles"],
                  properties: {
                    taskId: STRING_MIN,
                    changedFiles: stringArray(),
                    diffPath: NULLABLE_STRING,
                    testFiles: stringArray(),
                  },
                },
              },
            },
          },
        ],
      },
      blocker: { anyOf: [{ type: "null" }, blockerSchema] },
      rolePrompt: {
        type: "object",
        additionalProperties: false,
        required: ["source", "hash"],
        properties: { source: STRING_MIN, hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" } },
      },
      brief: STRING_MIN,
      outputContract: {
        type: "object",
        additionalProperties: false,
        required: ["handoffSchema", "schemaEnforcedByCli", "allowedStates"],
        properties: {
          handoffSchema: { const: "handoff-v2.json" },
          schemaEnforcedByCli: { type: "boolean" },
          allowedStates: { type: "array", minItems: 1, items: { enum: ["DONE", "PASS", "FAIL", "BLOCKED", "NEEDS_DESIGN_CHANGE", "NEEDS_REQUIREMENT_CHANGE", "NEEDS_HUMAN"] } },
        },
      },
    },
  };
}

// --- handoff-v2 (`handoff-v2.json` — output สุดท้ายของทุก session) ---
// required ครบยกเว้น securityGate (optional = null — G2-f Rev 11; ไม่มี field → ผ่าน)
export function handoffV2JsonSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "STA handoff v2",
    type: "object",
    additionalProperties: false,
    required: [
      "role", "module", "sessionId", "outputState", "result", "changedDocs", "changedCode", "evidence",
      "nextRole", "questionsForHuman", "blocker", "impactedTasks", "decision", "review", "qa",
      "featureQa", "security",
    ],
    properties: {
      role: ROLE_ENUM,
      module: STRING_MIN,
      sessionId: STRING_MIN,
      outputState: { enum: ["DONE", "PASS", "FAIL", "BLOCKED", "NEEDS_DESIGN_CHANGE", "NEEDS_REQUIREMENT_CHANGE", "NEEDS_HUMAN"] },
      result: STRING,
      changedDocs: stringArray(),
      changedCode: stringArray(),
      evidence: stringArray(),
      nextRole: { enum: [...KNOWN_ROLES, "none"] }, // Role | "none"
      questionsForHuman: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["gate", "question", "owner", "touchesSchemaOrContract"],
          properties: {
            gate: GATE_OR_NONE,
            question: STRING_MIN, // ถ้อยคำตรงตัว (AC-014)
            owner: STRING_MIN,
            touchesSchemaOrContract: { type: ["boolean", "null"] },
          },
        },
      },
      blocker: { anyOf: [{ type: "null" }, blockerSchema] },
      impactedTasks: { type: ["array", "null"], items: STRING_MIN }, // PM ใน change chain (ว่างได้)
      decision: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["action", "module", "reason"],
            properties: {
              action: { enum: ["amend", "create"] },
              module: STRING_MIN,
              reason: STRING_MIN,
            },
          },
        ],
      }, // BA งานใหม่ (AC-018)
      review: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["roundFile", "perTask", "findings"],
            properties: {
              roundFile: STRING_MIN,
              perTask: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["task", "verdict"],
                  properties: { task: STRING_MIN, verdict: { enum: ["PASS", "FAIL"] } },
                },
              },
              findings: { type: "array", items: reviewFindingSchema },
            },
          },
        ],
      },
      qa: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["roundFile", "checks", "perTask", "defects"],
            properties: {
              roundFile: STRING_MIN,
              checks: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["command", "exitCode", "logRef"],
                  properties: { command: STRING_MIN, exitCode: INT, logRef: STRING_MIN },
                },
              },
              perTask: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["task", "verdict"],
                  properties: { task: STRING_MIN, verdict: { enum: ["verified", "blocked"] } },
                },
              },
              defects: { type: "array", items: qaDefectSchema },
            },
          },
        ],
      },
      featureQa: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["phase", "roundFile", "flows", "defects"],
            properties: {
              phase: STRING_MIN,
              roundFile: STRING_MIN,
              flows: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["flow", "ref", "result"],
                  properties: { flow: STRING_MIN, ref: STRING_MIN, result: { enum: ["PASS", "FAIL"] } },
                },
              },
              defects: { type: "array", items: qaDefectSchema },
            },
          },
        ],
      },
      security: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["findings"],
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "severity", "ref"],
                  properties: { id: STRING_MIN, severity: { enum: ["Critical", "Important", "Minor"] }, ref: STRING_MIN },
                },
              },
            },
          },
        ],
      },
      securityGate: {
        // optional — absent/null ผ่าน (additive G2-f) · มีค่า → ตรวจต่อที่ rule (7) (kind/phase/reason)
        anyOf: [
          { type: "null" },
          {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["phase", "reason"],
              properties: { phase: STRING_MIN, reason: STRING_MIN },
            },
          },
        ],
      },
    },
  };
}
