"use client";

import { Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { DemoState } from "@/lib/domain";

/**
 * The order's next physical step, and only that one.
 *
 * Exactly one action button is enabled at a time — the one matching the
 * order's current status. Every other row's action cell is empty rather than
 * holding a greyed-out button, so the operator's next move is unambiguous.
 */
const STEPS = [
  { task: "allocate", label: "Allocate", detail: "FEFO picks the earliest valid batch per line", from: "paid" },
  { task: "pick", label: "Confirm pick", detail: "Scan confirms the parcel contents", from: "allocated" },
  { task: "pack", label: "Confirm pack", detail: "Weight captured for delivery routing", from: "picked" },
  { task: "dispatch", label: "Dispatch", detail: "Hand over to the last-mile leg", from: "packed" },
] as const;

export function FulfilmentQueue({
  state,
  run,
  busy,
}: {
  state: DemoState;
  run: (url: string, init?: RequestInit, success?: string) => Promise<void>;
  busy: boolean;
}) {
  const order = state.order;
  if (!order) return null;

  const ORDER = ["paid", "allocated", "picked", "packed", "dispatched", "delivered"];
  const position = ORDER.indexOf(order.status);

  function act(step: (typeof STEPS)[number]) {
    if (step.task === "allocate") {
      return run(
        `/api/fulfilment/orders/${order!.reference}/allocate`,
        { method: "POST" },
        `FEFO allocated ${order!.lines.length} line(s) from the earliest valid batches`,
      );
    }
    const status = step.task === "pick" ? "picked" : step.task === "pack" ? "packed" : "dispatched";
    return run(
      `/api/orders/${order!.reference}/advance`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      },
      `Order ${order!.reference} is now ${status}`,
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <span className="sr-only">Done</span>
            </TableHead>
            <TableHead>Step</TableHead>
            <TableHead className="hidden md:table-cell">Detail</TableHead>
            <TableHead className="w-36 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {STEPS.map((step, index) => {
            const done = position > index;
            const isNext = order!.status === step.from;
            return (
              <TableRow key={step.task} className={done ? "text-muted-foreground" : undefined}>
                <TableCell>
                  {done && <Check className="text-success size-3.5" aria-hidden />}
                </TableCell>
                <TableCell className="font-medium">{step.label}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {step.detail}
                </TableCell>
                <TableCell className="text-right">
                  {isNext && (
                    <Button size="sm" disabled={busy} onClick={() => void act(step)}>
                      {step.label}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
