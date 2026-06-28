"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { loadCountries, type CountryFeature } from "@/lib/geo";
import { cn } from "@/lib/utils";

const W = 440;
const H = 320;

/** Shows a single river/lake highlighted, fitted into view with country context. */
export function FeatureMap({
  geometry,
  kind,
  className,
}: {
  geometry: GeoJSON.Geometry;
  kind: "river" | "lake";
  className?: string;
}) {
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);

  useEffect(() => {
    loadCountries("50m").then(setCountries);
  }, []);

  const { countryPaths, featurePath } = useMemo(() => {
    const feat: GeoJSON.Feature = { type: "Feature", properties: {}, geometry };
    const pad = 36;
    const projection = geoMercator().fitExtent(
      [
        [pad, pad],
        [W - pad, H - pad],
      ],
      feat
    );
    const path = geoPath(projection);
    const cps = (countries ?? [])
      .filter((f) => String(f.id) !== "010")
      .map((f) => path(f as unknown as GeoJSON.Feature) ?? "");
    return { countryPaths: cps, featurePath: path(feat) ?? "" };
  }, [geometry, countries]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-full w-full", className)} role="img" aria-label="Highlighted feature">
      <rect x={0} y={0} width={W} height={H} className="fill-sky-100/60 dark:fill-slate-800/40" />
      {countryPaths.map((d, i) => (
        <path key={i} d={d} className="fill-muted-foreground/15 stroke-slate-400/50 dark:stroke-slate-600/50" style={{ strokeWidth: 0.5 }} />
      ))}
      {kind === "lake" ? (
        <path d={featurePath} className="fill-sky-500 stroke-sky-700" style={{ strokeWidth: 1 }} />
      ) : (
        <path d={featurePath} fill="none" className="stroke-sky-500" style={{ strokeWidth: 2.5, strokeLinejoin: "round", strokeLinecap: "round" }} />
      )}
    </svg>
  );
}
