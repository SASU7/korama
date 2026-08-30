import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

function runtimeEnv(name: string) { return globalThis.process?.env?.[name]; }
function config() {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return url && key ? { url, key } : null;
}

export async function createSupabaseServerClient() {
  const values = config();
  if (!values) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(values.url, values.key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components may not be able to write cookies. */ }
      },
    },
  });
}
