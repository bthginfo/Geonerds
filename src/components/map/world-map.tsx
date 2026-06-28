"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { loadCountries, type CountryFeature } from "@/lib/geo";

const W = 980;
const H = 500;

interface PreparedCountry {
  key: string;
  ccn3: string;
  d: string;
  cx: number;
  cy: number;
}

export function WorldMap({
  onPick,
  found,
  flashCcn3,
  flashOk,
  flagByCcn3,
  resetSignal = 0,
}: {
  onPick: (ccn3: string) => void;
  found: Set<string>;
  flashCcn3?: string | null;
  flashOk?: boolean;
  flagByCcn3: (ccn3: string) => string | undefined;
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

  const prepared = useMemo<PreparedCountry[]>(() => {
    if (!features) return [];
    // Drop Antarctica (010) — it's a large unhelpful blob and not quizzed.
    const visible = features.filter((f) => String(f.id) !== "010");
    const projection = geoNaturalEarth1().fitExtent(
      [
        [4, 4],
        [W - 4, H - 4],
      ],
      { type: "FeatureCollection", features: visible as unknown as GeoJSON.Feature[] }
    );
    const path = geoPath(projection);
    return visible.map((f, i) => {
      const c = path.centroid(f as unknown as GeoJSON.Feature);
      return {
        key: `${f.id}-${i}`,
        ccn3: String(f.id),
        d: path(f as unknown as GeoJSON.Feature) ?? "",
        cx: c[0],
        cy: c[1],
      };
    });
  }, [features]);

  // Attach d3-zoom for wheel/drag/pinch.
  useEffect(() => {
    if (!svgRef.current) return;
    const sel = select(svgRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .on("zoom", (e) => setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y }));
    zoomRef.current = z;
    sel.call(z);
    sel.on("dblclick.zoom", null);
    // Start slightly zoomed so the map fills more of a portrait screen.
    const s = 1.35;
    sel.call(z.transform, zoomIdentity.translate(((1 - s) * W) / 2, ((1 - s) * H) / 2).scale(s));
    return () => {
      sel.on(".zoom", null);
    };
  }, []);

  // Reset view on signal change.
  useEffect(() => {
    if (resetSignal === 0 || !svgRef.current || !zoomRef.current) return;
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }, [resetSignal]);

  // Tap detection that works for mouse & touch regardless of d3-zoom.
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

  const strokeW = 0.6 / t.k;

  return (
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
          const isFound = found.has(c.ccn3);
          const isFlash = flashCcn3 === c.ccn3;
          let cls = "fill-muted-foreground/20 hover:fill-primary/30";
          if (isFound) cls = "fill-success/40";
          if (isFlash) cls = flashOk ? "fill-success/60" : "fill-danger/60";
          return (
            <path
              key={c.key}
              data-ccn3={c.ccn3}
              d={c.d}
              className={`${cls} stroke-border transition-colors`}
              style={{ strokeWidth: strokeW }}
            />
          );
        })}
        {prepared.map((c) => {
          if (!found.has(c.ccn3)) return null;
          const code = flagByCcn3(c.ccn3);
          if (!code) return null;
          const size = 14;
          return (
            <image
              key={`f-${c.key}`}
              href={`/flags/${code}.svg`}
              x={c.cx - size / 2}
              y={c.cy - (size * 3) / 8}
              width={size}
              height={(size * 3) / 4}
              preserveAspectRatio="xMidYMid slice"
              style={{ pointerEvents: "none" }}
            />
          );
        })}
      </g>
    </svg>
  );
}
