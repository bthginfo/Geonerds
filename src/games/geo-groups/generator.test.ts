import { describe, expect, it } from "vitest";
import { getCountryByCca3 } from "@/data/countries";
import { translate } from "@/i18n/messages";
import { puzzleSeed } from "@/games/puzzle-kit";
import type { Difficulty } from "@/lib/types";
import {
  GEO_GROUP_CATEGORIES,
  categoryLabelKey,
  evaluateGuess,
  generateBoard,
  geoGroupsScore,
  getCategory,
  guessKey,
  isBoardValid,
  matchingGroups,
  shareRows,
} from "./generator";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const SEEDS = Array.from({ length: 220 }, (_, index) => `seed-${index}`);

describe("geo groups generator", () => {
  it("is deterministic per seed and difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 30)) {
        expect(generateBoard(seed, difficulty)).toEqual(generateBoard(seed, difficulty));
      }
    }
    expect(generateBoard("a", "medium")).not.toEqual(generateBoard("b", "medium"));
  });

  it("deals the same daily board for every player on a date and difficulty", () => {
    const now = new Date("2026-11-26T08:00:00Z");
    const later = new Date("2026-11-26T22:30:00Z");
    for (const difficulty of DIFFICULTIES) {
      const a = generateBoard(puzzleSeed("geo-groups", { variant: "daily", difficulty, now }), difficulty);
      const b = generateBoard(puzzleSeed("geo-groups", { variant: "daily", difficulty, now: later }), difficulty);
      expect(a).toEqual(b);
    }
  });

  it("guarantees a unique grouping: every tile satisfies exactly one of the four categories", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const board = generateBoard(seed, difficulty);
        expect(isBoardValid(board)).toBe(true);
        expect(board.tiles).toHaveLength(16);
        expect(new Set(board.tiles).size).toBe(16);
        for (const group of board.groups) {
          for (const code of group.members) expect(matchingGroups(board, code)).toEqual([group.level]);
        }
        // Groups come in difficulty order and from four different families.
        expect(board.groups.map((group) => group.level)).toEqual([0, 1, 2, 3]);
        expect(new Set(board.groups.map((group) => getCategory(group.categoryId)!.family)).size).toBe(4);
      }
    }
  });

  it("keeps debatable countries off boards that use the category", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 100)) {
        const board = generateBoard(seed, difficulty);
        for (const group of board.groups) {
          const category = getCategory(group.categoryId)!;
          for (const tile of board.tiles) expect(category.uncertain.has(tile)).toBe(false);
        }
      }
    }
  });

  it("renders every tile in both locales from the same cca3-only board", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const board = generateBoard(seed, difficulty);
        for (const code of board.tiles) {
          const country = getCountryByCca3(code)!;
          expect(country.name.en.length).toBeGreaterThan(0);
          expect(country.name.de.length).toBeGreaterThan(0);
        }
        for (const group of board.groups) {
          for (const locale of ["en", "de"] as const) {
            expect(translate(locale, categoryLabelKey(group.categoryId))).not.toBe(categoryLabelKey(group.categoryId));
          }
        }
      }
    }
  });

  it("respects country tiers per difficulty", () => {
    for (const seed of SEEDS) {
      expect(generateBoard(seed, "easy").tiles.every((code) => getCountryByCca3(code)!.difficulty <= 2)).toBe(true);
      expect(generateBoard(seed, "medium").tiles.every((code) => getCountryByCca3(code)!.difficulty <= 3)).toBe(true);
    }
  });

  it("varies boards and usually plants red herrings", () => {
    for (const difficulty of DIFFICULTIES) {
      const categories = new Set<string>();
      let herrings = 0;
      for (const seed of SEEDS) {
        const board = generateBoard(seed, difficulty);
        board.groups.forEach((group) => categories.add(group.categoryId));
        herrings += board.redHerrings.length;
      }
      expect(categories.size).toBeGreaterThan(20);
      expect(herrings / SEEDS.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("generates quickly", () => {
    const start = performance.now();
    let count = 0;
    for (const difficulty of DIFFICULTIES) for (const seed of SEEDS) { generateBoard(`speed-${seed}`, difficulty); count++; }
    expect((performance.now() - start) / count).toBeLessThan(50);
  });
});

describe("geo groups categories", () => {
  it("has a bilingual label for every category", () => {
    for (const category of GEO_GROUP_CATEGORIES) {
      const key = categoryLabelKey(category.id);
      const en = translate("en", key);
      const de = translate("de", key);
      expect(en, category.id).not.toBe(key);
      expect(de, category.id).not.toBe(key);
      expect(en).not.toBe(de);
    }
  });

  it("uses unique ids and real country codes", () => {
    expect(new Set(GEO_GROUP_CATEGORIES.map((category) => category.id)).size).toBe(GEO_GROUP_CATEGORIES.length);
    for (const category of GEO_GROUP_CATEGORIES) {
      expect(category.members.size, category.id).toBeGreaterThanOrEqual(4);
      for (const code of [...category.members, ...category.uncertain]) expect(getCountryByCca3(code), `${category.id}:${code}`).toBeDefined();
    }
  });

  it("derives memberships from the dataset", () => {
    expect([...getCategory("borders-DEU")!.members].sort()).toEqual(["AUT", "BEL", "CHE", "CZE", "DNK", "FRA", "LUX", "NLD", "POL"]);
    expect(getCategory("landlocked")!.members.has("BOL")).toBe(true);
    expect(getCategory("no-land-borders")!.members.has("LKA")).toBe(true);
    expect(getCategory("one-neighbour")!.members.has("PRT")).toBe(true);
    expect(getCategory("lang-german")!.members.has("AUT")).toBe(true);
    expect(getCategory("cur-euro")!.members.has("DEU")).toBe(true);
    expect(getCategory("name-stan")!.members.size).toBe(7);
  });
});

describe("geo groups rules", () => {
  const board = generateBoard("rules", "medium");

  it("recognises correct, one-away and wrong guesses", () => {
    const [first, second] = board.groups;
    expect(evaluateGuess(board, first.members)).toEqual({ kind: "correct", level: 0 });
    expect(evaluateGuess(board, [...first.members.slice(0, 3), second.members[0]])).toEqual({ kind: "one-away" });
    expect(evaluateGuess(board, [...first.members.slice(0, 2), ...second.members.slice(0, 2)])).toEqual({ kind: "wrong" });
    expect(guessKey(["B", "A", "C", "D"])).toBe(guessKey(["D", "C", "B", "A"]));
  });

  it("scores per group with a perfect bonus and never goes negative", () => {
    expect(geoGroupsScore({ solvedByPlayer: 4, mistakes: 0, multiplier: 1 })).toBe(1250);
    expect(geoGroupsScore({ solvedByPlayer: 4, mistakes: 0, multiplier: 2 })).toBe(2500);
    expect(geoGroupsScore({ solvedByPlayer: 4, mistakes: 2, multiplier: 1.5 })).toBe(1400);
    expect(geoGroupsScore({ solvedByPlayer: 0, mistakes: 4, multiplier: 1 })).toBe(0);
  });

  it("builds share rows from the true group colours", () => {
    const rows = shareRows(board, [board.groups[3].members, [...board.groups[0].members.slice(0, 3), board.groups[1].members[0]]]);
    expect(rows).toEqual(["🟪🟪🟪🟪", "🟨🟨🟨🟩"]);
  });
});
