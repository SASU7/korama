import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const configured = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    paystack: Boolean(process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_")),
    mapbox: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
  };
  let database = false;
  if (configured.supabase) {
    try {
      const { error } = await createSupabaseAdminClient()
        .from("market_listings")
        .select("product_id")
        .limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }
  const healthy = database && configured.paystack;
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: {
        database: database ? "ready" : "unavailable",
        auth: configured.supabase ? "supabase" : "unavailable",
        payment: configured.paystack ? "paystack_test" : "unavailable",
        map: configured.mapbox ? "mapbox" : "static_fallback",
      },
      requestId,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    },
  );
}
