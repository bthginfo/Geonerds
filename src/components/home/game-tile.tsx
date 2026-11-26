"use client";

import Link from "next/link";
import { Check, Flame, Sparkles, Trophy } from "lucide-react";
import type { GameConfig } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { cn, formatNumber } from "@/lib/utils";
import { GameArt } from "./game-art";

export interface GameTileMeta {
  best?: number;
  isNew?: boolean;
  daily?: boolean;
  solvedToday?: boolean;
  streak?: number;
  rank?: number;
}

export function GameTile({ game, meta = {}, size = "md", className }: { game: GameConfig; meta?: GameTileMeta; size?: "md" | "lg"; className?: string }) {
  const { t, locale } = useT();
  const de = locale === "de";
  return (
    <Link
      href={`/play/${game.id}`}
      className={cn(
        "geo-tile group flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card text-card-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <div className="relative">
        <GameArt game={game} className={size === "lg" ? "h-32 sm:h-36" : "h-24 sm:h-28"} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {meta.rank && <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">#{meta.rank}</span>}
          {meta.isNew && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-900 shadow-sm"><Sparkles className="h-3 w-3" aria-hidden />{de ? "Neu" : "New"}</span>}
          {meta.daily && !meta.solvedToday && <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">{de ? "Täglich" : "Daily"}</span>}
        </div>
        {meta.solvedToday && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-emerald-700 shadow-sm">
            <Check className="h-3 w-3" aria-hidden />{de ? "Heute gelöst" : "Solved today"}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <h3 className="text-pretty text-[15px] font-semibold leading-snug">{t(`games.${game.id}.name`)}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{t(`games.${game.id}.short`)}</p>
        {(meta.best || meta.streak) ? (
          <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs font-semibold tabular-nums text-muted-foreground">
            {!!meta.best && <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden /><span className="sr-only">{de ? "Bestwert" : "Best"}: </span>{formatNumber(meta.best, locale)}</span>}
            {!!meta.streak && <span className="inline-flex items-center gap-1 text-orange-700 dark:text-orange-300"><Flame className="h-3.5 w-3.5" aria-hidden />{meta.streak} {de ? "Tage" : meta.streak === 1 ? "day" : "days"}</span>}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
