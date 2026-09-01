import { Check, CircleAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Gate } from "@/lib/domain";

/** All seven gates, always visible — a hidden gate is not a safety gate. */
export function PreflightGates({ gates }: { gates: Gate[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gate</TableHead>
            <TableHead className="hidden md:table-cell">Detail</TableHead>
            <TableHead className="w-16 text-right">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gates.map((gate) => (
            <TableRow key={gate.key}>
              <TableCell className="font-medium">{gate.label}</TableCell>
              <TableCell className="text-muted-foreground hidden md:table-cell">
                {gate.detail}
              </TableCell>
              <TableCell className="text-right">
                {gate.passed ? (
                  <Check className="text-success ml-auto size-3.5" aria-label="Pass" />
                ) : (
                  <CircleAlert
                    className="text-destructive ml-auto size-3.5"
                    aria-label="Blocked"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
