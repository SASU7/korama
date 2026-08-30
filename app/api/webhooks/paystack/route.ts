import { createHmac } from "node:crypto";
import { hydrateDemoStore, persistDemoStore, recordDemoAudit, verifyDemoPayment } from "@/lib/demo-store";
import { validatedBusinessReference } from "@/lib/api";
import { isHostedEnvironment } from "@/lib/demo-auth";
import { normalizedRepositoryEnabled, normalizedVerifyPayment, readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-paystack-signature");
    const rawBody = await request.text();
    if (rawBody.length > 128 * 1024) return Response.json({ error: "Webhook body is too large" }, { status: 413 });
    if (isHostedEnvironment() && !process.env.PAYSTACK_WEBHOOK_SECRET) return Response.json({ error: "Webhook verification is not configured" }, { status: 503 });
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? "demo-paystack-webhook-secret";
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    if (!signature || !createHmac("sha512", secret).update(rawBody).digest().equals(Buffer.from(signature, "hex"))) return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const data = (body.data ?? {}) as Record<string, unknown>;
    if (normalizedRepositoryEnabled()) {
      if (body.event !== "charge.success" || data.status !== "success") throw new Error("Only successful Paystack charge events are accepted");
      const reference = validatedBusinessReference(data.reference);
      const amount = Number(data.amount);
      const currency = String(data.currency ?? "").trim().toUpperCase();
      if (!reference || !Number.isFinite(amount) || !currency) throw new Error("Successful Paystack events must include reference, amount, and currency");
      const orderReference = reference.startsWith("PSK-DEMO-") ? reference.slice("PSK-DEMO-".length) : reference.replace(/^KOR-/, "");
      const current = await readNormalizedOrder(orderReference);
      if (!current?.state.order) throw new Error("No pending order exists");
      const result = await normalizedVerifyPayment(current.view.order.id, reference, amount, currency);
      const refreshed = await readNormalizedOrder(orderReference);
      if (!refreshed?.state.order) throw new Error("Verified order could not be read back");
      await recordDemoAudit("payment_webhook_received", "order", { reference: refreshed.state.order.reference, paymentReference: reference, amount, currency, adapter: "normalized" });
      return Response.json({ received: true, idempotent: objectValue(result, "idempotent") === true, serverSignatureVerified: signature === expected, order: refreshed.state.order });
    }
    const state = await hydrateDemoStore();
    if (!state.order) throw new Error("No pending order exists");
    const alreadyPaid = state.order.status !== "pending_payment";
    if (body.event !== "charge.success" || data.status !== "success") throw new Error("Only successful Paystack charge events are accepted");
    const reference = validatedBusinessReference(data.reference);
    const amount = Number(data.amount);
    const currency = String(data.currency ?? "").trim().toUpperCase();
    if (!reference || !Number.isFinite(amount) || !currency) throw new Error("Successful Paystack events must include reference, amount, and currency");
    const order = verifyDemoPayment(reference, amount, currency);
    await persistDemoStore();
    await recordDemoAudit("payment_webhook_received", "order", { reference: order.reference, paymentReference: reference, amount, currency });
    return Response.json({ received: true, idempotent: alreadyPaid, serverSignatureVerified: signature === expected, order });
  } catch (error) {
    const message = isHostedEnvironment() ? "Webhook rejected" : error instanceof Error ? error.message : "Unexpected webhook error";
    return Response.json({ error: message }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}

function objectValue(value: unknown, key: string) { return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined; }
