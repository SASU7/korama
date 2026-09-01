# Korama

Korama is a proof-of-concept commerce and operations app for a Ghana–Nigeria trade corridor. It combines a public catalogue, Nigerian checkout, test payments, order tracking, FEFO warehouse allocation, origin evidence, and a simulated last-mile safety workflow.

Production: [korama.vercel.app](https://korama.vercel.app)

## Runtime architecture

- Next.js 16 App Router on Vercel.
- WILSHUB-Engine on Supabase (project ref **cmusntqsaatsxndltdxe**) is the only database in every environment.
- Supabase Auth provides Google OAuth sessions. Every signed-in user receives the **consumer** role; internal roles come only from **role_assignments**. **administrator** is a superset role — it satisfies every other role check, in the app guards and in `private.has_role()` (so RLS and Realtime agree).
- Server-only normalized Supabase repositories and RPCs own order, payment, inventory, fulfilment, and delivery mutations.
- Paystack hosted Checkout runs in test mode. Paystack signs webhooks with **PAYSTACK_SECRET_KEY** using HMAC-SHA512.
- Mapbox renders the delivery route when configured; the app keeps a static fallback.

There is no in-memory, snapshot, access-code, or local-Supabase runtime path.

## Application routes

| Route | Access | Purpose |
| --- | --- | --- |
| /shop | Public | Nigeria/Ghana catalogue and product details |
| /markets | Public | Active and future market view |
| /auth/sign-in | Public | Google sign-in |
| /account/orders | Consumer | Order list and tracking |
| /operations | warehouse_operator | FEFO allocation and fulfilment |
| /compliance | warehouse_operator | Origin evidence and certificate preview |
| /delivery | safety_officer | Preflight, telemetry, lockout, and fallback |
| /admin/products | administrator | Catalogue: create, edit, and photograph products |
| /admin/users | administrator | People: assign roles and invite new Gmail accounts |
| /api/health | Public, secret-free | Hosted dependency readiness |

## Environment

Copy **.env.example** to **.env** and populate every value:

~~~dotenv
NEXT_PUBLIC_SUPABASE_URL=https://cmusntqsaatsxndltdxe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
~~~

Rules:

- **NEXT_PUBLIC_SUPABASE_URL** must remain the hosted WILSHUB-Engine URL; localhost Supabase URLs are rejected.
- **PAYSTACK_SECRET_KEY** must start with **sk_test_**. Live keys are intentionally rejected.
- Never expose the service-role or Paystack secret to browser code or commit them.
- Vercel Production, Preview, and Development use the same hosted Supabase project.

## Local development

~~~bash
pnpm install --frozen-lockfile
pnpm env:check
pnpm dev
~~~

Open **http://localhost:3000/shop**. Only the frontend runs locally; all data comes from WILSHUB-Engine.

## Provider setup

### Google sign-in

1. In Google Cloud, create a Web OAuth client.
2. Add the authorized redirect URI **https://cmusntqsaatsxndltdxe.supabase.co/auth/v1/callback**.
3. Add the client ID and secret to Supabase Authentication → Providers → Google and enable it.
4. Keep the Supabase site URL at **https://korama.vercel.app** and allow **https://korama.vercel.app/auth/callback**.

A consumer profile and role assignment are created after the first successful callback.

Internal roles are handed out from **/admin/users**, not from psql. An administrator can tick roles on any existing account, or assign a role to a **@gmail.com** address that has never signed in — that intent is held in **public.pending_role_assignments** and applied by the OAuth callback the first time the person arrives. Only gmail.com is accepted for now, because sign-in is Google OAuth.

The default administrator is **nanasasu7@gmail.com**, bootstrapped by migration **20260901160000_administrator_full_access_and_invites.sql** whether or not that account has signed in yet. `pnpm admin:grant <email>` remains the break-glass path if nobody can reach the page.

Two lockouts are refused by the server, not just hidden in the UI: removing your own administrator role, and removing the last administrator.

### Paystack

1. Put a Paystack test secret key in **PAYSTACK_SECRET_KEY**.
2. Set the Paystack test webhook URL to **https://korama.vercel.app/api/webhooks/paystack**.
3. Do not add a separate webhook secret; Paystack uses the API secret key to sign events.

## Database and migrations

The linked production project originally contained five empty, incompatible public tables. Migration **0000_preserve_wilshub_legacy.sql** moves those objects into a locked **wilshub_legacy** schema and removes their obsolete Auth signup trigger before creating Korama's normalized public schema. No legacy rows were discarded.

The pre-migration public schema, Auth schema, and data dumps are stored locally under **.backups/wilshub-engine-pre-korama-2026-08-31/** with owner-only permissions. The directory is excluded from Git and Vercel uploads.

Apply future migrations only after a production schema/data backup:

~~~bash
supabase link --project-ref cmusntqsaatsxndltdxe
supabase db push --linked --include-all --include-seed
supabase gen types typescript --linked --schema public
~~~

Generated types live in **lib/supabase/database.types.ts**.

## Verification

~~~bash
pnpm typecheck
pnpm lint
pnpm test
pnpm migration:check
pnpm normalized:check
pnpm build
pnpm bundle:check
pnpm production:check
KORAMA_DEPLOYMENT_URL=https://korama.vercel.app pnpm deployment:check
~~~

These checks cover different surfaces: unit behavior, migration contracts, hosted normalized reads, build correctness, browser-bundle secret scanning, provider configuration, and deployed health/catalogue access.

## Deploy

The checkout is linked to Vercel project **nanasasu7-1696/korama**.

~~~bash
pnpm dlx vercel@latest deploy . --prod -y
~~~

**.vercelignore** excludes local environment files from deployment uploads. After changing any Vercel environment variable, redeploy before running the hosted smoke check.

## Repository map

- **app/** — routes, Auth callbacks, account pages, and API handlers.
- **components/PrototypeWorkspace.tsx** — shared shop, markets, operations, compliance, and delivery workspace.
- **lib/auth.ts** — Supabase user context and database-backed role authorization.
- **lib/supabase/role-admin.ts** — service-role reads and writes behind the People screen.
- **lib/domain.ts** — quote, FEFO, fulfilment, and safety rules.
- **lib/supabase/normalized-repository.ts** — typed reads and RPC calls.
- **lib/supabase/normalized-adapter.ts** — application view projection over normalized data.
- **supabase/migrations/** and **supabase/seed.sql** — production schema, RLS, RPC, storage, and seed contracts.
- **scripts/** — environment, migration, normalized, bundle, production, and deployment checks.
- **.superstack/learnings.md** — append-only knowledge base for subsequent tasks.

## POC boundaries

Prices, duty treatment, provenance evidence, aviation records, and operational events are illustrative. The app does not claim regulatory approval, issue valid certificates, operate real aircraft, process live money, or integrate with customs/tax registries. Those boundaries are shown contextually where they affect a user decision rather than as investor-oriented presentation copy.


## Routes

| Route | Shell | Access |
|---|---|---|
| `/shop`, `/shop/[slug]`, `/markets`, `/cart` | Storefront | Public |
| `/account/orders`, `/account/orders/[reference]` | Storefront | Signed in |
| `/checkout`, `/checkout/complete` | Focused checkout | Signed in |
| `/operations`, `/compliance` | Staff console | `warehouse_operator` |
| `/delivery` | Staff console | `safety_officer` |
| `/admin/products`, `/admin/users` | Admin | `administrator` |
| `/access-denied` | Storefront | Public |
| `/auth/sign-in`, `/auth/callback` | — | Public |

## Commands that exist

```bash
pnpm dev              # start the app
pnpm build            # production build
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm test             # node --test tests/*.test.ts
pnpm smoke            # structural checks: tokens, route groups, a11y, boundaries
pnpm migration:check  # static assertions over supabase/migrations
pnpm normalized:check # exercises the catalogue/operational reads
pnpm env:check        # config validation, prints no secrets
pnpm bundle:check     # scans built client assets for server-only secrets
pnpm production:check # read-only staging preflight
pnpm deployment:check # verifies a deployed HTTPS URL
```

The design system, palette and density rules are documented in `brand.md`.
