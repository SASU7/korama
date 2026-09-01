import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Money } from "@/components/shared/money";
import { Identifier } from "@/components/shared/identifier";
import { OriginBadge } from "@/components/shared/origin-badge";
import { ProductImage } from "@/components/shop/product-image";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { productImageSrc } from "@/lib/product-image";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";
import { readMarkets } from "@/lib/supabase/domain-markets";

export const dynamic = "force-dynamic";

const DETAIL_SIZES = "(max-width: 1024px) 100vw, 560px";

async function findProduct(slug: string) {
  const { products } = await readNormalizedState();
  return products.find((product) => product.id === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await findProduct((await params).slug);
  if (!product) return { title: "Product not found — Korama" };
  const image = productImageSrc(product.images?.[0]?.path);
  return {
    title: `${product.name} — Korama`,
    description: product.description,
    openGraph: image ? { images: [{ url: image }] } : undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await findProduct(slug);
  if (!product) notFound();

  const markets = await readMarkets();
  const marketCode = product.market;
  const market = markets.find((m) => m.code === marketCode);
  const checkoutEnabled = market?.checkoutEnabled ?? false;
  const roadmap = product.origin === "marketplace_future";

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Shop", href: `/shop?market=${marketCode}` },
          {
            label: product.category,
            href: `/shop?market=${marketCode}&category=${encodeURIComponent(product.category)}`,
          },
          { label: product.name },
        ]}
        title={product.name}
        meta={product.producer}
      />

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <ProductImage product={product} sizes={DETAIL_SIZES} priority />

        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3">
            <OriginBadge origin={product.origin} className="self-start" />
            {product.purchasable && product.priceMinor > 0 ? (
              <Money
                minor={product.priceMinor}
                currency={product.currency}
                className="text-2xl font-medium"
              />
            ) : (
              <p className="text-muted-foreground">Not yet available</p>
            )}
            <p className="text-(length:--text-body) leading-relaxed">
              {product.description}
            </p>
          </div>

          <Separator />

          <dl className="flex flex-col gap-3 text-(length:--text-meta)">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Fulfilment</dt>
              <dd>{product.stockLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Batch</dt>
              <dd>
                <Identifier value={product.batch} label="Batch" />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Expiry</dt>
              <dd>
                <Identifier value={product.expiry} label="Expiry" />
              </dd>
            </div>
          </dl>

          {roadmap ? (
            <Alert>
              <AlertDescription>
                This is a roadmap listing. Third-party seller settlement
                isn&rsquo;t enabled in this prototype, so it can&rsquo;t be
                bought.
              </AlertDescription>
            </Alert>
          ) : !checkoutEnabled ? (
            <Alert>
              <AlertDescription>
                {market?.name ?? "This market"} is catalogue-only. Checkout is
                available for Nigerian delivery addresses.
              </AlertDescription>
            </Alert>
          ) : (
            <AddToCartButton
              productId={product.id}
              name={product.name}
              className="w-full"
            />
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="mt-12">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="provenance">Provenance</TabsTrigger>
          <TabsTrigger value="specification">Specification</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="max-w-[70ch] pt-4">
          <p className="text-(length:--text-body) leading-relaxed">
            {product.description}
          </p>
          {product.ingredients && (
            <p className="text-muted-foreground mt-4 text-(length:--text-meta)">
              <span className="text-foreground font-medium">Ingredients:</span>{" "}
              {product.ingredients}
            </p>
          )}
        </TabsContent>

        <TabsContent value="provenance" className="max-w-[70ch] pt-4">
          {product.transformation ? (
            <p className="text-(length:--text-body) leading-relaxed">
              {product.transformation}
            </p>
          ) : (
            <p className="text-(length:--text-body) leading-relaxed">
              Third-country inventory, imported directly into{" "}
              {market?.name ?? "this market"} and cleared locally. It does not
              route through Ghana and is not claimed as Ghana-origin.
            </p>
          )}
          <p className="text-muted-foreground mt-4 text-(length:--text-meta)">
            Origin assessments in this prototype are provisional and awaiting
            pilot validation.
          </p>
        </TabsContent>

        <TabsContent value="specification" className="max-w-[42rem] pt-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableBody>
                {product.variantName && (
                  <TableRow>
                    <TableCell className="text-muted-foreground w-40">
                      Variant
                    </TableCell>
                    <TableCell>{product.variantName}</TableCell>
                  </TableRow>
                )}
                {product.sku && (
                  <TableRow>
                    <TableCell className="text-muted-foreground">SKU</TableCell>
                    <TableCell>
                      <Identifier value={product.sku} label="SKU" />
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="text-muted-foreground">Weight</TableCell>
                  <TableCell data-numeric>{product.weightGrams} g</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Batch</TableCell>
                  <TableCell>
                    <Identifier value={product.batch} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Expiry</TableCell>
                  <TableCell>
                    <Identifier value={product.expiry} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
