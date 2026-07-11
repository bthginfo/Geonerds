"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  Clock3,
  Crown,
  Globe2,
  Lightbulb,
  LoaderCircle,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Utensils,
  Users,
  X,
} from "lucide-react";
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
import { CountryOutline } from "@/components/map/country-outline";
import { countryDiscoveryPresentation } from "@/lib/country-discovery";
import type { Allergen, CountryCuisine, Diet } from "@/data/country-cuisines";
import type { CountryRecipe, CountryRecipePayload } from "@/data/country-recipe-types";

let recipeDataPromise: Promise<CountryRecipePayload> | null = null;

function loadRecipeData() {
  recipeDataPromise ??= fetch("/data/country-recipes.json", { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Recipe data request failed (${response.status})`);
      const payload = await response.json() as Partial<CountryRecipePayload>;
      if (payload.version !== 1 || !payload.countries || typeof payload.countries !== "object") {
        throw new Error("Unsupported recipe data payload");
      }
      return payload as CountryRecipePayload;
    });
  return recipeDataPromise;
}

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
          <input aria-label={t("collection.searchLabel")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={L("Search discovered countries", "Entdeckte Länder suchen")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
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
          const discovery = countryDiscoveryPresentation(c.cca3, st);
          const statusLabel = dexStatusLabel(st, locale);
          return (
            <button
              key={c.cca3}
              onClick={() => setSelected(c)}
              aria-label={locked
                ? t("collection.countryCardLocked", { number: String(dexNumber(c.cca3)).padStart(3, "0") })
                : t("collection.countryCard", {
                    country: countryName(c, locale),
                    status: statusLabel,
                    dish: discovery?.cuisine.dish[locale] ?? "",
                  })}
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
              {discovery && (
                <>
                  <span className="flex h-10 w-full items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 px-2 py-1" aria-hidden="true">
                    <CountryOutline cca3={c.cca3} decorative className="max-h-8" pathClassName="fill-sky-500 stroke-sky-700 dark:fill-sky-400 dark:stroke-sky-200" />
                  </span>
                  <span className="flex w-full min-w-0 items-center gap-1 text-left text-[10px] font-semibold leading-tight text-amber-700 dark:text-amber-300">
                    <Utensils className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{discovery.cuisine.dish[locale]}</span>
                  </span>
                </>
              )}
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

function dexStatusLabel(state: DexState, locale: "en" | "de") {
  const labels: Record<DexState, { en: string; de: string }> = {
    locked: { en: "Unknown", de: "Unbekannt" },
    discovered: { en: "Discovered", de: "Entdeckt" },
    researched: { en: "Researched", de: "Erforscht" },
    unlocked: { en: "Unlocked", de: "Freigeschaltet" },
    mastered: { en: "Mastered", de: "Gemeistert" },
  };
  return labels[state][locale];
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
  const locked = state === "locked";
  const unlocked = score >= UNLOCK_TOTAL;
  const facts = dexFacts(country, score, locale);
  const cool = dexCoolFacts(country, score, locale);
  const discovery = countryDiscoveryPresentation(country.cca3, state);
  const cuisine = discovery?.cuisine ?? null;
  const [view, setView] = useState<"country" | "recipe">("country");
  const [recipe, setRecipe] = useState<CountryRecipe | null>(null);
  const [recipeState, setRecipeState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const recipeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const backdropPressRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (view !== "recipe") return;
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>("[data-recipe-back]")?.focus());
  }, [view]);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, []);

  async function showRecipe() {
    if (!cuisine) return;
    setView("recipe");
    if (recipe) return;
    setRecipeState("loading");
    try {
      const recipeData = await loadRecipeData();
      const nextRecipe = recipeData.countries[country.cca3];
      if (!nextRecipe) throw new Error(`Missing recipe for ${country.cca3}`);
      setRecipe(nextRecipe);
      setRecipeState("ready");
    } catch {
      recipeDataPromise = null;
      setRecipeState("error");
    }
  }

  function backToCountry() {
    setView("country");
    requestAnimationFrame(() => recipeButtonRef.current?.focus());
  }

  const title = locked ? "???" : countryName(country, locale);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onPointerDown={(event) => { backdropPressRef.current = event.target === event.currentTarget; }}
      onPointerUp={(event) => {
        if (backdropPressRef.current && event.target === event.currentTarget) onClose();
        backdropPressRef.current = false;
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dex-dialog-title"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[88dvh] sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex min-h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2 sm:px-5">
          {view === "recipe" && (
            <button data-recipe-back onClick={backToCountry} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={t("collection.cuisine.backToCountry", { country: title })}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span className="hidden xs:inline">{t("common.back")}</span>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {view === "recipe" ? t("collection.cuisine.recipeLabel") : t("collection.title")}
            </p>
            <h2 id="dex-dialog-title" className="truncate text-base font-extrabold">
              {view === "recipe" && cuisine ? cuisine.dish[locale] : title}
            </h2>
          </div>
          {view === "country" && !locked && (
            <button onClick={onFavorite} aria-label={t("collection.toggleFavorite")} className="flex h-11 w-11 items-center justify-center rounded-xl text-amber-500 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Star className={cn("h-5 w-5", favorite && "fill-current")} aria-hidden="true" />
            </button>
          )}
          <button ref={closeRef} onClick={onClose} aria-label={t("common.close")} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
          {view === "recipe" && cuisine ? (
            <RecipeView cuisine={cuisine} recipe={recipe} state={recipeState} locale={locale} t={t} onRetry={showRecipe} />
          ) : (
            <CountryView
              country={country}
              score={score}
              games={games}
              state={state}
              perGame={perGame}
              locked={locked}
              unlocked={unlocked}
              cuisine={cuisine}
              facts={facts}
              cool={cool}
              locale={locale}
              t={t}
              recipeButtonRef={recipeButtonRef}
              onRecipe={showRecipe}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function CountryView({
  country, score, games, state, perGame, locked, unlocked, cuisine, facts, cool, locale, t, recipeButtonRef, onRecipe,
}: {
  country: Country; score: number; games: number; state: DexState; perGame: Record<string, number>;
  locked: boolean; unlocked: boolean; cuisine: CountryCuisine | null;
  facts: ReturnType<typeof dexFacts>; cool: string[]; locale: "en" | "de";
  t: (k: string, v?: Record<string, string | number>) => string;
  recipeButtonRef: React.RefObject<HTMLButtonElement | null>; onRecipe: () => void;
}) {
  const name = locked ? "???" : countryName(country, locale);
  return (
    <>
      {locked ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <span className="flex h-20 w-24 items-center justify-center rounded-xl bg-muted"><Lock className="h-7 w-7 text-muted-foreground" /></span>
          <p className="mt-4 text-sm text-muted-foreground">{t("collection.playToUnlock")}</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-[5fr_6fr] gap-3" aria-label={t("collection.cuisine.countryHero", { country: name })}>
            <div className="flex min-h-32 items-center rounded-2xl border border-border bg-muted/30 p-3">
              <FlagImage code={country.flag} alt="" className="aspect-[4/3] w-full rounded-lg shadow-sm" />
            </div>
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
              <CountryOutline cca3={country.cca3} decorative className="max-h-28" />
            </div>
          </section>

          <div className="mt-3">
            <div className="flex items-end justify-between gap-3 text-xs text-muted-foreground">
              <span>{dexStatusLabel(state, locale)}{games > 0 && ` · ${t("collection.fromGames", { n: games })}`}</span>
              <span className="font-bold tabular-nums">{Math.min(score, UNLOCK_TOTAL)}/{UNLOCK_TOTAL}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${Math.min(100, (score / UNLOCK_TOTAL) * 100)}%` }} />
            </div>
          </div>

          {cuisine && (
            <section className="mt-5 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
              <div className="flex items-start gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-amber-950 shadow-sm"><Utensils className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">{t("collection.cuisine.famousDish")}</p>
                  <h3 className="mt-0.5 text-lg font-extrabold leading-tight">{cuisine.dish[locale]}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{cuisine.blurb[locale]}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-amber-500/20 px-4 py-3">
                <MetaChip icon={Clock3} label={t("collection.cuisine.minutes", { n: cuisine.totalMinutes })} />
                <MetaChip icon={Users} label={t("collection.cuisine.servings", { n: cuisine.servings })} />
                <span className="rounded-lg bg-card/80 px-2.5 py-1.5 text-xs font-semibold">{dietLabel(cuisine.diet, t)}</span>
                {cuisine.allergens.map((allergen) => <span key={allergen} className="rounded-lg bg-card/80 px-2.5 py-1.5 text-xs font-semibold">{allergenLabel(allergen, t)}</span>)}
              </div>
              <div className="px-4 pb-4">
                <button ref={recipeButtonRef} onClick={onRecipe} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-amber-950 shadow-sm transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                  <Utensils className="h-4 w-4" aria-hidden="true" />{t("collection.cuisine.viewRecipe")}
                </button>
              </div>
            </section>
          )}

          <div className={cn("mt-5 rounded-2xl border p-3", state === "mastered" ? "border-amber-400 bg-amber-500/10" : "border-primary/30 bg-primary/5")}>
            <div className="flex items-center gap-2 font-bold">{state === "mastered" ? <Crown className="h-5 w-5 text-amber-500" /> : <Sparkles className="h-5 w-5 text-primary" />}{t("collection.passportMastery")}</div>
            <p className="mt-1 text-xs text-muted-foreground">{state === "mastered" ? t("collection.masteredAcrossGames") : t("collection.masteryGoal")}</p>
            {Object.keys(perGame).length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(perGame).sort((a,b) => b[1]-a[1]).map(([game, count]) => <span key={game} className="rounded-lg bg-card px-2 py-1 text-[11px] font-semibold">{game === "daily" ? t("daily.title") : game === "weekly" ? t("weekly.title") : t(`games.${game}.name`)} · {count}</span>)}</div>}
          </div>
          <div className="mt-3 space-y-1.5">
            {facts.map((fact) => <div key={fact.label} className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="text-muted-foreground">{fact.label}</span><span className="text-right font-semibold">{fact.value}</span></div>)}
            {!unlocked && <p className="pt-1 text-center text-xs text-muted-foreground">{t("collection.moreToReveal")}</p>}
          </div>
          {cool.length > 0 && <div className="mt-3 space-y-2">{cool.map((fact, index) => <div key={index} className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><span>{fact}</span></div>)}</div>}
        </>
      )}
    </>
  );
}

function RecipeView({ cuisine, recipe, state, locale, t, onRetry }: {
  cuisine: CountryCuisine; recipe: CountryRecipe | null; state: "idle" | "loading" | "error" | "ready";
  locale: "en" | "de"; t: (k: string, v?: Record<string, string | number>) => string; onRetry: () => void;
}) {
  if (state === "loading" || state === "idle") return <div className="flex min-h-64 flex-col items-center justify-center text-center" role="status"><LoaderCircle className="h-8 w-8 animate-spin text-amber-500" /><p className="mt-3 font-semibold">{t("collection.cuisine.loading")}</p></div>;
  if (state === "error" || !recipe) return <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center" role="alert"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="mt-3 font-bold">{t("collection.cuisine.error")}</p><button onClick={onRetry} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background"><RotateCcw className="h-4 w-4" />{t("common.retry")}</button></div>;
  return (
    <article>
      <p className="text-sm leading-relaxed text-muted-foreground">{cuisine.blurb[locale]}</p>
      <div className="mt-4 flex flex-wrap gap-1.5"><MetaChip icon={Clock3} label={t("collection.cuisine.minutes", { n: cuisine.totalMinutes })} /><MetaChip icon={Users} label={t("collection.cuisine.servings", { n: cuisine.servings })} /><span className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold">{dietLabel(cuisine.diet, t)}</span>{cuisine.allergens.map((allergen) => <span key={allergen} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold">{allergenLabel(allergen, t)}</span>)}</div>
      <section className="mt-6"><h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">{t("collection.cuisine.ingredients")}</h3><ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-background/60 px-4">{recipe.ingredients.map((item, index) => <li key={index} className="py-3 text-sm leading-relaxed">{item[locale]}</li>)}</ul></section>
      <section className="mt-6"><h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">{t("collection.cuisine.method")}</h3><ol className="mt-3 space-y-3">{recipe.steps.map((step, index) => <li key={index} className="grid grid-cols-[2rem_1fr] gap-3 rounded-2xl border border-border bg-background/60 p-3 text-sm leading-relaxed"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 font-extrabold text-amber-950">{index + 1}</span><span className="pt-1.5">{step[locale]}</span></li>)}</ol></section>
      {recipe.note && <aside className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed"><strong>{t("collection.cuisine.recipeNote")}: </strong>{recipe.note[locale]}</aside>}
      <aside className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" /><p><strong className="text-foreground">{t("collection.cuisine.safetyTitle")}: </strong>{t("collection.cuisine.safetyWarning")}</p></aside>
    </article>
  );
}

function MetaChip({ icon: Icon, label }: { icon: typeof Clock3; label: string }) {
  return <span className="inline-flex items-center gap-1 rounded-lg bg-card/80 px-2.5 py-1.5 text-xs font-semibold"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</span>;
}

function dietLabel(diet: Diet, t: (key: string) => string) {
  return t(`collection.cuisine.diet.${diet}`);
}

function allergenLabel(allergen: Allergen, t: (key: string) => string) {
  return t(`collection.cuisine.allergen.${allergen}`);
}
