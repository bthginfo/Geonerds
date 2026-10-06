"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Gamepad2, Swords, ArrowUpRight, Search, X } from "lucide-react";
import { GAMES } from "@/games/registry";
import { GAME_CATEGORIES } from "@/games/categories";
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
import { AdastraFeature } from "@/components/community/adastra-feature";
import { CommunityNotification } from "@/components/community/community-notification";

const CATEGORY_LABELS: Record<string, { de: string; en: string }> = {
  all: { de: "Alle", en: "All" },
  new: { de: "Neu", en: "New" },
  flags: { de: "Flaggen", en: "Flags" },
  maps: { de: "Karten", en: "Maps" },
  logic: { de: "Logik", en: "Logic" },
  knowledge: { de: "Wissen", en: "Knowledge" },
  expeditions: { de: "Routen", en: "Routes" },
};

export default function Home() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();
  const progression = useProgression();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const sections = useMemo(() => GAME_CATEGORIES.filter((group) => category === "all" || group.id === category).map((group) => ({
    ...group,
    entries: group.games.flatMap((id) => {
      const game = GAMES.find((entry) => entry.id === id);
      if (!game) return [];
      const searchText = `${t(`games.${id}.name`)} ${t(`games.${id}.short`)} ${group.name[locale]}`.toLocaleLowerCase(locale);
      return searchText.includes(query.trim().toLocaleLowerCase(locale)) ? [game] : [];
    }),
  })).filter((group) => group.entries.length > 0), [category, query, t, locale]);
  const visibleCount = sections.reduce((count, group) => count + group.entries.length, 0);
  const newSection = sections.find((group) => group.id === "new");
  const legacySections = sections.filter((group) => group.id !== "new");

  const gamesPlayed = progression.totalRuns || runs?.length || 0;
  const totalPoints = progression.totalScore || runs?.reduce((s, r) => s + r.score, 0) || 0;

  return (
    <div className="geo-aurora flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-5xl px-4 pt-3 pb-6 sm:pt-5">
        <FeedbackCallout />
        <CommunityNotification />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {t("app.tagline")}
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-7">
            <Link href="#games" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-primary px-7 text-base font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-150 hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <Gamepad2 aria-hidden="true" className="h-5 w-5" />
              {t("home.cta")}
            </Link>
          </div>
        </motion.div>

        {gamesPlayed > 0 && (
          <div className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-3">
            <StatTile label={t("home.gamesPlayed")} value={formatNumber(gamesPlayed, locale)} />
            <StatTile label={t("home.totalPoints")} value={formatNumber(totalPoints, locale)} />
          </div>
        )}

        {newSection && <section id="new-games" className="mx-auto mt-7 w-full max-w-3xl scroll-mt-20" aria-labelledby="category-new">
          <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden /><h2 id="category-new" className="text-base font-bold">{newSection.name[locale]}</h2><span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{newSection.entries.length}</span></div>
          {newSection.entries.map((game) => game.id === "adastra" ? <AdastraFeature key={game.id} /> : <GameCard key={game.id} game={game} />)}
        </section>}

        <div className="mx-auto mt-6 w-full max-w-2xl">
        <Link href="/challenges" className="group flex items-center gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Swords aria-hidden="true" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">{locale === "de" ? "Fordere jemanden heraus" : "Challenge a fellow explorer"}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{locale === "de" ? "Gleiche Fragen. Ihr spielt in eurem Tempo." : "Same questions. Play at your own pace."}</p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>

        <div className="mt-3 grid gap-3 sm:grid-cols-2"><DailyCard /><WeeklyCard /></div>
        <FieldJournal />
        </div>
      </section>

      <section id="games" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-24 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{locale === "de" ? "Dein Spielfeld ist die Welt" : "The world is your playground"}</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("home.chooseGame")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{GAMES.length} {locale === "de" ? "Spiele" : "games"} · {GAME_CATEGORIES.length} {locale === "de" ? "Themen" : "themes"}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label={locale === "de" ? "Spielthemen filtern" : "Filter game themes"}>
          {[{ id: "all", name: { de: "Alle Spiele", en: "All games" } }, ...GAME_CATEGORIES].map((group) => (
            <button key={group.id} type="button" aria-label={group.name[locale]} title={group.name[locale]} aria-pressed={category === group.id} onClick={() => { setCategory(group.id); if (group.id === "new") requestAnimationFrame(() => document.getElementById("new-games")?.scrollIntoView({ block: "start" })); }} className={cn("h-8 whitespace-nowrap rounded-full border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", category === group.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/50 hover:text-foreground")}>{CATEGORY_LABELS[group.id]?.[locale] ?? group.name[locale]}</button>
          ))}
        </div>
        <div className="relative mt-3 max-w-md">
          <label htmlFor="game-search" className="sr-only">{locale === "de" ? "Spiele suchen" : "Search games"}</label>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <input id="game-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "de" ? "Finde dein nächstes Spiel…" : "Find your next game…"} className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={locale === "de" ? "Suche leeren" : "Clear search"} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
        <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">{t(visibleCount === 1 ? "home.gamesFound.one" : "home.gamesFound.other", { n: visibleCount })}</p>
        {newSection && legacySections.length === 0 && <Link href="#new-games" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Neue Spiele oben entdecken" : "Explore new games above"}<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>}

        <div className="mt-8 space-y-10 sm:space-y-12">
          {legacySections.map((group) => {
            const Icon = group.icon;
            const ordinal = GAME_CATEGORIES.findIndex((entry) => entry.id === group.id) + 1;
            return <section key={group.id} aria-labelledby={`category-${group.id}`} className="scroll-mt-24">
              <div className="mb-4 flex items-start gap-3 border-b border-border/70 pb-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 id={`category-${group.id}`} className="text-lg font-bold sm:text-xl">{group.name[locale]}</h3><span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{group.entries.length}</span></div>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{group.description[locale]}</p>
                </div>
                <span aria-hidden="true" className="hidden text-3xl font-extrabold tabular-nums text-primary/20 sm:block">0{ordinal}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.entries.map((game, index) => <GameCard key={game.id} game={game} index={index} />)}</div>
            </section>;
          })}
          {sections.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center"><p className="font-semibold">{locale === "de" ? "Noch kein Treffer" : "No games found"}</p><p className="mt-2 text-sm text-muted-foreground">{locale === "de" ? "Versuche ein anderes Wort oder zeige alle Themen." : "Try a different word or explore every theme."}</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setCategory("all"); }}>{locale === "de" ? "Alle Spiele zeigen" : "Show all games"}</Button></div>}
        </div>
        <SupportCard />
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 text-center backdrop-blur-sm">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
