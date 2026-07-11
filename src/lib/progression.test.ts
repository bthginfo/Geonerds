import { describe, expect, it } from "vitest";
import { applyRun, emptyProgression, migrateProgression, progressionFromRuns } from "./progression";
import type { RunResult } from "./types";

const run = (i: number): RunResult => ({
  gameId: i % 2 ? "flags" : "capitals",
  difficulty: "medium",
  score: 100,
  correct: 8,
  total: 10,
  bestStreak: 4,
  durationMs: 1000,
  createdAt: Date.UTC(2026, 6, 10) + i,
});

describe("progression", () => {
  it("migrates partial legacy state without erasing totals", () => {
    const migrated = migrateProgression({ totalRuns: 12, totalScore: 900, games: { flags: { runs: 12 } } });
    expect(migrated.totalRuns).toBe(12);
    expect(migrated.totalScore).toBe(900);
    expect(migrated.games.flags.runs).toBe(12);
  });

  it("keeps lifetime totals beyond the detailed 500-run window", () => {
    const data = progressionFromRuns(Array.from({ length: 620 }, (_, i) => run(i)));
    expect(data.totalRuns).toBe(620);
    expect(data.totalScore).toBe(62_000);
    expect(data.totalCorrect).toBe(4_960);
  });

  it("records days and per-game aggregates deterministically", () => {
    const data = applyRun(emptyProgression(), run(1));
    expect(data.games.flags.runs).toBe(1);
    expect(Object.values(data.days)[0].games).toEqual(["flags"]);
  });
});
