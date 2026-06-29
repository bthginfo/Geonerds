"use client";

import { useMemo } from "react";
import { geoMercator, geoPath, geoArea, geoCentroid } from "d3-geo";
import type { CountryFeature } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * Keep only the significant landmasses of a country so the main shape fills the
 * frame and stays recognisable. Drops both tiny islands (by area) AND far-flung
 * territories (by distance from the main landmass) — e.g. French Guiana, Alaska
 * and Russia's Chukotka — which otherwise shrink/distort the silhouette.
 * Multi-island nations (NZ, Japan, Indonesia) keep their nearby main islands.
 */
function significantGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type !== "MultiPolygon") return geometry;
  const polys = geometry.coordinates.map((coords) => {
    const poly = { type: "Polygon", coordinates: coords } as GeoJSON.Polygon;
    return { coords, area: geoArea(poly), c: geoCentroid(poly) };
  });
  const maxArea = Math.max(...polys.map((p) => p.area));
  const main = polys.find((p) => p.area === maxArea)!;
  const lonDelta = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };
  const kept = polys
    .filter((p) => {
      if (p.area < maxArea * 0.06) return false; // too small to matter
      const dist = Math.hypot(lonDelta(p.c[0], main.c[0]), p.c[1] - main.c[1]);
      return dist <= 30; // within ~30° of the main landmass
    })
    .map((p) => p.coords);
  return { type: "MultiPolygon", coordinates: kept.length ? kept : [main.coords] };
}

export function CountrySilhouette({
  feature,
  size = 280,
  className,
  fillClassName = "fill-foreground",
}: {
  feature: CountryFeature;
  size?: number;
  className?: string;
  fillClassName?: string;
}) {
  const d = useMemo(() => {
    const geom = significantGeometry(feature.geometry);
    const shape: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: geom };
    const pad = size * 0.06;
    // Rotate the projection to centre the country's longitude. This keeps shapes
    // upright AND stops antimeridian-crossing countries (Russia, Fiji, US incl.
    // Alaska) from smearing across the whole width.
    const [lon] = geoCentroid(shape);
    const projection = geoMercator()
      .rotate([-lon, 0])
      .fitExtent(
        [
          [pad, pad],
          [size - pad, size - pad],
        ],
        shape
      );
    const path = geoPath(projection);
    return path(shape) ?? "";
  }, [feature, size]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Country outline"
    >
      <path d={d} className={fillClassName} stroke="currentColor" strokeWidth={0.5} />
    </svg>
  );
}
