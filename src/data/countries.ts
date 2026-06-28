import type { Country, Difficulty, Locale } from "@/lib/types";
import raw from "./countries.json";

export const COUNTRIES = raw as unknown as Country[];

const byCca3Map = new Map(COUNTRIES.map((c) => [c.cca3, c]));
const byCcn3Map = new Map(COUNTRIES.filter((c) => c.ccn3).map((c) => [String(c.ccn3), c]));

export function getCountryByCca3(cca3: string): Country | undefined {
  return byCca3Map.get(cca3);
}

export function getCountryByCcn3(ccn3: string | number): Country | undefined {
  return byCcn3Map.get(String(ccn3));
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
