import { createHmac, timingSafeEqual } from "node:crypto";
import { validatedBusinessReference } from "@/lib/api";
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
      throw new Error("Paystack event is missing amount or currency");
    const current = await readNormalizedOrder(orderReference);
    if (!current?.state.order) throw new Error("Order not found");
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
  } catch {
    return Response.json(
      { error: "Webhook rejected" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
}

function objectValue(value: unknown, key: string) {
  return value && typeof value === "object" && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}
