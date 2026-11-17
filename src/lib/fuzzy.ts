import { distance } from "fastest-levenshtein";
import { COUNTRIES } from "@/data/countries";
import { CAPITAL_DE, COUNTRY_ALIASES } from "@/games/aliases";

const LEADING_ARTICLES = ["the", "le", "la", "les", "el", "der", "die", "das"];

/** Normalize a name for comparison: lowercase, strip accents/punctuation, drop leading articles. */
export function normalize(input: string): string {
  let s = input
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining marks
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = s.split(" ");
  if (parts.length > 1 && LEADING_ARTICLES.includes(parts[0])) {
    s = parts.slice(1).join(" ");
  }
  return s;
}

// A correctly spelled *different* place is not a spelling mistake. Without
// this guard, e.g. Iran/Iraq and Rome/Lomé fall inside the typo allowance.
// Sets retain genuine shared names (Luxembourg, Congo) rather than arbitrarily
// assigning them to whichever country happens to occur first in the snapshot.
const placeIdentities = new Map<string, Set<string>>();
function registerPlace(name: string, identity: string) {
  const key = normalize(name).replace(/\s/g, "");
  if (!key) return;
  const identities = placeIdentities.get(key) ?? new Set<string>();
  identities.add(identity);
  placeIdentities.set(key, identities);
}
for (const country of COUNTRIES) {
  for (const name of [country.name.en, country.name.de, ...(COUNTRY_ALIASES[country.cca3] ?? [])]) {
    registerPlace(name, `country:${country.cca3}`);
  }
  for (const name of [country.capital, CAPITAL_DE[country.cca3]]) {
    if (name) registerPlace(name, `capital:${country.cca3}`);
  }
}

/** Edit-distance tolerance allowed for a "correct" answer of a given length. */
export function allowedTypos(len: number): number {
  return Math.min(4, Math.max(1, Math.floor(len / 5)));
}

export type MatchStatus = "correct" | "near" | "wrong";

export interface MatchResult {
  status: MatchStatus;
  /** Closest accepted answer (original casing) — used for "did you mean". */
  suggestion: string | null;
  distance: number;
}

/**
 * Compare a typed guess against a list of accepted answers with typo tolerance.
 * Returns "correct" within tolerance, "near" just outside it (offer a hint), else "wrong".
 */
export function matchAnswer(guess: string, accepted: string[]): MatchResult {
  const g = normalize(guess);
  if (!g) return { status: "wrong", suggestion: null, distance: Infinity };

  const guessIdentities = placeIdentities.get(g.replace(/\s/g, ""));
  const acceptedIdentities = new Set(accepted.flatMap((candidate) =>
    [...(placeIdentities.get(normalize(candidate).replace(/\s/g, "")) ?? [])],
  ));
  const differentKnownPlace = Boolean(guessIdentities?.size && acceptedIdentities.size &&
    ![...guessIdentities!].some((identity) => acceptedIdentities.has(identity)));

  let best = Infinity;
  let bestOriginal: string | null = null;

  for (const candidate of accepted) {
    const c = normalize(candidate);
    if (!c) continue;
    // Compare both as-is and with spaces removed (e.g. "unitedstates").
    const d = Math.min(distance(g, c), distance(g.replace(/\s/g, ""), c.replace(/\s/g, "")));
    if (d < best) {
      best = d;
      bestOriginal = candidate;
    }
  }

  if (bestOriginal === null) return { status: "wrong", suggestion: null, distance: Infinity };
  if (differentKnownPlace) return { status: "wrong", suggestion: null, distance: best };

  const len = normalize(bestOriginal).length;
  const tol = allowedTypos(len);
  if (best <= tol) return { status: "correct", suggestion: bestOriginal, distance: best };
  if (best <= tol + 2) return { status: "near", suggestion: bestOriginal, distance: best };
  return { status: "wrong", suggestion: bestOriginal, distance: best };
}
