# Korama Investor Prototype — Runbook

## Local start

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000` and enter `KORAMA-DEMO`.

The canonical presenter flow is:

1. Commerce → Nigeria → Nokware shea repair balm → Buy in test mode.
2. Switch guided identity to `Warehouse + compliance`, then Operations → Allocate → Confirm pick → Confirm pack → Dispatch.
3. Compliance → show the evidence chain and `DEMO — NOT A VALID CERTIFICATE`.
4. Switch guided identity to `Drone safety officer`, then Delivery → Run preflight → Launch simulated sortie.
5. Inject unsafe weather to show lockout and ground-courier fallback, or reset for a
   clean run.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke
pnpm build
pnpm install --frozen-lockfile
```

`pnpm test` runs the domain acceptance tests using Node's built-in TypeScript type
stripping. The Supabase migration is the persistence contract; the default investor
demo uses the server-owned deterministic store so it runs without credentials.

## External services

Phase-ready environment names are in `.env.example`. Paystack routes remain test-mode
only until `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` are supplied. Webhooks
must send an HMAC-SHA512 signature over the raw request body. Mapbox is optional for
the current static route preview; no live flight or route planning is enabled.

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
