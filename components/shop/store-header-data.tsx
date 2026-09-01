import { StoreHeader } from "@/components/shop/store-header";
import { authContext } from "@/lib/auth";
import { readCart } from "@/lib/supabase/cart";

/** The async half of the storefront header, streamed inside Suspense. */
export async function StoreHeaderData() {
  const [auth, cart] = await Promise.all([authContext(), readCart()]);
  const displayName =
    auth?.user.user_metadata?.full_name ||
    auth?.user.user_metadata?.name ||
    auth?.user.email;

  return (
    <StoreHeader
      authenticated={Boolean(auth)}
      displayName={displayName}
      roles={auth?.roles ?? []}
      activeRole={auth?.activeRole ?? "consumer"}
      cartCount={cart.lines.reduce((sum, line) => sum + line.quantity, 0)}
    />
  );
}
