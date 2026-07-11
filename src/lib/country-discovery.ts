import outlines from "@/data/country-outlines.json";
import { getCountryCuisine, type CountryCuisine } from "@/data/country-cuisines";
import type { DexState } from "@/lib/dex";

export interface CountryDiscoveryPresentation {
  cuisine: CountryCuisine;
  outline: { d: string; source: "10m" | "50m" | "110m" };
}

/** A single leak-safe gate for every visual/textual country discovery reward. */
export function countryDiscoveryPresentation(cca3: string, state: DexState): CountryDiscoveryPresentation | null {
  if (state === "locked") return null;
  const cuisine = getCountryCuisine(cca3);
  const outline = outlines.countries[cca3 as keyof typeof outlines.countries];
  if (!cuisine || !outline) return null;
  return { cuisine, outline: { d: outline.d, source: outline.source as "10m" | "50m" | "110m" } };
}
