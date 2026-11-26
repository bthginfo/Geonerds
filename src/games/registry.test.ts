import { describe, expect, it } from "vitest";
import { GAMES, getGame } from "./registry";
import { RETIRED_GAME_IDS } from "./retired";
import { translate } from "@/i18n/messages";

const DAILY_PUZZLES = ["geo-groups", "letter-atlas", "place-trails", "geo-brackets"] as const;

describe("game registry", () => {
  it("keeps Flag Quiz first and every id unique", () => {
    expect(GAMES[0].id).toBe("flags");
    expect(new Set(GAMES.map((game) => game.id)).size).toBe(GAMES.length);
  });

  it("no longer offers retired games, but keeps their names for history", () => {
    for (const id of RETIRED_GAME_IDS) {
      expect(getGame(id)).toBeUndefined();
      for (const locale of ["en", "de"] as const) expect(translate(locale, `games.${id}.name`)).not.toBe(`games.${id}.name`);
    }
  });

  it("has bilingual names, short descriptions and instructions for every game", () => {
    for (const game of GAMES) {
      for (const locale of ["en", "de"] as const) {
        for (const key of [`games.${game.id}.name`, `games.${game.id}.short`, `howto.${game.id}`]) {
          expect(translate(locale, key), `${locale} ${key}`).not.toBe(key);
        }
        if (game.setupNoteKey) expect(translate(locale, game.setupNoteKey), `${locale} ${game.setupNoteKey}`).not.toBe(game.setupNoteKey);
      }
    }
  });

  it("offers daily and endless boards for the daily puzzles", () => {
    for (const id of DAILY_PUZZLES) {
      const game = getGame(id);
      expect(game?.variants?.default).toBe("daily");
      expect(game?.variants?.options).toEqual(["daily", "endless"]);
      expect(game?.supportsTimed).toBe(false);
      expect(game?.countOptions).toBeUndefined();
    }
    for (const locale of ["en", "de"] as const) {
      for (const key of ["puzzle.variantLabel", "scope.daily", "scope.endless"]) expect(translate(locale, key)).not.toBe(key);
    }
  });

  it("keeps untimed Adastra with choice, typing and a complete photo run", () => {
    const game = getGame("adastra");
    expect(game?.modes).toEqual(["choice", "type"]);
    expect(game?.countOptions).toEqual([10, 25, 50, 0]);
    expect(game?.supportsTimed).toBe(false);
  });

  it("offers only fair answer modes for the visual games", () => {
    expect(getGame("flag-pie")?.modes).toEqual(["choice"]);
    expect(getGame("country-radar")?.modes).toEqual(["type"]);
  });
});
