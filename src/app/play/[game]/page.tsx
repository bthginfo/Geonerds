"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { GameId } from "@/lib/types";
import { getGame } from "@/games/registry";
import { GameShell, type PlayHandlers } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";

function ColorFlagLoading() {
  const { t } = useT();
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-1 items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{t("common.loading")}</span>
    </div>
  );
}

// Only load the game being played, not the full catalogue and all its datasets.
// Literal import paths let Next produce a separate, preloadable chunk per game.
const FlagGame = dynamic(() => import("@/games/flags/flag-game").then((m) => m.FlagGame), { loading: ColorFlagLoading });
const CapitalsGame = dynamic(() => import("@/games/capitals/capitals-game").then((m) => m.CapitalsGame), { loading: ColorFlagLoading });
const OutlineGame = dynamic(() => import("@/games/outline/outline-game").then((m) => m.OutlineGame), { loading: ColorFlagLoading });
const TriviaGame = dynamic(() => import("@/games/trivia/trivia-game").then((m) => m.TriviaGame), { loading: ColorFlagLoading });
const HigherLowerGame = dynamic(() => import("@/games/higher-lower/higher-lower-game").then((m) => m.HigherLowerGame), { loading: ColorFlagLoading });
const MapClickGame = dynamic(() => import("@/games/map-click/map-click-game").then((m) => m.MapClickGame), { loading: ColorFlagLoading });
const DrawGame = dynamic(() => import("@/games/draw/draw-game").then((m) => m.DrawGame), { loading: ColorFlagLoading });
const BorderChainGame = dynamic(() => import("@/games/border-chain/border-chain-game").then((m) => m.BorderChainGame), { loading: ColorFlagLoading });
const RankingGame = dynamic(() => import("@/games/ranking/ranking-game").then((m) => m.RankingGame), { loading: ColorFlagLoading });
const LanguagesGame = dynamic(() => import("@/games/languages/languages-game").then((m) => m.LanguagesGame), { loading: ColorFlagLoading });
const PinGame = dynamic(() => import("@/games/pin/pin-game").then((m) => m.PinGame), { loading: ColorFlagLoading });
const RouteGame = dynamic(() => import("@/games/route/route-game").then((m) => m.RouteGame), { loading: ColorFlagLoading });
const WatersGame = dynamic(() => import("@/games/waters/waters-game").then((m) => m.WatersGame), { loading: ColorFlagLoading });
const NeighborsGame = dynamic(() => import("@/games/neighbors/neighbors-game").then((m) => m.NeighborsGame), { loading: ColorFlagLoading });
const TraceGame = dynamic(() => import("@/games/trace/trace-game").then((m) => m.TraceGame), { loading: ColorFlagLoading });
const OriginGame = dynamic(() => import("@/games/origin/origin-game").then((m) => m.OriginGame), { loading: ColorFlagLoading });
const NameAllGame = dynamic(() => import("@/games/nameall/name-all-game").then((m) => m.NameAllGame), { loading: ColorFlagLoading });
const MountainsGame = dynamic(() => import("@/games/mountains/mountains-game").then((m) => m.MountainsGame), { loading: ColorFlagLoading });
const GeoNerdGame = dynamic(() => import("@/games/geonerd/geonerd-game").then((m) => m.GeoNerdGame), { loading: ColorFlagLoading });
const JigsawGame = dynamic(() => import("@/games/jigsaw/jigsaw-game").then((m) => m.JigsawGame), { loading: ColorFlagLoading });
const ConnectionsGame = dynamic(() => import("@/games/connections/connections-game").then((m) => m.ConnectionsGame), { loading: ColorFlagLoading });
const ExpeditionGame = dynamic(() => import("@/games/expedition/expedition-game").then((m) => m.ExpeditionGame), { loading: ColorFlagLoading });
const GridGame = dynamic(() => import("@/games/grid/grid-game").then((m) => m.GridGame), { loading: ColorFlagLoading });
const MinesweeperGame = dynamic(() => import("@/games/minesweeper/minesweeper-game").then((m) => m.MinesweeperGame), { loading: ColorFlagLoading });
const FlagPieGame = dynamic(() => import("@/games/flag-pie/flag-pie-game").then((m) => m.FlagPieGame), { loading: ColorFlagLoading });
const CityCompassGame = dynamic(() => import("@/games/city-compass/city-compass-game").then((m) => m.CityCompassGame), { loading: ColorFlagLoading });
const FlagMosaicGame = dynamic(() => import("@/games/flag-mosaic/flag-mosaic-game").then((m) => m.FlagMosaicGame), { loading: ColorFlagLoading });
const CountryRadarGame = dynamic(() => import("@/games/country-radar/country-radar-game").then((m) => m.CountryRadarGame), { loading: ColorFlagLoading });
const AdastraGame = dynamic(() => import("@/games/adastra/adastra-game").then((m) => m.AdastraGame), { loading: ColorFlagLoading });

const ColorFlagGame = dynamic(
  () => import("@/games/colorflag/color-flag-game").then((module) => module.ColorFlagGame),
  { loading: ColorFlagLoading },
);

const AtlasMatchGame = dynamic(
  () => import("@/games/atlas-match/atlas-match-game").then((module) => module.AtlasMatchGame),
  { loading: ColorFlagLoading },
);
const GeoBalanceGame = dynamic(
  () => import("@/games/geo-balance/geo-balance-game").then((module) => module.GeoBalanceGame),
  { loading: ColorFlagLoading },
);

const COMPONENTS: Partial<Record<GameId, (h: PlayHandlers) => React.ReactNode>> = {
  expedition: (h) => <ExpeditionGame {...h} />,
  jigsaw: (h) => <JigsawGame {...h} />,
  connections: (h) => <ConnectionsGame {...h} />,
  flags: (h) => <FlagGame {...h} />,
  capitals: (h) => <CapitalsGame {...h} />,
  outline: (h) => <OutlineGame {...h} />,
  trivia: (h) => <TriviaGame {...h} />,
  "higher-lower": (h) => <HigherLowerGame {...h} />,
  "map-click": (h) => <MapClickGame {...h} />,
  draw: (h) => <DrawGame {...h} />,
  "border-chain": (h) => <BorderChainGame {...h} />,
  grid: (h) => <GridGame {...h} />,
  minesweeper: (h) => <MinesweeperGame {...h} />,
  ranking: (h) => <RankingGame {...h} />,
  languages: (h) => <LanguagesGame {...h} />,
  pin: (h) => <PinGame {...h} />,
  route: (h) => <RouteGame {...h} />,
  waters: (h) => <WatersGame {...h} />,
  neighbors: (h) => <NeighborsGame {...h} />,
  trace: (h) => <TraceGame {...h} />,
  origin: (h) => <OriginGame {...h} />,
  nameall: (h) => <NameAllGame {...h} />,
  mountains: (h) => <MountainsGame {...h} />,
  colorflag: (h) => <ColorFlagGame {...h} />,
  millionaire: (h) => <GeoNerdGame {...h} />,
  "flag-pie": (h) => <FlagPieGame {...h} />,
  "city-compass": (h) => <CityCompassGame {...h} />,
  "flag-mosaic": (h) => <FlagMosaicGame {...h} />,
  "country-radar": (h) => <CountryRadarGame {...h} />,
  adastra: (h) => <AdastraGame {...h} />,
  "atlas-match": (h) => <AtlasMatchGame {...h} />,
  "geo-balance": (h) => <GeoBalanceGame {...h} />,
};

export default function PlayPage() {
  const params = useParams<{ game: string }>();
  const { t } = useT();
  const config = getGame(params.game);

  const render = config ? COMPONENTS[config.id] : undefined;
  if (!config || !render) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">404</p>
        <Link href="/">
          <Button>{t("nav.home")}</Button>
        </Link>
      </div>
    );
  }

  return <GameShell gameId={config.id}>{render}</GameShell>;
}
