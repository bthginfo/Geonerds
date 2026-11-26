"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Dices, Gem, Play, Search, Swords, Trophy, X } from "lucide-react";
import { GAMES, getGame, type GameConfig } from "@/games/registry";
import { getGameCategories } from "@/games/categories";
import { isFeaturedGame, nextFeatureTransition } from "@/games/featured";
import { dailyStreak, readDailyRecord } from "@/games/puzzle-kit";
import { DailyCard } from "@/components/daily-card";
import { WeeklyCard } from "@/components/weekly-card";
import { SupportCard } from "@/components/support-cta";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { cn, formatNumber } from "@/lib/utils";
import { levelFromXp } from "@/lib/level";
import { FieldJournal } from "@/components/field-journal";
import { useProgression } from "@/store/progression";
import { FeedbackCallout } from "@/components/community/feedback-callout";
import { CommunityNotification } from "@/components/community/community-notification";
import { GameTile, type GameTileMeta } from "@/components/home/game-tile";
import { DAILY_PUZZLE_IDS } from "@/components/home/daily-puzzle-list";
import { apiPopularGames } from "@/lib/play-stats-client";
import { FALLBACK_POPULAR } from "@/lib/play-stats";
import type { Difficulty, GameId } from "@/lib/types";

const CATEGORY_LABELS: Record<string, { de: string; en: string }> = {
  all: { de: "Alle", en: "All" }, new: { de: "Neu", en: "New" },
  flags: { de: "Flaggen", en: "Flags" }, puzzles: { de: "Rätsel", en: "Puzzles" }, maps: { de: "Karten", en: "Maps" },
  logic: { de: "Logik", en: "Logic" }, knowledge: { de: "Wissen", en: "Knowledge" },
};

const DAILY_PUZZLES = DAILY_PUZZLE_IDS;
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function useCatalogNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      const next = nextFeatureTransition(GAMES, current);
      if (next !== null) timer = setTimeout(refresh, Math.min(next - current, 2_147_483_647));
    };
    const onVisible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  return now;
}

function Shelf({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-0.5">
        <h2 id={id} className="text-lg font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const { t, locale } = useT();
  const de = locale === "de";
  const router = useRouter();
  const { runs } = useAllRuns();
  const progression = useProgression();
  const catalogNow = useCatalogNow();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [popular, setPopular] = useState<string[]>([...FALLBACK_POPULAR]);
  const [dailyState, setDailyState] = useState<Partial<Record<GameId, { solved: boolean; streak: number }>>>({});

  useEffect(() => {
    const controller = new AbortController();
    void apiPopularGames(controller.signal).then((games) => {
      const ids = games.map((game) => game.gameId).filter((id) => getGame(id));
      // Too few live counts: keep the editorial shelf rather than a sparse list.
      if (ids.length >= 4) setPopular([...ids, ...FALLBACK_POPULAR.filter((id) => !ids.includes(id))].slice(0, 8));
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const read = () => setDailyState(Object.fromEntries(DAILY_PUZZLES.map((id) => [id, {
      solved: DIFFICULTIES.some((difficulty) => readDailyRecord(id, difficulty)),
      streak: dailyStreak(id),
    }])));
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, []);

  const bestByGame = useMemo(() => {
    const best: Record<string, number> = {};
    for (const run of runs ?? []) best[run.gameId] = Math.max(best[run.gameId] ?? 0, run.score);
    return best;
  }, [runs]);

  const metaFor = (game: GameConfig, extra: GameTileMeta = {}): GameTileMeta => ({
    best: bestByGame[game.id],
    isNew: isFeaturedGame(game, catalogNow),
    daily: DAILY_PUZZLES.includes(game.id),
    solvedToday: dailyState[game.id]?.solved,
    streak: dailyState[game.id]?.streak || undefined,
    ...extra,
  });

  const categories = useMemo(() => getGameCategories(catalogNow), [catalogNow]);
  const activeCategory = category === "new" && !categories.some((group) => group.id === "new") ? "all" : category;
  const needle = query.trim().toLocaleLowerCase(locale);
  const sections = useMemo(() => categories.filter((group) => activeCategory === "all" || group.id === activeCategory).map((group) => ({
    ...group,
    entries: group.games.flatMap((id) => {
      const game = getGame(id);
      if (!game) return [];
      const searchable = `${t(`games.${id}.name`)} ${t(`games.${id}.short`)} ${group.name[locale]}`.toLocaleLowerCase(locale);
      return searchable.includes(needle) ? [game] : [];
    }),
  })).filter((group) => group.entries.length > 0), [categories, activeCategory, needle, t, locale]);
  const visibleCount = sections.reduce((count, group) => count + group.entries.length, 0);

  const gamesPlayed = progression.totalRuns || runs?.length || 0;
  const totalPoints = progression.totalScore || runs?.reduce((sum, run) => sum + run.score, 0) || 0;
  const level = levelFromXp(totalPoints);
  const nextPuzzle = DAILY_PUZZLES.find((id) => !dailyState[id]?.solved) ?? DAILY_PUZZLES[0];
  const puzzlesSolved = DAILY_PUZZLES.filter((id) => dailyState[id]?.solved).length;

  function surpriseMe() {
    const pool = GAMES.filter((game) => !DAILY_PUZZLES.includes(game.id));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(`/play/${pick.id}`);
  }

  return (
    <div className="geo-page flex-1">
      <CommunityNotification />

      <section aria-labelledby="home-title" className="geo-hero relative mb-8 overflow-hidden rounded-[28px] px-5 py-7 text-white sm:px-8 sm:py-9">
        <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -right-24 -top-16 h-[22rem] w-[22rem] text-white/15 sm:-right-10 sm:-top-24 sm:h-[30rem] sm:w-[30rem]">
          <g fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="200" cy="200" r="180" />
            <ellipse cx="200" cy="200" rx="120" ry="180" />
            <ellipse cx="200" cy="200" rx="56" ry="180" />
            <path d="M20 200h360M40 120h320M40 280h320M90 56h220M90 344h220" />
          </g>
        </svg>
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">GeoNerds</p>
          <h1 id="home-title" className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
            {de ? "Die Welt spielend kennen." : "Play your way around the world."}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85">
            {de
              ? `${GAMES.length} Geografie-Spiele mit Flaggen, Karten, Wörtern und Logik. Jeden Tag warten neue Rätsel.`
              : `${GAMES.length} geography games with flags, maps, words and logic. New puzzles every day.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href={`/play/${nextPuzzle}`} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-slate-900 shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none">
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {puzzlesSolved === DAILY_PUZZLES.length ? (de ? "Rätsel noch einmal" : "Replay a puzzle") : (de ? "Tagesrätsel spielen" : "Play today's puzzle")}
            </Link>
            <button type="button" onClick={surpriseMe} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white/15 px-5 text-sm font-bold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Dices className="h-4 w-4" aria-hidden />
              {de ? "Überrasch mich" : "Surprise me"}
            </button>
          </div>
          {gamesPlayed > 0 && (
            <dl className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
              <div className="rounded-full bg-black/20 px-3 py-1.5"><dt className="sr-only">{de ? "Stufe" : "Level"}</dt><dd>{de ? "Stufe" : "Level"} {level.level}</dd></div>
              <div className="rounded-full bg-black/20 px-3 py-1.5 tabular-nums"><dt className="sr-only">{t("home.totalPoints")}</dt><dd>{formatNumber(totalPoints, locale)} {t("home.totalPoints")}</dd></div>
              <div className="rounded-full bg-black/20 px-3 py-1.5 tabular-nums"><dt className="sr-only">{t("home.gamesPlayed")}</dt><dd>{formatNumber(gamesPlayed, locale)} {t("home.gamesPlayed")}</dd></div>
            </dl>
          )}
        </div>
      </section>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <div className="min-w-0 space-y-10">
          <Shelf
            id="today-title"
            title={de ? "Heute" : "Today"}
            action={<p className="text-xs font-semibold tabular-nums text-muted-foreground">{de ? `${puzzlesSolved} von ${DAILY_PUZZLES.length} gelöst` : `${puzzlesSolved} of ${DAILY_PUZZLES.length} solved`}</p>}
          >
            <div className="geo-shelf -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
              {DAILY_PUZZLES.map((id) => getGame(id)).filter((game): game is GameConfig => Boolean(game)).map((game) => (
                <GameTile key={game.id} game={game} size="lg" meta={metaFor(game)} className="w-[74%] shrink-0 snap-start sm:w-auto" />
              ))}
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl bg-card sm:grid sm:grid-cols-2 sm:[&>*+*]:border-l sm:[&>*+*]:border-t-0 sm:[&>*]:border-border">
              <DailyCard />
              <WeeklyCard />
            </div>
          </Shelf>

          <Shelf id="popular-title" title={de ? "Beliebt diese Woche" : "Popular this week"}>
            <div className="geo-shelf -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
              {popular.map((id) => getGame(id)).filter((game): game is GameConfig => Boolean(game)).slice(0, 8).map((game, index) => (
                <GameTile key={game.id} game={game} meta={metaFor(game, { rank: index + 1 })} className={cn("w-44 shrink-0 snap-start sm:w-auto", index >= 4 && "sm:hidden")} />
              ))}
            </div>
          </Shelf>

          <section id="games" aria-labelledby="game-library-title" className="min-w-0 scroll-mt-24">
            <div className="mb-3 flex items-baseline justify-between gap-3 px-0.5">
              <h2 id="game-library-title" className="text-lg font-bold tracking-tight">{de ? "Alle Spiele" : "All games"}</h2>
              <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">{t(visibleCount === 1 ? "home.gamesFound.one" : "home.gamesFound.other", { n: visibleCount })}</p>
            </div>
            <div className="relative">
              <label htmlFor="game-search" className="sr-only">{de ? "Spiele suchen" : "Search games"}</label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
              <input id="game-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={de ? "Spiel oder Thema suchen" : "Search games or topics"} autoComplete="off" className="h-12 w-full rounded-2xl bg-card pl-11 pr-12 text-base text-foreground shadow-sm outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
              {query && <button type="button" onClick={() => { setQuery(""); document.getElementById("game-search")?.focus(); }} aria-label={de ? "Suche leeren" : "Clear search"} className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"><X aria-hidden="true" className="h-4 w-4" /></button>}
            </div>
            <div className="geo-category-scroll -mx-1 mt-2 flex overflow-x-auto px-1 pb-1" role="group" aria-label={de ? "Spielthemen filtern" : "Filter game topics"}>
              {[{ id: "all", name: { de: "Alle Spiele", en: "All games" } }, ...categories].map((group) => (
                <button key={group.id} type="button" aria-label={group.name[locale]} title={group.name[locale]} aria-pressed={activeCategory === group.id} onClick={() => setCategory(group.id)} className="flex min-h-11 shrink-0 items-center rounded-full px-1 py-1.5 focus-visible:outline-offset-0">
                  <span className={cn("inline-flex min-h-8 items-center whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition-colors", activeCategory === group.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground")}>{CATEGORY_LABELS[group.id]?.[locale] ?? group.name[locale]}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-8">
              {sections.map((group) => (
                <section key={group.id} id={group.id === "new" ? "new-games" : undefined} aria-labelledby={`category-${group.id}`} className="scroll-mt-24">
                  <div className="mb-3 px-0.5">
                    <h3 id={`category-${group.id}`} className="text-[15px] font-bold">{group.name[locale]}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{group.description[locale]}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {group.entries.map((game) => <GameTile key={game.id} game={game} meta={metaFor(game)} />)}
                  </div>
                </section>
              ))}
              {sections.length === 0 && (
                <div className="geo-surface px-5 py-10 text-center">
                  <Search aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                  <h3 className="font-semibold">{de ? "Kein passendes Spiel gefunden" : "No matching games"}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{de ? "Versuche ein anderes Wort oder öffne wieder alle Themen." : "Try another search, or bring every topic back."}</p>
                  <Button variant="secondary" className="mt-5" onClick={() => { setQuery(""); setCategory("all"); }}>{de ? "Alle Spiele zeigen" : "Show all games"}</Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside aria-label={de ? "Deine Herausforderungen und Fortschritte" : "Your challenges and progress"} className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <Link href="/challenges" className="geo-tile group flex items-center gap-3 rounded-2xl bg-card p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white"><Swords className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{de ? "Lust auf ein Duell?" : "Ready for a duel?"}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{de ? "Fordere andere GeoNerds heraus oder starte sofort gegen einen Bot." : "Challenge another GeoNerd, or start right away against a bot."}</span>
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </Link>
          <FieldJournal />
          <div className="grid grid-cols-2 gap-3">
            <Link href="/collection" className="geo-tile flex min-h-20 flex-col justify-between rounded-2xl bg-card p-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Gem className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />{de ? "Ländersammlung" : "Country collection"}</Link>
            <Link href="/leaderboard" className="geo-tile flex min-h-20 flex-col justify-between rounded-2xl bg-card p-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />{de ? "Ranglisten" : "Leaderboards"}</Link>
          </div>
          <FeedbackCallout />
          <SupportCard />
        </aside>
      </div>
    </div>
  );
}
