import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { JIGSAW_PRESENTATION, isRealBoardDrop, jigsawPieceCount, nearestJigsawTarget, selectJigsawPuzzle, targetTolerance } from "./puzzle";

const IDS = new Set(COUNTRIES.filter((country) => country.ccn3).map((country) => String(country.ccn3)));

describe("Map Jigsaw", () => {
  it.each([["easy", 6], ["medium", 9], ["hard", 12]] as const)("creates a unique %s puzzle with %i pieces", (difficulty, count) => {
    const puzzle = selectJigsawPuzzle(COUNTRIES, IDS, difficulty, () => 0.25);
    expect(puzzle).not.toBeNull();
    expect(jigsawPieceCount(difficulty)).toBe(count);
    expect(puzzle!.pieces).toHaveLength(count);
    expect(new Set(puzzle!.pieces.map((country) => country.cca3)).size).toBe(count);
    expect(puzzle!.pieces.every((country) => IDS.has(String(country.ccn3)))).toBe(true);
  });

  it("is deterministic for a supplied random source", () => {
    const a = selectJigsawPuzzle(COUNTRIES, IDS, "hard", () => 0.42);
    const b = selectJigsawPuzzle(COUNTRIES, IDS, "hard", () => 0.42);
    expect(a?.subregion).toBe(b?.subregion);
    expect(a?.pieces.map((country) => country.cca3)).toEqual(b?.pieces.map((country) => country.cca3));
  });

  it("does not output an impossible board", () => {
    expect(selectJigsawPuzzle(COUNTRIES.slice(0, 3), IDS, "hard", () => 0)).toBeNull();
  });

  it("hides names and exact slots in challenge modes", () => {
    expect(JIGSAW_PRESENTATION.easy.exactSlots).toBe(true);
    expect(JIGSAW_PRESENTATION.medium.namedPieces).toBe(false);
    expect(JIGSAW_PRESENTATION.medium.exactSlots).toBe(false);
    expect(JIGSAW_PRESENTATION.hard.positionMarkers).toBe(false);
  });

  it("uses nearest targets and gives tiny islands a larger tolerance", () => {
    const targets = [
      { code: "A", cx: 10, cy: 10, tiny: false },
      { code: "B", cx: 100, cy: 100, tiny: true },
    ];
    expect(nearestJigsawTarget({ x: 13, y: 14 }, targets, "hard")?.code).toBe("A");
    expect(nearestJigsawTarget({ x: 170, y: 100 }, targets, "hard")?.code).toBe("B");
    expect(targetTolerance("hard", true)).toBeGreaterThan(targetTolerance("hard", false));
  });

  it("treats a tray tap as selection and only a real board release as a drop", () => {
    const board = { left: 100, right: 700, top: 50, bottom: 450 };
    expect(isRealBoardDrop({ x: 40, y: 500 }, { x: 42, y: 501 }, board)).toBe(false);
    expect(isRealBoardDrop({ x: 40, y: 500 }, { x: 80, y: 480 }, board)).toBe(false);
    expect(isRealBoardDrop({ x: 40, y: 500 }, { x: 350, y: 250 }, board)).toBe(true);
  });
});
