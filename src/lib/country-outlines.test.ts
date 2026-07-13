import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import outlines from "@/data/country-outlines.json";

describe("prebuilt country outlines", () => {
  it("covers all countries exactly with finite normalized paths", () => {
    const expected = COUNTRIES.map((country) => country.cca3).sort();
    expect(expected).toHaveLength(196);
    expect(Object.keys(outlines.countries).sort()).toEqual(expected);
    expect(outlines.viewBox).toBe("0 0 280 280");
    for (const value of Object.values(outlines.countries)) {
      expect(value.d.length).toBeGreaterThan(8);
      expect(value.d).not.toMatch(/NaN|Infinity/);
      expect(["110m", "50m", "10m"]).toContain(value.source);
    }
  });

  it("preserves tiny, island, multipolygon and huge-country anchors", () => {
    for (const code of ["TUV", "FJI", "IDN", "RUS"] as const) {
      expect(outlines.countries[code].d).toMatch(/^M/);
    }
    expect(outlines.countries.TUV.source).toBe("10m");
    expect(outlines.countries.FJI.d.split("M").length).toBeGreaterThan(2);
    expect(outlines.countries.IDN.d.split("M").length).toBeGreaterThan(2);
  });

  it("draws companion-merged countries as one whole landmass", () => {
    // Cyprus without Northern Cyprus renders as a torn island with a
    // detached south-eastern exclave; Somalia without Somaliland loses the
    // Horn. After merging, each must be a single closed subpath.
    for (const code of ["CYP", "SOM", "CUB"] as const) {
      const subpaths = outlines.countries[code].d.split("M").filter(Boolean);
      expect(subpaths, `${code} should be one dissolved landmass`).toHaveLength(1);
    }
  });
});
