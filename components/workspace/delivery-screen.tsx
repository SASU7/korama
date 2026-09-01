"use client";

import { Plane, Truck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Identifier } from "@/components/shared/identifier";
import { SyncBadge } from "@/components/shared/sync-badge";
import { SurfaceShell } from "@/components/workspace/surface-shell";
import { PreflightGates } from "@/components/workspace/preflight-gates";
import { SortieControls } from "@/components/workspace/sortie-controls";
import { TelemetryStrip } from "@/components/workspace/telemetry-strip";
import { RoutePreview } from "@/components/workspace/route-preview";
import { useWorkspaceLive } from "@/components/workspace/workspace-live-provider";

export function DeliveryScreen() {
  const { state, run, busy, error, refresh, syncStatus } = useWorkspaceLive();
  const { sortie, order, shipment, marketRuntime } = state;
  const hasSimulatedDroneLeg = shipment?.legs.some((leg) => leg.mode === "simulated_drone") ?? false;

  return (
    <SurfaceShell error={error} busy={busy} onRetry={refresh}>
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Delivery" }]}
        title="Delivery"
        meta={
          shipment
            ? `${shipment.reference} · ${marketRuntime.deliveryOriginNodeName} → ${marketRuntime.deliveryDestinationNodeName}`
            : `${marketRuntime.deliveryOriginNodeName} → ${marketRuntime.deliveryDestinationNodeName}`
        }
        actions={
          <>
            <Badge variant="outline" className="capitalize">
              {shipment && !hasSimulatedDroneLeg
                ? "ground courier"
                : sortie.status.replaceAll("_", " ")}
            </Badge>
            <SyncBadge status={syncStatus} />
          </>
        }
      />

      {!order ? (
        <EmptyState
          icon={Plane}
          title="No sortie to fly"
          description="A sortie is created when the warehouse packs an order and dispatches it. Nothing is in flight."
          action={
            <Button variant="outline" asChild>
              <Link href="/operations">Open Operations</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-(--gutter) xl:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-(--gutter)">
            {hasSimulatedDroneLeg ? (
              <>
                <RoutePreview runtime={marketRuntime} />
                <TelemetryStrip sortie={sortie} />
              </>
            ) : shipment ? (
              <Alert>
                <Truck />
                <AlertDescription>
                  This order is routed entirely by ground courier. No simulated aircraft, preflight, or flight telemetry was created.
                </AlertDescription>
              </Alert>
            ) : null}
            {shipment && (
              <section className="flex flex-col gap-2">
                <h2 className="text-(length:--text-meta) font-semibold">
                  Delivery legs
                </h2>
                <ul className="divide-y rounded-lg border">
                  {shipment.legs.map((leg) => (
                    <li
                      key={`${leg.sequenceNo}-${leg.mode}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-(length:--text-meta)"
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
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="flex flex-col gap-(--gutter)">
            {hasSimulatedDroneLeg && (
              <section className="flex flex-col gap-2">
                <h2 className="text-(length:--text-meta) font-semibold">
                  Preflight gates
                </h2>
                <PreflightGates gates={sortie.gates} />
              </section>
            )}
            <SortieControls state={state} run={run} busy={busy} />
            <p className="text-muted-foreground text-(length:--text-meta)">
              Order <Identifier value={order.reference} /> · every aircraft,
              weather, route and authorization record here is simulated.
            </p>
          </div>
        </div>
      )}
    </SurfaceShell>
  );
}
