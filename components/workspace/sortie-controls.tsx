"use client";

import { ArrowRight, CloudRain, PackageCheck, Plane, Sun, Truck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DemoState } from "@/lib/domain";

type Run = (url: string, init?: RequestInit, success?: string) => Promise<void>;

function command(reference: string, name: string) {
  return [
    `/api/delivery/sorties/${reference}/command`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: name }),
    },
  ] as const;
}

/**
 * One primary action at a time: preflight, then launch, then confirm the drop.
 *
 * The weather injection and the manual courier handover are test tools, not
 * features, so they sit behind a "Simulation controls" disclosure. Previously
 * all three sat in a row at equal weight, which made "inject unsafe weather"
 * read like something an operator would routinely do.
 */
export function SortieControls({
  state,
  run,
  busy,
}: {
  state: DemoState;
  run: Run;
  busy: boolean;
}) {
  const { sortie, order } = state;
  const reference = order?.reference;
  const ready = order?.status === "dispatched";
  if (!reference) return null;

  const allGatesPass = sortie.gates.every((gate) => gate.passed);

  return (
    <div className="flex flex-col gap-3">
      {!ready && (
        <Alert>
          <AlertDescription>
            Controls unlock once the warehouse dispatches the packed order.
          </AlertDescription>
        </Alert>
      )}

      {sortie.status === "draft" && (
        <Button
          className="w-full"
          disabled={busy || !ready || !allGatesPass}
          aria-busy={busy}
          onClick={() =>
            void run(...command(reference, "preflight"), "All safety gates passed. Mission cleared.")
          }
        >
          Run preflight
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      )}

      {sortie.status === "cleared" && (
        <Button
          className="w-full"
          disabled={busy || !ready}
          aria-busy={busy}
          onClick={() =>
            void run(...command(reference, "launch"), "Mission launched. Telemetry playback is running.")
          }
        >
          Launch sortie
          <Plane className="size-4" aria-hidden />
        </Button>
      )}

      {sortie.status === "en_route" && (
        <Button
          className="w-full"
          disabled={busy}
          aria-busy={busy}
          onClick={() =>
            void run(...command(reference, "complete"), "Drop confirmed at the micro-hub.")
          }
        >
          Confirm drop
          <PackageCheck className="size-4" aria-hidden />
        </Button>
      )}

      {sortie.fallbackReason && (
        <Alert>
          <Truck />
          <AlertDescription>
            Ground-courier fallback — {sortie.fallbackReason}
          </AlertDescription>
        </Alert>
      )}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Simulation controls
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-2 pt-2">
          <p className="text-muted-foreground text-(length:--text-meta)">
            Presenter tools for showing how the system refuses to fly. Not part
            of normal operation.
          </p>
          {sortie.weather === "clear" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !ready}
              onClick={() =>
                void run(
                  ...command(reference, "inject_weather"),
                  "Unsafe weather injected. Flight locked out and a courier leg created.",
                )
              }
            >
              <CloudRain className="size-3.5" aria-hidden />
              Inject unsafe weather
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(...command(reference, "reset_weather"), "Weather cleared.")
              }
            >
              <Sun className="size-3.5" aria-hidden />
              Clear weather
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !ready}
            onClick={() =>
              void run(
                ...command(reference, "fallback"),
                "Parcel handed to a ground courier.",
              )
            }
          >
            <Truck className="size-3.5" aria-hidden />
            Hand off to ground courier
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
