import { recordDemoAudit, resetPersistedDemoStore } from "@/lib/demo-store";
import { sessionCookie, unauthorizedUnlessAuthenticatedRole } from "@/lib/demo-auth";

export async function POST(request: Request) {
  const unauthorized = await unauthorizedUnlessAuthenticatedRole(request, ["warehouse_operator"]); if (unauthorized) return unauthorized;
  const state = await resetPersistedDemoStore();
  await recordDemoAudit("demo_reset", "demo_state", { status: "reset" });
  return Response.json(state, { headers: { "set-cookie": sessionCookie() } });
}
