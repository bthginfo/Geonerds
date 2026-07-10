import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { buildConnectionPuzzle, matchesRelation } from "./generator";

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe("Geo Connections generator", () => {
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    it(`builds a fully solvable ${difficulty} chain with one visible answer`, () => {
      const puzzle = buildConnectionPuzzle(COUNTRIES, difficulty, seeded(42));
      expect(puzzle).not.toBeNull();
      for (const step of puzzle!.steps) {
        expect(step.candidates.filter((candidate) => matchesRelation(step.anchor, candidate, step.relation))).toHaveLength(1);
        expect(step.candidates.some((candidate) => candidate.cca3 === step.answer.cca3)).toBe(true);
      }
    });
  }
});
