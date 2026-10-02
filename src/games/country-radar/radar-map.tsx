"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Map as MapIcon } from "lucide-react";
import { WorldMap } from "@/components/map/world-map";
import { COUNTRIES, getCountryByCcn3 } from "@/data/countries";
import { loadCountries } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import type { Country } from "@/lib/types";
import type { RadarWarmth } from "./generator";

const MAP_FILLS: Record<RadarWarmth, string> = {
  cold: "fill-sky-500/55", cool: "fill-cyan-400/65", warm: "fill-amber-400/70", hot: "fill-orange-500/75", burning: "fill-rose-500/80",
};

export function RadarMap({ guesses, answer, revealed, onSelect }: {
  guesses: readonly { country: Country; warmth: RadarWarmth }[];
  answer: Country;
  revealed: boolean;
  onSelect: (country: Country) => void;
}) {
  const { t } = useT();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    loadCountries("50m").then(() => { if (active) { setReady(true); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [retry]);
  const dots = useMemo(() => COUNTRIES.filter((country) => country.ccn3 && country.latlng && country.area < 30000)
    .map((country) => ({ ccn3: country.ccn3!, lat: country.latlng![0], lng: country.latlng![1], flag: country.flag })), []);
  const found = useMemo(() => new Set(revealed && answer.ccn3 ? [answer.ccn3] : []), [revealed, answer.ccn3]);
  const fills = useMemo(() => new Map(guesses.filter((guess) => guess.country.ccn3)
    .map((guess) => [guess.country.ccn3!, MAP_FILLS[guess.warmth]])), [guesses]);

  return <section className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
      <p className="flex items-center gap-2 text-xs font-bold text-primary"><MapIcon className="h-4 w-4" aria-hidden />{t("countryradar.mapTitle")}</p>
      <p className="text-[10px] text-muted-foreground">{t("countryradar.mapHint")}</p>
    </div>
    <div className="relative h-[210px] overflow-hidden bg-sky-100/50 min-[420px]:h-[250px] dark:bg-slate-900/70">
      {error ? <div role="status" className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center text-xs text-muted-foreground"><p>{t("visualgames.mapError")}</p><p>{t("countryradar.searchFallback")}</p><Button size="sm" variant="outline" onClick={() => { setError(false); setRetry((value) => value + 1); }}>{t("visualgames.retry")}</Button></div>
        : !ready ? <div role="status" className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t("common.loading")}</div>
          : <WorldMap onPick={(ccn3) => { const country = getCountryByCcn3(ccn3); if (country && !revealed) onSelect(country); }}
            found={found} dots={dots} flagByCcn3={(ccn3) => revealed ? getCountryByCcn3(ccn3)?.flag : undefined}
            getFill={(ccn3) => revealed && ccn3 === answer.ccn3 ? "fill-emerald-500/70" : fills.get(ccn3)} />}
    </div>
    <p className="px-4 py-2 text-[10px] leading-relaxed text-muted-foreground">{t("countryradar.mapAccessible")}</p>
  </section>;
}
