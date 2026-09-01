import assert from "node:assert/strict";
import test from "node:test";
import { trustedRequestOrigin } from "../lib/request-security.ts";
import { allocateCartFefo, apportionDelivery, assessOrigin, calculateQuote, cartWeightGrams, markOrder, normalizeCart, normalizeQuantity, resolveDeliveryMethod, seedDemoState, selectFefoBatch, sortieCommand, validateDeliveryAddress, type CartLine, type DeliveryMethod, type DemoState, type Order, type Quote } from "../lib/domain.ts";

/** Build the Order shape a quote implies, so tests read like the real flow. */
function orderFrom(state: DemoState, cart: CartLine[], status: Order["status"], reference = "KOR-GH-260901-001", deliveryMethod: DeliveryMethod = "simulated_drone"): Order {
  const quote: Quote = calculateQuote(state, cart);
  return {
    reference,
    status,
    lines: quote.lines.map((line, index) => {
      const product = state.products.find((p) => p.id === line.productId)!;
      return {
        lineNo: index + 1,
        productId: line.productId,
        name: product.name,
        producer: product.producer,
        origin: line.origin,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        subtotalMinor: line.subtotalMinor,
        taxMinor: line.taxMinor,
        deliveryMinor: line.deliveryMinor,
        allocatedQuantity: 0,
      };
    }),
    subtotalMinor: quote.subtotalMinor,
    taxMinor: quote.taxMinor,
    deliveryMinor: quote.deliveryMinor,
    totalMinor: quote.totalMinor,
    currency: "GHS",
    itemCount: quote.itemCount,
    deliveryMethod,
    productId: cart[0].productId,
    quantity: cart[0].quantity,
  };
}

test("delivery routing is normalized server-side and overweight parcels always use a courier", () => {
  assert.equal(resolveDeliveryMethod("drone", 2000), "simulated_drone");
  assert.equal(resolveDeliveryMethod("courier", 180), "ground_courier");
  assert.equal(resolveDeliveryMethod("simulated_drone", 2001), "ground_courier");
  assert.throws(() => resolveDeliveryMethod("helicopter", 180), /delivery method/i);
});

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
  state.order = orderFrom(state, [{ productId: "shea-balm", quantity: 1 }], "paid", "KOR-GH-260901-001");
  const allocations = allocateCartFefo(state);
  assert.equal(state.order!.status, "allocated");
  assert.equal(allocations.length, 1);
  assert.equal(allocations[0].batch.allocated, 1);
  assert.ok(allocations[0].batch.quantity - allocations[0].batch.allocated >= 0);
});

test("unsafe weather locks a sortie and records courier fallback", () => {
  const state = seedDemoState();
  state.order = orderFrom(state, [{ productId: "shea-balm", quantity: 1 }], "dispatched", "KOR-GH-260901-001");
  state.shipment = { reference: "SHP-KOR-GH-260901-001", status: "in_transit", legs: [{ sequenceNo: 1, mode: "simulated_drone", origin: "Accra warehouse", destination: "Fictional Accra micro-hub", status: "in_transit" }] };
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
  state.order = orderFrom(state, [{ productId: "shea-balm", quantity: 1 }], "dispatched", "KOR-GH-260901-001");
  state.shipment = { reference: "SHP-KOR-GH-260901-001", status: "in_transit", legs: [{ sequenceNo: 1, mode: "simulated_drone", origin: "Accra warehouse", destination: "Fictional Accra micro-hub", status: "in_transit" }] };
  state.sortie.gates[3].passed = false;
  assert.throws(() => sortieCommand(state, "preflight"), /Preflight blocked/);
  assert.equal(state.sortie.status, "draft");
  assert.throws(() => sortieCommand(state, "launch"), /successful preflight/);
});

test("a cleared sortie launches before telemetry advances en route", () => {
  const state = seedDemoState();
  state.order = orderFrom(state, [{ productId: "shea-balm", quantity: 1 }], "dispatched", "KOR-GH-260901-001");
  state.shipment = { reference: "SHP-KOR-GH-260901-001", status: "in_transit", legs: [{ sequenceNo: 1, mode: "simulated_drone", origin: "Accra warehouse", destination: "Fictional Accra micro-hub", status: "in_transit" }] };
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
  state.order = orderFrom(state, [{ productId: "shea-balm", quantity: 1 }], "picked", "KOR-GH-260901-001");
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

test("a courier-routed order never creates or unlocks a simulated drone leg", () => {
  const state = seedDemoState();
  state.order = orderFrom(state, [{ productId: "direct-blender", quantity: 2 }], "picked", "KOR-GH-COURIER-001", "ground_courier");
  state.orderEvents[0].complete = true;
  markOrder(state, "packed");
  markOrder(state, "dispatched");
  assert.equal(state.shipment?.legs.length, 1);
  assert.equal(state.shipment?.legs[0]?.mode, "ground_courier");
  assert.throws(() => sortieCommand(state, "preflight"), /courier/i);
});

test("an in-flight abort stops the simulated leg and creates one courier fallback", () => {
  const state = seedDemoState();
  state.order = orderFrom(state, [{ productId: "shea-balm", quantity: 1 }], "dispatched");
  state.shipment = { reference: "SHP-KOR-GH-260901-001", status: "in_transit", legs: [{ sequenceNo: 1, mode: "simulated_drone", origin: "Accra warehouse", destination: "Fictional Accra micro-hub", status: "in_transit" }] };
  sortieCommand(state, "preflight");
  sortieCommand(state, "launch");
  sortieCommand(state, "abort");
  assert.equal(state.sortie.status, "abort");
  assert.match(state.sortie.fallbackReason ?? "", /abort/i);
  assert.equal(state.shipment?.legs[0]?.status, "fallback");
  assert.equal(state.shipment?.legs.filter((leg) => leg.mode === "ground_courier").length, 1);
});

test("origin assessment rejects repackaging and keeps qualifying evidence provisional", () => {
  assert.equal(assessOrigin("Repackaging and relabelling only", ["Producer invoice", "Packing slip"]).status, "rejected");
  assert.equal(assessOrigin("Blended, filled, and batch-tested in Ghana", ["Producer invoice", "Transformation log"]).status, "provisionally_eligible");
});

test("delivery address validation keeps checkout scoped to Ghana", () => {
  assert.deepEqual(validateDeliveryAddress({ recipientName: "Ama Mensah", addressLine: "14 Oxford Street", city: "Accra", countryCode: "gh" }), { recipientName: "Ama Mensah", addressLine: "14 Oxford Street", city: "Accra", countryCode: "GH" });
  assert.throws(() => validateDeliveryAddress({ recipientName: "A", addressLine: "14 Oxford Street", city: "Accra", countryCode: "GH" }), /recipient name/);
  // Nigeria is parked: Paystack cannot settle an NGN order on this account.
  assert.throws(() => validateDeliveryAddress({ recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Lagos", countryCode: "NG" }), /Ghanaian delivery addresses/);
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
