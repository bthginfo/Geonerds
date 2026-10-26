import type { Country, Difficulty } from "@/lib/types";
import { createSeededRandom, seededShuffle } from "@/lib/random";

export type GeoBalanceMetric = "population" | "area";
export type CountryTriple = [Country, Country, Country];

export interface GeoBalanceSolution {
  countries: CountryTriple;
  total: number;
  error: number;
}

export interface GeoBalanceRound {
  id: string;
  hand: Country[];
  metric: GeoBalanceMetric;
  target: number;
  best: GeoBalanceSolution;
}

export const BALANCE_TOLERANCE: Record<Difficulty, number> = { easy: 0.2, medium: 0.12, hard: 0.07 };

export function balanceValue(country: Country, metric: GeoBalanceMetric): number {
  return country[metric];
}

function triples(hand: readonly Country[]): CountryTriple[] {
  const result: CountryTriple[] = [];
  for (let first = 0; first < hand.length - 2; first++) for (let second = first + 1; second < hand.length - 1; second++) for (let third = second + 1; third < hand.length; third++) {
    result.push([hand[first], hand[second], hand[third]]);
  }
  return result;
}

export function bestGeoBalanceTriple(hand: readonly Country[], metric: GeoBalanceMetric, target: number): GeoBalanceSolution | null {
  if (!(target > 0) || !Number.isFinite(target)) return null;
  let best: GeoBalanceSolution | null = null;
  for (const countries of triples(hand)) {
    const total = countries.reduce((sum, country) => sum + balanceValue(country, metric), 0);
    if (!(total > 0) || !Number.isFinite(total)) continue;
    const error = Math.abs(total - target) / target;
    if (!best || error < best.error) best = { countries, total, error };
  }
  return best;
}

/** Finite, seeded hands. Every rounded target has an achievable three-country answer. */
export function buildGeoBalanceRounds(countries: readonly Country[], count: number, seed: string): GeoBalanceRound[] {
  const unique = [...new Map(countries.map((country) => [country.cca3, country])).values()];
  const pool = unique.filter((country) => country.cca3 && Number.isFinite(country.population) && country.population > 0 && Number.isFinite(country.area) && country.area > 0);
  if (pool.length < 8 || !Number.isFinite(count)) return [];
  const limit = count === 0 ? 25 : Math.max(0, Math.min(25, Math.floor(count)));
  const random = createSeededRandom(`${seed}:balance-targets`);
  const metricOffset = Math.floor(random() * 2);
  const seen = new Set<string>();
  const rounds: GeoBalanceRound[] = [];
  for (let attempt = 0; rounds.length < limit && attempt < Math.max(100, limit * 30); attempt++) {
    const metric: GeoBalanceMetric = (attempt + metricOffset) % 2 === 0 ? "population" : "area";
    const hand = seededShuffle(pool, `${seed}:balance-hand:${attempt}`).slice(0, 8);
    // All three picks must matter: no giant country with two arbitrary fillers.
    const choices = triples(hand).filter((countries) => {
      const values = countries.map((country) => balanceValue(country, metric));
      const sum = values.reduce((total, value) => total + value, 0);
      return Math.max(...values) / sum <= 0.7 && Math.min(...values) / sum >= 0.05;
    });
    if (choices.length === 0) continue;
    const picked = choices[Math.floor(random() * choices.length)];
    const sum = picked.reduce((total, country) => total + balanceValue(country, metric), 0);
    const target = Number(sum.toPrecision(3));
    const signature = `${metric}:${hand.map((country) => country.cca3).sort().join("-")}:${target}`;
    if (seen.has(signature)) continue;
    const best = bestGeoBalanceTriple(hand, metric, target);
    if (!best || best.error > BALANCE_TOLERANCE.hard) continue;
    seen.add(signature);
    rounds.push({ id: signature, hand, metric, target, best });
  }
  return rounds;
}

export interface GeoBalanceAnswer {
  countries: CountryTriple;
  total: number;
  error: number;
  correct: boolean;
  points: number;
}

/** Wrong rounds earn zero: score <= correct * 1000 holds for all leaderboards. */
export function evaluateGeoBalance(round: GeoBalanceRound, selected: readonly string[], difficulty: Difficulty): GeoBalanceAnswer | null {
  if (selected.length !== 3 || new Set(selected).size !== 3 || !(round.target > 0) || !Number.isFinite(round.target)) return null;
  const countries = selected.map((id) => round.hand.find((country) => country.cca3 === id));
  if (countries.some((country) => !country)) return null;
  const validCountries = countries as CountryTriple;
  const total = validCountries.reduce((sum, country) => sum + balanceValue(country, round.metric), 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  const error = Math.abs(total - round.target) / round.target;
  const tolerance = BALANCE_TOLERANCE[difficulty];
  const correct = error <= tolerance + Number.EPSILON * 8;
  const points = correct ? Math.round(300 + 700 * Math.max(0, 1 - error / tolerance)) : 0;
  return { countries: validCountries, total, error, correct, points };
}
