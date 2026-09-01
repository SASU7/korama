import "server-only";

import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin-client";
import { authContext } from "@/lib/auth";
import { CART_COOKIE, CART_COOKIE_MAX_AGE, mergeCarts, parseCart, serializeCart } from "@/lib/cart-cookie";
import { normalizeCart, type CartLine } from "@/lib/domain";
import { GHANA_MARKET_ID, GHANA_OPERATING_COMPANY_ID, productUuidForSlug, slugForProductUuid } from "@/lib/supabase/normalized-adapter";

/**
 * Cart storage.
 *
 * Signed in  -> rows in carts / cart_items, so it survives a device change.
 * Anonymous  -> an httpOnly cookie, because carts.profile_id is NOT NULL.
 *
 * Reads go through the service-role client, which also sidesteps the fact that
 * cart_items has no delete policy and no delete grant for `authenticated`.
 * Every screen sees one CartView regardless of which store backs it.
 */
export type CartView = { lines: CartLine[]; persisted: boolean };

async function openCartId(profileId: string) {
  const client = adminClient();
  const { data: existing } = await client
    .from("carts")
    .select("id")
    .eq("profile_id", profileId)
    .eq("market_id", GHANA_MARKET_ID)
    .eq("operating_company_id", GHANA_OPERATING_COMPANY_ID)
    .eq("status", "open")
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await client
    .from("carts")
    .insert({
      profile_id: profileId,
      status: "open",
      market_id: GHANA_MARKET_ID,
      operating_company_id: GHANA_OPERATING_COMPANY_ID,
    })
    .select("id")
    .single();
  if (error) throw new Error(`cart create failed: ${error.message}`);
  return data.id;
}

async function readProfileCart(profileId: string): Promise<CartLine[]> {
  const client = adminClient();
  const cartId = await openCartId(profileId);
  const { data } = await client
    .from("cart_items")
    .select("product_id, quantity")
    .eq("cart_id", cartId)
    .order("created_at");
  const resolved = await Promise.all(
    (data ?? []).map(async (row) => ({
      slug: await slugForProductUuid(row.product_id),
      quantity: row.quantity,
    })),
  );
  return resolved.flatMap((row) =>
    row.slug ? [{ productId: row.slug, quantity: row.quantity }] : [],
  );
}

async function writeProfileCart(profileId: string, lines: CartLine[]) {
  const client = adminClient();
  const cartId = await openCartId(profileId);
  await client.from("cart_items").delete().eq("cart_id", cartId);
  if (!lines.length) return;
  const rows = await Promise.all(
    lines.map(async (line) => ({
      cart_id: cartId,
      product_id: await productUuidForSlug(line.productId),
      quantity: line.quantity,
    })),
  );
  const { error } = await client
    .from("cart_items")
    .insert(rows.filter((row) => row.product_id) as { cart_id: string; product_id: string; quantity: number }[]);
  if (error) throw new Error(`cart write failed: ${error.message}`);
}

export async function readCart(): Promise<CartView> {
  const auth = await authContext();
  if (auth) return { lines: await readProfileCart(auth.user.id), persisted: true };
  const jar = await cookies();
  return { lines: parseCart(jar.get(CART_COOKIE)?.value), persisted: false };
}

export async function writeCart(lines: CartLine[]) {
  const auth = await authContext();
  if (auth) {
    await writeProfileCart(auth.user.id, lines);
    return;
  }
  const jar = await cookies();
  if (!lines.length) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, serializeCart(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

/** Called from the auth callback once a profile exists. */
export async function mergeCookieCartIntoProfileCart(profileId: string) {
  const jar = await cookies();
  const local = parseCart(jar.get(CART_COOKIE)?.value);
  if (!local.length) return;
  const merged = mergeCarts(local, await readProfileCart(profileId));
  await writeProfileCart(profileId, merged);
  jar.delete(CART_COOKIE);
}

export async function setCartLine(productId: string, quantity: number) {
  const { lines } = await readCart();
  const next = lines.filter((line) => line.productId !== productId);
  if (quantity > 0) next.push({ productId, quantity });
  await writeCart(next.length ? normalizeCart(next) : []);
}

export async function addToCart(productId: string, quantity = 1) {
  const { lines } = await readCart();
  const existing = lines.find((line) => line.productId === productId);
  const next = existing
    ? lines.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.min(line.quantity + quantity, 10) }
          : line,
      )
    : [...lines, { productId, quantity }];
  await writeCart(normalizeCart(next));
}

export async function clearCart() {
  await writeCart([]);
}
