import { allocateFefo } from "@/lib/domain";
import { getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { apiError } from "@/lib/api";
import { trustedRequestOrigin, unauthorizedUnlessAuthenticatedRole } from "@/lib/demo-auth";
import { normalizedAllocate, normalizedRepositoryEnabled, readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export async function POST(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const originError = trustedRequestOrigin(_request); if (originError) return originError;
  const unauthorized = await unauthorizedUnlessAuthenticatedRole(_request, ["warehouse_operator"]); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(_request.headers.get("idempotency-key"), "inventory_allocate");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const { reference } = await params;
    if (normalizedRepositoryEnabled()) {
      await normalizedAllocate(reference);
      const normalized = await readNormalizedOrder(reference, undefined, "warehouse_operator");
      if (!normalized?.state.order) throw new Error("Order not found in operator scope");
      const batch = normalized.state.batches.find((candidate) => candidate.productId === normalized.state.order?.productId && candidate.allocated > 0);
      if (!batch) throw new Error("Normalized allocation returned no allocated batch");
      const responseBody = { order: normalized.state.order, batch, task: normalized.state.tasks[1] };
      if (await saveIdempotentResponse(_request.headers.get("idempotency-key"), "inventory_allocate", 200, responseBody)) await recordDemoAudit("inventory_allocated", "order", { reference, batch: batch.batch, quantity: normalized.state.order.quantity, adapter: "normalized" });
      return Response.json(responseBody);
    }
    const state = await hydrateDemoStore();
    if (!state.order || state.order.reference !== reference) throw new Error("Order not found in operator scope");
    const batch = allocateFefo(state);
    await persistDemoStore();
    const responseBody = { order: state.order, batch, task: state.tasks[1] };
    if (await saveIdempotentResponse(_request.headers.get("idempotency-key"), "inventory_allocate", 200, responseBody)) await recordDemoAudit("inventory_allocated", "order", { reference, batch: batch.batch, quantity: state.order.quantity });
    return Response.json(responseBody);
  } catch (error) { return apiError(error, _request); }
}
