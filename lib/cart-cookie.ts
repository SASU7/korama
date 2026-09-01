import type { CartLine } from "./domain.ts";
import { MAX_CART_LINES, MAX_CART_QUANTITY, MAX_LINE_QUANTITY } from "./domain.ts";

export const CART_COOKIE = "korama_cart";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 8;
export const CART_COOKIE_VERSION = 2;

/**
 * Anonymous carts live in an httpOnly cookie because carts.profile_id is NOT
 * NULL, so a server row needs a user. On sign-in the cookie merges into the
 * profile cart and is cleared.
 */
export function serializeCart(lines: CartLine[]) {
  return JSON.stringify({
    version: CART_COOKIE_VERSION,
    market: "GH",
    lines: lines.map((line) => [line.productId, line.quantity]),
  });
}

export function parseCart(value: string | undefined): CartLine[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const payload = parsed as { version?: unknown; market?: unknown; lines?: unknown };
    // Deliberately reject the old anonymous NGN array shape. A stale cart can
    // be browsed again, but it may never cross into Ghana checkout.
    if (payload.version !== CART_COOKIE_VERSION || payload.market !== "GH" || !Array.isArray(payload.lines)) return [];
    const lines: CartLine[] = [];
    for (const entry of payload.lines.slice(0, MAX_CART_LINES)) {
      if (!Array.isArray(entry)) continue;
      const productId = String(entry[0] ?? "").trim();
      const quantity = Number(entry[1]);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) continue;
      if (lines.some((line) => line.productId === productId)) continue;
      lines.push({ productId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) });
    }
    // A tampered cookie must not be able to exceed the cart bounds.
    let running = 0;
    return lines.filter((line) => {
      running += line.quantity;
      return running <= MAX_CART_QUANTITY;
    });
  } catch {
    return [];
  }
}

/**
 * Merge on sign-in takes the larger of the two quantities, never the sum, so
 * signing in twice cannot multiply a cart.
 */
export function mergeCarts(local: CartLine[], server: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const line of [...server, ...local]) {
    merged.set(
      line.productId,
      Math.min(Math.max(merged.get(line.productId) ?? 0, line.quantity), MAX_LINE_QUANTITY),
    );
  }
  const lines = [...merged].map(([productId, quantity]) => ({ productId, quantity }));
  let running = 0;
  return lines.slice(0, MAX_CART_LINES).filter((line) => {
    running += line.quantity;
    return running <= MAX_CART_QUANTITY;
  });
}
