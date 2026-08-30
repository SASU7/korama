# Korama Investor Prototype — Runbook

## Local start

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000` and enter `KORAMA-DEMO`.

The canonical presenter flow is:

1. Commerce → Nigeria → Nokware shea repair balm → review the illustrative delivery details → Buy in test mode.
2. Switch guided identity to `Warehouse + compliance`, then Operations → Allocate → Confirm pick → Confirm pack → Dispatch. Packing creates the shipment and dispatch starts its simulated delivery leg.
3. Compliance → show the evidence chain and `DEMO — NOT A VALID CERTIFICATE`.
4. Switch guided identity to `Drone safety officer`, then Delivery → Run preflight → Launch simulated sortie.
5. Inject unsafe weather to show lockout and ground-courier fallback, or reset for a
   clean run.

## Verification

```bash
pnpm env:check
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke
pnpm migration:check
pnpm api:acceptance
pnpm build
pnpm install --frozen-lockfile
```

`pnpm test` runs the domain acceptance tests using Node's built-in TypeScript type
stripping. The Supabase migration is the persistence contract; the default investor
demo uses the server-owned deterministic store so it runs without credentials.

After `pnpm build`, `pnpm api:acceptance` starts the production server with deterministic
adapters and verifies the cross-role access, payment idempotency, FEFO, fulfilment, and
drone lifecycle contracts over HTTP.

`lib/supabase/database.types.ts` is generated from the local schema after migrations
stabilize. `pnpm migration:check` statically verifies that the migration contains the core tables,
RLS markers, guided-role policies, and unique index names. Full `supabase db lint` and
seed/reset execution require Docker; if Docker is unavailable, record that result and
do not apply the migration to a remote project.

With Docker available, `pnpm db:test` runs the pgTAP isolation suite. It verifies
consumer ownership, operating-company staff scope, server-only payment/audit tables,
listing access, and that authenticated users cannot self-assign roles.

For a configured Supabase project, set the service-role key and a temporary seed
password, then run `pnpm auth:bootstrap`. This creates or updates the three guided
identities and their server-side profile/role assignments. Never put the service-role
key or seed password in the repository or browser environment.

The guided-role cookie is signed by `KORAMA_DEMO_SESSION_SECRET`; production mode
requires that secret and a non-default access code. `pnpm env:check` fails closed when
production adapter credentials or access-security settings are missing.

## External services

Phase-ready environment names are in `.env.example`. Paystack routes remain test-mode
only until `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` are supplied. Webhooks
must send an HMAC-SHA512 signature over the raw request body. Mapbox is optional: when
`NEXT_PUBLIC_MAPBOX_TOKEN` is set, the seeded route renders in Mapbox; otherwise the
accessible static route preview remains active. No live flight or route planning is enabled.

## Reset and safety

Reset uses `POST /api/demo/reset` with the `x-korama-demo-code: KORAMA-DEMO` header.
It resets only local demo state and does not touch external Paystack transactions.
The Supabase migration requires RLS, explicit grants, scoped staff policies, private
security-definer helpers, and immutable audit/idempotency foundations.

## Known prototype boundaries

- The local demo store is not production persistence; connect the Supabase adapter
  before staging.
- Paystack initialization and verification are deterministic test adapters until live
  test credentials are configured.
- The route map is seeded and fictional; the drone control surface is a digital twin.
- Prices, tax/duty treatment, origin assessment, and certificate preview are illustrative.
- No production AI, customs/tax integration, valid certificate, real aircraft, refunds,
  marketplace settlement, or cross-border FX rail is present.
