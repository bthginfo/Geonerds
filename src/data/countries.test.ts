import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountryByCca3, getCountryByCcn3 } from "./countries";

describe("shared geography corrections", () => {
  it("resolves the same ISO country for padded and numeric map IDs", () => {
    expect(getCountryByCcn3(4)?.cca3).toBe("AFG");
    expect(getCountryByCcn3("004")).toBe(getCountryByCcn3(4));
    expect(getCountryByCcn3(840)?.cca3).toBe("USA");
    expect(getCountryByCcn3(-99)).toBeUndefined();
  });
  it("does not invent a land border between Sri Lanka and India", () => {
    expect(getCountryByCca3("LKA")?.borders).toEqual([]);
    expect(getCountryByCca3("IND")?.borders).not.toContain("LKA");
  });
  it("keeps every playable land border reciprocal", () => {
    for (const country of COUNTRIES) {
      for (const border of country.borders) {
        const neighbor = getCountryByCca3(border);
        if (neighbor) expect(neighbor.borders, `${country.cca3} → ${border}`).toContain(country.cca3);
      }
    }
  });
  it("keeps ISO codes unique and coordinate order valid", () => {
    expect(new Set(COUNTRIES.map((country) => country.cca3)).size).toBe(COUNTRIES.length);
    expect(new Set(COUNTRIES.map((country) => country.cca2)).size).toBe(COUNTRIES.length);
    for (const country of COUNTRIES) {
      if (country.latlng) {
        expect(Math.abs(country.latlng[0])).toBeLessThanOrEqual(90);
        expect(Math.abs(country.latlng[1])).toBeLessThanOrEqual(180);
      }
    }
  });
});
