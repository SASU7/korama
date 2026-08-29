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
pnpm build
```

## Repository map

- `app/` — Next.js App Router shell and API routes.
- `components/PrototypeWorkspace.tsx` — shopper, operations, compliance, delivery, and market surfaces.
- `lib/domain.ts` — shared state machines, seed scenario, quote, FEFO, and safety rules.
- `lib/demo-store.ts` — server-owned deterministic test adapter.
- `supabase/` — local migration, seed, private helper, RLS, index, and storage contracts.
- `docs/` — product specification, architecture, workstreams, and runbook.
- `docs/as-built.md` — verified implementation boundary and production handoff.

The local demo adapter is intentionally not production persistence. Connect the Supabase adapter and real Paystack/Mapbox credentials only after local migration review and the approval gates in the plan.
