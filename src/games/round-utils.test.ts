import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { createSeededRandom } from "@/lib/random";
import { sample, shuffle } from "@/lib/utils";
import { makeChoices, pickQuestions } from "./round-utils";

describe("finite seeded quiz randomness", () => {
  it("replays both questions and choices from the same seed", () => {
    const makeRun = (seed: string) => {
      const random = createSeededRandom(seed);
      return pickQuestions(COUNTRIES, 20, random).map((answer) => ({
        answer: answer.cca3,
        choices: makeChoices(answer, COUNTRIES, "hard", 4, random).map((country) => country.cca3),
      }));
    };
    expect(makeRun("shared-geography-run")).toEqual(makeRun("shared-geography-run"));
    expect(makeRun("shared-geography-run")).not.toEqual(makeRun("another-geography-run"));
  });

  it("never repeats an answer in a finite all-country run or an option in a round", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const random = createSeededRandom(`all-${difficulty}`);
      const questions = pickQuestions(COUNTRIES, Infinity, random);
      expect(questions).toHaveLength(COUNTRIES.length);
      expect(new Set(questions.map((country) => country.cca3)).size).toBe(COUNTRIES.length);
      for (const answer of questions) {
        const options = makeChoices(answer, COUNTRIES, difficulty, 4, random);
        expect(options).toHaveLength(4);
        expect(new Set(options.map((country) => country.cca3)).size).toBe(4);
        expect(options.filter((country) => country.cca3 === answer.cca3)).toHaveLength(1);
      }
    }
  });

  it("bounds sparse and empty pools without changing the source array", () => {
    const pool = COUNTRIES.slice(0, 2);
    const before = [...pool];
    expect(makeChoices(pool[0], pool, "hard")).toHaveLength(2);
    expect(pickQuestions(pool, 200)).toHaveLength(2);
    expect(sample(pool, -1)).toEqual([]);
    expect(pickQuestions([], 10)).toEqual([]);
    shuffle(pool);
    expect(pool).toEqual(before);
  });
});
