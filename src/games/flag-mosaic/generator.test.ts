import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import ratios from "@/data/flag-ratios.json";
import { buildMosaicRounds, mosaicDimensions, mosaicScore, revealNextTiles } from "./generator";

describe("Flag Mosaic reveal mechanics", () => {
  it("uses true flag proportions with a complete seeded tile permutation", () => {
    const rounds = buildMosaicRounds(COUNTRIES, "hard", 0, "mosaic-all");
    expect(rounds).toHaveLength(196);
    expect(new Set(rounds.map((round) => round.answer.cca3)).size).toBe(196);
    for (const round of rounds) {
      const expected = mosaicDimensions((ratios as Record<string, number>)[round.answer.flag]);
      expect(round.columns).toBe(expected.columns);
      expect(round.rows).toBe(expected.rows);
      expect([...round.tileOrder].sort((a, b) => a - b)).toEqual(Array.from({ length: round.rows * round.columns }, (_, index) => index));
      expect(round.options.filter((country) => country.cca3 === round.answer.cca3)).toHaveLength(1);
      expect(new Set(round.options.map((country) => country.cca3)).size).toBe(4);
    }
  });

  it("replays targets, decoys and visible tiles for the same challenge seed", () => {
    expect(buildMosaicRounds(COUNTRIES, "medium", 25, "same")).toEqual(buildMosaicRounds(COUNTRIES, "medium", 25, "same"));
    expect(buildMosaicRounds(COUNTRIES, "medium", 25, "same")).not.toEqual(buildMosaicRounds(COUNTRIES, "medium", 25, "different"));
  });

  it("reveals only covered tiles, caps safely at the complete grid, and preserves state", () => {
    const visible = new Set([2, 5]);
    expect([...revealNextTiles(visible, [2, 0, 5, 1, 3, 4], 2)]).toEqual([2, 5, 0, 1]);
    expect(revealNextTiles(visible, [2, 0, 5, 1, 3, 4], 100).size).toBe(6);
    expect([...visible]).toEqual([2, 5]);
  });

  it.each(["easy", "medium", "hard"] as const)("strictly reduces points for extra tiles until the visible minimum on %s", (difficulty) => {
    const scores = Array.from({ length: 11 }, (_, offset) => mosaicScore(2 + offset, 12, 2, difficulty));
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[scores.length - 1]).toBeGreaterThan(0);
    for (let index = 1; index < scores.length; index++) expect(scores[index]).toBeLessThan(scores[index - 1]);
  });
});
