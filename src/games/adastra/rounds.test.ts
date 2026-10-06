import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ADASTRA_CITIES, ADASTRA_CREDIT, ADASTRA_PHOTOS } from "@/data/adastra";
import { getCountryByCca3 } from "@/data/countries";
import type { Difficulty } from "@/lib/types";
import { adastraAnswerScore, makeAdastraRounds } from "./rounds";

describe("reviewed Adastra photograph library", () => {
  it("contains at least 100 distinct, locally available NASA photographs", () => {
    expect(ADASTRA_PHOTOS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(ADASTRA_PHOTOS.map((photo) => photo.id)).size).toBe(ADASTRA_PHOTOS.length);
    const hashes = new Set<string>();
    for (const photo of ADASTRA_PHOTOS) {
      expect(photo.id).toMatch(/^iss\d+e\d{6}$/);
      expect(photo.src).toBe(`/images/adastra/${photo.id}.jpg`);
      const bytes = readFileSync(resolve(process.cwd(), "public", photo.src.slice(1)));
      expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
      hashes.add(createHash("sha256").update(bytes).digest("hex"));
      const source = new URL(photo.sourceUrl);
      expect(source.protocol).toBe("https:");
      expect(["images.nasa.gov", "eol.jsc.nasa.gov"]).toContain(source.hostname);
      expect(photo.credit).toBe(ADASTRA_CREDIT);
      expect(photo.title.trim().length).toBeGreaterThan(4);
      expect(photo.title).not.toMatch(/\uFFFD|Ã.|â€|Â /);
      if (photo.capturedAt) expect(Number.isFinite(Date.parse(photo.capturedAt))).toBe(true);
    }
    expect(hashes.size).toBe(ADASTRA_PHOTOS.length);
  });

  it("links every photo to one fully translated, valid city", () => {
    const ids = new Set(ADASTRA_CITIES.map((city) => city.id));
    expect(ids.size).toBe(ADASTRA_CITIES.length);
    expect(ids.size).toBeGreaterThanOrEqual(50);
    for (const photo of ADASTRA_PHOTOS) expect(ids.has(photo.cityId)).toBe(true);
    for (const city of ADASTRA_CITIES) {
      expect(ADASTRA_PHOTOS.some((photo) => photo.cityId === city.id)).toBe(true);
      expect(getCountryByCca3(city.cca3)).toBeDefined();
      expect(city.latlng[0]).toBeGreaterThanOrEqual(-90);
      expect(city.latlng[0]).toBeLessThanOrEqual(90);
      expect(city.latlng[1]).toBeGreaterThanOrEqual(-180);
      expect(city.latlng[1]).toBeLessThanOrEqual(180);
      for (const locale of ["en", "de"] as const) {
        for (const field of ["name", "regionHint", "clue", "explanation"] as const) {
          expect(city[field][locale].trim().length).toBeGreaterThan(0);
          expect(city[field][locale]).not.toMatch(/\uFFFD|Ã.|â€|Â /);
        }
        expect(city.aliases).toContain(city.name[locale]);
      }
    }
  });
});

describe("Adastra replayable seeded rounds", () => {
  it("replays the same challenge but varies fresh starts", () => {
    const config = { seed: "challenge-a", rounds: 25, difficulty: "medium" as const };
    expect(makeAdastraRounds(config)).toEqual(makeAdastraRounds(config));
    expect(makeAdastraRounds({ ...config, seed: "challenge-b" }).map((round) => round.photo.id))
      .not.toEqual(makeAdastraRounds(config).map((round) => round.photo.id));
  });

  it.each(["easy", "medium", "hard"] as Difficulty[])("balances cities and gives four unique, valid answers on %s", (difficulty) => {
    const rounds = makeAdastraRounds({ seed: "reviewed-library", rounds: 0, difficulty });
    expect(rounds).toHaveLength(ADASTRA_PHOTOS.length);
    expect(new Set(rounds.map((round) => round.photo.id)).size).toBe(rounds.length);
    expect(new Set(rounds.slice(0, ADASTRA_CITIES.length).map((round) => round.city.id)).size).toBe(ADASTRA_CITIES.length);
    for (const round of rounds) {
      expect(round.photo.cityId).toBe(round.city.id);
      expect(round.options).toHaveLength(4);
      expect(new Set(round.options.map((city) => city.id)).size).toBe(4);
      expect(round.options.filter((city) => city.id === round.city.id)).toHaveLength(1);
      expect(new Set(round.options.map((city) => city.name.en.toLowerCase())).size).toBe(4);
      expect(round.options.some((city) => city.id === "long-beach")
        && round.options.some((city) => city.id === "los-angeles")).toBe(false);
      if (difficulty !== "easy") {
        const alternatives = ADASTRA_CITIES.filter((city) => city.id !== round.city.id && city.region === round.city.region);
        if (alternatives.length >= 3) expect(round.options.every((city) => city.region === round.city.region)).toBe(true);
      }
    }
  });

  it.each([10, 25, 50, 999])("honours %i rounds without duplicating photos", (count) => {
    const rounds = makeAdastraRounds({ seed: "count", rounds: count, difficulty: "easy" });
    expect(rounds).toHaveLength(Math.min(count, ADASTRA_PHOTOS.length));
    expect(new Set(rounds.map((round) => round.photo.id)).size).toBe(rounds.length);
  });
});

describe("transparent, untimed Adastra hint scoring", () => {
  it.each([
    ["easy", 100, 75, 50],
    ["medium", 150, 113, 75],
    ["hard", 200, 150, 100],
  ] as const)("deducts each hint from the original %s base", (difficulty, base, one, two) => {
    expect(adastraAnswerScore(difficulty, 0)).toBe(base);
    expect(adastraAnswerScore(difficulty, 1)).toBe(one);
    expect(adastraAnswerScore(difficulty, 2)).toBe(two);
    expect(adastraAnswerScore(difficulty, 20)).toBe(two);
    expect(adastraAnswerScore(difficulty, -1)).toBe(base);
    expect(adastraAnswerScore(difficulty, Number.NaN)).toBe(base);
    expect(adastraAnswerScore(difficulty, 0, true)).toBe(0);
  });
});
