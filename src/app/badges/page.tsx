"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Check, Lock } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useDex } from "@/store/dex";
import { visibleBadges, computeStats, badgeName, badgeDesc, badgeCategory, badgeTier, badgeProgress, type BadgeCategory } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { useProgression } from "@/store/progression";
import { useCommunityRewards } from "@/hooks/use-community-rewards";

export default function BadgesPage() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();
  const dexHits = useDex((s) => s.hits);
  const progression = useProgression();
  const community = useCommunityRewards();
  const [category, setCategory] = useState<"all" | BadgeCategory>("all");
  const L = (en: string, de: string) => locale === "de" ? de : en;

  const stats = useMemo(() => computeStats(runs ?? [], dexHits, progression, community.badgeIds), [runs, dexHits, progression, community.badgeIds]);
  const badges = useMemo(() => visibleBadges(stats), [stats]);
  const earnedCount = useMemo(() => badges.filter((b) => b.earned(stats)).length, [badges, stats]);
  const shown = useMemo(() => badges.filter((b) => category === "all" || badgeCategory(b) === category).sort((a, b) => Number(b.earned(stats)) - Number(a.earned(stats)) || badgeName(a, locale).localeCompare(badgeName(b, locale))), [badges, category, stats, locale]);
  const closest = useMemo(() => badges.map((badge) => ({ badge, progress: badgeProgress(badge, stats) })).filter((item) => !item.badge.earned(stats) && item.progress && item.progress.target > 0).sort((a,b) => (b.progress!.current / b.progress!.target) - (a.progress!.current / a.progress!.target)).slice(0, 3), [badges, stats]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 pb-28 sm:py-8">
      <Link href="/profile" className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" aria-hidden />{t("nav.profile")}</Link>
      <div className="mb-1 flex items-center gap-2">
        <Award className="h-6 w-6 text-warning" />
        <h1 className="text-2xl font-bold">{t("badges.title")}</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("badges.subtitle")}</p>

      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
          <span className="text-muted-foreground">
            {t("badges.progress", { earned: earnedCount, total: badges.length })}
          </span>
        </div>
        <div role="progressbar" aria-label={t("badges.title")} aria-valuemin={0} aria-valuemax={badges.length} aria-valuenow={earnedCount} className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${(earnedCount / badges.length) * 100}%` }}
          />
        </div>
      </div>

      {closest.length > 0 && <section className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h2 className="text-sm font-bold">{L("Closest to unlocking", "Kurz vor dem Freischalten")}</h2>
        <div className="mt-3 space-y-3">{closest.map(({badge, progress}) => <div key={badge.id}><div className="flex justify-between gap-3 text-xs"><span className="font-semibold">{badgeName(badge, locale)}</span><span className="tabular-nums text-muted-foreground">{progress!.current}/{progress!.target}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-500" style={{width:`${Math.min(100, progress!.current/progress!.target*100)}%`}} /></div></div>)}</div>
      </section>}

      <div className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label={L("Badge categories", "Badge-Kategorien")}>{(["all", "journey", "skill", "mastery", "collection", "challenge"] as const).map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={cn("min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", category === item ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground")}>{item === "all" ? L("All", "Alle") : item === "journey" ? L("Journey", "Reise") : item === "skill" ? L("Skill", "Können") : item === "mastery" ? L("Mastery", "Meisterschaft") : item === "collection" ? L("Collection", "Sammlung") : L("Challenge", "Herausforderung")}</button>)}</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.map((b) => {
          const earned = b.earned(stats);
          const Icon = earned ? b.icon : Lock;
          const tier = badgeTier(b);
          const progress = badgeProgress(b, stats);
          return (
            <div
              key={b.id}
              className={cn(
                "flex min-w-0 flex-col rounded-xl border p-4 transition-colors",
                earned
                  ? tier === "mythic" ? "border-violet-400/30 bg-violet-500/5" : tier === "gold" ? "border-amber-400/30 bg-amber-500/5" : "border-border bg-card"
                  : "border-border bg-card"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  earned
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="mt-2.5 text-sm font-bold leading-tight">{badgeName(b, locale)}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {badgeDesc(b, locale)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground"><span>{tier === "mythic" ? L("Mythic", "Mythisch") : tier === "gold" ? L("Gold", "Gold") : tier === "silver" ? L("Silver", "Silber") : L("Bronze", "Bronze")}</span>{earned ? <span className="inline-flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" aria-hidden />{L("Earned", "Erreicht")}</span> : <span>{L("Not unlocked yet", "Noch nicht freigeschaltet")}</span>}</div>
              {progress && <div className="mt-2 w-full"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100, progress.current/progress.target*100)}%`}} /></div><div className="mt-1 text-[10px] tabular-nums text-muted-foreground">{progress.current}/{progress.target}</div></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
