import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { countryFitsCell, generateFallbackGrid, generateGrid, validateGridEntry } from "./generator";

describe("Geo Grid generator", () => {
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    it(`is deterministic and valid across 100 ${difficulty} seeds`, () => {
      const floor = difficulty === "easy" ? 4 : difficulty === "medium" ? 2 : 1;
      for (let seed = 0; seed < 100; seed++) {
        const first = generateGrid(COUNTRIES, difficulty, seed);
        expect(generateGrid(COUNTRIES, difficulty, seed)).toEqual(first);
        expect(first.cells).toHaveLength(9);
        expect(new Set(first.witness).size).toBe(9);
        for (let index = 0; index < 9; index++) {
          const cell = first.cells[index];
          const witness = COUNTRIES.find((country) => country.cca3 === first.witness[index]);
          expect(cell.candidates.length).toBeGreaterThanOrEqual(floor);
          expect(witness && countryFitsCell(witness, first, cell.row, cell.column)).toBe(true);
        }
      }
    });
  }

  it("rejects reuse even when a country fits another cell", () => {
    const puzzle = generateGrid(COUNTRIES, "easy", 42);
    const code = puzzle.witness[0];
    expect(validateGridEntry(puzzle, COUNTRIES, 0, 0, code, new Set([code]))).toBe("duplicate");
  });

  it("accepts its witness as nine sequential unique entries", () => {
    const puzzle = generateGrid(COUNTRIES, "hard", 91);
    const used = new Set<string>();
    const filled = new Set<number>();
    puzzle.witness.forEach((code, index) => {
      expect(validateGridEntry(puzzle, COUNTRIES, Math.floor(index / 3), index % 3, code, used, filled)).toBe("valid");
      used.add(code); filled.add(index);
    });
  });

  it("keeps every tested fallback board valid", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const puzzle = generateFallbackGrid(COUNTRIES, difficulty, 0xffffffff);
      expect(puzzle?.fallback).toBe(true);
      expect(puzzle?.witness).toHaveLength(9);
      expect(new Set(puzzle?.witness).size).toBe(9);
    }
  });
});
