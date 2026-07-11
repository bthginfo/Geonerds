import type { Localized } from "@/data/country-cuisines";

export interface CountryRecipe {
  cca3: string;
  definingAction: Localized;
  ingredients: Localized[];
  steps: Localized[];
  note?: Localized;
}

export interface CountryRecipePayload {
  version: 1;
  countries: Record<string, CountryRecipe>;
}
