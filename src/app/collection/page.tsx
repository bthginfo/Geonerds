"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock, Sparkles, Lightbulb, X, Globe2 } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useDex } from "@/store/dex";
import { countryName } from "@/data/countries";
import { FlagImage } from "@/components/flag-image";
import {
  dexScore,
  dexStateOf,
  dexGameCount,
  dexFacts,
  dexCoolFacts,
  UNLOCK_TOTAL,
  continentProgress,
  continentName,
  continentBlurb,
  DEX_POOL,
} from "@/lib/dex";
import type { Country } from "@/lib/types";
import { cn } from "@/lib/utils";

const POOL = DEX_POOL;

export default function CollectionPage() {
  const { t, locale } = useT();
  const hits = useDex((s) => s.hits);
  const [selected, setSelected] = useState<Country | null>(null);
  const [view, setView] = useState<"countries" | "continents">("countries");

  const sorted = useMemo(() => {
    return [...POOL]
      .map((c) => ({ c, score: dexScore(hits[c.cca3]) }))
      .sort((a, b) => b.score - a.score || countryName(a.c, locale).localeCompare(countryName(b.c, locale)))
      .map((x) => x.c);
  }, [hits, locale]);

  const stats = useMemo(() => {
    let unlocked = 0;
    let discovered = 0;
    for (const c of POOL) {
      const st = dexStateOf(hits[c.cca3]);
      if (st === "unlocked") unlocked++;
      else if (st === "discovered") discovered++;
    }
    return { unlocked, discovered, total: POOL.length };
  }, [hits]);

  const continents = useMemo(() => continentProgress(hits, locale), [hits, locale]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-24">
      <Link href="/profile" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("nav.profile")}
      </Link>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">{t("collection.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("collection.subtitle")}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 text-center text-sm">
          <div className="flex-1 rounded-xl bg-success/10 py-2">
            <div className="text-lg font-extrabold text-success">{stats.unlocked}</div>
            <div className="text-[11px] text-muted-foreground">{t("collection.unlocked")}</div>
          </div>
          <div className="flex-1 rounded-xl bg-primary/10 py-2">
            <div className="text-lg font-extrabold text-primary">{stats.discovered}</div>
            <div className="text-[11px] text-muted-foreground">{t("collection.discovered")}</div>
          </div>
          <div className="flex-1 rounded-xl bg-muted py-2">
            <div className="text-lg font-extrabold">{stats.total}</div>
            <div className="text-[11px] text-muted-foreground">{t("collection.total")}</div>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 text-sm font-semibold">
        <button
          onClick={() => setView("countries")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl py-2 transition",
            view === "countries" ? "bg-card shadow-sm" : "text-muted-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
          {t("collection.tabCountries")}
        </button>
        <button
          onClick={() => setView("continents")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl py-2 transition",
            view === "continents" ? "bg-card shadow-sm" : "text-muted-foreground"
          )}
        >
          <Globe2 className="h-4 w-4" />
          {t("collection.tabContinents")}
        </button>
      </div>

      {view === "continents" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("collection.continentsSubtitle")}</p>
          {continents.map((cp) => {
            const complete = cp.total > 0 && cp.unlocked >= cp.total;
            const pct = cp.total > 0 ? (cp.unlocked / cp.total) * 100 : 0;
            const discPct = cp.total > 0 ? (cp.discovered / cp.total) * 100 : 0;
            return (
              <motion.div
                key={cp.region}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl border p-4 shadow-sm",
                  complete ? "border-success/50 bg-success/5" : "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold">{continentName(cp.region, locale)}</h2>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {complete
                      ? t("collection.regionComplete")
                      : t("collection.regionUnlocked", { unlocked: cp.unlocked, total: cp.total })}
                  </span>
                </div>

                {/* progress bar with discovered + unlocked layers */}
                <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: `${discPct}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {t("collection.regionDiscovered", { discovered: cp.discovered, total: cp.total })}
                </div>

                {continentBlurb(cp.region, locale) && (
                  <p className="mt-3 text-sm text-muted-foreground">{continentBlurb(cp.region, locale)}</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {cp.facts.map((f) => (
                    <div key={f.label} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <div className="text-[11px] text-muted-foreground">{f.label}</div>
                      <div className="font-semibold leading-tight">{f.value}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
      <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {sorted.map((c) => {
          const score = dexScore(hits[c.cca3]);
          const st = dexStateOf(hits[c.cca3]);
          const locked = st === "locked";
          return (
            <button
              key={c.cca3}
              onClick={() => setSelected(c)}
              className={cn(
                "group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 text-center transition-all active:scale-[0.98]",
                st === "unlocked"
                  ? "border-success/40 bg-success/5"
                  : st === "discovered"
                  ? "border-border bg-card hover:border-primary/40"
                  : "border-dashed border-border bg-muted/30"
              )}
            >
              <div className="relative w-full">
                <FlagImage
                  code={c.flag}
                  alt=""
                  className={cn("aspect-[4/3] w-full shadow-sm transition", locked && "opacity-20 grayscale")}
                />
                {locked && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </span>
                )}
                {st === "unlocked" && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shadow">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div className="w-full truncate text-xs font-semibold">
                {locked ? "???" : countryName(c, locale)}
              </div>
              {/* progress pips */}
              {!locked && st !== "unlocked" && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(score / UNLOCK_TOTAL) * 100}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      )}

      {selected && <DetailModal country={selected} score={dexScore(hits[selected.cca3])} games={dexGameCount(hits[selected.cca3])} onClose={() => setSelected(null)} locale={locale} t={t} />}
    </div>
  );
}

function DetailModal({
  country,
  score,
  games,
  onClose,
  locale,
  t,
}: {
  country: Country;
  score: number;
  games: number;
  onClose: () => void;
  locale: "en" | "de";
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const locked = score <= 0;
  const unlocked = score >= UNLOCK_TOTAL;
  const facts = dexFacts(country, score, locale);
  const cool = dexCoolFacts(country, score, locale);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-3">
          <FlagImage code={country.flag} alt="" className={cn("aspect-[4/3] w-20 shrink-0 rounded shadow", locked && "opacity-30 grayscale")} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">{locked ? "???" : countryName(country, locale)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {unlocked ? t("collection.complete") : t("collection.progress", { n: Math.min(score, UNLOCK_TOTAL), total: UNLOCK_TOTAL })}
              {games > 0 && ` · ${t("collection.fromGames", { n: games })}`}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${Math.min(100, (score / UNLOCK_TOTAL) * 100)}%` }} />
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {locked ? (
          <p className="mt-5 rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">{t("collection.playToUnlock")}</p>
        ) : (
          <div className="mt-4 space-y-1.5">
            {facts.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="text-right font-semibold">{f.value}</span>
              </div>
            ))}
            {score < UNLOCK_TOTAL && (
              <p className="pt-1 text-center text-xs text-muted-foreground">{t("collection.moreToReveal")}</p>
            )}
            {cool.length > 0 && (
              <div className="mt-3 space-y-2">
                {cool.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
