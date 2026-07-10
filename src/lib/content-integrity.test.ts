import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import colorFlags from "@/data/color-flags.json";
import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { CITIES } from "@/games/capitals/cities";
import { GN_BUILDER_COUNT } from "@/games/geonerd/questions";
import { PEAKS } from "@/games/mountains/peaks";
import { ITEMS } from "@/games/origin/items";
import { PLACES } from "@/games/pin/places";
import { FACT_QUESTIONS } from "./fact-questions";

describe("content pool integrity", () => {
  it("keeps healthy finite pools above their regression floors", () => {
    const waters = JSON.parse(readFileSync(resolve(process.cwd(), "public/geo/waters.json"), "utf8")) as unknown[];
    const cityEntries = Object.values(CITIES).flat();
    expect(FACT_QUESTIONS.length).toBeGreaterThanOrEqual(47);
    expect(cityEntries.length).toBeGreaterThanOrEqual(160);
    expect(PLACES.length).toBeGreaterThanOrEqual(100);
    expect(PEAKS.length).toBeGreaterThanOrEqual(70);
    expect(ITEMS.length).toBeGreaterThanOrEqual(160);
    expect(colorFlags.length).toBeGreaterThanOrEqual(130);
    expect(waters.length).toBeGreaterThanOrEqual(90);
    expect(GN_BUILDER_COUNT).toBeGreaterThanOrEqual(19);
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(190);
  });

  it("keeps every curated question localized, tiered and country-backed", () => {
    const seen = new Set<string>();
    for (const question of FACT_QUESTIONS) {
      expect(getCountryByCca3(question.cca3)).toBeDefined();
      expect(question.q.en.trim()).not.toBe("");
      expect(question.q.de.trim()).not.toBe("");
      expect([1, 2, 3]).toContain(question.tier);
      const signature = `${question.cca3}|${question.q.en.trim().toLocaleLowerCase()}`;
      expect(seen.has(signature)).toBe(false);
      seen.add(signature);
    }
  });
});
