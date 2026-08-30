import { allocateFefo } from "@/lib/domain";
import { getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { apiError } from "@/lib/api";
import { unauthorizedUnlessAuthenticatedRole } from "@/lib/demo-auth";

export async function POST(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const unauthorized = await unauthorizedUnlessAuthenticatedRole(_request, ["warehouse_operator"]); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(_request.headers.get("idempotency-key"), "inventory_allocate");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const { reference } = await params;
    const state = await hydrateDemoStore();
    if (!state.order || state.order.reference !== reference) throw new Error("Order not found in operator scope");
    const batch = allocateFefo(state);
    await persistDemoStore();
    const responseBody = { order: state.order, batch, task: state.tasks[1] };
    if (await saveIdempotentResponse(_request.headers.get("idempotency-key"), "inventory_allocate", 200, responseBody)) await recordDemoAudit("inventory_allocated", "order", { reference, batch: batch.batch, quantity: state.order.quantity });
    return Response.json(responseBody);
  } catch (error) { return apiError(error, _request); }
}
