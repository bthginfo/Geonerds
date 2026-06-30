"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Flame, Award, ChevronRight, Gamepad2, Sparkles } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useAuth } from "@/store/auth";
import { useDaily } from "@/store/daily";
import { BADGES, computeStats, badgeName } from "@/lib/badges";
import { useDex } from "@/store/dex";
import { dexStateOf } from "@/lib/dex";
import { COUNTRIES } from "@/data/countries";
import { levelFromXp, rankName } from "@/lib/level";
import { streakFromDates } from "@/lib/daily";
import { getGame } from "@/games/registry";
import { formatNumber } from "@/lib/utils";

export default function ProfilePage() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();
  const user = useAuth((s) => s.user);
  const dailyResults = useDaily((s) => s.results);

  const dexHits = useDex((s) => s.hits);
  const dexCollected = useMemo(() => {
    const pool = COUNTRIES.filter((c) => c.unMember || c.independent);
    let collected = 0;
    for (const c of pool) if (dexStateOf(dexHits[c.cca3]) !== "locked") collected++;
    return { collected, total: pool.length };
  }, [dexHits]);

  const stats = useMemo(() => computeStats(runs ?? [], dexHits), [runs, dexHits]);
  const level = useMemo(() => levelFromXp(stats.totalScore), [stats.totalScore]);
  const earned = useMemo(() => BADGES.filter((b) => b.earned(stats)), [stats]);
  const dailyStreak = useMemo(() => streakFromDates(Object.keys(dailyResults)), [dailyResults]);

  const { acc, favorite } = useMemo(() => {
    const list = runs ?? [];
    let c = 0;
    let tot = 0;
    const counts: Record<string, number> = {};
    for (const r of list) {
      c += r.correct ?? 0;
      tot += r.total ?? 0;
      counts[r.gameId] = (counts[r.gameId] ?? 0) + 1;
    }
    const fav = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { acc: tot > 0 ? Math.round((c / tot) * 100) : 0, favorite: fav };
  }, [runs]);

  const favGame = favorite && getGame(favorite) ? favorite : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-24">
      {/* Level header */}
      <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow">
          <span className="text-2xl font-extrabold">{level.level}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{user?.name ?? t("profile.guest")}</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{rankName(level.rank, locale)}</span>
            {level.prestige > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                ✦ {t("profile.prestige", { n: level.prestige })}
              </span>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {t("profile.xpToNext", { n: formatNumber(Math.max(0, level.levelSpan - level.intoLevel), locale) })}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={t("home.gamesPlayed")} value={formatNumber(stats.totalRuns, locale)} />
        <Tile label={t("home.totalPoints")} value={formatNumber(stats.totalScore, locale)} />
        <Tile label={t("common.accuracy")} value={`${acc}%`} />
        <Tile label={t("common.streak")} value={String(stats.bestStreak)} />
        <Tile label={t("profile.dailyStreak")} value={`${dailyStreak} 🔥`} />
        <Tile label={t("profile.badges")} value={`${earned.length}/${BADGES.length}`} />
      </div>

      {/* Country collection */}
      <Link
        href="/collection"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 transition-colors hover:border-amber-500/50"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("collection.title")}</div>
          <div className="font-semibold">
            {dexCollected.collected} / {dexCollected.total}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Favorite game */}
      {favGame && (
        <Link
          href={`/play/${favGame}`}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.favorite")}</div>
            <div className="font-semibold">{t(`games.${favGame}.name`)}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}

      {/* Badges preview */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Award className="h-5 w-5 text-warning" />
            {t("badges.title")}
          </div>
          <Link href="/badges" className="inline-flex items-center gap-0.5 text-sm text-primary hover:underline">
            {t("profile.viewAll")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {earned.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("badges.empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {earned.slice(0, 12).map((b) => {
              const Icon = b.icon;
              return (
                <span
                  key={b.id}
                  title={badgeName(b, locale)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm"
                >
                  <Icon className="h-5 w-5" />
                </span>
              );
            })}
            {earned.length > 12 && (
              <span className="flex h-10 items-center px-2 text-sm font-semibold text-muted-foreground">
                +{earned.length - 12}
              </span>
            )}
          </div>
        )}
      </div>

      {!user && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <span className="text-sm">{t("profile.signInCta")}</span>
          <Link href="/settings" className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
            {t("account.signIn")}
          </Link>
        </div>
      )}

      {/* Flame footer flair */}
      {dailyStreak >= 3 && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-sm text-orange-500">
          <Flame className="h-4 w-4" />
          {t("daily.streak", { n: dailyStreak })}
        </div>
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
