import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { requireConsumer } from "@/lib/auth-guards";
import { readCart } from "@/lib/supabase/cart";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";
import { calculateQuote, cartWeightGrams } from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Checkout — Korama" };

export default async function CheckoutPage() {
  const auth = await requireConsumer("/checkout");
  const [{ lines }, state] = await Promise.all([readCart(), readNormalizedState()]);

  const known = lines.filter((line) =>
    state.products.some((product) => product.id === line.productId),
  );
  // Nothing to pay for; the cart page owns the empty state.
  if (!known.length) redirect("/cart");

  const quote = calculateQuote(state, known);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]}
        title="Checkout"
        meta={`${quote.itemCount} ${quote.itemCount === 1 ? "item" : "items"}`}
      />
      <CheckoutForm
        email={auth.user.email ?? ""}
        cart={known}
        quote={quote}
        weightGrams={cartWeightGrams(state, known)}
      />
    </>
  );
}
