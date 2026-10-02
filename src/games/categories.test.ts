import { describe, expect, it } from "vitest";
import { GAME_CATEGORIES } from "./categories";
import { GAMES } from "./registry";

describe("themed game catalog", () => {
  const ids = GAME_CATEGORIES.flatMap((category) => category.games);
  it("lists every registered game exactly once", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(GAMES.map((game) => game.id).sort());
  });
  it("keeps Flag Quiz first and logic games near the middle", () => {
    expect(ids[0]).toBe("flags");
    expect(ids.indexOf("grid")).toBeGreaterThan(8);
    expect(ids.indexOf("grid")).toBeLessThan(17);
    expect(ids.indexOf("minesweeper")).toBe(ids.indexOf("grid") + 1);
  });
  it("has useful localized headings for all five categories", () => {
    expect(GAME_CATEGORIES).toHaveLength(5);
    for (const category of GAME_CATEGORIES) {
      expect(category.name.de.length).toBeGreaterThan(5);
      expect(category.name.en.length).toBeGreaterThan(5);
    }
  });
});
