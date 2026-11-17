"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Swords, X } from "lucide-react";
import { GAMES } from "@/games/registry";
import { getGameCategories } from "@/games/categories";
import { nextFeatureTransition } from "@/games/featured";
import { GameCard } from "@/components/game-card";
import { DailyCard } from "@/components/daily-card";
import { WeeklyCard } from "@/components/weekly-card";
import { SupportCard } from "@/components/support-cta";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { cn, formatNumber } from "@/lib/utils";
import { FieldJournal } from "@/components/field-journal";
import { useProgression } from "@/store/progression";
import { FeedbackCallout } from "@/components/community/feedback-callout";
import { CommunityNotification } from "@/components/community/community-notification";

const CATEGORY_LABELS: Record<string, { de: string; en: string }> = {
  all: { de: "Alle", en: "All" }, new: { de: "Neu", en: "New" },
  flags: { de: "Flaggen", en: "Flags" }, maps: { de: "Karten", en: "Maps" },
  logic: { de: "Logik", en: "Logic" }, knowledge: { de: "Wissen", en: "Knowledge" },
  expeditions: { de: "Routen", en: "Routes" },
};

export default function Home() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();
  const progression = useProgression();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [catalogNow, setCatalogNow] = useState<number | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now();
      setCatalogNow(now);
      const next = nextFeatureTransition(GAMES, now);
      if (next !== null) timer = setTimeout(refresh, Math.min(next - now, 2_147_483_647));
    };
    const onVisible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  const categories = useMemo(() => getGameCategories(catalogNow), [catalogNow]);
  const activeCategory = category === "new" && !categories.some((group) => group.id === "new") ? "all" : category;
  const sections = useMemo(() => categories.filter((group) => activeCategory === "all" || group.id === activeCategory).map((group) => ({
    ...group,
    entries: group.games.flatMap((id) => {
      const game = GAMES.find((entry) => entry.id === id);
      if (!game) return [];
      const searchable = `${t(`games.${id}.name`)} ${t(`games.${id}.short`)} ${group.name[locale]}`.toLocaleLowerCase(locale);
      return searchable.includes(query.trim().toLocaleLowerCase(locale)) ? [game] : [];
    }),
  })).filter((group) => group.entries.length > 0), [categories, activeCategory, query, t, locale]);
  const visibleCount = sections.reduce((count, group) => count + group.entries.length, 0);
  const gamesPlayed = progression.totalRuns || runs?.length || 0;
  const totalPoints = progression.totalScore || runs?.reduce((sum, run) => sum + run.score, 0) || 0;

  return (
    <div className="geo-page flex-1">
      <CommunityNotification />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{locale === "de" ? "Einfach die Welt entdecken." : "A little more world. Every day."}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Wähle ein Spiel, finde deinen Rhythmus und lerne mit jeder Runde dazu." : "Pick a game, find your rhythm, and learn something with every round."}</p>
        </div>
        {gamesPlayed > 0 && <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{formatNumber(gamesPlayed, locale)}</span> {t("home.gamesPlayed")}<span aria-hidden="true" className="mx-2">·</span><span className="font-semibold tabular-nums text-foreground">{formatNumber(totalPoints, locale)}</span> {t("home.totalPoints")}</p>}
      </div>

      <FeedbackCallout />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-7">
        <section id="games" className="min-w-0 scroll-mt-24" aria-labelledby="game-library-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="game-library-title" className="text-xl font-bold tracking-tight">{t("home.chooseGame")}</h2>
            <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">{t(visibleCount === 1 ? "home.gamesFound.one" : "home.gamesFound.other", { n: visibleCount })}</p>
          </div>

          <div className="relative">
            <label htmlFor="game-search" className="sr-only">{locale === "de" ? "Spiele suchen" : "Search games"}</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
            <input id="game-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "de" ? "Spiel oder Thema suchen" : "Search games or topics"} autoComplete="off" className="h-12 w-full rounded-2xl bg-muted/80 pl-11 pr-12 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
            {query && <button type="button" onClick={() => { setQuery(""); document.getElementById("game-search")?.focus(); }} aria-label={locale === "de" ? "Suche leeren" : "Clear search"} className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"><X aria-hidden="true" className="h-4 w-4" /></button>}
          </div>

          <div className="geo-category-scroll -mx-1 mt-2 flex overflow-x-auto px-1 pb-1" role="group" aria-label={locale === "de" ? "Spielthemen filtern" : "Filter game topics"}>
            {[{ id: "all", name: { de: "Alle Spiele", en: "All games" } }, ...categories].map((group) => <button key={group.id} type="button" aria-label={group.name[locale]} title={group.name[locale]} aria-pressed={activeCategory === group.id} onClick={() => setCategory(group.id)} className="flex min-h-11 shrink-0 items-center rounded-full px-1 py-1.5 focus-visible:outline-offset-0"><span className={cn("inline-flex min-h-8 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors", activeCategory === group.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{CATEGORY_LABELS[group.id]?.[locale] ?? group.name[locale]}</span></button>)}
          </div>

          <div className="mt-4 space-y-7">
            {sections.map((group) => <section key={group.id} id={group.id === "new" ? "new-games" : undefined} aria-labelledby={`category-${group.id}`} className="scroll-mt-24">
              <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
                <h3 id={`category-${group.id}`} className="text-sm font-semibold text-muted-foreground">{group.name[locale]}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">{group.entries.length}</span>
              </div>
              <div className="overflow-hidden rounded-2xl bg-card">{group.entries.map((game) => <GameCard key={game.id} game={game} />)}</div>
            </section>)}
            {sections.length === 0 && <div className="geo-surface px-5 py-10 text-center"><Search aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><h3 className="font-semibold">{locale === "de" ? "Kein passendes Spiel gefunden" : "No matching games"}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Versuche ein anderes Wort oder öffne wieder alle Themen." : "Try another search, or bring every topic back."}</p><Button variant="secondary" className="mt-5" onClick={() => { setQuery(""); setCategory("all"); }}>{locale === "de" ? "Alle Spiele zeigen" : "Show all games"}</Button></div>}
          </div>
        </section>

        <aside aria-label={locale === "de" ? "Deine Herausforderungen und Fortschritte" : "Your challenges and progress"} className="min-w-0 space-y-3 lg:sticky lg:top-24">
          <h2 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">{locale === "de" ? "Heute für dich" : "Your next adventure"}</h2>
          <div className="overflow-hidden rounded-2xl bg-card"><DailyCard /><WeeklyCard /><Link href="/challenges" className="geo-game-row group flex min-h-20 items-center gap-3 px-4 py-3"><Swords aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{locale === "de" ? "Lust auf ein Duell?" : "Ready for a duel?"}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Mit anderen GeoNerds oder sofort gegen einen Bot." : "Play another GeoNerd, or start with a bot now."}</p></div><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" /></Link></div>
          <FieldJournal />
          <Link href="/collection" className="group flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">{locale === "de" ? "Deine Ländersammlung" : "Your country collection"}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          <SupportCard />
        </aside>
      </div>
    </div>
  );
}
