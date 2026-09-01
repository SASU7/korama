"use server";

import { revalidatePath } from "next/cache";
import {
  addToCart as addLine,
  clearCart as clear,
  setCartLine,
} from "@/lib/supabase/cart";

/**
 * Cart mutations. Server actions rather than a client cart context, because
 * the cart feeds checkout and checkout is server-validated — a client-held
 * cart would be a second, divergent source of truth for money.
 */
export type CartActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): CartActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "The cart could not be updated",
  };
}

function revalidate() {
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

export async function addToCartAction(
  productId: string,
  quantity = 1,
): Promise<CartActionResult> {
  try {
    await addLine(productId, quantity);
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Form-post variant, so "Add to cart" is a real submit button and works with
 * JavaScript disabled. Cookies can only be written from a server action or
 * route handler — never during a page render — which is why the cart page
 * does not accept an ?add= parameter.
 */
export async function addToCartFormAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  if (productId) await addLine(productId, 1);
  revalidate();
}

export async function setCartQuantityAction(
  productId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    await setCartLine(productId, quantity);
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function removeCartLineAction(
  productId: string,
): Promise<CartActionResult> {
  return setCartQuantityAction(productId, 0);
}

export async function clearCartAction(): Promise<CartActionResult> {
  try {
    await clear();
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
