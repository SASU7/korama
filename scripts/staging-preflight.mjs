import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const localEnv = await readFile(".env", "utf8").catch(() => "");
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

const truthy = new Set(["1", "true", "yes"]);
const production = truthy.has((process.env.KORAMA_PRODUCTION ?? "").toLowerCase()) || truthy.has((process.env.KORAMA_STAGING ?? "").toLowerCase());
const present = (name) => Boolean(process.env[name]?.trim());
const errors = [];
const requiredTables = ["tenants", "operating_companies", "markets", "ports_nodes", "trade_lanes", "market_configs", "products", "variants", "media", "market_listings", "market_prices", "carts", "cart_items", "addresses", "orders", "ratings", "returns", "suppliers", "receipts", "inventory_batches", "inventory_balances", "inventory_movements", "warehouse_tasks", "origin_records", "transformation_records", "origin_evidence", "origin_assessments", "duty_quotes", "certificate_previews", "shipments", "delivery_legs", "drones", "authorizations", "weather_snapshots", "geofences", "sorties", "sortie_events", "audit_events", "idempotency_keys", "demo_state_snapshots"];
const requiredRpcs = ["korama_create_order", "korama_verify_payment", "korama_allocate_order_fefo", "korama_advance_order", "korama_command_sortie", "korama_reset_demo"];
const requireAll = (names, context) => {
  const missing = names.filter((name) => !present(name));
  if (missing.length) errors.push(`${context} is missing: ${missing.join(", ")}`);
};

if (!production) {
  console.log("staging preflight skipped (set KORAMA_STAGING=true or KORAMA_PRODUCTION=true to run remote checks)");
  process.exit(0);
}

requireAll(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "PAYSTACK_SECRET_KEY", "PAYSTACK_WEBHOOK_SECRET", "NEXT_PUBLIC_MAPBOX_TOKEN", "KORAMA_DEMO_ACCESS_CODE", "KORAMA_DEMO_SESSION_SECRET"], "Staging configuration");
if (!truthy.has((process.env.KORAMA_USE_SUPABASE_AUTH ?? "").toLowerCase())) errors.push("KORAMA_USE_SUPABASE_AUTH=true is required for staging");
if (!truthy.has((process.env.KORAMA_USE_NORMALIZED_REPOSITORY ?? "").toLowerCase())) errors.push("KORAMA_USE_NORMALIZED_REPOSITORY=true is required for staging");
requireAll(["KORAMA_SEED_PASSWORD", "KORAMA_CONSUMER_EMAIL", "KORAMA_WAREHOUSE_EMAIL", "KORAMA_SAFETY_EMAIL"], "Supabase Auth guided identities");
if (present("KORAMA_SEED_PASSWORD") && process.env.KORAMA_SEED_PASSWORD.length < 16) errors.push("KORAMA_SEED_PASSWORD must be at least 16 characters");
if (present("NEXT_PUBLIC_APP_URL") && !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) errors.push("NEXT_PUBLIC_APP_URL must use HTTPS for staging");
if (!truthy.has((process.env.KORAMA_USE_SUPABASE ?? "").toLowerCase())) errors.push("KORAMA_USE_SUPABASE=true is required for staging");
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
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
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
      const missingRpcs = requiredRpcs.filter((rpc) => !schema.paths?.[`/rpc/${rpc}`]);
      if (missingRpcs.length) errors.push(`Supabase normalized RPC schema is missing: ${missingRpcs.join(", ")}`);
    }
  } catch (error) { errors.push(`${label} failed: ${error instanceof Error ? error.message : "request error"}`); }
}

for (const [label, query] of [
  ["Normalized product attributes", supabase.from("products").select("attributes").limit(1)],
  ["Normalized order compliance snapshot", supabase.from("order_lines").select("compliance_snapshot").limit(1)],
  ["Normalized shipment compliance snapshot", supabase.from("shipments").select("compliance_snapshot").limit(1)],
]) {
  const { error } = await query;
  if (error) errors.push(`${label} check failed: ${error.message}`);
}

try {
  const response = await fetch(`https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${encodeURIComponent(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) errors.push(`Mapbox style check returned HTTP ${response.status}`);
} catch (error) { errors.push(`Mapbox style check failed: ${error instanceof Error ? error.message : "request error"}`); }

try {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const expected = [
    { email: process.env.KORAMA_CONSUMER_EMAIL.toLowerCase(), role: "consumer" },
    { email: process.env.KORAMA_WAREHOUSE_EMAIL.toLowerCase(), role: "warehouse_operator" },
    { email: process.env.KORAMA_SAFETY_EMAIL.toLowerCase(), role: "safety_officer" },
  ];
  const users = data.users.filter((user) => user.email && expected.some((identity) => identity.email === user.email.toLowerCase()));
  const missing = expected.filter((identity) => !users.some((user) => user.email?.toLowerCase() === identity.email));
  if (missing.length) errors.push(`Supabase Auth identities are missing: ${missing.map((identity) => identity.email).join(", ")}`);
  if (users.length) {
    const { data: assignments, error: assignmentError } = await supabase.from("role_assignments").select("profile_id,role").in("profile_id", users.map((user) => user.id));
    if (assignmentError) throw assignmentError;
    for (const identity of expected) {
      const user = users.find((candidate) => candidate.email?.toLowerCase() === identity.email);
      if (user && !assignments.some((assignment) => assignment.profile_id === user.id && assignment.role === identity.role)) errors.push(`Supabase Auth identity has incorrect or missing role assignment: ${identity.email} → ${identity.role}`);
    }
  }
} catch (error) { errors.push(`Supabase Auth identity check failed: ${error instanceof Error ? error.message : "request error"}`); }

try {
  const { data: bucket, error } = await supabase.storage.getBucket("rgd-certs");
  if (error) throw error;
  if (bucket?.public) errors.push("rgd-certs storage bucket must remain private");
} catch (error) { errors.push(`rgd-certs bucket check failed: ${error instanceof Error ? error.message : "request error"}`); }

if (errors.length) {
  for (const error of errors) console.error(`staging preflight error: ${error}`);
  process.exit(1);
}
console.log("staging preflight passed: HTTPS, adapter credentials, Supabase schema/seed/Auth/storage, and Mapbox access");
