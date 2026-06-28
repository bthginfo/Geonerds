import { describe, expect, it } from "vitest";
import {
  scoreForAnswer,
  scoreForDrawing,
  streakMultiplier,
  accuracy,
  DIFFICULTY_MULTIPLIER,
} from "./scoring";

describe("streakMultiplier", () => {
  it("starts at 1 and caps at 2", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(5)).toBeCloseTo(1.5);
    expect(streakMultiplier(10)).toBe(2);
    expect(streakMultiplier(50)).toBe(2);
  });
});

describe("scoreForAnswer", () => {
  it("returns 0 for wrong answers", () => {
    expect(scoreForAnswer({ correct: false, difficulty: "hard", streak: 9 })).toBe(0);
  });

  it("awards base points scaled by difficulty", () => {
    expect(scoreForAnswer({ correct: true, difficulty: "easy", streak: 0 })).toBe(100);
    expect(scoreForAnswer({ correct: true, difficulty: "hard", streak: 0 })).toBe(200);
  });

  it("adds a speed bonus when answered quickly", () => {
    const fast = scoreForAnswer({ correct: true, difficulty: "easy", streak: 0, timeMs: 0, timeLimitMs: 10000 });
    const slow = scoreForAnswer({ correct: true, difficulty: "easy", streak: 0, timeMs: 10000, timeLimitMs: 10000 });
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBe(100);
  });

  it("multiplies by the streak", () => {
    const noStreak = scoreForAnswer({ correct: true, difficulty: "easy", streak: 0 });
    const streak = scoreForAnswer({ correct: true, difficulty: "easy", streak: 10 });
    expect(streak).toBe(noStreak * 2);
  });
});

describe("scoreForDrawing", () => {
  it("scales with overlap and difficulty, clamped to [0,1]", () => {
    expect(scoreForDrawing(0, "easy")).toBe(0);
    expect(scoreForDrawing(1, "easy")).toBe(250);
    expect(scoreForDrawing(1, "hard")).toBe(250 * DIFFICULTY_MULTIPLIER.hard);
    expect(scoreForDrawing(2, "easy")).toBe(250);
  });
});

describe("accuracy", () => {
  it("computes a percentage", () => {
    expect(accuracy(0, 0)).toBe(0);
    expect(accuracy(3, 4)).toBe(75);
  });
});
