import { apiError, jsonBody } from "@/lib/api";
import { requireAuth, trustedRequestOrigin } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import {
  getIdempotentResponse,
  recordAudit,
  saveIdempotentResponse,
} from "@/lib/persistence";
import {
  normalizedCommand,
  readNormalizedOrder,
} from "@/lib/supabase/normalized-adapter";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  const auth = await requireAuth(["safety_officer"]);
  if (auth.response) return auth.response;
  try {
    const cached = await getIdempotentResponse(
      request.headers.get("idempotency-key"),
      "sortie_command",
    );
    if (cached) return Response.json(cached.body, { status: cached.status });
    const { reference } = await params;
    const body = await jsonBody(request);
    const command = String(body.command);
    await normalizedCommand(reference, command);
    const normalized = await readNormalizedOrder(
      reference,
      undefined,
      "safety_officer",
    );
    if (!normalized?.state.order) throw notFound("Shipment not found");
    const responseBody = {
      sortie: normalized.state.sortie,
      order: normalized.state.order,
      shipment: normalized.state.shipment,
    };
    if (
      await saveIdempotentResponse(
        request.headers.get("idempotency-key"),
        "sortie_command",
        200,
        responseBody,
        auth.context.user.id,
      )
    )
      await recordAudit(
        "sortie_commanded",
        "sortie",
        { reference, command, status: normalized.state.sortie.status },
        auth.context.user.id,
      );
    return Response.json(responseBody);
  } catch (error) {
    return apiError(error, request);
  }
}
