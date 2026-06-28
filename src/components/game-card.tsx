"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { GameConfig } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export function GameCard({ game, index = 0 }: { game: GameConfig; index?: number }) {
  const { t } = useT();
  const Icon = game.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        href={`/play/${game.id}`}
        className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-col sm:items-start sm:gap-3 sm:p-5"
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
            <h3 className="truncate font-semibold">{t(`games.${game.id}.name`)}</h3>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{t(`games.${game.id}.short`)}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden" />
      </Link>
    </motion.div>
  );
}
