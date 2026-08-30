import { sortieCommand, type SortieCommand } from "@/lib/domain";
import { getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { apiError, jsonBody } from "@/lib/api";
import { unauthorizedUnlessAuthenticatedRole } from "@/lib/demo-auth";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const unauthorized = await unauthorizedUnlessAuthenticatedRole(request, ["safety_officer"]); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(request.headers.get("idempotency-key"), "sortie_command");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const { reference } = await params;
    const body = await jsonBody(request);
    const state = await hydrateDemoStore();
    if (!state.order || state.order.reference !== reference) throw new Error("Shipment not found");
    const command = String(body.command) as SortieCommand;
    sortieCommand(state, command);
    await persistDemoStore();
    const responseBody = { sortie: state.sortie, order: state.order, shipment: state.shipment };
    if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "sortie_command", 200, responseBody)) await recordDemoAudit("sortie_commanded", "sortie", { reference, command, status: state.sortie.status });
    return Response.json(responseBody);
  } catch (error) { return apiError(error, request); }
}
