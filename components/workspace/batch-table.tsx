import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Identifier } from "@/components/shared/identifier";
import { cn } from "@/lib/utils";
import type { Batch, BatchStatus } from "@/lib/domain";

const STATUS: Record<BatchStatus, { label: string; className: string }> = {
  eligible: { label: "Eligible", className: "bg-success/15 text-success border-transparent" },
  allocated: { label: "Allocated", className: "" },
  expired: { label: "Expired", className: "bg-destructive/15 text-destructive border-transparent" },
  quarantined: { label: "Quarantined", className: "bg-warning/20 text-warning-foreground border-transparent" },
  not_cleared: { label: "Not cleared", className: "bg-warning/20 border-transparent" },
  origin_unsupported: { label: "Origin unsupported", className: "bg-warning/20 border-transparent" },
  depleted: { label: "Depleted", className: "text-muted-foreground" },
};

/**
 * Batch status arrives from the server, computed with the same predicate as
 * korama_allocate_order_fefo. The previous table compared expiry against a
 * hardcoded "2026-08-29" in the browser.
 */
export function BatchTable({ batches }: { batches: Batch[] }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead className="hidden md:table-cell">Product</TableHead>
            <TableHead className="hidden lg:table-cell">Site</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead data-numeric>On hand</TableHead>
            <TableHead data-numeric>Allocated</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => {
            const status = STATUS[batch.status];
            return (
              <TableRow key={batch.id}>
                <TableCell>
                  <Identifier value={batch.batch} label="Batch" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {batch.productName ?? batch.productId}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
                  {batch.site}
                </TableCell>
                <TableCell>
                  <Identifier value={batch.expiry} />
                </TableCell>
                <TableCell data-numeric>{batch.quantity}</TableCell>
                <TableCell data-numeric>{batch.allocated}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(status.className)}>
                    {status.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
