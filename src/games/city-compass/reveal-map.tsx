"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { Loader2, MapPin } from "lucide-react";
import { loadCountries, type CountryFeature } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";

export function CityRevealMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const { t } = useT();
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    loadCountries("50m").then((data) => { if (active) { setFeatures(data); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [retry]);
  const paths = useMemo(() => {
    if (!features) return [];
    const projection = geoMercator().center([lng, lat]).scale(440).translate([200, 100]);
    const path = geoPath(projection);
    return features.filter((feature) => String(feature.id) !== "010").map((feature, index) => ({ key: `${feature.id}-${index}`, d: path(feature as unknown as GeoJSON.Feature) ?? "" }));
  }, [features, lat, lng]);

  return <div className="overflow-hidden rounded-xl border border-border bg-sky-100/50 dark:bg-slate-900/60">
    {error ? <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-3 text-xs text-muted-foreground"><p>{t("visualgames.mapError")}</p><Button size="sm" variant="outline" onClick={() => { setError(false); setRetry((value) => value + 1); }}>{t("visualgames.retry")}</Button></div>
      : !features ? <div className="flex min-h-32 items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t("common.loading")}</div>
        : <svg viewBox="0 0 400 200" className="max-h-44 w-full" role="img" aria-label={t("citycompass.mapLabel", { city: label })}>
          <defs><clipPath id="city-reveal-clip"><rect width="400" height="200" /></clipPath></defs>
          <g clipPath="url(#city-reveal-clip)">
            {paths.map((path) => <path key={path.key} d={path.d} className="fill-slate-300/75 stroke-slate-400 dark:fill-slate-600 dark:stroke-slate-500" strokeWidth="0.7" />)}
            <circle cx="200" cy="100" r="15" className="fill-primary/20" /><circle cx="200" cy="100" r="5" className="fill-primary stroke-white" strokeWidth="2" />
          </g>
        </svg>}
    <p className="flex items-center justify-center gap-1.5 border-t border-border bg-card/80 px-3 py-2 text-xs tabular-nums text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />{lat.toFixed(2)}°, {lng.toFixed(2)}°</p>
  </div>;
}
