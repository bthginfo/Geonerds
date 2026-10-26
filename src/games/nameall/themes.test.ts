import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { generateThemes } from "./themes";
import { createSeededRandom } from "@/lib/random";

describe("complete Name All answer sets", () => {
  it.each(["easy", "medium", "hard"] as const)("uses complete border and language sets on %s", (difficulty) => {
    for (const locale of ["en", "de"] as const) {
      const themes = generateThemes(difficulty, locale, Infinity, "type");
      expect(themes.length).toBeGreaterThan(8);
      expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
      for (const theme of themes) {
        expect(theme.targets.every((code) => !!getCountryByCca3(code))).toBe(true);
        expect(new Set(theme.targets).size).toBe(theme.targets.length);
        if (theme.id.startsWith("borders-")) {
          const country = getCountryByCca3(theme.id.slice(8))!;
          expect([...theme.targets].sort()).toEqual(country.borders.filter((code) => !!getCountryByCca3(code)).sort());
        }
        if (theme.id.startsWith("lang-")) {
          const language = theme.id.slice(5);
          expect([...theme.targets].sort()).toEqual(COUNTRIES.filter((country) => country.languages.includes(language)).map((country) => country.cca3).sort());
        }
      }
    }
  });

  it("includes Vatican City in the smallest-country theme", () => {
    const themes = generateThemes("hard", "en", Infinity);
    expect(themes.find((theme) => theme.id === "smallest")?.targets).toContain("VAT");
  });

  it("adds complete coastline groups, localizes subregions and replays a seeded run", () => {
    const themes = generateThemes("easy", "de", Infinity, "choice", createSeededRandom("coasts"));
    expect(themes.find((theme) => theme.id === "geo-red-sea")?.targets.sort()).toEqual(["DJI", "EGY", "ERI", "ISR", "JOR", "SAU", "SDN", "YEM"].sort());
    expect(themes.find((theme) => theme.id === "geo-caspian-sea")?.targets).toHaveLength(5);
    expect(themes.some((theme) => [...theme.targets].sort().join(",") === ["BLZ", "CRI", "SLV", "GTM", "HND", "NIC", "PAN"].sort().join(","))).toBe(true);
    expect(themes.some((theme) => theme.title.includes("Western Europe"))).toBe(false);
    expect(generateThemes("hard", "en", 10, "type", createSeededRandom("same")))
      .toEqual(generateThemes("hard", "en", 10, "type", createSeededRandom("same")));
  });
});
