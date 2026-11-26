import { describe, expect, it } from "vitest";
import type { Difficulty, Locale } from "@/lib/types";
import { getCountryByCca3 } from "@/data/countries";
import {
  MAX_WORD,
  MIN_WORD,
  TRAIL_COLS,
  TRAIL_DIFFICULTY,
  allThemes,
  areAdjacent,
  checkSelection,
  diagonalCode,
  generateTrailPuzzle,
  partitionGrid,
  toTrailWord,
  trailScore,
  type TrailPuzzle,
} from "./generator";
import { PLACE_TRAILS_MESSAGES } from "./messages";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const LOCALES: Locale[] = ["en", "de"];
const SEEDS = Array.from({ length: 200 }, (_, index) => `trail-seed-${index}`);

function expectValidBoard(puzzle: TrailPuzzle) {
  const config = TRAIL_DIFFICULTY[puzzle.difficulty];
  expect(puzzle.cols).toBe(TRAIL_COLS);
  expect(config.rows).toContain(puzzle.rows);
  expect(puzzle.words.length).toBeGreaterThanOrEqual(config.minWords);
  expect(puzzle.words.length).toBeLessThanOrEqual(config.maxWords);
  const size = puzzle.rows * puzzle.cols;
  expect(puzzle.letters).toHaveLength(size);
  const owner = new Array<number>(size).fill(-1);
  const diagonals = new Set<number>();
  for (const word of puzzle.words) {
    expect(word.word.length).toBeGreaterThanOrEqual(MIN_WORD);
    expect(word.word.length).toBeLessThanOrEqual(MAX_WORD);
    expect(word.word).toMatch(/^[A-ZÄÖÜ]+$/);
    expect(toTrailWord(word.label)).toBe(word.word);
    expect(word.path).toHaveLength(word.word.length);
    word.path.forEach((cell, index) => {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(size);
      expect(owner[cell]).toBe(-1);
      owner[cell] = word.id;
      expect(puzzle.letters[cell]).toBe(word.word[index]);
      if (index > 0) {
        expect(areAdjacent(word.path[index - 1], cell, puzzle.cols)).toBe(true);
        const code = diagonalCode(word.path[index - 1], cell, puzzle.cols);
        if (code >= 0) {
          // A 2×2 block never carries both diagonals: trails do not cross.
          expect(diagonals.has(code >> 2)).toBe(false);
          diagonals.add(code >> 2);
        }
      }
    });
    expect(getCountryByCca3(word.cca3)).toBeDefined();
  }
  expect(owner.every((cell) => cell >= 0)).toBe(true);
  expect(new Set(puzzle.words.map((word) => word.word)).size).toBe(puzzle.words.length);
}

describe("Place Trails words", () => {
  it("normalises names into grid letters", () => {
    expect(toTrailWord("Côte d'Ivoire")).toBe("COTEDIVOIRE");
    expect(toTrailWord("Südkorea")).toBe("SÜDKOREA");
    expect(toTrailWord("Österreich")).toBe("ÖSTERREICH");
    expect(toTrailWord("Guinea-Bissau")).toBe("GUINEABISSAU");
    expect(toTrailWord("Weißrussland")).toBe("WEISSRUSSLAND");
    expect(toTrailWord("Washington D.C.")).toBeNull();
    expect(toTrailWord("Kongo (Dem. Rep.)")).toBeNull();
  });

  it("builds themes whose entries fit the length rules in both locales", () => {
    const themes = allThemes();
    expect(themes.length).toBeGreaterThan(40);
    for (const theme of themes) {
      expect(theme.entries.length).toBeGreaterThanOrEqual(5);
      expect(PLACE_TRAILS_MESSAGES.en[theme.titleKey]).toBeTruthy();
      expect(PLACE_TRAILS_MESSAGES.de[theme.titleKey]).toBeTruthy();
      if (theme.region) {
        expect(PLACE_TRAILS_MESSAGES.en[`placetrails.region.${theme.region}`]).toBeTruthy();
        expect(PLACE_TRAILS_MESSAGES.de[`placetrails.region.${theme.region}`]).toBeTruthy();
      }
      for (const entry of theme.entries) {
        for (const locale of LOCALES) {
          expect(entry.word[locale].length).toBeGreaterThanOrEqual(MIN_WORD);
          expect(entry.word[locale].length).toBeLessThanOrEqual(MAX_WORD);
        }
      }
    }
  });

  it("only hides real neighbours and region members", () => {
    for (const theme of allThemes()) {
      for (const entry of theme.entries) {
        const country = getCountryByCca3(entry.cca3)!;
        if (theme.kind === "neighbors") expect(getCountryByCca3(theme.country!)!.borders).toContain(entry.cca3);
        if (theme.kind === "region") expect(country.subregion).toBe(theme.region);
        if (theme.kind === "landlocked") expect(country.landlocked).toBe(true);
        if (theme.kind === "islands") expect(country.borders).toHaveLength(0);
      }
    }
  });
});

describe("Place Trails grid partition", () => {
  it("returns null when the lengths do not fill the grid", () => {
    expect(partitionGrid([5, 5], 2, 6, () => 0.5)).toBeNull();
  });

  it("produces valid, covering, non-crossing trails for every seed, difficulty and locale", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const locale of LOCALES) {
        for (const seed of SEEDS) expectValidBoard(generateTrailPuzzle(seed, difficulty, locale));
      }
    }
  });

  it("is deterministic per seed and keeps theme and places identical across locales", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 60)) {
        const en = generateTrailPuzzle(seed, difficulty, "en");
        expect(generateTrailPuzzle(seed, difficulty, "en")).toEqual(en);
        const de = generateTrailPuzzle(seed, difficulty, "de");
        expect(de.theme.id).toBe(en.theme.id);
        expect(de.words.map((word) => word.cca3)).toEqual(en.words.map((word) => word.cca3));
      }
    }
  });

  it("varies the theme between seeds", () => {
    const themes = new Set(SEEDS.map((seed) => generateTrailPuzzle(seed, "medium", "en").theme.kind));
    expect(themes.size).toBeGreaterThanOrEqual(6);
  });

  it("generates quickly", () => {
    const started = performance.now();
    let count = 0;
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 100)) {
        generateTrailPuzzle(`timing-${seed}`, difficulty, "de");
        count++;
      }
    }
    expect((performance.now() - started) / count).toBeLessThan(50);
  });
});

describe("Place Trails checking and scoring", () => {
  const puzzle = generateTrailPuzzle("check-seed", "medium", "en");
  const [first, second] = puzzle.words;

  it("accepts the hidden trail in either reading direction", () => {
    expect(checkSelection(puzzle, first.path, new Set())).toEqual({ kind: "found", word: first });
    expect(checkSelection(puzzle, [...first.path].reverse(), new Set()).kind).toBe("found");
    expect(checkSelection(puzzle, first.path, new Set([first.id])).kind).toBe("already");
  });

  it("rejects short and wrong selections", () => {
    expect(checkSelection(puzzle, first.path.slice(0, 3), new Set()).kind).toBe("short");
    const mixed = [...first.path.slice(0, 3), second.path[0]];
    const result = checkSelection(puzzle, mixed, new Set());
    expect(["wrong", "other-path"]).toContain(result.kind);
  });

  it("scores words, hints and the clean bonus without going negative", () => {
    expect(trailScore({ found: 7, hints: 0, complete: true, multiplier: 1.5 })).toBe(2025);
    expect(trailScore({ found: 6, hints: 1, complete: true, multiplier: 1 })).toBe(800);
    expect(trailScore({ found: 0, hints: 3, complete: false, multiplier: 2 })).toBe(0);
    expect(trailScore({ found: 8, hints: 0, complete: true, multiplier: 2 })).toBe(3000);
  });
});
