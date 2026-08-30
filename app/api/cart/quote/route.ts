import { calculateQuote, getProduct, normalizeQuantity } from "@/lib/domain";
import { demoStore } from "@/lib/demo-store";
import { apiError, jsonBody } from "@/lib/api";
import { unauthorizedUnlessSession } from "@/lib/demo-auth";

export async function POST(request: Request) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  try {
    const body = await jsonBody(request);
    const productId = String(body.productId ?? "shea-balm");
    const quantity = normalizeQuantity(body.quantity);
    const state = demoStore();
    const product = getProduct(state, productId);
    if (!product.purchasable) throw new Error("This listing is roadmap-only");
    state.cart = [{ productId, quantity }];
    return Response.json({ product, quote: calculateQuote(state, productId, quantity) });
  } catch (error) { return apiError(error, request); }
}
