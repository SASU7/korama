import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/0001_korama_foundation.sql", import.meta.url), "utf8");
const requiredTables = ["operating_companies", "markets", "products", "market_listings", "orders", "inventory_batches", "origin_assessments", "shipments", "sorties", "audit_events", "idempotency_keys"];
const requiredPolicies = ["customers_read_own_orders", "staff_read_scoped_orders", "safety_read_scoped_sorties", "roles_are_not_self_editable"];
for (const table of requiredTables) if (!sql.includes(`create table public.${table}`)) throw new Error(`missing table: ${table}`);
for (const policy of requiredPolicies) if (!sql.includes(`create policy ${policy}`)) throw new Error(`missing policy: ${policy}`);
for (const table of requiredTables) if (!sql.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS not enabled: ${table}`);
const indexes = [...sql.matchAll(/create index (\w+) on/g)].map((match) => match[1]);
if (new Set(indexes).size !== indexes.length) throw new Error("duplicate index name in migration");
console.log(`migration sanity pass (${requiredTables.length} tables, ${requiredPolicies.length} policy markers)`);
