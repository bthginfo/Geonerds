import type { Country, Difficulty } from "@/lib/types";
import { capitalLabel } from "@/games/aliases";
import { seededShuffle } from "@/lib/random";

export interface AtlasMatchCard {
  id: string;
  country: Country;
  face: "flag" | "label";
}

export interface AtlasMatchBoard {
  id: string;
  countries: Country[];
  cards: AtlasMatchCard[];
}

export const ATLAS_BOARD_PAIRS: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 };

/** Different representations, never two duplicate flags or an ambiguous capital. */
export function buildAtlasMatchBoards(
  countries: readonly Country[],
  difficulty: Difficulty,
  count: number,
  seed: string,
): AtlasMatchBoard[] {
  const seenCountries = new Set<string>();
  const seenEnglish = new Set<string>();
  const seenGerman = new Set<string>();
  const eligible = seededShuffle(countries, `${seed}:atlas-pool`).filter((country) => {
    if (!country.cca3 || !country.flag || seenCountries.has(country.cca3)) return false;
    if (difficulty !== "easy" && !country.capital?.trim()) return false;
    const en = difficulty === "easy" ? country.name.en : capitalLabel(country, "en");
    const de = difficulty === "easy" ? country.name.de : capitalLabel(country, "de");
    if (!en.trim() || !de.trim() || seenEnglish.has(en.toLocaleLowerCase("en")) || seenGerman.has(de.toLocaleLowerCase("de"))) return false;
    seenCountries.add(country.cca3);
    seenEnglish.add(en.toLocaleLowerCase("en"));
    seenGerman.add(de.toLocaleLowerCase("de"));
    return true;
  });
  const limit = count === 0 ? eligible.length : Number.isFinite(count) ? Math.max(0, Math.min(eligible.length, Math.floor(count))) : 0;
  const selected = eligible.slice(0, limit);
  const boards: AtlasMatchBoard[] = [];
  const size = ATLAS_BOARD_PAIRS[difficulty];
  for (let offset = 0; offset < selected.length; offset += size) {
    const group = selected.slice(offset, offset + size);
    const id = `atlas-${boards.length}`;
    boards.push({
      id,
      countries: group,
      cards: seededShuffle(group.flatMap((country) => [
        { id: `${country.cca3}:flag`, country, face: "flag" as const },
        { id: `${country.cca3}:label`, country, face: "label" as const },
      ]), `${seed}:${id}:cards`),
    });
  }
  return boards;
}

export function isAtlasMatch(first: AtlasMatchCard, second: AtlasMatchCard): boolean {
  return first.id !== second.id && first.face !== second.face && first.country.cca3 === second.country.cca3;
}

/** Mistakes reduce the reward, but never prevent completing a country pair. */
export function atlasMatchPoints(mistakes: number): number {
  const safeMistakes = Number.isFinite(mistakes) ? Math.max(0, Math.floor(mistakes)) : 0;
  return Math.max(200, 1000 - safeMistakes * 125);
}
