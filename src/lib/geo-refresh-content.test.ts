import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { LANDMARKS, LEGACY_LANDMARKS } from "@/data/landmarks";
import { CITIES, LEGACY_CITIES } from "@/games/capitals/cities";
import { ITEMS, LEGACY_ORIGIN_ITEMS } from "@/games/origin/items";
import { PEAKS, LEGACY_PEAKS } from "@/games/mountains/peaks";
import { PLACES, LEGACY_PLACES } from "@/games/pin/places";
import { COMPASS_CITIES, LEGACY_COMPASS_CITIES } from "@/games/city-compass/cities";
import { FACT_QUESTIONS } from "./fact-questions";
import { triviaClues } from "./facts";
import { GEO_CONTENT_SEED_PREFIX, isLegacyGeoSeed } from "./geo-content-version";
import { createSeededRandom } from "./random";

describe("expanded geography content and old duel compatibility", () => {
  it("retains the old catalogue while adding substantial usable localized content", () => {
    expect(LEGACY_ORIGIN_ITEMS).toHaveLength(165);
    expect(LEGACY_PEAKS).toHaveLength(72);
    expect(LEGACY_PLACES).toHaveLength(112);
    expect(LEGACY_COMPASS_CITIES).toHaveLength(247);
    expect(Object.values(LEGACY_CITIES).flat()).toHaveLength(166);
    expect(LANDMARKS.length - LEGACY_LANDMARKS.length).toBe(60);
    expect(FACT_QUESTIONS).toHaveLength(180);
    expect(ITEMS).toHaveLength(225);
    expect(PEAKS).toHaveLength(84);
    expect(PLACES).toHaveLength(148);
    expect(COMPASS_CITIES).toHaveLength(271);
    expect(Object.values(CITIES).flat().length).toBeGreaterThanOrEqual(290);
    expect(Object.keys(CITIES).length).toBeGreaterThanOrEqual(90);
    for (const [code, cities] of Object.entries(CITIES)) {
      expect(getCountryByCca3(code)).toBeDefined();
      expect(new Set(cities.map((city) => city.en.toLowerCase())).size).toBe(cities.length);
    }
    expect(Object.values(CITIES).flat().some((city) => ["Córdoba", "Valencia", "Mérida"].includes(city.en))).toBe(false);
    expect(LEGACY_CITIES.ARG.some((city) => city.en === "Córdoba")).toBe(true);
    for (const place of [...PEAKS, ...PLACES]) {
      expect(place.en.trim()).not.toBe("");
      expect(place.de.trim()).not.toBe("");
      expect(Math.abs(place.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(place.lng)).toBeLessThanOrEqual(180);
    }
    expect(new Set(PLACES.map((place) => place.en)).size).toBe(PLACES.length);
    expect(new Set(PEAKS.map((peak) => peak.en)).size).toBe(PEAKS.length);
  });

  it("versions only new invitations, never rewrites existing seeds", () => {
    expect(isLegacyGeoSeed("geo:old-invitation")).toBe(true);
    expect(isLegacyGeoSeed(`${GEO_CONTENT_SEED_PREFIX}new-invitation`)).toBe(false);
    expect(isLegacyGeoSeed("ordinary-run-uuid")).toBe(false);
    expect(isLegacyGeoSeed(undefined)).toBe(false);
  });

  it("provides four distinct seeded clues in both languages across the full country pool", () => {
    for (const country of COUNTRIES) for (const locale of ["en", "de"] as const) {
      const make = () => triviaClues(country, locale, createSeededRandom(`facts:${country.cca3}`));
      const clues = make();
      expect(clues).toEqual(make());
      expect(clues).toHaveLength(4);
      expect(new Set(clues).size).toBe(4);
      expect(clues.every((clue) => clue.trim().length > 4)).toBe(true);
    }
  });
});
