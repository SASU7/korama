"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useRef, useState } from "react";
import type { MarketRuntimeConfig } from "@/lib/domain";

/**
 * Mapbox route preview, lifted out of the legacy workspace component
 * unchanged: dynamic import so mapbox-gl stays out of every other bundle,
 * a CSS-only fallback when the token is missing or the map fails, and
 * map.remove() cleanup guarded by a disposed flag.
 *
 * mapbox-gl.css is imported here rather than in the root layout. It is
 * unlayered, so it correctly beats Tailwind Preflight (which would otherwise
 * strip the map controls' chrome), and it now loads only on this surface.
 */
export function MapboxRoutePreview({ runtime }: { runtime: MarketRuntimeConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current) return;
    let disposed = false;
    let map: import("mapbox-gl").Map | null = null;
    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (disposed || !containerRef.current) return;
        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: runtime.routeCoordinates[1] ?? runtime.routeCoordinates[0] ?? [-0.0166, 5.6698],
          zoom: 12,
          attributionControl: true,
        });
        map.on("error", () => {
          if (!disposed) setMapError(true);
        });
        map.on("load", () => {
          if (!map || disposed) return;
          map.addSource("korama-demo-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: runtime.routeCoordinates,
              },
            },
          });
          map.addLayer({
            id: "korama-demo-route-line",
            type: "line",
            source: "korama-demo-route",
            paint: {
              "line-color": "#136b50",
              "line-width": 4,
              "line-dasharray": [1.5, 1],
            },
          });
          setMapReady(true);
        });
      })
      .catch(() => {
        if (!disposed) setMapError(true);
      });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [runtime, token]);

  if (!token || mapError) return <StaticRoutePreview runtime={runtime} fallback={mapError} />;
  return (
    <div
      className="route-map mapbox-route"
      ref={containerRef}
      role="img"
      aria-label="Mapbox static simulated route"
    >
      {!mapReady && (
        <div className="map-loading">Loading optional Mapbox route…</div>
      )}
      <div className="map-caption">
        <span>Static route data · simulated</span>
        <span>Mapbox token configured</span>
      </div>
    </div>
  );
}

export function StaticRoutePreview({ runtime, fallback = false }: { runtime: MarketRuntimeConfig; fallback?: boolean }) {
  return (
    <div
      className="route-map"
      role="img"
      aria-label={`Static simulated route from ${runtime.deliveryOriginNodeName} to ${runtime.deliveryDestinationNodeName}`}
    >
      <div className="map-grid" />
      <div className="route-path">
        <span className="map-node start">Tema warehouse</span>
        <span className="map-node mid">Waypoint</span>
        <span className="map-node end">Tema micro-hub</span>
      </div>
      <div className="map-caption">
        <span>Route data is simulated</span>
        <span>
          {fallback
            ? "Mapbox unavailable · static fallback"
            : "Mapbox token optional"}
        </span>
      </div>
    </div>
  );
}
