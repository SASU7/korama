# Korama Prototype — As-built handoff

Status: local investor-demo implementation complete through the deterministic adapter
Date: 2026-08-29

## Implemented checkpoints

| Phase | Local result | Boundary |
| --- | --- | --- |
| 0 | Product, architecture, workstream, brand, and runbook documents | Founder approval remains an external gate |
| 1 | Next.js 16 App Router shell, TypeScript, lint, typecheck, tests, CI, responsive/accessible UI | Private repository/deployment setup is external |
| 2 | Supabase foundation plus completion migration, seed, RLS policy contract, explicit grants, SSR/browser factories, server-controlled demo roles | Docker is required to execute local Supabase migrations/advisors |
| 3 | Ghana/Nigeria catalogue, four categories, provenance classes, local prices, roadmap market horizon | Only active markets are transaction-enabled |
| 4 | Server quote, Paystack-shaped deterministic test adapter, optional real Paystack test calls, verification, HMAC webhook, duplicate protection | No live money or callback-based payment authority |
| 5 | Paid-order FEFO, expired/quarantine rejection, warehouse task progression, shared order timeline, optional private Realtime subscription with refetch fallback | Demo store is process-local until Supabase persistence is selected |
| 6 | Ghana-to-Nigeria transfer evidence, origin rule evaluator, provisional assessment, watermarked certificate preview | Evidence and duty treatment are illustrative |
| 7 | Static route fallback, optional Mapbox static route rendering, safety gates, deterministic telemetry, weather lockout, courier fallback | No live route planning or aircraft |
| 8 | Curation explanation, B2B preview, ratings/return-review session actions, roadmap explorer | No refunds, marketplace settlement, registry, or production AI |
| 9 | Role/API acceptance flow, responsive CSS states, security boundaries, CI/build configuration | Staging/Vercel/Paystack/Supabase/Mapbox credentials require operator setup |
| 10 | This handoff, runbook, migration sanity check, and known-limitations record | Future production adapters remain explicitly isolated |

## Reproduce locally

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke
pnpm migration:check
pnpm build
pnpm dev
```

Open `http://localhost:3000` and use `KORAMA-DEMO`. The canonical presentation path
is documented in `docs/runbook.md`. Reset only the deterministic local adapter between
runs; reset does not call Paystack or mutate external services.

## API contracts used by the demo

- `POST /api/demo/access` establishes an HTTP-only signed session.
- `GET /api/demo/session` reports authentication and the server-held guided role.
- `POST /api/demo/identity` sets the server-held guided role.
- `GET /api/demo/state` returns the sanitized demo state.
- `GET /api/orders/:reference` returns the authenticated order view.
- Payment, fulfilment, order advancement, and delivery routes enforce session and role scope.
- `POST /api/webhooks/paystack` validates raw-body HMAC-SHA512 and accepts only successful charge events.

## Deferred production work

Before staging, connect the Supabase persistence adapter, run migrations and advisors with
Docker, generate database types, configure a URL-restricted Mapbox token, validate
Paystack test credentials and webhook delivery, add observability, and perform a separate
deployment approval. No production secret is required for the deterministic local demo.
