import assert from "node:assert";
import { setBit, bitAt, countOnes } from "../bits.js";
import { step, close } from "../bitrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, size: 8,
  state: { bits: "00000000", reads: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "set", index: 3 }],
  index_error_code: "E_BAD_INDEX", range_error_code: "E_OUT_OF_RANGE",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("setBit returns text", () => {
  assert.strictEqual(typeof setBit("00", 1, "1"), "string");
});

check("bitAt returns a number", () => {
  assert.strictEqual(typeof bitAt("10", 0), "number");
});

check("countOnes returns a number", () => {
  assert.strictEqual(typeof countOnes("10"), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
