import { Money } from "@/components/shared/money";
import { Separator } from "@/components/ui/separator";
import type { Quote } from "@/lib/domain";

export function OrderSummary({
  quote,
  note,
  action,
}: {
  quote: Quote;
  note?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-5">
      <h2 className="font-medium">Order summary</h2>
      {/* aria-live so a quantity change is announced, not just repainted. */}
      <dl className="flex flex-col gap-2 text-(length:--text-meta)" aria-live="polite">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            Subtotal
            <span className="sr-only"> for {quote.itemCount} items</span>
          </dt>
          <dd>
            <Money minor={quote.subtotalMinor} currency={quote.currency} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Tax and duty</dt>
          <dd>
            <Money minor={quote.taxMinor} currency={quote.currency} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd>
            <Money minor={quote.deliveryMinor} currency={quote.currency} />
          </dd>
        </div>
        <Separator className="my-1" />
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-medium">Total</dt>
          <dd>
            <Money
              minor={quote.totalMinor}
              currency={quote.currency}
              className="text-lg font-medium"
            />
          </dd>
        </div>
      </dl>
      {note}
      {action}
      <p className="text-muted-foreground text-(length:--text-meta)">
        Totals are calculated on the server. Prices are illustrative and
        Paystack runs in test mode.
      </p>
    </div>
  );
}
