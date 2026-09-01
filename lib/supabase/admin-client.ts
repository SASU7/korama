import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

function runtimeEnv(name: string) {
  return globalThis.process?.env?.[name];
}

/**
 * Service-role client. Lifted out of normalized-adapter.ts so other
 * server-only readers share one factory instead of each constructing a client.
 */
export function adminClient() {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    throw new Error(
      "Normalized Supabase mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
