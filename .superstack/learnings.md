# Project Learnings

> Managed by `/learn`. Append-only — latest entry wins on conflicts.

## Patterns

### deterministic-demo-contract-first
- **Insight:** Keep the deterministic adapter behaviorally aligned with the normalized repository so the investor journey remains credential-free while the same HTTP contract can be exercised against Supabase.
- **Confidence:** 9/10
- **Source:** learn
- **Files:** lib/domain.ts, lib/demo-store.ts, lib/supabase/normalized-adapter.ts, scripts/api-acceptance.mjs
- **Date:** 2026-08-30

### shared-order-compliance-snapshot
- **Insight:** Preserve origin and delivery-address facts as immutable order-line and shipment snapshots so later fulfilment and delivery views do not silently reinterpret the original transaction.
- **Confidence:** 9/10
- **Source:** learn
- **Files:** lib/domain.ts, lib/supabase/normalized-adapter.ts, supabase/migrations/20260830175151_normalized_transactional_mutations.sql, supabase/migrations/20260830181624_normalized_compliance_snapshot.sql
- **Date:** 2026-08-30

### verification-layers-have-distinct-scope
- **Insight:** Treat unit, migration-sanity, pgTAP RLS, normalized repository, normalized mutation, HTTP acceptance, bundle scan, build, and browser QA as separate evidence layers because no single check covers all project guarantees.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** package.json, tests/domain.test.ts, supabase/tests/rls_isolation_test.sql, scripts/api-acceptance.mjs, scripts/normalized-contract-check.mjs, scripts/normalized-mutation-check.mjs, scripts/client-bundle-check.mjs
- **Date:** 2026-08-30

### hosted-supabase-is-the-single-runtime
- **Insight:** Every environment uses WILSHUB-Engine directly; deterministic snapshots, access-code sessions, local Supabase, and adapter feature flags are not runtime options.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** .env.example, lib/auth.ts, lib/supabase/normalized-adapter.ts, README.md
- **Date:** 2026-08-31

## Pitfalls

### snapshot-fefo-can-overallocate
- **Insight:** The deterministic FEFO selector checks only that some stock remains, not that remaining stock covers the requested quantity, so a large order can over-allocate the snapshot batch even though the normalized SQL path correctly enforces capacity.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** lib/domain.ts, tests/domain.test.ts, supabase/migrations/20260830175151_normalized_transactional_mutations.sql
- **Date:** 2026-08-30

### paystack-client-flow-is-deterministic-only
- **Insight:** The client ignores the Paystack authorization URL and immediately calls verification after initialization, so configured Paystack test credentials do not yet produce a usable hosted-checkout browser journey.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** components/PrototypeWorkspace.tsx, app/api/payments/paystack/initialize/route.ts, app/api/payments/paystack/verify/route.ts
- **Date:** 2026-08-30

### fefo-negative-balance-test-is-too-narrow
- **Insight:** The unit test named as preventing negative allocation uses quantity one against ample stock and therefore does not exercise the over-allocation edge case.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** tests/domain.test.ts, lib/domain.ts
- **Date:** 2026-08-30

### next-dev-origin-must-match-localhost
- **Insight:** Use the documented `http://localhost:3000` URL for browser QA because loading the dev server through `127.0.0.1` causes Next.js to block development assets and leaves the access form unhydrated.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** README.md, docs/runbook.md, next.config.ts
- **Date:** 2026-08-30

### remote-release-evidence-remains-external
- **Insight:** Green local checks do not verify Vercel readiness, remote Supabase migrations or advisors, real Paystack webhooks, restricted Mapbox tokens, or production observability.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** docs/as-built.md, docs/runbook.md, scripts/staging-preflight.mjs, scripts/deployment-smoke.mjs
- **Date:** 2026-08-30

### shared-project-schema-name-collision
- **Insight:** WILSHUB-Engine's earlier empty public schema reused profiles, products, orders, cart_items, and user_role, so production migration must back up first and preserve those objects in wilshub_legacy before creating Korama.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** supabase/migrations/0000_preserve_wilshub_legacy.sql, supabase/config.toml
- **Date:** 2026-08-31

### listed-modern-supabase-secret-is-masked
- **Insight:** Supabase CLI lists existing modern secret keys in masked form; use an unmasked legacy service-role JWT or a newly generated secret when configuring a server client.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** .env.example, lib/auth.ts
- **Date:** 2026-08-31

## Preferences

### preserve-gated-phase-ownership
- **Insight:** Subsequent implementation should stay in sequential approval gates with one owner for migrations, auth, shared domain contracts, payment transitions, and RLS, and at most two non-overlapping execution packets.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** KORAMA_INVESTOR_PROTOTYPE_PLAN.md, docs/agent-workstreams.md
- **Date:** 2026-08-30

## Architecture

### authority-splits-by-concern
- **Insight:** The access-code cookie gates the private demo, the guided role or Supabase assignment authorizes role actions, route handlers own input and origin checks, and service-role-only RPCs own normalized transactional integrity.
- **Confidence:** 9/10
- **Source:** learn
- **Files:** lib/demo-auth.ts, app/api, lib/supabase/normalized-repository.ts, supabase/migrations/20260830175151_normalized_transactional_mutations.sql
- **Date:** 2026-08-30

### ui-is-a-single-workspace-state-machine
- **Insight:** Most presentation behavior is concentrated in one client workspace component that switches five surfaces over a shared demo state, so UI changes should be regression-checked across commerce, operations, compliance, delivery, and market views.
- **Confidence:** 9/10
- **Source:** learn
- **Files:** components/PrototypeWorkspace.tsx, app/globals.css
- **Date:** 2026-08-30

### normalized-rpcs-are-release-path
- **Insight:** The normalized Supabase RPCs are the concurrency-safe release path for order creation, payment verification, FEFO allocation, fulfilment, delivery commands, and reset; snapshot persistence is presentation continuity rather than the production domain model.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** lib/supabase/normalized-repository.ts, lib/supabase/normalized-adapter.ts, supabase/migrations/20260830175151_normalized_transactional_mutations.sql, supabase/migrations/20260830181624_normalized_compliance_snapshot.sql
- **Date:** 2026-08-30

### authority-splits-by-concern
- **Insight:** Supabase owns user sessions, every Google user receives consumer access, database role_assignments alone grant internal roles, route handlers enforce the active assigned role, and service-role RPCs own transactional integrity.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** lib/auth.ts, app/auth/callback/route.ts, app/api/auth/role/route.ts, lib/supabase/normalized-repository.ts
- **Date:** 2026-08-31

### paystack-hosted-checkout-is-the-release-path
- **Insight:** Checkout redirects to Paystack's hosted authorization URL, verifies callback and webhook amounts server-side, and validates webhook HMAC-SHA512 with the Paystack test secret key itself.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** lib/paystack.ts, app/api/payments/paystack/initialize/route.ts, app/api/payments/paystack/verify/route.ts, app/api/webhooks/paystack/route.ts
- **Date:** 2026-08-31

## Tools

### local-supabase-verification-baseline
- **Insight:** The current local Supabase stack passes 33 pgTAP assertions, schema lint, normalized read checks, normalized mutation checks, and normalized HTTP acceptance with CLI 2.48.3.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** supabase/config.toml, supabase/tests/rls_isolation_test.sql, scripts/normalized-contract-check.mjs, scripts/normalized-mutation-check.mjs, scripts/api-acceptance.mjs
- **Date:** 2026-08-30

### browser-qa-baseline
- **Insight:** Desktop commerce, compliance, market horizon, and the 390-by-844 mobile commerce layout render without console errors or horizontal overflow on the documented local origin.
- **Confidence:** 9/10
- **Source:** learn
- **Files:** components/PrototypeWorkspace.tsx, components/AccessGate.tsx, app/globals.css
- **Date:** 2026-08-30

### production-supabase-verification-baseline
- **Insight:** WILSHUB-Engine has ten matched migrations, clean database lint, eight Nigeria listings, two Ghana listings, four scoped Nigeria batches, and permission-restricted pre-migration schema/data backups.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** supabase/migrations, supabase/seed.sql, scripts/normalized-contract-check.mjs
- **Date:** 2026-08-31

### browser-qa-baseline
- **Insight:** The production-backed shop and markets render without console errors; the 390-by-844 shop has eight product cards and no horizontal overflow, while internal routes redirect anonymous users to Google sign-in.
- **Confidence:** 10/10
- **Source:** learn
- **Files:** components/PrototypeWorkspace.tsx, components/KoramaPage.tsx, app/globals.css
- **Date:** 2026-08-31
