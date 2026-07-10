import type { Country, Difficulty } from "@/lib/types";

export type ConnectionRelation = "border" | "language" | "currency" | "subregion";

export interface ConnectionStep {
  anchor: Country;
  answer: Country;
  relation: ConnectionRelation;
  candidates: Country[];
  evidence: string;
}

export interface ConnectionPuzzle {
  start: Country;
  steps: ConnectionStep[];
}

export type RandomSource = () => number;

function shuffled<T>(values: readonly T[], rng: RandomSource): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sharedValue(a: string[], b: string[]): string | null {
  return a.find((value) => b.includes(value)) ?? null;
}

export function relationEvidence(a: Country, b: Country, relation: ConnectionRelation): string | null {
  if (relation === "border") return a.borders.includes(b.cca3) || b.borders.includes(a.cca3) ? "border" : null;
  if (relation === "language") return sharedValue(a.languages, b.languages);
  if (relation === "currency") return sharedValue(a.currencies, b.currencies);
  return a.subregion && a.subregion === b.subregion ? a.subregion : null;
}

export function matchesRelation(a: Country, b: Country, relation: ConnectionRelation): boolean {
  return a.cca3 !== b.cca3 && relationEvidence(a, b, relation) !== null;
}

const SETTINGS: Record<Difficulty, { length: number; candidates: number; relations: ConnectionRelation[] }> = {
  easy: { length: 4, candidates: 3, relations: ["border", "subregion"] },
  medium: { length: 5, candidates: 4, relations: ["border", "subregion", "language"] },
  hard: { length: 6, candidates: 5, relations: ["border", "subregion", "language", "currency"] },
};

export function connectionSettings(difficulty: Difficulty) {
  return SETTINGS[difficulty];
}

export function buildConnectionPuzzle(
  countries: readonly Country[],
  difficulty: Difficulty,
  rng: RandomSource = Math.random
): ConnectionPuzzle | null {
  const settings = SETTINGS[difficulty];
  const playable = countries.filter((country) => country.independent && country.name.en && country.subregion);

  function buildFrom(anchor: Country, remaining: number, used: Set<string>): ConnectionStep[] | null {
    if (remaining === 0) return [];
    for (const relation of shuffled(settings.relations, rng)) {
      const answers = shuffled(
        playable.filter((candidate) => !used.has(candidate.cca3) && matchesRelation(anchor, candidate, relation)),
        rng
      ).slice(0, 24);

      for (const answer of answers) {
        const distractors = playable.filter(
          (candidate) =>
            candidate.cca3 !== answer.cca3 &&
            !used.has(candidate.cca3) &&
            !matchesRelation(anchor, candidate, relation)
        );
        if (distractors.length < settings.candidates - 1) continue;
        const nextUsed = new Set(used).add(answer.cca3);
        const tail = buildFrom(answer, remaining - 1, nextUsed);
        if (!tail) continue;
        const evidence = relationEvidence(anchor, answer, relation);
        if (!evidence) continue;
        const candidates = shuffled(
          [answer, ...shuffled(distractors, rng).slice(0, settings.candidates - 1)],
          rng
        );
        return [{ anchor, answer, relation, candidates, evidence }, ...tail];
      }
    }
    return null;
  }

  for (const start of shuffled(playable, rng).slice(0, 60)) {
    const steps = buildFrom(start, settings.length, new Set([start.cca3]));
    if (steps) return { start, steps };
  }
  return null;
}
