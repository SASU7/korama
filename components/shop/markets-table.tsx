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
import type { Market, MarketStatus } from "@/lib/domain";

const STATUS: Record<MarketStatus, { label: string; className: string }> = {
  active: { label: "Transacting", className: "bg-success/15 text-success border-transparent" },
  roadmap: { label: "Roadmap", className: "" },
  future: { label: "Future", className: "text-muted-foreground" },
};

export function MarketsTable({ markets }: { markets: Market[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Code</TableHead>
            <TableHead>Market</TableHead>
            <TableHead className="hidden sm:table-cell">Currency</TableHead>
            <TableHead className="hidden lg:table-cell">Language</TableHead>
            <TableHead data-numeric className="hidden sm:table-cell">
              Phase
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Requirement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markets.map((market) => {
            const status = STATUS[market.status];
            return (
              <TableRow key={market.code}>
                <TableCell>
                  <Identifier value={market.code} />
                </TableCell>
                <TableCell className="font-medium">
                  {market.name}
                  {/* At 375px the hidden columns fold into the name cell
                      rather than disappearing. */}
                  <span className="text-muted-foreground block text-(length:--text-meta) font-normal sm:hidden">
                    {market.currency} · Phase {market.launchPhase}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Identifier value={market.currency} />
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
                  {market.language}
                </TableCell>
                <TableCell data-numeric className="hidden sm:table-cell">
                  {market.launchPhase}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell text-(length:--text-meta)">
                  {market.localizationRequired
                    ? `${market.localizationRequired} localization required`
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
