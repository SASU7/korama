import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { createNormalizedRepository } from "../lib/supabase/normalized-repository.ts";

const localEnv = await readFile(".env", "utf8").catch(() => "");
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("normalized contract check skipped (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run it)");
  process.exit(0);
}

const repository = createNormalizedRepository(createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }));
const nigeria = await repository.listCatalogue("NG");
const ghana = await repository.listCatalogue("GH");
assert.equal(nigeria.length, 8, "Nigeria should expose the eight seeded listings");
assert.equal(ghana.length, 2, "Ghana should expose the two seeded listings");
assert.ok(nigeria.some((item) => item.product.inventory_class === "ghana_origin_export" && item.listing.purchasable));
assert.ok(nigeria.some((item) => item.product.inventory_class === "direct_import" && item.listing.purchasable));
assert.ok(nigeria.some((item) => item.product.inventory_class === "marketplace_future" && !item.listing.purchasable));
assert.ok(nigeria.every((item) => item.variant && item.media.length > 0), "every seeded listing should have a variant and media row");

const operations = await repository.getOperationalSnapshot("10000000-0000-0000-0000-000000000002");
assert.equal(operations.batches.length, 4, "Nigeria should expose four seeded inventory batches");
assert.equal(operations.transfers.length, 1);
assert.equal(operations.tasks.length, 2);
assert.equal(operations.sorties.length, 0, "sorties are created by an order journey, not by the seed");
console.log("normalized contract pass: " + nigeria.length + " NG listings, " + ghana.length + " GH listings, " + operations.batches.length + " NG batches, scoped operational reads");
