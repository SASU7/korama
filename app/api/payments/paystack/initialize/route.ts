import { createDemoOrder, getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { normalizeQuantity, validateDeliveryAddress } from "@/lib/domain";
import { apiError, jsonBody } from "@/lib/api";
import { unauthorizedUnlessSession } from "@/lib/demo-auth";

export async function POST(request: Request) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(request.headers.get("idempotency-key"), "payment_initialize");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const body = await jsonBody(request);
    await hydrateDemoStore();
    const order = createDemoOrder(String(body.productId ?? "shea-balm"), normalizeQuantity(body.quantity), validateDeliveryAddress(body.address));
    await persistDemoStore();
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (secret) {
      const upstream = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ amount: order.totalMinor, currency: order.currency, email: String(body.email ?? process.env.PAYSTACK_TEST_EMAIL ?? "investor-demo@example.com"), reference: `KOR-${order.reference}` }) });
      const payload = await upstream.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string; reference?: string } };
      if (!upstream.ok || !payload.status || !payload.data?.reference) throw new Error(payload.message ?? "Paystack initialization failed");
      const responseBody = { authorizationUrl: payload.data.authorization_url, accessCode: payload.data.access_code, reference: payload.data.reference, order, testMode: true, provider: "paystack" };
      if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "payment_initialize", 200, responseBody)) await recordDemoAudit("payment_initialized", "order", { reference: order.reference, provider: "paystack" });
      return Response.json(responseBody);
    }
    const responseBody = { authorizationUrl: "https://checkout.paystack.com/demo", accessCode: "DEMO_TEST_MODE", reference: `PSK-DEMO-${order.reference}`, order, testMode: true };
    if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "payment_initialize", 200, responseBody)) await recordDemoAudit("payment_initialized", "order", { reference: order.reference, provider: "deterministic" });
    return Response.json(responseBody);
  } catch (error) { return apiError(error, request); }
}
