# Korama Investor Prototype — Runbook

> **Script names corrected 2026-09-01.** Several commands referenced below did
> not exist in `package.json`: `api:acceptance`, `api:normalized:acceptance`,
> `db:test`, `normalized:mutation:check` and `auth:bootstrap`. The `/api/demo/*`
> routes and the `KORAMA-DEMO` access gate were removed in commit 589201f.
> Runnable commands are listed in `README.md`; treat any others here as
> intended-but-unbuilt.
## Local start

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. The shared access-code gate was removed in
commit 589201f; sign-in is Google OAuth via Supabase.

The canonical presenter flow is:

1. Shop → Nigeria → open a product → Add to cart. Add a second product to
   show a multi-line order, then Cart → Checkout → Paystack test payment.
2. Switch guided identity to `Warehouse + compliance`, then Operations → Allocate → Confirm pick → Confirm pack → Dispatch. Packing creates the shipment and dispatch starts its simulated delivery leg.
3. Compliance → show the evidence chain and `DEMO — NOT A VALID CERTIFICATE`.
4. Switch guided identity to `Drone safety officer`, then Delivery → Run preflight → Launch simulated sortie.
5. Inject unsafe weather to show lockout and ground-courier fallback, or reset for a
   clean run.

## Verification

```bash
pnpm audit --prod
pnpm env:check
pnpm production:check
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke
pnpm migration:check
pnpm bundle:check
pnpm build
pnpm install --frozen-lockfile
```

`pnpm test` runs the domain acceptance tests using Node's built-in TypeScript type
stripping. The Supabase migration is the persistence contract; the default investor
demo uses the server-owned deterministic store so it runs without credentials.

After `pnpm build`, `pnpm api:acceptance` starts the production server with deterministic
adapters and verifies the cross-role access, payment idempotency, FEFO, fulfilment, and
drone lifecycle contracts over HTTP.

To verify the optional persistence path against local Supabase, export the local CLI
credentials, set `KORAMA_USE_SUPABASE=true`, and run the acceptance harness twice; set
`KORAMA_EXPECT_PERSISTED=true` on the second run to assert the state was loaded after the
first server process exited.

`lib/supabase/database.types.ts` is generated from the local schema after migrations
stabilize. `pnpm migration:check
pnpm bundle:check` statically verifies that the migration contains the core tables,
RLS markers, guided-role policies, and unique index names. Full `supabase db lint` and
seed/reset execution require Docker; if Docker is unavailable, record that result and
do not apply the migration to a remote project.

With Docker available, `pnpm db:test` runs the pgTAP isolation suite. It verifies
consumer ownership, operating-company staff scope, server-only payment/audit tables,
listing access, and that authenticated users cannot self-assign roles.

Mutating quote, payment-initialize, fulfilment, order-advance, and sortie-command
requests accept an optional `Idempotency-Key`. Reusing a key for the same operation
returns the original response; reusing it for another operation is rejected.
Supabase-backed transitions also write server-only audit records tagged to the demo
source; the acceptance harness checks that audit persistence is available.

For a configured Supabase project, set the service-role key and a temporary seed
password, then run `pnpm auth:bootstrap`. This creates or updates the three guided
identities and their server-side profile/role assignments. Set
`KORAMA_USE_SUPABASE_AUTH=true` in staging/production so protected transitions use
the verified Supabase user and database role assignment. Never put the service-role
key or seed password in the repository or browser environment.

The guided-role cookie is signed by `KORAMA_DEMO_SESSION_SECRET`; production mode
requires that secret and a non-default access code. `pnpm env:check` fails closed when
production adapter credentials or access-security settings are missing.

`pnpm production:check` is opt-in: it performs read-only checks against the configured
Supabase REST endpoint, Auth identities, private `rgd-certs` bucket, and Mapbox style
endpoint only when `KORAMA_STAGING=true` or `KORAMA_PRODUCTION=true`. `/api/health`
is safe to use as a deployment readiness probe and never returns secret values.
After deployment, set `KORAMA_DEPLOYMENT_URL` and run `pnpm deployment:check`; use
`KORAMA_ALLOW_HTTP=true` only for a deliberate local smoke check.

## External services

Phase-ready environment names are in `.env.example`. Paystack routes remain test-mode
only until `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` are supplied. Webhooks
must send an HMAC-SHA512 signature over the raw request body. Mapbox is optional: when
`NEXT_PUBLIC_MAPBOX_TOKEN` is set, the seeded route renders in Mapbox; otherwise the
accessible static route preview remains active. No live flight or route planning is enabled.

## Reset and safety

Reset uses `POST /api/demo/reset` while the signed `Warehouse + compliance` guided
identity is active. The legacy demo-code header is ignored for authorization. It resets
only selected local adapter state and does not touch external Paystack transactions.
The Supabase migration requires RLS, explicit grants, scoped staff policies, private
security-definer helpers, and immutable audit/idempotency foundations.

## Known prototype boundaries

- The default local demo store is in-memory. Set `KORAMA_USE_SUPABASE=true` only with
  the intended project and server-only service-role credentials; this persists the
  current investor journey as a server-only aggregate snapshot.
- The normalized commerce, inventory, compliance, and delivery tables are now seeded
  as the production data contract. `pnpm normalized:check` validates their typed
  read projections against a configured Supabase project, while
  `pnpm normalized:mutation:check` exercises the server-only transaction contract
  and restores its temporary test data on completion. The normalized HTTP adapter is
  locally cut over and still requires separate staging validation before becoming the
  default release mode.
- Set `KORAMA_USE_NORMALIZED_REPOSITORY=true` with Supabase Auth to route the HTTP
  journey through normalized tables and transactional RPCs. Verify locally with
  `pnpm api:normalized:acceptance`; keep the flag off for the deterministic demo.
- Paystack initialization and verification are deterministic test adapters until live
  test credentials are configured.
- The route map is seeded and fictional; the drone control surface is a digital twin.
- Prices, tax/duty treatment, origin assessment, and certificate preview are illustrative.
- No production AI, customs/tax integration, valid certificate, real aircraft, refunds,
  marketplace settlement, or cross-border FX rail is present.
