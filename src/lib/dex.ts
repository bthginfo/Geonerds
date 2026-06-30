import type { Country, Locale } from "./types";
import { COUNTRY_FACTS } from "./country-facts";
import { simplifyCurrency } from "./currency";
import { COUNTRIES, getCountryByCca3, countryName } from "@/data/countries";
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

/** The continents shown in the Geo-Dex, in display order. */
export const CONTINENTS = ["Europe", "Asia", "Africa", "Americas", "Oceania"] as const;
export type Continent = (typeof CONTINENTS)[number];

export function continentName(region: string, locale: Locale): string {
  return (REGION[region] ?? { en: region, de: region })[locale];
}

/** Countries that count toward the Geo-Dex (UN members + independent states). */
export const DEX_POOL: Country[] = COUNTRIES.filter((c) => c.unMember || c.independent);

const CONTINENT_BLURB: Record<string, { en: string; de: string }> = {
  Europe: {
    en: "The second-smallest continent by area, yet home to dozens of countries packed tightly together — a patchwork of languages, currencies and centuries-old borders.",
    de: "Der nach Fläche zweitkleinste Kontinent – und doch Heimat von Dutzenden eng beieinanderliegenden Ländern: ein Flickenteppich aus Sprachen, Währungen und jahrhundertealten Grenzen.",
  },
  Asia: {
    en: "The largest and most populous continent, stretching from the Arabian Peninsula to the Pacific and holding well over half of all people on Earth.",
    de: "Der größte und bevölkerungsreichste Kontinent – von der Arabischen Halbinsel bis zum Pazifik – und Heimat von weit mehr als der Hälfte aller Menschen.",
  },
  Africa: {
    en: "The second-largest continent and the cradle of humankind, with more countries than any other and an astonishing range of climates and cultures.",
    de: "Der zweitgrößte Kontinent und die Wiege der Menschheit – mit mehr Ländern als jeder andere und einer erstaunlichen Vielfalt an Klimazonen und Kulturen.",
  },
  Americas: {
    en: "Two linked continents running almost pole to pole, from Arctic tundra through tropical rainforest to Patagonian ice.",
    de: "Zwei verbundene Kontinente, die fast von Pol zu Pol reichen – von arktischer Tundra über tropischen Regenwald bis zum Eis Patagoniens.",
  },
  Oceania: {
    en: "A vast scattering of islands across the Pacific, with most of its land — and people — concentrated in Australia.",
    de: "Eine weite Streuung von Inseln über den Pazifik, deren Land – und Bevölkerung – sich größtenteils in Australien konzentriert.",
  },
};

export function continentBlurb(region: string, locale: Locale): string | null {
  const b = CONTINENT_BLURB[region];
  return b ? b[locale] : null;
}

export interface ContinentProgress {
  region: string;
  total: number;
  unlocked: number;
  discovered: number;
  facts: DexFact[];
}

/** Static, always-visible facts about a continent (computed from the dataset). */
export function continentFacts(region: string, locale: Locale): DexFact[] {
  const L = (en: string, de: string) => (locale === "de" ? de : en);
  const list = DEX_POOL.filter((c) => c.region === region);
  if (!list.length) return [];
  const out: DexFact[] = [];
  out.push({ label: L("Countries", "Länder"), value: formatNumber(list.length, locale) });

  const totalArea = list.reduce((s, c) => s + (c.area || 0), 0);
  if (totalArea > 0) out.push({ label: L("Total area", "Gesamtfläche"), value: `${formatNumber(totalArea, locale)} km²` });

  const totalPop = list.reduce((s, c) => s + (c.population || 0), 0);
  if (totalPop > 0) out.push({ label: L("Population", "Einwohner"), value: formatNumber(totalPop, locale) });

  const biggest = list.reduce((a, b) => (b.area > a.area ? b : a));
  if (biggest.area > 0) out.push({ label: L("Largest country", "Größtes Land"), value: countryName(biggest, locale) });

  const smallest = list.filter((c) => c.area > 0).reduce((a, b) => (b.area < a.area ? b : a), list[0]);
  if (smallest && smallest.area > 0) out.push({ label: L("Smallest country", "Kleinstes Land"), value: countryName(smallest, locale) });

  const populous = list.reduce((a, b) => (b.population > a.population ? b : a));
  if (populous.population > 0) out.push({ label: L("Most populous", "Bevölkerungsreichstes"), value: countryName(populous, locale) });

  return out;
}

/** Per-continent unlock progress for the current Geo-Dex state. */
export function continentProgress(hits: Record<string, Record<string, number>>, locale: Locale): ContinentProgress[] {
  return CONTINENTS.map((region) => {
    const list = DEX_POOL.filter((c) => c.region === region);
    let unlocked = 0;
    let discovered = 0;
    for (const c of list) {
      const st = dexStateOf(hits[c.cca3]);
      if (st === "unlocked") unlocked++;
      else if (st === "discovered") discovered++;
    }
    return { region, total: list.length, unlocked, discovered, facts: continentFacts(region, locale) };
  });
}

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
