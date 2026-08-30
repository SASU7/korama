import { sortieCommand, type SortieCommand } from "@/lib/domain";
import { demoStore } from "@/lib/demo-store";
import { apiError, jsonBody } from "@/lib/api";
import { unauthorizedUnlessRole } from "@/lib/demo-auth";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const unauthorized = unauthorizedUnlessRole(request, ["safety_officer"]); if (unauthorized) return unauthorized;
  try {
    const { reference } = await params;
    const body = await jsonBody(request);
    const state = demoStore();
    if (!state.order || state.order.reference !== reference) throw new Error("Shipment not found");
    const command = String(body.command) as SortieCommand;
    sortieCommand(state, command);
    return Response.json({ sortie: state.sortie, order: state.order, shipment: state.shipment });
  } catch (error) { return apiError(error, request); }
}
