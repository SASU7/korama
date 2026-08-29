# Korama Investor Prototype Plan — Revised for Business Model

## Summary

Build an access-controlled, responsive investor prototype demonstrating Korama’s two-way trade corridor:

1. Directly import third-country goods into each destination market through its local operating company.
2. Source or substantially transform Ghana-origin goods, then export qualifying products regionally.
3. Demonstrate one deep Ghana-to-Nigeria consumer transaction using Ghana-origin shea cosmetics.
4. Show warehouse traceability, FEFO allocation, provisional origin assessment, payment, and last-mile delivery.
5. Run a simulated Nigerian drone mission with safety gates and automatic courier fallback.

The prototype remains product-focused. It will not show the Korama Holdings/opco capital structure, treasury model, or intercompany value flows; those belong in investor materials. Internally, every commercial record must still identify the responsible operating company because Korama Holdings does not sell goods.

No design or implementation begins until the specification package is approved.

## 1. Specification and Approval Gates

Create three linked documents first:

- `docs/product-spec.md`: journeys, screens, demo script, market phases, business rules, acceptance criteria, and exclusions.
- `docs/technical-architecture.md`: modules, schema, opco boundaries, RLS, APIs, state machines, integrations, and environments.
- `docs/agent-workstreams.md`: assignments, dependencies, shared contracts, merge order, and definitions of done.

Source precedence:

1. Current founder decisions.
2. `Korama Business Model.docx` for business, revenue, corporate, and geographic strategy.
3. `KORMA DEVELOPER INSTRUCTIONS.docx` for product functions and software guardrails.
4. Illustrative prototype assumptions, explicitly labelled where neither document decides.

Approval gates:

1. Approve the complete specification.
2. Approve provisional branding and responsive screen designs.
3. Approve locally tested Supabase migrations before rebuilding the remote schema.
4. Approve staging before investor release.

The build must advance one approved phase at a time. Completing this plan does not authorize agents to implement later phases early.

## 2. Markets and Trade Model

### Market presentation

Display two separate horizons:

- Phase 1: Ghana and Nigeria.
- Phase 2: Côte d’Ivoire and Senegal.
- Phase 3: Togo and Benin.
- Phase 4: Guinea.
- Future Africa: Liberia, Kenya, Tanzania, Rwanda, Namibia, Zambia, and Mozambique.

Only Ghana and Nigeria transact in the prototype. All other markets display role, currency, port/fulfilment strategy, localization status, and launch phase. Francophone markets explicitly show that French localization is required. Mozambique remains future-only pending Portuguese localization.

### Two-way corridor

The catalogue and operations views must distinguish:

- `direct_import`: third-country inventory imported directly into the market of sale and cleared locally.
- `ghana_origin_export`: goods produced or substantially transformed in Ghana and exported with supporting origin evidence.
- `marketplace_future`: third-party seller inventory, shown only as a shallow future capability.

Do not imply that third-country goods are routed through Ghana. Seed at least one shallow direct-import example in Ghana and Nigeria to contrast with the deep Ghana-origin shea flow.

## 3. Product Experience

### Guided access

Provide seeded Supabase identities for:

- Nigerian consumer.
- Warehouse/compliance operator.
- Drone safety officer.

A shared demo access code protects the deployed URL. Identity switching happens server-side without exposing passwords. An operations-only reset restores deterministic demo data.

### Shopper surface

- Show 8–12 clearly labelled demo products across beauty, fashion/accessories, pantry, and home/craft.
- Emphasize both global direct-import goods and Ghana-origin export goods.
- Support search, filtering, market selection, indicative local pricing, and product provenance.
- Shallow interactions cover rule-based curation, B2B pricing preview, tracking, ratings, and returns.
- No trained AI model or real business-document upload is included.

### Deep Ghana-to-Nigeria order

- A Nigerian consumer purchases Ghana-origin shea cosmetics in NGN.
- Inventory was produced/transformed in Ghana, received in Tema, exported in bulk, and pre-positioned at Lekki.
- Product details show producer, transformation summary, batch, expiry, ingredients, origin status, and fulfilment location.
- Checkout displays product price, illustrative tax/duty treatment, delivery charge, and total.
- Paystack test mode processes payment.
- Payment status, currency, reference, and amount are verified server-side before fulfilment.
- Shopper tracking updates as operations advances the same order.

### Warehouse and compliance

- Receiving records the Ghanaian batch and expiry.
- Transfer history shows Ghana production, Tema staging, export documentation, Lekki receipt, and destination stock.
- FEFO selects the earliest valid, non-quarantined batch.
- Operator confirms allocation, picking, packing, weight, and dispatch.
- Origin evidence distinguishes genuine transformation from labelling or repackaging.
- Assessment status is explicitly provisional and illustrative.
- Certificate preview is watermarked `DEMO — NOT A VALID CERTIFICATE`.
- No exact statutory duty or VAT rate becomes production configuration without external validation.

### Drone digital twin

- The drone represents Nigerian last-mile delivery from Lekki to a fictional micro-hub.
- Mapbox renders a static seeded route; no live route planning is required.
- Gates cover payload, aircraft condition, authorization window, weather, geofence, battery, and manual override.
- A cleared mission animates location, altitude, speed, battery, and link status.
- The presenter can inject unsafe weather, causing lockout and ground-courier fallback.
- All aircraft, weather, route, and authorization data is labelled simulated.

## 4. Revenue and Investor Claims

Remove the previous 12% commission and ₦2,500 fulfilment assumptions.

The product model must support these operating-company revenue categories:

- Retail margin.
- Wholesale margin.
- Ghana-origin export margin.
- Delivery fees.
- Freight/export charges.
- Marketplace fees.
- Warehousing and other value-added services.

For the deep consumer order:

- Display customer-facing price and delivery charges.
- Classify it internally as a Ghana-origin retail/export sale.
- Do not show a commission percentage, gross margin, CAC, contribution margin, or profitability claim.
- Where an economics field is required, show `Awaiting pilot validation` or clearly labelled illustrative data.

Korama Holdings technology recharge, trademark licensing, treasury returns, and equity appreciation are excluded from the application UI and reserved for the business plan/pitch deck.

## 5. Architecture and Data Model

### Application

Use a modular Next.js App Router application with TypeScript:

- `commerce`: catalogue, market listings, cart, checkout, orders, B2B preview, returns.
- `payments`: Paystack initialization, verification, and webhook handling.
- `trade`: operating companies, trade lanes, direct imports, Ghana-origin exports, market-entry configuration.
- `fulfilment`: sites, receipts, batches, FEFO, transfers, warehouse tasks.
- `compliance`: origin evidence, assessments, illustrative duty quotes, certificate previews.
- `delivery`: shipments, courier fallback, drone simulation and telemetry.
- `platform`: authentication, authorization, audit, demo access, seed/reset.

Use Supabase SSR clients and verified claims for protected routes. Use private Realtime channels for sanitized order and sortie events. See the [Supabase Next.js guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs).

### Core entities

- Corporate/market: operating companies, markets, ports/nodes, trade lanes, market configurations.
- Identity: tenants, profiles, role assignments.
- Catalogue: products, variants, media, market listings and prices.
- Commerce: carts, items, addresses, orders, order lines, payment attempts, events, ratings, returns.
- Trade/fulfilment: suppliers, receipts, inventory batches, balances, movements, transfers, warehouse tasks.
- Compliance: origin records, transformation records, evidence, assessments, duty quotes, certificate previews.
- Delivery: shipments, delivery legs, drones, authorizations, weather snapshots, geofences, sorties and events.
- Governance: append-only audit and idempotency records.

Every order, inventory batch, receipt, transfer, payment, shipment, and warehouse site references its operating company. Korama Holdings is not used as the seller-of-record.

### Data rules

- UUID primary keys and human-readable business references.
- Money stored as integer minor units with ISO currency.
- Prices are market-configured rather than live FX conversions.
- Order lines preserve immutable price, tax/duty, product, seller, and origin snapshots.
- Inventory records carry `direct_import` or `ghana_origin_export` classification.
- Expired, quarantined, uncleared, or unsupported-origin stock cannot be allocated.
- Market-entry status controls browsing, quoting, and checkout availability.
- State changes use validated server operations, never arbitrary client writes.

### State machines

- Order: `pending_payment → paid → allocated → picked → packed → dispatched → delivered`.
- Transfer: `draft → cleared_for_export → in_transit → customs_received → warehouse_received`.
- Origin: `unassessed → evidence_pending → provisionally_eligible → demo_approved|rejected`.
- Sortie: `draft → preflight → cleared → launched → en_route → delivered`, with lockout, override, abort, return, and courier-fallback paths.

### Payment interfaces

- `POST /api/payments/paystack/initialize`
- `GET /api/payments/paystack/verify`
- `POST /api/webhooks/paystack`

Initialization recalculates totals server-side. Webhooks validate the raw-body HMAC signature and process events idempotently. Callback visits alone never mark an order paid. See the [Paystack payment flow](https://paystack.com/docs/payments/accept-payments/) and [webhook documentation](https://paystack.com/docs/payments/webhooks/).

## 6. Security, Migration, and Deployment

- Capture a baseline of the current Supabase project.
- Preserve and review the empty private `rgd-certs` bucket.
- Rebuild the empty public schema through migrations tested locally with Supabase CLI and Docker.
- Move privileged helpers into an unexposed schema, fix mutable search paths, and revoke unnecessary execution.
- Replace self-editable authorization with server-controlled roles.
- Enable RLS on every exposed table and use explicit grants.
- Customers access only their records; staff access is role- and operating-company-scoped.
- Payment, audit, reset, and market configuration remain server-only.
- Add foreign-key and common-query indexes.
- Require clean Supabase security/performance advisor results before seeding.

Deploy to a stable Vercel production URL. Use Paystack test credentials and separate URL-restricted Mapbox development/production tokens. See [Mapbox token security](https://docs.mapbox.com/help/getting-started/access-tokens/).

## 7. Phased Build and Subagent Model

The prototype must not be implemented as one large assignment. Each phase produces a runnable, reviewable checkpoint. Work on the next phase begins only after the current phase passes its exit gate and the coordinating agent records approval.

### 7.1 Agent operating model

- A coordinating agent owns architecture, shared contracts, security decisions, phase sequencing, integration, and final review.
- Execution subagents receive small, bounded work packets. They implement decided behavior; they do not invent product rules or change architecture.
- At most two execution subagents work concurrently within a phase, and only when their file ownership and interfaces do not overlap.
- Database migrations, shared domain types, authentication, payment state transitions, and RLS policies have one designated owner at a time.
- No subagent starts work from the source DOCX files alone. The approved specification and task packet are its source of truth.
- No recursive delegation is allowed unless the coordinating agent explicitly authorizes it.
- Questions, conflicts, missing contracts, or unexpected schema changes return to the coordinating agent instead of being guessed.
- Every handoff lists changed files, commands run, test results, unresolved risks, and the next safe integration step.

Each work packet must contain:

1. A stable task ID and one-sentence objective.
2. Phase prerequisites and frozen interfaces.
3. Explicit files or directories the agent may modify.
4. Exact behavior to implement.
5. Non-goals and prohibited changes.
6. Required test commands and acceptance cases.
7. Expected handoff format.

### 7.2 Phase 0 — Specification and contracts

Deliverables:

- Reconcile both source documents into the product specification, technical architecture, and agent workstream documents.
- Freeze terminology, user roles, market phases, demo disclaimers, routes, state machines, API contracts, schema ERD, and deterministic seed scenario.
- Define the 8–10 minute demo script and identify which screens are deep, shallow, roadmap-only, or excluded.
- Produce responsive wireframes and provisional brand tokens only after the written specification is approved.

Exit gate:

- Founder approves the complete specification and then the screen designs.
- All unresolved decisions are recorded; implementation tasks contain no product-design choices.
- No application or database implementation occurs in this phase.

### 7.3 Phase 1 — Repository and application foundation

Deliverables:

- Initialize the private repository and Next.js/TypeScript application.
- Add formatting, linting, type checking, unit-test, and end-to-end-test foundations.
- Establish environment validation, error boundaries, responsive application shell, provisional design tokens, and shared accessible components.
- Implement only the shared demo access-code gate and empty role-aware navigation shell.

Suggested subagent packets:

- `P1-A`: toolchain, scripts, CI checks, and environment validation.
- `P1-B`: design tokens, responsive shell, navigation, loading/error/empty primitives.

Exit gate:

- Clean install, build, lint, type check, and smoke test pass.
- Shell works at 375, 768, and 1280 px with keyboard navigation.
- No catalogue, payment, warehouse, compliance, or drone business logic exists yet.

### 7.4 Phase 2 — Supabase foundation and security

Deliverables:

- Capture the remote baseline and reproduce the intended schema locally.
- Implement operating companies, markets, profiles, role assignments, products, listings, and audit/idempotency foundations.
- Implement server-controlled guided identities, RLS, explicit grants, deterministic seeds, and transactional demo reset.
- Preserve and secure the `rgd-certs` bucket.
- Generate TypeScript database types after migrations stabilize.

Suggested subagent packets:

- `P2-A`: schema and seed migrations; sole owner of migration files.
- `P2-B`: RLS matrix tests and advisor-remediation verification without changing schema contracts.

Exit gate:

- Local migration up/down workflow and seed/reset tests pass.
- Customer and staff isolation tests pass; self-assigned roles fail.
- Supabase security and performance advisors are clean or approved with documented exceptions.
- Remote migration requires a separate explicit approval after local review.

### 7.5 Phase 3 — Markets, catalogue, and provenance

Deliverables:

- Build Ghana/Nigeria transactional market selection and correctly gated roadmap markets.
- Build catalogue browsing, product details, search, filters, currency formatting, and launch-status views.
- Seed 8–12 demo products across four verticals.
- Visibly distinguish `direct_import`, `ghana_origin_export`, and `marketplace_future` inventory.
- Show the Ghana-origin shea product and at least one direct-import comparison in each active market.

Suggested subagent packets:

- `P3-A`: market selector, roadmap status, currency presentation, and responsive catalogue shell.
- `P3-B`: product search/filtering, provenance presentation, fixtures, and component tests.

Exit gate:

- Catalogue is usable without checkout.
- Ghana/Nigeria availability and all roadmap gates pass end-to-end tests.
- Third-country products never imply shipment through Ghana.

### 7.6 Phase 4 — Cart, order, and Paystack test payment

Deliverables:

- Implement cart ownership, server-calculated checkout quote, address capture, and pending order creation.
- Implement Paystack test initialization, callback verification, raw-body webhook signature validation, amount/currency matching, and idempotency.
- Add the initial shopper order timeline and payment failure/retry states.

Suggested subagent packets:

- `P4-A`: cart, quote, checkout UI, validation, and customer-owned order views.
- `P4-B`: Paystack server routes, payment state machine, webhook tests, and failure recovery.

Exit gate:

- A sandbox payment creates one paid order and duplicate callbacks/webhooks create no duplicate value.
- Unpaid, failed, reversed, mismatched, or abandoned payments cannot enter fulfilment.
- The deep flow is runnable from product detail through paid order.

### 7.7 Phase 5 — Warehouse fulfilment and FEFO

Deliverables:

- Implement receiving, batch/expiry tracking, Lekki stock balances, warehouse tasks, and inventory movements.
- Implement server-enforced FEFO allocation for the paid shea order.
- Implement pick, pack, weight capture, dispatch readiness, audit events, and shopper tracking updates.
- Add private Realtime updates with refetch/stale-state fallback.

Suggested subagent packets:

- `P5-A`: receiving, inventory batches, FEFO service, stock movements, and database tests.
- `P5-B`: operator task UI, order advancement, tracking timeline, and Realtime states.

Exit gate:

- The paid order allocates the correct batch and reaches `packed` without negative stock.
- Expired, quarantined, uncleared, and insufficient stock paths fail safely.
- Shopper and operator views agree after refresh and Realtime reconnect.

### 7.8 Phase 6 — Trade corridor and origin compliance

Deliverables:

- Implement Tema-to-Lekki transfer history and the distinction between direct imports and Ghana-origin exports.
- Implement transformation records, evidence, provisional origin assessment, illustrative duty quote, and certificate preview.
- Watermark every generated preview and prevent repackaging-only evidence from qualifying.
- Link the approved demo assessment snapshot to the deep order line and shipment.

Suggested subagent packets:

- `P6-A`: transfer and trade-lane model, state transitions, and integration tests.
- `P6-B`: origin evidence UI, rule evaluation, duty presentation, and watermarked certificate preview.

Exit gate:

- The shea batch shows an auditable Ghana-to-Nigeria history.
- Unsupported evidence produces rejection; qualifying demo evidence remains explicitly provisional.
- No UI claims legal production readiness or produces a valid certificate.

### 7.9 Phase 7 — Delivery and drone digital twin

Deliverables:

- Create shipment and delivery-leg records for the packed order.
- Implement a URL-restricted Mapbox test map with a static Nigerian last-mile route.
- Implement drone, authorization, weather, geofence, payload, battery, and airworthiness gates.
- Animate deterministic telemetry and support manual override, weather injection, lockout, and courier fallback.

Suggested subagent packets:

- `P7-A`: delivery state model, preflight gate evaluator, sortie commands, and unit tests.
- `P7-B`: Mapbox view, telemetry playback, mission controls, fallback UI, and reduced-motion behavior.

Exit gate:

- A cleared simulated mission can run successfully.
- Injected unsafe weather interrupts/blocks flight and creates a ground-courier leg.
- No real-aircraft or regulatory-approval claim appears.

### 7.10 Phase 8 — Shallow supporting capabilities

Deliverables:

- Add rule-based curation explanations, B2B pricing preview, ratings, return request, and roadmap-market exploration.
- Keep each interaction deliberately shallow and label future capabilities honestly.
- Do not add production AI, registry integrations, refunds, marketplace settlement, or additional payment corridors.

Suggested subagent packets:

- One packet per isolated capability, limited to its route/components, fixtures, and tests.
- No packet may change checkout, payment, inventory, origin, or drone state machines.

Exit gate:

- Every shallow feature has a working happy path, empty/error state, and explicit boundary.
- Core deep-flow regression tests remain unchanged and passing.

### 7.11 Phase 9 — Integration, hardening, and investor release

Deliverables:

- Run the complete cross-role demo and repair integration defects without expanding scope.
- Complete accessibility, responsive, security, performance, network-failure, and reset testing.
- Configure stable Vercel, Paystack webhook, Supabase, and Mapbox environments.
- Rehearse and document the canonical 8–10 minute investor demo.

Suggested subagent packets:

- `P9-A`: automated regression, accessibility, responsive, and failure-mode audit.
- `P9-B`: deployment configuration, environment verification, observability, and runbook.

Exit gate:

- Staging passes all acceptance tests and can be reset reliably between presentations.
- Production secrets are absent from the repository and browser bundles.
- Founder approves the final demo before investor access is enabled.

### 7.12 Phase 10 — As-built specification and handoff

Deliverables:

- Update the specification, architecture, ERD, API contracts, and workstream records to match the verified implementation.
- Record deferred modules, known limitations, advisor results, operational procedures, and post-prototype recommendations.
- Convert remaining work into small dependency-ordered packets suitable for future subagents.

Exit gate:

- A new agent can reproduce the environment, run tests, reset the demo, and understand every boundary without reading chat history.

### 7.13 Whole-prototype acceptance tests

- Ghana/Nigeria transact; all other markets remain correctly gated.
- Third-country goods never appear as Ghana-routed imports.
- Ghana-origin eligibility cannot be set through repackaging alone.
- An unpaid or amount-mismatched order cannot enter fulfilment.
- FEFO rejects expired/quarantined inventory.
- Records remain scoped to the correct operating company.
- Duplicate payment and webhook events do not duplicate value or orders.
- Unsafe drone conditions prevent/interrupt flight and create courier fallback.
- Reset restores the canonical scenario without modifying external Paystack test transactions.
- Keyboard, screen-reader, reduced-motion, loading/error, and 375/768/1280 px states pass.
- No unvalidated traction, valuation, margin, or legal-compliance claim appears.

## Assumptions and Exclusions

- English-only interactive prototype; French and Portuguese localization are roadmap requirements.
- Ghana and Nigeria are the only active transaction markets.
- Wider Africa appears as a separate long-term horizon, not part of the launch sequence.
- All prices, operational data, tax/duty treatment, evidence, and aviation records are illustrative.
- No live customs/tax integration, valid certificate issuance, real aircraft, production AI, native mobile app, offline synchronization, live Paystack money, treasury system, or intercompany accounting.
- Corporate structure and Holdings value capture remain outside the application UI.
- All source documents and specifications remain in a private repository.
