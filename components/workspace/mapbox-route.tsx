"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useRef, useState } from "react";

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
export function MapboxRoutePreview() {
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
          center: [3.55, 6.45],
          zoom: 10,
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
                coordinates: [
                  [3.49, 6.43],
                  [3.57, 6.48],
                  [3.64, 6.54],
                ],
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
  }, [token]);

  if (!token || mapError) return <StaticRoutePreview fallback={mapError} />;
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

export function StaticRoutePreview({ fallback = false }: { fallback?: boolean }) {
  return (
    <div
      className="route-map"
      role="img"
      aria-label="Static simulated route from Lekki to fictional micro-hub"
    >
      <div className="map-grid" />
      <div className="route-path">
        <span className="map-node start">Lekki</span>
        <span className="map-node mid">Waypoint</span>
        <span className="map-node end">Micro-hub</span>
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
