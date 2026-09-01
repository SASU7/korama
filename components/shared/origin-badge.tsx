import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InventoryClass } from "@/lib/domain";

const LABELS: Record<InventoryClass, string> = {
  ghana_origin_export: "Ghana origin",
  direct_import: "Direct import",
  marketplace_future: "Roadmap listing",
};

/**
 * The ONLY consumer of the --gold token namespace.
 *
 * Korama gold is reserved for one semantic — evidenced Ghana origin — so that
 * seeing gold anywhere in the product means exactly one thing. Direct imports
 * and roadmap listings are deliberately neutral: an import is not a lesser
 * product, it is a different provenance, and colouring it would imply a
 * ranking the trade model does not make.
 */
export function OriginBadge({
  origin,
  className,
}: {
  origin: InventoryClass;
  className?: string;
}) {
  const gold = origin === "ghana_origin_export";
  return (
    <Badge
      variant="outline"
      className={cn(
        gold
          ? "border-transparent bg-gold-muted text-gold-muted-foreground"
          : "text-muted-foreground",
        className,
      )}
    >
      {LABELS[origin]}
    </Badge>
  );
}
