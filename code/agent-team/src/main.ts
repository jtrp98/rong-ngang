// BE-011 — terminal entry (DES-001 Goal "เริ่ม/resume จาก terminal ไม่ต้องมี UI" · DES-015 ลำดับเลือก
// knowledge → target → module): โหลด config (BE-001 — fail-closed) → ตรวจ selection ด้วย resolveRunRoots
// (path ไม่มีจริง → ปฏิเสธ run พร้อม path ก่อนแตะ state — DES-015) → เริ่ม run ใหม่ / resume จาก pointer
// ผ่าน PipelineDriver อย่างเดียว (entry ไม่ตัดสิน logic ของ pipeline เอง — DES-001) → รอ run เงียบ (settle)
// แล้วพิมพ์สถานะ + แจ้ง gate ทาง stdout เมื่อ run เข้า waiting-on-human (ข้อความสั้น — DES-008)
// รูป args (design ไม่ระบุรูป — เลือกตรงไปตรงมา รายงานใน handoff):
//   npx tsx src/main.ts <knowledge> <target> <module> --date YYYY-MM-DD [--resume]
//   · --date = วันที่จากผู้ใช้ (dateFromUser — ระบบไม่เดาวันที่ · data-model) — ไม่ใส่ → ปฏิเสธ
//   · --resume = resume เท่านั้น (ไม่มี pointer → ปฏิเสธ) · ไม่ใส่ = เริ่ม run (ไม่มี pointer → สร้างใหม่ /
//     มีแล้ว → วิ่งต่อจากขั้นล่าสุด — AC-003)
// wiring server/UI (BE-015) ต่อจาก entry นี้ที่ composition root — ไม่อยู่ scope BE-011
import { pathToFileURL } from "node:url";
import { AntigravityAdapter } from "./camps/antigravity.ts";
import { ClaudeAdapter } from "./camps/claude.ts";
import { CodexAdapter } from "./camps/codex.ts";
import { loadAppConfig, resolveRunRoots, type AppConfig } from "./core/config.ts";
import type { CampAdapter } from "./core/contract/camp-adapter.ts";
import { PipelineDriver } from "./core/driver.ts";
import type { GateRecord } from "./core/state-store.ts";

export interface MainOptions {
  argv?: readonly string[]; // default process.argv.slice(2)
  config?: AppConfig; // test — config ที่โหลด/validate แล้ว (default โหลดจาก orchestratorHome นี้)
  adapters?: Readonly<Record<string, CampAdapter>>; // test — fake (default: adapter จริง 3 camp — BE-012/013/014)
  out?: (line: string) => void; // default console.log
}

export interface MainResult {
  code: number; // 0 = run ถึงจุดเงียบโดยไม่ error (จบ/waiting-on-human) · 1 = ปฏิเสธ run
  driver: PipelineDriver | null;
}

const USAGE = [
  "usage: npx tsx src/main.ts <knowledge> <target> <module> --date YYYY-MM-DD [--resume]",
  "  knowledge → target → module — ลำดับเลือกของ run (sta-config — DES-015)",
  "  --date YYYY-MM-DD — วันที่จากผู้ใช้ (dateFromUser — ระบบไม่เดาวันที่)",
  "  --resume — resume จาก pointer เท่านั้น · ไม่ใส่ = เริ่ม run (สร้างใหม่เมื่อไม่มี pointer / วิ่งต่อเมื่อมี — AC-003)",
].join("\n");

// ข้อความ gate สั้น ๆ ทาง stdout (DES-008) — รายละเอียดคำถาม/คำตอบอยู่ที่ gate record/API (BE-015)
function gateLine(g: GateRecord): string {
  const scope = g.phase !== null ? `${g.scope} ${g.phase}` : g.taskIds.length > 0 ? `${g.scope} ${g.taskIds.join(",")}` : g.scope;
  return `gate ${g.gateId} เปิดรอคำตอบ (scope ${scope}) — ${g.question} — ผู้ตัดสิน: ${g.owner.name}`;
}

export async function main(opts: MainOptions = {}): Promise<MainResult> {
  const print = opts.out ?? ((line: string): void => {
    console.log(line);
  });
  const fail = (message: string): MainResult => {
    print(message);
    return { code: 1, driver: null };
  };

  // args — positional 3 ตัวตามลำดับเลือก + flags
  const argv = [...(opts.argv ?? process.argv.slice(2))];
  const positionals: string[] = [];
  let date: string | null = null;
  let resume = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--resume") resume = true;
    else if (a === "--date") {
      date = argv[i + 1] ?? null;
      i++;
    } else if (a.startsWith("--date=")) date = a.slice("--date=".length);
    else if (a.startsWith("--")) return fail(`arg ไม่รู้จัก: ${a}\n${USAGE}`);
    else positionals.push(a);
  }
  if (positionals.length !== 3) return fail(USAGE);
  const [knowledge, target, module] = positionals;
  if (date === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail(`ปฏิเสธ run — ต้องระบุ --date YYYY-MM-DD (วันที่จากผู้ใช้ — ระบบไม่เดาวันที่)\n${USAGE}`);
  }

  // config (BE-001) — fail-closed: ไฟล์หาย/parse/schema ไม่ผ่าน → ปฏิเสธพร้อม file:line (DES-001 "config ไม่ผ่าน → run ไม่เริ่ม")
  let config: AppConfig;
  try {
    config = opts.config ?? loadAppConfig();
  } catch (e) {
    return fail(`ปฏิเสธ run — config ไม่ผ่าน: ${(e as Error).message}`);
  }
  const selection = { knowledge, target };

  // ลำดับเลือก knowledge → target (DES-015) — path ไม่มีจริง/ไม่มีในรายการ → ปฏิเสธ run พร้อม path ก่อนสร้าง driver
  try {
    resolveRunRoots(config.sta, selection); // driver.start() ตรวจซ้ำทุกครั้ง (fail-closed — DES-015)
  } catch (e) {
    return fail(`ปฏิเสธ run — ${(e as Error).message}`);
  }

  // adapters — R1 มี 3 camp: claude (BE-012) · codex (BE-013) · antigravity (BE-014) · routing ส่ง camp อื่น →
  // driver ปฏิเสธ dispatch เอง (fail visibly) · รูป handoff ของ agy ยัง mark สมมติฐาน — รอยืนยันที่ QA-001
  const adapters: Record<string, CampAdapter> = opts.adapters !== undefined
    ? { ...opts.adapters }
    : {
        claude: new ClaudeAdapter(config.camps.camps.claude, { retryOnCrash: config.camps.defaults.retryOnCrash }),
        codex: new CodexAdapter(config.camps.camps.codex, { retryOnCrash: config.camps.defaults.retryOnCrash }),
        antigravity: new AntigravityAdapter(config.camps.camps.antigravity, { retryOnCrash: config.camps.defaults.retryOnCrash }),
      };

  const driver = new PipelineDriver({ config, selection, module, dateFromUser: date, adapters });
  try {
    const run = resume ? driver.resume() : driver.start();
    print(`${resume ? "resume" : "เริ่ม"} run ${run.runId} — module ${module} (knowledge ${knowledge} → target ${target})`);
    await driver.settle(); // รอ session active จบ — driver เดินต่อเองผ่าน outcome.then; เงียบ = จบ หรือหยุดที่ gate
  } catch (e) {
    return fail(`ปฏิเสธ run — ${(e as Error).message}`); // StateError/DriverError — pointer หาย/state เสีย/config ผิด
  }
  const run = driver.run!;
  if (run.status === "waiting-on-human") {
    const gates = driver.openGates();
    print(`run ${run.runId} — waiting-on-human`);
    if (gates.length === 0) print("ไม่มี gate open — ไม่มี task ใดเดินได้ (ดู dashboard notes/state)");
    for (const g of gates) print(gateLine(g));
  } else {
    print(`run ${run.runId} — สถานะ ${run.status}`);
  }
  return { code: 0, driver };
}

// SKELETON_MESSAGE — คง export ไว้ให้ test/skeleton.test.ts (placeholder ของ SETUP-001 — นอก Write paths ของ BE-011)
// ยังอ้างถึง · ข้อความอัปเดตแล้ว: ไฟล์นี้ไม่ใช่ skeleton อีกต่อไป — main() ด้านบนคือ terminal entry จริง (REV-045)
export const SKELETON_MESSAGE =
  "SETUP-001 skeleton ถูกแทนที่แล้ว — src/main.ts เป็น terminal entry ของ BE-011 (DES-001/015) ผ่าน main()";

// ปรินต์/รันเฉพาะเมื่อ execute ตรง (npm start / npx tsx src/main.ts) — import เพื่อ test ไม่รัน
const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (invokedDirectly) {
  main().then(
    (r) => {
      process.exitCode = r.code;
    },
    (e) => {
      console.error(`entry ล้มเหลว: ${(e as Error).message}`);
      process.exitCode = 1;
    },
  );
}
