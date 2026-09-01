import { apiError, jsonBody } from "@/lib/api";
import { normalizeQuantity } from "@/lib/domain";
import { trustedRequestOrigin } from "@/lib/auth";
import { normalizedQuote } from "@/lib/supabase/normalized-adapter";

export async function POST(request: Request) {
  const originError = trustedRequestOrigin(request);
  if (originError) return originError;
  try {
    const body = await jsonBody(request);
    const productId = String(body.productId ?? "shea-balm");
    const quantity = normalizeQuantity(body.quantity);
    return Response.json(await normalizedQuote(productId, quantity));
  } catch (error) {
    return apiError(error, request);
  }
}
