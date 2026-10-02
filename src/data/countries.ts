import type { Country, Difficulty, Locale } from "@/lib/types";
import raw from "./countries.json";

// The upstream snapshot incorrectly lists a land border across the Palk Strait.
// Apply corrections in the single shared dataset used by every game and the Dex.
export const COUNTRIES: Country[] = (raw as unknown as Country[]).map((country) =>
  country.cca3 === "LKA" ? { ...country, borders: [] } : country,
);

const byCca3Map = new Map(COUNTRIES.map((c) => [c.cca3, c]));
const byCcn3Map = new Map(COUNTRIES.filter((c) => c.ccn3).map((c) => [String(c.ccn3), c]));
const byCca2Map = new Map(COUNTRIES.map((c) => [c.cca2.toLowerCase(), c]));

export function getCountryByCca3(cca3: string): Country | undefined {
  return byCca3Map.get(cca3);
}

export function getCountryByCcn3(ccn3: string | number): Country | undefined {
  // TopoJSON producers may emit numeric IDs (4), while ISO uses three digits (004).
  return byCcn3Map.get(String(ccn3).trim().padStart(3, "0"));
}

export function getCountryByCca2(cca2: string): Country | undefined {
  return byCca2Map.get(cca2.toLowerCase());
}

export function countryName(c: Country, locale: Locale): string {
  return c.name[locale] ?? c.name.en;
}

/** Maximum country difficulty tier included for each game difficulty. */
export const DIFFICULTY_MAX_TIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
};

/** Countries available to play at a given difficulty, optionally constrained to those with map geometry. */
export function poolForDifficulty(difficulty: Difficulty, opts?: { requireGeometry?: boolean }): Country[] {
  const maxTier = DIFFICULTY_MAX_TIER[difficulty];
  return COUNTRIES.filter((c) => {
    if (c.difficulty > maxTier) return false;
    if (opts?.requireGeometry && !c.ccn3) return false;
    return true;
  });
}

/** Countries that have a known capital. */
export function withCapital(countries: Country[]): Country[] {
  return countries.filter((c) => c.capital && c.capital.length > 0);
}

export const REGIONS = Array.from(new Set(COUNTRIES.map((c) => c.region).filter(Boolean))).sort();
