"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { loadCountries, type CountryFeature } from "@/lib/geo";
import { cn } from "@/lib/utils";

export interface TravelMapCity {
  id: string;
  name: { en: string; de: string };
  cca3: string;
  lat: number;
  lng: number;
  tier?: number;
}

const WIDTH = 720;
const HEIGHT = 380;
const EMPTY_ROUTE: readonly string[] = [];
type MapView = { zoom: number; x: number; y: number };
const WORLD_VIEW: MapView = { zoom: 1, x: 0, y: 0 };

function initialCityView(cities: readonly TravelMapCity[], projection: GeoProjection): MapView {
  if (cities.length < 2) return WORLD_VIEW;
  const points = cities.map((city) => projection([city.lng, city.lat])).filter((point): point is [number, number] => Boolean(point && point.every(Number.isFinite)));
  if (points.length < 2) return WORLD_VIEW;
  const minX = Math.min(...points.map((point) => point[0]));
  const maxX = Math.max(...points.map((point) => point[0]));
  const minY = Math.min(...points.map((point) => point[1]));
  const maxY = Math.max(...points.map((point) => point[1]));
  const width = maxX - minX;
  const height = maxY - minY;
  // A global itinerary retains world context. Only already-known regional
  // destinations are fitted; nothing about an unrevealed target is inferred.
  if (width > WIDTH * 0.55 || height > HEIGHT * 0.6) return WORLD_VIEW;
  const zoom = Math.min(5, (WIDTH - 144) / Math.max(1, width), (HEIGHT - 128) / Math.max(1, height));
  if (zoom < 1.5) return WORLD_VIEW;
  const limitX = WIDTH * (zoom - 1) / 2;
  const limitY = HEIGHT * (zoom - 1) / 2;
  return {
    zoom,
    x: Math.max(-limitX, Math.min(limitX, (WIDTH / 2 - (minX + maxX) / 2) * zoom)),
    y: Math.max(-limitY, Math.min(limitY, (HEIGHT / 2 - (minY + maxY) / 2) * zoom)),
  };
}

/** Geographic context only: the caller decides which locations may be revealed. */
export function TravelMap({ cities, route = EMPTY_ROUTE, revealed = false, className, onSelectCity }: {
  cities: readonly TravelMapCity[];
  route?: readonly string[];
  revealed?: boolean;
  className?: string;
  onSelectCity?: (id: string) => void;
}) {
  const { locale } = useT();
  const de = locale === "de";
  const projection = useMemo(() => geoNaturalEarth1().fitExtent([[12, 12], [WIDTH - 12, HEIGHT - 12]], { type: "Sphere" }), []);
  const initialView = useMemo(() => initialCityView(cities, projection), [cities, projection]);
  const frameKey = cities.map((city) => `${city.id}:${city.lat}:${city.lng}`).sort().join("|");
  const [map, setMap] = useState<{ features: CountryFeature[] | null; failed: boolean }>({ features: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  const [camera, setCamera] = useState(() => ({ key: frameKey, view: initialView }));
  const view = camera.key === frameKey ? camera.view : initialView;
  const [size, setSize] = useState({ width: WIDTH, height: HEIGHT });
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; startX: number; startY: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    loadCountries("50m").then(
      (features) => { if (active) setMap({ features, failed: false }); },
      () => { if (active) setMap({ features: null, failed: true }); },
    );
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width && entry.contentRect.height) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [map.features]);

  const path = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => path(geoGraticule10()) ?? "", [path]);
  const prepared = useMemo(() => map.features?.filter((feature) => String(feature.id) !== "010").map((feature, index) => ({
    key: `${feature.id}-${index}`, id: String(feature.id).padStart(3, "0"), d: path(feature) ?? "",
  })) ?? [], [map.features, path]);
  const cityById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);
  const countryIds = useMemo(() => new Set(cities.map((city) => getCountryByCca3(city.cca3)?.ccn3).filter(Boolean)), [cities]);
  const routePath = useMemo(() => {
    const coordinates = route.flatMap((id) => { const city = cityById.get(id); return city ? [[city.lng, city.lat]] : []; });
    return coordinates.length > 1 ? path({ type: "LineString", coordinates }) : null;
  }, [route, cityById, path]);

  function setView(update: MapView | ((current: MapView) => MapView)) {
    setCamera((current) => ({ key: frameKey, view: typeof update === "function" ? update(current.key === frameKey ? current.view : initialView) : update }));
  }

  function zoomBy(delta: number) {
    drag.current = null;
    setView((current) => {
      const zoom = Math.min(5, Math.max(1, current.zoom + delta));
      const maxX = WIDTH * (zoom - 1) / 2;
      const maxY = HEIGHT * (zoom - 1) / 2;
      return { zoom, x: Math.max(-maxX, Math.min(maxX, current.x)), y: Math.max(-maxY, Math.min(maxY, current.y)) };
    });
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) { drag.current = null; return; }
    if (view.zoom === 1 || (event.target as Element).closest("button")) return;
    drag.current = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: view.x, y: view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pan(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const scale = Math.min(size.width / WIDTH, size.height / HEIGHT);
    const maxX = WIDTH * (view.zoom - 1) / 2;
    const maxY = HEIGHT * (view.zoom - 1) / 2;
    setView({ zoom: view.zoom,
      x: Math.max(-maxX, Math.min(maxX, current.x + (event.clientX - current.startX) / scale)),
      y: Math.max(-maxY, Math.min(maxY, current.y + (event.clientY - current.startY) / scale)),
    });
  }

  const name = (city: TravelMapCity) => city.name[locale] || city.name.en;
  const summary = cities.map(name).join(", ");
  const scale = Math.min(size.width / WIDTH, size.height / HEIGHT);
  const offset = { x: (size.width - WIDTH * scale) / 2, y: (size.height - HEIGHT * scale) / 2 };
  const atInitialView = Math.abs(view.zoom - initialView.zoom) < 0.001 && Math.abs(view.x - initialView.x) < 0.1 && Math.abs(view.y - initialView.y) < 0.1;

  return <figure className={cn("w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card", className)}>
    {!map.features ? <div className="flex min-h-60 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <p role={map.failed ? "alert" : "status"} className="text-sm text-muted-foreground">{map.failed ? (de ? "Die Karte konnte nicht geladen werden." : "The map could not be loaded.") : (de ? "Weltkarte wird geladen …" : "Loading world map …")}</p>
      {map.failed && <Button variant="secondary" onClick={() => { setMap({ features: null, failed: false }); setAttempt((value) => value + 1); }}>{de ? "Erneut versuchen" : "Try again"}</Button>}
    </div> : <>
      <div ref={container} className="relative isolate aspect-[36/19] min-h-60 w-full min-w-0 max-w-full overflow-hidden bg-muted/30"
        style={{ touchAction: view.zoom > 1 ? "none" : "pan-y" }} onPointerDown={startPan} onPointerMove={pan}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`${de ? "Weltkarte" : "World map"}: ${summary}`}>
          <g transform={`translate(${WIDTH / 2 + view.x} ${HEIGHT / 2 + view.y}) scale(${view.zoom}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`}>
            <path d={graticule} fill="none" stroke="var(--border)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
            {prepared.map((country) => <path key={country.key} d={country.d} fill={countryIds.has(country.id) ? "var(--primary)" : "var(--foreground)"} fillOpacity={countryIds.has(country.id) ? 0.18 : 0.1} stroke="var(--card)" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />)}
            {routePath && <path d={routePath} fill="none" stroke={revealed ? "var(--success)" : "var(--primary)"} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />}
          </g>
        </svg>
        {cities.map((city, index) => {
          const point = projection([city.lng, city.lat]);
          if (!point) return null;
          const x = (point[0] - WIDTH / 2) * view.zoom + WIDTH / 2 + view.x;
          const y = (point[1] - HEIGHT / 2) * view.zoom + HEIGHT / 2 + view.y;
          if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) return null;
          const routeIndex = route.indexOf(city.id);
          const number = index + 1;
          const marker = <span className={cn("flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-card px-1 text-xs font-bold tabular-nums", routeIndex >= 0 ? "bg-primary text-primary-foreground" : "bg-foreground text-background")}>{number}</span>;
          return <div key={city.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: offset.x + x * scale, top: offset.y + y * scale }}>
            {onSelectCity ? <button type="button" onClick={() => onSelectCity(city.id)} aria-label={`${number}. ${name(city)}`} title={name(city)} className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card">{marker}</button> : <span title={name(city)} aria-hidden="true">{marker}</span>}
          </div>;
        })}
        <div className="absolute right-2 top-2 flex flex-col gap-1 rounded-xl border border-border bg-card p-1">
          <Button variant="ghost" size="icon" aria-label={de ? "Karte vergrößern" : "Zoom in"} disabled={view.zoom >= 5} onClick={() => zoomBy(0.75)}><Plus className="h-4 w-4" aria-hidden /></Button>
          <Button variant="ghost" size="icon" aria-label={de ? "Karte verkleinern" : "Zoom out"} disabled={view.zoom <= 1} onClick={() => zoomBy(-0.75)}><Minus className="h-4 w-4" aria-hidden /></Button>
          <Button variant="ghost" size="icon" aria-label={de ? "Kartenansicht zurücksetzen" : "Reset map view"} disabled={atInitialView} onClick={() => { drag.current = null; setView(initialView); }}><RotateCcw className="h-4 w-4" aria-hidden /></Button>
        </div>
      </div>
      <figcaption className="border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <span>{de ? "Natural-Earth-Kartografie. Vergrößerte Karten lassen sich verschieben." : "Natural Earth cartography. Zoomed maps can be panned."}</span>
        {!onSelectCity && summary && <span className="mt-1 block break-words">{cities.map((city, index) => `${index + 1}. ${name(city)}`).join(" · ")}</span>}
      </figcaption>
    </>}
  </figure>;
}
