"use client";

import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar } from "@/components/game/hud";
import { useT } from "@/i18n/I18nProvider";

/** Placeholder until the full game lands. */
export function PlaceTrailsGame(handlers: PlayHandlers) {
  const { t } = useT();
  return <div className="flex flex-1 flex-col"><GameTopBar title={t("games.place-trails.name")} onExit={handlers.onExit} /></div>;
}
