import {
  Flag,
  Landmark,
  Shapes,
  Scale,
  MapPin,
  Pencil,
  Spline,
  type LucideIcon,
} from "lucide-react";
import type { AnswerMode, GameId } from "@/lib/types";

export interface GameConfig {
  id: GameId;
  icon: LucideIcon;
  /** Tailwind gradient classes for the game's accent. */
  gradient: string;
  supportsDifficulty: boolean;
  modes?: AnswerMode[];
}

export const GAMES: GameConfig[] = [
  {
    id: "flags",
    icon: Flag,
    gradient: "from-sky-500 to-indigo-500",
    supportsDifficulty: true,
    modes: ["choice", "type"],
  },
  {
    id: "capitals",
    icon: Landmark,
    gradient: "from-amber-500 to-orange-500",
    supportsDifficulty: true,
    modes: ["choice", "type"],
  },
  {
    id: "outline",
    icon: Shapes,
    gradient: "from-violet-500 to-fuchsia-500",
    supportsDifficulty: true,
    modes: ["choice", "type"],
  },
  {
    id: "higher-lower",
    icon: Scale,
    gradient: "from-emerald-500 to-teal-500",
    supportsDifficulty: false,
  },
  {
    id: "map-click",
    icon: MapPin,
    gradient: "from-rose-500 to-red-500",
    supportsDifficulty: true,
  },
  {
    id: "draw",
    icon: Pencil,
    gradient: "from-cyan-500 to-blue-500",
    supportsDifficulty: true,
  },
  {
    id: "border-chain",
    icon: Spline,
    gradient: "from-lime-500 to-green-600",
    supportsDifficulty: true,
    modes: ["choice", "type"],
  },
];

export const GAME_MAP: Record<GameId, GameConfig> = Object.fromEntries(
  GAMES.map((g) => [g.id, g])
) as Record<GameId, GameConfig>;

export function getGame(id: string): GameConfig | undefined {
  return GAME_MAP[id as GameId];
}
