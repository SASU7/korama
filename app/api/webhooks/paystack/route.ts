import { createHmac, timingSafeEqual } from "node:crypto";
import { apiError, validatedBusinessReference } from "@/lib/api";
import { badRequest, notFound } from "@/lib/errors";
import { recordAudit } from "@/lib/persistence";
import { paystackSecret } from "@/lib/paystack";
import {
  normalizedVerifyPayment,
  readNormalizedOrder,
} from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  try {
    const secret = paystackSecret();
    const signature = request.headers.get("x-paystack-signature") ?? "";
    const rawBody = await request.text();
    if (rawBody.length > 128 * 1024)
      return Response.json(
        { error: "Webhook body is too large" },
        { status: 413 },
      );
    const expected = createHmac("sha512", secret).update(rawBody).digest();
    const received = /^[a-f0-9]{128}$/i.test(signature)
      ? Buffer.from(signature, "hex")
      : Buffer.alloc(0);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      return Response.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    const body = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        status?: string;
        reference?: unknown;
        amount?: unknown;
        currency?: unknown;
      };
    };
    if (body.event !== "charge.success" || body.data?.status !== "success")
      return Response.json({ received: true, ignored: true });
    const reference = validatedBusinessReference(body.data.reference);
    const orderReference = reference.replace(/^KOR-/, "");
    const amount = Number(body.data.amount);
    const currency = String(body.data.currency ?? "")
      .trim()
      .toUpperCase();
    if (!Number.isFinite(amount) || !currency)
      throw badRequest("Paystack event is missing amount or currency");
    const current = await readNormalizedOrder(orderReference);
    if (!current?.state.order) throw notFound("Order not found");
    const result = await normalizedVerifyPayment(
      current.view.order.id,
      reference,
      amount,
      currency,
    );
    await recordAudit("payment_webhook_received", "order", {
      reference: orderReference,
      paymentReference: reference,
      amount,
      currency,
    });
    return Response.json({
      received: true,
      idempotent: objectValue(result, "idempotent") === true,
    });
  } catch (error) {
    // Every failure used to answer 400 with nothing logged, so Paystack gave up
    // retrying and left no trace of why. apiError logs the cause and answers
    // 4xx only for an event that can never succeed — our own faults return 5xx,
    // which Paystack retries.
    return apiError(error, request);
  }
}

function objectValue(value: unknown, key: string) {
  return value && typeof value === "object" && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}
