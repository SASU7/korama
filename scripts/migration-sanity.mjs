import { readdir, readFile } from "node:fs/promises";

const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
const sql = (await Promise.all(migrationFiles.map((file) => readFile(new URL(file, migrationDirectory), "utf8")))).join("\n");
const seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const requiredTables = ["tenants", "operating_companies", "markets", "ports_nodes", "trade_lanes", "market_configs", "products", "variants", "media", "market_listings", "market_prices", "carts", "cart_items", "addresses", "orders", "ratings", "returns", "suppliers", "receipts", "inventory_batches", "inventory_balances", "inventory_movements", "warehouse_tasks", "origin_records", "transformation_records", "origin_evidence", "origin_assessments", "duty_quotes", "certificate_previews", "shipments", "delivery_legs", "drones", "authorizations", "weather_snapshots", "geofences", "sorties", "sortie_events", "audit_events", "idempotency_keys"];
const requiredPolicies = ["customers_read_own_orders", "staff_read_scoped_orders", "safety_read_scoped_sorties", "roles_are_not_self_editable", "customers_write_own_carts", "staff_read_scoped_tasks", "safety_read_scoped_weather", "payment_attempts_server_only", "korama_authenticated_postgres_changes"];
for (const table of requiredTables) if (!sql.includes(`create table public.${table}`)) throw new Error(`missing table: ${table}`);
for (const policy of requiredPolicies) if (!sql.includes(`create policy ${policy}`)) throw new Error(`missing policy: ${policy}`);
if (!sql.includes("alter table public.%I enable row level security")) throw new Error("missing Phase 2 RLS loop");
for (const table of ["operating_companies", "markets", "products", "orders", "sorties", "audit_events"]) if (!sql.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS not enabled: ${table}`);
const indexes = [...sql.matchAll(/create index (\w+) on/g)].map((match) => match[1]);
if (new Set(indexes).size !== indexes.length) throw new Error("duplicate index name in migration");
for (const marker of ["KOR-GH-OPCO", "KOR-NG-OPCO", "NK-SB-2407", "KOR-GH-NG-EXPORT", "provisionally_eligible"]) if (!seed.includes(marker)) throw new Error(`missing seed marker: ${marker}`);
console.log(`migration sanity pass (${migrationFiles.length} migrations, ${requiredTables.length} tables, ${requiredPolicies.length} policy markers)`);
