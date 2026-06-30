import type { Country, Locale } from "./types";
import { COUNTRY_FACTS } from "./country-facts";
import { simplifyCurrency } from "./currency";
import { getCountryByCca3, countryName } from "@/data/countries";
import { formatNumber } from "./utils";

export const PER_GAME_CAP = 5;
export const UNLOCK_TOTAL = 10;

/** Progress toward unlocking a country: each game contributes at most PER_GAME_CAP. */
export function dexScore(per?: Record<string, number>): number {
  if (!per) return 0;
  return Object.values(per).reduce((s, n) => s + Math.min(n, PER_GAME_CAP), 0);
}
export function dexProgress(per?: Record<string, number>): number {
  return Math.min(1, dexScore(per) / UNLOCK_TOTAL);
}
export function dexGameCount(per?: Record<string, number>): number {
  return per ? Object.keys(per).length : 0;
}
export type DexState = "locked" | "discovered" | "unlocked";
export function dexStateOf(per?: Record<string, number>): DexState {
  const s = dexScore(per);
  if (s <= 0) return "locked";
  return s >= UNLOCK_TOTAL ? "unlocked" : "discovered";
}

const REGION: Record<string, { en: string; de: string }> = {
  Africa: { en: "Africa", de: "Afrika" },
  Americas: { en: "Americas", de: "Amerika" },
  Asia: { en: "Asia", de: "Asien" },
  Europe: { en: "Europe", de: "Europa" },
  Oceania: { en: "Oceania", de: "Ozeanien" },
  Antarctic: { en: "Antarctic", de: "Antarktis" },
};

export interface DexFact {
  label: string;
  value: string;
}

/** Facts revealed so far for a country, scaling with how much it's unlocked. */
export function dexFacts(c: Country, score: number, locale: Locale): DexFact[] {
  const L = (en: string, de: string) => (locale === "de" ? de : en);
  const out: DexFact[] = [];
  const at = (n: number, fact: DexFact | null) => {
    if (score >= n && fact) out.push(fact);
  };

  if (c.region)
    at(1, { label: L("Continent", "Kontinent"), value: (REGION[c.region] ?? { en: c.region, de: c.region })[locale] });
  if (c.latlng)
    at(2, {
      label: L("Hemisphere", "Hemisphäre"),
      value:
        (c.latlng[0] >= 0 ? L("Northern", "Nördlich") : L("Southern", "Südlich")) +
        " · " +
        (c.latlng[1] >= 0 ? L("Eastern", "Östlich") : L("Western", "Westlich")),
    });
  if (c.capital) at(3, { label: L("Capital", "Hauptstadt"), value: c.capital });
  if (c.area > 0) at(4, { label: L("Area", "Fläche"), value: `${formatNumber(c.area, locale)} km²` });
  if (c.population > 0) at(5, { label: L("Population", "Einwohner"), value: formatNumber(c.population, locale) });
  if (c.languages.length) at(6, { label: L("Languages", "Sprachen"), value: c.languages.slice(0, 3).join(", ") });
  if (c.currencies.length) at(7, { label: L("Currency", "Währung"), value: simplifyCurrency(c.currencies[0]) });
  if (c.borders.length)
    at(8, {
      label: L("Neighbours", "Nachbarn"),
      value: c.borders
        .slice(0, 4)
        .map((b) => getCountryByCca3(b))
        .filter(Boolean)
        .map((n) => countryName(n!, locale))
        .join(", "),
    });
  else at(8, { label: L("Neighbours", "Nachbarn"), value: L("None (island/coast)", "Keine (Insel/Küste)") });

  return out;
}

/** Curated "cool" facts, unlocked at full completion. */
export function dexCoolFacts(c: Country, score: number, locale: Locale): string[] {
  if (score < UNLOCK_TOTAL) return [];
  const curated = COUNTRY_FACTS[c.cca3];
  if (!curated || !curated.length) return [];
  return curated.map((f) => f[locale]);
}
