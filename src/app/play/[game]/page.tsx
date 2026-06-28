"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import type { GameId } from "@/lib/types";
import { getGame } from "@/games/registry";
import { GameShell, type PlayHandlers } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { FlagGame } from "@/games/flags/flag-game";
import { CapitalsGame } from "@/games/capitals/capitals-game";
import { OutlineGame } from "@/games/outline/outline-game";
import { TriviaGame } from "@/games/trivia/trivia-game";
import { HigherLowerGame } from "@/games/higher-lower/higher-lower-game";
import { MapClickGame } from "@/games/map-click/map-click-game";
import { DrawGame } from "@/games/draw/draw-game";
import { BorderChainGame } from "@/games/border-chain/border-chain-game";
import { RankingGame } from "@/games/ranking/ranking-game";
import { LanguagesGame } from "@/games/languages/languages-game";
import { PinGame } from "@/games/pin/pin-game";
import { RouteGame } from "@/games/route/route-game";
import { WatersGame } from "@/games/waters/waters-game";

const COMPONENTS: Record<GameId, (h: PlayHandlers) => React.ReactNode> = {
  flags: (h) => <FlagGame {...h} />,
  capitals: (h) => <CapitalsGame {...h} />,
  outline: (h) => <OutlineGame {...h} />,
  trivia: (h) => <TriviaGame {...h} />,
  "higher-lower": (h) => <HigherLowerGame {...h} />,
  "map-click": (h) => <MapClickGame {...h} />,
  draw: (h) => <DrawGame {...h} />,
  "border-chain": (h) => <BorderChainGame {...h} />,
  ranking: (h) => <RankingGame {...h} />,
  languages: (h) => <LanguagesGame {...h} />,
  pin: (h) => <PinGame {...h} />,
  route: (h) => <RouteGame {...h} />,
  waters: (h) => <WatersGame {...h} />,
};

export default function PlayPage() {
  const params = useParams<{ game: string }>();
  const { t } = useT();
  const config = getGame(params.game);

  if (!config) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">404</p>
        <Link href="/">
          <Button>{t("nav.home")}</Button>
        </Link>
      </div>
    );
  }

  const render = COMPONENTS[config.id];
  return <GameShell gameId={config.id}>{render}</GameShell>;
}
