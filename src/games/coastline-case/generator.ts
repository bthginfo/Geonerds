import raw from "@/data/coastline-fragments.json";
import { COUNTRIES, DIFFICULTY_MAX_TIER } from "@/data/countries";
import type { Country, Difficulty } from "@/lib/types";
import { createSeededRandom } from "@/lib/random";
import { shuffle } from "@/lib/utils";
import { finiteCount } from "@/games/new-world/counts";

export interface CoastFragment {
  id: string; cca3: string; coordinates: [number, number][]; lengthKm: number; sourceArc: number;
}
export interface CoastlineRound { id: string; answer: Country; fragment: CoastFragment; options: Country[] }
export const COAST_FRAGMENTS = raw.fragments as CoastFragment[];
export const COAST_META = raw.meta;
const byCountry = new Map<string, CoastFragment[]>();
for (const fragment of COAST_FRAGMENTS) {
  const group = byCountry.get(fragment.cca3) ?? [];
  group.push(fragment);
  byCountry.set(fragment.cca3, group);
}
export function buildCoastlineRounds(difficulty: Difficulty, count: number, seed: string): CoastlineRound[] {
  const random = createSeededRandom(`${seed}:coastline-case`);
  const pool = COUNTRIES.filter((country) => !country.landlocked && country.difficulty <= DIFFICULTY_MAX_TIER[difficulty] && byCountry.has(country.cca3));
  return shuffle(pool, random).slice(0, finiteCount(count, pool.length)).map((answer, index) => {
    const fragments = byCountry.get(answer.cca3)!;
    const fragment = fragments[Math.floor(random() * fragments.length)];
    const other = shuffle(pool.filter((country) => country.cca3 !== answer.cca3), random);
    // Hard favours regional coastlines; Easy deliberately offers distant shapes.
    const candidates = difficulty === "easy" ? other.sort((a, b) => Number(a.region === answer.region) - Number(b.region === answer.region))
      : difficulty === "hard" ? other.sort((a, b) => Number(b.subregion === answer.subregion) - Number(a.subregion === answer.subregion) || Number(b.region === answer.region) - Number(a.region === answer.region)) : other;
    return { id: `${seed}:coast:${index}`, answer, fragment, options: shuffle([answer, ...candidates.slice(0, 3)], random) };
  });
}
export function coastlinePoints(hints: number): number {
  return 1000 - Math.min(3, Math.max(0, Number.isFinite(hints) ? Math.floor(hints) : 0)) * 200;
}
