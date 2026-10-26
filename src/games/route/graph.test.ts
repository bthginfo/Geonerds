import { describe, expect, it } from "vitest";
import { COUNTRIES, poolForDifficulty } from "@/data/countries";
import { createSeededRandom } from "@/lib/random";
import { ccn3Neighbors, distancesFrom, generateRouteRounds } from "./graph";

describe("route run generation", () => {
  it.each(["easy", "medium", "hard"] as const)("builds fifty distinct reachable %s routes", (difficulty) => {
    const [min, max] = difficulty === "easy" ? [2, 4] : difficulty === "hard" ? [5, 9] : [3, 6];
    const pool = poolForDifficulty(difficulty);
    const make = () => generateRouteRounds(pool, min, max, 50, createSeededRandom(`route-${difficulty}`));
    const rounds = make();
    expect(rounds).toHaveLength(50);
    expect(rounds).toEqual(make());
    const signatures = rounds.map((round) => [round.a.cca3, round.b.cca3].sort().join("/"));
    expect(new Set(signatures).size).toBe(50);
    for (const round of rounds) {
      expect(pool).toContain(round.a);
      expect(pool).toContain(round.b);
      expect(round.optimal).toBeGreaterThanOrEqual(min);
      expect(round.optimal).toBeLessThanOrEqual(max);
      let current = String(round.a.ccn3);
      let remaining = round.optimal;
      while (remaining > 0) {
        const next = [...ccn3Neighbors(current)].find((code) => round.dist.get(code) === remaining - 1);
        expect(next).toBeDefined();
        current = next!;
        remaining--;
      }
      expect(current).toBe(String(round.b.ccn3));
    }
  });
  it("terminates for islands, sparse pools and impossible ranges", () => {
    expect(generateRouteRounds(COUNTRIES.filter((country) => !country.borders.length), 2, 5, 50)).toEqual([]);
    expect(generateRouteRounds([], 2, 5, 50)).toEqual([]);
    expect(generateRouteRounds(COUNTRIES, 500, 1000, 50)).toEqual([]);
    expect(distancesFrom("not-a-country")).toEqual(new Map([["not-a-country", 0]]));
  });
});
