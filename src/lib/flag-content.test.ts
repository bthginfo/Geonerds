import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import palettesData from "@/data/flag-palettes.json";
import ratiosData from "@/data/flag-ratios.json";
import colorFlags from "@/data/color-flags.json";
import { getFlagPolicyNote } from "./flag-policy";

const palettes = palettesData as Record<string, { colors: { hex: string; share: number }[]; source: string }>;
const ratios = ratiosData as Record<string, number>;

describe("flag content and representation policy", () => {
  it("covers all196 playable countries with standalone artwork, proportions and visible-color palettes", () => {
    const codes = COUNTRIES.map((country) => country.flag).sort();
    expect(codes).toHaveLength(196);
    expect(Object.keys(palettes).sort()).toEqual(codes);
    expect(Object.keys(ratios).sort()).toEqual(codes);
    expect(colorFlags.map((flag) => flag.code).sort()).toEqual(codes);
    for (const code of codes) {
      const artwork = readFileSync(resolve(process.cwd(), `public/flags-true/${code}.svg`), "utf8");
      expect(artwork).toMatch(/^\s*<svg\b/);
      expect(artwork).not.toMatch(/<(?:script|foreignObject|image)\b/);
      expect(ratios[code]).toBeGreaterThan(.5);
      expect(ratios[code]).toBeLessThanOrEqual(2.6); // Qatar is28:11, not the usual3:2.
      expect(palettes[code].source).toBe(`/flags-true/${code}.svg`);
      expect(palettes[code].colors.reduce((sum, color) => sum + color.share, 0)).toBeCloseTo(1, 4);
      for (const color of palettes[code].colors) {
        expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
        expect(color.share).toBeGreaterThan(0);
      }
    }
    expect(ratios.qa).toBeCloseTo(28 / 11, 10);
    expect(ratios.np).not.toBe(1.5);
  });

  it("preserves SVG symbols and confines recoloring variables to their declared groups", () => {
    for (const flag of colorFlags) {
      expect(flag.colors.length).toBeGreaterThanOrEqual(2);
      expect(flag.colors.length).toBeLessThanOrEqual(7);
      const variables = [...flag.template.matchAll(/var\(--c(\d+)\)/g)].map((match) => Number(match[1]));
      expect(variables.length).toBeGreaterThan(0);
      expect(variables.every((variable) => variable < flag.colors.length)).toBe(true);
      for (const id of flag.template.matchAll(/\bid=["']([^"']+)["']/g)) {
        expect(id[1]).toMatch(new RegExp(`^flag-${flag.code}-`));
      }
    }
    expect(colorFlags.find((flag) => flag.code === "jm")?.colors).toContain("#000000");
    expect(colorFlags.find((flag) => flag.code === "jm")?.colors).toHaveLength(3);
    expect(colorFlags.find((flag) => flag.code === "in")?.template).toContain("<use");
    expect(colorFlags.find((flag) => flag.code === "ph")?.template).toContain("<path");
  });

  it("labels the Afghan tricolour without pretending it is the de facto flag", () => {
    expect(getFlagPolicyNote("AF", "en")).toContain("2004–2021");
    expect(getFlagPolicyNote("AFG", "de")).toContain("Schahada");
    expect(getFlagPolicyNote("sy", "en")).toBeNull();
    expect(getFlagPolicyNote(undefined, "en")).toBeNull();
  });
});
