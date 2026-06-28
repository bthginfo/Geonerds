export type Locale = "en" | "de";

export interface Country {
  cca2: string;
  cca3: string;
  ccn3: string | null;
  flag: string; // flag-icons 2-letter code (lowercase)
  name: { en: string; de: string };
  official: { en: string; de: string };
  capital: string | null;
  region: string;
  subregion: string;
  latlng: [number, number] | null;
  area: number;
  population: number;
  gdp: number | null;
  landlocked: boolean;
  borders: string[];
  independent: boolean;
  unMember: boolean;
  difficulty: 1 | 2 | 3 | 4;
}

export type GameId =
  | "flags"
  | "capitals"
  | "outline"
  | "higher-lower"
  | "map-click"
  | "draw"
  | "border-chain";

export type Difficulty = "easy" | "medium" | "hard";

export type AnswerMode = "choice" | "type";

export interface RunResult {
  gameId: GameId;
  difficulty: Difficulty;
  mode?: AnswerMode | string;
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  durationMs: number;
  createdAt: number;
}
