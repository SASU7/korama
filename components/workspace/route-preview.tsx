"use client";

import { MapboxRoutePreview } from "@/components/workspace/mapbox-route";
import type { MarketRuntimeConfig } from "@/lib/domain";

/**
 * Mapbox with a CSS-only fallback, kept from the original implementation:
 * dynamic import of mapbox-gl, the missing-token branch, and map.remove()
 * cleanup all still apply. Wrapped here so the delivery screen does not
 * depend on the legacy module directly once it is deleted.
 */
export function RoutePreview({ runtime }: { runtime: MarketRuntimeConfig }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <MapboxRoutePreview runtime={runtime} />
    </div>
  );
}
