import { describe, expect, it } from "vitest";
import { getCountryByCca3 } from "@/data/countries";
import type { Difficulty } from "@/lib/types";
import {
  BOARD_SIZE,
  CHOICE_COUNT,
  OUTLINE_UNITS,
  PIECES,
  anyTrayFits,
  blastPool,
  canPlace,
  cellIndex,
  clearLines,
  createRun,
  emptyBoard,
  findFullLines,
  fitsAnywhere,
  getPiece,
  nameTrayPiece,
  namingChoices,
  pieceSequence,
  placeOnBoard,
  placeTrayPiece,
  placementPoints,
  previewClear,
  suggestAnchor,
  summarize,
  trayChoices,
  type BlastState,
} from "./engine";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function connected(cells: readonly (readonly [number, number])[]): boolean {
  const keys = new Set(cells.map(([r, c]) => `${r},${c}`));
  const seen = new Set<string>([`${cells[0][0]},${cells[0][1]}`]);
  const stack = [cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${r + dr},${c + dc}`;
      if (keys.has(key) && !seen.has(key)) { seen.add(key); stack.push([r + dr, c + dc]); }
    }
  }
  return seen.size === keys.size;
}

describe("Atlas Blast piece data", () => {
  const entries = Object.values(PIECES);

  it("covers most independent countries", () => {
    expect(entries.length).toBeGreaterThanOrEqual(150);
    expect(new Set(entries.map((piece) => piece.cca3)).size).toBe(entries.length);
  });

  it.each(entries.map((piece) => [piece.cca3, piece] as const))("%s is a valid polyomino", (cca3, piece) => {
    const country = getCountryByCca3(cca3);
    expect(country?.independent).toBe(true);
    expect(piece.cells.length).toBeGreaterThanOrEqual(3);
    expect(piece.cells.length).toBeLessThanOrEqual(9);
    expect(Math.max(piece.w, piece.h)).toBeGreaterThanOrEqual(2);
    expect(Math.max(piece.w, piece.h)).toBeLessThanOrEqual(5);
    expect(new Set(piece.cells.map(([r, c]) => `${r},${c}`)).size).toBe(piece.cells.length);
    for (const [r, c] of piece.cells) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(piece.h);
      expect(c).toBeLessThan(piece.w);
    }
    // Tight bounding box.
    expect(Math.min(...piece.cells.map(([r]) => r))).toBe(0);
    expect(Math.min(...piece.cells.map(([, c]) => c))).toBe(0);
    expect(Math.max(...piece.cells.map(([r]) => r))).toBe(piece.h - 1);
    expect(Math.max(...piece.cells.map(([, c]) => c))).toBe(piece.w - 1);
    expect(connected(piece.cells)).toBe(true);
    expect(piece.outline).toMatch(/^M-?\d+,-?\d+L[-\d, ]+Z(M-?\d+,-?\d+L[-\d, ]+Z)*$/);
    expect(piece.outline.length).toBeLessThanOrEqual(400);
    const [minX, minY, maxX, maxY] = piece.box;
    expect(maxX).toBeGreaterThan(minX);
    expect(maxY).toBeGreaterThan(minY);
    // The outline sits on the blocks it was rasterised into.
    expect(minX).toBeLessThan(piece.w * OUTLINE_UNITS);
    expect(minY).toBeLessThan(piece.h * OUTLINE_UNITS);
    expect(maxX).toBeGreaterThan(0);
    expect(maxY).toBeGreaterThan(0);
  });

  it("restricts pools by tier", () => {
    expect(blastPool("easy").every((country) => country.difficulty <= 2)).toBe(true);
    expect(blastPool("easy").length).toBeGreaterThanOrEqual(100);
    expect(blastPool("hard").length).toBe(entries.length);
  });
});

describe("board logic", () => {
  const bar = { cells: [[0, 0], [0, 1], [0, 2]] as const };

  it("rejects out-of-bounds and overlapping placements", () => {
    const board = emptyBoard();
    expect(canPlace(board, bar, 0, 5)).toBe(true);
    expect(canPlace(board, bar, 0, 6)).toBe(false);
    expect(canPlace(board, bar, -1, 0)).toBe(false);
    const placed = placeOnBoard(board, bar, 3, 3, 7);
    expect(placed[cellIndex(3, 4)]).toBe(7);
    expect(canPlace(placed, bar, 3, 1)).toBe(false);
    expect(canPlace(placed, bar, 3, 0)).toBe(true);
  });

  it("clears full rows and columns simultaneously", () => {
    const board = emptyBoard();
    for (let col = 0; col < BOARD_SIZE; col++) board[cellIndex(2, col)] = 1;
    for (let row = 0; row < BOARD_SIZE; row++) board[cellIndex(row, 5)] = 2;
    board[cellIndex(7, 0)] = 3;
    const lines = findFullLines(board);
    expect(lines).toEqual({ rows: [2], cols: [5] });
    const { board: next, cleared } = clearLines(board, lines);
    expect(cleared).toHaveLength(15);
    expect(next.filter((cell) => cell !== 0)).toEqual([3]);
  });

  it("previews the cells a placement would clear", () => {
    const board = emptyBoard();
    for (let col = 3; col < BOARD_SIZE; col++) board[cellIndex(0, col)] = 1;
    expect(previewClear(board, bar, 0, 0)).toHaveLength(8);
    expect(previewClear(board, bar, 1, 0)).toHaveLength(0);
  });

  it("detects when no piece fits", () => {
    // Checkerboard: no two orthogonal neighbours are free, so no 3+ cell piece fits.
    const board = emptyBoard().map((_, index) => ((Math.floor(index / BOARD_SIZE) + index) % 2 === 0 ? 1 : 0));
    for (const piece of Object.values(PIECES)) expect(fitsAnywhere(board, piece)).toBe(false);
    expect(anyTrayFits(board, [{ index: 0, cca3: "FRA", naming: "unknown" }, null, null])).toBe(false);
    expect(suggestAnchor(board, getPiece("FRA"))).toBeNull();
    expect(anyTrayFits(emptyBoard(), [null, { index: 1, cca3: "FRA", naming: "unknown" }, null])).toBe(true);
  });

  it("ends the run when the remaining tray pieces do not fit", () => {
    const run = createRun("over-test", "medium");
    const blocked = emptyBoard().map((_, index) => ((Math.floor(index / BOARD_SIZE) + index) % 2 === 0 ? 9 : 0));
    const slot = 0;
    const shape = getPiece(run.tray[slot]!.cca3);
    // Free a spot for exactly this piece, keep everything else checkered.
    for (const [r, c] of shape.cells) blocked[cellIndex(r, c)] = 0;
    const state: BlastState = { ...run, board: blocked };
    const next = placeTrayPiece(state, slot, 0, 0);
    expect(next).not.toBeNull();
    expect(next!.over).toBe(true);
    expect(placeTrayPiece(next!, 1, 0, 0)).toBeNull();
  });
});

describe("scoring", () => {
  it("follows the published formula", () => {
    expect(placementPoints({ cells: 5, named: false, lines: 0, combo: 0, difficulty: "easy" }).total).toBe(50);
    expect(placementPoints({ cells: 5, named: true, lines: 0, combo: 0, difficulty: "easy" }).total).toBe(100);
    expect(placementPoints({ cells: 4, named: false, lines: 2, combo: 1, difficulty: "medium" })).toEqual({ cells: 60, lines: 600, combo: 0, total: 660 });
    expect(placementPoints({ cells: 3, named: true, lines: 1, combo: 3, difficulty: "hard" })).toEqual({ cells: 120, lines: 200, combo: 300, total: 620 });
    // A double clear pays more than two single clears.
    const single = placementPoints({ cells: 0, named: false, lines: 1, combo: 1, difficulty: "easy" }).lines;
    const double = placementPoints({ cells: 0, named: false, lines: 2, combo: 1, difficulty: "easy" }).lines;
    expect(double).toBeGreaterThan(single * 2);
  });

  it("doubles cell points after a correct name and records the hit", () => {
    const run = createRun("score-test", "easy");
    const piece = run.tray[0]!;
    const named = nameTrayPiece(run, 0, piece.cca3);
    expect(named.tray[0]!.naming).toBe("correct");
    expect(named.hits).toEqual([piece.cca3]);
    expect(nameTrayPiece(named, 0, "XXX")).toBe(named); // one attempt per piece
    const placed = placeTrayPiece(named, 0, 0, 0)!;
    expect(placed.score).toBe(20 * getPiece(piece.cca3).cells.length);
    const wrong = nameTrayPiece(run, 1, "XXX");
    expect(wrong.tray[1]!.naming).toBe("wrong");
    expect(wrong.hits).toEqual([]);
    expect(wrong.namingStreak).toBe(0);
  });

  it("keeps practice score at zero", () => {
    const run = createRun("practice", "hard", true);
    const placed = placeTrayPiece(run, 0, 0, 0)!;
    expect(placed.score).toBe(0);
    expect(summarize(placed).score).toBe(0);
  });

  it("counts combos only for consecutive clearing placements", () => {
    let state = createRun("combo", "medium");
    const bar = getPiece(state.tray[0]!.cca3);
    // Fill row 7 except where the piece's bottom row lands at the left edge.
    const board = emptyBoard();
    const bottom = bar.cells.filter(([r]) => r === bar.h - 1).map(([, c]) => c);
    for (let col = 0; col < BOARD_SIZE; col++) if (!bottom.includes(col)) board[cellIndex(7, col)] = 99;
    state = { ...state, board, combo: 1 };
    const row = 7 - (bar.h - 1);
    if (canPlace(board, bar, row, 0)) {
      const next = placeTrayPiece(state, 0, row, 0)!;
      expect(next.last!.linesCleared).toBeGreaterThanOrEqual(1);
      expect(next.combo).toBe(2);
      expect(next.last!.points.combo).toBeGreaterThan(0);
    }
    const reset = placeTrayPiece({ ...createRun("combo-2", "medium"), combo: 3 }, 0, 0, 0)!;
    expect(reset.combo).toBe(0);
  });
});

/** Deterministic bot: names every other piece (correctly when its index is even), places first fit. */
function playOut(seed: string, difficulty: Difficulty, practice = false) {
  let state = createRun(seed, difficulty, practice);
  let moves = 0;
  while (!state.over && moves < 1500) {
    const slot = state.tray.findIndex((piece) => piece && fitsAnywhere(state.board, getPiece(piece.cca3)));
    const piece = state.tray[slot]!;
    if (piece.index % 2 === 0) {
      const choices = trayChoices(state, slot);
      state = nameTrayPiece(state, slot, piece.index % 4 === 0 ? piece.cca3 : choices.find((code) => code !== piece.cca3)!);
    }
    const anchor = suggestAnchor(state.board, getPiece(piece.cca3))!;
    state = placeTrayPiece(state, slot, anchor.row, anchor.col)!;
    moves++;
  }
  return state;
}

describe("runs", () => {
  it("is deterministic per seed", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(pieceSequence("alpha", difficulty, 60)).toEqual(pieceSequence("alpha", difficulty, 60));
      expect(pieceSequence("alpha", difficulty, 60)).not.toEqual(pieceSequence("beta", difficulty, 60));
      const a = playOut(`det-${difficulty}`, difficulty);
      const b = playOut(`det-${difficulty}`, difficulty);
      expect(a.score).toBe(b.score);
      expect(a.board).toEqual(b.board);
      expect(a.placed).toBe(b.placed);
    }
  });

  it("keeps the sequence stable as it grows", () => {
    const short = pieceSequence("grow", "medium", 12);
    const long = pieceSequence("grow", "medium", 80);
    expect(long.slice(0, 12)).toEqual(short);
  });

  it("does not repeat a country within a short window", () => {
    const sequence = pieceSequence("repeat", "easy", 300);
    for (let i = 0; i < sequence.length; i++) expect(sequence.slice(Math.max(0, i - 8), i)).not.toContain(sequence[i]);
  });

  it("deals fewer large pieces on easy", () => {
    const average = (difficulty: Difficulty) => {
      const sequence = Array.from({ length: 20 }, (_, seed) => pieceSequence(`mix-${seed}`, difficulty, 60)).flat();
      return sequence.reduce((sum, cca3) => sum + getPiece(cca3).cells.length, 0) / sequence.length;
    };
    expect(average("easy")).toBeLessThan(average("hard") - 0.2);
    expect(pieceSequence("tiers", "easy", 200).every((cca3) => getCountryByCca3(cca3)!.difficulty <= 2)).toBe(true);
  });

  it("offers fair, unique naming choices in both locales", () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 60; seed++) {
        const sequence = pieceSequence(`names-${seed}`, difficulty, 6);
        sequence.forEach((cca3, index) => {
          const choices = namingChoices(`names-${seed}`, difficulty, index, cca3);
          expect(choices).toHaveLength(CHOICE_COUNT[difficulty]);
          expect(choices).toContain(cca3);
          expect(choices).toEqual(namingChoices(`names-${seed}`, difficulty, index, cca3));
          for (const locale of ["en", "de"] as const) {
            const names = choices.map((code) => getCountryByCca3(code)!.name[locale]);
            expect(new Set(names).size).toBe(names.length);
          }
          const answer = getCountryByCca3(cca3)!;
          const sameRegion = choices.filter((code) => getCountryByCca3(code)!.region === answer.region).length;
          expect(sameRegion).toBeGreaterThanOrEqual(2);
        });
      }
    }
  });

  it("plays complete runs over 200 seeds × 3 difficulties with a valid result", () => {
    const started = performance.now();
    let runs = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 200; seed++) {
        const first = createRun(`run-${seed}`, difficulty);
        expect(anyTrayFits(first.board, first.tray)).toBe(true);
        const state = playOut(`run-${seed}`, difficulty);
        runs++;
        expect(state.over).toBe(true);
        const summary = summarize(state);
        expect(summary.score).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(summary.score)).toBe(true);
        expect(summary.total).toBeGreaterThanOrEqual(1);
        expect(summary.correct).toBeLessThanOrEqual(summary.total);
        expect(summary.bestStreak).toBeLessThanOrEqual(summary.correct);
        expect(new Set(summary.countryHits).size).toBe(summary.countryHits.length);
        expect(state.board.every((cell) => cell === 0 || state.placements[cell])).toBe(true);
      }
    }
    expect((performance.now() - started) / runs).toBeLessThan(50);
  });
});
