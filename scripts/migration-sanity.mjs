import { readdir, readFile } from "node:fs/promises";

const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
const sql = (await Promise.all(migrationFiles.map((file) => readFile(new URL(file, migrationDirectory), "utf8")))).join("\n");
const seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const requiredTables = ["tenants", "operating_companies", "markets", "ports_nodes", "trade_lanes", "market_configs", "products", "variants", "media", "market_listings", "market_prices", "carts", "cart_items", "addresses", "orders", "ratings", "returns", "suppliers", "receipts", "inventory_batches", "inventory_balances", "inventory_movements", "warehouse_tasks", "origin_records", "transformation_records", "origin_evidence", "origin_assessments", "duty_quotes", "certificate_previews", "shipments", "delivery_legs", "drones", "authorizations", "weather_snapshots", "geofences", "sorties", "sortie_events", "audit_events", "idempotency_keys", "pending_role_assignments"];
const requiredPolicies = ["customers_read_own_orders", "staff_read_scoped_orders", "safety_read_scoped_sorties", "roles_are_not_self_editable", "customers_write_own_carts", "staff_read_scoped_tasks", "safety_read_scoped_weather", "payment_attempts_server_only", "korama_authenticated_postgres_changes", "pending_role_assignments_server_only"];
const requiredStorageMarkers = ["insert into storage.buckets", "'rgd-certs'", "public = false", "file_size_limit = 10485760"];
const requiredMutationMarkers = ["create or replace function public.korama_create_order", "create or replace function public.korama_verify_payment", "create or replace function public.korama_allocate_order_fefo", "create or replace function public.korama_advance_order", "create or replace function public.korama_command_sortie", "delivery_address_snapshot", "shipments_status_check", "compliance_snapshot", "attributes jsonb", "grant execute on function public.korama_allocate_order_fefo(text) to service_role", "drop table if exists public.demo_state_snapshots",
  // Multi-line order contract. korama_create_order is dropped and recreated
  // with a jsonb line array and no money parameters at all, so these assert
  // both the new signature and that its ACL was restated after the drop.
  "drop function if exists public.korama_create_order",
  "p_lines                jsonb",
  "line_no smallint",
  "allocated_batch_id uuid",
  "order_lines_order_product_key",
  "pg_advisory_xact_lock",
  "b.inventory_class <> 'ghana_origin_export' or b.origin_supported = true",
  "grant execute on function public.korama_create_order(uuid, text, uuid, uuid, jsonb, jsonb) to service_role"];
for (const table of requiredTables) if (!sql.includes(`create table public.${table}`)) throw new Error(`missing table: ${table}`);
for (const policy of requiredPolicies) if (!sql.includes(`create policy ${policy}`)) throw new Error(`missing policy: ${policy}`);
for (const marker of requiredStorageMarkers) if (!sql.includes(marker)) throw new Error(`missing storage contract marker: ${marker}`);
for (const marker of requiredMutationMarkers) if (!sql.includes(marker)) throw new Error("missing normalized mutation marker: " + marker);
// Role administration: administrator is a superset role at the database layer,
// invitations survive until first sign-in, and the default administrator is
// bootstrapped rather than granted by hand.
const requiredRoleMarkers = ["ra.role in (required_role, 'administrator')", "create table public.pending_role_assignments", "'nanasasu7@gmail.com'"];
for (const marker of requiredRoleMarkers) if (!sql.includes(marker)) throw new Error(`missing role administration marker: ${marker}`);
if (!sql.includes("alter table public.%I enable row level security")) throw new Error("missing Phase 2 RLS loop");
for (const table of ["operating_companies", "markets", "products", "orders", "sorties", "audit_events"]) if (!sql.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS not enabled: ${table}`);
const indexes = [...sql.matchAll(/create index (\w+) on/g)].map((match) => match[1]);
if (new Set(indexes).size !== indexes.length) throw new Error("duplicate index name in migration");
for (const marker of ["KOR-GH-OPCO", "KOR-NG-OPCO", "NK-SB-2407", "KOR-GH-NG-EXPORT", "provisionally_eligible", "NK-SHEA-BALM-DEFAULT", "catalogue/nk-shea-balm.webp", "KOR-REC-NK-SB-2407", "KOR-TR-GH-NG-2407", "DI-NG-BLENDER-081", "KOR-D01"]) if (!seed.includes(marker)) throw new Error(`missing seed marker: ${marker}`);
console.log(`migration sanity pass (${migrationFiles.length} migrations, ${requiredTables.length} tables, ${requiredPolicies.length} policy markers)`);
