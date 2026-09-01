# Korama Investor Prototype — Agent Workstreams

> **Script names corrected 2026-09-01.** Several commands referenced below did
> not exist in `package.json`: `api:acceptance`, `api:normalized:acceptance`,
> `db:test`, `normalized:mutation:check` and `auth:bootstrap`. The `/api/demo/*`
> routes and the `KORAMA-DEMO` access gate were removed in commit 589201f.
> Runnable commands are listed in `README.md`; treat any others here as
> intended-but-unbuilt.
Status: As-built workstream map; automated local implementation verified; live browser pass pending
Date: 2026-08-29

## Operating model

The coordinating agent owns architecture, shared contracts, security decisions, phase
sequencing, integration, and final review. Execution packets are bounded by files and
interfaces. No recursive delegation is allowed. Questions, conflicts, and schema
surprises return to the coordinator.

Every handoff records changed files, commands run, test results, unresolved risks, and
the next safe integration step.

## Phase and ownership matrix

| Phase | Packet | Scope | Primary ownership |
| --- | --- | --- | --- |
| 0 | P0-A | Product specification, demo script, acceptance, exclusions | Coordinator |
| 0 | P0-B | Architecture, schema/ERD, API/state/RLS contracts | Coordinator |
| 0 | P0-C | Workstream packets, dependency order, definitions of done | Coordinator |
| 1 | P1-A | Toolchain, scripts, CI checks, env validation | Foundation owner |
| 1 | P1-B | Tokens, responsive shell, access gate, navigation primitives | UI owner |
| 2 | P2-A | Supabase migrations, seeds, reset; sole migration owner | Data owner |
| 2 | P2-B | RLS matrix tests and advisor remediation verification | Security owner |
| 3 | P3-A | Markets, roadmap, currency presentation, catalogue shell | Commerce UI owner |
| 3 | P3-B | Search/filter, provenance, fixtures, component tests | Catalogue owner |
| 4 | P4-A | Cart, quote, checkout UI, customer order views | Commerce owner |
| 4 | P4-B | Paystack routes, verification, webhook, idempotency tests | Payments owner |
| 5 | P5-A | Receiving, batches, FEFO, movements, DB tests | Fulfilment data owner |
| 5 | P5-B | Operator tasks, timeline, Realtime/refetch states | Fulfilment UI owner |
| 6 | P6-A | Transfer/trade-lane model and transitions | Trade owner |
| 6 | P6-B | Origin evidence, duty, certificate preview | Compliance owner |
| 7 | P7-A | Delivery model, gate evaluator, sortie commands | Delivery domain owner |
| 7 | P7-B | Mapbox route, telemetry playback, fallback UI | Delivery UI owner |
| 8 | P8-* | Isolated shallow capabilities only | Assigned feature owners |
| 9 | P9-A | Regression, accessibility, responsive, failures | QA owner |
| 9 | P9-B | Deployment, environments, observability, runbook | Release owner |
| 10 | P10-A | As-built docs and deferred work packets | Coordinator |

## Dependencies and merge order

```text
P0-A + P0-B + P0-C
          ↓ founder approval
P1-A + P1-B → Phase 1 gate
          ↓ local schema approval
P2-A → P2-B → Phase 2 gate
          ↓
P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10
```

At most two execution packets run concurrently within a phase, and only when file
ownership and frozen interfaces do not overlap. Database migrations, shared types,
authentication, payment transitions, and RLS have one designated owner at a time.

## Frozen contracts

- Active transactional markets: Ghana and Nigeria only.
- Inventory classes: `direct_import`, `ghana_origin_export`, `marketplace_future`.
- Roles: consumer, business buyer, warehouse operator, dispatcher, drone safety
  officer, ground courier, finance, administrator.
- Core state machines and payment endpoints are defined in
  `docs/technical-architecture.md`.
- Demo disclaimers must remain visible wherever data could be mistaken for a legal,
  financial, customs, origin, aviation, or production claim.
- No packet may change checkout, payment, inventory, origin, or drone state machines
  without a coordinator-approved contract revision.

## Verified local definition of done

- Clean install, build, lint, type check, and smoke test pass.
- Access code gate has keyboard and clear invalid-code recovery coverage; live browser confirmation remains pending.
- Responsive CSS defines navigation and market-horizon states for 375, 768, and 1280 px; live browser confirmation remains pending.
- Loading, empty, error, and success primitives exist for future data surfaces.
- The integrated demo keeps catalogue, payment, warehouse, compliance, and drone logic behind shared server contracts.
- No secret is committed; environment validation reports missing configuration safely.
- `supabase db lint --local --fail-on error` passes after a clean reset and seed.
- `pnpm db:test` passes the 33-case RLS isolation, seed, and private-storage suite.
- `pnpm normalized:check` validates the typed normalized catalogue and scoped operational read projections when local or staging service-role credentials are available.

Remote staging, service credentials, observability, and founder release approval remain
external gates. The detailed current boundary is recorded in `docs/as-built.md`.

## Handoff template

```text
Task ID:
Objective:
Changed files:
Commands run:
Tests/results:
Unresolved risks:
Next safe integration step:
```
