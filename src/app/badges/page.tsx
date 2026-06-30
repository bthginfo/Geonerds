"use client";

import { useMemo } from "react";
import { Award, Lock } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useDex } from "@/store/dex";
import { BADGES, computeStats, badgeName, badgeDesc } from "@/lib/badges";
import { cn } from "@/lib/utils";

export default function BadgesPage() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();
  const dexHits = useDex((s) => s.hits);

  const stats = useMemo(() => computeStats(runs ?? [], dexHits), [runs, dexHits]);
  const earnedCount = useMemo(() => BADGES.filter((b) => b.earned(stats)).length, [stats]);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BADGES.map((b) => {
          const earned = b.earned(stats);
          const Icon = earned ? b.icon : Lock;
          return (
            <div
              key={b.id}
              className={cn(
                "flex flex-col items-center rounded-2xl border p-4 text-center transition-all",
                earned
                  ? "border-border bg-card shadow-sm"
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
                {earned ? badgeDesc(b, locale) : t("badges.locked")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
