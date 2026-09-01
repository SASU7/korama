import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
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
import { requireConsumer } from "@/lib/auth-guards";
import { readNormalizedOrders } from "@/lib/supabase/normalized-adapter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your orders — Korama" };

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function OrdersPage() {
  const auth = await requireConsumer("/account/orders");
  const orders = await readNormalizedOrders(auth.user.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Account" }, { label: "Orders" }]}
        title="Orders"
        meta={orders.length ? `${orders.length} placed` : undefined}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No orders yet"
          description="Orders you complete with Paystack appear here, with live fulfilment and delivery tracking."
          action={
            <Button asChild>
              <Link href="/shop">Browse the shop</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead className="hidden sm:table-cell">Placed</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead data-numeric>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.reference}>
                  <TableCell>
                    <Link
                      href={`/account/orders/${order.reference}`}
                      className="hover:underline"
                    >
                      <Identifier value={order.reference} />
                    </Link>
                    <span className="text-muted-foreground block text-(length:--text-meta) sm:hidden">
                      {DATE.format(new Date(order.placedAt))}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {DATE.format(new Date(order.placedAt))}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                    <span className="text-muted-foreground block text-(length:--text-meta)">
                      {order.headline}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {order.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell data-numeric>
                    <Money minor={order.totalMinor} currency={order.currency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
