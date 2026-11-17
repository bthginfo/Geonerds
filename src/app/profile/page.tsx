"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Flame, Award, ChevronRight, Gamepad2, Globe2, Settings2, Swords, Star } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useAuth } from "@/store/auth";
import { useDaily } from "@/store/daily";
import { BADGES, computeStats, badgeName } from "@/lib/badges";
import { useDex } from "@/store/dex";
import { dexStateOf, DEX_POOL } from "@/lib/dex";
import { levelFromXp, rankName } from "@/lib/level";
import { streakFromDates } from "@/lib/daily";
import { getGame } from "@/games/registry";
import { formatNumber } from "@/lib/utils";
import { useProgression } from "@/store/progression";
import { useCommunityRewards } from "@/hooks/use-community-rewards";
import { GameCreatorAward } from "@/components/community/game-creator-award";
import { ContributorAward } from "@/components/community/contributor-award";
import { CONTRIBUTOR_BADGE_ID } from "@/lib/community-rewards";

export default function ProfilePage() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();
  const user = useAuth((s) => s.user);
  const dailyResults = useDaily((s) => s.results);
  const progression = useProgression();
  const community = useCommunityRewards();

  const dexHits = useDex((s) => s.hits);
  const dexCollected = useMemo(() => {
    const pool = DEX_POOL;
    let collected = 0;
    for (const c of pool) if (dexStateOf(dexHits[c.cca3]) !== "locked") collected++;
    return { collected, total: pool.length };
  }, [dexHits]);

  const stats = useMemo(() => computeStats(runs ?? [], dexHits, progression, community.badgeIds), [runs, dexHits, progression, community.badgeIds]);
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
    <div className="mx-auto w-full min-w-0 max-w-2xl px-4 py-6 pb-28 sm:py-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.profile")}</h1>
        <Link href="/settings" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Settings2 className="h-4 w-4" aria-hidden />{t("settings.title")}</Link>
      </header>
      <section className="geo-surface p-5 sm:p-6" aria-label={locale === "de" ? "Dein Fortschritt" : "Your progress"}>
      <div className="flex min-w-0 items-center gap-4">
        <span aria-label={`${locale === "de" ? "Level" : "Level"} ${level.level}`} className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="text-2xl font-extrabold">{level.level}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="break-words text-xl font-bold">{user?.name ?? t("profile.guest")}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{rankName(level.rank, locale)}</span>
            {stats.dexMastered > 0 && <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">{locale === "de" ? "Atlas-Meister" : "Atlas Master"} · {stats.dexMastered}</span>}
            {level.prestige > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Star className="h-3.5 w-3.5" aria-hidden /> {t("profile.prestige", { n: level.prestige })}
              </span>
            )}
          </div>
          <div role="progressbar" aria-label={locale === "de" ? "Fortschritt zum nächsten Level" : "Progress to next level"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)} className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {t("profile.xpToNext", { n: formatNumber(Math.max(0, level.levelSpan - level.intoLevel), locale) })}
          </div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5">
        <Tile label={t("home.gamesPlayed")} value={formatNumber(stats.totalRuns, locale)} />
        <Tile label={t("home.totalPoints")} value={formatNumber(stats.totalScore, locale)} />
        <Tile label={t("common.accuracy")} value={`${acc}%`} />
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Fortschritt und Spielstatistik auf diesem Gerät. Deine Online-Ergebnisse findest du in der Rangliste." : "Progress and play stats on this device. Find your online results in the leaderboard."}</p>
      </section>

      {!user && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/5 p-4"><p className="min-w-0 flex-1 text-sm leading-relaxed">{t("profile.signInCta")}</p><Link href="/settings" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("account.signIn")}</Link></div>}

      <div className="geo-surface mt-5 divide-y divide-border overflow-hidden">
      <Link href="/challenges" className="flex min-h-20 items-center gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Swords className="h-5 w-5 shrink-0 text-primary" aria-hidden /><div className="min-w-0 flex-1"><p className="font-semibold">{locale === "de" ? "Spiele gemeinsam" : "Play together"}</p><p className="mt-1 text-sm text-muted-foreground">{locale === "de" ? "Sofort gegen Bots oder echte GeoNerds herausfordern" : "Instant bot training or challenges with real GeoNerds"}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /></Link>

      {community.badgeIds.includes("game-creator") && <GameCreatorAward />}
      {community.badgeIds.includes(CONTRIBUTOR_BADGE_ID) && <ContributorAward />}

      {/* Country collection */}
      <Link
        href="/collection"
        className="flex min-h-20 items-center gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Globe2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t("collection.title")}</div>
          <p className="mt-1 text-sm text-muted-foreground">{dexCollected.collected} / {dexCollected.total} {locale === "de" ? "Länder entdeckt" : "countries discovered"}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Favorite game */}
      {favGame && (
        <Link
          href={`/play/${favGame}`}
          className="flex min-h-20 items-center gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Gamepad2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{t("profile.favorite")}</div>
            <div className="font-semibold">{t(`games.${favGame}.name`)}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}
      </div>

      {/* Badges preview */}
      <section className="geo-surface mt-5 p-4 sm:p-5" aria-labelledby="profile-badges-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="profile-badges-title" className="flex items-center gap-2 font-semibold">
            <Award className="h-5 w-5 text-warning" aria-hidden />
            {t("badges.title")}
          </h2>
          <Link href="/badges" className="inline-flex min-h-11 items-center gap-0.5 rounded-lg text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
                  aria-label={badgeName(b, locale)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning"
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
      </section>

      <details className="geo-surface mt-5 p-4 sm:p-5"><summary className="flex min-h-11 cursor-pointer items-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Mehr Spielstatistik" : "More play stats"}</summary><dl className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-4"><Tile label={t("common.streak")} value={String(stats.bestStreak)} /><Tile label={t("profile.dailyStreak")} value={String(dailyStreak)} /><Tile label={t("profile.badges")} value={`${earned.length}/${BADGES.length}`} /></dl></details>

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
    <div className="min-w-0">
      <dd className="break-words text-xl font-bold tabular-nums">{value}</dd>
      <dt className="mt-1 text-xs leading-relaxed text-muted-foreground">{label}</dt>
    </div>
  );
}
