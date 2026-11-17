import type { Difficulty } from "@/lib/types";
import { createSeededRandom } from "@/lib/random";
import { shuffle } from "@/lib/utils";
import { packCount, worldCityPool, type GeoCity } from "@/games/new-world/catalog";

export type { GeoCity } from "@/games/new-world/catalog";
export interface LatitudeRound { id: string; cities: GeoCity[]; tolerance: number }
export interface LatitudeAnswer {
  valid: boolean; correct: boolean; points: number; meanError: number;
  placements: { city: GeoCity; guess: number; actual: number; error: number; withinTolerance: boolean }[];
}

export function buildLatitudeRounds(difficulty: Difficulty, count: number, seed: string): LatitudeRound[] {
  const random = createSeededRandom(`${seed}:latitude-lab`);
  const pool = worldCityPool(difficulty);
  const cityCount = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6;
  const tolerance = difficulty === "easy" ? 12 : difficulty === "medium" ? 8 : 5;
  const rounds: LatitudeRound[] = [];
  const seen = new Set<string>();
  for (let attempt = 0; rounds.length < packCount(count) && attempt < 500; attempt++) {
    const shuffled = shuffle(pool, random);
    const anchor = shuffled[0];
    if (!anchor) break;
    const candidates = difficulty === "hard" && attempt % 2 === 0
      ? [...shuffled].sort((a, b) => Math.abs(a.lat - anchor.lat) - Math.abs(b.lat - anchor.lat)) : shuffled;
    const cities: GeoCity[] = [];
    for (const city of candidates) {
      if (cities.some((existing) => existing.cca3 === city.cca3 || Math.abs(existing.lat - city.lat) < (difficulty === "easy" ? 8 : 1))) continue;
      cities.push(city);
      if (cities.length === cityCount) break;
    }
    if (cities.length !== cityCount || Math.max(...cities.map((city) => city.lat)) - Math.min(...cities.map((city) => city.lat)) < 14) continue;
    const signature = cities.map((city) => city.id).sort().join("|");
    if (seen.has(signature)) continue;
    seen.add(signature);
    rounds.push({ id: `${seed}:latitude:${rounds.length}`, cities: shuffle(cities, random), tolerance });
  }
  return rounds;
}

export function evaluateLatitude(round: LatitudeRound, positions: Record<string, number>): LatitudeAnswer {
  const valid = Object.keys(positions).length === round.cities.length && Object.keys(positions).every((id) => round.cities.some((city) => city.id === id)) &&
    round.cities.every((city) => Number.isFinite(positions[city.id]) && positions[city.id] >= -90 && positions[city.id] <= 90);
  if (!valid) return { valid: false, correct: false, points: 0, meanError: 0, placements: [] };
  const placements = round.cities.map((city) => {
    const guess = positions[city.id];
    const error = Math.abs(city.lat - guess);
    return { city, guess, actual: city.lat, error, withinTolerance: error <= round.tolerance };
  });
  const meanError = placements.reduce((sum, placement) => sum + placement.error, 0) / Math.max(1, placements.length);
  const correct = placements.filter((placement) => placement.withinTolerance).length >= Math.ceil(round.cities.length * 0.75);
  return { valid: true, correct, points: correct ? Math.max(250, Math.round(1000 - meanError * 30)) : 0, meanError, placements };
}
