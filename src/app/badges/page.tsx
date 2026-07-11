"use client";

import { useMemo, useState } from "react";
import { Award, Lock } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useDex } from "@/store/dex";
import { BADGES, computeStats, badgeName, badgeDesc, badgeCategory, badgeTier, badgeProgress, type BadgeCategory } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { useProgression } from "@/store/progression";

export default function BadgesPage() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();
  const dexHits = useDex((s) => s.hits);
  const progression = useProgression();
  const [category, setCategory] = useState<"all" | BadgeCategory>("all");
  const L = (en: string, de: string) => locale === "de" ? de : en;

  const stats = useMemo(() => computeStats(runs ?? [], dexHits, progression), [runs, dexHits, progression]);
  const earnedCount = useMemo(() => BADGES.filter((b) => b.earned(stats)).length, [stats]);
  const shown = useMemo(() => BADGES.filter((b) => category === "all" || badgeCategory(b) === category).sort((a, b) => Number(b.earned(stats)) - Number(a.earned(stats)) || badgeName(a, locale).localeCompare(badgeName(b, locale))), [category, stats, locale]);
  const closest = useMemo(() => BADGES.map((badge) => ({ badge, progress: badgeProgress(badge, stats) })).filter((item) => !item.badge.earned(stats) && item.progress && item.progress.target > 0).sort((a,b) => (b.progress!.current / b.progress!.target) - (a.progress!.current / a.progress!.target)).slice(0, 3), [stats]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-24">
      <div className="mb-1 flex items-center gap-2">
        <Award className="h-6 w-6 text-warning" />
        <h1 className="text-2xl font-bold">{t("badges.title")}</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("badges.subtitle")}</p>

      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
          <span className="text-muted-foreground">
            {t("badges.progress", { earned: earnedCount, total: BADGES.length })}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all"
            style={{ width: `${(earnedCount / BADGES.length) * 100}%` }}
          />
        </div>
      </div>

      {closest.length > 0 && <section className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h2 className="text-sm font-bold">{L("Closest to unlocking", "Kurz vor dem Freischalten")}</h2>
        <div className="mt-3 space-y-3">{closest.map(({badge, progress}) => <div key={badge.id}><div className="flex justify-between gap-3 text-xs"><span className="font-semibold">{badgeName(badge, locale)}</span><span className="tabular-nums text-muted-foreground">{progress!.current}/{progress!.target}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-500" style={{width:`${Math.min(100, progress!.current/progress!.target*100)}%`}} /></div></div>)}</div>
      </section>}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label={L("Badge categories", "Badge-Kategorien")}>{(["all", "journey", "skill", "mastery", "collection", "challenge"] as const).map((item) => <button key={item} onClick={() => setCategory(item)} className={cn("min-h-11 shrink-0 rounded-xl border px-3 text-xs font-bold capitalize", category === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>{item === "all" ? L("All", "Alle") : item === "journey" ? L("Journey", "Reise") : item === "skill" ? L("Skill", "Können") : item === "mastery" ? L("Mastery", "Meisterschaft") : item === "collection" ? L("Collection", "Sammlung") : L("Challenge", "Herausforderung")}</button>)}</div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((b) => {
          const earned = b.earned(stats);
          const Icon = earned ? b.icon : Lock;
          const tier = badgeTier(b);
          const progress = badgeProgress(b, stats);
          return (
            <div
              key={b.id}
              className={cn(
                "flex flex-col items-center rounded-2xl border p-4 text-center transition-all",
                earned
                  ? tier === "mythic" ? "border-violet-400 bg-violet-500/10 shadow-sm" : tier === "gold" ? "border-amber-400 bg-amber-500/10 shadow-sm" : tier === "silver" ? "border-slate-400 bg-slate-400/10 shadow-sm" : "border-orange-700/50 bg-card shadow-sm"
                  : "border-dashed border-border/70 bg-card/40 opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl",
                  earned
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="mt-2.5 text-sm font-bold leading-tight">{badgeName(b, locale)}</div>
              <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {badgeDesc(b, locale)}
              </div>
              <div className="mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{tier}</div>
              {progress && <div className="mt-2 w-full"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100, progress.current/progress.target*100)}%`}} /></div><div className="mt-1 text-[10px] tabular-nums text-muted-foreground">{progress.current}/{progress.target}</div></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
