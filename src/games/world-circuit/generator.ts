import type { Difficulty } from "@/lib/types";
import { createSeededRandom } from "@/lib/random";
import { haversineKm, shuffle } from "@/lib/utils";
import { packCount, worldCityPool, type GeoCity } from "@/games/new-world/catalog";

export type { GeoCity } from "@/games/new-world/catalog";
export interface CircuitRound {
  id: string; hub: GeoCity; stops: GeoCity[]; bonus: GeoCity | null;
  optimalRoute: string[]; optimalKm: number; fuelKm: number;
}
export interface CircuitAnswer {
  valid: boolean; correct: boolean; distanceKm: number; optimalKm: number;
  points: number; ratio: number; bonusIncluded: boolean;
}

export function cityDistanceKm(a: GeoCity, b: GeoCity): number {
  return haversineKm([a.lng, a.lat], [b.lng, b.lat]);
}

export function circuitDistance(hub: GeoCity, stops: readonly GeoCity[]): number {
  const route = [hub, ...stops, hub];
  return route.slice(1).reduce((distance, city, index) => distance + cityDistanceKm(route[index], city), 0);
}

/** At most six stops: exact enumeration is small, deterministic and explainable. */
export function optimalCircuit(hub: GeoCity, stops: readonly GeoCity[]): { route: string[]; distanceKm: number } {
  const cities = [hub, ...stops];
  const distances = cities.map((a) => cities.map((b) => cityDistanceKm(a, b)));
  let best = Infinity;
  let bestOrder: number[] = [];
  function visit(path: number[], remaining: number[], distance: number) {
    if (distance >= best) return;
    const previous = path[path.length - 1] ?? 0;
    if (!remaining.length) {
      const complete = distance + distances[previous][0];
      if (complete < best) { best = complete; bestOrder = [...path]; }
      return;
    }
    for (const next of remaining) visit([...path, next], remaining.filter((index) => index !== next), distance + distances[previous][next]);
  }
  visit([], stops.map((_, index) => index + 1), 0);
  return { route: bestOrder.map((index) => cities[index].id), distanceKm: best };
}

export function buildWorldCircuitRounds(difficulty: Difficulty, count: number, seed: string): CircuitRound[] {
  const random = createSeededRandom(`${seed}:world-circuit`);
  const pool = worldCityPool(difficulty);
  const stopCount = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6;
  const tolerance = difficulty === "easy" ? 1.4 : difficulty === "medium" ? 1.24 : 1.14;
  const rounds: CircuitRound[] = [];
  const seen = new Set<string>();
  for (let attempt = 0; rounds.length < packCount(count) && attempt < 500; attempt++) {
    const shuffled = shuffle(pool, random);
    const hub = shuffled[0];
    if (!hub) break;
    const chosen: GeoCity[] = [hub];
    // Mix a regional planning puzzle with global circuits, rather than every
    // board looking like the same continental lap.
    const regional = attempt % 3 === 0;
    const ordered = regional ? [...shuffled].sort((a, b) => cityDistanceKm(hub, a) - cityDistanceKm(hub, b)) : shuffled;
    for (const city of ordered) {
      if (chosen.some((existing) => existing.cca3 === city.cca3 || cityDistanceKm(existing, city) < 160)) continue;
      chosen.push(city);
      if (chosen.length === stopCount + 1) break;
    }
    if (chosen.length !== stopCount + 1) continue;
    const key = chosen.map((city) => city.id).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const stops = shuffle(chosen.slice(1), random);
    const optimum = optimalCircuit(hub, stops);
    const fuelKm = Math.ceil(optimum.distanceKm * tolerance / 10) * 10;
    let bonus: GeoCity | null = null;
    if (difficulty !== "easy") {
      const baseRoute = [hub, ...optimum.route.map((id) => stops.find((city) => city.id === id)!), hub];
      for (const city of shuffled) {
        if (chosen.some((existing) => existing.cca3 === city.cca3 || cityDistanceKm(existing, city) < 160)) continue;
        const insertionCost = Math.min(...baseRoute.slice(1).map((next, index) => cityDistanceKm(baseRoute[index], city) + cityDistanceKm(city, next) - cityDistanceKm(baseRoute[index], next)));
        if (optimum.distanceKm + insertionCost <= fuelKm) { bonus = city; break; }
      }
    }
    rounds.push({ id: `${seed}:circuit:${rounds.length}`, hub, stops, bonus, optimalRoute: optimum.route, optimalKm: optimum.distanceKm, fuelKm });
  }
  return rounds;
}

export function evaluateCircuit(round: CircuitRound, orderedStopIds: readonly string[]): CircuitAnswer {
  const available = [...round.stops, ...(round.bonus ? [round.bonus] : [])];
  const unique = new Set(orderedStopIds);
  const valid = unique.size === orderedStopIds.length && round.stops.every((city) => unique.has(city.id)) &&
    orderedStopIds.every((id) => available.some((city) => city.id === id));
  if (!valid) return { valid: false, correct: false, distanceKm: 0, optimalKm: round.optimalKm, points: 0, ratio: 0, bonusIncluded: false };
  const route = orderedStopIds.map((id) => available.find((city) => city.id === id)!);
  const distanceKm = circuitDistance(round.hub, route);
  const bonusIncluded = !!round.bonus && unique.has(round.bonus.id);
  const optimalKm = bonusIncluded ? optimalCircuit(round.hub, [...round.stops, round.bonus!]).distanceKm : round.optimalKm;
  const ratio = optimalKm > 0 ? Math.min(1, optimalKm / Math.max(distanceKm, optimalKm)) : 1;
  const correct = distanceKm <= round.fuelKm + 0.001;
  const ceiling = round.bonus && !bonusIncluded ? 900 : 1000;
  return { valid: true, correct, distanceKm, optimalKm, points: correct ? Math.round(ceiling * ratio) : 0, ratio, bonusIncluded };
}
