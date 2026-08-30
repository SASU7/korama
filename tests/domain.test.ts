import assert from "node:assert/strict";
import test from "node:test";
import { configuredAccessCode, currentRole, hasValidSession, roleCookie, sessionCookie, sessionToken, trustedRequestOrigin } from "../lib/demo-auth.ts";
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
  assert.throws(() => validateDeliveryAddress({ recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Accra", countryCode: "GH" }), /scoped to Nigeria/);
});

test("quantity validation rejects malformed or out-of-range quantities", () => {
  assert.equal(normalizeQuantity(undefined), 1);
  assert.equal(normalizeQuantity("3"), 3);
  assert.throws(() => normalizeQuantity("not-a-number"), /whole number/);
  assert.throws(() => normalizeQuantity(11), /between 1 and 10/);
});

test("demo auth uses runtime secrets and rejects forged guided roles", () => {
  const previousCode = process.env.KORAMA_DEMO_ACCESS_CODE;
  const previousSecret = process.env.KORAMA_DEMO_SESSION_SECRET;
  process.env.KORAMA_DEMO_ACCESS_CODE = "RUNTIME-ACCESS-CODE";
  process.env.KORAMA_DEMO_SESSION_SECRET = "runtime-session-secret-for-tests-32";
  try {
    assert.equal(configuredAccessCode(), "RUNTIME-ACCESS-CODE");
    const request = new Request("http://localhost", { headers: { cookie: `${sessionCookie().split(";", 1)[0]}; ${roleCookie("warehouse_operator").split(";", 1)[0]}` } });
    assert.equal(hasValidSession(request), true);
    assert.equal(currentRole(request), "warehouse_operator");
    assert.match(sessionToken(), /^[a-f0-9]{64}$/);
    assert.equal(currentRole(new Request("http://localhost", { headers: { cookie: `${sessionCookie().split(";", 1)[0]}; korama_demo_role=warehouse_operator` } })), "consumer");
  } finally {
    if (previousCode === undefined) delete process.env.KORAMA_DEMO_ACCESS_CODE; else process.env.KORAMA_DEMO_ACCESS_CODE = previousCode;
    if (previousSecret === undefined) delete process.env.KORAMA_DEMO_SESSION_SECRET; else process.env.KORAMA_DEMO_SESSION_SECRET = previousSecret;
  }
});

test("cookie mutations reject cross-origin requests and production cookies are secure", () => {
  const names = ["KORAMA_STAGING", "KORAMA_PRODUCTION", "NEXT_PUBLIC_APP_URL", "KORAMA_DEMO_ACCESS_CODE", "KORAMA_DEMO_SESSION_SECRET"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  delete process.env.KORAMA_STAGING;
  delete process.env.KORAMA_PRODUCTION;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  try {
    assert.equal(trustedRequestOrigin(new Request("http://localhost:3000", { headers: { origin: "http://localhost:3000" } })), null);
    assert.equal(trustedRequestOrigin(new Request("http://localhost:3000", { headers: { origin: "https://attacker.example" } }))?.status, 403);
    process.env.KORAMA_STAGING = "true";
    process.env.NEXT_PUBLIC_APP_URL = "https://demo.example.com";
    process.env.KORAMA_DEMO_ACCESS_CODE = "STAGING-ACCESS-CODE";
    process.env.KORAMA_DEMO_SESSION_SECRET = "staging-session-secret-for-tests-32";
    assert.equal(trustedRequestOrigin(new Request("https://demo.example.com", { headers: { origin: "https://demo.example.com" } })), null);
    assert.equal(trustedRequestOrigin(new Request("https://demo.example.com"))?.status, 403);
    assert.match(sessionCookie(), /; Secure/);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
