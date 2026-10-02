import { seededShuffle } from "@/lib/random";
import { haversineKm } from "@/lib/utils";
import type { AnswerMode, Difficulty } from "@/lib/types";
import { COMPASS_CITIES, cityPool, type CompassCity } from "./cities";

export const COMPASS_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type CompassDirection = (typeof COMPASS_DIRECTIONS)[number];
export interface CityReference { city: CompassCity; direction: CompassDirection }
export interface CityCompassRound { answer: CompassCity; references: CityReference[]; options: CompassCity[] }

/** Shortest east/west difference, so 179° E -> 179° W is east, not west. */
export function wrappedLongitude(delta: number): number { return ((delta + 540) % 360) - 180; }

/** Relative latitude/longitude octant; the displayed cities are compass clues, not distance-scaled. */
export function relativeDirection(center: Pick<CompassCity, "lat" | "lng">, reference: Pick<CompassCity, "lat" | "lng">): CompassDirection | null {
  const north = reference.lat - center.lat;
  const east = wrappedLongitude(reference.lng - center.lng) * Math.cos((reference.lat + center.lat) * Math.PI / 360);
  if (Math.hypot(north, east) < 0.00001) return null;
  const angle = (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
  return COMPASS_DIRECTIONS[Math.round(angle / 45) % 8];
}

export function satisfiesCompass(candidate: CompassCity, references: readonly CityReference[]): boolean {
  return references.every((reference) => relativeDirection(candidate, reference.city) === reference.direction);
}

const geometryCache = new WeakMap<CompassCity, WeakMap<CompassCity, { distance: number; direction: CompassDirection | null }>>();

function cityGeometry(a: CompassCity, b: CompassCity) {
  let row = geometryCache.get(a);
  if (!row) { row = new WeakMap(); geometryCache.set(a, row); }
  let geometry = row.get(b);
  if (!geometry) {
    geometry = { distance: haversineKm([a.lng, a.lat], [b.lng, b.lat]), direction: relativeDirection(a, b) };
    row.set(b, geometry);
  }
  return geometry;
}

function cityDistance(a: CompassCity, b: CompassCity) { return cityGeometry(a, b).distance; }

function chooseReferences(answer: CompassCity, seed: string, difficulty: Difficulty): CityReference[] {
  const buckets = new Map<CompassDirection, CompassCity[]>();
  for (const reference of COMPASS_CITIES) {
    if (reference.id === answer.id) continue;
    const distance = cityDistance(answer, reference);
    if (distance < 0.1 || distance > 14000) continue;
    const direction = cityGeometry(answer, reference).direction;
    if (!direction) continue;
    const bucket = buckets.get(direction) ?? [];
    bucket.push(reference);
    buckets.set(direction, bucket);
  }
  // Near references tend to make the tightest bounds; keep a varied seeded
  // shortlist per octant, then greedily eliminate alternative city candidates.
  const shortlist = seededShuffle([...buckets.entries()].flatMap(([direction, cities]) =>
    cities.sort((a, b) => cityDistance(answer, a) - cityDistance(answer, b)).slice(0, 6)
      .map((city) => ({ city, direction })),
  ), `${seed}:references`);
  const references: CityReference[] = [];
  let survivors = [...COMPASS_CITIES];
  const requested = difficulty === "easy" ? 5 : difficulty === "medium" ? 4 : 3;
  while (references.length < requested) {
    const used = new Set(references.map((reference) => reference.direction));
    const available = shortlist.filter((reference) => !used.has(reference.direction));
    if (!available.length) break;
    const ranked = available.map((reference) => ({ reference, eliminated: survivors.reduce((count, candidate) =>
      count + Number(cityGeometry(candidate, reference.city).direction !== reference.direction), 0) }));
    ranked.sort((a, b) => b.eliminated - a.eliminated);
    const reference = ranked[0].reference;
    references.push(reference);
    survivors = survivors.filter((candidate) => cityGeometry(candidate, reference.city).direction === reference.direction);
  }
  return references;
}

export function buildCityCompassRounds(difficulty: Difficulty, count: number, seed: string, mode: AnswerMode = "choice"): CityCompassRound[] {
  const rounds: CityCompassRound[] = [];
  const pool = cityPool(difficulty);
  for (const answer of seededShuffle(pool, `${seed}:city-compass:targets`)) {
    const references = chooseReferences(answer, `${seed}:city-compass:${answer.id}`, difficulty);
    if (references.length < 3) continue;
    if (mode === "type" && COMPASS_CITIES.filter((city) => references.every((reference) =>
      cityGeometry(city, reference.city).direction === reference.direction)).length !== 1) continue;
    const distractors = seededShuffle(pool.filter((city) => city.id !== answer.id &&
      !references.some((reference) => reference.city.id === city.id) && !references.every((reference) => cityGeometry(city, reference.city).direction === reference.direction)),
    `${seed}:city-compass:${answer.id}:decoys`);
    if (difficulty === "hard") distractors.sort((a, b) => cityDistance(answer, a) - cityDistance(answer, b));
    if (difficulty === "easy") distractors.sort((a, b) => cityDistance(answer, b) - cityDistance(answer, a));
    if (distractors.length < 3) continue;
    rounds.push({ answer, references, options: seededShuffle([answer, ...distractors.slice(0, 3)], `${seed}:city-compass:${answer.id}:options`) });
    if (count > 0 && rounds.length >= count) break;
  }
  return rounds;
}
