import { describe, expect, it } from "vitest";
import { COUNTRIES, poolForDifficulty } from "@/data/countries";
import palettesJson from "@/data/flag-palettes.json";
import { buildFlagPieRounds, donutSlicePath, MIN_PALETTE_DISTANCE, paletteDistance, validPalette, type FlagPalettes } from "./generator";

const palettes = palettesJson as FlagPalettes;

describe("Flag Pie measured palettes and fair choices", () => {
  it("has original-artwork palettes with normalized real percentages for all 196 countries", () => {
    expect(COUNTRIES).toHaveLength(196);
    for (const country of COUNTRIES) {
      const palette = palettes[country.flag];
      expect(validPalette(palette), country.cca3).toBe(true);
      expect(palette.source).toBe(`/flags-true/${country.flag}.svg`);
      expect(palette.colors.reduce((sum, color) => sum + color.share, 0)).toBeCloseTo(1, 8);
    }
  });

  it("treats Belgium/Germany and France/Netherlands as ambiguous distributions", () => {
    expect(paletteDistance(palettes.be, palettes.de)).toBeLessThan(MIN_PALETTE_DISTANCE);
    expect(paletteDistance(palettes.fr, palettes.nl)).toBeLessThan(MIN_PALETTE_DISTANCE);
    expect(paletteDistance(palettes.at, palettes.lv)).toBeLessThan(MIN_PALETTE_DISTANCE);
  });

  it.each(["easy", "medium", "hard"] as const)("never repeats targets or offers near-identical decoys on %s", (difficulty) => {
    const rounds = buildFlagPieRounds(poolForDifficulty(difficulty), palettes, difficulty, 50, "palette-invariants");
    expect(rounds.length).toBe(Math.min(50, poolForDifficulty(difficulty).length));
    expect(new Set(rounds.map((round) => round.answer.cca3)).size).toBe(rounds.length);
    for (const round of rounds) {
      expect(round.options).toHaveLength(4);
      expect(new Set(round.options.map((country) => country.cca3)).size).toBe(4);
      expect(round.options.filter((country) => country.cca3 === round.answer.cca3)).toHaveLength(1);
      for (const option of round.options.filter((country) => country.cca3 !== round.answer.cca3)) {
        expect(paletteDistance(round.palette, palettes[option.flag])).toBeGreaterThanOrEqual(MIN_PALETTE_DISTANCE);
      }
      let cursor = 0;
      for (const color of round.palette.colors) {
        const path = donutSlicePath(cursor, cursor + color.share);
        expect(path).not.toMatch(/NaN|Infinity/);
        cursor += color.share;
      }
    }
  });

  it("replays the same seed and changes targets/options with a new one", () => {
    const generate = (seed: string) => buildFlagPieRounds(COUNTRIES, palettes, "hard", 10, seed);
    expect(generate("same")).toEqual(generate("same"));
    expect(generate("same")).not.toEqual(generate("different"));
    expect(buildFlagPieRounds(COUNTRIES, palettes, "hard", 0, "all")).toHaveLength(196);
  });

  it("fails safely for missing or unnormalized palettes", () => {
    expect(validPalette({ colors: [{ hex: "#ffffff", share: 0.5 }, { hex: "#000000", share: 0.7 }] })).toBe(false);
    expect(buildFlagPieRounds(COUNTRIES, {}, "hard", 10, "missing")).toEqual([]);
  });
});
