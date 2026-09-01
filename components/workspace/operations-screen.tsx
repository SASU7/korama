"use client";

import { Warehouse } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Identifier } from "@/components/shared/identifier";
import { OriginBadge } from "@/components/shared/origin-badge";
import { SurfaceShell } from "@/components/workspace/surface-shell";
import { BatchTable } from "@/components/workspace/batch-table";
import { FulfilmentQueue } from "@/components/workspace/fulfilment-queue";
import { TransferChain } from "@/components/workspace/transfer-chain";
import { useWorkspaceLive } from "@/components/workspace/workspace-live-provider";

export function OperationsScreen() {
  const { state, run, busy, error, refresh } = useWorkspaceLive();
  const { order, batches } = state;

  const eligible = batches.filter((batch) => batch.status === "eligible");
  const blocked = batches.filter((batch) =>
    ["expired", "quarantined", "not_cleared", "origin_unsupported"].includes(batch.status),
  );
  const eligibleUnits = eligible.reduce(
    (sum, batch) => sum + (batch.quantity - batch.allocated),
    0,
  );

  return (
    <SurfaceShell error={error} busy={busy} onRetry={refresh}>
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Operations" }]}
        title="Operations"
        meta={
          order
            ? `${order.reference} · ${order.lines.length} line(s) · ${order.itemCount} unit(s)`
            : `${batches.length} batches at Lekki · ${eligibleUnits} units eligible`
        }
        actions={
          order ? (
            <Badge variant="outline" className="capitalize">
              {order.status.replaceAll("_", " ")}
            </Badge>
          ) : undefined
        }
      />

      {!order ? (
        <EmptyState
          icon={Warehouse}
          title="No orders in the fulfilment queue"
          // Operational facts, not a demo instruction. The previous copy read
          // "Complete the Nigerian shea checkout to activate the operator
          // workspace", which tells an operator nothing about their warehouse.
          description={`Orders arrive here once Paystack confirms payment. Lekki currently holds ${batches.length} batches, ${eligibleUnits} units eligible for allocation${blocked.length ? `, and ${blocked.length} blocked` : ""}.`}
          action={
            <Button variant="outline" asChild>
              <Link href="/shop">Open the shop</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-(--gutter) xl:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-(--gutter)">
            <section className="flex flex-col gap-2">
              <h2 className="text-(length:--text-meta) font-semibold">
                Fulfilment queue
              </h2>
              <FulfilmentQueue state={state} run={run} busy={busy} />
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-(length:--text-meta) font-semibold">
                Inventory batches
              </h2>
              <BatchTable batches={batches} />
            </section>
          </div>

          <div className="flex flex-col gap-(--gutter)">
            <Card>
              <CardHeader>
                <CardTitle className="text-(length:--text-meta)">
                  Order lines
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {order.lines.map((line) => (
                  <div key={line.lineNo} className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{line.name}</span>
                      <Money
                        minor={line.subtotalMinor}
                        currency={order.currency}
                        className="text-(length:--text-meta)"
                      />
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-(length:--text-meta)">
                      <span>×{line.quantity}</span>
                      <OriginBadge origin={line.origin} />
                      {line.batch && <Identifier value={line.batch} label="Allocated batch" />}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Total</span>
                  <Money minor={order.totalMinor} currency={order.currency} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-(length:--text-meta)">
                  Transfer chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransferChain steps={state.transfer} />
              </CardContent>
            </Card>

            {blocked.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-(length:--text-meta)">
                    Blocked stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5">
                  {blocked.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between gap-2 text-(length:--text-meta)"
                    >
                      <Identifier value={batch.batch} />
                      <span className="text-muted-foreground capitalize">
                        {batch.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </SurfaceShell>
  );
}
