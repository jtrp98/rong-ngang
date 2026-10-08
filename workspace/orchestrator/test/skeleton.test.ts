// SETUP-001 — placeholder test (node:test) พิสูจน์ว่า test runner ผ่าน tsx รันได้จริง
// และ src/ import ได้จริง — ไม่มี logic ให้ทดสอบ; test จริงเป็นของ BE tasks (DES-004, 006, 008, 011, 012)
import assert from "node:assert/strict";
import { test } from "node:test";

import { SKELETON_MESSAGE, main } from "../src/main.ts";

test("SETUP-001 skeleton: src/main.ts import ได้จริงและ export ครบ", () => {
  assert.equal(typeof main, "function");
  assert.match(SKELETON_MESSAGE, /SETUP-001/);
});
