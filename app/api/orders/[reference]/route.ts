import { hydrateDemoStore } from "@/lib/demo-store";
import { unauthorizedUnlessSession } from "@/lib/demo-auth";

export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  const { reference } = await params;
  const state = await hydrateDemoStore();
  if (!state.order || state.order.reference !== reference) return Response.json({ error: "Order not found" }, { status: 404 });
  return Response.json({ order: state.order, events: state.orderEvents, shipment: state.shipment, sortie: state.sortie });
}
