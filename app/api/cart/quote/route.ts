import { apiError, jsonBody } from "@/lib/api";
import { normalizeCart, normalizeQuantity } from "@/lib/domain";
import { trustedRequestOrigin } from "@/lib/auth";
import { normalizedQuote } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  try {
    const body = await jsonBody(request);
    // Accepts { lines: [...] } and the legacy { productId, quantity } shape.
    // The legacy branch goes when nothing sends it any more.
    const cart = Array.isArray(body.lines)
      ? normalizeCart(body.lines)
      : normalizeCart([
          {
            productId: String(body.productId ?? "shea-balm"),
            quantity: normalizeQuantity(body.quantity),
          },
        ]);
    return Response.json(await normalizedQuote(cart));
  } catch (error) {
    return apiError(error, request);
  }
}
