import { configuredIdentityEmail, configuredSeedPassword, roleCookie, supabaseAuthEnabled, unauthorizedUnlessSession } from "@/lib/demo-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { role?: string };
    if (!["consumer", "warehouse_operator", "safety_officer"].includes(String(body.role))) return Response.json({ error: "Unsupported guided identity" }, { status: 400 });
    const role = body.role as "consumer" | "warehouse_operator" | "safety_officer";
    if (supabaseAuthEnabled()) {
      const password = configuredSeedPassword();
      const client = await createSupabaseServerClient();
      if (!client || !password) return Response.json({ error: "Supabase Auth is not configured for guided identities" }, { status: 503 });
      const { error } = await client.auth.signInWithPassword({ email: configuredIdentityEmail(role), password });
      if (error) return Response.json({ error: "Guided identity sign-in failed" }, { status: 503 });
    }
    return Response.json({ role }, { headers: { "set-cookie": roleCookie(role) } });
  } catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
}
