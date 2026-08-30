import { calculateQuote, getProduct, normalizeQuantity } from "@/lib/domain";
import { getIdempotentResponse, hydrateDemoStore, persistDemoStore, recordDemoAudit, saveIdempotentResponse } from "@/lib/demo-store";
import { apiError, jsonBody } from "@/lib/api";
import { trustedRequestOrigin, unauthorizedUnlessSession } from "@/lib/demo-auth";
import { normalizedQuote, normalizedRepositoryEnabled } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request); if (originError) return originError;
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const cached = await getIdempotentResponse(request.headers.get("idempotency-key"), "cart_quote");
    if (cached) return Response.json(cached.body, { status: cached.status });
    const body = await jsonBody(request);
    const productId = String(body.productId ?? "shea-balm");
    const quantity = normalizeQuantity(body.quantity);
    if (normalizedRepositoryEnabled()) {
      const responseBody = await normalizedQuote(productId, quantity);
      if (await saveIdempotentResponse(request.headers.get("idempotency-key"), "cart_quote", 200, responseBody)) await recordDemoAudit("cart_quoted", "cart", { productId, quantity, adapter: "normalized" });
      return Response.json(responseBody);
    }
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
