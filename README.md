# Korama investor prototype

Korama is a private, deterministic investor-demo prototype for a Ghana–Nigeria two-way trade corridor. It demonstrates direct-import inventory, Ghana-origin export provenance, Nigerian checkout, server-confirmed test payment, FEFO warehouse allocation, provisional origin evidence, and a simulated last-mile drone mission with safety lockout and courier fallback.

## Start

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000` and enter `KORAMA-DEMO`.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke
pnpm migration:check
pnpm api:acceptance
pnpm db:test
pnpm normalized:check
pnpm normalized:mutation:check
pnpm staging:check
pnpm deployment:check
pnpm build
pnpm bundle:check
```

## Repository map

- `app/` — Next.js App Router shell and API routes.
- `components/PrototypeWorkspace.tsx` — shopper, operations, compliance, delivery, and market surfaces.
- `lib/domain.ts` — shared state machines, seed scenario, quote, FEFO, and safety rules.
- `lib/demo-store.ts` — server-owned deterministic adapter with optional Supabase snapshot persistence.
- `supabase/` — local migration, seed, private helper, RLS, index, and storage contracts.
- `docs/` — product specification, architecture, workstreams, and runbook.
- `docs/as-built.md` — verified implementation boundary and production handoff.
- `GET /api/health` — secret-free deployment readiness endpoint.
- `pnpm deployment:check` — smoke-tests a configured HTTPS deployment’s readiness and access gate.
- `pnpm normalized:check` — validates the typed normalized Supabase catalogue and operational read projections when service-role credentials are configured.
- `pnpm normalized:mutation:check` — runs the server-only normalized order, payment, FEFO, fulfilment, weather-fallback, and sortie transaction contract against a local Supabase database.

The default local demo uses the deterministic in-memory adapter. Set `KORAMA_USE_SUPABASE=true`
with server-only Supabase credentials to persist the current investor journey; set
`KORAMA_USE_SUPABASE_AUTH=true` in staging/production to authorize guided identities from
Supabase role assignments. The normalized repository’s typed reads and server-only
transaction primitives are implemented; HTTP adapter cutover and real Paystack/Mapbox
credentials still require the approval gates in the plan.
