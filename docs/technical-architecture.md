# Korama Investor Prototype — Technical Architecture

Status: As-built deterministic prototype with optional Supabase snapshot persistence; production adapters pending
Date: 2026-08-30

## 1. Architecture shape

The prototype is a modular Next.js App Router application in TypeScript. Domain
modules are separated by responsibility and share versioned server contracts:

- `commerce`: catalogue, market listings, cart, checkout, orders, B2B preview, returns.
- `payments`: Paystack initialization, verification, webhook handling, idempotency.
- `trade`: operating companies, markets, trade lanes, imports, Ghana-origin exports.
- `fulfilment`: sites, receipts, batches, FEFO, movements, transfers, warehouse tasks.
- `compliance`: origin evidence, assessments, duty quotes, certificate previews.
- `delivery`: shipments, couriers, drone simulation, gates, telemetry, fallback.
- `platform`: SSR auth, authorization, audit, demo gate, deterministic reset.

The Phase 1 repository contains only the platform shell. Domain modules must not be
invented in the shell or written as client-side business logic.

## 2. Runtime boundaries

```text
Browser
  └─ Next.js UI + server actions/routes
       ├─ Supabase SSR auth and Postgres/RLS
       ├─ Paystack test API (payment routes only)
       └─ Mapbox URL-restricted token (drone view only)
```

Secrets remain server-only. Browser code can receive sanitized, role-scoped view
models but never service keys, webhook secrets, reset authority, or privileged claims.
The repository includes optional `@supabase/ssr` server and browser factories; they
return no client until the public URL and anon key are configured. The deterministic
demo store remains the local fallback. When `KORAMA_USE_SUPABASE=true`, the server-only
service-role adapter persists the current investor journey in a revisioned aggregate
snapshot protected by RLS; browser clients never receive that key.

## 3. Data model contract

All tables use UUID primary keys, human-readable business references, created/updated
timestamps, and operating-company scope where commercially relevant.

Core groups:

- Corporate/market: `operating_companies`, `markets`, `ports_nodes`, `trade_lanes`,
  `market_configs`.
- Identity: `tenants`, `profiles`, `role_assignments`.
- Catalogue: `products`, `variants`, `media`, `market_listings`, `market_prices`.
- Commerce: `carts`, `cart_items`, `addresses`, `orders`, `order_lines`,
  `payment_attempts`, `order_events`, `ratings`, `returns`.
- Trade/fulfilment: `suppliers`, `sites`, `receipts`, `inventory_batches`,
  `inventory_balances`, `inventory_movements`, `transfers`, `warehouse_tasks`.
- Compliance: `origin_records`, `transformation_records`, `origin_evidence`,
  `origin_assessments`, `duty_quotes`, `certificate_previews`.
- Delivery: `shipments`, `delivery_legs`, `drones`, `authorizations`, `weather_snapshots`,
  `geofences`, `sorties`, `sortie_events`.
- Governance: append-only `audit_events` and `idempotency_keys`.

Money is stored as integer minor units with ISO currency. Order lines preserve price,
tax/duty, product, seller, and origin snapshots; the deterministic order and shipment
views carry the same immutable provisional compliance snapshot. Inventory classification is one of
`direct_import`, `ghana_origin_export`, or the roadmap-only `marketplace_future`.

## 4. Authorization and RLS

Supabase SSR clients use verified claims. RLS is enabled on every exposed table, with
explicit grants and indexes for tenant, operating company, market, order, batch, and
event lookups.

| Actor | Read | Write |
| --- | --- | --- |
| Consumer | Own profile, cart, orders, tracking, public listings | Own cart, checkout intent, ratings, return request |
| Warehouse/compliance operator | Assigned opco sites, batches, tasks, transfers, evidence | Validated receiving/allocation/task transitions |
| Safety officer | Assigned opco delivery assets and sorties | Preflight decisions, lockout, override, fallback |
| Admin | Approved operational scope plus audit | Server-controlled configuration and reset only |

Self-editable role assignment is prohibited. Payment, reset, audit, market
configuration, and privileged transitions are server-only operations.

## 5. State machines

```text
Order:    pending_payment → paid → allocated → picked → packed → dispatched → delivered
Transfer:  draft → cleared_for_export → in_transit → customs_received → warehouse_received
Origin:    unassessed → evidence_pending → provisionally_eligible → demo_approved | rejected
Sortie:    draft → preflight → cleared → launched → en_route → delivered
                    ↘ lockout / override / abort / return / courier_fallback
```

Every selected-adapter transition writes a server-side audit event when Supabase is
enabled and accepts an idempotency key where the route mutates state. The snapshot
adapter preserves the visible timeline, revision guard, and idempotency records;
normalized repository methods remain a staging follow-up.

## 6. HTTP contracts

- `POST /api/payments/paystack/initialize`
- `POST /api/cart/quote`
- `GET /api/payments/paystack/verify`
- `POST /api/webhooks/paystack`
- `POST /api/demo/reset` (shared demo-code protected reset)
- `GET /api/demo/state` (sanitized deterministic demo view)
- `GET /api/orders/:reference` (session-scoped view from the selected adapter)
- `POST /api/fulfilment/orders/:reference/allocate` (selected adapter; FEFO transition)
- `POST /api/orders/:reference/advance` (selected adapter; order transition)
- `POST /api/delivery/sorties/:reference/command` (selected adapter; returns updated sortie, order, and shipment/delivery-leg snapshots)

Payment initialization recalculates totals server-side. Callback visits never mark an
order paid. Webhooks validate raw-body HMAC, match amount/currency/reference, and are
idempotent. The quote route owns the deterministic cart snapshot; payment initialization
validates and preserves the delivery-address snapshot on the pending order.

## 7. Realtime and failure handling

Private Realtime channels publish sanitized order and sortie events. Clients refetch
on reconnect and display stale-state messaging when a channel is unavailable. Payment,
inventory, origin, and safety transitions never depend on realtime delivery for truth.

## 8. Environments and migration discipline

Development, staging, and production are separate. The intended database workflow is:

1. Capture the remote baseline without changing it.
2. Rebuild the empty private schema locally with Supabase CLI and Docker.
3. Test migrations, seeds, reset, RLS, grants, and advisors locally.
4. Obtain explicit approval before applying migrations remotely.
5. Generate TypeScript database types only after migrations stabilize; the local
   contract is checked in at `lib/supabase/database.types.ts`.

The existing private `rgd-certs` bucket is preserved and reviewed; generated previews
are watermarked and never represented as valid certificates.

## 9. Security and observability

Use a private unexposed schema for privileged helpers, immutable audit events, mutable
search paths fixed, least-privilege execution revoked, and server-side environment
validation. API failures emit structured, secret-free JSON logs with a request ID and
return that ID to the caller; metrics, traces, and alerts remain staging follow-up work.
No production secrets belong in the repository or browser bundle.

## 10. Current implementation boundary

The repository includes a deterministic demo adapter for the full investor flow and an
optional server-only Supabase snapshot adapter for the same contracts:
catalogue/provenance, server-quoted checkout, test payment verification, FEFO, order
advancement, origin evidence, watermarked certificate preview, drone gates, telemetry,
weather lockout, courier fallback, route-level idempotency keys, shallow capability
actions, and role-scoped HTTP contracts. The client uses private Supabase Realtime subscriptions when configured,
falls back to periodic refetching, and uses Mapbox for the seeded route when a public
token is configured. Normalized repository methods, observability, and deployment
credentials remain isolated follow-up work before staging. Both adapters are explicitly
labelled so snapshot persistence cannot be mistaken for a fully migrated production
domain implementation.
