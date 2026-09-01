import Link from "next/link";
import { ProductImage } from "@/components/shop/product-image";
import { OriginBadge } from "@/components/shared/origin-badge";
import { Money } from "@/components/shared/money";
import type { Product } from "@/lib/domain";

const GRID_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/shop/${product.id}`}
      className="group focus-visible:ring-ring flex flex-col gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <ProductImage
        product={product}
        sizes={GRID_SIZES}
        priority={priority}
        className="transition-[box-shadow] group-hover:shadow-(--shadow-card)"
      />
      <div className="flex flex-col gap-1">
        <OriginBadge origin={product.origin} className="self-start" />
        <h3 className="font-display text-[1rem] leading-snug font-medium tracking-[-0.005em]">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-(length:--text-meta)">
          {product.producer}
        </p>
        <p className="mt-1">
          {product.purchasable && product.priceMinor > 0 ? (
            <Money
              minor={product.priceMinor}
              currency={product.currency}
              className="text-[0.9375rem] font-medium"
            />
          ) : (
            <span className="text-muted-foreground text-(length:--text-meta)">
              Not yet available
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
