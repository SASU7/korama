import { requireAuth } from "@/lib/auth";
import { readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { reference } = await params;
  const normalized = await readNormalizedOrder(
    reference,
    auth.context.user.id,
    auth.context.activeRole,
  );
  return normalized
    ? Response.json(
        {
          order: normalized.state.order,
          events: normalized.state.orderEvents,
          shipment: normalized.state.shipment,
          sortie: normalized.state.sortie,
        },
        { headers: { "cache-control": "no-store" } },
      )
    : Response.json(
        { error: "Order not found" },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
}
