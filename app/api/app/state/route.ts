import { authContext } from "@/lib/auth";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await authContext();
  const state = await readNormalizedState(
    context?.user.id,
    context?.activeRole ?? "consumer",
  );
  return Response.json(
    {
      state,
      auth: context
        ? {
            authenticated: true,
            email: context.user.email,
            name:
              context.user.user_metadata?.full_name ||
              context.user.user_metadata?.name ||
              context.user.email,
            roles: context.roles,
            activeRole: context.activeRole,
          }
        : { authenticated: false, roles: [], activeRole: "consumer" },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
