"use client";

import { useMemo } from "react";
import { geoMercator, geoPath, geoArea } from "d3-geo";
import type { CountryFeature } from "@/lib/geo";
import { cn } from "@/lib/utils";

/**
 * Keep only the significant landmasses of a country (drops far-flung small
 * overseas territories/islands) so the main shape fills the frame and stays
 * recognisable. Multi-island nations (e.g. NZ, Japan) keep their main islands.
 */
function significantGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type !== "MultiPolygon") return geometry;
  const polys = geometry.coordinates.map((coords) => ({
    coords,
    area: geoArea({ type: "Polygon", coordinates: coords } as GeoJSON.Polygon),
  }));
  const maxArea = Math.max(...polys.map((p) => p.area));
  const kept = polys.filter((p) => p.area >= maxArea * 0.06).map((p) => p.coords);
  return { type: "MultiPolygon", coordinates: kept.length ? kept : [polys[0].coords] };
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
    const projection = geoMercator().fitExtent(
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
