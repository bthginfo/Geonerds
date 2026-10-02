import { COUNTRIES, poolForDifficulty } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { normalize } from "@/lib/fuzzy";
import { seededShuffle } from "@/lib/random";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { haversineKm } from "@/lib/utils";
import type { Country, Difficulty, Locale } from "@/lib/types";

export const RADAR_GUESS_LIMIT: Record<Difficulty, number> = { easy: 8, medium: 6, hard: 4 };
export const RADAR_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type RadarWarmth = "cold" | "cool" | "warm" | "hot" | "burning";

export function distanceAndBearing(from: [number, number], to: [number, number]): { distanceKm: number; bearing: number | null } {
  const distanceKm = haversineKm([from[1], from[0]], [to[1], to[0]]);
  if (distanceKm < 0.001) return { distanceKm: 0, bearing: null };
  const radians = (value: number) => value * Math.PI / 180;
  const lat1 = radians(from[0]);
  const lat2 = radians(to[0]);
  const deltaLng = radians(((to[1] - from[1] + 540) % 360) - 180);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return { distanceKm, bearing: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360 };
}

export function radarDirection(bearing: number) { return RADAR_DIRECTIONS[Math.round(bearing / 45) % 8]; }

export function radarWarmth(distanceKm: number): RadarWarmth {
  if (distanceKm < 500) return "burning";
  if (distanceKm < 1500) return "hot";
  if (distanceKm < 3500) return "warm";
  if (distanceKm < 7000) return "cool";
  return "cold";
}

export function radarScore(attempt: number, limit: number, difficulty: Difficulty): number {
  const fraction = Math.max(1 / Math.max(1, limit), Math.min(1, (limit + 1 - Math.max(1, attempt)) / limit));
  return Math.round(250 * fraction * DIFFICULTY_MULTIPLIER[difficulty]);
}

export function evaluateRadarGuess(answer: Country, guess: Country, priorCodes: readonly string[], difficulty: Difficulty) {
  const limit = RADAR_GUESS_LIMIT[difficulty];
  if (!answer.latlng || !guess.latlng || priorCodes.includes(guess.cca3) || priorCodes.length >= limit) return null;
  const geodesic = distanceAndBearing(guess.latlng, answer.latlng);
  const correct = guess.cca3 === answer.cca3;
  const attempt = priorCodes.length + 1;
  return {
    ...geodesic,
    warmth: radarWarmth(geodesic.distanceKm),
    correct,
    outcome: correct ? "solved" as const : attempt >= limit ? "exhausted" as const : "continue" as const,
    points: correct ? radarScore(attempt, limit, difficulty) : 0,
  };
}

export function buildRadarTargets(difficulty: Difficulty, count: number, seed: string): Country[] {
  const pool = poolForDifficulty(difficulty).filter((country) => country.latlng && country.latlng.every(Number.isFinite));
  return seededShuffle(pool, `${seed}:country-radar:targets`).slice(0, count === 0 ? pool.length : Math.max(0, count));
}

function searchName(value: string) { return normalize(value.replace(/ß/g, "ss")); }

/** Selection always resolves to one country, even when an alias such as Congo is ambiguous. */
export function countrySuggestions(query: string, guessed: ReadonlySet<string>, locale: Locale): Country[] {
  const term = searchName(query);
  if (!term) return [];
  return COUNTRIES.filter((country) => !guessed.has(country.cca3) && country.latlng &&
    [...countryAccepted(country), country.cca2, country.cca3].some((name) => searchName(name).includes(term)))
    .sort((a, b) => {
      const rank = (country: Country) => {
        const names = [...countryAccepted(country), country.cca2, country.cca3].map(searchName);
        return names.includes(term) ? 0 : names.some((name) => name.startsWith(term)) ? 1 : 2;
      };
      return rank(a) - rank(b) || a.name[locale].localeCompare(b.name[locale], locale);
    }).slice(0, 8);
}
