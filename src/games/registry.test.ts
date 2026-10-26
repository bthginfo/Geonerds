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
    const start = GAMES.findIndex((game) => game.id === "flag-pie");
    expect(GAMES.slice(start, start + 4).map((game) => game.id)).toEqual([
      "flag-pie", "city-compass", "flag-mosaic", "country-radar",
    ]);
    expect(new Set(GAMES.map((game) => game.id)).size).toBe(GAMES.length);
  });

  it("adds untimed Adastra with choice, typing and a complete photo run", () => {
    const game = GAMES.find((entry) => entry.id === "adastra");
    expect(game?.modes).toEqual(["choice", "type"]);
    expect(game?.countOptions).toEqual([10, 25, 50, 0]);
    expect(game?.supportsTimed).toBe(false);
    for (const locale of ["en", "de"] as const) {
      for (const key of ["games.adastra.name", "games.adastra.short", "howto.adastra", "adastra.setupNote"]) {
        expect(translate(locale, key)).not.toBe(key);
      }
    }
  });

  it("integrates two distinct untimed puzzle games and offers honest finite counts", () => {
    for (const id of ["atlas-match", "geo-balance"]) {
      const game = GAMES.find((entry) => entry.id === id);
      expect(game?.supportsTimed).toBe(false);
      expect(game?.featuredSince).toBe("2026-10-26T07:30:00Z");
      for (const locale of ["en", "de"] as const) {
        for (const key of [`games.${id}.name`, `games.${id}.desc`, `howto.${id}`]) expect(translate(locale, key)).not.toBe(key);
      }
    }
    for (const id of ["ranking", "route", "geo-balance"]) expect(GAMES.find((game) => game.id === id)?.countOptions).not.toContain(0);
    expect(GAMES.find((game) => game.id === "atlas-match")?.countOptions).toContain(0);
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
