"use client";

import { useMemo } from "react";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { CountryFeature } from "@/lib/geo";
import { prepareOutlineGeometry } from "@/lib/geometry";
import { cn } from "@/lib/utils";

export function CountrySilhouette({
  feature,
  size = 280,
  className,
  fillClassName = "fill-foreground",
  label = "Country outline",
}: {
  feature: CountryFeature;
  size?: number;
  className?: string;
  fillClassName?: string;
  label?: string;
}) {
  const d = useMemo(() => {
    const geometry = prepareOutlineGeometry(feature.geometry);
    const shape: GeoJSON.Feature = { type: "Feature", properties: {}, geometry };
    const pad = size * 0.06;
    // Centring the longitude keeps dateline countries upright and compact.
    const [longitude] = geoCentroid(shape);
    const projection = geoMercator()
      .rotate([-longitude, 0])
      .fitExtent(
        [
          [pad, pad],
          [size - pad, size - pad],
        ],
        shape
      );
    return geoPath(projection)(shape) ?? "";
  }, [feature, size]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={label}
    >
      <path
        d={d}
        className={cn(fillClassName, "drop-shadow-sm")}
        stroke="currentColor"
        strokeWidth={0.65}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
