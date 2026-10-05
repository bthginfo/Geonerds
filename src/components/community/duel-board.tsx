"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Crown, Loader2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { DUEL_DRAW_POINTS, DUEL_WIN_POINTS, type DuelStanding } from "@/lib/community";
import { apiDuelStandings, type DuelStandingsResult } from "@/lib/community-online";
import type { GeoChallengeGameId } from "@/lib/challenges";
import { cn, formatNumber } from "@/lib/utils";
import { useAuth } from "@/store/auth";

export function DuelBoard({ game, period, page, onPage }: {
  game: GeoChallengeGameId | "all";
  period: "all" | "month";
  page: number;
  onPage: (page: number) => void;
}) {
  const { t, locale } = useT();
  const user = useAuth((state) => state.user);
  const de = locale === "de";
  const key = `${game}:${period}:${page}`;
  const [response, setResponse] = useState<{ key: string; result: DuelStandingsResult | null }>({ key: "", result: null });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setResponse({ key, result: null });
    void apiDuelStandings(game, period, page, controller.signal).then((result) => {
      if (!controller.signal.aborted) setResponse({ key, result });
    });
    return () => { controller.abort(); };
  }, [game, period, page, retry, key]);

  const result = response.key === key ? response.result : null;
  const loading = result === null;
  const standings = result?.ok ? result.standings : [];
  const champion = page === 0 ? standings[0] : undefined;
  const sharedLead = champion?.rank === 1 && standings[1]?.rank === 1;

  return (
    <section aria-label={de ? "Duell-Bestenliste" : "Duel standings"}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="text-xs leading-relaxed"><p className="font-semibold">{de ? "Gleiche Fragen. Echte Begegnungen." : "Same questions. Real encounters."}</p><p className="mt-1 text-muted-foreground">{de ? `${DUEL_WIN_POINTS} Punkte pro Sieg · ${DUEL_DRAW_POINTS} Punkt pro Remis` : `${DUEL_WIN_POINTS} points per win · ${DUEL_DRAW_POINTS} point per draw`}</p><p className="mt-1 text-muted-foreground">{de ? "Nur abgeschlossene Duelle zählen. Bei Gleichstand wird der Rang geteilt." : "Only completed duels count. Equal results share a rank."}</p></div>
        <Link href="/challenges" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{de ? "Zu den Herausforderungen" : "Go to challenges"}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
      </div>
      {loading ? (
        <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{de ? "Duelle werden geladen …" : "Loading duel standings …"}</p>
      ) : !result?.ok ? (
        <BoardState title={de ? "Duelle gerade nicht verfügbar" : "Duels currently unavailable"}>
          <p role="alert">{result?.error === "network_error" ? (de ? "Die Verbindung ist unterbrochen. Deine Rangliste konnte nicht geladen werden." : "The connection was interrupted. The standings couldn't be loaded.") : (de ? "Die Online-Rangliste konnte nicht geladen werden. Bitte versuche es später erneut." : "The online standings couldn't be loaded. Please try again later.")}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setRetry((value) => value + 1)}>{de ? "Erneut versuchen" : "Try again"}</Button>
        </BoardState>
      ) : !result.configured ? (
        <BoardState title={de ? "Online-Duelle sind noch nicht verbunden" : "Online duels aren't connected yet"}>
          <p>{de ? "Ohne Online-Datenbank gibt es noch keine gemeinsame Duell-Rangliste. Hier werden keine Geräteergebnisse als Online-Duelle angezeigt." : "The shared duel standings need the online database. Device scores are not shown here as online duels."}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setRetry((value) => value + 1)}>{de ? "Erneut prüfen" : "Check again"}</Button>
        </BoardState>
      ) : standings.length === 0 ? (
        <BoardState title={de ? "Der erste Rang ist noch offen" : "The first rank is still up for grabs"}>
          <Swords aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-primary/60" />
          <p>{de ? "Für diese Auswahl ist noch kein Duell abgeschlossen. Fordere jemanden heraus – sobald ihr beide fertig seid, zählt eure Begegnung." : "No duels have been completed for these filters yet. Challenge someone: once both of you finish, your encounter counts."}</p>
          <Link href="/challenges" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Swords aria-hidden="true" className="h-4 w-4" />{de ? "Duell starten" : "Start a duel"}</Link>
          {page > 0 && <Button type="button" variant="outline" className="mt-3" onClick={() => onPage(page - 1)}>{de ? "Zur vorherigen Seite" : "Back to previous page"}</Button>}
        </BoardState>
      ) : (
        <>
          {champion && <div className="mb-3 flex items-center gap-3 rounded-2xl border border-warning/40 bg-gradient-to-br from-warning/15 to-amber-500/10 p-3 sm:p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow"><Crown aria-hidden="true" className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">{sharedLead ? (de ? "Geteilte Führung" : "Shared lead") : period === "month" ? (de ? "Duell-Champion des Monats" : "Duel champion this month") : (de ? "Duell-Champion" : "Duel champion")}</p><Link href={`/u/${encodeURIComponent(champion.name)}`} className="mt-1 block break-words text-lg font-bold leading-tight hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{champion.name}</Link></div>
            <div className="shrink-0 text-right"><p className="text-xl font-extrabold tabular-nums">{formatNumber(champion.points, locale)}</p><p className="text-[10px] text-muted-foreground">{de ? "Punkte" : "points"}</p></div>
          </div>}
          <ol className="overflow-hidden rounded-2xl border border-border bg-card" aria-label={de ? "Platzierungen" : "Rankings"}>
            {standings.map((standing, index) => <DuelRow key={standing.name} standing={standing} own={user?.name.toLowerCase() === standing.name.toLowerCase()} last={index === standings.length - 1} locale={locale} />)}
          </ol>
          {(page > 0 || result.hasMore) && <nav aria-label={de ? "Duell-Bestenliste: Seiten" : "Duel leaderboard pagination"} className="mt-4 flex items-center justify-between gap-2"><Button type="button" variant="outline" className="min-h-11 px-3" disabled={page === 0} onClick={() => onPage(page - 1)}>{t("leaderboard.prev")}</Button><span className="text-xs tabular-nums text-muted-foreground">{t("leaderboard.page", { n: page + 1 })}</span><Button type="button" variant="outline" className="min-h-11 px-3" disabled={!result.hasMore} onClick={() => onPage(page + 1)}>{t("leaderboard.next")}</Button></nav>}
        </>
      )}
    </section>
  );
}

function DuelRow({ standing, own, last, locale }: { standing: DuelStanding; own: boolean; last: boolean; locale: string }) {
  const de = locale === "de";
  const stats = [
    { label: de ? "Siege" : "Wins", value: standing.wins },
    { label: de ? "Remis" : "Draws", value: standing.draws },
    { label: de ? "Niederlagen" : "Losses", value: standing.losses },
    { label: de ? "Siegquote" : "Win rate", value: `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(standing.winRate)} %` },
    { label: de ? "Duelle" : "Played", value: standing.played },
    { label: de ? "Gegner" : "Opponents", value: standing.opponents },
  ];

  return <li className={cn("p-4", !last && "border-b border-border/60", own && "bg-primary/5")}>
    <div className="flex items-center gap-3"><span aria-label={`${de ? "Rang" : "Rank"} ${standing.rank}`} className={cn("w-7 shrink-0 text-center text-sm font-bold tabular-nums", standing.rank === 1 ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>{standing.rank}</span><div className="min-w-0 flex-1"><Link href={`/u/${encodeURIComponent(standing.name)}`} className="break-words text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{standing.name}</Link>{own && <span className="ml-2 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{de ? "Du" : "You"}</span>}</div><div className="shrink-0 text-right"><p className="font-extrabold tabular-nums">{formatNumber(standing.points, locale)}</p><p className="text-[10px] text-muted-foreground">{de ? "Punkte" : "points"}</p></div></div>
    <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-border/50 pt-3 sm:grid-cols-6 sm:pl-10">{stats.map((stat) => <div key={stat.label} className="min-w-0"><dt className="break-words text-[10px] text-muted-foreground">{stat.label}</dt><dd className="mt-0.5 text-sm font-semibold tabular-nums">{typeof stat.value === "number" ? formatNumber(stat.value, locale) : stat.value}</dd></div>)}</dl>
  </li>;
}

function BoardState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center sm:p-8"><h2 className="mb-3 text-lg font-bold">{title}</h2><div className="text-sm leading-relaxed text-muted-foreground">{children}</div></div>;
}
