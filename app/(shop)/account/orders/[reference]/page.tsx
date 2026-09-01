import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { Money } from "@/components/shared/money";
import { Identifier } from "@/components/shared/identifier";
import { OriginBadge } from "@/components/shared/origin-badge";
import { OrderTimeline } from "@/components/shop/order-timeline";
import { requireConsumer } from "@/lib/auth-guards";
import { readNormalizedOrder } from "@/lib/supabase/normalized-adapter";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  return { title: `Order ${(await params).reference} — Korama` };
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function OrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const auth = await requireConsumer("/account/orders");
  const { reference } = await params;
  const result = await readNormalizedOrder(reference, auth.user.id, "consumer");
  const order = result?.state.order;
  if (!order) notFound();

  const { orderEvents, shipment } = result.state;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Account" },
          { label: "Orders", href: "/account/orders" },
          { label: order.reference },
        ]}
        title={order.reference}
        meta={`${order.itemCount} item${order.itemCount === 1 ? "" : "s"} · ${order.lines.length} line${order.lines.length === 1 ? "" : "s"}`}
        actions={
          <Badge variant="outline" className="capitalize">
            {order.status.replaceAll("_", " ")}
          </Badge>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[0.9375rem]">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline events={orderEvents} status={order.status} />
            </CardContent>
          </Card>

          {shipment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[0.9375rem]">Delivery</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 text-(length:--text-meta)">
                  <Identifier value={shipment.reference} />
                  <Badge variant="outline" className="capitalize">
                    {shipment.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <Separator />
                {shipment.legs.map((leg) => (
                  <div
                    key={`${leg.sequenceNo}-${leg.mode}`}
                    className="flex items-center justify-between gap-3 text-(length:--text-meta)"
                  >
                    <span className="capitalize">
                      {leg.mode.replaceAll("_", " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {leg.origin} → {leg.destination}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {leg.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[0.9375rem]">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {order.lines.map((line) => (
                <div key={line.lineNo} className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-display font-medium">{line.name}</span>
                    <Money
                      minor={line.subtotalMinor}
                      currency={order.currency}
                      className="text-(length:--text-meta)"
                    />
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-(length:--text-meta)">
                    <span>×{line.quantity}</span>
                    <OriginBadge origin={line.origin} />
                  </div>
                </div>
              ))}
              <Separator />
              <dl className="flex flex-col gap-1.5 text-(length:--text-meta)">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>
                    <Money minor={order.subtotalMinor} currency={order.currency} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax and duty</dt>
                  <dd>
                    <Money minor={order.taxMinor} currency={order.currency} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd>
                    <Money minor={order.deliveryMinor} currency={order.currency} />
                  </dd>
                </div>
                <Separator className="my-1" />
                <div className="flex items-baseline justify-between font-medium">
                  <dt>Total</dt>
                  <dd>
                    <Money
                      minor={order.totalMinor}
                      currency={order.currency}
                      className="text-base"
                    />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {order.address && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[0.9375rem]">
                  Delivery address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-(length:--text-meta)">
                <p>{order.address.recipientName}</p>
                <p className="text-muted-foreground">
                  {order.address.addressLine}, {order.address.city},{" "}
                  {order.address.countryCode}
                </p>
              </CardContent>
            </Card>
          )}

          {order.paymentReference && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[0.9375rem]">
                  Payment
                  <Badge variant="outline">Test mode</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Identifier value={order.paymentReference} label="Payment reference" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
