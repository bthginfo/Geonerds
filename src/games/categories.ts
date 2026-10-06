import { Flag, Shapes, Network, Globe2, Compass, Sparkles, type LucideIcon } from "lucide-react";
import type { GameId, Locale } from "@/lib/types";

export interface GameCategory {
  id: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  icon: LucideIcon;
  games: GameId[];
}

/** Editorial ordering is deliberately independent of registry insertion order. */
export const GAME_CATEGORIES: GameCategory[] = [
  {
    id: "new",
    name: { de: "Neue Spiele", en: "New games" },
    description: { de: "Frische Perspektiven, inspiriert von unserer Community.", en: "Fresh perspectives, inspired by our community." },
    icon: Sparkles,
    games: ["adastra"],
  },
  {
    id: "flags",
    name: { de: "Flaggen & Farben", en: "Flags & colors" },
    description: { de: "Erkenne die Welt an ihren Farben, Mustern und Symbolen.", en: "Read the world through its colors, patterns and symbols." },
    icon: Flag,
    games: ["flags", "colorflag", "flag-pie", "flag-mosaic"],
  },
  {
    id: "maps",
    name: { de: "Karten & Formen", en: "Maps & shapes" },
    description: { de: "Vom Umriss zum Ort: Schärfe deinen Blick für Geografie.", en: "From silhouette to location: sharpen your geographic eye." },
    icon: Shapes,
    games: ["outline", "map-click", "country-radar", "draw", "trace", "jigsaw", "city-compass"],
  },
  {
    id: "logic",
    name: { de: "Logik & Verbindungen", en: "Logic & connections" },
    description: { de: "Kombiniere Hinweise, finde Zusammenhänge und denke um die Ecke.", en: "Connect the clues, uncover relationships and think a step ahead." },
    icon: Network,
    games: ["grid", "minesweeper", "connections", "neighbors", "border-chain"],
  },
  {
    id: "knowledge",
    name: { de: "Weltwissen", en: "World knowledge" },
    description: { de: "Städte, Sprachen und Superlative: Wie gut kennst du unseren Planeten?", en: "Cities, languages and superlatives: how well do you know our planet?" },
    icon: Globe2,
    games: ["capitals", "trivia", "higher-lower", "ranking", "languages", "origin", "nameall", "mountains", "millionaire"],
  },
  {
    id: "expeditions",
    name: { de: "Expeditionen & Routen", en: "Expeditions & routes" },
    description: { de: "Brich auf, plane deine Reise und entdecke neue Perspektiven.", en: "Set out, chart a route and discover a fresh perspective." },
    icon: Compass,
    games: ["expedition", "pin", "route", "waters"],
  },
];
