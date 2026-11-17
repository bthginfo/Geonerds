"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { GameConfig } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { FlagImage } from "@/components/flag-image";

export function GameCard({ game }: { game: GameConfig; index?: number }) {
  const { t, locale } = useT();
  const Icon = game.icon;

  return (
      <Link
        href={`/play/${game.id}`}
        className="geo-game-row group flex min-h-24 items-center gap-3.5 px-4 py-4 focus-visible:relative focus-visible:z-10 focus-visible:outline-offset-[-3px] sm:gap-4 sm:px-5"
      >
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-primary">
          {game.id === "flags" ? <FlagImage code="jp" className="w-10" /> : <Icon className="h-6 w-6" strokeWidth={1.7} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-pretty text-[15px] font-semibold leading-snug">{t(`games.${game.id}.name`)}</h3>
            {game.id === "flags" && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{locale === "de" ? "Klassiker" : "Classic"}</span>}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t(`games.${game.id}.short`)}</p>
        </div>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
      </Link>
  );
}
