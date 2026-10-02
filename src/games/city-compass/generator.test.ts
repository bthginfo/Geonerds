import { describe, expect, it } from "vitest";
import { COMPASS_CITIES } from "./cities";
import { buildCityCompassRounds, relativeDirection, satisfiesCompass, wrappedLongitude } from "./generator";

describe("City Compass coordinate constraints", () => {
  it("contains more than 100 bilingual actual cities, not landmark targets", () => {
    expect(COMPASS_CITIES.length).toBeGreaterThanOrEqual(200);
    expect(new Set(COMPASS_CITIES.map((city) => city.id)).size).toBe(COMPASS_CITIES.length);
    expect(COMPASS_CITIES.find((city) => city.cca3 === "DEU" && city.id.startsWith("capital:"))).toMatchObject({ lat: 52.524, lng: 13.4 });
    expect(COMPASS_CITIES.find((city) => city.id === "capital:ZAF")).toMatchObject({ lat: -25.74486, lng: 28.18783 });
    expect(COMPASS_CITIES.find((city) => city.id === "capital:TZA")).toMatchObject({ lat: -6.1722143, lng: 35.7394695 });
    expect(COMPASS_CITIES.some((city) => /Mount Everest|North Pole|Eiffel Tower/.test(city.name.en))).toBe(false);
    expect(COMPASS_CITIES.every((city) => city.name.en && city.name.de && Number.isFinite(city.lat) && Number.isFinite(city.lng))).toBe(true);
  });

  it("a reference above the center means the hidden city lies south of it", () => {
    const center = { lat: 40, lng: 2 };
    const northCity = { lat: 49, lng: 2 };
    expect(relativeDirection(center, northCity)).toBe("N");
    expect(relativeDirection(northCity, center)).toBe("S");
  });

  it("wraps longitude at the date line in both directions", () => {
    expect(wrappedLongitude(-358)).toBe(2);
    expect(wrappedLongitude(358)).toBe(-2);
    expect(relativeDirection({ lat: 10, lng: 179 }, { lat: 10, lng: -179 })).toBe("E");
    expect(relativeDirection({ lat: 10, lng: -179 }, { lat: 10, lng: 179 })).toBe("W");
    expect(relativeDirection({ lat: 10, lng: 179 }, { lat: 10, lng: 179 })).toBeNull();
  });

  it.each(["easy", "medium", "hard"] as const)("has 3–5 distributed references and exactly one valid candidate on %s", (difficulty) => {
    const rounds = buildCityCompassRounds(difficulty, 25, "compass-constraints");
    expect(rounds).toHaveLength(25);
    expect(new Set(rounds.map((round) => round.answer.id)).size).toBe(25);
    for (const round of rounds) {
      expect(round.references.length).toBeGreaterThanOrEqual(3);
      expect(round.references.length).toBeLessThanOrEqual(5);
      expect(new Set(round.references.map((reference) => reference.direction)).size).toBe(round.references.length);
      expect(round.references.some((reference) => reference.city.id === round.answer.id)).toBe(false);
      expect(round.options).toHaveLength(4);
      expect(new Set(round.options.map((city) => city.id)).size).toBe(4);
      expect(round.options.filter((city) => satisfiesCompass(city, round.references)).map((city) => city.id)).toEqual([round.answer.id]);
    }
  });

  it("is seeded, and all-round mode is finite without repeated targets", () => {
    expect(buildCityCompassRounds("hard", 10, "same")).toEqual(buildCityCompassRounds("hard", 10, "same"));
    expect(buildCityCompassRounds("hard", 10, "same")).not.toEqual(buildCityCompassRounds("hard", 10, "different"));
    const all = buildCityCompassRounds("hard", 0, "all");
    expect(all.length).toBeGreaterThan(100);
    expect(all.length).toBeLessThanOrEqual(COMPASS_CITIES.length);
    expect(new Set(all.map((round) => round.answer.id)).size).toBe(all.length);
  });

  it.each(["easy", "medium", "hard"] as const)("typed %s rounds have exactly one logically valid answer across the entire city pool", (difficulty) => {
    const rounds = buildCityCompassRounds(difficulty, 50, "typed-constraints", "type");
    expect(rounds).toHaveLength(50);
    for (const round of rounds) {
      expect(COMPASS_CITIES.filter((city) => satisfiesCompass(city, round.references)).map((city) => city.id)).toEqual([round.answer.id]);
    }
  });
});
