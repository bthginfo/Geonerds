import { describe, expect, it } from "vitest";
import { COUNTRIES, poolForDifficulty } from "@/data/countries";
import { capitalLabel } from "@/games/aliases";
import { atlasMatchPoints, ATLAS_BOARD_PAIRS, buildAtlasMatchBoards, isAtlasMatch } from "./generator";

describe("Atlas Match finite asymmetric journeys", () => {
  it.each(["easy", "medium", "hard"] as const)("creates unique, unambiguous paired boards on %s", (difficulty) => {
    const boards = buildAtlasMatchBoards(poolForDifficulty(difficulty), difficulty, 0, "atlas-invariants");
    const all = boards.flatMap((board) => board.countries);
    expect(all.length).toBeGreaterThan(20);
    expect(new Set(all.map((country) => country.cca3)).size).toBe(all.length);
    for (const board of boards) {
      expect(board.countries.length).toBeLessThanOrEqual(ATLAS_BOARD_PAIRS[difficulty]);
      expect(board.cards).toHaveLength(board.countries.length * 2);
      expect(new Set(board.cards.map((card) => card.id)).size).toBe(board.cards.length);
      for (const country of board.countries) {
        const pair = board.cards.filter((card) => card.country.cca3 === country.cca3);
        expect(pair).toHaveLength(2);
        expect(isAtlasMatch(pair[0], pair[1])).toBe(true);
        expect(isAtlasMatch(pair[0], pair[0])).toBe(false);
      }
      if (difficulty !== "easy") for (const locale of ["en", "de"] as const) {
        const labels = board.countries.map((country) => capitalLabel(country, locale));
        expect(labels.every(Boolean)).toBe(true);
        expect(new Set(labels).size).toBe(labels.length);
      }
    }
  });

  it("replays identical seeds and starts differently on a fresh run", () => {
    expect(buildAtlasMatchBoards(COUNTRIES, "hard", 10, "same")).toEqual(buildAtlasMatchBoards(COUNTRIES, "hard", 10, "same"));
    expect(buildAtlasMatchBoards(COUNTRIES, "hard", 10, "same")).not.toEqual(buildAtlasMatchBoards(COUNTRIES, "hard", 10, "new"));
    expect(buildAtlasMatchBoards(COUNTRIES, "easy", 10, "count").flatMap((board) => board.countries)).toHaveLength(10);
  });

  it("handles tiny, duplicated, missing-capital and invalid-count inputs safely", () => {
    const country = COUNTRIES[0];
    expect(buildAtlasMatchBoards([], "medium", 0, "empty")).toEqual([]);
    expect(buildAtlasMatchBoards([country, country], "easy", 50, "duplicate")).toHaveLength(1);
    expect(buildAtlasMatchBoards([{ ...country, capital: null }], "medium", 10, "capital")).toEqual([]);
    expect(buildAtlasMatchBoards(COUNTRIES, "hard", Number.NaN, "invalid")).toEqual([]);
    expect(buildAtlasMatchBoards(COUNTRIES, "hard", -1, "invalid")).toEqual([]);
    const duplicateCapital = { ...COUNTRIES[1], capital: country.capital };
    expect(buildAtlasMatchBoards([country, duplicateCapital], "hard", 10, "ambiguous").flatMap((board) => board.countries)).toHaveLength(1);
  });

  it("keeps every pair award positive and inside the shared score contract", () => {
    expect(atlasMatchPoints(0)).toBe(1000);
    expect(atlasMatchPoints(1)).toBeLessThan(1000);
    expect(atlasMatchPoints(500)).toBe(200);
    expect(atlasMatchPoints(-1)).toBe(1000);
    expect(atlasMatchPoints(Number.NaN)).toBe(1000);
    for (let mistakes = 0; mistakes < 20; mistakes++) expect(atlasMatchPoints(mistakes)).toBeLessThanOrEqual(1000);
  });
});
