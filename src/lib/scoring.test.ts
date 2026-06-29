import { describe, expect, it } from "vitest";
import {
  scoreForAnswer,
  scoreForDrawing,
  scoreForTrivia,
  accuracy,
  WRONG_PENALTY,
  DIFFICULTY_MULTIPLIER,
} from "./scoring";

describe("scoreForAnswer", () => {
  it("gives a fixed amount per correct answer, scaled by difficulty", () => {
    expect(scoreForAnswer({ correct: true, difficulty: "easy" })).toBe(100);
    expect(scoreForAnswer({ correct: true, difficulty: "hard" })).toBe(200);
  });

  it("does NOT decay with time when untimed", () => {
    const fast = scoreForAnswer({ correct: true, difficulty: "easy", timeMs: 0, timeLimitMs: 10000 });
    const slow = scoreForAnswer({ correct: true, difficulty: "easy", timeMs: 9000, timeLimitMs: 10000 });
    expect(fast).toBe(slow);
    expect(fast).toBe(100);
  });

  it("adds a speed bonus only when timed", () => {
    const fast = scoreForAnswer({ correct: true, difficulty: "easy", timed: true, timeMs: 0, timeLimitMs: 10000 });
    const slow = scoreForAnswer({ correct: true, difficulty: "easy", timed: true, timeMs: 10000, timeLimitMs: 10000 });
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBe(100);
  });

  it("penalises wrong answers", () => {
    expect(scoreForAnswer({ correct: false, difficulty: "hard" })).toBe(-WRONG_PENALTY);
  });
});

describe("scoreForDrawing", () => {
  it("scales with overlap and difficulty, clamped", () => {
    expect(scoreForDrawing(0, "easy")).toBe(0);
    expect(scoreForDrawing(1, "easy")).toBe(250);
    expect(scoreForDrawing(1, "hard")).toBe(250 * DIFFICULTY_MULTIPLIER.hard);
    expect(scoreForDrawing(2, "easy")).toBe(250);
  });
});

describe("scoreForTrivia", () => {
  it("rewards fewer revealed clues", () => {
    expect(scoreForTrivia(1, "easy")).toBeGreaterThan(scoreForTrivia(4, "easy"));
    expect(scoreForTrivia(1, "easy")).toBe(100);
  });
});

describe("accuracy", () => {
  it("computes a percentage", () => {
    expect(accuracy(0, 0)).toBe(0);
    expect(accuracy(3, 4)).toBe(75);
  });
});
