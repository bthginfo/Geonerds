import {
  Flag,
  Landmark,
  Shapes,
  Scale,
  MapPin,
  Pencil,
  Spline,
  Lightbulb,
  ListOrdered,
  Languages,
  Crosshair,
  Route,
  Waves,
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
  /** Round-count options; 0 means "all". */
  countOptions?: number[];
  /** Whether an optional countdown timer can be enabled. */
  supportsTimed?: boolean;
  /** Default state of the timed toggle. */
  defaultTimed?: boolean;
  /** Optional game-specific variant selector (e.g. flag scope). */
  variants?: { labelKey: string; default: string; options: string[] };
}

export const GAMES: GameConfig[] = [
  {
    id: "flags",
    icon: Flag,
    gradient: "from-sky-500 to-indigo-500",
    supportsDifficulty: true,
    modes: ["choice", "type"],
    countOptions: [10, 25, 50, 0],
    supportsTimed: true,
    variants: {
      labelKey: "scope.label",
      default: "world",
      options: ["world", "Africa", "Americas", "Asia", "Europe", "Oceania"],
    },
  },
  {
    id: "capitals",
    icon: Landmark,
    gradient: "from-amber-500 to-orange-500",
    supportsDifficulty: true,
    modes: ["choice", "type"],
    countOptions: [10, 25, 50, 0],
    supportsTimed: true,
  },
  {
    id: "outline",
    icon: Shapes,
    gradient: "from-violet-500 to-fuchsia-500",
    supportsDifficulty: true,
    modes: ["choice", "type"],
    countOptions: [10, 25, 50, 0],
    supportsTimed: true,
  },
  {
    id: "trivia",
    icon: Lightbulb,
    gradient: "from-yellow-500 to-amber-500",
    supportsDifficulty: true,
    modes: ["choice", "type"],
    countOptions: [10, 25, 50, 0],
    supportsTimed: true,
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
    countOptions: [10, 25, 50, 0],
    supportsTimed: true,
  },
  {
    id: "draw",
    icon: Pencil,
    gradient: "from-cyan-500 to-blue-500",
    supportsDifficulty: true,
    countOptions: [5, 10, 20, 0],
  },
  {
    id: "border-chain",
    icon: Spline,
    gradient: "from-lime-500 to-green-600",
    supportsDifficulty: true,
    modes: ["choice", "type"],
    countOptions: [5, 10, 20, 0],
    supportsTimed: true,
    defaultTimed: true,
  },
  {
    id: "ranking",
    icon: ListOrdered,
    gradient: "from-teal-500 to-emerald-600",
    supportsDifficulty: true,
    countOptions: [8, 12, 20, 0],
    supportsTimed: true,
  },
  {
    id: "languages",
    icon: Languages,
    gradient: "from-fuchsia-500 to-purple-600",
    supportsDifficulty: true,
    countOptions: [10, 25, 50, 0],
    supportsTimed: true,
  },
  {
    id: "pin",
    icon: Crosshair,
    gradient: "from-orange-500 to-red-500",
    supportsDifficulty: true,
    countOptions: [10, 15, 20, 0],
    supportsTimed: true,
  },
  {
    id: "route",
    icon: Route,
    gradient: "from-green-500 to-lime-600",
    supportsDifficulty: true,
    modes: ["choice", "type"],
    countOptions: [5, 10, 0],
  },
  {
    id: "waters",
    icon: Waves,
    gradient: "from-cyan-500 to-sky-600",
    supportsDifficulty: true,
    modes: ["choice", "type"],
    countOptions: [10, 25, 0],
    supportsTimed: true,
  },
];

export const GAME_MAP: Record<GameId, GameConfig> = Object.fromEntries(
  GAMES.map((g) => [g.id, g])
) as Record<GameId, GameConfig>;

export function getGame(id: string): GameConfig | undefined {
  return GAME_MAP[id as GameId];
}
