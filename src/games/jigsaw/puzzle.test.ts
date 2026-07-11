import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import {
  JIGSAW_PRESENTATION,
  compassSector,
  dropMatchesTarget,
  eligibleNeighborPuzzles,
  isRealBoardDrop,
  neighborPuzzleForAnchor,
  neighborRunSummary,
  selectNeighborPuzzles,
  type NeighborTarget,
} from "./puzzle";

const IDS = new Set(COUNTRIES.filter((country) => country.ccn3).map((country) => String(country.ccn3)));

describe("Neighbor Jigsaw", () => {
  it("builds India with exactly its six real land neighbors", () => {
    const india = getCountryByCca3("IND")!;
    const puzzle = neighborPuzzleForAnchor(india, IDS);
    expect(puzzle?.neighbors.map((country) => country.cca3)).toEqual(["BGD", "BTN", "MMR", "CHN", "NPL", "PAK"]);
  });

  it("selects deterministic, unique puzzles for a supplied random source", () => {
    const a = selectNeighborPuzzles(COUNTRIES, IDS, "medium", 3, () => 0.42);
    const b = selectNeighborPuzzles(COUNTRIES, IDS, "medium", 3, () => 0.42);
    expect(a.map((puzzle) => puzzle.anchor.cca3)).toEqual(b.map((puzzle) => puzzle.anchor.cca3));
    expect(new Set(a.map((puzzle) => puzzle.anchor.cca3)).size).toBe(a.length);
  });

  it.each(["easy", "medium", "hard"] as const)("returns complete reciprocal %s neighborhoods in the configured range", (difficulty) => {
    const puzzles = eligibleNeighborPuzzles(COUNTRIES, IDS, difficulty);
    const { minNeighbors, maxNeighbors } = JIGSAW_PRESENTATION[difficulty];
    expect(puzzles.length).toBeGreaterThan(0);
    for (const puzzle of puzzles) {
      expect(puzzle.neighbors.length).toBeGreaterThanOrEqual(minNeighbors);
      expect(puzzle.neighbors.length).toBeLessThanOrEqual(maxNeighbors);
      expect(new Set(puzzle.neighbors.map((neighbor) => neighbor.cca3)).size).toBe(puzzle.neighbors.length);
      for (const neighbor of puzzle.neighbors) {
        expect(puzzle.anchor.borders).toContain(neighbor.cca3);
        expect(neighbor.borders).toContain(puzzle.anchor.cca3);
      }
      expect(puzzle.neighbors.map((neighbor) => neighbor.cca3)).toEqual(puzzle.anchor.borders);
    }
  });

  it("rejects the whole puzzle instead of dropping a neighbor without geometry", () => {
    const india = getCountryByCca3("IND")!;
    const withoutBangladesh = new Set(IDS);
    withoutBangladesh.delete(String(getCountryByCca3("BGD")!.ccn3));
    expect(neighborPuzzleForAnchor(india, withoutBangladesh)).toBeNull();
  });

  it("rejects asymmetric border data", () => {
    const india = getCountryByCca3("IND")!;
    const broken = { ...india, borders: [...india.borders, "JPN"] };
    expect(neighborPuzzleForAnchor(broken, IDS)).toBeNull();
  });

  it("accepts rough, expanded and tiny-target drops but rejects the wrong side", () => {
    const target: NeighborTarget = { code: "NPL", cx: 560, cy: 170, bounds: [[530, 155], [590, 185]], tiny: false };
    expect(dropMatchesTarget({ x: 560, y: 170 }, target, "hard")).toBe(true);
    expect(dropMatchesTarget({ x: 620, y: 170 }, target, "medium")).toBe(true);
    expect(dropMatchesTarget({ x: 320, y: 170 }, target, "easy")).toBe(false);

    const tiny: NeighborTarget = { code: "BTN", cx: 580, cy: 215, bounds: [[576, 211], [584, 219]], tiny: true };
    expect(dropMatchesTarget({ x: 645, y: 215 }, tiny, "hard")).toBe(true);
  });

  it("reports broad compass sectors without exposing a target", () => {
    const anchor = { cx: 300, cy: 220 };
    expect(compassSector(anchor, { cx: 300, cy: 80 })).toBe("N");
    expect(compassSector(anchor, { cx: 430, cy: 110 })).toBe("NE");
    expect(compassSector(anchor, { cx: 140, cy: 230 })).toBe("W");
  });

  it("aggregates multi-round totals and country hits without duplicates", () => {
    const first = neighborPuzzleForAnchor(getCountryByCca3("IND")!, IDS)!;
    const second = neighborPuzzleForAnchor(getCountryByCca3("PAK")!, IDS)!;
    const summary = neighborRunSummary([first, second]);
    expect(summary.total).toBe(first.neighbors.length + second.neighbors.length);
    expect(summary.countryHits).toContain("IND");
    expect(summary.countryHits).toContain("PAK");
    expect(new Set(summary.countryHits).size).toBe(summary.countryHits.length);
  });

  it("treats a tray tap as selection and only a real board release as a drop", () => {
    const board = { left: 100, right: 700, top: 50, bottom: 450 };
    expect(isRealBoardDrop({ x: 40, y: 500 }, { x: 42, y: 501 }, board)).toBe(false);
    expect(isRealBoardDrop({ x: 40, y: 500 }, { x: 80, y: 480 }, board)).toBe(false);
    expect(isRealBoardDrop({ x: 40, y: 500 }, { x: 350, y: 250 }, board)).toBe(true);
  });
});
