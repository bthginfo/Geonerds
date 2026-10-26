import { describe, expect, it } from "vitest";
import { COUNTRIES, poolForDifficulty } from "@/data/countries";
import { BALANCE_TOLERANCE, balanceValue, bestGeoBalanceTriple, buildGeoBalanceRounds, evaluateGeoBalance } from "./generator";

describe("Geo Balance achievable geography targets", () => {
  it.each(["easy", "medium", "hard"] as const)("provides unique eight-country hands and valid answers on %s", (difficulty) => {
    const rounds = buildGeoBalanceRounds(poolForDifficulty(difficulty), 25, `balance-${difficulty}`);
    expect(rounds).toHaveLength(25);
    expect(new Set(rounds.map((round) => round.id)).size).toBe(rounds.length);
    expect(new Set(rounds.map((round) => round.metric)).size).toBe(2);
    for (const round of rounds) {
      expect(round.hand).toHaveLength(8);
      expect(new Set(round.hand.map((country) => country.cca3)).size).toBe(8);
      expect(round.target).toBeGreaterThan(0);
      expect(round.best.error).toBeLessThanOrEqual(BALANCE_TOLERANCE.hard);
      const answer = evaluateGeoBalance(round, round.best.countries.map((country) => country.cca3), difficulty);
      expect(answer?.correct).toBe(true);
      expect(answer?.points).toBeGreaterThanOrEqual(300);
      expect(answer?.points).toBeLessThanOrEqual(1000);
      expect(round.best).toEqual(bestGeoBalanceTriple(round.hand, round.metric, round.target));
      const allTotals: number[] = [];
      for (let a = 0; a < 6; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 8; c++) allTotals.push([a, b, c].reduce((sum, index) => sum + balanceValue(round.hand[index], round.metric), 0));
      expect(round.best.error).toBe(Math.min(...allTotals.map((value) => Math.abs(value - round.target) / round.target)));
    }
  });

  it("replays a seed, varies new runs, caps counts and offers a finite practice set", () => {
    expect(buildGeoBalanceRounds(COUNTRIES, 10, "same")).toEqual(buildGeoBalanceRounds(COUNTRIES, 10, "same"));
    expect(buildGeoBalanceRounds(COUNTRIES, 10, "same")).not.toEqual(buildGeoBalanceRounds(COUNTRIES, 10, "other"));
    expect(buildGeoBalanceRounds(COUNTRIES, 0, "practice")).toHaveLength(25);
    expect(buildGeoBalanceRounds(COUNTRIES, 1000, "cap")).toHaveLength(25);
    expect(buildGeoBalanceRounds(COUNTRIES, -1, "invalid")).toEqual([]);
    expect(buildGeoBalanceRounds(COUNTRIES, Number.NaN, "invalid")).toEqual([]);
  });

  it("makes all three target countries meaningful rather than a giant with negligible fillers", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const rounds = buildGeoBalanceRounds(poolForDifficulty(difficulty), 25, `balanced-targets-${difficulty}`);
      expect(rounds).toHaveLength(25);
      for (const round of rounds) {
        let hasBalancedAnswer = false;
        for (let a = 0; a < 6; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 8; c++) {
          const values = [a, b, c].map((index) => balanceValue(round.hand[index], round.metric));
          const total = values.reduce((sum, value) => sum + value, 0);
          if (Math.max(...values) / total <= 0.7 && Math.min(...values) / total >= 0.05 && Math.abs(total - round.target) / round.target <= 0.005) hasBalancedAnswer = true;
        }
        expect(hasBalancedAnswer, round.id).toBe(true);
      }
    }
    const impossible = COUNTRIES.slice(0, 8).map((country, index) => ({ ...country, area: 100 ** index, population: 100 ** index }));
    expect(buildGeoBalanceRounds(impossible, 5, "no-balanced-triple")).toEqual([]);
  });

  it("fails safely for small or invalid pools without an unbounded search", () => {
    expect(buildGeoBalanceRounds(COUNTRIES.slice(0, 7), 10, "small")).toEqual([]);
    expect(buildGeoBalanceRounds(Array.from({ length: 8 }, () => COUNTRIES[0]), 10, "duplicate")).toEqual([]);
    expect(buildGeoBalanceRounds(COUNTRIES.slice(0, 8).map((country) => ({ ...country, area: Number.NaN })), 10, "invalid")).toEqual([]);
    const uniform = COUNTRIES.slice(0, 8).map((country) => ({ ...country, area: 100, population: 100 }));
    expect(buildGeoBalanceRounds(uniform, 25, "uniform")).toHaveLength(2);
  });

  it("validates exactly three distinct countries from this hand", () => {
    const round = buildGeoBalanceRounds(COUNTRIES, 1, "input")[0];
    const ids = round.hand.map((country) => country.cca3);
    expect(evaluateGeoBalance(round, ids.slice(0, 2), "easy")).toBeNull();
    expect(evaluateGeoBalance(round, ids.slice(0, 4), "easy")).toBeNull();
    expect(evaluateGeoBalance(round, [ids[0], ids[0], ids[1]], "easy")).toBeNull();
    expect(evaluateGeoBalance(round, [ids[0], ids[1], "missing"], "easy")).toBeNull();
    expect(bestGeoBalanceTriple(round.hand, round.metric, 0)).toBeNull();
  });

  it("awards proportional points only inside the announced success window", () => {
    const round = buildGeoBalanceRounds(COUNTRIES, 1, "score")[0];
    const ids = round.best.countries.map((country) => country.cca3);
    const sum = round.best.total;
    expect(evaluateGeoBalance({ ...round, target: sum }, ids, "hard")?.points).toBe(1000);
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const threshold = BALANCE_TOLERANCE[difficulty];
      const boundary = evaluateGeoBalance({ ...round, target: sum / (1 + threshold) }, ids, difficulty);
      expect(boundary?.correct).toBe(true);
      expect(boundary?.points).toBe(300);
      const wrong = evaluateGeoBalance({ ...round, target: sum / (1 + threshold + 0.001) }, ids, difficulty);
      expect(wrong?.correct).toBe(false);
      expect(wrong?.points).toBe(0);
    }
  });
});
