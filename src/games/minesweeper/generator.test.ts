import { describe, expect, it } from "vitest";
import { getCountryByCca3 } from "@/data/countries";
import { boardNeighbors, compatibleMasks, fallbackMinesweeperBoard, generateMinesweeperBoard, propertyMatches } from "./generator";

function verify(seed: number, difficulty: "easy" | "medium" | "hard") {
  const board = generateMinesweeperBoard(seed, difficulty);
  expect(board.codes).toHaveLength(difficulty === "easy" ? 8 : difficulty === "medium" ? 10 : 12);
  expect(new Set(board.codes).size).toBe(board.codes.length);
  const visited = new Set<string>([board.codes[0]]);
  const queue = [board.codes[0]];
  while (queue.length) for (const neighbor of boardNeighbors(board, queue.shift()!)) if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
  expect(visited.size).toBe(board.codes.length);
  for (const [left, right] of board.edges) {
    expect(getCountryByCca3(left)?.borders).toContain(right);
  }
  const mineRange = difficulty === "easy" ? [2, 2] : difficulty === "medium" ? [2, 4] : [3, 4];
  expect(board.mineCount).toBeGreaterThanOrEqual(mineRange[0]);
  expect(board.mineCount).toBeLessThanOrEqual(mineRange[1]);
  expect(board.mines.every((code) => propertyMatches(getCountryByCca3(code)!, board.property))).toBe(true);
  expect(board.codes.filter((code) => propertyMatches(getCountryByCca3(code)!, board.property))).toEqual(board.mines);
  for (const code of board.codes.filter((candidate) => !board.mines.includes(candidate))) {
    expect(board.clues[code]).toBe(boardNeighbors(board, code).filter((neighbor) => board.mines.includes(neighbor)).length);
  }
  const shown = Object.fromEntries(board.initialRevealed.map((code) => [code, board.clues[code]]));
  expect(compatibleMasks(board.codes, board.edges, board.mineCount, shown)).toHaveLength(1);
  expect(board.initialRevealed.length).toBeLessThan(board.codes.length - board.mineCount);
  return board;
}

describe("Geo Minesweeper generator", () => {
  it.each(["easy", "medium", "hard"] as const)("is deterministic and valid on %s", (difficulty) => {
    expect(generateMinesweeperBoard(123456, difficulty)).toEqual(generateMinesweeperBoard(123456, difficulty));
    verify(123456, difficulty);
  });

  it.each(["easy", "medium", "hard"] as const)("stress tests 100 %s seeds", (difficulty) => {
    for (let seed = 0; seed < 100; seed++) verify(seed, difficulty);
  });

  it.each(["easy", "medium", "hard"] as const)("has a valid tested %s fallback", (difficulty) => {
    const fallback = fallbackMinesweeperBoard(7, difficulty);
    expect(fallback).not.toBeNull();
    if (fallback) {
      const shown = Object.fromEntries(fallback.initialRevealed.map((code) => [code, fallback.clues[code]]));
      expect(compatibleMasks(fallback.codes, fallback.edges, fallback.mineCount, shown)).toHaveLength(1);
    }
  });
});
