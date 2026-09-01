# Korama Prototype — As-built handoff

> **Script names corrected 2026-09-01.** Several commands referenced below did
> not exist in `package.json`: `api:acceptance`, `api:normalized:acceptance`,
> `db:test`, `normalized:mutation:check` and `auth:bootstrap`. The `/api/demo/*`
> routes and the `KORAMA-DEMO` access gate were removed in commit 589201f.
> Runnable commands are listed in `README.md`; treat any others here as
> intended-but-unbuilt.
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
pnpm normalized:check
pnpm build
pnpm bundle:check
pnpm dev
```

Open `http://localhost:3000`. The canonical presentation path is documented in
`docs/runbook.md`. The shared access-code gate was removed in commit 589201f;
sign-in is Google OAuth via Supabase.

## API contracts used by the demo

- `GET /api/orders/:reference` returns the authenticated order view.
- Payment, fulfilment, order advancement, and delivery routes enforce session and role scope.
- `POST /api/webhooks/paystack` validates raw-body HMAC-SHA512 and accepts only successful charge events.
- `pnpm env:check` validates mode-dependent configuration without printing secret values.
- `pnpm production:check` performs read-only full Supabase REST-schema/seed and Mapbox
  checks when staging mode is explicitly enabled, and rejects default access secrets.
- `GET /api/health` is a public, secret-free readiness check for deployment probes;
  it reports adapter mode without returning credentials or user data.
- `pnpm deployment:check` verifies a configured HTTPS deployment’s readiness and
  access gate without logging response secrets.
- `pnpm normalized:check` exercises the typed normalized catalogue and scoped
  operational repository against configured Supabase data.
- `pnpm bundle:check` scans the built browser assets for server-only secret references
  and common secret-value formats.
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


## UI overhaul (2026-09-01)

The five surfaces no longer render from one 1,993-line client component. They
are separate routes under two shells with different densities, built on
Tailwind v4 and shadcn/ui with a Korama green/gold token system in light and
dark. See `brand.md` for the palette and the density rules.

Structural changes worth knowing:

- `app/(shop)`, `app/(checkout)` and `app/(workspace)` route groups. Checkout
  is its own group so the storefront shell never wraps it.
- `proxy.ts` redirects unauthenticated visitors away from `/account`,
  `/checkout`, `/operations`, `/compliance` and `/delivery` before anything
  renders. Every protected page still asserts auth and role for itself —
  middleware does not run on client-side navigations.
- Orders are multi-line. `korama_create_order` takes `p_lines jsonb` and
  computes every money figure itself; no client-supplied price reaches the
  database. `korama_allocate_order_fefo` allocates per line, all or nothing.
- `lib/domain.ts` and the SQL must agree on order arithmetic to the minor
  unit. `tests/quote-parity.test.ts` is the guard: if they drift,
  `korama_verify_payment` starts rejecting real Paystack payments.
- The cart is server-owned — `carts`/`cart_items` when signed in, an httpOnly
  cookie when not, merged on sign-in.

### Known limitations

- `public/products/` has no photographs. The pipeline is complete and files
  drop in with no code change; see `public/products/README.md` for the
  expected filenames and what each should depict.
- `PAYSTACK_SECRET_KEY` must be a `sk_test_` key before checkout can be
  exercised end to end.
- The hosted Supabase project still needs migration `20260901120000` applied
  and the corrected seed value for `market_configs.checkout_enabled` on Ghana.
