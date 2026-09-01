import { apiError } from "@/lib/api";
import { requireAuth, trustedRequestOrigin } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import {
  getIdempotentResponse,
  recordAudit,
  saveIdempotentResponse,
} from "@/lib/persistence";
import {
  normalizedAllocate,
  readNormalizedOrder,
} from "@/lib/supabase/normalized-adapter";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const originError = trustedRequestOrigin(_request);
  if (originError) return originError;
  const auth = await requireAuth(["warehouse_operator"]);
  if (auth.response) return auth.response;
  try {
    const cached = await getIdempotentResponse(
      _request.headers.get("idempotency-key"),
      "inventory_allocate",
    );
    if (cached) return Response.json(cached.body, { status: cached.status });
    const { reference } = await params;
    await normalizedAllocate(reference);
    const normalized = await readNormalizedOrder(
      reference,
      undefined,
      "warehouse_operator",
    );
    if (!normalized?.state.order)
      throw notFound("Order not found in operator scope");
    const batch = normalized.state.batches.find(
      (candidate) =>
        candidate.productId === normalized.state.order?.productId &&
        candidate.allocated > 0,
    );
    if (!batch) throw new Error("Allocation returned no reserved batch");
    const responseBody = {
      order: normalized.state.order,
      batch,
      task: normalized.state.tasks[1],
    };
    if (
      await saveIdempotentResponse(
        _request.headers.get("idempotency-key"),
        "inventory_allocate",
        200,
        responseBody,
        auth.context.user.id,
      )
    )
      await recordAudit(
        "inventory_allocated",
        "order",
        {
          reference,
          batch: batch.batch,
          quantity: normalized.state.order.quantity,
        },
        auth.context.user.id,
      );
    return Response.json(responseBody);
  } catch (error) {
    return apiError(error, _request);
  }
}
