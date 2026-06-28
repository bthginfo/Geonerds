"use client";

import { useMemo, useState } from "react";
import { Trophy, Info } from "lucide-react";
import { GAMES } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { Button } from "@/components/ui/button";
import { scoreStore } from "@/lib/leaderboard/local";
import { formatNumber, formatTime, cn } from "@/lib/utils";
import type { GameId } from "@/lib/types";

export default function LeaderboardPage() {
  const { t, locale } = useT();
  const { runs, refresh } = useAllRuns();
  const [filter, setFilter] = useState<GameId | "all">("all");

  const ranked = useMemo(() => {
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

      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          {t("leaderboard.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {ranked.map((r, i) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                i !== ranked.length - 1 && "border-b border-border/60"
              )}
            >
              <span
                className={cn(
                  "w-7 text-center text-sm font-bold tabular-nums",
                  i === 0 && "text-warning",
                  i === 1 && "text-muted-foreground",
                  i === 2 && "text-accent"
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{t(`games.${r.gameId}.name`)}</div>
                <div className="text-xs text-muted-foreground">
                  {t(`difficulty.${r.difficulty}`)} · {r.correct}/{r.total} ·{" "}
                  {formatTime(r.durationMs)}
                </div>
              </div>
              <span className="font-bold tabular-nums">{formatNumber(r.score, locale)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("leaderboard.online.soon")}</span>
      </div>

      {ranked.length > 0 && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={clear}>
            {t("leaderboard.clear")}
          </Button>
        </div>
      )}
    </div>
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
