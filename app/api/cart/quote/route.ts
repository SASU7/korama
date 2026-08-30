import { calculateQuote, getProduct, normalizeQuantity } from "@/lib/domain";
import { getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { apiError, jsonBody } from "@/lib/api";
import { unauthorizedUnlessSession } from "@/lib/demo-auth";

export async function POST(request: Request) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(request.headers.get("idempotency-key"), "cart_quote");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const body = await jsonBody(request);
    const productId = String(body.productId ?? "shea-balm");
    const quantity = normalizeQuantity(body.quantity);
    const state = await hydrateDemoStore();
    const product = getProduct(state, productId);
    if (!product.purchasable) throw new Error("This listing is roadmap-only");
    state.cart = [{ productId, quantity }];
    await persistDemoStore();
    const responseBody = { product, quote: calculateQuote(state, productId, quantity) };
    if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "cart_quote", 200, responseBody)) await recordDemoAudit("cart_quoted", "cart", { productId, quantity });
    return Response.json(responseBody);
  } catch (error) { return apiError(error, request); }
}
