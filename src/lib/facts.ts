import type { Country, Locale } from "./types";
import { getCountryByCca3 } from "@/data/countries";
import { formatNumber, pickOne } from "./utils";

const REGION_DE: Record<string, string> = {
  Africa: "Afrika",
  Americas: "Amerika",
  Asia: "Asien",
  Europe: "Europa",
  Oceania: "Ozeanien",
  Antarctic: "Antarktis",
};

const SUBREGION_DE: Record<string, string> = {
  "Northern Africa": "Nordafrika",
  "Sub-Saharan Africa": "Subsahara-Afrika",
  "Eastern Africa": "Ostafrika",
  "Middle Africa": "Zentralafrika",
  "Southern Africa": "Südliches Afrika",
  "Western Africa": "Westafrika",
  "Northern America": "Nordamerika",
  "Central America": "Mittelamerika",
  "South America": "Südamerika",
  Caribbean: "Karibik",
  "Central Asia": "Zentralasien",
  "Eastern Asia": "Ostasien",
  "South-Eastern Asia": "Südostasien",
  "Southern Asia": "Südasien",
  "Western Asia": "Westasien",
  "Eastern Europe": "Osteuropa",
  "Northern Europe": "Nordeuropa",
  "Southern Europe": "Südeuropa",
  "Western Europe": "Westeuropa",
  "Australia and New Zealand": "Australien und Neuseeland",
  Melanesia: "Melanesien",
  Micronesia: "Mikronesien",
  Polynesia: "Polynesien",
};

function regionName(c: Country, locale: Locale) {
  return locale === "de" ? REGION_DE[c.region] ?? c.region : c.region;
}
function subregionName(c: Country, locale: Locale) {
  return locale === "de" ? SUBREGION_DE[c.subregion] ?? c.subregion : c.subregion;
}

function populationPhrase(c: Country, locale: Locale): string | null {
  if (!c.population) return null;
  if (c.population >= 1_000_000) {
    const millions = c.population / 1_000_000;
    const val = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return locale === "de"
      ? `Heimat von rund ${formatNumber(val, locale)} Millionen Menschen.`
      : `Home to around ${formatNumber(val, locale)} million people.`;
  }
  return locale === "de"
    ? `Hat weniger als eine Million Einwohner.`
    : `Has fewer than a million inhabitants.`;
}

function areaPhrase(c: Country, locale: Locale): string | null {
  if (!c.area) return null;
  return locale === "de"
    ? `Erstreckt sich über rund ${formatNumber(c.area, locale)} km².`
    : `Covers around ${formatNumber(c.area, locale)} km².`;
}

function bordersPhrase(c: Country, locale: Locale): string {
  const n = c.borders.length;
  if (n === 0) {
    return locale === "de" ? `Hat keine Landgrenzen (Inselstaat).` : `Has no land borders (an island nation).`;
  }
  return locale === "de" ? `Grenzt an ${n} andere Länder.` : `Shares a land border with ${n} other countries.`;
}

function landlockedPhrase(c: Country, locale: Locale): string | null {
  if (!c.landlocked) return null;
  return locale === "de" ? `Ist ein Binnenstaat ohne Meereszugang.` : `It is landlocked, with no sea access.`;
}

function hemispherePhrase(c: Country, locale: Locale): string | null {
  if (!c.latlng) return null;
  const north = c.latlng[0] >= 0;
  return locale === "de"
    ? `Liegt auf der ${north ? "Nordhalbkugel" : "Südhalbkugel"}.`
    : `Lies in the ${north ? "northern" : "southern"} hemisphere.`;
}

function languagePhrase(c: Country, locale: Locale): string | null {
  if (!c.languages.length) return null;
  const lang = c.languages[0];
  return locale === "de" ? `Eine Amtssprache ist ${lang}.` : `One official language is ${lang}.`;
}

function currencyPhrase(c: Country, locale: Locale): string | null {
  if (!c.currencies.length) return null;
  const cur = c.currencies[0];
  return locale === "de" ? `Die Währung ist der ${cur}.` : `Its currency is the ${cur}.`;
}

function capitalPhrase(c: Country, locale: Locale): string | null {
  if (!c.capital) return null;
  return locale === "de" ? `Die Hauptstadt ist ${c.capital}.` : `Its capital is ${c.capital}.`;
}

function neighbourPhrase(c: Country, locale: Locale): string | null {
  if (!c.borders.length) return null;
  const names = c.borders
    .map((b) => getCountryByCca3(b))
    .filter(Boolean)
    .map((n) => (locale === "de" ? n!.name.de : n!.name.en));
  if (!names.length) return null;
  const sample = names.slice(0, 2).join(locale === "de" ? " und " : " and ");
  return locale === "de" ? `Zu seinen Nachbarn zählt ${sample}.` : `Its neighbours include ${sample}.`;
}

/**
 * Ordered clues (vague → specific) for the Trivia game. Never reveals the
 * country name; capital/neighbours are excluded as they give it away.
 */
export function triviaClues(c: Country, locale: Locale): string[] {
  const ordered = [
    locale === "de" ? `Liegt in ${regionName(c, locale)}.` : `Located in ${regionName(c, locale)}.`,
    populationPhrase(c, locale),
    landlockedPhrase(c, locale) ?? hemispherePhrase(c, locale),
    locale === "de" ? `Region: ${subregionName(c, locale)}.` : `Region: ${subregionName(c, locale)}.`,
    bordersPhrase(c, locale),
    areaPhrase(c, locale),
    languagePhrase(c, locale),
    currencyPhrase(c, locale),
  ].filter((x): x is string => !!x);
  // de-duplicate while preserving order
  return Array.from(new Set(ordered));
}

/** A single interesting fact for display after a correct answer (may include capital). */
export function randomFact(c: Country, locale: Locale): string {
  const pool = [
    capitalPhrase(c, locale),
    populationPhrase(c, locale),
    areaPhrase(c, locale),
    languagePhrase(c, locale),
    currencyPhrase(c, locale),
    landlockedPhrase(c, locale),
    neighbourPhrase(c, locale),
    hemispherePhrase(c, locale),
    locale === "de" ? `Liegt in ${subregionName(c, locale)}.` : `Located in ${subregionName(c, locale)}.`,
  ].filter((x): x is string => !!x);
  return pool.length ? pickOne(pool) : "";
}
