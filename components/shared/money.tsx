import { formatMoney } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Every money value in the product. Mono + tabular so columns of figures line
 * up and a value never jitters as it changes. Wraps the existing
 * `formatMoney` in lib/domain.ts rather than re-implementing Intl.
 */
export function Money({
  minor,
  currency,
  className,
}: {
  minor: number;
  currency: string;
  className?: string;
}) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatMoney(minor, currency)}
    </span>
  );
}
