import { hydrateDemoStore } from "@/lib/demo-store";
import { authenticatedRole, authenticatedUserId, unauthorizedUnlessSession } from "@/lib/demo-auth";
import { normalizedRepositoryEnabled, readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  const { reference } = await params;
  if (normalizedRepositoryEnabled()) {
    const normalized = await readNormalizedOrder(reference, await authenticatedUserId() ?? undefined, await authenticatedRole(request) ?? "consumer");
    return normalized ? Response.json({ order: normalized.state.order, events: normalized.state.orderEvents, shipment: normalized.state.shipment, sortie: normalized.state.sortie }, { headers: { "cache-control": "no-store" } }) : Response.json({ error: "Order not found" }, { status: 404, headers: { "cache-control": "no-store" } });
  }
  const state = await hydrateDemoStore();
  if (!state.order || state.order.reference !== reference) return Response.json({ error: "Order not found" }, { status: 404, headers: { "cache-control": "no-store" } });
  return Response.json({ order: state.order, events: state.orderEvents, shipment: state.shipment, sortie: state.sortie }, { headers: { "cache-control": "no-store" } });
}
