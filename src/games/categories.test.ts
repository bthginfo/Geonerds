import { describe, expect, it } from "vitest";
import { GAME_CATEGORIES, getGameCategories } from "./categories";
import { GAMES } from "./registry";
import { isFeaturedGame } from "./featured";

describe("themed game catalog", () => {
  const ids = GAME_CATEGORIES.flatMap((category) => category.games);
  it("lists every registered game exactly once", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(GAMES.map((game) => game.id).sort());
  });
  it("keeps Flag Quiz first and Grid/Minesweeper together in the middle", () => {
    expect(ids[0]).toBe("flags");
    expect(GAME_CATEGORIES.find((category) => category.id === "flags")?.games[0]).toBe("flags");
    expect(ids.indexOf("grid")).toBeGreaterThan(8);
    expect(ids.indexOf("grid")).toBeLessThan(ids.length * 0.8);
    expect(ids.indexOf("minesweeper")).toBe(ids.indexOf("grid") + 1);
  });
  it("has useful localized headings for all five permanent categories", () => {
    expect(GAME_CATEGORIES).toHaveLength(5);
    for (const category of GAME_CATEGORIES) {
      expect(category.name.de.length).toBeGreaterThan(5);
      expect(category.name.en.length).toBeGreaterThan(5);
    }
  });

  it.each([
    ["before publication", Date.parse("2026-10-06T18:55:45Z"), false],
    ["at publication", Date.parse("2026-10-06T18:55:46Z"), true],
    ["just before expiry", Date.parse("2026-11-06T18:55:45Z"), true],
    ["at expiry", Date.parse("2026-11-06T18:55:46Z"), false],
    ["after expiry", Date.parse("2027-01-01T00:00:00Z"), false],
    ["during server rendering", null, false],
  ])("lists every game once %s, in the right category", (_label, now, featured) => {
    const categories = getGameCategories(now);
    const visible = categories.flatMap((group) => group.games);
    expect([...visible].sort()).toEqual([...ids].sort());
    expect(new Set(visible).size).toBe(visible.length);
    expect(categories.some((group) => group.id === "new")).toBe(GAMES.some((game) => isFeaturedGame(game, now)));
    expect(categories.find((group) => group.games.includes("adastra"))?.id).toBe(featured ? "new" : "maps");
    expect(categories.find((group) => group.id === "flags")?.games[0]).toBe("flags");
    expect(visible.indexOf("grid")).toBeGreaterThan(4);
    expect(visible.indexOf("minesweeper")).toBe(visible.indexOf("grid") + 1);
  });

  it("features multiple games independently without mutating permanent categories", () => {
    const registry = GAMES.map((game) => ({
      ...game,
      featuredSince: game.id === "flag-pie" ? "2026-11-01T00:00:00Z" : game.featuredSince,
    }));
    const before = GAME_CATEGORIES.map((group) => ({ ...group, games: [...group.games] }));
    const now = Date.parse("2026-11-06T18:55:46Z");
    const categories = getGameCategories(now, registry);
    expect(categories[0].id).toBe("new");
    expect(categories[0].games).toEqual(["flag-pie", "atlas-match"]);
    expect(categories.find((group) => group.id === "maps")?.games).toContain("adastra");
    expect(categories.find((group) => group.id === "flags")?.games).not.toContain("flag-pie");
    expect(categories.flatMap((group) => group.games).sort()).toEqual([...ids].sort());
    expect(GAME_CATEGORIES).toEqual(before);
  });

  it("features the five November-26 games for one calendar month, then restores their category", () => {
    const ids = ["geo-groups", "letter-atlas", "place-trails", "geo-brackets", "atlas-blast"];
    const launched = getGameCategories(Date.parse("2026-11-26T12:00:00Z"));
    expect(launched[0].id).toBe("new");
    expect(launched[0].games).toEqual(ids);
    const expired = getGameCategories(Date.parse("2026-12-26T17:00:00Z"));
    expect(expired.some((category) => category.id === "new")).toBe(false);
    for (const id of ids) {
      expect(expired.find((category) => category.games.some((entry) => entry === id))?.id).toBe(GAME_CATEGORIES.find((category) => category.games.some((entry) => entry === id))?.id);
    }
    expect(expired.find((category) => category.id === "puzzles")?.games).toEqual(["geo-groups", "letter-atlas", "place-trails", "geo-brackets", "rare-finds"]);
  });

  it("keeps missing or invalid feature dates in their permanent category", () => {
    const registry = GAMES.map((game, index) => ({ id: game.id, featuredSince: index % 2 ? "invalid" : undefined }));
    expect(getGameCategories(Date.parse("2026-10-12T00:00:00Z"), registry)).toEqual(GAME_CATEGORIES);
  });
});
