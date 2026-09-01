"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Sortie } from "@/lib/domain";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * Telemetry playback: one waypoint every 900ms, as in the original component.
 *
 * Reduced motion jumps straight to the final frame — derived rather than set
 * in an effect, so there is no cascading render.
 */
export function TelemetryStrip({ sortie }: { sortie: Sortie }) {
  const frames = sortie.telemetry;
  const reducedMotion = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reducedMotion || frames.length < 2) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 900);
    return () => window.clearInterval(timer);
  }, [reducedMotion, frames.length]);

  const index = reducedMotion
    ? frames.length - 1
    : Math.min(tick, Math.max(frames.length - 1, 0));
  const frame = frames[index];

  const readouts = [
    { label: "Altitude", value: frame ? `${frame.altitude} m` : "—" },
    { label: "Speed", value: frame ? `${frame.speed} km/h` : "—" },
    { label: "Battery", value: frame ? `${frame.battery}%` : "—" },
    { label: "Link", value: frame?.link ?? "—" },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-4"
      role="group"
      aria-label="Simulated telemetry"
      aria-live="polite"
    >
      {readouts.map((readout) => (
        <div key={readout.label} className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-[0.6875rem]">
            {readout.label}
          </span>
          <span className="font-mono tabular-nums">{readout.value}</span>
        </div>
      ))}
      <p className="text-muted-foreground col-span-full text-[0.6875rem]">
        {frame
          ? `Waypoint: ${frame.point}`
          : "No telemetry until the sortie launches."}
      </p>
    </div>
  );
}
