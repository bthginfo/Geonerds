import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { generateThemes } from "./themes";

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
});
