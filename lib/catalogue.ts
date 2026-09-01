import type { InventoryClass, MarketCode, Product } from "@/lib/domain";

export type CatalogueQuery = {
  market: MarketCode;
  categories: string[];
  origin: InventoryClass | "all";
  inStockOnly: boolean;
  q: string;
};

/** Parse searchParams into a query. Client-safe: no I/O, no server imports. */
export function parseCatalogueQuery(
  params: Record<string, string | string[] | undefined>,
): CatalogueQuery {
  const list = (value: string | string[] | undefined) =>
    value === undefined ? [] : Array.isArray(value) ? value : [value];
  const single = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const origin = single(params.origin);
  return {
    market: single(params.market) === "GH" ? "GH" : "NG",
    categories: list(params.category),
    origin:
      origin === "ghana_origin_export" || origin === "direct_import"
        ? origin
        : "all",
    inStockOnly: single(params.stock) === "in",
    q: (single(params.q) ?? "").trim(),
  };
}

/** A listing with no available units reads "0 units" in its stock label. */
function inStock(product: Product) {
  return !/\b0 units\b/.test(product.stockLabel);
}

export function filterCatalogue(products: Product[], query: CatalogueQuery) {
  const needle = query.q.toLowerCase();
  return products.filter((product) => {
    if (product.market !== query.market) return false;
    if (query.categories.length && !query.categories.includes(product.category))
      return false;
    if (query.origin !== "all" && product.origin !== query.origin) return false;
    if (query.inStockOnly && !inStock(product)) return false;
    if (
      needle &&
      !`${product.name} ${product.producer} ${product.description}`
        .toLowerCase()
        .includes(needle)
    )
      return false;
    return true;
  });
}

/** Category counts for the current market, ignoring the category filter. */
export function categoryFacets(products: Product[], query: CatalogueQuery) {
  const base = filterCatalogue(products, { ...query, categories: [] });
  return base.reduce<Record<string, number>>((counts, product) => {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
    return counts;
  }, {});
}
