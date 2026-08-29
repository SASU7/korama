import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function createSupabaseServerClient() {
  const values = config();
  if (!values) return null;
  const cookieStore = await cookies();
  return createServerClient(values.url, values.key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components may not be able to write cookies. */ }
      },
    },
  });
}
