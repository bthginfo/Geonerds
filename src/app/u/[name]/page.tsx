"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Flame, Gamepad2 } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { apiUserProfile, type PublicProfile } from "@/lib/online";
import { levelFromXp, rankName } from "@/lib/level";
import { getGame } from "@/games/registry";
import { formatNumber } from "@/lib/utils";

export default function PublicProfilePage() {
  const { t, locale } = useT();
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(params.name);

  const [state, setState] = useState<{ loading: boolean; profile: PublicProfile | null; found: boolean }>({
    loading: true,
    profile: null,
    found: false,
  });

  useEffect(() => {
    apiUserProfile(name).then((res) =>
      setState({ loading: false, profile: res.profile ?? null, found: res.found })
    );
  }, [name]);

  const level = state.profile ? levelFromXp(state.profile.totalScore) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-24">
      <Link href="/leaderboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("leaderboard.title")}
      </Link>

      {state.loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("common.loading")}
        </div>
      ) : !state.found || !state.profile || !level ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          {t("profile.notFound", { name })}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-2xl font-extrabold text-white shadow">
              {level.level}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-bold">{state.profile.name}</div>
              <div className="text-sm text-muted-foreground">{rankName(level.rank, locale)}</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600"
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Tile label={t("home.totalPoints")} value={formatNumber(state.profile.totalScore, locale)} />
            <Tile label={t("home.gamesPlayed")} value={formatNumber(state.profile.totalRuns, locale)} />
            <Tile label={t("common.streak")} value={String(state.profile.bestStreak)} />
          </div>

          <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Gamepad2 className="h-4 w-4" />
            {t("profile.bestPerGame")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {state.profile.games.map((g, i) => {
              const known = getGame(g.game_id);
              return (
                <div
                  key={g.game_id}
                  className={
                    "flex items-center gap-3 px-4 py-3 " +
                    (i < state.profile!.games.length - 1 ? "border-b border-border/60" : "")
                  }
                >
                  <div className="min-w-0 flex-1 truncate font-medium">
                    {known ? t(`games.${g.game_id}.name`) : g.game_id}
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{formatNumber(g.best, locale)}</span>
                </div>
              );
            })}
          </div>

          {state.profile.bestStreak >= 10 && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-sm text-orange-500">
              <Flame className="h-4 w-4" />
              {t("common.streak")}: {state.profile.bestStreak}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
