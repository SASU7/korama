import { configuredIdentityEmail, configuredSeedPassword, roleCookie, supabaseAuthEnabled, trustedRequestOrigin, unauthorizedUnlessSession } from "@/lib/demo-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request); if (originError) return originError;
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { role?: string };
    if (!["consumer", "warehouse_operator", "safety_officer"].includes(String(body.role))) return Response.json({ error: "Unsupported guided identity" }, { status: 400, headers: { "cache-control": "no-store" } });
    const role = body.role as "consumer" | "warehouse_operator" | "safety_officer";
    if (supabaseAuthEnabled()) {
      const password = configuredSeedPassword();
      const client = await createSupabaseServerClient();
      if (!client || !password) return Response.json({ error: "Supabase Auth is not configured for guided identities" }, { status: 503, headers: { "cache-control": "no-store" } });
      const { error } = await client.auth.signInWithPassword({ email: configuredIdentityEmail(role), password });
      if (error) return Response.json({ error: "Guided identity sign-in failed" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    return Response.json({ role }, { headers: { "set-cookie": roleCookie(role), "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400, headers: { "cache-control": "no-store" } }); }
}
