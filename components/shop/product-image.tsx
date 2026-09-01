"use client";

import { useState } from "react";
import Image from "next/image";
import { Home, Shirt, Sparkles, Wheat } from "lucide-react";
import { productImageSrc, BLUR_DATA_URL } from "@/lib/product-image";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/domain";

const CATEGORY_ICON = {
  Beauty: Sparkles,
  Fashion: Shirt,
  Pantry: Wheat,
  "Home & craft": Home,
} as const;

/**
 * Catalogue imagery, with an honest fallback.
 *
 * When a photo is missing the tile shows the category mark and the product
 * initial on a flat muted ground at the same aspect ratio — never a decorative
 * gradient standing in for a photograph, and never a layout shift.
 */
export function ProductImage({
  product,
  sizes,
  priority = false,
  className,
}: {
  product: Product;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const first = product.images?.[0];
  const src = productImageSrc(first?.path);
  const [failed, setFailed] = useState(false);
  const Icon = CATEGORY_ICON[product.category] ?? Home;

  return (
    <div
      className={cn(
        "bg-muted relative aspect-4/5 w-full overflow-hidden rounded-lg",
        className,
      )}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={first?.alt ?? product.name}
          fill
          sizes={sizes}
          priority={priority}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2"
          role="img"
          aria-label={`${product.name} — no photograph available`}
        >
          <Icon className="size-6 opacity-50" aria-hidden />
          <span className="font-display text-2xl opacity-30" aria-hidden>
            {product.name.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );
}
