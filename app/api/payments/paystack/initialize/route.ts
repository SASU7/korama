import { randomUUID } from "node:crypto";
import { apiError, jsonBody } from "@/lib/api";
import { requireAuth, trustedRequestOrigin } from "@/lib/auth";
import { normalizeQuantity, validateDeliveryAddress } from "@/lib/domain";
import { paystackSecret } from "@/lib/paystack";
import {
  getIdempotentResponse,
  recordAudit,
  saveIdempotentResponse,
} from "@/lib/persistence";
import { normalizedCreateOrder } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  const auth = await requireAuth(["consumer"]);
  if (auth.response) return auth.response;
  try {
    const secret = paystackSecret();
    const cached = await getIdempotentResponse(
      request.headers.get("idempotency-key"),
      "payment_initialize",
    );
    if (cached) return Response.json(cached.body, { status: cached.status });
    const body = await jsonBody(request);
    const { state } = await normalizedCreateOrder(
      auth.context.user.id,
      `KOR-NG-${Date.now()}-${randomUUID().slice(0, 8)}`,
      String(body.productId ?? "shea-balm"),
      normalizeQuantity(body.quantity),
      validateDeliveryAddress(body.address),
    );
    if (!state.order) throw new Error("Order creation returned no order");
    const callbackUrl = new URL("/checkout/complete", request.url).toString();
    const upstream = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amount: state.order.totalMinor,
          currency: state.order.currency,
          email: auth.context.user.email,
          reference: `KOR-${state.order.reference}`,
          callback_url: callbackUrl,
          metadata: { order_reference: state.order.reference },
        }),
      },
    );
    const payload = (await upstream.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    };
    if (
      !upstream.ok ||
      !payload.status ||
      !payload.data?.reference ||
      !payload.data.authorization_url
    )
      throw new Error(payload.message ?? "Paystack initialization failed");
    const responseBody = {
      authorizationUrl: payload.data.authorization_url,
      accessCode: payload.data.access_code,
      reference: payload.data.reference,
      order: state.order,
      provider: "paystack",
    };
    if (
      await saveIdempotentResponse(
        request.headers.get("idempotency-key"),
        "payment_initialize",
        200,
        responseBody,
        auth.context.user.id,
      )
    ) {
      await recordAudit(
        "payment_initialized",
        "order",
        { reference: state.order.reference, provider: "paystack" },
        auth.context.user.id,
      );
    }
    return Response.json(responseBody);
  } catch (error) {
    return apiError(error, request);
  }
}
