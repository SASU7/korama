import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { OriginBadge } from "@/components/shared/origin-badge";
import { ProductImage } from "@/components/shop/product-image";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { RemoveLineButton } from "@/components/shop/remove-line-button";
import { OrderSummary } from "@/components/shop/order-summary";
import { readCart } from "@/lib/supabase/cart";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";
import {
  calculateQuote,
  cartWeightGrams,
  DRONE_PAYLOAD_LIMIT_GRAMS,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cart — Korama" };

export default async function CartPage() {
  const [{ lines }, state] = await Promise.all([readCart(), readNormalizedState()]);
  const known = lines.filter((line) =>
    state.products.some((product) => product.id === line.productId),
  );

  if (!known.length) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: "Cart" }]} title="Cart" />
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description={`${state.products.filter((p) => p.market === "GH" && p.purchasable).length} products are available for delivery in Ghana.`}
          action={
            <Button asChild>
              <Link href="/shop">Browse the shop</Link>
            </Button>
          }
        />
      </>
    );
  }

  const quote = calculateQuote(state, known);
  const weight = cartWeightGrams(state, known);
  const overPayload = weight > DRONE_PAYLOAD_LIMIT_GRAMS;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Cart" }]}
        title="Cart"
        meta={`${quote.itemCount} ${quote.itemCount === 1 ? "item" : "items"} · ${weight} g`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead data-numeric className="hidden sm:table-cell">
                  Unit price
                </TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead data-numeric>Line total</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {known.map((line) => {
                const product = state.products.find((p) => p.id === line.productId)!;
                const quoteLine = quote.lines.find((l) => l.productId === line.productId)!;
                return (
                  <TableRow key={line.productId}>
                    <TableCell>
                      <Link href={`/shop/${product.id}`} className="block w-14">
                        <ProductImage product={product} sizes="56px" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/shop/${product.id}`}
                        className="font-display font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="text-muted-foreground text-(length:--text-meta)">
                        {product.producer}
                      </p>
                      <OriginBadge origin={product.origin} className="mt-1" />
                      <p className="text-muted-foreground mt-1 text-(length:--text-meta) sm:hidden">
                        <Money minor={product.priceMinor} currency={product.currency} /> each
                      </p>
                    </TableCell>
                    <TableCell data-numeric className="hidden sm:table-cell">
                      <Money minor={product.priceMinor} currency={product.currency} />
                    </TableCell>
                    <TableCell>
                      <QuantityStepper
                        productId={line.productId}
                        quantity={line.quantity}
                        label={product.name}
                      />
                    </TableCell>
                    <TableCell data-numeric>
                      <Money
                        minor={quoteLine.subtotalMinor}
                        currency={quote.currency}
                      />
                    </TableCell>
                    <TableCell>
                      <RemoveLineButton
                        productId={line.productId}
                        name={product.name}
                        quantity={line.quantity}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            quote={quote}
            note={
              overPayload ? (
                <Alert>
                  <TriangleAlert />
                  <AlertDescription>
                    This parcel weighs {weight} g, over the{" "}
                    {DRONE_PAYLOAD_LIMIT_GRAMS} g drone payload limit, so it
                    will go by ground courier.
                  </AlertDescription>
                </Alert>
              ) : null
            }
            action={
              <Button size="lg" className="w-full" asChild>
                <Link href="/checkout">Checkout</Link>
              </Button>
            }
          />
        </div>
      </div>
    </>
  );
}
