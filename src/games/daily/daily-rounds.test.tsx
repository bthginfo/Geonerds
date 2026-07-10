import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { DAILY_COUNT, WEEKLY_COUNT, mulberry32 } from "@/lib/daily";
import {
  CHALLENGE_BUILDER_COUNT,
  borderCountOptions,
  eligibleFactQuestions,
  generateDailyRounds,
  generateWeeklyRounds,
  maxFactTierForDifficulty,
  uniqueExtreme,
} from "./daily-rounds";

function serialise(rounds: ReturnType<typeof generateDailyRounds>) {
  return rounds.map((round) => ({ key: round.key, correctId: round.correctId, options: round.options }));
}

function expectChoiceIntegrity(rounds: ReturnType<typeof generateDailyRounds>) {
  expect(new Set(rounds.map((round) => round.key)).size).toBe(rounds.length);
  const answerCountries = rounds.map((round) => round.factCountry?.cca3).filter((code): code is string => Boolean(code));
  expect(new Set(answerCountries).size).toBe(answerCountries.length);
  for (const round of rounds) {
    const ids = round.options.map((option) => option.id);
    const labels = round.options.map((option) => option.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect(ids.filter((id) => id === round.correctId)).toHaveLength(1);
  }
}

describe("Daily and Weekly content generation", () => {
  it("has at least 17 procedural builders", () => {
    expect(CHALLENGE_BUILDER_COUNT).toBeGreaterThanOrEqual(17);
  });

  it.each(["en", "de"] as const)("deterministically fills Daily and Weekly in %s", (locale) => {
    const dailyA = generateDailyRounds("2026-07-10", locale);
    const dailyB = generateDailyRounds("2026-07-10", locale);
    const weeklyA = generateWeeklyRounds("2026-W28", locale);
    const weeklyB = generateWeeklyRounds("2026-W28", locale);
    expect(dailyA).toHaveLength(DAILY_COUNT);
    expect(weeklyA).toHaveLength(WEEKLY_COUNT);
    expect(serialise(dailyA)).toEqual(serialise(dailyB));
    expect(serialise(weeklyA)).toEqual(serialise(weeklyB));
    expectChoiceIntegrity(dailyA);
    expectChoiceIntegrity(weeklyA);
  });

  it("keeps curated facts inside the difficulty tier", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const maxTier = maxFactTierForDifficulty(difficulty);
      expect(eligibleFactQuestions(COUNTRIES, maxTier).every((question) => question.tier <= maxTier)).toBe(true);
    }
  });

  it("rejects small/tied extremes and creates unique border-count choices", () => {
    const values = [{ n: 1 }, { n: 2 }, { n: 2 }, { n: 0 }];
    expect(uniqueExtreme(values.slice(0, 3), (item) => item.n, "min")).toBeNull();
    expect(uniqueExtreme(values, (item) => item.n, "max")).toBeNull();
    expect(uniqueExtreme(values, (item) => item.n, "min")?.n).toBe(0);
    const options = borderCountOptions(5, mulberry32(42));
    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    expect(options).toContain(5);
    expect(borderCountOptions(-1, mulberry32(1))).toBeNull();
  });
});
