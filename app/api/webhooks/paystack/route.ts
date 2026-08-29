import { createHmac } from "node:crypto";
import { verifyDemoPayment } from "@/lib/demo-store";
import { demoStore } from "@/lib/demo-store";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-paystack-signature");
    const rawBody = await request.text();
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? "demo-paystack-webhook-secret";
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    if (!signature || !createHmac("sha512", secret).update(rawBody).digest().equals(Buffer.from(signature, "hex"))) return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const data = (body.data ?? {}) as Record<string, unknown>;
    const state = demoStore();
    if (!state.order) throw new Error("No pending order exists");
    const alreadyPaid = state.order.status !== "pending_payment";
    if (body.event !== "charge.success" || data.status !== "success") throw new Error("Only successful Paystack charge events are accepted");
    const order = verifyDemoPayment(String(data.reference ?? "PSK-DEMO"), Number(data.amount ?? state.order.totalMinor), String(data.currency ?? state.order.currency));
    return Response.json({ received: true, idempotent: alreadyPaid, serverSignatureVerified: signature === expected, order });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unexpected webhook error" }, { status: 400 }); }
}
