import { recordDemoAudit, resetPersistedDemoStore } from "@/lib/demo-store";
import { authenticatedRole, authenticatedUserId, sessionCookie, trustedRequestOrigin, unauthorizedUnlessAuthenticatedRole } from "@/lib/demo-auth";
import { normalizedRepositoryEnabled, normalizedReset, readNormalizedState } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request); if (originError) return originError;
  const unauthorized = await unauthorizedUnlessAuthenticatedRole(request, ["warehouse_operator"]); if (unauthorized) return unauthorized;
  if (normalizedRepositoryEnabled()) {
    await normalizedReset();
    await recordDemoAudit("demo_reset", "demo_state", { status: "reset", adapter: "normalized" });
    return Response.json(await readNormalizedState(await authenticatedUserId() ?? undefined, await authenticatedRole(request) ?? "warehouse_operator"), { headers: { "set-cookie": sessionCookie(), "cache-control": "no-store" } });
  }
  const state = await resetPersistedDemoStore();
  await recordDemoAudit("demo_reset", "demo_state", { status: "reset" });
  return Response.json(state, { headers: { "set-cookie": sessionCookie(), "cache-control": "no-store" } });
}
