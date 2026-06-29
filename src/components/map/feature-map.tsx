"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { loadCountries, type CountryFeature } from "@/lib/geo";
import { cn } from "@/lib/utils";

const W = 440;
const H = 320;

/** Shows a single river/lake highlighted, fitted into view with country context.
 *  Starts zoomed in on the feature; the user can pan / zoom out for more context. */
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
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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

  // Pan + zoom (wheel / pinch / drag). Min scale < 1 so you can zoom OUT to see
  // where the feature sits in the wider region.
  useEffect(() => {
    if (!svgRef.current) return;
    const sel = select(svgRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 12])
      .translateExtent([
        [-W * 2, -H * 2],
        [W * 3, H * 3],
      ])
      .on("zoom", (e) => setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y }));
    zoomRef.current = z;
    sel.call(z);
    sel.on("dblclick.zoom", null);
    return () => {
      sel.on(".zoom", null);
    };
  }, []);

  // Reset the view whenever a new feature is shown.
  useEffect(() => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }, [geometry]);

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).call(zoomRef.current.scaleBy, factor);
  }
  function reset() {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }

  const strokeScale = 1 / t.k;

  return (
    <div className={cn("relative h-full w-full", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full touch-none select-none"
        style={{ touchAction: "none" }}
        role="img"
        aria-label="Highlighted feature"
      >
        <rect x={0} y={0} width={W} height={H} className="fill-sky-100/60 dark:fill-slate-800/40" />
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {countryPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              className="fill-muted-foreground/15 stroke-slate-400/50 dark:stroke-slate-600/50"
              style={{ strokeWidth: 0.5 * strokeScale }}
            />
          ))}
          {kind === "lake" ? (
            <path d={featurePath} className="fill-sky-500 stroke-sky-700" style={{ strokeWidth: 1 * strokeScale }} />
          ) : (
            <path
              d={featurePath}
              fill="none"
              className="stroke-sky-500"
              style={{ strokeWidth: 2.5 * strokeScale, strokeLinejoin: "round", strokeLinecap: "round" }}
            />
          )}
        </g>
      </svg>

      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <button
          onClick={() => zoomBy(1.5)}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground shadow backdrop-blur hover:bg-card"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomBy(1 / 1.5)}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground shadow backdrop-blur hover:bg-card"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={reset}
          aria-label="Reset view"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground shadow backdrop-blur hover:bg-card"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
