import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { buildRadarTargets, countrySuggestions, distanceAndBearing, evaluateRadarGuess, RADAR_GUESS_LIMIT, radarDirection, radarScore, radarWarmth } from "./generator";

describe("Country Radar geodesic deduction", () => {
  it("computes distance and initial bearing FROM the guess TOWARD the target", () => {
    const north = distanceAndBearing([0, 0], [10, 0]);
    expect(north.distanceKm).toBeCloseTo(1111.95, 1);
    expect(north.bearing).toBeCloseTo(0, 6);
    expect(distanceAndBearing([0, 0], [0, 10]).bearing).toBeCloseTo(90, 6);
    expect(distanceAndBearing([0, 0], [-10, 0]).bearing).toBeCloseTo(180, 6);
    expect(distanceAndBearing([0, 0], [0, -10]).bearing).toBeCloseTo(270, 6);
    expect(distanceAndBearing([1, 2], [1, 2])).toEqual({ distanceKm: 0, bearing: null });
  });

  it("takes the short route across the date line and is distance-symmetric", () => {
    const east = distanceAndBearing([0, 179], [0, -179]);
    const west = distanceAndBearing([0, -179], [0, 179]);
    expect(east.distanceKm).toBeCloseTo(222.39, 1);
    expect(west.distanceKm).toBeCloseTo(east.distanceKm, 6);
    expect(radarDirection(east.bearing!)).toBe("E");
    expect(radarDirection(west.bearing!)).toBe("W");
    expect(radarDirection(359)).toBe("N");
  });

  it("supports every curated country, including tiny island states, and seeded no-repeat runs", () => {
    const targets = buildRadarTargets("hard", 0, "all");
    expect(targets).toHaveLength(196);
    expect(new Set(targets.map((country) => country.cca3)).size).toBe(196);
    expect(targets.some((country) => country.cca3 === "TUV")).toBe(true);
    expect(targets.some((country) => country.cca3 === "MDV")).toBe(true);
    expect(buildRadarTargets("medium", 25, "same")).toEqual(buildRadarTargets("medium", 25, "same"));
    expect(buildRadarTargets("medium", 25, "same")).not.toEqual(buildRadarTargets("medium", 25, "different"));
  });

  it("searches bilingual names, accented names, aliases and ISO codes without duplicate guesses", () => {
    expect(countrySuggestions("Deutschland", new Set(), "de")[0].cca3).toBe("DEU");
    expect(countrySuggestions("Osterreich", new Set(), "en")[0].cca3).toBe("AUT");
    expect(countrySuggestions("USA", new Set(), "en")[0].cca3).toBe("USA");
    expect(countrySuggestions("Großbritannien", new Set(), "de")[0].cca3).toBe("GBR");
    expect(countrySuggestions("Congo", new Set(), "en").map((country) => country.cca3)).toEqual(expect.arrayContaining(["COG", "COD"]));
    expect(countrySuggestions("Germany", new Set(["DEU"]), "en")).toEqual([]);
    expect(countrySuggestions("", new Set(), "en")).toEqual([]);
    expect(COUNTRIES.every((country) => countrySuggestions(country.cca3, new Set(), "en").some((result) => result.cca3 === country.cca3))).toBe(true);
  });

  it("warms with closeness and rewards fewer guesses at all three difficulty limits", () => {
    expect([10000, 5000, 2500, 1000, 100].map(radarWarmth)).toEqual(["cold", "cool", "warm", "hot", "burning"]);
    expect(RADAR_GUESS_LIMIT).toEqual({ easy: 8, medium: 6, hard: 4 });
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const limit = RADAR_GUESS_LIMIT[difficulty];
      expect(radarScore(1, limit, difficulty)).toBeGreaterThan(radarScore(limit, limit, difficulty));
      expect(radarScore(limit, limit, difficulty)).toBeGreaterThan(0);
    }
  });

  it("reveals an unsuccessful last guess, rejects repeats, and ends solved guesses immediately", () => {
    const answer = COUNTRIES.find((country) => country.cca3 === "JPN")!;
    const guess = COUNTRIES.find((country) => country.cca3 === "DEU")!;
    expect(evaluateRadarGuess(answer, guess, ["FRA", "CAN", "AUS"], "hard")).toMatchObject({ correct: false, outcome: "exhausted", points: 0 });
    expect(evaluateRadarGuess(answer, guess, ["DEU"], "hard")).toBeNull();
    expect(evaluateRadarGuess(answer, guess, ["FRA", "CAN", "AUS", "KEN"], "hard")).toBeNull();
    expect(evaluateRadarGuess(answer, answer, [], "hard")).toMatchObject({ correct: true, outcome: "solved", distanceKm: 0, bearing: null, points: 500 });
    expect(evaluateRadarGuess(answer, guess, [], "hard")).toMatchObject({ correct: false, outcome: "continue" });
  });
});
