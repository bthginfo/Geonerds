import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { jigsawPieceCount, selectJigsawPuzzle } from "./puzzle";

describe("Map Jigsaw selection", () => {
  it("only returns available geometry and the requested piece count", () => {
    const ids = new Set(COUNTRIES.filter((country) => country.ccn3).map((country) => String(country.ccn3)));
    const puzzle = selectJigsawPuzzle(COUNTRIES, ids, "hard", () => 0.25);
    expect(puzzle).not.toBeNull();
    expect(puzzle!.pieces).toHaveLength(jigsawPieceCount("hard"));
    expect(puzzle!.pieces.every((country) => ids.has(String(country.ccn3)))).toBe(true);
    expect(new Set(puzzle!.pieces.map((country) => country.cca3)).size).toBe(puzzle!.pieces.length);
  });
});
