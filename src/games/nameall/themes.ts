import type { Country, Difficulty, Locale } from "@/lib/types";
import { COUNTRIES, poolForDifficulty, getCountryByCca3, countryName } from "@/data/countries";
import { sample, shuffle } from "@/lib/utils";

export interface Theme {
  id: string;
  title: string;
  targets: string[]; // cca3 codes that match
}

const HUB_COUNTRIES = ["DEU", "BRA", "CHN", "RUS", "FRA", "TUR", "ZAF", "SAU", "THA", "POL"];

const LANGUAGES: { lang: string; en: string; de: string }[] = [
  { lang: "Portuguese", en: "Portuguese", de: "Portugiesisch" },
  { lang: "Arabic", en: "Arabic", de: "Arabisch" },
  { lang: "German", en: "German", de: "Deutsch" },
  { lang: "Dutch", en: "Dutch", de: "Niederländisch" },
  { lang: "Russian", en: "Russian", de: "Russisch" },
  { lang: "Italian", en: "Italian", de: "Italienisch" },
];

function t(locale: Locale, en: string, de: string): string {
  return locale === "de" ? de : en;
}

/** Build a pool of themes whose answer set size fits the difficulty, then sample `count`. */
export function generateThemes(difficulty: Difficulty, locale: Locale, count: number): Theme[] {
  const pool = poolForDifficulty(difficulty);
  const poolSet = new Set(pool.map((c) => c.cca3));
  const maxTargets = difficulty === "hard" ? 16 : difficulty === "medium" ? 12 : 9;
  const minTargets = 4;
  const inPool = (codes: string[]) => codes.filter((c) => poolSet.has(c));

  const candidates: Theme[] = [];
  const add = (id: string, title: string, targets: string[]) => {
    const t = inPool(targets);
    if (t.length >= minTargets && t.length <= maxTargets) candidates.push({ id, title, targets: t });
  };

  // Starts-with-letter only makes sense when you have to *recall* names (typing).
  // In click/choice mode you'd just read the first letter off the chips, so skip it.
  if (difficulty === "hard") {
    const byLetter = new Map<string, string[]>();
    for (const c of pool) {
      const L = countryName(c, locale).charAt(0).toUpperCase();
      if (!/[A-ZÄÖÜ]/.test(L)) continue;
      byLetter.set(L, [...(byLetter.get(L) ?? []), c.cca3]);
    }
    for (const [L, codes] of byLetter) {
      add(`letter-${L}`, t(locale, `Countries starting with “${L}”`, `Länder mit „${L}“`), codes);
    }
  }

  // Subregions.
  const bySub = new Map<string, string[]>();
  for (const c of pool) {
    if (!c.subregion) continue;
    bySub.set(c.subregion, [...(bySub.get(c.subregion) ?? []), c.cca3]);
  }
  for (const [sub, codes] of bySub) {
    add(`sub-${sub}`, t(locale, `Countries in ${sub}`, `Länder in ${sub}`), codes);
  }

  // Landlocked by region.
  const regions = Array.from(new Set(pool.map((c) => c.region).filter(Boolean)));
  for (const r of regions) {
    const codes = pool.filter((c) => c.region === r && c.landlocked).map((c) => c.cca3);
    add(`landlocked-${r}`, t(locale, `Landlocked countries in ${r}`, `Binnenländer in ${r}`), codes);
  }

  // Borders a hub country.
  for (const hub of HUB_COUNTRIES) {
    const country = getCountryByCca3(hub);
    if (!country) continue;
    add(
      `borders-${hub}`,
      t(locale, `Countries bordering ${countryName(country, "en")}`, `Nachbarländer von ${countryName(country, "de")}`),
      country.borders
    );
  }

  // Official language.
  for (const { lang, en, de } of LANGUAGES) {
    const codes = pool.filter((c) => c.languages.includes(lang)).map((c) => c.cca3);
    add(`lang-${lang}`, t(locale, `Countries where ${en} is official`, `Länder mit Amtssprache ${de}`), codes);
  }

  // Superlatives (computed over all UN members; always famous).
  const ranked = (key: (c: Country) => number, n: number) =>
    [...COUNTRIES].filter((c) => c.unMember && key(c) > 0).sort((a, b) => key(b) - key(a)).slice(0, n).map((c) => c.cca3);
  const big = ranked((c) => c.area, 10);
  if (big.length >= minTargets) candidates.push({ id: "largest", title: t(locale, "The 10 largest countries by area", "Die 10 größten Länder nach Fläche"), targets: big });
  const populous = ranked((c) => c.population, 10);
  if (populous.length >= minTargets) candidates.push({ id: "populous", title: t(locale, "The 10 most populous countries", "Die 10 bevölkerungsreichsten Länder"), targets: populous });

  // Harder knowledge themes — well suited to choice mode too (you must *know* them).
  if (difficulty !== "easy") {
    const smallest = [...COUNTRIES]
      .filter((c) => c.unMember && c.area > 0)
      .sort((a, b) => a.area - b.area)
      .slice(0, 10)
      .map((c) => c.cca3);
    if (smallest.length >= minTargets)
      candidates.push({ id: "smallest", title: t(locale, "The 10 smallest countries by area", "Die 10 kleinsten Länder nach Fläche"), targets: smallest });

    // Island / no-land-border nations.
    const islands = pool.filter((c) => c.borders.length === 0 && !c.landlocked).map((c) => c.cca3);
    add("islands", t(locale, "Countries with no land borders", "Länder ohne Landgrenze"), islands);

    // Most neighbours.
    const mostNb = pool.filter((c) => c.borders.length >= 6).map((c) => c.cca3);
    add("manyNeighbours", t(locale, "Countries with 6+ neighbours", "Länder mit 6+ Nachbarn"), mostNb);
  }

  // Unique by target signature, then sample.
  const seen = new Set<string>();
  const unique = shuffle(candidates).filter((th) => {
    const sig = [...th.targets].sort().join(",");
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  return sample(unique, Math.min(count, unique.length));
}
