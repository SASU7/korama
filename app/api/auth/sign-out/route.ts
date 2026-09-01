import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trustedRequestOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return Response.json(
    { signedOut: true },
    { headers: { "cache-control": "no-store" } },
  );
}
