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
// Ghana is the pilot market and Nigeria is parked — see the 20260901180000
// ghana_pilot migration. The assertions below are structural on purpose: the
// previous version pinned batch and listing counts, and went stale the moment
// the seed grew a batch.
const PILOT_MARKET = "GH";
const PILOT_OPERATING_COMPANY = "10000000-0000-0000-0000-000000000001";
const PARKED_MARKET = "NG";

const pilot = await repository.listCatalogue(PILOT_MARKET);
const parked = await repository.listCatalogue(PARKED_MARKET);
assert.ok(pilot.length > 0, "the pilot market should expose listings");
assert.ok(parked.length > 0, "the parked market should still read as a catalogue");
assert.ok(
  pilot.every((item) => item.listing.currency === item.market.currency),
  "every pilot listing must be priced in the market currency, or korama_create_order rejects the cart",
);
assert.ok(pilot.some((item) => item.product.inventory_class === "ghana_origin_export" && item.listing.purchasable));
assert.ok(pilot.some((item) => item.product.inventory_class === "direct_import" && item.listing.purchasable));
assert.ok(pilot.some((item) => item.product.inventory_class === "marketplace_future" && !item.listing.purchasable));
assert.ok(
  pilot.every((item) => item.variant && item.media.length > 0),
  "every listing should have a variant and media row",
);
const shea = pilot.find((item) => item.product.reference === "NK-SHEA-BALM");
assert.equal(shea?.product.attributes?.transformation, "Blended, filled, labelled, and batch-tested in Ghana", "product detail attributes should remain data-backed");

const operations = await repository.getOperationalSnapshot(PILOT_OPERATING_COMPANY);
assert.ok(operations.batches.length > 0, "the pilot company should hold allocatable inventory");
assert.ok(
  operations.batches.some((batch) => !batch.quarantined && batch.quantity - batch.allocated > 0),
  "at least one pilot batch must be allocatable, or checkout cannot complete",
);
assert.equal(operations.sorties.length, 0, "sorties are created by an order journey, not by the seed");
console.log(
  `normalized contract pass: ${pilot.length} ${PILOT_MARKET} listings (pilot), ` +
  `${parked.length} ${PARKED_MARKET} listings (parked), ` +
  `${operations.batches.length} pilot batches, scoped operational reads`,
);
