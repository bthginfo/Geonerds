import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { createSeededRandom } from "@/lib/random";
import { generateRankingRounds, rankingValue } from "./generator";

describe("ranking puzzle variety", () => {
  it.each(["easy", "medium", "hard"] as const)("produces 50 unique unsolved %s puzzles with all five metrics", (difficulty) => {
    const rounds = generateRankingRounds(COUNTRIES, difficulty, 50, createSeededRandom("ranking"));
    expect(rounds).toEqual(generateRankingRounds(COUNTRIES, difficulty, 50, createSeededRandom("ranking")));
    expect(rounds).toHaveLength(50);
    expect(new Set(rounds.map((round) => round.metric)).size).toBe(5);
    const signatures = new Set<string>();
    for (const round of rounds) {
      expect(round.items.map((country) => country.cca3)).not.toEqual(round.sorted.map((country) => country.cca3));
      expect(new Set(round.items.map((country) => Math.round(rankingValue(country, round.metric)))).size).toBe(round.items.length);
      const values = round.sorted.map((country) => rankingValue(country, round.metric));
      expect(values).toEqual([...values].sort((a, b) => round.dir === "asc" ? a - b : b - a));
      signatures.add(`${round.metric}:${round.items.map((country) => country.cca3).sort().join(",")}`);
    }
    expect(signatures.size).toBe(50);
  });
  it("handles empty, too-small, invalid and overlarge requests in bounded time", () => {
    expect(generateRankingRounds([], "hard", 50)).toEqual([]);
    expect(generateRankingRounds(COUNTRIES.slice(0, 2), "easy", 10)).toEqual([]);
    expect(generateRankingRounds(COUNTRIES, "easy", NaN)).toEqual([]);
    expect(generateRankingRounds(COUNTRIES, "easy", 10000)).toHaveLength(100);
  });
});
