import { describe, expect, it } from "vitest";
import { publicProfileFromAggregates } from "./public-profile";
import { BADGES, computeStats } from "./badges";
import type { ScoreEntry } from "./leaderboard/types";

describe("account-owned public badges", () => {
  it("shows community awards on a real account with no saved games", () => {
    const profile = publicProfileFromAggregates("Shahin", {}, [], [{ badge_id: "contributor" }]);
    expect(profile).toEqual({ name: "Shahin", totalScore: 0, totalRuns: 0, bestStreak: 0, games: [], badgeIds: ["contributor"] });
    expect(publicProfileFromAggregates("Adastra1995", {}, [], [{ badge_id: "game-creator" }]).badgeIds).toEqual(["game-creator"]);
  });

  it("uses canonical badge rules for complete score aggregates, including game-specific mastery", () => {
    const run: ScoreEntry = { id: "run", gameId: "grid", difficulty: "hard", mode: "type", score: 6000,
      correct: 25, total: 25, bestStreak: 25, durationMs: 30_000, createdAt: Date.UTC(2026, 9, 12, 12) };
    const game = { game_id: "grid", best: "6000", runs: "1", correct: "25", streak: "25", max_total: "25",
      perfect: "1", hard_runs: "1", hard_perfect: "1", flawless: "0" };
    const totals = { total: "6000", runs: "1", max_score: "6000", streak: "25", perfect: "1", big_perfect: "1",
      hard_runs: "1", hard_perfect: "1", type_runs: "1", days: "1" };
    const profile = publicProfileFromAggregates("Alice", totals, [game], [{ badge_id: "contributor" }]);
    const stats = computeStats([run], {}, undefined, ["contributor"]);
    // Player-local hour is intentionally not inferred from a server receipt timestamp.
    stats.nightOwl = 0;
    expect(profile.badgeIds).toEqual(BADGES.filter((badge) => badge.earned(stats)).map((badge) => badge.id));
    expect(profile.badgeIds).toEqual(expect.arrayContaining(["first", "bigrun", "megarun", "perfect", "hardcore", "gridHard", "contributor"]));
    expect(profile.games).toEqual([{ game_id: "grid", best: 6000, runs: 1 }]);
  });

  it("does not invent local collection, local-time or account-awarded badges from points", () => {
    const profile = publicProfileFromAggregates("Alice", { total: 9_000_000, runs: 1000 }, [], [{ badge_id: "unknown-award" }]);
    expect(profile.badgeIds).not.toContain("contributor");
    expect(profile.badgeIds).not.toContain("game-creator");
    expect(profile.badgeIds).not.toContain("nightOwl");
    expect(profile.badgeIds.some((id) => /^(dex|region)/.test(id))).toBe(false);
    expect(profile.badgeIds).not.toContain("unknown-award");
  });

  it("handles historical null values without creating NaN scores or phantom achievements", () => {
    const profile = publicProfileFromAggregates("Alice", { total: null, runs: null, streak: null }, [], []);
    expect(profile.totalScore).toBe(0);
    expect(profile.badgeIds).toEqual([]);
  });
});
