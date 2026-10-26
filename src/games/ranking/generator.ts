import type { Country, Difficulty } from "@/lib/types";
import { shuffle } from "@/lib/utils";

export type RankingMetric = "population" | "area" | "gdp" | "density" | "neighbors";
export interface RankingRound {
  metric: RankingMetric;
  items: Country[];
  sorted: Country[];
  dir: "desc" | "asc";
}

export function rankingValue(country: Country, metric: RankingMetric): number {
  if (metric === "gdp") return country.gdp ?? 0;
  if (metric === "neighbors") return country.borders.length;
  if (metric === "density") return country.area > 0 ? country.population / country.area : 0;
  return country[metric];
}

export function generateRankingRounds(pool: Country[], difficulty: Difficulty, count: number, random: () => number = Math.random): RankingRound[] {
  const size = difficulty === "easy" ? 3 : difficulty === "hard" ? 5 : 4;
  const limit = Math.min(100, Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0));
  const result: RankingRound[] = [];
  const seen = new Set<string>();
  const metrics: RankingMetric[] = ["population", "area", "gdp", "density", "neighbors"];
  let cycle: RankingMetric[] = [];
  for (let attempt = 0; result.length < limit && attempt < limit * 12; attempt++) {
    if (!cycle.length) cycle = shuffle(metrics, random);
    const metric = cycle.pop()!;
    const values = new Set<number>();
    const picked = shuffle(pool.filter((country) => rankingValue(country, metric) > 0), random).filter((country) => {
      const value = Math.round(rankingValue(country, metric));
      if (values.has(value)) return false;
      values.add(value);
      return true;
    }).slice(0, size);
    if (picked.length < size) continue;
    const signature = `${metric}:${picked.map((country) => country.cca3).sort().join(",")}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    const dir = random() < .5 ? "desc" : "asc";
    const sorted = [...picked].sort((a, b) => (dir === "desc" ? -1 : 1) * (rankingValue(a, metric) - rankingValue(b, metric)));
    const items = shuffle(picked, random);
    // Every puzzle requires at least one actual ordering decision.
    if (items.every((country, index) => country.cca3 === sorted[index].cca3)) [items[0], items[1]] = [items[1], items[0]];
    result.push({ metric, items, sorted, dir });
  }
  return result;
}
