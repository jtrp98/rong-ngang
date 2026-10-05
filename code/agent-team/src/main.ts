// SETUP-001 — entry stub (skeleton) เท่านั้น ยังไม่มี logic ใด
// BE-001 จะแทนที่ด้วย entry จริง: โหลด config → start server + pipeline driver (DES-001, DES-009)
import { pathToFileURL } from "node:url";

export const SKELETON_MESSAGE =
  "agent-team skeleton (SETUP-001) — ยังไม่มี logic: รอ BE-001 wire entry จริง (DES-001, DES-009)";

export function main(): void {
  console.log(SKELETON_MESSAGE);
}

// ปรินต์เฉพาะเมื่อ execute ตรง (npm start / npx tsx src/main.ts) — import เพื่อ test ไม่ปรินต์
const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (invokedDirectly) {
  main();
}
