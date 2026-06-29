"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoArea, type GeoProjection } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Plus, Minus } from "lucide-react";
import { loadCountries, type CountryFeature } from "@/lib/geo";

const W = 980;
const H = 500;

/** The biggest landmass of a feature — avoids far-flung territories skewing
 *  a country's centroid / bounds (e.g. French Guiana, Alaska). */
function largestGeom(f: GeoJSON.Feature): GeoJSON.Feature | GeoJSON.Geometry {
  const geom = f.geometry;
  if (geom && geom.type === "MultiPolygon") {
    let best: GeoJSON.Polygon | null = null;
    let bestArea = -1;
    for (const coordinates of geom.coordinates) {
      const poly: GeoJSON.Polygon = { type: "Polygon", coordinates };
      const a = geoArea(poly);
      if (a > bestArea) {
        bestArea = a;
        best = poly;
      }
    }
    return best ?? f;
  }
  return f;
}

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
  visibleSet,
  fitToCcn3,
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
  /** If set, only these countries are drawn (others hidden). */
  visibleSet?: Set<string>;
  /** If set, the map auto-zooms to fit these countries (e.g. route endpoints). */
  fitToCcn3?: string[];
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
        // Place the marker on the LARGEST landmass, not the averaged centroid of
        // all parts — otherwise far-flung territories (e.g. French Guiana) drag
        // the flag out into the ocean / onto a neighbour.
        const c = path.centroid(largestGeom(f as unknown as GeoJSON.Feature));
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

  // Auto-zoom to fit a set of countries (e.g. the two endpoints of a route).
  const fitKey = fitToCcn3?.join(",") ?? "";
  useEffect(() => {
    if (!fitToCcn3 || fitToCcn3.length === 0) return;
    if (!features || !projection || !svgRef.current || !zoomRef.current) return;
    const path = geoPath(projection);
    const want = new Set(fitToCcn3);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const f of features) {
      const name = f.properties?.name ?? "";
      const ccn3 = f.id ? String(f.id) : NAME_TO_CCN3[name] ?? null;
      if (!ccn3 || !want.has(ccn3)) continue;
      const b = path.bounds(largestGeom(f as unknown as GeoJSON.Feature));
      x0 = Math.min(x0, b[0][0]); y0 = Math.min(y0, b[0][1]);
      x1 = Math.max(x1, b[1][0]); y1 = Math.max(y1, b[1][1]);
    }
    if (!isFinite(x0)) return;
    const bw = Math.max(1, x1 - x0);
    const bh = Math.max(1, y1 - y0);
    const k = Math.max(1, Math.min(40, 0.82 * Math.min(W / bw, H / bh)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const tx = W / 2 - k * cx;
    const ty = H / 2 - k * cy;
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity.translate(tx, ty).scale(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, features, projection]);

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
  // Dots grow on screen as you zoom in so they stay easy to tap on mobile.
  const dotScreenR = Math.min(16, 5 + (t.k - 1) * 0.8);
  const dotR = dotScreenR / t.k;
  const dotHitR = (dotScreenR + 9) / t.k;

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
            if (visibleSet && (!c.ccn3 || !visibleSet.has(c.ccn3))) return null;
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
              <g key={`dot-${d.ccn3}`}>
                {/* Invisible, larger tap target for fat fingers on mobile. */}
                <circle data-ccn3={d.ccn3} cx={p[0]} cy={p[1]} r={dotHitR} className="fill-transparent" />
                <circle
                  data-ccn3={d.ccn3}
                  cx={p[0]}
                  cy={p[1]}
                  r={dotR}
                  className={
                    isFlash
                      ? flashOk
                        ? "fill-success stroke-white"
                        : "fill-danger stroke-white"
                      : "fill-rose-500/90 stroke-white hover:fill-primary"
                  }
                  style={{ strokeWidth: 1 / t.k }}
                />
              </g>
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
