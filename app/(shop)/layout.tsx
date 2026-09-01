import { Suspense } from "react";

import { StoreFooter } from "@/components/shop/store-footer";
import { StoreHeaderSkeleton } from "@/components/shop/store-header-skeleton";
import { StoreHeaderData } from "@/components/shop/store-header-data";

export const dynamic = "force-dynamic";

/**
 * Storefront shell. Comfortable density, inherited from the root <body>.
 * Deliberately no sidebar: a persistent nav rail is the staff console's
 * identity, and a shopper does not need one.
 *
 * The layout itself awaits nothing. Its header data (session and cart count)
 * streams inside Suspense, so a page that calls notFound() can still commit a
 * 404 — awaiting here fixed the status at 200 before the page ever ran.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={<StoreHeaderSkeleton />}>
        <StoreHeaderData />
      </Suspense>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-(--gutter) py-8">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}
