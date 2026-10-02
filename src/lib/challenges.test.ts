import { describe, expect, it } from "vitest";
import { CHALLENGE_GAME_IDS, CHALLENGE_ROUND_COUNTS, compareGeoAttempts, geoChallengeTransition, parseGeoChallengeConfig, validGeoChallengeResult } from "./challenges";
import { createSeededRandom, seededShuffle } from "./random";
import { validGeoScore } from "./score-validation";

const config = { gameId: "flags" as const, difficulty: "medium" as const, mode: "choice" as const, rounds: 10, timed: false, variant: "world" };
const result = { gameId: "flags", difficulty: "medium", mode: "choice", score: 900, correct: 6, total: 10, bestStreak: 4, durationMs: 30_000 };

describe("Geo challenge settings", () => {
  it("accepts only registered, seed-supported games", () => {
    expect(CHALLENGE_GAME_IDS.length).toBe(13);
    for (const gameId of CHALLENGE_GAME_IDS) {
      const variants = gameId === "flags" ? "world" : gameId === "capitals" ? "capitals" : "";
      // New game defaults are covered by their own registry tests.
      if (["flag-pie", "city-compass", "flag-mosaic", "country-radar"].includes(gameId)) continue;
      expect(parseGeoChallengeConfig({ ...config, gameId, variant: variants, opponentName: "Explorer" })).not.toBeNull();
    }
    expect(parseGeoChallengeConfig({ ...config, gameId: "grid", opponentName: "Explorer" })).toBeNull();
  });
  it("normalizes an actual player name without silently truncating", () => {
    expect(parseGeoChallengeConfig({ ...config, opponentName: "  Géonerd  " })?.opponentName).toBe("Géonerd");
    expect(parseGeoChallengeConfig({ ...config, opponentName: "x" })).toBeNull();
    expect(parseGeoChallengeConfig({ ...config, opponentName: "a".repeat(21) })).toBeNull();
  });
  it.each(CHALLENGE_ROUND_COUNTS)("accepts %s locked rounds", (rounds) => {
    expect(parseGeoChallengeConfig({ ...config, rounds, opponentName: "Explorer" })?.rounds).toBe(rounds);
  });
  it.each([
    { rounds: 0 }, { rounds: 11 }, { rounds: "10" }, { difficulty: "expert" },
    { mode: "invalid" }, { variant: "unlisted" }, { timed: "false" },
  ])("rejects unsupported settings %j", (change) => {
    expect(parseGeoChallengeConfig({ ...config, opponentName: "Explorer", ...change })).toBeNull();
  });
  it("does not enable typed or timed modes unsupported by a game", () => {
    expect(parseGeoChallengeConfig({ ...config, gameId: "languages", variant: "", mode: "type", opponentName: "Explorer" })).toBeNull();
  });
});

describe("Challenge lifecycle and fairness", () => {
  it("only the invited opponent may accept or decline", () => {
    expect(geoChallengeTransition("pending", "accept", "opponent")).toBe("active");
    expect(geoChallengeTransition("pending", "decline", "opponent")).toBe("declined");
    expect(geoChallengeTransition("pending", "accept", "challenger")).toBeNull();
    expect(geoChallengeTransition("pending", "decline", "challenger")).toBeNull();
  });
  it("only the inviter may cancel an unaccepted invitation", () => {
    expect(geoChallengeTransition("pending", "cancel", "challenger")).toBe("cancelled");
    expect(geoChallengeTransition("pending", "cancel", "opponent")).toBeNull();
    expect(geoChallengeTransition("active", "cancel", "challenger")).toBeNull();
  });
  it.each(["resolved", "declined", "cancelled", "expired"] as const)("cannot reopen %s", (status) => {
    expect(geoChallengeTransition(status, "accept", "opponent")).toBeNull();
  });
  it("expires invitations before any transition", () => {
    expect(geoChallengeTransition("pending", "accept", "opponent", true)).toBeNull();
  });
  it("compares points, then correct answers, then lower duration, allowing draws", () => {
    const a = { score: 100, correct: 3, durationMs: 10_000 };
    expect(compareGeoAttempts(a, { ...a, score: 99, durationMs: 1 })).toBeGreaterThan(0);
    expect(compareGeoAttempts(a, { ...a, correct: 2 })).toBeGreaterThan(0);
    expect(compareGeoAttempts(a, { ...a, durationMs: 11_000 })).toBeGreaterThan(0);
    expect(compareGeoAttempts(a, a)).toBe(0);
  });
  it("gives both players exactly the same random stream, independent of other streams", () => {
    const values = Array.from({ length: 196 }, (_, i) => i);
    const first = seededShuffle(values, "challenge:shared");
    for (let i = 0; i < 100; i++) createSeededRandom(`other:${i}`)();
    expect(seededShuffle(values, "challenge:shared")).toEqual(first);
    expect(seededShuffle(values, "challenge:other")).not.toEqual(first);
    expect(new Set(first).size).toBe(196);
    expect(values[0]).toBe(0);
  });
});

describe("Score validation", () => {
  it("accepts a consistent completed result and a pool capped below the selected rounds", () => {
    expect(validGeoChallengeResult(result, config)).toBe(true);
    expect(validGeoChallengeResult({ ...result, total: 7 }, config)).toBe(true);
    expect(validGeoScore(result)).toBe(true);
  });
  it.each([
    { score: -1 }, { score: NaN }, { score: Infinity }, { score: 0.5 }, { score: "900" },
    { score: 7000 }, { total: 0 }, { total: 11 }, { correct: 11 }, { bestStreak: 7 },
    { difficulty: "easy" }, { gameId: "outline" }, { mode: "type" }, { durationMs: 0 },
  ])("rejects impossible challenge result %j", (change) => {
    expect(validGeoChallengeResult({ ...result, ...change }, config)).toBe(false);
  });
  it("rejects malformed leaderboard entries and unknown games", () => {
    expect(validGeoScore({ ...result, total: 0 })).toBe(false);
    expect(validGeoScore({ ...result, correct: 11 })).toBe(false);
    expect(validGeoScore({ ...result, gameId: "not-a-game" })).toBe(false);
    expect(validGeoScore({ ...result, score: "900" })).toBe(false);
  });
  it("accepts a minesweeper safe-move streak distinct from its final mine count", () => {
    expect(validGeoScore({ ...result, gameId: "minesweeper", score: 400, total: 4, correct: 0, bestStreak: 8, mode: "logic" })).toBe(true);
  });
});
