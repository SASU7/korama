import { readFile } from "node:fs/promises";

const localEnv = await readFile(".env", "utf8").catch(() => "");
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

const truthy = new Set(["1", "true", "yes"]);
const production = truthy.has((process.env.KORAMA_PRODUCTION ?? "").toLowerCase()) || process.env.NODE_ENV === "production";
const useSupabase = truthy.has((process.env.KORAMA_USE_SUPABASE ?? "").toLowerCase());
const errors = [];
const warnings = [];
const present = (name) => Boolean(process.env[name]?.trim());
const requireAll = (names, context) => { const missing = names.filter((name) => !present(name)); if (missing.length) errors.push(`${context} is missing: ${missing.join(", ")}`); };

if (useSupabase) requireAll(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"], "Supabase mode");
if (present("PAYSTACK_SECRET_KEY") !== present("PAYSTACK_WEBHOOK_SECRET")) errors.push("Paystack requires both PAYSTACK_SECRET_KEY and PAYSTACK_WEBHOOK_SECRET");
if (present("NEXT_PUBLIC_MAPBOX_TOKEN") && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN.startsWith("pk.")) warnings.push("NEXT_PUBLIC_MAPBOX_TOKEN does not look like a public Mapbox token");
if (production && !present("NEXT_PUBLIC_APP_URL")) errors.push("Production mode requires NEXT_PUBLIC_APP_URL");
if (production && !useSupabase) errors.push("Production mode requires KORAMA_USE_SUPABASE=true");
if (production) requireAll(["PAYSTACK_SECRET_KEY", "PAYSTACK_WEBHOOK_SECRET", "NEXT_PUBLIC_MAPBOX_TOKEN", "KORAMA_DEMO_ACCESS_CODE", "KORAMA_DEMO_SESSION_SECRET"], "Production adapters and access security");
if (production && present("NEXT_PUBLIC_APP_URL") && !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) errors.push("Production NEXT_PUBLIC_APP_URL must use HTTPS");
if (!useSupabase) warnings.push("Using the deterministic local adapter; set KORAMA_USE_SUPABASE=true only after Supabase migration and RLS review");

for (const warning of warnings) console.warn(`env warning: ${warning}`);
if (errors.length) { for (const error of errors) console.error(`env error: ${error}`); process.exit(1); }
console.log(`environment check passed (${production ? "production" : "local"} mode; Supabase ${useSupabase ? "enabled" : "disabled"}; Paystack ${present("PAYSTACK_SECRET_KEY") ? "enabled" : "deterministic"}; Mapbox ${present("NEXT_PUBLIC_MAPBOX_TOKEN") ? "enabled" : "static fallback"})`);
