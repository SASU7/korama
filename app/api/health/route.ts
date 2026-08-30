import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

function runtimeEnv(name: string) { return globalThis.process?.env?.[name]; }
function truthy(value: string | undefined) { return ["1", "true", "yes"].includes((value ?? "").toLowerCase()); }

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const useSupabase = truthy(runtimeEnv("KORAMA_USE_SUPABASE"));
  const useSupabaseAuth = truthy(runtimeEnv("KORAMA_USE_SUPABASE_AUTH"));
  const useNormalizedRepository = truthy(runtimeEnv("KORAMA_USE_NORMALIZED_REPOSITORY"));
  const authConfigured = !useSupabaseAuth || (
    useSupabase &&
    Boolean(runtimeEnv("NEXT_PUBLIC_SUPABASE_URL")) &&
    Boolean(runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")) &&
    Boolean(runtimeEnv("KORAMA_SEED_PASSWORD")) &&
    Boolean(runtimeEnv("KORAMA_CONSUMER_EMAIL")) &&
    Boolean(runtimeEnv("KORAMA_WAREHOUSE_EMAIL")) &&
    Boolean(runtimeEnv("KORAMA_SAFETY_EMAIL"))
  );
  let persistence: "disabled" | "ready" | "unavailable" = useSupabase ? "unavailable" : "disabled";

  if (useSupabase) {
    const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
    const key = runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      try {
        const client = createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
        const { error } = useNormalizedRepository
          ? await client.from("market_listings").select("id").limit(1)
          : await client.from("demo_state_snapshots").select("id").limit(1);
        if (!error) persistence = "ready";
        else console.error(JSON.stringify({ event: "health_check_failed", requestId, dependency: "supabase", code: error.code ?? "unknown" }));
      } catch {
        console.error(JSON.stringify({ event: "health_check_failed", requestId, dependency: "supabase", code: "client_error" }));
      }
    }
  }

  const checks = {
    persistence,
    auth: useSupabaseAuth ? (authConfigured ? "supabase" : "unavailable") : "demo",
    adapter: useNormalizedRepository ? "normalized" : "snapshot",
    payment: runtimeEnv("PAYSTACK_SECRET_KEY") ? "paystack_test" : "deterministic",
    map: runtimeEnv("NEXT_PUBLIC_MAPBOX_TOKEN") ? "mapbox" : "static_fallback",
  } as const;
  const healthy = persistence !== "unavailable" && authConfigured;
  const status = healthy ? "ok" : "degraded";
  return Response.json({ status, checks, requestId }, { status: healthy ? 200 : 503, headers: { "cache-control": "no-store", "x-request-id": requestId } });
}
