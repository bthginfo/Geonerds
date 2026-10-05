"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, Loader2, Globe2, Smartphone, Crown, CalendarDays, Gamepad2, ChevronDown, Swords } from "lucide-react";
import { GAMES } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { scoreStore } from "@/lib/leaderboard/local";
import { apiTopScores, type OnlineScore } from "@/lib/online";
import { formatNumber, formatTime, cn } from "@/lib/utils";
import type { GameId } from "@/lib/types";
import { CHALLENGE_GAME_IDS, type GeoChallengeGameId } from "@/lib/challenges";
import { DuelBoard } from "@/components/community/duel-board";

type Scope = "device" | "global" | "duels";
type Period = "all" | "month";

export default function LeaderboardPage() {
  const { t, locale } = useT();
  const { runs, refresh } = useAllRuns();
  const user = useAuth((s) => s.user);
  const [query, setQuery] = useState<{ scope: Scope; period: Period; filter: GameId | "all"; page: number }>({ scope: "global", period: "all", filter: "all", page: 0 });
  const { scope, period, filter, page } = query;

  const [online, setOnline] = useState<{ configured: boolean; scores: OnlineScore[] } | null>(null);
  const [loadingOnline, setLoadingOnline] = useState(false);

  function switchScope(next: Scope) {
    setQuery((current) => ({ ...current, scope: next, page: 0, filter: next === "duels" && !CHALLENGE_GAME_IDS.some((id) => id === current.filter) ? "all" : current.filter }));
  }
  const setPage = (next: number) => setQuery((current) => ({ ...current, page: next }));

  useEffect(() => {
    if (scope !== "global") return;
    let active = true;
    setLoadingOnline(true);
    setOnline(null);
    apiTopScores(filter, period, page).then((res) => {
      if (!active) return;
      setOnline(res);
      setLoadingOnline(false);
    });
    return () => { active = false; };
  }, [scope, filter, period, page]);

  const deviceRanked = useMemo(() => {
    const list = (runs ?? []).filter((r) => filter === "all" || r.gameId === filter);
    return [...list].sort((a, b) => b.score - a.score || a.durationMs - b.durationMs).slice(0, 50);
  }, [runs, filter]);

  async function clear() {
    await scoreStore.clear();
    refresh();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-24">
      <div className="mb-1 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-warning" />
        <h1 className="text-2xl font-bold">{t("leaderboard.title")}</h1>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">{locale === "de" ? "Deine besten Runden und Begegnungen – weltweit oder auf diesem Gerät." : "Your best runs and encounters, worldwide or on this device."}</p>

      {/* Scope toggle */}
      <div className="mb-3 grid grid-cols-3 rounded-xl border border-border bg-card p-0.5" aria-label={locale === "de" ? "Bestenliste auswählen" : "Choose leaderboard"}>
        <ScopeButton active={scope === "global"} onClick={() => switchScope("global")} icon={<Globe2 aria-hidden="true" className="h-4 w-4 shrink-0" />}>
          {t("leaderboard.global")}
        </ScopeButton>
        <ScopeButton active={scope === "device"} onClick={() => switchScope("device")} icon={<Smartphone aria-hidden="true" className="h-4 w-4 shrink-0" />}>
          {t("leaderboard.device")}
        </ScopeButton>
        <ScopeButton active={scope === "duels"} onClick={() => switchScope("duels")} icon={<Swords aria-hidden="true" className="h-4 w-4 shrink-0" />}>
          {locale === "de" ? "Duelle" : "Duels"}
        </ScopeButton>
      </div>

      {/* Online boards share the calendar-period filter. */}
      {scope !== "device" && (
        <div className="mb-4 grid grid-cols-2 rounded-xl border border-border bg-card p-0.5 sm:inline-grid" aria-label={locale === "de" ? "Zeitraum auswählen" : "Choose period"}>
          <ScopeButton active={period === "all"} onClick={() => setQuery((current) => ({ ...current, period: "all", page: 0 }))} icon={<Trophy aria-hidden="true" className="h-4 w-4" />}>
            {t("leaderboard.overall")}
          </ScopeButton>
          <ScopeButton active={period === "month"} onClick={() => setQuery((current) => ({ ...current, period: "month", page: 0 }))} icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}>
            {t("leaderboard.month")}
          </ScopeButton>
        </div>
      )}

      {/* Game filter */}
      <div className="relative mb-4">
        <Gamepad2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={filter}
          onChange={(e) => setQuery((current) => ({ ...current, filter: e.target.value as GameId | "all", page: 0 }))}
          aria-label={locale === "de" ? "Bestenliste nach Spiel filtern" : "Filter leaderboard by game"}
          className="min-h-11 w-full appearance-none rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-sm font-semibold text-foreground outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-ring/20"
        >
          <option value="all">{t("leaderboard.all")}</option>
          {GAMES.filter((game) => scope !== "duels" || CHALLENGE_GAME_IDS.some((id) => id === game.id)).map((g) => (
            <option key={g.id} value={g.id}>
              {t(`games.${g.id}.name`)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {scope === "global" ? (
        <GlobalBoard
          data={online}
          loading={loadingOnline}
          showGame={filter === "all"}
          signedIn={!!user}
          period={period}
          page={page}
          onPage={setPage}
          locale={locale}
          t={t}
        />
      ) : scope === "duels" ? (
        <DuelBoard game={filter as GeoChallengeGameId | "all"} period={period} page={page} onPage={setPage} />
      ) : (
        <>
          {deviceRanked.length === 0 ? (
            <Empty>{t("leaderboard.empty")}</Empty>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {deviceRanked.map((r, i) => (
                <Row
                  key={r.id}
                  rank={i + 1}
                  last={i === deviceRanked.length - 1}
                  title={t(`games.${r.gameId}.name`)}
                  sub={`${t(`difficulty.${r.difficulty}`)} · ${r.correct}/${r.total} · ${formatTime(r.durationMs)}`}
                  score={formatNumber(r.score, locale)}
                />
              ))}
            </div>
          )}
          {deviceRanked.length > 0 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={clear}>
                {t("leaderboard.clear")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GlobalBoard({
  data,
  loading,
  showGame,
  signedIn,
  period,
  page,
  onPage,
  locale,
  t,
}: {
  data: { configured: boolean; scores: OnlineScore[] } | null;
  loading: boolean;
  showGame: boolean;
  signedIn: boolean;
  period: "all" | "month";
  page: number;
  onPage: (p: number) => void;
  locale: string;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }
  if (data && !data.configured) {
    return <Empty>{t("leaderboard.notConfigured")}</Empty>;
  }

  const scores = data?.scores ?? [];
  const champion = page === 0 ? scores[0] : undefined;
  return (
    <>
      {champion && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-warning/40 bg-gradient-to-br from-warning/15 to-amber-500/10 p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
            <Crown className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-warning">
              {period === "month" ? t("leaderboard.championMonth") : t("leaderboard.championAll")}
            </div>
            <Link href={`/u/${encodeURIComponent(champion.name)}`} className="block truncate text-lg font-bold leading-tight hover:underline">
              {champion.name}
            </Link>
          </div>
          <span className="shrink-0 text-lg font-extrabold tabular-nums">{formatNumber(champion.score, locale)}</span>
        </div>
      )}
      {!signedIn && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <span className="text-sm">{t("leaderboard.signInCta")}</span>
          <Link href="/settings">
            <Button size="sm">{t("account.signIn")}</Button>
          </Link>
        </div>
      )}
      {scores.length === 0 ? (
        <Empty>{t("leaderboard.globalEmpty")}</Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {scores.map((s, i) => (
              <Row
                key={`${s.name}-${s.game_id}-${i}`}
                rank={page * 100 + i + 1}
                last={i === scores.length - 1}
                title={s.name}
                href={`/u/${encodeURIComponent(s.name)}`}
                sub={
                  (showGame ? t(`games.${s.game_id}.name`) + " · " : "") +
                  (s.difficulty ? t(`difficulty.${s.difficulty}`) + " · " : "") +
                  formatTime(s.duration_ms ?? 0)
                }
                score={formatNumber(s.score, locale)}
              />
            ))}
          </div>
          {(page > 0 || scores.length === 100) && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
                {t("leaderboard.prev")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("leaderboard.page", { n: page + 1 })}</span>
              <Button variant="outline" size="sm" disabled={scores.length < 100} onClick={() => onPage(page + 1)}>
                {t("leaderboard.next")}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Row({
  rank,
  last,
  title,
  sub,
  score,
  href,
}: {
  rank: number;
  last: boolean;
  title: string;
  sub: string;
  score: string;
  href?: string;
}) {
  const titleNode = href ? (
    <Link href={href} className="block truncate font-medium hover:underline">
      {title}
    </Link>
  ) : (
    <div className="truncate font-medium">{title}</div>
  );
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", !last && "border-b border-border/60")}>
      <span
        className={cn(
          "w-7 text-center text-sm font-bold tabular-nums",
          rank === 1 && "text-warning",
          rank === 2 && "text-muted-foreground",
          rank === 3 && "text-accent"
        )}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        {titleNode}
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <span className="font-bold tabular-nums">{score}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:text-sm",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

