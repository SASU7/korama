const truthy = new Set(["1", "true", "yes"]);
const production = truthy.has((process.env.KORAMA_PRODUCTION ?? "").toLowerCase()) || truthy.has((process.env.KORAMA_STAGING ?? "").toLowerCase());
const present = (name) => Boolean(process.env[name]?.trim());
const errors = [];
const requiredTables = ["tenants", "operating_companies", "markets", "ports_nodes", "trade_lanes", "market_configs", "products", "variants", "media", "market_listings", "market_prices", "carts", "cart_items", "addresses", "orders", "ratings", "returns", "suppliers", "receipts", "inventory_batches", "inventory_balances", "inventory_movements", "warehouse_tasks", "origin_records", "transformation_records", "origin_evidence", "origin_assessments", "duty_quotes", "certificate_previews", "shipments", "delivery_legs", "drones", "authorizations", "weather_snapshots", "geofences", "sorties", "sortie_events", "audit_events", "idempotency_keys", "demo_state_snapshots"];
const requireAll = (names, context) => {
  const missing = names.filter((name) => !present(name));
  if (missing.length) errors.push(`${context} is missing: ${missing.join(", ")}`);
};

if (!production) {
  console.log("staging preflight skipped (set KORAMA_STAGING=true or KORAMA_PRODUCTION=true to run remote checks)");
  process.exit(0);
}

requireAll(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PAYSTACK_SECRET_KEY", "PAYSTACK_WEBHOOK_SECRET", "NEXT_PUBLIC_MAPBOX_TOKEN", "KORAMA_DEMO_ACCESS_CODE", "KORAMA_DEMO_SESSION_SECRET"], "Staging configuration");
if (present("NEXT_PUBLIC_APP_URL") && !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) errors.push("NEXT_PUBLIC_APP_URL must use HTTPS for staging");
if (!truthy.has((process.env.KORAMA_USE_SUPABASE ?? "").toLowerCase())) errors.push("KORAMA_USE_SUPABASE=true is required for staging");
if (!truthy.has((process.env.KORAMA_USE_SUPABASE_AUTH ?? "").toLowerCase())) errors.push("KORAMA_USE_SUPABASE_AUTH=true is required for staging");
requireAll(["KORAMA_SEED_PASSWORD", "KORAMA_CONSUMER_EMAIL", "KORAMA_WAREHOUSE_EMAIL", "KORAMA_SAFETY_EMAIL"], "Supabase Auth guided identities");
if (present("KORAMA_SEED_PASSWORD") && process.env.KORAMA_SEED_PASSWORD.length < 16) errors.push("KORAMA_SEED_PASSWORD must be at least 16 characters");
if (present("PAYSTACK_SECRET_KEY") && !/^sk_test_/.test(process.env.PAYSTACK_SECRET_KEY)) errors.push("PAYSTACK_SECRET_KEY must be a Paystack test key for the prototype");
if (present("NEXT_PUBLIC_MAPBOX_TOKEN") && !/^pk\./.test(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)) errors.push("NEXT_PUBLIC_MAPBOX_TOKEN does not look like a public Mapbox token");
if (process.env.KORAMA_DEMO_ACCESS_CODE?.trim().toUpperCase() === "KORAMA-DEMO") errors.push("KORAMA_DEMO_ACCESS_CODE must not use the local default for staging");
if (process.env.KORAMA_DEMO_SESSION_SECRET === "local-korama-demo-session-secret") errors.push("KORAMA_DEMO_SESSION_SECRET must not use the local default for staging");

if (errors.length) {
  for (const error of errors) console.error(`staging preflight error: ${error}`);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const supabaseHeaders = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
const checks = [
  ["Supabase REST schema", `${supabaseUrl}/rest/v1/`],
  ["Supabase markets seed", `${supabaseUrl}/rest/v1/markets?select=code&code=eq.NG&limit=1`],
  ["Supabase catalogue seed", `${supabaseUrl}/rest/v1/products?select=reference&reference=eq.NK-SHEA-BALM&limit=1`],
  ["Supabase snapshot table", `${supabaseUrl}/rest/v1/demo_state_snapshots?select=id,revision&limit=1`],
];
for (const [label, url] of checks) {
  try {
    const response = await fetch(url, { headers: supabaseHeaders, signal: AbortSignal.timeout(8000) });
    if (!response.ok) errors.push(`${label} returned HTTP ${response.status}`);
    if (label === "Supabase REST schema" && response.ok) {
      const schema = await response.json();
      const missing = requiredTables.filter((table) => !schema.paths?.[`/${table}`]);
      if (missing.length) errors.push(`Supabase REST schema is missing: ${missing.join(", ")}`);
    }
  } catch (error) { errors.push(`${label} failed: ${error instanceof Error ? error.message : "request error"}`); }
}

try {
  const response = await fetch(`https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${encodeURIComponent(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) errors.push(`Mapbox style check returned HTTP ${response.status}`);
} catch (error) { errors.push(`Mapbox style check failed: ${error instanceof Error ? error.message : "request error"}`); }

if (errors.length) {
  for (const error of errors) console.error(`staging preflight error: ${error}`);
  process.exit(1);
}
console.log("staging preflight passed: HTTPS, adapter credentials, Supabase schema/seed, and Mapbox access");
