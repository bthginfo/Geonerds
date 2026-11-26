import type { GameId, Locale } from "@/lib/types";

/**
 * Games removed from the catalogue (November 2026 overhaul). Their routes, setup
 * and code are gone, but saved scores, lifetime stats, earned badges and old
 * challenge records still reference these ids, so their names stay resolvable.
 */
export const RETIRED_GAMES = {
  trivia: { en: "Country Trivia", de: "Länder-Trivia" },
  mountains: { en: "Mountains & Volcanoes", de: "Berge & Vulkane" },
  languages: { en: "Scripts & Money", de: "Schrift & Währung" },
  trace: { en: "Trace the River", de: "Fluss nachzeichnen" },
  "city-compass": { en: "City Compass", de: "Städte-Kompass" },
  "geo-balance": { en: "Geo Balance", de: "Geo-Balance" },
  "latitude-lab": { en: "Latitude Lab", de: "Breitengrad-Labor" },
  "coastline-case": { en: "Coastline Case", de: "Küsten-Fall" },
  "climate-passport": { en: "Climate Passport", de: "Klima-Pass" },
  "atlas-relay": { en: "Atlas Relay", de: "Atlas-Staffel" },
  "world-circuit": { en: "World Circuit", de: "Weltrundreise" },
  expedition: { en: "Geo Expedition", de: "Geo-Expedition" },
} as const satisfies Partial<Record<GameId, Record<Locale, string>>>;

export type RetiredGameId = keyof typeof RETIRED_GAMES;

export const RETIRED_GAME_IDS = Object.keys(RETIRED_GAMES) as RetiredGameId[];

export function isRetiredGame(id: string): id is RetiredGameId {
  return Object.prototype.hasOwnProperty.call(RETIRED_GAMES, id);
}

/** i18n entries so historical scores keep a readable game name. */
export const RETIRED_GAME_MESSAGES: Record<Locale, Record<string, string>> = {
  en: Object.fromEntries(RETIRED_GAME_IDS.map((id) => [`games.${id}.name`, RETIRED_GAMES[id].en])),
  de: Object.fromEntries(RETIRED_GAME_IDS.map((id) => [`games.${id}.name`, RETIRED_GAMES[id].de])),
};
