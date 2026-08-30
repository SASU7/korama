# Korama Prototype — As-built handoff

Status: local investor-demo implementation complete through deterministic, snapshot, and normalized HTTP adapters
Date: 2026-08-30

## Implemented checkpoints

| Phase | Local result | Boundary |
| --- | --- | --- |
| 0 | Product, architecture, workstream, brand, and runbook documents | Founder approval remains an external gate |
| 1 | Next.js 16 App Router shell, TypeScript, lint, typecheck, tests, CI, responsive/accessible UI | Private repository/deployment setup is external |
| 2 | Supabase foundation plus completion migration, normalized seed fixtures, private `rgd-certs` bucket, RLS policy contract, explicit grants, generated database types, SSR/browser factories, server-controlled demo roles | Docker is required to execute remote-equivalent auth/advisor checks |
| 3 | Ghana/Nigeria catalogue, four categories, provenance classes, local prices, roadmap market horizon | Only active markets are transaction-enabled |
| 4 | Server-owned cart quote, validated Nigerian delivery-address snapshot, Paystack-shaped deterministic test adapter, optional real Paystack test calls, verification, HMAC webhook, duplicate protection, route-level idempotency keys | No live money or callback-based payment authority |
| 5 | Paid-order FEFO, expired/quarantine rejection, warehouse task progression, shared order timeline, optional private Realtime subscription with refetch fallback, server-only Supabase snapshot persistence, typed normalized read projections, server-only transactional normalized mutations, idempotency records, and audit writes | Remote staging validation remains follow-up work |
| 6 | Ghana-to-Nigeria transfer evidence, origin rule evaluator, provisional assessment snapshot linked to the order and shipment, watermarked certificate preview | Evidence and duty treatment are illustrative |
| 7 | Shipment and delivery-leg lifecycle, static route fallback, optional Mapbox static route rendering, explicit preflight/clear/launch/en-route lifecycle, deterministic telemetry playback, weather lockout, courier fallback | No live route planning or aircraft |
| 8 | Curation explanation, B2B preview, ratings/return-review session actions, roadmap explorer | No refunds, marketplace settlement, registry, or production AI |
| 9 | Role/API acceptance flow, signed guided-role cookies, automated HTTP cross-role regression harness, responsive CSS states, security boundaries, CI/build configuration | Live browser pass and staging/Vercel/Paystack/Supabase/Mapbox credentials require operator setup |
| 10 | This handoff, runbook, migration sanity check, and known-limitations record | Remote integrations and release operations remain explicitly isolated |

## Reproduce locally

```bash
pnpm install --frozen-lockfile
pnpm audit --prod
pnpm env:check
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke
pnpm migration:check
pnpm api:acceptance
pnpm api:normalized:acceptance
pnpm db:test
pnpm normalized:check
pnpm normalized:mutation:check
pnpm build
pnpm bundle:check
pnpm dev
```

Open `http://localhost:3000` and use `KORAMA-DEMO`. The canonical presentation path
is documented in `docs/runbook.md`. Reset the selected local adapter between runs; reset
does not call Paystack or mutate external services.

## API contracts used by the demo

- `POST /api/demo/access` establishes an HTTP-only signed session.
- `GET /api/demo/session` reports authentication and the server-held guided role.
- `POST /api/demo/identity` sets the server-held guided role.
- `POST /api/demo/reset` is restricted to the signed warehouse-operator identity.
- `GET /api/demo/state` returns the sanitized demo state.
- `GET /api/orders/:reference` returns the authenticated order view.
- Payment, fulfilment, order advancement, and delivery routes enforce session and role scope.
- `POST /api/webhooks/paystack` validates raw-body HMAC-SHA512 and accepts only successful charge events.
- `pnpm auth:bootstrap` creates the three Supabase guided identities when operator credentials are configured.
- `pnpm env:check` validates mode-dependent configuration without printing secret values.
- `pnpm staging:check` performs read-only full Supabase REST-schema/seed and Mapbox
  checks when staging mode is explicitly enabled, and rejects default access secrets.
- `GET /api/health` is a public, secret-free readiness check for deployment probes;
  it reports adapter mode without returning credentials or user data.
- `pnpm deployment:check` verifies a configured HTTPS deployment’s readiness and
  access gate without logging response secrets.
- `pnpm normalized:check` exercises the typed normalized catalogue and scoped
  operational repository against configured Supabase data.
- `pnpm normalized:mutation:check` exercises the server-only normalized deep-order
  transaction contract against a local Supabase database.
- `pnpm api:normalized:acceptance` exercises the complete HTTP journey through the
  normalized adapter, including Auth-guided role switching and normalized reset.
- `pnpm bundle:check` scans the built browser assets for server-only secret references
  and common secret-value formats.
- `pnpm api:acceptance` boots the built app with deterministic adapters and verifies the
  cross-role HTTP journey, catalogue gating, payment idempotency, FEFO, fulfilment,
  shipment lifecycle, compliance snapshots, drone fallback/lifecycle behavior, and
  Supabase audit persistence when that adapter is enabled.
- Cookie-authenticated mutations enforce same-origin requests, hosted cookies are
  `HttpOnly`, `SameSite=Lax`, and `Secure`, JSON/webhook bodies are bounded, and the
  app shell sends baseline framing, content-sniffing, referrer, and permissions headers.
- Service-role Supabase modules are explicitly guarded with `server-only`; `pnpm audit
  --prod` and `pnpm audit --dev` report no known vulnerabilities.

## Deferred production work

Before staging, validate the normalized read and mutation projections, HTTP adapter,
and Auth identities against the intended project. Run migrations and advisors with Docker,
configure a URL-restricted Mapbox token, validate Paystack test credentials and
webhook delivery, add external metrics/traces, and perform a separate deployment
approval. No production secret is required for the deterministic local demo.
Production mode also fails closed unless Supabase, Paystack, Mapbox, HTTPS app URL, and
non-default demo access/session secrets are configured.

### Dependency update boundary

The project uses pnpm 10.12.4 and is pinned to the latest toolchain versions compatible
with Next 16.3.3. `pnpm outdated` currently reports ESLint 10.9.1 and TypeScript 7.0.2,
but the Next 16 ESLint bundle still uses plugins that fail under ESLint 10, while its
transitive `typescript-eslint` 8.68.0 peer contract requires TypeScript below 6.1.
The verified versions therefore remain ESLint 9.39.5 and TypeScript 6.0.3; revisit these
two major upgrades when the Next toolchain publishes compatible plugin support.
