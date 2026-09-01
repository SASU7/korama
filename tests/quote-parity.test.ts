/**
 * TypeScript/SQL arithmetic parity.
 *
 * calculateQuote in lib/domain.ts and korama_create_order in
 * 20260901120000_multi_line_orders.sql must agree to the minor unit. If they
 * drift, korama_verify_payment compares Paystack's amount against an order
 * total the client was never shown and rejects a payment that really happened.
 *
 * The table below is written so the same cases can be replayed in SQL:
 *   scripts/multiline-order-check.mjs runs them against a live database.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  apportionDelivery,
  calculateQuote,
  cartWeightGrams,
  DELIVERY_DIRECT_IMPORT_MINOR,
  DELIVERY_GHANA_ORIGIN_MINOR,
  MAX_CART_LINES,
  MAX_CART_QUANTITY,
  normalizeCart,
  seedDemoState,
  TAX_RATE,
} from "../lib/domain.ts";

/** Seeded NGN prices, for readability in the expectations below. */
const PRICE = { "shea-balm": 485000, "shea-oil": 620000, "direct-scarf": 730000 };

export const PARITY_CASES = [
  {
    name: "single Ghana-origin line",
    cart: [{ productId: "shea-balm", quantity: 1 }],
    expect: { subtotal: 485000, tax: 36375, delivery: DELIVERY_GHANA_ORIGIN_MINOR, total: 971375 },
  },
  {
    name: "single line, quantity 2",
    cart: [{ productId: "shea-balm", quantity: 2 }],
    expect: { subtotal: 970000, tax: 72750, delivery: DELIVERY_GHANA_ORIGIN_MINOR, total: 1492750 },
  },
  {
    name: "two Ghana-origin lines keep the lower delivery rate",
    cart: [
      { productId: "shea-balm", quantity: 1 },
      { productId: "shea-oil", quantity: 1 },
    ],
    expect: {
      subtotal: PRICE["shea-balm"] + PRICE["shea-oil"],
      tax: Math.round(485000 * TAX_RATE) + Math.round(620000 * TAX_RATE),
      delivery: DELIVERY_GHANA_ORIGIN_MINOR,
      total:
        PRICE["shea-balm"] +
        PRICE["shea-oil"] +
        Math.round(485000 * TAX_RATE) +
        Math.round(620000 * TAX_RATE) +
        DELIVERY_GHANA_ORIGIN_MINOR,
    },
  },
  {
    name: "one direct import raises the whole order to the higher rate",
    cart: [
      { productId: "shea-balm", quantity: 2 },
      { productId: "shea-oil", quantity: 1 },
      { productId: "direct-scarf", quantity: 1 },
    ],
    expect: {
      subtotal: 970000 + 620000 + 730000,
      tax:
        Math.round(970000 * TAX_RATE) +
        Math.round(620000 * TAX_RATE) +
        Math.round(730000 * TAX_RATE),
      delivery: DELIVERY_DIRECT_IMPORT_MINOR,
      total:
        970000 +
        620000 +
        730000 +
        Math.round(970000 * TAX_RATE) +
        Math.round(620000 * TAX_RATE) +
        Math.round(730000 * TAX_RATE) +
        DELIVERY_DIRECT_IMPORT_MINOR,
    },
  },
] as const;

test("quote arithmetic matches the values the SQL produces", () => {
  const state = seedDemoState();
  for (const testCase of PARITY_CASES) {
    const quote = calculateQuote(state, [...testCase.cart]);
    assert.equal(quote.subtotalMinor, testCase.expect.subtotal, `${testCase.name}: subtotal`);
    assert.equal(quote.taxMinor, testCase.expect.tax, `${testCase.name}: tax`);
    assert.equal(quote.deliveryMinor, testCase.expect.delivery, `${testCase.name}: delivery`);
    assert.equal(quote.totalMinor, testCase.expect.total, `${testCase.name}: total`);
  }
});

test("line figures reconcile to the order figures exactly", () => {
  const state = seedDemoState();
  for (const testCase of PARITY_CASES) {
    const quote = calculateQuote(state, [...testCase.cart]);
    const sum = (pick: (line: (typeof quote.lines)[number]) => number) =>
      quote.lines.reduce((total, line) => total + pick(line), 0);
    assert.equal(sum((l) => l.subtotalMinor), quote.subtotalMinor, `${testCase.name}: subtotal sums`);
    assert.equal(sum((l) => l.taxMinor), quote.taxMinor, `${testCase.name}: tax sums`);
    // The apportioned delivery shares must total the order fee to the unit —
    // this is where integer division would otherwise lose a kobo.
    assert.equal(sum((l) => l.deliveryMinor), quote.deliveryMinor, `${testCase.name}: delivery apportions exactly`);
    assert.equal(
      quote.subtotalMinor + quote.taxMinor + quote.deliveryMinor,
      quote.totalMinor,
      `${testCase.name}: total`,
    );
  }
});

test("delivery apportionment never loses or invents a minor unit", () => {
  // Deliberately awkward splits: primes, zeros, and a single line.
  for (const subtotals of [[1], [1, 1, 1], [7, 11, 13], [0, 0], [999999, 1], [3, 3, 3, 3, 3, 3, 3]]) {
    for (const fee of [450000, 550000, 1, 7]) {
      const parts = apportionDelivery(subtotals, fee);
      assert.equal(parts.length, subtotals.length);
      assert.equal(
        parts.reduce((a, b) => a + b, 0),
        fee,
        `apportion(${JSON.stringify(subtotals)}, ${fee})`,
      );
      assert.ok(parts.every((part) => Number.isInteger(part)));
    }
  }
});

test("cart bounds reject what the SQL rejects", () => {
  assert.throws(() => normalizeCart([]), /add something/i);
  assert.throws(() => normalizeCart("nope"), /must be an array/i);
  assert.throws(
    () => normalizeCart(Array.from({ length: MAX_CART_LINES + 1 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }))),
    /at most 10 lines/i,
  );
  assert.throws(
    () => normalizeCart([{ productId: "shea-balm", quantity: 11 }]),
    /between 1 and 10/i,
  );
  assert.throws(
    () => normalizeCart([
      { productId: "a", quantity: 10 },
      { productId: "b", quantity: 10 },
      { productId: "c", quantity: 10 },
      { productId: "d", quantity: 1 },
    ]),
    new RegExp(`at most ${MAX_CART_QUANTITY} units`, "i"),
  );
  assert.throws(
    () => normalizeCart([
      { productId: "shea-balm", quantity: 1 },
      { productId: "shea-balm", quantity: 1 },
    ]),
    /same product twice/i,
  );
  assert.deepEqual(normalizeCart([{ productId: " shea-balm ", quantity: 2 }]), [
    { productId: "shea-balm", quantity: 2 },
  ]);
});

test("cart weight decides drone eligibility", () => {
  const state = seedDemoState();
  // The blender alone is 1900g; two of them exceed the 2kg payload limit, which
  // is the case that used to strand a sortie in draft with no way to fall back.
  assert.equal(cartWeightGrams(state, [{ productId: "direct-blender", quantity: 1 }]), 1900);
  assert.equal(cartWeightGrams(state, [{ productId: "direct-blender", quantity: 2 }]), 3800);
  assert.equal(
    cartWeightGrams(state, [
      { productId: "shea-balm", quantity: 2 },
      { productId: "shea-oil", quantity: 1 },
    ]),
    180 * 2 + 220,
  );
});
