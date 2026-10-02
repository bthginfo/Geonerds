import ratios from "@/data/flag-ratios.json";
import type { Country, Difficulty } from "@/lib/types";
import { seededShuffle } from "@/lib/random";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";

export interface MosaicRound {
  answer: Country;
  options: Country[];
  columns: number;
  rows: number;
  tileOrder: number[];
  initialTiles: number;
}

export function mosaicDimensions(ratio: number) { return { columns: 4, rows: ratio > 2 ? 2 : 3 }; }

export function mosaicScore(revealed: number, total: number, initial: number, difficulty: Difficulty): number {
  const available = Math.max(1, total - initial);
  const clamped = Math.max(initial, Math.min(total, revealed));
  const factor = Math.min(1, (total - clamped + 1) / (available + 1));
  return Math.round(200 * factor * DIFFICULTY_MULTIPLIER[difficulty]);
}

export function revealNextTiles(revealed: ReadonlySet<number>, order: readonly number[], count: number): Set<number> {
  const result = new Set(revealed);
  for (const tile of order.filter((index) => !revealed.has(index)).slice(0, Math.max(0, count))) result.add(tile);
  return result;
}

export function buildMosaicRounds(pool: readonly Country[], difficulty: Difficulty, count: number, seed: string): MosaicRound[] {
  const trueRatios = ratios as Record<string, number>;
  const usable = pool.filter((country) => Number.isFinite(trueRatios[country.flag]));
  const answers = seededShuffle(usable, `${seed}:flag-mosaic:targets`).slice(0, count === 0 ? usable.length : count);
  return answers.map((answer) => {
    const { columns, rows } = mosaicDimensions(trueRatios[answer.flag]);
    const decoys = seededShuffle(usable.filter((country) => country.cca3 !== answer.cca3), `${seed}:flag-mosaic:${answer.cca3}:decoys`);
    if (difficulty === "hard") decoys.sort((a, b) => Number(b.region === answer.region) - Number(a.region === answer.region));
    return {
      answer,
      options: seededShuffle([answer, ...decoys.slice(0, 3)], `${seed}:flag-mosaic:${answer.cca3}:options`),
      columns,
      rows,
      tileOrder: seededShuffle(Array.from({ length: columns * rows }, (_, index) => index), `${seed}:flag-mosaic:${answer.cca3}:tiles`),
      initialTiles: difficulty === "easy" ? 4 : difficulty === "medium" ? 3 : 2,
    };
  });
}
