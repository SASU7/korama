import { hydrateDemoStore } from "@/lib/demo-store";
import { authenticatedRole, authenticatedUserId, isProductionLike, requireDemoSession } from "@/lib/demo-auth";
import { normalizedRepositoryEnabled, readNormalizedState } from "@/lib/supabase/normalized-adapter";

export async function GET(request: Request) {
  try {
    requireDemoSession(request);
    if (normalizedRepositoryEnabled()) return Response.json(await readNormalizedState(await authenticatedUserId() ?? undefined, await authenticatedRole(request) ?? "consumer"), { headers: { "cache-control": "no-store" } });
    return Response.json(await hydrateDemoStore(), { headers: { "cache-control": "no-store" } });
  } catch (error) { return error instanceof Response ? error : Response.json({ error: isProductionLike() ? "Demo session required" : error instanceof Error ? error.message : "Demo session required" }, { status: 401, headers: { "cache-control": "no-store" } }); }
}
