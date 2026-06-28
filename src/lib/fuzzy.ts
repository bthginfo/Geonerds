import { distance } from "fastest-levenshtein";

const LEADING_ARTICLES = ["the", "le", "la", "les", "el", "der", "die", "das"];

/** Normalize a name for comparison: lowercase, strip accents/punctuation, drop leading articles. */
export function normalize(input: string): string {
  let s = input
    .toLowerCase()
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

  const len = normalize(bestOriginal).length;
  const tol = allowedTypos(len);
  if (best <= tol) return { status: "correct", suggestion: bestOriginal, distance: best };
  if (best <= tol + 2) return { status: "near", suggestion: bestOriginal, distance: best };
  return { status: "wrong", suggestion: bestOriginal, distance: best };
}
