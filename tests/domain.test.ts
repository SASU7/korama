import assert from "node:assert/strict";
import test from "node:test";
import { allocateFefo, assessOrigin, calculateQuote, seedDemoState, selectFefoBatch, sortieCommand } from "../lib/domain.ts";

test("the seed contains the two-way catalogue and a roadmap listing", () => {
  const state = seedDemoState();
  assert.equal(state.products.length, 10);
  assert.ok(state.products.some((product) => product.origin === "direct_import"));
  assert.ok(state.products.some((product) => product.origin === "ghana_origin_export"));
  assert.ok(state.products.some((product) => product.origin === "marketplace_future"));
});

test("FEFO rejects expired and quarantined stock and selects the earliest valid batch", () => {
  const state = seedDemoState();
  const batch = selectFefoBatch(state, "shea-balm");
  assert.equal(batch?.batch, "NK-SB-2407");
  assert.equal(state.batches.find((item) => item.id === "batch-expired")?.allocated, 0);
});

test("allocation only advances a paid order and never creates a negative balance", () => {
  const state = seedDemoState();
  const quote = calculateQuote(state, "shea-balm", 1);
  state.order = { reference: "KOR-NG-240829-001", status: "paid", productId: "shea-balm", quantity: 1, ...quote };
  const batch = allocateFefo(state);
  assert.equal(state.order.status, "allocated");
  assert.equal(batch.allocated, 1);
  assert.ok(batch.quantity - batch.allocated >= 0);
});

test("unsafe weather locks a sortie and records courier fallback", () => {
  const state = seedDemoState();
  sortieCommand(state, "inject_weather");
  assert.equal(state.sortie.status, "lockout");
  assert.equal(state.sortie.gates.find((gate) => gate.key === "weather")?.passed, false);
  assert.match(state.sortie.fallbackReason ?? "", /courier/i);
});

test("origin assessment rejects repackaging and keeps qualifying evidence provisional", () => {
  assert.equal(assessOrigin("Repackaging and relabelling only", ["Producer invoice", "Packing slip"]).status, "rejected");
  assert.equal(assessOrigin("Blended, filled, and batch-tested in Ghana", ["Producer invoice", "Transformation log"]).status, "provisionally_eligible");
});
