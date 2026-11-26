import { COUNTRIES, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { matchAnswer, normalize } from "@/lib/fuzzy";
import type { Country, Locale } from "@/lib/types";

/**
 * Typed-answer helpers: suggestions for the combobox and resolution of free
 * text to exactly one country. Pure, so they are tested without a browser.
 */

const NAMES = new Map(COUNTRIES.map((country) => [country.cca3, countryAccepted(country).map(normalize)]));

function namesOf(country: Country): string[] {
  return NAMES.get(country.cca3) ?? [];
}

function rank(country: Country, term: string, locale: Locale): number {
  const local = normalize(countryName(country, locale));
  const names = namesOf(country);
  if (local === term || names.includes(term)) return 0;
  if (local.startsWith(term)) return 1;
  if (names.some((name) => name.startsWith(term))) return 2;
  if (names.some((name) => name.split(" ").some((word) => word.startsWith(term)))) return 3;
  if (names.some((name) => name.includes(term))) return 4;
  return 9;
}

/**
 * Up to `limit` countries for the typed text: exact, prefix and word matches
 * first, then close misspellings (via `matchAnswer`, from four letters on).
 * Used countries are left out.
 */
export function rareSuggestions(query: string, used: ReadonlySet<string>, locale: Locale, limit = 6): Country[] {
  const term = normalize(query);
  if (!term) return [];
  const direct = COUNTRIES
    .filter((country) => !used.has(country.cca3))
    .map((country) => ({ country, rank: rank(country, term, locale) }))
    .filter((entry) => entry.rank < 9)
    .sort((a, b) => a.rank - b.rank || countryName(a.country, locale).localeCompare(countryName(b.country, locale), locale))
    .map((entry) => entry.country);
  // Misspelling matches only for longer input: short prefixes are still being typed.
  if (direct.length >= limit || term.length < 4) return direct.slice(0, limit);
  const seen = new Set(direct.map((country) => country.cca3));
  const fuzzy = COUNTRIES
    .filter((country) => !used.has(country.cca3) && !seen.has(country.cca3))
    .map((country) => ({ country, match: matchAnswer(query, countryAccepted(country)) }))
    .filter((entry) => entry.match.status !== "wrong")
    .sort((a, b) => a.match.distance - b.match.distance || countryName(a.country, locale).localeCompare(countryName(b.country, locale), locale))
    .map((entry) => entry.country);
  return [...direct, ...fuzzy].slice(0, limit);
}

export type Resolution =
  | { kind: "country"; country: Country }
  /** The text names several countries equally well (e.g. "Kongo"). */
  | { kind: "ambiguous"; options: Country[] }
  /** Close to a country but outside the typo allowance: worth one retry. */
  | { kind: "near"; country: Country }
  | { kind: "unknown" };

/** Resolves free text to a country with `matchAnswer`'s typo tolerance. */
export function resolveTyped(query: string): Resolution {
  if (!normalize(query)) return { kind: "unknown" };
  let best: { distance: number; countries: Country[] } | null = null;
  let near: { distance: number; country: Country } | null = null;
  for (const country of COUNTRIES) {
    const match = matchAnswer(query, countryAccepted(country));
    if (match.status === "correct") {
      if (!best || match.distance < best.distance) best = { distance: match.distance, countries: [country] };
      else if (match.distance === best.distance) best.countries.push(country);
    } else if (match.status === "near" && (!near || match.distance < near.distance)) {
      near = { distance: match.distance, country };
    }
  }
  if (best) return best.countries.length === 1 ? { kind: "country", country: best.countries[0] } : { kind: "ambiguous", options: best.countries };
  if (near) return { kind: "near", country: near.country };
  return { kind: "unknown" };
}
