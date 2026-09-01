# Korama Drone Delivery Digital Twin - Detailed Engineering Handover

Status: implemented locally; not deployed  
Handover date: 2026-09-01 (Africa/Accra)  
Repository: `/Users/fred/Documents/Projects/ashanti-technologies/korama`  
Branch observed at handover: `ui-overhaul-shadcn`  
Baseline commit observed at handover: `3031c11 Enhance error handling in Paystack webhook route`  
Primary product source: `KORMA DEVELOPER INSTRUCTIONS.docx`, especially pages 7-10  
Supporting commercial source: `Korama Business Model.docx`, especially delivery-fee, key-resource, pilot-economics, and regulatory-risk sections  

## 1. Read this first

This implementation is a software-only delivery digital twin. It does not control an aircraft, establish legal permission to fly, prove aviation-authority approval, or make autonomous delivery operationally safe.

The local feature is now materially aligned with the product brief's prototype-level checkout routing, server-owned dispatch choice, preflight gating, weather lockout simulation, safety-officer abort, courier fallback, deterministic telemetry, and tamper-evident sortie-log requirements.

It is not a complete implementation of the DOCX's real-world drone control model. Lockboxes, proof of delivery, COD escrow, live weather, airspace computation, link-loss/geofence-breach failsafes, maintenance logs, real telemetry, real manual aircraft control, and aviation-authority integration remain unimplemented.

Release decisions:

- Digital-twin demo: conditional GO after the pending migrations are deployed to a non-production environment and the browser acceptance paths in this handover pass.
- Real drone pilot: NO-GO.
- Autonomous/BVLOS or urban delivery: NO-GO.
- Claiming full DOCX compliance: NO-GO.

## 2. Scope completed in this work

The work closes the most important correctness gap in the original prototype: the checkout's drone/courier choice is no longer presentation-only.

Implemented behavior:

1. Checkout computes the parcel weight and hides the simulated-drone option above the 2,000 g payload limit.
2. Checkout sends the selected delivery method to the payment-initialization route.
3. The server normalizes the client choice into canonical values:
   - `simulated_drone`
   - `ground_courier`
4. The server always overrides an overweight drone request to `ground_courier`.
5. The database independently repeats the weight check and persists the resolved route on `orders.delivery_method`.
6. Dispatch creates one of two mutually exclusive initial paths:
   - Courier route: shipment plus one ground-courier leg; no drone and no sortie.
   - Simulated-drone route: shipment, simulated-drone leg, and draft sortie.
7. Preflight now requires:
   - payload within the registered drone limit;
   - current airworthiness;
   - battery at or above 20%;
   - manual-override readiness;
   - clear simulated weather;
   - a current, approved authorization belonging to the order's operating company;
   - an active corridor geofence belonging to the order's operating company, with `LineString` geometry.
8. The exact authorization and geofence used to clear preflight are bound to the sortie by foreign key.
9. Safety officers can abort a cleared or active simulated sortie. Abort stops the drone leg and creates exactly one ground-courier fallback leg.
10. The safety UI exposes the abort action visibly during cleared, launched, and en-route states.
11. The UI now has the previously missing launched-to-en-route telemetry transition.
12. Sortie events have a per-sortie monotonic sequence and SHA-256 hash chain.
13. The delivery screen does not render preflight or flight telemetry for courier-only orders.
14. The simulated Mapbox/static route now uses the Ghana pilot's Accra corridor coordinates.
15. Automated unit, structural, migration, database, build, lint, type, and smoke checks cover the new contract.

## 3. Product-requirement alignment verdict

### 3.1 Source interpretation

The development brief says the drone model governs warehouse-to-lockbox cargo delivery, with ground courier completing the final leg. It explicitly makes safety and law the first constraint. It requires valid authorization, manual control, a default VLOS or courier fallback, geofencing, weather refusal, and no autonomous urban operation without written approval.

The same section lists these modules:

- fleet and asset management;
- eligibility and weight routing;
- weather lockout;
- authorization gate;
- route planning and mapping;
- autonomous flight and failsafe;
- micro-hub lockboxes;
- ground-courier handover;
- telemetry and black box;
- manual override.

The roadmap says drones are a late workstream behind authorization, after core commerce, fulfilment, origin, tax, and multi-market work. The business model separately treats delivery fees as a revenue stream, the drone-control source code as a key resource, last-mile cost as a pilot metric, and aviation regulation as a material risk.

### 3.2 Requirement matrix

| Requirement from DOCX | Current status | Evidence in the implementation | What remains |
|---|---|---|---|
| Regulatory guardrail and refusal to dispatch | Partial, credible digital twin | SQL preflight rejects unsafe payload, weather, aircraft, battery, manual override, missing/expired authorization, and missing/inactive route corridor | No regulator integration, no written approval record workflow, no real airspace service, and no legal evidence that any flight may occur |
| Fleet and asset management | Partial | `drones` stores reference, payload limit, airworthiness, battery, and manual-override readiness | Maintenance log, component history, inspection workflow, grounding workflow, and authorization status per aircraft are missing |
| Eligibility and weight router | Implemented for the digital twin | Checkout hides drone over 2 kg; TypeScript and SQL independently hard-route overweight orders to courier | Payload limit is a prototype constant/default; packaging dimensions, balance, dangerous goods, and live aircraft configuration are not modeled |
| Weather lockout | Partial | Unsafe-weather injection locks the sortie and automatically creates courier fallback | No civil-aviation weather feed, forecast age/quality policy, market-specific thresholds, or dispatch-time polling |
| Authorization gate | Partial | Current approved authorization is required and bound to the sortie; the later Ghana pilot migration makes this tenant/operating-company aware | Authorization does not yet model route geometry, altitude, aircraft, pilot, operational category, NOTAMs, or formal authority API/document verification |
| Route planning and mapping | Partial demo | Mapbox/static Accra corridor preview and stored `LineString` corridor | No Google geocoding, internal OSM tile path, 3D route planning, obstacle data, waypoint planner, dynamic routing, or route-to-geofence geometry computation |
| Autonomous flight and failsafe | Partial simulation only | Deterministic telemetry states, weather fallback, manual courier handoff, and explicit abort | No aircraft integration, autopilot, command/ack protocol, link-loss simulation, geofence-breach simulation, return-to-base state execution, or fault taxonomy |
| Micro-hub lockboxes | Missing | UI names a fictional micro-hub only | No lockbox entity, access control, compartment state, drop event, tamper alarm, courier pickup, or custody chain |
| Ground-courier handover | Partial | Courier route and fallback delivery leg exist, with exactly-one fallback protection | No courier assignment/fleet, mobile offline workflow, proof of delivery, custody scan, final-recipient confirmation, or SLA |
| COD escrow | Missing | None | Pre-funded wallet, lock on cash collection, deposit window, agent terminal, reconciliation, licensed conversion partner, and exception handling are all missing |
| Telemetry and black box | Mostly implemented for the digital twin | Every new sortie event receives an insertion sequence, previous hash, and SHA-256 hash; chain is acceptance-tested | No external/WORM anchoring, signature key, independent verifier job, retention policy, real telemetry ingestion, or protection against a trusted database administrator rewriting and rehashing history |
| Manual override and hard stop | Partial simulation | `manual_override_ready` is a preflight gate; visible abort action changes status to `abort` and creates courier fallback | It is not remote-pilot control. There is no command channel, authentication ceremony, aircraft acknowledgement, hardware kill behavior, or control-latency guarantee |
| Privileged tamper-evident audit | Partial | Existing `audit_events` plus the new hash-chained `sortie_events` | General privileged actions outside sortie events are not hash chained; no external audit anchor or SIEM proof |
| Delivery-method tracking | Implemented | Resolved delivery method is stored on the order and shipment; courier-only UI is explicit | Consumer tracking still lacks real courier/aircraft location and proof-of-delivery evidence |
| Commercial delivery-fee model | Prototype only | Checkout prices an order-level delivery charge and shows the chosen method | Fee does not vary by drone/courier economics; no last-mile unit-economics evidence yet |

### 3.3 Honest final verdict

The feature now aligns with the product requirements as a constrained investor/pilot digital twin, not as a real drone-control product.

The strongest aligned areas are:

- server-owned payload routing;
- no sortie for courier-only orders;
- explicit preflight hard stops;
- authorization/geofence evidence binding;
- visible safety abort and courier fallback;
- tamper-evident simulated sortie history;
- clear labeling that aircraft, route, authorization, weather, and telemetry are simulated.

The weakest or absent areas are:

- real regulatory approval;
- real aircraft/fleet integration;
- real route/airspace analysis;
- live weather;
- link-loss/geofence-breach/return failsafes;
- lockboxes and custody;
- proof of delivery;
- COD escrow;
- production-grade black-box immutability.

## 4. Architecture and ownership

### 4.1 End-to-end flow

```text
Cart and server quote
        |
        v
Checkout computes display eligibility from server-derived cart weight
        |
        | body: { lines, address, deliveryMethod }
        v
POST /api/payments/paystack/initialize
        |
        v
normalizedCreateOrder
  - resolves Ghana pilot listings
  - computes trusted weight from product records
  - canonicalizes requested route
        |
        v
korama_create_order RPC
  - private pricing implementation computes money
  - public wrapper recomputes weight
  - persists orders.delivery_method
  - logs delivery_routed audit event
        |
        v
Payment and warehouse order journey
        |
        v
korama_advance_order(..., dispatched, measuredWeight)
  - weight = greatest(measured weight, catalogue-derived weight)
  - overweight => ground_courier
  - ground_courier => shipment + courier leg only
  - simulated_drone => shipment + drone leg + draft sortie
        |
        v
Safety console
  preflight -> launch -> advance -> complete
      |          |          |
      +----------+----------+--> abort -> courier fallback
      |
      +--> unsafe weather -> lockout -> courier fallback
```

### 4.2 Trust boundaries

Client/browser:

- May express a preference (`drone` or `courier`).
- May not choose the final canonical route.
- May not submit price, tax, delivery fee, or total.
- May not invoke safety commands without a server-authenticated safety-officer role.

Next.js server:

- Validates identity, role, origin, request body, and idempotency.
- Resolves catalogue products and weight from server-side data.
- Uses the Supabase service role only in server-only modules.

Database:

- Recomputes payload and delivery routing.
- Owns order, shipment, delivery-leg, sortie, and event state transitions.
- Restricts transaction RPC execution to `service_role`.
- Uses row locks/advisory locks for state and hash-chain consistency.

External systems:

- Paystack test payment is real external I/O, but is outside the drone safety contract.
- Mapbox is a visual route preview only.
- No weather, aviation authority, aircraft, lockbox, courier, POD, or escrow provider is integrated.

## 5. Data model changes

### 5.1 `orders`

New column:

```sql
delivery_method text not null default 'simulated_drone'
check (delivery_method in ('ground_courier', 'simulated_drone'))
```

Meaning: the server-resolved last-mile route for the order. This is not merely the browser's requested preference.

Backfill: existing orders whose product-derived parcel weight exceeds 2,000 g are changed to `ground_courier`.

### 5.2 `drones`

New column:

```sql
manual_override_ready boolean not null default false
```

The original Nigeria fixture `KOR-D01` is backfilled to true. The later Ghana pilot migration creates `KOR-D11` with the field true.

Meaning: the digital twin is configured to expose a safety-officer abort. This does not prove real manual aircraft control.

### 5.3 `sorties`

New columns:

```sql
authorization_id uuid references public.authorizations(id)
geofence_id uuid references public.geofences(id)
```

They are nullable while the sortie is draft. Preflight writes both when it clears.

Meaning: a cleared sortie retains the exact database evidence used by preflight instead of merely depending on the later existence of some generic authorization/geofence.

### 5.4 `sortie_events`

New columns:

```sql
event_sequence integer not null
previous_event_hash text null
event_hash text not null
```

Constraints:

- `event_sequence > 0`;
- unique `(sortie_id, event_sequence)`;
- current and previous hashes, when present, must be lowercase 64-character SHA-256 hex.

Hash input:

- previous hash or `GENESIS`;
- event ID;
- per-sortie sequence;
- sortie ID;
- operating-company ID;
- sortie status;
- event detail;
- created timestamp.

Concurrency:

- The trigger takes a transaction-scoped advisory lock derived from the sortie ID.
- It reads the highest existing `event_sequence` and assigns the next number.
- This avoids timestamp ordering bugs because PostgreSQL `now()` is transaction-stable.

Security interpretation:

- This is tamper-evident under normal database use.
- It is not immutable against a trusted administrator who can rewrite rows and recompute hashes.
- Production black-box claims require external anchoring, signing, restricted retention, or WORM storage.

## 6. State machines

### 6.1 Order states

```text
pending_payment
  -> paid
  -> allocated
  -> picked
  -> packed
  -> dispatched
  -> delivered
```

Delivery assets are created at `dispatched` in the SQL path. The deterministic TypeScript model creates the planned shipment at `packed` and activates it at `dispatched`; tests preserve that local-model convention.

### 6.2 Delivery route decision

```text
requested courier
  -> ground_courier

requested drone AND weight <= 2000 g
  -> simulated_drone

requested drone AND weight > 2000 g
  -> ground_courier
```

The dispatch RPC uses:

```text
effective weight = max(reported packed weight, product-derived weight)
```

This lets the warehouse report a heavier real package but prevents a caller from understating weight to defeat the payload limit.

### 6.3 Sortie states and commands

Main path:

```text
draft --preflight--> cleared --launch--> launched --advance--> en_route --complete--> delivered
```

Weather path:

```text
draft/cleared/launched/en_route --inject_weather--> lockout + courier fallback
lockout --reset_weather--> draft
```

Manual fallback path:

```text
supported pre-delivery states --fallback--> courier_fallback + courier leg
```

Hard-stop path:

```text
cleared/launched/en_route --abort--> abort + courier fallback
```

Important limitations:

- `return` exists in the enum but no `return` command is implemented.
- No link-loss or geofence-breach command exists.
- `advance` plays deterministic telemetry; it does not ingest aircraft telemetry.

## 7. Preflight contract

Preflight may clear only when all of these are true:

1. Sortie status is `draft`.
2. Latest weather is `clear`.
3. Drone airworthiness is current.
4. Drone battery is at least 20%.
5. Drone `manual_override_ready` is true.
6. Product-derived payload does not exceed the drone's payload limit.
7. A current approved authorization belongs to the sortie/order operating company.
8. An active geofence belongs to the same operating company.
9. The geofence reference represents a configured corridor.
10. The geofence geometry type is `LineString`.

The Ghana pilot migration generalizes the original Lagos-specific checks so the same transaction function works for the active Accra pilot and the parked Nigeria configuration.

What preflight does not yet prove:

- the authorization covers the exact path geometry;
- the authorization covers the chosen aircraft/pilot/altitude/operation type;
- the path avoids restricted polygons;
- NOTAMs and temporary restrictions are clear;
- a live weather source is recent and valid;
- real manual control is reachable;
- the aircraft acknowledged the mission.

## 8. File-by-file map

### 8.1 Application and domain

`components/shop/checkout-form.tsx`

- Computes client display eligibility from trusted quote weight.
- Hides simulated drone when overweight.
- Displays the ground-only explanation.
- Sends `deliveryMethod` in the payment initialization request.
- Uses Ghana/Accra pilot copy.

`app/api/payments/paystack/initialize/route.ts`

- Forwards `body.deliveryMethod` into `normalizedCreateOrder`.
- Retains authentication, same-origin, idempotency, server-priced order creation, and Paystack initialization.

`lib/domain.ts`

- Defines `DeliveryMethod` and expanded sortie statuses.
- Adds `Order.deliveryMethod`.
- Implements `resolveDeliveryMethod`.
- Makes deterministic shipment creation respect the route.
- Prevents courier-only orders from invoking sortie commands.
- Implements simulated abort and exactly-one courier fallback.
- Keeps deterministic Accra telemetry for tests/demo.

`components/workspace/delivery-screen.tsx`

- Detects whether a simulated-drone leg exists.
- Hides route telemetry and preflight for courier-only orders.
- Shows an explicit ground-courier-only message.
- Labels the active pilot route Accra to fictional micro-hub.

`components/workspace/sortie-controls.tsx`

- Implements visible sequence actions for preflight, launch, telemetry advance, and drop confirmation.
- Exposes visible abort during cleared/active states.
- Keeps weather injection and ordinary courier handoff under simulation controls.

`components/workspace/mapbox-route.tsx`

- Uses the seeded Accra corridor coordinates.
- Retains optional Mapbox and CSS-only fallback behavior.

### 8.2 Supabase adapter/repository/types

`lib/supabase/normalized-adapter.ts`

- Resolves Ghana pilot listings.
- Computes trusted cart weight from normalized products.
- Resolves the delivery preference.
- Reads delivery method from orders.
- Maps the relevant operating company's drone, authorization, and geofence into preflight gates.
- Supports `abort` and `return` statuses in state mapping.

`lib/supabase/normalized-repository.ts`

- Adds `deliveryMethod` to the create-order input contract.
- Calls the seven-argument `korama_create_order` RPC with `p_delivery_method`.

`lib/supabase/database.types.ts`

- Contains the new order, drone, sortie, sortie-event, relationship, and RPC fields.
- It was updated in the workspace because fresh local type generation is currently blocked by an older storage migration during `supabase start`.
- Regenerate from a successfully migrated local/linked database before merge if possible, then review the generated diff.

### 8.3 Database and tests

`supabase/migrations/20260901142253_drone_delivery_contract.sql`

- Owns the new delivery and safety contract.
- Moves the prior pricing function to `private.korama_create_order_priced`.
- Creates the new public seven-argument order function.
- Replaces dispatch behavior.
- Patches route-bound preflight and abort into the sortie command function.
- Creates the event hash chain.

`supabase/migrations/20260901180000_ghana_pilot.sql`

- Concurrent Ghana-pilot work, not authored as part of the original drone patch.
- It is nevertheless a required later migration for the current workspace.
- It adds Accra fixtures and generalizes the drone migration's Lagos-specific route strings into operating-company/tenant-bound checks.
- The final database acceptance test was run with this later migration applied.

`supabase/tests/drone_delivery_contract_test.sql`

- Finds the checkout-enabled market dynamically.
- Selects light/heavy purchasable products dynamically.
- Proves overweight routing and absence of a sortie.
- Proves lightweight simulated routing, preflight evidence binding, abort fallback, and event-chain linkage.
- Rolls back every mutation.
- Deliberately sets test orders to `packed` to isolate the delivery contract; it does not replace payment, FEFO, or warehouse journey tests.

`tests/domain.test.ts`

- Covers delivery-method normalization.
- Covers overweight fallback.
- Covers courier-only refusal to unlock sortie controls.
- Covers abort and exactly-one courier fallback.
- Preserves weather lockout, preflight, launch, telemetry, and completion coverage.

`scripts/drone-contract-check.mjs`

- Fast structural guard for all critical application, SQL, UI, and test markers.
- Reads both the drone migration and the later Ghana pilot migration.

`package.json`

- Adds `pnpm drone:check`.

## 9. How to test the drone feature

### 9.1 Fast local gate

Run from the repository root:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm migration:check
pnpm drone:check
pnpm smoke
pnpm build
git diff --check
```

Expected results at this handover:

- `pnpm test`: 20/20 passing.
- `pnpm typecheck`: pass.
- `pnpm lint`: pass.
- `pnpm migration:check`: pass, 15 migrations, 40 tables, 10 policy markers.
- `pnpm drone:check`: pass, 20 structural implementation/test markers after the final UI additions.
- `pnpm smoke`: pass, 8 required files and 162 sources scanned in the observed run.
- `pnpm build`: pass after the final safety-console and Accra route changes.
- `git diff --check`: pass required.

### 9.2 Database acceptance

Preferred route:

1. Start a disposable/local Supabase database with every migration applied.
2. Run:

```bash
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/drone_delivery_contract_test.sql
```

Expected final line:

```text
drone delivery database contract pass
```

The test begins a transaction and ends with `ROLLBACK`.

Never point this acceptance SQL at production. It rolls back, but it still exercises privileged transaction functions and should remain a local/disposable test.

### 9.3 Fresh Supabase replay caveat

Observed blocker:

```text
Applying migration 20260830164224_rgd_certs_bucket.sql...
ERROR: relation "storage.buckets" does not exist (SQLSTATE 42P01)
```

This happens before the new drone migration and is not caused by it. On this host/CLI combination, a new stack stopped while replaying the historical storage migration.

What was done instead:

1. The existing local Korama Postgres volume was cloned to a disposable volume.
2. The pending migration sequence was applied to the clone.
3. The rollback-only database acceptance test was run.
4. The disposable container and volume were removed.
5. The source volume was mounted read-only during cloning and was not modified.

Final full-order replay that passed:

1. `20260901140000_catalogue_storage_and_seed_fixes.sql`
2. `20260901142253_drone_delivery_contract.sql`
3. `20260901160000_administrator_full_access_and_invites.sql`
4. `20260901180000_ghana_pilot.sql`
5. `supabase/tests/drone_delivery_contract_test.sql`

Fix the historical fresh-stack storage problem separately; do not hide it by claiming a clean `supabase db reset` passed.

### 9.4 Manual browser acceptance - lightweight simulated drone

Preconditions:

- Pending migrations deployed to a disposable/staging Supabase project.
- Ghana checkout enabled.
- Paystack test key supports GHS.
- Consumer, warehouse operator, and safety officer test identities exist.
- A current Ghana authorization and active Accra corridor exist.
- Ghana drone fixture has airworthiness true, battery >=20, and manual override true.

Steps:

1. Sign in as a consumer.
2. Add one lightweight Ghana pilot item, such as one 180 g balm.
3. Open checkout.
4. Confirm `Simulated drone · Accra micro-hub` is visible.
5. Select simulated drone.
6. Enter a valid Ghana address.
7. Start and complete a Paystack test payment.
8. Sign in as warehouse operator.
9. Allocate FEFO, pick, pack, and dispatch the order.
10. Open Delivery as safety officer.
11. Confirm a simulated-drone leg exists.
12. Confirm every preflight gate shows passed.
13. Run preflight; expect `cleared`.
14. Confirm the authorization and corridor displayed are the Ghana/Accra records.
15. Launch; expect `launched` and one telemetry frame.
16. Advance simulated telemetry; expect `en_route` and the deterministic route frames.
17. Confirm drop; expect sortie, shipment, delivery leg, and order to be delivered/complete.

Evidence to capture:

- checkout weight and selected method;
- order reference;
- persisted `orders.delivery_method`;
- shipment and initial leg;
- sortie status at every transition;
- bound `authorization_id` and `geofence_id`;
- ordered sortie events with sequence/hash values;
- final order/shipment/leg state.

### 9.5 Manual browser acceptance - overweight hard fallback

Suggested fixture: two 1,100 g rattan lamps, or any purchasable combination above 2,000 g.

Steps:

1. Build a cart above 2,000 g.
2. Open checkout.
3. Confirm the simulated-drone choice is absent.
4. Confirm the explanatory ground-courier alert shows the parcel weight and limit.
5. Complete the order and warehouse journey.
6. Open Delivery.

Expected:

- Checkout request contains courier, not drone.
- Even a forged request for simulated drone resolves to `ground_courier` in SQL.
- `orders.delivery_method = ground_courier`.
- `shipments.delivery_method = ground_courier`.
- Exactly one initial ground-courier leg exists.
- No sortie row exists.
- Delivery UI says no simulated aircraft, preflight, or telemetry was created.
- Sortie controls do not render.

### 9.6 Manual browser acceptance - explicit courier below the limit

Steps:

1. Use a lightweight cart.
2. Select Ground courier explicitly.
3. Complete payment and warehouse dispatch.

Expected:

- The server preserves `ground_courier`.
- No sortie is created despite payload eligibility.
- Delivery UI stays courier-only.

### 9.7 Safety acceptance - unsafe weather

Steps:

1. Dispatch a lightweight simulated-drone order.
2. As safety officer, open Simulation controls.
3. Inject unsafe weather.

Expected:

- sortie status becomes `lockout`;
- weather gate fails;
- drone leg becomes `fallback`;
- shipment becomes `fallback`;
- exactly one courier leg becomes `in_transit`;
- repeating the command does not create duplicate courier legs;
- sortie event and general audit event are recorded.

### 9.8 Safety acceptance - visible abort

Test abort separately at each supported state:

- cleared;
- launched;
- en_route.

Expected:

- Abort button is visible without opening Simulation controls.
- sortie status becomes `abort`;
- drone leg becomes `fallback`;
- exactly one courier fallback leg exists;
- shipment becomes `fallback`;
- event detail identifies safety-officer abort;
- the event sequence and hash chain remain valid.

Negative checks:

- Abort from draft must fail.
- Abort on a courier-only order must not be available.
- A non-safety-officer request to the command route must be rejected.
- Cross-origin command requests must be rejected.

### 9.9 Preflight failure matrix

Each gate should be tested independently in a disposable database transaction:

| Failure injected | Expected result |
|---|---|
| Weight > drone limit | Order is routed courier before sortie creation; if an inconsistent legacy sortie exists, preflight rejects payload |
| `airworthiness_current = false` | Preflight rejects |
| `battery_percent < 20` | Preflight rejects |
| `manual_override_ready = false` | Preflight rejects |
| Latest weather `unsafe` | Preflight rejects/lockout path creates courier fallback |
| Authorization missing | Preflight rejects |
| Authorization pending/revoked/expired | Preflight rejects |
| Authorization outside current time | Preflight rejects |
| Authorization belongs to another operating company | Preflight rejects |
| Geofence missing/inactive | Preflight rejects |
| Geofence belongs to another operating company | Preflight rejects |
| Geofence geometry not `LineString` | Preflight rejects |

For every failed preflight, assert that status never becomes `cleared` or `launched`.

## 10. Verification evidence from this implementation session

Passed:

- Unit tests: 20/20.
- TypeScript: pass.
- ESLint: pass.
- Migration sanity: pass.
- Drone structural contract: pass.
- Repository smoke: pass.
- Next.js production build: pass after the final UI copy/control additions.
- New drone migration SQL: applied successfully to disposable PostgreSQL 15 clone.
- Full pending migration order including Ghana pilot: applied successfully.
- Rollback-only database acceptance: pass.
- `git diff --check`: pass after the final handover edit batch.

Not proven:

- Remote migration deployment.
- Hosted browser journey.
- Hosted database contract.
- Real Paystack-to-delivery journey after these migrations.
- Real provider integrations.
- Real drone, lockbox, courier, weather, aviation, POD, or escrow behavior.

Remote/CLI notes:

- `supabase migration list` could not authenticate because `SUPABASE_ACCESS_TOKEN` was not available.
- Do not infer remote schema state from local files.
- A prior read-only normalized remote check observed seed-contract drift: eight Nigeria batches existed while the script expected four. Reconfirm current remote state rather than relying on that older observation.

## 11. Deployment plan

### 11.1 Before deployment

1. Freeze concurrent edits or create a clean integration branch/worktree.
2. Review all uncommitted files and identify ownership.
3. Re-run every gate in section 9.1.
4. Resolve the historical `storage.buckets` fresh-replay blocker.
5. Regenerate `lib/supabase/database.types.ts` from a database with every migration applied.
6. Diff the generated types against the manually updated file.
7. Take a remote database backup/recovery point.
8. Inspect pending migrations in order.
9. Confirm the target is staging/disposable before applying.
10. Confirm Ghana remains the intended checkout-enabled pilot market.

### 11.2 Migration order

The drone migration must precede the Ghana pilot migration because the Ghana migration patches exact function text introduced by the drone migration and inserts `manual_override_ready`.

Relevant order:

```text
20260901142253_drone_delivery_contract.sql
20260901160000_administrator_full_access_and_invites.sql
20260901180000_ghana_pilot.sql
```

If a future migration edits the same functions, the asserted string replacements may fail loudly. That is deliberate. Reconcile the function bodies instead of deleting the assertions.

### 11.3 After migration

Run read-only schema checks first:

- columns and constraints exist;
- public `korama_create_order` has seven arguments;
- private priced implementation exists;
- RPC execute grants remain service-role-only;
- Ghana drone/authorization/geofence fixtures exist;
- Ghana is checkout enabled and Nigeria is parked if that remains the product decision.

Then run:

- local/staging database acceptance;
- staging application build/deploy;
- lightweight drone browser path;
- overweight courier browser path;
- weather lockout;
- abort at three states;
- authorization/geofence negative tests;
- event-chain verifier query;
- logs/audit review.

### 11.4 Rollback strategy

There is no down migration in the repository.

Prefer:

1. restore from the pre-deployment recovery point for a failed disposable/staging rollout; or
2. create a reviewed forward-fix migration for production.

Avoid an improvised destructive rollback because the migration:

- moves and renames a function;
- changes the public RPC signature;
- adds persisted routing data;
- changes dispatch semantics;
- adds foreign keys, constraints, a trigger, and a unique sequence index;
- may create new orders/events using the new schema.

Do not drop new columns while new application code is live.

## 12. Security and safety review notes

Controls present:

- role-protected safety command route;
- same-origin mutation check;
- idempotent mutation wrapper;
- service-role-only database RPCs;
- server-owned pricing and weight;
- database repeat validation;
- row locking around state transitions;
- advisory locking around event sequence/hash assignment;
- operating-company scoping;
- exact evidence binding to sorties;
- simulated-only copy in the safety UI.

Controls still needed before a real pilot:

- real pilot identity, MFA/step-up, and active duty status;
- command authorization separate from ordinary app sessions;
- command signing and aircraft acknowledgement;
- low-latency hard-stop channel independent of consumer/browser connectivity;
- secure hardware identity and key rotation;
- rate limits and replay defense for control messages;
- airspace/NOTAM/weather provenance and freshness;
- operational safety case, hazard analysis, and incident procedures;
- regulator-approved manuals and written authorization;
- immutable/external black-box retention;
- privacy/minimization rules for location data;
- security threat model and penetration testing.

## 13. Known technical debt and gaps

### P0 before claiming staging completeness

1. Deploy and verify all pending migrations in staging.
2. Add browser E2E for checkout-to-dispatch-to-sortie.
3. Fix fresh `supabase start`/reset replay at the historical storage migration.
4. Regenerate database types from the fully migrated schema.
5. Verify Ghana pilot paths do not retain Nigeria/Lekki copy in other screens.
6. Verify Paystack GHS payment end to end.

### P0 before any physical-flight integration

1. Obtain written authorization and encode its exact conditions.
2. Build a real safety architecture and hazard analysis.
3. Separate aircraft command/control from the web application.
4. Implement and test manual takeover/hard stop on real hardware.
5. Implement airspace, geofence, weather, link-loss, navigation, and return-to-base failsafes.
6. Establish independent flight logging and incident retention.

### P1 product requirements

1. Drone maintenance and inspection records.
2. Route/waypoint domain model.
3. Geofence polygon/restricted-zone computation.
4. Live aviation weather adapter with freshness/threshold policy.
5. Authorization documents, scope, aircraft, pilot, altitude, route, and time model.
6. Lockbox/micro-hub domain and custody events.
7. Courier assignment and offline app.
8. Proof of delivery.
9. COD escrow workflow and licensed payment partner integration.
10. Link-loss and geofence-breach simulation commands.
11. Return-to-base state and UI.
12. Independent event-chain verification job and external anchoring.

### P2 quality and maintainability

1. Replace asserted function-body text patching with stable versioned SQL functions where practical.
2. Add pgTAP or another database-native test harness to normal CI.
3. Add Playwright browser tests.
4. Add a domain state-machine table/test generator to avoid TypeScript/SQL drift.
5. Derive route labels/coordinates from bound route/geofence data rather than UI constants.
6. Make payload limits aircraft/configuration driven in checkout response, not a shared 2,000 g constant.
7. Add structured metrics for preflight failures, fallback rate, abort rate, and route-method choice.

## 14. Suggested issue breakdown

Issue 1 - Staging migration and schema proof

- Owner: backend/platform.
- Deliverable: migrations applied to staging with generated types and acceptance evidence.
- Acceptance: database test passes; RPC ACLs verified; no remote seed drift.

Issue 2 - Browser journey automation

- Owner: frontend/full-stack.
- Deliverable: Playwright coverage for lightweight drone, overweight courier, explicit courier, weather lockout, and abort.
- Acceptance: deterministic CI run with screenshots/traces on failure.

Issue 3 - Authorization and airspace model

- Owner: aviation-domain backend.
- Deliverable: explicit authorization scope and route/airspace geometry checks.
- Acceptance: independently failing tests for route, country, time, aircraft, pilot, altitude, and restriction overlays.

Issue 4 - Weather provider and policy

- Owner: integrations/safety.
- Deliverable: provider adapter, freshness policy, thresholds, outage behavior, and audit evidence.
- Acceptance: stale, unsafe, missing, and provider-failure cases all refuse flight.

Issue 5 - Failsafe simulator

- Owner: safety simulation.
- Deliverable: link loss, geofence breach, navigation fault, low battery, return-to-base, and abort paths.
- Acceptance: state/event/courier outcomes specified and tested.

Issue 6 - Lockbox and custody

- Owner: fulfilment.
- Deliverable: hub, lockbox, compartment, drop, pickup, custody, and exception entities/flows.
- Acceptance: parcel custody can be reconstructed end to end.

Issue 7 - Courier POD and COD escrow

- Owner: courier/payments.
- Deliverable: offline courier workflow, POD, pre-funded escrow, cash lock, deposit window, and licensed conversion-provider boundary.
- Acceptance: no COD completion without escrow and deposit reconciliation.

Issue 8 - Black-box hardening

- Owner: security/platform.
- Deliverable: external anchoring/signing, verifier, retention, alerting, and recovery policy.
- Acceptance: altered/deleted/reordered events are detected outside the primary database.

## 15. Instructions for the next model

1. Read this handover completely before editing.
2. Read `KORMA DEVELOPER INSTRUCTIONS.docx` pages 7-10 and `Korama Business Model.docx` relevant delivery/risk sections.
3. Read `AGENTS.md` and the Next.js 16.3.3 guides under `node_modules/next/dist/docs/` before changing Next.js code.
4. Use the Supabase skill for any Supabase work and inspect CLI help before using unfamiliar commands.
5. Treat the feature as a digital twin unless the user explicitly authorizes a real-provider/aircraft workstream.
6. Do not claim remote deployment or product compliance from local tests.
7. Do not mutate a remote database until the target identity/project is confirmed and the user authorizes deployment.
8. Preserve concurrent Ghana pilot changes. The drone and Ghana migrations intentionally compose in timestamp order.
9. Use `pnpm`; preserve `pnpm-lock.yaml`.
10. Start with read-only `git status`, migration inventory, and current test results.
11. Fix the fresh local Supabase replay blocker before depending on `db reset` as evidence.
12. Run the rollback-only database acceptance test after every function/migration change.
13. Add failing tests before changing route, preflight, fallback, abort, or hash-chain behavior.
14. Keep courier-only orders free of sortie rows.
15. Keep the SQL payload check even if UI/server validation exists.
16. Keep abort immediately visible in active states.
17. Keep all aircraft/authorization/weather/telemetry copy explicitly simulated until real integrations and approvals exist.
18. Update this handover after material changes.

## 16. Definition of done for the next release

The next staging release is done only when all boxes are satisfied:

- [ ] Pending migrations are applied to staging in the correct order.
- [ ] Generated Supabase types match the migrated schema.
- [ ] `pnpm test` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm migration:check` passes.
- [ ] `pnpm drone:check` passes.
- [ ] `pnpm smoke` passes.
- [ ] `pnpm build` passes.
- [ ] `git diff --check` passes.
- [ ] Database drone acceptance passes after every migration.
- [ ] Lightweight simulated-drone browser path passes.
- [ ] Overweight ground-courier browser path passes.
- [ ] Explicit courier browser path passes.
- [ ] Weather lockout creates exactly one fallback.
- [ ] Abort passes at cleared, launched, and en-route states.
- [ ] Negative authorization/geofence/weather/aircraft/battery/override cases refuse flight.
- [ ] Event hash chain verifies.
- [ ] Hosted logs and audit events are reviewed.
- [ ] No UI copy implies real autonomous-flight readiness.
- [ ] Release notes state the remaining product gaps.

## 17. Final product statement

Safe wording:

> Korama includes a server-enforced delivery digital twin that routes overweight parcels to ground courier, simulates route-bound preflight and telemetry, supports weather lockout and safety-officer abort, and records hash-chained sortie events. It is not connected to an aircraft and is not authorization to conduct autonomous or BVLOS delivery.

Unsafe wording to avoid:

- "Korama supports autonomous drone delivery."
- "The system is aviation compliant."
- "The hard stop controls the aircraft."
- "The route is approved."
- "The black box is immutable."
- "The feature fully implements the drone requirements."
