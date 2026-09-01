import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductCard } from "@/components/shop/product-card";
import { CatalogueFilters } from "@/components/shop/catalogue-filters";
import { MarketSwitcher } from "@/components/shop/market-switcher";
import {
  categoryFacets,
  filterCatalogue,
  parseCatalogueQuery,
} from "@/lib/catalogue";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop — Korama",
  description:
    "Ghana-origin and directly imported goods, with producer and provenance on every listing.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseCatalogueQuery(params);
  const { products } = await readNormalizedState();

  const visible = filterCatalogue(products, query);
  const facets = categoryFacets(products, query);
  const currency = query.market === "NG" ? "NGN" : "GHS";
  const marketName = query.market === "NG" ? "Nigeria" : "Ghana";
  const activeFilters =
    query.categories.length +
    (query.origin !== "all" ? 1 : 0) +
    (query.inStockOnly ? 1 : 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Shop" }]}
        title="Shop"
        meta={`${visible.length} ${visible.length === 1 ? "product" : "products"} · ${marketName} · prices in ${currency}`}
        actions={
          <>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  Filters
                  {activeFilters > 0 && (
                    <Badge className="ml-1 size-4 justify-center p-0 text-[0.625rem]">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <CatalogueFilters facets={facets} />
                </div>
              </SheetContent>
            </Sheet>
            <MarketSwitcher market={query.market} />
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <CatalogueFilters facets={facets} />
          </div>
        </aside>

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 3}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PackageSearch}
            title="No products match these filters"
            description={`${marketName} has ${products.filter((p) => p.market === query.market).length} listings. Clear the filters or search for something else.`}
            action={
              <Button variant="outline" asChild>
                <Link href={`/shop?market=${query.market}`}>Clear filters</Link>
              </Button>
            }
          />
        )}
      </div>
    </>
  );
}
