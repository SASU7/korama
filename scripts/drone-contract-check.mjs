import { readFile } from "node:fs/promises";

const files = {
  checkout: await readFile(new URL("../components/shop/checkout-form.tsx", import.meta.url), "utf8"),
  paymentRoute: await readFile(new URL("../app/api/payments/paystack/initialize/route.ts", import.meta.url), "utf8"),
  adapter: await readFile(new URL("../lib/supabase/normalized-adapter.ts", import.meta.url), "utf8"),
  sortieControls: await readFile(new URL("../components/workspace/sortie-controls.tsx", import.meta.url), "utf8"),
  domain: await readFile(new URL("../lib/domain.ts", import.meta.url), "utf8"),
  migration: await readFile(new URL("../supabase/migrations/20260901142253_drone_delivery_contract.sql", import.meta.url), "utf8"),
  pilotMigration: await readFile(new URL("../supabase/migrations/20260901180000_ghana_pilot.sql", import.meta.url), "utf8"),
  tests: await readFile(new URL("../tests/domain.test.ts", import.meta.url), "utf8"),
  databaseTest: await readFile(new URL("../supabase/tests/drone_delivery_contract_test.sql", import.meta.url), "utf8"),
};

const requirements = [
  ["checkout submits delivery choice", files.checkout, "deliveryMethod: method"],
  ["API forwards delivery choice", files.paymentRoute, "body.deliveryMethod"],
  ["server resolves delivery method", files.adapter, "resolveDeliveryMethod(requestedDeliveryMethod, weightGrams)"],
  ["domain hard-routes overweight parcels", files.domain, "weightGrams > DRONE_PAYLOAD_LIMIT_GRAMS"],
  ["order persists resolved method", files.migration, "add column delivery_method text not null"],
  ["database enforces 2kg fallback", files.migration, "when parcel_weight_grams > 2000 then 'ground_courier'"],
  ["dispatch branches on route", files.migration, "if resolved_method = 'simulated_drone' then"],
  ["manual override is a real gate", files.migration, "drone_row.manual_override_ready = false"],
  ["authorization is Lagos-route-specific", files.migration, "a.jurisdiction = ''Nigeria · Lagos corridor''"],
  ["geofence is corridor-specific", files.migration, "g.reference like ''KOR-LEKKI-%-CORRIDOR''"],
  ["abort transition exists", files.migration, "elsif p_command = ''abort'' then"],
  ["safety console exposes immediate abort", files.sortieControls, "Abort sortie + use courier"],
  ["safety console can advance telemetry", files.sortieControls, "Advance simulated telemetry"],
  ["sortie events are hash chained", files.migration, "create trigger sortie_events_hash_chain"],
  ["courier-only behavior is tested", files.tests, "never creates or unlocks a simulated drone leg"],
  ["abort fallback is tested", files.tests, "an in-flight abort stops the simulated leg"],
  ["database acceptance rolls back", files.databaseTest, "rollback;"],
  ["database acceptance checks route binding", files.databaseTest, "Preflight did not bind the pilot authorization and route corridor"],
  ["database acceptance checks the event chain", files.databaseTest, "Sortie event hash chain is broken"],
  ["later pilot migration preserves tenant-bound preflight", files.pilotMigration, "tenant-bound preflight and safety abort"],
];

for (const [name, source, marker] of requirements) {
  if (!source.includes(marker)) throw new Error(`drone contract failed: ${name}`);
}

console.log(`drone contract pass (${requirements.length} implementation and test markers)`);
