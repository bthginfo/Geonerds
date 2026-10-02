"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { GameConfig } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export function GameCard({ game, index = 0 }: { game: GameConfig; index?: number }) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const Icon = game.icon;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.025, duration: 0.25 }}
    >
      <Link
        href={`/play/${game.id}`}
        className={cn("group flex h-full min-h-28 items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-44 sm:flex-col sm:items-start sm:gap-3 sm:p-5", game.id === "flags" ? "border-primary/40 bg-primary/5" : "border-border")}
      >
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm sm:h-14 sm:w-14",
            game.gradient
          )}
        >
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-pretty font-semibold leading-snug">{t(`games.${game.id}.name`)}</h3>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`games.${game.id}.short`)}</p>
          {game.id === "flags" && <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-primary">{locale === "de" ? "Der Klassiker" : "The classic"}</span>}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden" />
      </Link>
    </motion.div>
  );
}
