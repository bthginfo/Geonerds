"use client";

import { useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { CountryFeature } from "@/lib/geo";
import { cn } from "@/lib/utils";

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
    const pad = size * 0.08;
    const projection = geoMercator().fitExtent(
      [
        [pad, pad],
        [size - pad, size - pad],
      ],
      feature as unknown as GeoJSON.Feature
    );
    const path = geoPath(projection);
    return path(feature as unknown as GeoJSON.Feature) ?? "";
  }, [feature, size]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Country outline"
    >
      <path d={d} className={fillClassName} />
    </svg>
  );
}
