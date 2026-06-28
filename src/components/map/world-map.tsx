"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoArea, type GeoProjection } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Plus, Minus } from "lucide-react";
import { loadCountries, type CountryFeature } from "@/lib/geo";

const W = 980;
const H = 500;

// Map id-less Natural Earth features onto the country they belong to.
const NAME_TO_CCN3: Record<string, string> = {
  Somaliland: "706", // Somalia
  "N. Cyprus": "196", // Cyprus
};

export interface MapDot {
  ccn3: string;
  lat: number;
  lng: number;
  flag: string;
}

interface PreparedCountry {
  key: string;
  ccn3: string | null;
  d: string;
  cx: number;
  cy: number;
  area: number;
}

export function WorldMap({
  onPick,
  found,
  flashCcn3,
  flashOk,
  flagByCcn3,
  dots = [],
  getFill,
  resetSignal = 0,
}: {
  onPick: (ccn3: string) => void;
  found: Set<string>;
  flashCcn3?: string | null;
  flashOk?: boolean;
  flagByCcn3: (ccn3: string) => string | undefined;
  dots?: MapDot[];
  /** Optional persistent fill class per country (used by the route game). */
  getFill?: (ccn3: string) => string | undefined;
  resetSignal?: number;
}) {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    loadCountries("50m").then(setFeatures);
  }, []);

  const projection = useMemo<GeoProjection | null>(() => {
    if (!features) return null;
    const forFit = features.filter((f) => f.id && String(f.id) !== "010");
    return geoNaturalEarth1().fitExtent(
      [
        [4, 4],
        [W - 4, H - 4],
      ],
      { type: "FeatureCollection", features: forFit as unknown as GeoJSON.Feature[] }
    );
  }, [features]);

  const prepared = useMemo<PreparedCountry[]>(() => {
    if (!features || !projection) return [];
    const path = geoPath(projection);
    return features
      .filter((f) => String(f.id) !== "010") // drop Antarctica
      .map((f, i) => {
        const name = f.properties?.name ?? "";
        const ccn3 = f.id ? String(f.id) : NAME_TO_CCN3[name] ?? null;
        const c = path.centroid(f as unknown as GeoJSON.Feature);
        return {
          key: `${f.id ?? name}-${i}`,
          ccn3,
          d: path(f as unknown as GeoJSON.Feature) ?? "",
          cx: c[0],
          cy: c[1],
          area: geoArea(f as unknown as GeoJSON.Feature),
        };
      });
  }, [features, projection]);

  // Largest-part centroid per country (for flag placement on found).
  const centroidByCcn3 = useMemo(() => {
    const best = new Map<string, { area: number; cx: number; cy: number }>();
    for (const p of prepared) {
      if (!p.ccn3) continue;
      const cur = best.get(p.ccn3);
      if (!cur || p.area > cur.area) best.set(p.ccn3, { area: p.area, cx: p.cx, cy: p.cy });
    }
    return best;
  }, [prepared]);

  const dotPos = useMemo(() => {
    const m = new Map<string, [number, number]>();
    if (!projection) return m;
    for (const d of dots) {
      const p = projection([d.lng, d.lat]);
      if (p) m.set(d.ccn3, [p[0], p[1]]);
    }
    return m;
  }, [dots, projection]);

  function posFor(ccn3: string): [number, number] | null {
    if (dotPos.has(ccn3)) return dotPos.get(ccn3)!;
    const c = centroidByCcn3.get(ccn3);
    return c ? [c.cx, c.cy] : null;
  }

  // d3-zoom for wheel/drag/pinch.
  useEffect(() => {
    if (!svgRef.current) return;
    const sel = select(svgRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 220])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .on("zoom", (e) => setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y }));
    zoomRef.current = z;
    sel.call(z);
    sel.on("dblclick.zoom", null);
    const s = 1.35;
    sel.call(z.transform, zoomIdentity.translate(((1 - s) * W) / 2, ((1 - s) * H) / 2).scale(s));
    return () => {
      sel.on(".zoom", null);
    };
  }, []);

  useEffect(() => {
    if (resetSignal === 0 || !svgRef.current || !zoomRef.current) return;
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }, [resetSignal]);

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).call(zoomRef.current.scaleBy, factor);
  }

  function onPointerDown(e: React.PointerEvent) {
    tapRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }
  function onPointerUp(e: React.PointerEvent) {
    const start = tapRef.current;
    tapRef.current = null;
    if (!start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved > 8 || Date.now() - start.time > 500) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
    const ccn3 = el?.getAttribute("data-ccn3");
    if (ccn3) onPick(ccn3);
  }

  const strokeW = 0.9 / t.k;
  const markerW = 30 / t.k;
  const markerH = (markerW * 3) / 4;
  const dotR = 4 / t.k;

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        role="application"
        aria-label="World map"
      >
        <rect x={0} y={0} width={W} height={H} className="fill-transparent" />
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {prepared.map((c) => {
            const isFound = c.ccn3 ? found.has(c.ccn3) : false;
            const isFlash = c.ccn3 != null && flashCcn3 === c.ccn3;
            let cls = c.ccn3 ? "fill-muted-foreground/15 hover:fill-primary/30" : "fill-muted-foreground/15";
            if (isFound) cls = "fill-success/40";
            const custom = c.ccn3 ? getFill?.(c.ccn3) : undefined;
            if (custom) cls = custom;
            if (isFlash) cls = flashOk ? "fill-success/60" : "fill-danger/60";
            return (
              <path
                key={c.key}
                data-ccn3={c.ccn3 ?? undefined}
                d={c.d}
                className={`${cls} stroke-slate-400/80 transition-colors dark:stroke-slate-500/70`}
                style={{ strokeWidth: strokeW, strokeLinejoin: "round" }}
              />
            );
          })}

          {/* Clickable dots for tiny states (so Maldives, Monaco, etc. are findable). */}
          {dots.map((d) => {
            if (found.has(d.ccn3)) return null;
            const p = dotPos.get(d.ccn3);
            if (!p) return null;
            const isFlash = flashCcn3 === d.ccn3;
            return (
              <circle
                key={`dot-${d.ccn3}`}
                data-ccn3={d.ccn3}
                cx={p[0]}
                cy={p[1]}
                r={dotR}
                className={
                  isFlash
                    ? flashOk
                      ? "fill-success stroke-white"
                      : "fill-danger stroke-white"
                    : "fill-rose-500/80 stroke-white hover:fill-primary"
                }
                style={{ strokeWidth: 0.6 / t.k }}
              />
            );
          })}

          {/* Flags pinned on found countries. */}
          {[...found].map((ccn3) => {
            const code = flagByCcn3(ccn3);
            const p = posFor(ccn3);
            if (!code || !p) return null;
            return (
              <image
                key={`f-${ccn3}`}
                href={`/flags/${code}.svg`}
                x={p[0] - markerW / 2}
                y={p[1] - markerH / 2}
                width={markerW}
                height={markerH}
                preserveAspectRatio="xMidYMid slice"
                style={{ pointerEvents: "none" }}
                className="drop-shadow"
              />
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-card/90 shadow-md backdrop-blur">
        <button
          onClick={() => zoomBy(2)}
          aria-label="Zoom in"
          className="flex h-10 w-10 items-center justify-center text-foreground hover:bg-muted active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="h-px bg-border" />
        <button
          onClick={() => zoomBy(0.5)}
          aria-label="Zoom out"
          className="flex h-10 w-10 items-center justify-center text-foreground hover:bg-muted active:scale-95"
        >
          <Minus className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
