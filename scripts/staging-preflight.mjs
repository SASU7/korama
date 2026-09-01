import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const localEnv = await readFile(".env", "utf8").catch(() => "");
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const errors = [];
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "PAYSTACK_SECRET_KEY", "NEXT_PUBLIC_MAPBOX_TOKEN"];
for (const name of required) if (!process.env[name]?.trim()) errors.push(`${name} is required`);
if (errors.length) finish();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
if (url !== "https://cmusntqsaatsxndltdxe.supabase.co") errors.push("Supabase target is not WILSHUB-Engine");
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const requiredTables = ["profiles", "role_assignments", "markets", "products", "market_listings", "orders", "order_lines", "order_events", "payment_attempts", "inventory_batches", "warehouse_tasks", "origin_assessments", "shipments", "delivery_legs", "sorties", "sortie_events", "audit_events", "idempotency_keys"];
const requiredRpcs = ["korama_create_order", "korama_verify_payment", "korama_allocate_order_fefo", "korama_advance_order", "korama_command_sortie"];

try {
  const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) errors.push(`Supabase schema returned HTTP ${response.status}`);
  else {
    const schema = await response.json();
    const missingTables = requiredTables.filter((table) => !schema.paths?.[`/${table}`]);
    const missingRpcs = requiredRpcs.filter((rpc) => !schema.paths?.[`/rpc/${rpc}`]);
    if (missingTables.length) errors.push(`Supabase schema is missing: ${missingTables.join(", ")}`);
    if (missingRpcs.length) errors.push(`Supabase RPCs are missing: ${missingRpcs.join(", ")}`);
    if (schema.paths?.["/demo_state_snapshots"]) errors.push("Obsolete deterministic demo_state_snapshots table still exists");
  }
} catch (error) { errors.push(`Supabase schema check failed: ${error instanceof Error ? error.message : "request error"}`); }

for (const [label, query] of [
  ["Nigeria market", supabase.from("markets").select("id").eq("code", "NG").limit(1).single()],
  ["Catalogue seed", supabase.from("products").select("id").eq("reference", "NK-SHEA-BALM").limit(1).single()],
  ["Google consumer roles", supabase.from("role_assignments").select("id").eq("role", "consumer").limit(1)],
]) {
  const { error } = await query;
  if (error) errors.push(`${label} check failed: ${error.message}`);
}

try {
  const response = await fetch(`https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${encodeURIComponent(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) errors.push(`Mapbox returned HTTP ${response.status}`);
} catch (error) { errors.push(`Mapbox check failed: ${error instanceof Error ? error.message : "request error"}`); }

finish();
function finish() {
  if (errors.length) {
    errors.forEach((error) => console.error(`production check error: ${error}`));
    process.exit(1);
  }
  console.log("production check passed: WILSHUB-Engine schema and seed, Paystack configuration, and Mapbox access are ready");
}
