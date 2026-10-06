import { describe, expect, it } from "vitest";
import { GAMES } from "./registry";
import { translate } from "@/i18n/messages";

describe("game registry editorial order", () => {
  it("keeps Flag Quiz first on Home", () => {
    expect(GAMES[0].id).toBe("flags");
  });

  it("places Geo Grid at the requested middle position", () => {
    expect(GAMES[11].id).toBe("grid");
    expect(GAMES[12].id).toBe("minesweeper");
  });

  it("appends the four visual deduction games without moving legacy games", () => {
    expect(GAMES.slice(-5, -1).map((game) => game.id)).toEqual([
      "flag-pie", "city-compass", "flag-mosaic", "country-radar",
    ]);
    expect(new Set(GAMES.map((game) => game.id)).size).toBe(GAMES.length);
  });

  it("adds untimed Adastra with choice, typing and a complete photo run", () => {
    expect(GAMES.at(-1)?.id).toBe("adastra");
    expect(GAMES.at(-1)?.modes).toEqual(["choice", "type"]);
    expect(GAMES.at(-1)?.countOptions).toEqual([10, 25, 50, 0]);
    expect(GAMES.at(-1)?.supportsTimed).toBe(false);
    for (const locale of ["en", "de"] as const) {
      for (const key of ["games.adastra.name", "games.adastra.short", "howto.adastra", "adastra.setupNote"]) {
        expect(translate(locale, key)).not.toBe(key);
      }
    }
  });

  it("offers only fair answer modes for the visual games", () => {
    expect(GAMES.find((game) => game.id === "flag-pie")?.modes).toEqual(["choice"]);
    expect(GAMES.find((game) => game.id === "country-radar")?.modes).toEqual(["type"]);
    for (const id of ["flag-pie", "city-compass", "flag-mosaic", "country-radar"]) {
      const game = GAMES.find((entry) => entry.id === id);
      expect(game?.supportsDifficulty).toBe(true);
      expect(game?.countOptions).toContain(0);
    }
  });

  it("has bilingual names, descriptions, and instructions for the four new games", () => {
    for (const locale of ["en", "de"] as const) {
      for (const id of ["flag-pie", "city-compass", "flag-mosaic", "country-radar"]) {
        for (const key of [`games.${id}.name`, `games.${id}.short`, `howto.${id}`]) {
          expect(translate(locale, key)).not.toBe(key);
          expect(translate(locale, key).length).toBeGreaterThan(0);
        }
      }
    }
  });
});
