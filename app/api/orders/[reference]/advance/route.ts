import { markOrder, OrderStatus } from "@/lib/domain";
import { getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { apiError, jsonBody } from "@/lib/api";
import { trustedRequestOrigin, unauthorizedUnlessAuthenticatedRole } from "@/lib/demo-auth";
import { normalizedAdvance, normalizedRepositoryEnabled, readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const originError = trustedRequestOrigin(request); if (originError) return originError;
  const unauthorized = await unauthorizedUnlessAuthenticatedRole(request, ["warehouse_operator"]); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(request.headers.get("idempotency-key"), "order_advance");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const { reference } = await params;
    const body = await jsonBody(request);
    if (normalizedRepositoryEnabled()) {
      const next = String(body.status);
      if (!(next === "picked" || next === "packed" || next === "dispatched")) throw new Error("Unsupported order transition");
      await normalizedAdvance(reference, next);
      const normalized = await readNormalizedOrder(reference, undefined, "warehouse_operator");
      if (!normalized?.state.order) throw new Error("Order not found");
      const responseBody = { order: normalized.state.order, events: normalized.state.orderEvents, tasks: normalized.state.tasks };
      if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "order_advance", 200, responseBody)) await recordDemoAudit("order_advanced", "order", { reference, status: next, adapter: "normalized" });
      return Response.json(responseBody);
    }
    const state = await hydrateDemoStore();
    if (!state.order || state.order.reference !== reference) throw new Error("Order not found");
    const next = String(body.status) as OrderStatus;
    markOrder(state, next);
    const taskIndex = { picked: 2, packed: 3, dispatched: 4 }[next as "picked" | "packed" | "dispatched"];
    if (taskIndex !== undefined) state.tasks[taskIndex].done = true;
    await persistDemoStore();
    const responseBody = { order: state.order, events: state.orderEvents, tasks: state.tasks };
    if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "order_advance", 200, responseBody)) await recordDemoAudit("order_advanced", "order", { reference, status: next });
    return Response.json(responseBody);
  } catch (error) { return apiError(error, request); }
}
