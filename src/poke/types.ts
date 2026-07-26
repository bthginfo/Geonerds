import type { Locale } from "@/lib/types";

export type Localized = { en: string; de: string };
export const pl = (value: Localized, locale: Locale) => value[locale];

export type PokeGameId =
  | "guess-that-pokemon"
  | "poke-path-expedition"
  | "region-ranger"
  | "habitat-hunt"
  | "type-clash-arena"
  | "gym-draft-gauntlet"
  | "evolution-lab"
  | "field-scanner"
  | "cry-radar"
  | "poke-grid"
  | "binder-ascension"
  | "professor-case-files";

export type PokeCompetency = "exploration" | "locations" | "ecology" | "types" | "teamcraft" | "evolution" | "deckcraft" | "recognition" | "audio" | "taxonomy" | "deduction";
export type PokeDifficulty = "easy" | "medium" | "hard";
export type PokeDexStage = "sealed" | "encountered" | "researched" | "mastered";

export interface Species {
  id: number;
  name: Localized;
  sprite: string;
  fallbackSprite: string;
  cry: string | null;
  legacyCry: string | null;
  types: string[];
  stats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number };
  abilities: string[];
  generation: number;
  habitat: string;
  color: string;
  shape: string;
  legendary: boolean;
  mythical: boolean;
  evolvesFrom: number | null;
  heightM: number;
  weightKg: number;
}

export interface PokeGameDefinition {
  id: PokeGameId;
  title: Localized;
  eyebrow: Localized;
  description: Localized;
  competency: PokeCompetency;
  signal: "red" | "cyan" | "green" | "amber";
}

export interface PokeRun {
  id: string;
  gameId: PokeGameId;
  score: number;
  correct: number;
  total: number;
  selectedRounds: 5 | 10 | 20;
  completedRounds: number;
  normalizedRating: number;
  difficulty: PokeDifficulty;
  generationCap: number;
  durationMs: number;
  practice: boolean;
  speciesIds: number[];
  createdAt: number;
  verified?: boolean;
  legacy?: boolean;
}

export interface PokePlayResult {
  score: number;
  correct: number;
  questions: number;
  completedRounds: number;
  speciesIds: number[];
  durationMs: number;
}
