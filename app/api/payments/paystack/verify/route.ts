import { apiError, validatedBusinessReference } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/persistence";
import { paystackSecret } from "@/lib/paystack";
import {
  normalizedVerifyPayment,
  readNormalizedOrder,
} from "@/lib/supabase/normalized-adapter";

export async function GET(request: Request) {
  const auth = await requireAuth(["consumer"]);
  if (auth.response) return auth.response;
  try {
    const secret = paystackSecret();
    const reference = validatedBusinessReference(
      new URL(request.url).searchParams.get("reference"),
    );
    const orderReference = reference.replace(/^KOR-/, "");
    const current = await readNormalizedOrder(
      orderReference,
      auth.context.user.id,
      "consumer",
    );
    if (!current?.state.order) throw new Error("Order not found");
    const upstream = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${secret}` },
      },
    );
    const payload = (await upstream.json()) as {
      status?: boolean;
      message?: string;
      data?: { status?: string; amount?: number; currency?: string };
    };
    if (!upstream.ok || !payload.status || payload.data?.status !== "success")
      throw new Error(payload.message ?? "Payment has not completed");
    const amount = Number(payload.data.amount ?? 0);
    const currency = String(payload.data.currency ?? "").toUpperCase();
    await normalizedVerifyPayment(
      current.view.order.id,
      reference,
      amount,
      currency,
    );
    const refreshed = await readNormalizedOrder(
      orderReference,
      auth.context.user.id,
      "consumer",
    );
    if (!refreshed?.state.order)
      throw new Error("Verified order could not be loaded");
    await recordAudit(
      "payment_verified",
      "order",
      {
        reference: orderReference,
        paymentReference: reference,
        amount,
        currency,
      },
      auth.context.user.id,
    );
    return Response.json({
      verified: true,
      order: refreshed.state.order,
      serverChecked: true,
    });
  } catch (error) {
    return apiError(error, request);
  }
}
