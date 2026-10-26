import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import type { Country } from "@/lib/types";
import { shuffle, pickOne } from "@/lib/utils";

// Adjacency between countries by ccn3 (the id the map uses), via land borders.
const adj = new Map<string, Set<string>>();
for (const c of COUNTRIES) {
  if (!c.ccn3) continue;
  const set = new Set<string>();
  for (const b of c.borders) {
    const n = getCountryByCca3(b);
    if (n?.ccn3) set.add(String(n.ccn3));
  }
  adj.set(String(c.ccn3), set);
}

export function ccn3Neighbors(ccn3: string): Set<string> {
  return adj.get(ccn3) ?? new Set();
}

/** BFS distances from a start ccn3 to every reachable country. */
export function distancesFrom(start: string): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    for (const nb of ccn3Neighbors(cur)) {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        queue.push(nb);
      }
    }
  }
  return dist;
}

export interface RoutePair {
  a: Country;
  b: Country;
  optimal: number;
}

/** Pick a start/destination pair whose shortest land route length is in range. */
export function pickRoutePair(pool: Country[], minLen: number, maxLen: number, random: () => number = Math.random): RoutePair | null {
  const starts = shuffle(pool.filter((c) => c.ccn3 && ccn3Neighbors(String(c.ccn3)).size > 0), random);
  for (const a of starts) {
    const dist = distancesFrom(String(a.ccn3));
    const candidates: Country[] = [];
    for (const [ccn3, d] of dist) {
      if (d >= minLen && d <= maxLen) {
        const c = COUNTRIES.find((x) => String(x.ccn3) === ccn3);
        if (c) candidates.push(c);
      }
    }
    if (candidates.length) {
      const b = pickOne(candidates, random);
      return { a, b, optimal: dist.get(String(b.ccn3))! };
    }
  }
  return null;
}

export interface RouteRound extends RoutePair { dist: Map<string, number> }

const distanceCache = new Map<string, Map<string, number>>();
function routeDistances(code: string): Map<string, number> {
  let result = distanceCache.get(code);
  if (!result) { result = distancesFrom(code); distanceCache.set(code, result); }
  return result;
}

/** Unique endpoint pairs, complete shortest-path witnesses, no retry lottery. */
export function generateRouteRounds(pool: Country[], min: number, max: number, count: number, random: () => number = Math.random): RouteRound[] {
  const limit = Math.min(100, Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0));
  if (!limit) return [];
  const eligible = pool.filter((country) => country.ccn3 && ccn3Neighbors(String(country.ccn3)).size);
  const pairs: RoutePair[] = [];
  for (let index = 0; index < eligible.length; index++) {
    const a = eligible[index];
    const distances = routeDistances(String(a.ccn3));
    for (const b of eligible.slice(index + 1)) {
      const length = distances.get(String(b.ccn3));
      if (length !== undefined && length >= min && length <= max) pairs.push({ a, b, optimal: length });
    }
  }
  return shuffle(pairs, random).slice(0, limit).map((pair) => {
    const [a, b] = random() < .5 ? [pair.a, pair.b] : [pair.b, pair.a];
    return { a, b, optimal: pair.optimal, dist: routeDistances(String(b.ccn3)) };
  });
}
