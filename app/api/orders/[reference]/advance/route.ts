import { apiError, jsonBody } from "@/lib/api";
import { requireAuth, trustedRequestOrigin } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import {
  getIdempotentResponse,
  recordAudit,
  saveIdempotentResponse,
} from "@/lib/persistence";
import {
  normalizedAdvance,
  readNormalizedOrder,
} from "@/lib/supabase/normalized-adapter";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  const auth = await requireAuth(["warehouse_operator"]);
  if (auth.response) return auth.response;
  try {
    const cached = await getIdempotentResponse(
      request.headers.get("idempotency-key"),
      "order_advance",
    );
    if (cached) return Response.json(cached.body, { status: cached.status });
    const { reference } = await params;
    const body = await jsonBody(request);
    const next = String(body.status);
    if (!(next === "picked" || next === "packed" || next === "dispatched"))
      throw badRequest("Unsupported order transition");
    const operatingCompanyId = auth.context.activeOperatingCompanyId;
    await normalizedAdvance(reference, next, operatingCompanyId);
    const normalized = await readNormalizedOrder(
      reference,
      undefined,
      "warehouse_operator",
      operatingCompanyId,
    );
    if (!normalized?.state.order) throw notFound("Order not found");
    const responseBody = {
      order: normalized.state.order,
      events: normalized.state.orderEvents,
      tasks: normalized.state.tasks,
    };
    if (
      await saveIdempotentResponse(
        request.headers.get("idempotency-key"),
        "order_advance",
        200,
        responseBody,
        auth.context.user.id,
      )
    )
      await recordAudit(
        "order_advanced",
        "order",
        { reference, status: next },
        auth.context.user.id,
      );
    return Response.json(responseBody);
  } catch (error) {
    return apiError(error, request);
  }
}
