import assert from "node:assert/strict";
import test from "node:test";
import { trustedRequestOrigin } from "../lib/request-security.ts";
import { allocateFefo, assessOrigin, calculateQuote, markOrder, normalizeQuantity, seedDemoState, selectFefoBatch, sortieCommand, validateDeliveryAddress } from "../lib/domain.ts";

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

test("FEFO skips a valid batch that cannot cover the full order", () => {
  const state = seedDemoState();
  const eligible = state.batches.find((batch) => batch.batch === "NK-SB-2407")!;
  eligible.allocated = eligible.quantity - 1;
  assert.equal(selectFefoBatch(state, "shea-balm", 2), null);
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
  const quote = calculateQuote(state, "shea-balm", 1);
  state.order = { reference: "KOR-NG-240829-001", status: "dispatched", productId: "shea-balm", quantity: 1, ...quote };
  state.shipment = { reference: "SHP-KOR-NG-240829-001", status: "in_transit", legs: [{ sequenceNo: 1, mode: "simulated_drone", origin: "Lekki warehouse", destination: "Fictional Lekki micro-hub", status: "in_transit" }] };
  sortieCommand(state, "inject_weather");
  assert.equal(state.sortie.status, "lockout");
  assert.equal(state.sortie.gates.find((gate) => gate.key === "weather")?.passed, false);
  assert.match(state.sortie.fallbackReason ?? "", /courier/i);
  assert.equal(state.shipment?.status, "fallback");
  assert.equal(state.shipment?.legs.find((leg) => leg.mode === "ground_courier")?.status, "in_transit");
  sortieCommand(state, "inject_weather");
  assert.equal(state.shipment?.legs.filter((leg) => leg.mode === "ground_courier").length, 1);
});

test("failed preflight does not make a sortie launchable", () => {
  const state = seedDemoState();
  const quote = calculateQuote(state, "shea-balm", 1);
  state.order = { reference: "KOR-NG-240829-001", status: "dispatched", productId: "shea-balm", quantity: 1, ...quote };
  state.sortie.gates[3].passed = false;
  assert.throws(() => sortieCommand(state, "preflight"), /Preflight blocked/);
  assert.equal(state.sortie.status, "draft");
  assert.throws(() => sortieCommand(state, "launch"), /successful preflight/);
});

test("a cleared sortie launches before telemetry advances en route", () => {
  const state = seedDemoState();
  const quote = calculateQuote(state, "shea-balm", 1);
  state.order = { reference: "KOR-NG-240829-001", status: "dispatched", productId: "shea-balm", quantity: 1, ...quote };
  state.shipment = { reference: "SHP-KOR-NG-240829-001", status: "in_transit", legs: [{ sequenceNo: 1, mode: "simulated_drone", origin: "Lekki warehouse", destination: "Fictional Lekki micro-hub", status: "in_transit" }] };
  sortieCommand(state, "preflight");
  assert.equal(state.sortie.status, "cleared");
  sortieCommand(state, "launch");
  assert.equal(state.sortie.status, "launched");
  assert.equal(state.sortie.telemetry.length, 1);
  sortieCommand(state, "advance");
  assert.equal(state.sortie.status, "en_route");
  assert.equal(state.sortie.telemetry.length, 4);
});

test("dispatch creates a shipment and delivery completion closes its leg", () => {
  const state = seedDemoState();
  const quote = calculateQuote(state, "shea-balm", 1);
  state.order = { reference: "KOR-NG-240829-001", status: "picked", productId: "shea-balm", quantity: 1, ...quote };
  state.orderEvents[0].complete = true;
  markOrder(state, "packed");
  markOrder(state, "dispatched");
  assert.equal(state.shipment?.status, "in_transit");
  sortieCommand(state, "preflight");
  sortieCommand(state, "launch");
  sortieCommand(state, "advance");
  sortieCommand(state, "complete");
  assert.equal(state.shipment?.status, "delivered");
  assert.equal(state.shipment?.legs[0]?.status, "complete");
});

test("origin assessment rejects repackaging and keeps qualifying evidence provisional", () => {
  assert.equal(assessOrigin("Repackaging and relabelling only", ["Producer invoice", "Packing slip"]).status, "rejected");
  assert.equal(assessOrigin("Blended, filled, and batch-tested in Ghana", ["Producer invoice", "Transformation log"]).status, "provisionally_eligible");
});

test("delivery address validation keeps checkout scoped to Nigeria", () => {
  assert.deepEqual(validateDeliveryAddress({ recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Lagos", countryCode: "ng" }), { recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Lagos", countryCode: "NG" });
  assert.throws(() => validateDeliveryAddress({ recipientName: "A", addressLine: "12 Way", city: "Lagos", countryCode: "NG" }), /recipient name/);
  assert.throws(() => validateDeliveryAddress({ recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Accra", countryCode: "GH" }), /Nigerian delivery addresses/);
});

test("quantity validation rejects malformed or out-of-range quantities", () => {
  assert.equal(normalizeQuantity(undefined), 1);
  assert.equal(normalizeQuantity("3"), 3);
  assert.throws(() => normalizeQuantity("not-a-number"), /whole number/);
  assert.throws(() => normalizeQuantity(11), /between 1 and 10/);
});

test("cookie mutations reject missing and cross-origin requests", () => {
  assert.equal(trustedRequestOrigin(new Request("http://localhost:3000", { headers: { origin: "http://localhost:3000" } })), null);
  assert.equal(trustedRequestOrigin(new Request("http://localhost:3000", { headers: { origin: "https://attacker.example" } }))?.status, 403);
  assert.equal(trustedRequestOrigin(new Request("https://demo.example.com"))?.status, 403);
});
