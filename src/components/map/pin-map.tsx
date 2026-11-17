"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Plus, Minus, Crosshair, Loader2, RotateCcw } from "lucide-react";
import { loadCountries, type CountryFeature } from "@/lib/geo";
import { useT } from "@/i18n/I18nProvider";

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
  initialScale = 1.35,
  controls = true,
}: {
  onPin: (lng: number, lat: number) => void;
  userPin?: LngLat | null;
  target?: LngLat | null;
  locked?: boolean;
  resetSignal?: number;
  /** When set, the map centres/zooms on this point (e.g. to show a peak's region). */
  focus?: LngLat | null;
  focusZoom?: number;
  /** Initial/reset zoom. Use 1 for a neutral whole-world view. */
  initialScale?: number;
  controls?: boolean;
}) {
  const { locale } = useT();
  const instructionsId = useId();
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tapRef = useRef<{ x: number; y: number; time: number; pointerId: number } | null>(null);
  const pointersRef = useRef(new Set<number>());

  useEffect(() => {
    const release = (event: PointerEvent) => { pointersRef.current.delete(event.pointerId); tapRef.current = null; };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => { window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release); };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    loadCountries("50m").then((countries) => {
      if (!active) return;
      if (!countries.length) { setLoadFailed(true); return; }
      setFeatures(countries);
    }).catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [loadAttempt]);

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
    const s = initialScale;
    sel.call(z.transform, zoomIdentity.translate(((1 - s) * W) / 2, ((1 - s) * H) / 2).scale(s));
    return () => {
      sel.on(".zoom", null);
    };
  }, [initialScale]);

  useEffect(() => {
    if (resetSignal === 0 || !svgRef.current || !zoomRef.current) return;
    const s = initialScale;
    select(svgRef.current).call(
      zoomRef.current.transform,
      zoomIdentity.translate(((1 - s) * W) / 2, ((1 - s) * H) / 2).scale(s)
    );
  }, [resetSignal, initialScale]);

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
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointersRef.current.add(e.pointerId);
    tapRef.current = pointersRef.current.size === 1 ? { x: e.clientX, y: e.clientY, time: Date.now(), pointerId: e.pointerId } : null;
  }
  function onPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    const start = tapRef.current;
    tapRef.current = null;
    if (!start || start.pointerId !== e.pointerId || pointersRef.current.size > 0 || locked) return;
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
    if (geo && geo.every(Number.isFinite) && Math.abs(geo[0]) <= 180 && Math.abs(geo[1]) <= 90) onPin(geo[0], geo[1]);
  }

  function pinAtCenter() {
    if (locked || !projection) return;
    const geo = projection.invert?.([(W / 2 - t.x) / t.k, (H / 2 - t.y) / t.k]);
    if (geo && geo.every(Number.isFinite) && Math.abs(geo[0]) <= 180 && Math.abs(geo[1]) <= 90) onPin(geo[0], geo[1]);
  }

  function handleKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (!svgRef.current || !zoomRef.current || !features || loadFailed) return;
    const directions: Record<string, [number, number]> = { ArrowLeft: [40 / t.k, 0], ArrowRight: [-40 / t.k, 0], ArrowUp: [0, 40 / t.k], ArrowDown: [0, -40 / t.k] };
    if (directions[event.key]) {
      event.preventDefault();
      select(svgRef.current).call(zoomRef.current.translateBy, ...directions[event.key]);
    } else if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault(); zoomBy(event.key === "-" ? 0.5 : 2);
    } else if (event.key === "Enter" && !locked) {
      event.preventDefault(); pinAtCenter();
    }
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
        onPointerCancel={(event) => { pointersRef.current.delete(event.pointerId); tapRef.current = null; }}
        onKeyDown={handleKey}
        tabIndex={0}
        role="application"
        aria-label={locale === "de" ? "Interaktive Weltkarte" : "Interactive world map"}
        aria-describedby={instructionsId}
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
      {!locked && features && <Crosshair className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary/70" aria-hidden />}

      <p id={instructionsId} className="sr-only">{locale === "de" ? "Verschiebe die Karte mit den Pfeiltasten, zoome mit Plus und Minus. Mit Enter setzt du den Pin in die Kartenmitte." : "Pan with arrow keys, zoom with plus and minus. Press Enter to place your pin at the center of the map."}</p>
      {(!features || loadFailed) && <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 p-5"><div className="max-w-xs text-center" role={loadFailed ? "alert" : "status"}>{loadFailed ? <><p className="text-sm leading-relaxed">{locale === "de" ? "Die Karte konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut." : "The map could not load. Check your connection and try again."}</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><RotateCcw className="h-4 w-4" aria-hidden />{locale === "de" ? "Erneut versuchen" : "Try again"}</button></> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{locale === "de" ? "Karte wird geladen…" : "Loading map…"}</p>}</div></div>}

      {controls && <div className="pin-map-controls absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-card/90 shadow-md backdrop-blur">
        <button type="button" onClick={() => zoomBy(2)} disabled={!features} aria-label={locale === "de" ? "Vergrößern" : "Zoom in"} className="flex h-11 w-11 items-center justify-center hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary active:scale-95 disabled:opacity-40">
          <Plus className="h-5 w-5" />
        </button>
        <div className="h-px bg-border" />
        <button type="button" onClick={() => zoomBy(0.5)} disabled={!features} aria-label={locale === "de" ? "Verkleinern" : "Zoom out"} className="flex h-11 w-11 items-center justify-center hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary active:scale-95 disabled:opacity-40">
          <Minus className="h-5 w-5" />
        </button>
        {!locked && <><div className="h-px bg-border" /><button type="button" onClick={pinAtCenter} disabled={!features} aria-label={locale === "de" ? "Pin in die Kartenmitte setzen" : "Place pin at map center"} title={locale === "de" ? "Pin in die Kartenmitte setzen" : "Place pin at map center"} className="flex h-11 w-11 items-center justify-center text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary active:scale-95 disabled:opacity-40"><Crosshair className="h-5 w-5" aria-hidden /></button></>}
      </div>}
    </>
  );
}
