"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Flame } from "lucide-react";
import { getGame, type GameConfig } from "@/games/registry";
import { dailyStreak, readDailyRecord } from "@/games/puzzle-kit";
import { useT } from "@/i18n/I18nProvider";
import type { Difficulty, GameId } from "@/lib/types";
import { GameArt } from "./game-art";

export const DAILY_PUZZLE_IDS: GameId[] = ["geo-groups", "letter-atlas", "place-trails", "geo-brackets"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** Compact list of today's daily puzzles with local solved state and streaks. */
export function DailyPuzzleList({ title }: { title?: string }) {
  const { t, locale } = useT();
  const de = locale === "de";
  const [state, setState] = useState<Partial<Record<GameId, { solved: boolean; streak: number }>>>({});
  useEffect(() => {
    setState(Object.fromEntries(DAILY_PUZZLE_IDS.map((id) => [id, { solved: DIFFICULTIES.some((d) => readDailyRecord(id, d)), streak: dailyStreak(id) }])));
  }, []);
  const games = DAILY_PUZZLE_IDS.map((id) => getGame(id)).filter((game): game is GameConfig => Boolean(game));
  return (
    <section aria-label={title ?? (de ? "Tagesrätsel" : "Daily puzzles")}>
      {title && <h2 className="mb-3 text-lg font-bold tracking-tight">{title}</h2>}
      <div className="overflow-hidden rounded-2xl bg-card">
        {games.map((game) => (
          <Link key={game.id} href={`/play/${game.id}`} className="geo-game-row flex min-h-18 items-center gap-3 px-3 py-3 focus-visible:outline-offset-[-3px]">
            <GameArt game={game} className="h-12 w-16 shrink-0 rounded-xl [&_svg]:hidden [&>div>*]:scale-[0.55]" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t(`games.${game.id}.name`)}</span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {state[game.id]?.solved
                  ? <span className="inline-flex items-center gap-1 font-semibold text-success"><Check className="h-3.5 w-3.5" aria-hidden />{de ? "Heute gelöst" : "Solved today"}</span>
                  : <span>{de ? "Heute noch offen" : "Not played today"}</span>}
                {!!state[game.id]?.streak && <span className="inline-flex items-center gap-0.5 font-semibold text-orange-700 dark:text-orange-300"><Flame className="h-3.5 w-3.5" aria-hidden />{state[game.id]?.streak}</span>}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
