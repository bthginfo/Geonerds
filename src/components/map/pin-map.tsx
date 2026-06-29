"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Plus, Minus } from "lucide-react";
import { loadCountries, type CountryFeature } from "@/lib/geo";

const W = 980;
const H = 500;

type LngLat = [number, number];

export function PinMap({
  onPin,
  userPin,
  target,
  locked = false,
  resetSignal = 0,
  focus = null,
  focusZoom = 5,
}: {
  onPin: (lng: number, lat: number) => void;
  userPin?: LngLat | null;
  target?: LngLat | null;
  locked?: boolean;
  resetSignal?: number;
  /** When set, the map centres/zooms on this point (e.g. to show a peak's region). */
  focus?: LngLat | null;
  focusZoom?: number;
}) {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    loadCountries("50m").then(setFeatures);
  }, []);

  const { paths, projection } = useMemo(() => {
    if (!features) return { paths: [] as string[], projection: null as GeoProjection | null };
    const visible = features.filter((f) => String(f.id) !== "010");
    const proj = geoNaturalEarth1().fitExtent(
      [
        [4, 4],
        [W - 4, H - 4],
      ],
      { type: "FeatureCollection", features: visible as unknown as GeoJSON.Feature[] }
    );
    const path = geoPath(proj);
    return { paths: visible.map((f) => path(f as unknown as GeoJSON.Feature) ?? ""), projection: proj };
  }, [features]);

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

  // Centre/zoom on a focus point (e.g. a peak's region) when its coordinates change.
  useEffect(() => {
    if (!focus || !projection || !svgRef.current || !zoomRef.current) return;
    const p = projection(focus);
    if (!p) return;
    const k = focusZoom;
    const tx = W / 2 - k * p[0];
    const ty = H / 2 - k * p[1];
    select(svgRef.current).call(zoomRef.current.transform, zoomIdentity.translate(tx, ty).scale(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.[0], focus?.[1], focusZoom, projection]);

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
    if (!start || locked) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8 || Date.now() - start.time > 500) return;
    const svg = svgRef.current;
    const g = gRef.current;
    const proj = projection;
    if (!svg || !g || !proj) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = g.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const geo = proj.invert?.([local.x, local.y]);
    if (geo) onPin(geo[0], geo[1]);
  }

  const userXY = projection && userPin ? projection(userPin) : null;
  const targetXY = projection && target ? projection(target) : null;
  const r = 6 / t.k;

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
        <g ref={gRef} transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              className="fill-muted-foreground/15 stroke-slate-400/70 dark:stroke-slate-500/60"
              style={{ strokeWidth: 0.8 / t.k }}
            />
          ))}

          {targetXY && userXY && (
            <line
              x1={userXY[0]}
              y1={userXY[1]}
              x2={targetXY[0]}
              y2={targetXY[1]}
              className="stroke-foreground/50"
              style={{ strokeWidth: 1.5 / t.k, strokeDasharray: `${4 / t.k} ${3 / t.k}` }}
            />
          )}
          {targetXY && (
            <g>
              <circle cx={targetXY[0]} cy={targetXY[1]} r={r} className="fill-success stroke-white" style={{ strokeWidth: 1.5 / t.k }} />
            </g>
          )}
          {userXY && (
            <circle cx={userXY[0]} cy={userXY[1]} r={r} className="fill-primary stroke-white" style={{ strokeWidth: 1.5 / t.k }} />
          )}
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-card/90 shadow-md backdrop-blur">
        <button onClick={() => zoomBy(2)} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center hover:bg-muted active:scale-95">
          <Plus className="h-5 w-5" />
        </button>
        <div className="h-px bg-border" />
        <button onClick={() => zoomBy(0.5)} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center hover:bg-muted active:scale-95">
          <Minus className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
