"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock, Sparkles, Lightbulb, X, Globe2, Search, Crown, Star } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useDex } from "@/store/dex";
import { countryName } from "@/data/countries";
import { FlagImage } from "@/components/flag-image";
import {
  dexScore,
  dexStateOf,
  dexGameCount,
  dexNumber,
  dexFacts,
  dexCoolFacts,
  UNLOCK_TOTAL,
  continentProgress,
  continentName,
  continentBlurb,
  DEX_POOL,
  type DexState,
} from "@/lib/dex";
import type { Country } from "@/lib/types";
import { cn } from "@/lib/utils";

const POOL = DEX_POOL;

export default function CollectionPage() {
  const { t, locale } = useT();
  const hits = useDex((s) => s.hits);
  const [selected, setSelected] = useState<Country | null>(null);
  const [view, setView] = useState<"countries" | "continents">("countries");
  const [query, setQuery] = useState("");
  const [continent, setContinent] = useState("all");
  const [status, setStatus] = useState<"all" | DexState>("all");
  const [sort, setSort] = useState<"number" | "name" | "progress">("number");
  const favorites = useDex((s) => s.favorites);
  const toggleFavorite = useDex((s) => s.toggleFavorite);
  const L = (en: string, de: string) => locale === "de" ? de : en;

  const sorted = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return [...POOL]
      .map((c) => ({ c, score: dexScore(hits[c.cca3]) }))
      .filter(({ c }) => !needle || (dexStateOf(hits[c.cca3]) !== "locked" && countryName(c, locale).toLocaleLowerCase(locale).includes(needle)))
      .filter(({ c }) => continent === "all" || c.region === continent)
      .filter(({ c }) => status === "all" || dexStateOf(hits[c.cca3]) === status)
      .sort((a, b) => sort === "progress" ? b.score - a.score || dexNumber(a.c.cca3) - dexNumber(b.c.cca3) : sort === "name" ? countryName(a.c, locale).localeCompare(countryName(b.c, locale)) : dexNumber(a.c.cca3) - dexNumber(b.c.cca3))
      .map((x) => x.c);
  }, [hits, locale, query, continent, status, sort]);

  const stats = useMemo(() => {
    let unlocked = 0;
    let discovered = 0;
    let mastered = 0;
    for (const c of POOL) {
      const st = dexStateOf(hits[c.cca3]);
      if (st !== "locked") discovered++;
      if (st === "unlocked" || st === "mastered") unlocked++;
      if (st === "mastered") mastered++;
    }
    return { unlocked, discovered, mastered, total: POOL.length };
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
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
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
          <div className="rounded-xl bg-amber-500/10 py-2">
            <div className="text-lg font-extrabold text-amber-500">{stats.mastered}</div>
            <div className="text-[11px] text-muted-foreground">{L("Mastered", "Gemeistert")}</div>
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
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center tabular-nums">
                  <div className="rounded-lg bg-primary/10 px-1 py-1.5"><div className="text-xs font-extrabold text-primary">{cp.discovered}/{cp.total}</div><div className="text-[9px] text-muted-foreground">{L("Discovered", "Entdeckt")}</div></div>
                  <div className="rounded-lg bg-success/10 px-1 py-1.5"><div className="text-xs font-extrabold text-success">{cp.unlocked}/{cp.total}</div><div className="text-[9px] text-muted-foreground">{L("Unlocked", "Freigeschaltet")}</div></div>
                  <div className="rounded-lg bg-amber-500/10 px-1 py-1.5"><div className="text-xs font-extrabold text-amber-500">{cp.mastered}/{cp.total}</div><div className="text-[9px] text-muted-foreground">{L("Mastered", "Gemeistert")}</div></div>
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
      <>
      <div className="mt-5 space-y-2 rounded-2xl border border-border bg-card p-3">
        <label className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={L("Search discovered countries", "Entdeckte Länder suchen")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <select aria-label={L("Continent", "Kontinent")} value={continent} onChange={(event) => setContinent(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-2 text-xs">
            <option value="all">{L("All continents", "Alle Kontinente")}</option>
            {["Europe", "Asia", "Africa", "Americas", "Oceania"].map((region) => <option key={region} value={region}>{continentName(region, locale)}</option>)}
          </select>
          <select aria-label={L("Status", "Status")} value={status} onChange={(event) => setStatus(event.target.value as "all" | DexState)} className="min-h-11 rounded-xl border border-border bg-background px-2 text-xs">
            <option value="all">{L("All statuses", "Alle Status")}</option>
            <option value="locked">{L("Unknown", "Unbekannt")}</option><option value="discovered">{L("Discovered", "Entdeckt")}</option><option value="researched">{L("Researched", "Erforscht")}</option><option value="unlocked">{L("Unlocked", "Freigeschaltet")}</option><option value="mastered">{L("Mastered", "Gemeistert")}</option>
          </select>
          <select aria-label={L("Sort", "Sortierung")} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="min-h-11 rounded-xl border border-border bg-background px-2 text-xs">
            <option value="number">{L("Number", "Nummer")}</option><option value="name">{L("Name", "Name")}</option><option value="progress">{L("Progress", "Fortschritt")}</option>
          </select>
        </div>
      </div>
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
                st === "mastered"
                  ? "border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,.25)]"
                  : st === "unlocked"
                  ? "border-success/40 bg-success/5"
                  : st !== "locked"
                  ? "border-border bg-card hover:border-primary/40"
                  : "border-dashed border-border bg-muted/30"
              )}
            >
              <div className="relative w-full">
                {locked ? (
                  <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </span>
                ) : <FlagImage code={c.flag} alt="" className="aspect-[4/3] w-full shadow-sm transition" />}
                {st === "mastered" && <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow"><Crown className="h-3.5 w-3.5" /></span>}
                {st === "unlocked" && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shadow">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div className="w-full truncate text-xs font-semibold">
                {locked ? "???" : countryName(c, locale)}
              </div>
              <div className="text-[9px] font-bold tabular-nums text-muted-foreground">#{String(dexNumber(c.cca3)).padStart(3, "0")} · {dexGameCount(hits[c.cca3])} {L("games", "Spiele")}</div>
              {/* progress pips */}
              {!locked && st !== "unlocked" && st !== "mastered" && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(score / UNLOCK_TOTAL) * 100}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      </>
      )}

      {selected && <DetailModal country={selected} score={dexScore(hits[selected.cca3])} games={dexGameCount(hits[selected.cca3])} state={dexStateOf(hits[selected.cca3])} perGame={hits[selected.cca3] ?? {}} favorite={favorites.includes(selected.cca3)} onFavorite={() => toggleFavorite(selected.cca3)} onClose={() => setSelected(null)} locale={locale} t={t} />}
    </div>
  );
}

function DetailModal({
  country,
  score,
  games,
  state,
  perGame,
  favorite,
  onFavorite,
  onClose,
  locale,
  t,
}: {
  country: Country;
  score: number;
  games: number;
  state: DexState;
  perGame: Record<string, number>;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
  locale: "en" | "de";
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const locked = score <= 0;
  const unlocked = score >= UNLOCK_TOTAL;
  const L = (en: string, de: string) => locale === "de" ? de : en;
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
          {locked ? <span className="flex aspect-[4/3] w-20 shrink-0 items-center justify-center rounded bg-muted"><Lock className="h-6 w-6 text-muted-foreground" /></span> : <FlagImage code={country.flag} alt="" className="aspect-[4/3] w-20 shrink-0 rounded shadow" />}
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">{locked ? "???" : countryName(country, locale)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {state === "mastered" ? L("Mastered", "Gemeistert") : unlocked ? t("collection.complete") : t("collection.progress", { n: Math.min(score, UNLOCK_TOTAL), total: UNLOCK_TOTAL })}
              {games > 0 && ` · ${t("collection.fromGames", { n: games })}`}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${Math.min(100, (score / UNLOCK_TOTAL) * 100)}%` }} />
            </div>
          </div>
          {!locked && <button onClick={onFavorite} aria-label={L("Toggle favorite", "Favorit umschalten")} className="min-h-11 min-w-11 rounded-full p-2 text-amber-500 hover:bg-muted"><Star className={cn("h-5 w-5", favorite && "fill-current")} /></button>}
          <button onClick={onClose} aria-label={L("Close", "Schließen")} className="min-h-11 min-w-11 rounded-full p-2 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {locked ? (
          <p className="mt-5 rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">{t("collection.playToUnlock")}</p>
        ) : (
          <div className="mt-4 space-y-1.5">
            <div className={cn("mb-3 rounded-2xl border p-3", state === "mastered" ? "border-amber-400 bg-amber-500/10" : "border-primary/30 bg-primary/5")}>
              <div className="flex items-center gap-2 font-bold">{state === "mastered" ? <Crown className="h-5 w-5 text-amber-500" /> : <Sparkles className="h-5 w-5 text-primary" />}{L("Passport mastery", "Pass-Meisterschaft")}</div>
              <p className="mt-1 text-xs text-muted-foreground">{state === "mastered" ? L("Mastered across four or more games.", "In mindestens vier Spielen gemeistert.") : L("Reach 20 encounters across four games to master this country.", "Erreiche 20 Begegnungen in vier Spielen, um dieses Land zu meistern.")}</p>
              {Object.keys(perGame).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(perGame).sort((a,b) => b[1]-a[1]).map(([game, count]) => <span key={game} className="rounded-lg bg-card px-2 py-1 text-[11px] font-semibold">{game === "daily" ? t("daily.title") : game === "weekly" ? t("weekly.title") : t(`games.${game}.name`)} · {count}</span>)}</div>}
            </div>
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
