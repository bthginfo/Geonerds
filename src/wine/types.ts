import type { Locale } from "@/lib/types";

export type WineGameId =
  | "terroir-detective"
  | "aroma-atelier"
  | "wine-map"
  | "pairing-duel"
  | "cellar-builder"
  | "label-decoder"
  | "regional-connections"
  | "appellation-ladder"
  | "winemakers-dilemma"
  | "grape-dna"
  | "same-grape"
  | "cellar-mystery"
  | "tasting-note-builder"
  | "service-challenge"
  | "sommelier-exam";

export type WineCompetency =
  | "geography"
  | "terroir"
  | "grapes"
  | "sensory"
  | "pairing"
  | "service"
  | "production"
  | "theory";

export type Localized = { en: string; de: string };
export const localize = (value: Localized, locale: Locale) => value[locale];

export type WineEntityType = "grape" | "region" | "appellation" | "aroma" | "style";
export type WineDexStage = "sealed" | "tasted" | "studied" | "certified" | "mastered";

export interface Grape {
  id: string;
  name: string;
  climate: Localized;
  structure: Localized;
  aromas: string[];
  synonyms: string[];
  regions: string[];
  clue: Localized;
}

export interface WineRegion {
  id: string;
  country: Localized;
  name: Localized;
  lat: number;
  lng: number;
  climate: Localized;
  grapes: string[];
}

export interface Appellation {
  id: string;
  country: Localized;
  regionId: string;
  name: string;
  parent?: string;
  level: Localized;
  style: Localized;
  source: string;
  reviewed: string;
}

export interface Aroma {
  id: string;
  name: Localized;
  family: "primary" | "winemaking" | "maturation";
  grapeIds: string[];
  note: Localized;
}

export interface WineGameDefinition {
  id: WineGameId;
  title: Localized;
  eyebrow: Localized;
  description: Localized;
  competency: WineCompetency;
  tone: "copper" | "grape" | "vine";
  rounds: number;
}

export interface WineRun {
  id: string;
  gameId: WineGameId;
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  durationMs: number;
  difficulty: "easy" | "medium" | "hard";
  practice: boolean;
  createdAt: number;
}
