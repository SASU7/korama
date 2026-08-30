import { randomUUID } from "node:crypto";
import { createDemoOrder, getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { normalizeQuantity, validateDeliveryAddress } from "@/lib/domain";
import { apiError, jsonBody, validatedEmail } from "@/lib/api";
import { authenticatedUserId, trustedRequestOrigin, unauthorizedUnlessSession } from "@/lib/demo-auth";
import { normalizedCreateOrder, normalizedRepositoryEnabled } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request); if (originError) return originError;
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(request.headers.get("idempotency-key"), "payment_initialize");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const body = await jsonBody(request);
    const customerEmail = validatedEmail(body.email, process.env.PAYSTACK_TEST_EMAIL ?? "investor-demo@example.com");
    if (normalizedRepositoryEnabled()) {
      const profileId = await authenticatedUserId();
      if (!profileId) throw new Error("A verified Supabase identity is required to create an order");
      const productId = String(body.productId ?? "shea-balm");
      const quantity = normalizeQuantity(body.quantity);
      const address = validateDeliveryAddress(body.address);
      const { state } = await normalizedCreateOrder(profileId, `KOR-NG-${Date.now()}-${randomUUID().slice(0, 8)}`, productId, quantity, address);
      if (!state.order) throw new Error("Normalized order creation returned no order");
      const order = state.order;
      const providerReference = `PSK-DEMO-${order.reference}`;
      if (process.env.PAYSTACK_SECRET_KEY) {
        const upstream = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ amount: order.totalMinor, currency: order.currency, email: customerEmail, reference: `KOR-${order.reference}` }) });
        const payload = await upstream.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string; reference?: string } };
        if (!upstream.ok || !payload.status || !payload.data?.reference) throw new Error(payload.message ?? "Paystack initialization failed");
        const responseBody = { authorizationUrl: payload.data.authorization_url, accessCode: payload.data.access_code, reference: payload.data.reference, order, testMode: true, provider: "paystack" };
        if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "payment_initialize", 200, responseBody)) await recordDemoAudit("payment_initialized", "order", { reference: order.reference, provider: "paystack", adapter: "normalized" });
        return Response.json(responseBody);
      }
      const responseBody = { authorizationUrl: "https://checkout.paystack.com/demo", accessCode: "DEMO_TEST_MODE", reference: providerReference, order, testMode: true };
      if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "payment_initialize", 200, responseBody)) await recordDemoAudit("payment_initialized", "order", { reference: order.reference, provider: "deterministic", adapter: "normalized" });
      return Response.json(responseBody);
    }
    await hydrateDemoStore();
    const order = createDemoOrder(String(body.productId ?? "shea-balm"), normalizeQuantity(body.quantity), validateDeliveryAddress(body.address));
    await persistDemoStore();
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (secret) {
      const upstream = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ amount: order.totalMinor, currency: order.currency, email: customerEmail, reference: `KOR-${order.reference}` }) });
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
