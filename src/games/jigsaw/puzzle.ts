import type { Country, Difficulty } from "@/lib/types";

export interface JigsawPuzzle {
  subregion: string;
  context: Country[];
  pieces: Country[];
}

const PIECE_COUNTS: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

function shuffleWith<T>(values: readonly T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function jigsawPieceCount(difficulty: Difficulty) {
  return PIECE_COUNTS[difficulty];
}

export function selectJigsawPuzzle(
  countries: readonly Country[],
  geometryIds: ReadonlySet<string>,
  difficulty: Difficulty,
  rng: () => number = Math.random
): JigsawPuzzle | null {
  const count = PIECE_COUNTS[difficulty];
  const geometric = countries.filter(
    (country) => country.ccn3 && geometryIds.has(String(country.ccn3)) && country.subregion && country.independent
  );
  const groups = new Map<string, Country[]>();
  for (const country of geometric) {
    const group = groups.get(country.subregion) ?? [];
    group.push(country);
    groups.set(country.subregion, group);
  }
  const eligible = [...groups.entries()].filter(([, group]) => group.length >= count);
  if (!eligible.length) return null;
  const [subregion, context] = eligible[Math.floor(rng() * eligible.length)];
  const tierLimit = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
  const preferred = context.filter((country) => country.difficulty <= tierLimit);
  const source = preferred.length >= count ? preferred : context;
  return { subregion, context, pieces: shuffleWith(source, rng).slice(0, count) };
}
