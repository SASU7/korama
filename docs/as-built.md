# Korama Prototype — As-built handoff

Status: local investor-demo implementation complete through the deterministic adapter
Date: 2026-08-30

## Implemented checkpoints

| Phase | Local result | Boundary |
| --- | --- | --- |
| 0 | Product, architecture, workstream, brand, and runbook documents | Founder approval remains an external gate |
| 1 | Next.js 16 App Router shell, TypeScript, lint, typecheck, tests, CI, responsive/accessible UI | Private repository/deployment setup is external |
| 2 | Supabase foundation plus completion migration, seed, RLS policy contract, explicit grants, generated database types, SSR/browser factories, server-controlled demo roles | Docker is required to execute remote-equivalent auth/advisor checks |
| 3 | Ghana/Nigeria catalogue, four categories, provenance classes, local prices, roadmap market horizon | Only active markets are transaction-enabled |
| 4 | Server-owned cart quote, validated Nigerian delivery-address snapshot, Paystack-shaped deterministic test adapter, optional real Paystack test calls, verification, HMAC webhook, duplicate protection | No live money or callback-based payment authority |
| 5 | Paid-order FEFO, expired/quarantine rejection, warehouse task progression, shared order timeline, optional private Realtime subscription with refetch fallback | Demo store is process-local until Supabase persistence is selected |
| 6 | Ghana-to-Nigeria transfer evidence, origin rule evaluator, provisional assessment snapshot linked to the order and shipment, watermarked certificate preview | Evidence and duty treatment are illustrative |
| 7 | Shipment and delivery-leg lifecycle, static route fallback, optional Mapbox static route rendering, explicit preflight/clear/launch/en-route lifecycle, deterministic telemetry playback, weather lockout, courier fallback | No live route planning or aircraft |
| 8 | Curation explanation, B2B preview, ratings/return-review session actions, roadmap explorer | No refunds, marketplace settlement, registry, or production AI |
| 9 | Role/API acceptance flow, signed guided-role cookies, automated HTTP cross-role regression harness, responsive CSS states, security boundaries, CI/build configuration | Staging/Vercel/Paystack/Supabase/Mapbox credentials require operator setup |
| 10 | This handoff, runbook, migration sanity check, and known-limitations record | Future production adapters remain explicitly isolated |

## Reproduce locally

```bash
pnpm install --frozen-lockfile
pnpm env:check
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke
pnpm migration:check
pnpm api:acceptance
pnpm db:test
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
- `pnpm auth:bootstrap` creates the three Supabase guided identities when operator credentials are configured.
- `pnpm env:check` validates mode-dependent configuration without printing secret values.
- `pnpm api:acceptance` boots the built app with deterministic adapters and verifies the
  cross-role HTTP journey, catalogue gating, payment idempotency, FEFO, fulfilment,
  shipment lifecycle, compliance snapshots, and drone fallback/lifecycle behavior.

## Deferred production work

Before staging, connect the Supabase persistence adapter, run migrations and advisors with
Docker, configure a URL-restricted Mapbox token, validate
Paystack test credentials and webhook delivery, add observability, and perform a separate
deployment approval. No production secret is required for the deterministic local demo.
Production mode also fails closed unless Supabase, Paystack, Mapbox, HTTPS app URL, and
non-default demo access/session secrets are configured.
