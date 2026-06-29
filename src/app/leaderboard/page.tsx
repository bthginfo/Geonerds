"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, Loader2, Globe2, Smartphone, Crown, CalendarDays } from "lucide-react";
import { GAMES } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { scoreStore } from "@/lib/leaderboard/local";
import { apiTopScores, type OnlineScore } from "@/lib/online";
import { formatNumber, formatTime, cn } from "@/lib/utils";
import type { GameId } from "@/lib/types";

type Scope = "device" | "global";
type Period = "all" | "month";

export default function LeaderboardPage() {
  const { t, locale } = useT();
  const { runs, refresh } = useAllRuns();
  const user = useAuth((s) => s.user);
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<Period>("all");
  const [filter, setFilter] = useState<GameId | "all">("all");

  const [online, setOnline] = useState<{ configured: boolean; scores: OnlineScore[] } | null>(null);
  const [loadingOnline, setLoadingOnline] = useState(false);

  useEffect(() => {
    if (scope !== "global") return;
    setLoadingOnline(true);
    apiTopScores(filter, period).then((res) => {
      setOnline(res);
      setLoadingOnline(false);
    });
  }, [scope, filter, period]);

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
      <p className="mb-4 text-sm text-muted-foreground">{t("leaderboard.subtitle")}</p>

      {/* Scope toggle */}
      <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-0.5">
        <ScopeButton active={scope === "global"} onClick={() => setScope("global")} icon={<Globe2 className="h-4 w-4" />}>
          {t("leaderboard.global")}
        </ScopeButton>
        <ScopeButton active={scope === "device"} onClick={() => setScope("device")} icon={<Smartphone className="h-4 w-4" />}>
          {t("leaderboard.device")}
        </ScopeButton>
      </div>

      {/* Period toggle (global only) */}
      {scope === "global" && (
        <div className="mb-4 ml-2 inline-flex rounded-xl border border-border bg-card p-0.5 sm:ml-3">
          <ScopeButton active={period === "all"} onClick={() => setPeriod("all")} icon={<Trophy className="h-4 w-4" />}>
            {t("leaderboard.overall")}
          </ScopeButton>
          <ScopeButton active={period === "month"} onClick={() => setPeriod("month")} icon={<CalendarDays className="h-4 w-4" />}>
            {t("leaderboard.month")}
          </ScopeButton>
        </div>
      )}

      {/* Game filter */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          {t("leaderboard.all")}
        </Chip>
        {GAMES.map((g) => (
          <Chip key={g.id} active={filter === g.id} onClick={() => setFilter(g.id)}>
            {t(`games.${g.id}.name`)}
          </Chip>
        ))}
      </div>

      {scope === "global" ? (
        <GlobalBoard
          data={online}
          loading={loadingOnline}
          showGame={filter === "all"}
          signedIn={!!user}
          period={period}
          locale={locale}
          t={t}
        />
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
  locale,
  t,
}: {
  data: { configured: boolean; scores: OnlineScore[] } | null;
  loading: boolean;
  showGame: boolean;
  signedIn: boolean;
  period: "all" | "month";
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
  const champion = scores[0];
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
            <div className="truncate text-lg font-bold leading-tight">{champion.name}</div>
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
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {scores.map((s, i) => (
            <Row
              key={`${s.name}-${s.game_id}-${i}`}
              rank={i + 1}
              last={i === scores.length - 1}
              title={s.name}
              sub={
                (showGame ? t(`games.${s.game_id}.name`) + " · " : "") +
                (s.difficulty ? t(`difficulty.${s.difficulty}`) + " · " : "") +
                formatTime(s.duration_ms ?? 0)
              }
              score={formatNumber(s.score, locale)}
            />
          ))}
        </div>
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
}: {
  rank: number;
  last: boolean;
  title: string;
  sub: string;
  score: string;
}) {
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
        <div className="truncate font-medium">{title}</div>
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
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
