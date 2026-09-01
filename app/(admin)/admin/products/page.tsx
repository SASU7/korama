import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Identifier } from "@/components/shared/identifier";
import { OriginBadge } from "@/components/shared/origin-badge";
import { listAdminProducts } from "@/lib/supabase/catalogue-admin";
import { productImageSrc } from "@/lib/product-image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Products — Korama admin" };

export default async function AdminProductsPage() {
  const products = await listAdminProducts();
  const withoutImage = products.filter((product) => !product.imagePath).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Products" }]}
        title="Products"
        meta={
          products.length
            ? `${products.length} in the catalogue${withoutImage ? ` · ${withoutImage} without a photograph` : ""}`
            : undefined
        }
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <PackagePlus className="size-4" aria-hidden />
              New product
            </Link>
          </Button>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="No products yet"
          description="Create the first product and upload its photograph. It appears in the shop immediately."
          action={
            <Button asChild>
              <Link href="/admin/products/new">New product</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">
                  <span className="sr-only">Photograph</span>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="hidden lg:table-cell">Reference</TableHead>
                <TableHead className="hidden md:table-cell">Provenance</TableHead>
                <TableHead>Market</TableHead>
                <TableHead data-numeric>Price</TableHead>
                <TableHead data-numeric className="hidden sm:table-cell">
                  Batches
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const src = productImageSrc(product.imagePath);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="bg-muted relative block aspect-4/5 w-10 overflow-hidden rounded"
                      >
                        {src ? (
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground absolute inset-0 grid place-items-center">
                            <ImageOff className="size-3.5" aria-hidden />
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span className="text-muted-foreground block text-(length:--text-meta)">
                        {product.producer}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Identifier value={product.reference} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <OriginBadge origin={product.inventoryClass} />
                    </TableCell>
                    <TableCell>
                      <Identifier value={product.marketCode} />
                    </TableCell>
                    <TableCell data-numeric>
                      {product.priceMinor > 0 ? (
                        <Money
                          minor={product.priceMinor}
                          currency={product.currency}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell data-numeric className="hidden sm:table-cell">
                      {product.batchCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          product.purchasable
                            ? "bg-success/15 text-success border-transparent"
                            : "text-muted-foreground"
                        }
                      >
                        {product.purchasable ? "Live" : "Not purchasable"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {withoutImage > 0 && products.length > 0 && (
        <p className="text-muted-foreground mt-4 text-(length:--text-meta)">
          {withoutImage} product{withoutImage === 1 ? "" : "s"} still show the
          placeholder tile in the shop. Open one and upload a photograph to
          replace it.
        </p>
      )}
    </>
  );
}
