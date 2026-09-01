import assert from "node:assert/strict";
import test from "node:test";
import { parseCart, serializeCart } from "../lib/cart-cookie.ts";

test("anonymous Ghana cart round-trips in the current cookie contract", () => {
  const lines = [{ productId: "ghana-cocoa", quantity: 2 }];
  assert.deepEqual(parseCart(serializeCart(lines)), lines);
});

test("legacy unversioned NGN cart cannot enter Ghana checkout", () => {
  assert.deepEqual(parseCart(JSON.stringify([["direct-blender", 1]])), []);
  assert.deepEqual(parseCart(JSON.stringify({ version: 2, market: "NG", lines: [["direct-blender", 1]] })), []);
});
