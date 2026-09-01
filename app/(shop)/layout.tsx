import { StoreHeader } from "@/components/shop/store-header";
import { StoreFooter } from "@/components/shop/store-footer";
import { authContext } from "@/lib/auth";
import { readCart } from "@/lib/supabase/cart";

export const dynamic = "force-dynamic";

/**
 * Storefront shell. Comfortable density, inherited from the root <body>.
 * Deliberately no sidebar: a persistent nav rail is the staff console's
 * identity, and a shopper does not need one.
 */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [auth, cart] = await Promise.all([authContext(), readCart()]);
  const displayName =
    auth?.user.user_metadata?.full_name ||
    auth?.user.user_metadata?.name ||
    auth?.user.email;

  return (
    <div className="flex min-h-svh flex-col">
      <StoreHeader
        authenticated={Boolean(auth)}
        displayName={displayName}
        roles={auth?.roles ?? []}
        activeRole={auth?.activeRole ?? "consumer"}
        cartCount={cart.lines.reduce((sum, line) => sum + line.quantity, 0)}
      />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-(--gutter) py-8">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}
