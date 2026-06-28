import type { Country, Difficulty } from "@/lib/types";
import { sample, shuffle } from "@/lib/utils";

/** Pick `count` unique countries to ask about. */
export function pickQuestions(pool: Country[], count: number): Country[] {
  return sample(pool, Math.min(count, pool.length));
}

/**
 * Build a set of `n` answer options: the correct country plus distractors.
 * On harder difficulties, distractors are drawn from the same region to be trickier.
 */
export function makeChoices(
  answer: Country,
  pool: Country[],
  difficulty: Difficulty,
  n = 4
): Country[] {
  const others = pool.filter((c) => c.cca3 !== answer.cca3);
  let distractors: Country[] = [];

  if (difficulty !== "easy") {
    const sameRegion = others.filter((c) => c.subregion === answer.subregion);
    distractors = sample(sameRegion, n - 1);
  }
  if (distractors.length < n - 1) {
    const remaining = others.filter((c) => !distractors.includes(c));
    distractors = [...distractors, ...sample(remaining, n - 1 - distractors.length)];
  }

  return shuffle([answer, ...distractors]);
}

export const ROUNDS_PER_GAME = 12;
