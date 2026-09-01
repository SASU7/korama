import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

function runtimeEnv(name: string) {
  return globalThis.process?.env?.[name];
}
function config() {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required",
    );
  return { url, key };
}

export async function createSupabaseServerClient() {
  const values = config();
  const cookieStore = await cookies();
  return createServerClient<Database>(values.url, values.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Components may not be able to write cookies. */
        }
      },
    },
  });
}
