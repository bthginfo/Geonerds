import { describe, expect, it } from "vitest";
import { BOT_CHALLENGE_GAME_IDS, buildBotAttempt } from "./challenge-bots";
import { parseGeoChallengeConfig, validGeoChallengeResult } from "./challenges";
import type { Difficulty } from "./types";
import { getGame } from "@/games/registry";

const config = { gameId: "flags" as const, difficulty: "medium" as const, mode: "choice" as const, rounds: 10, timed: false, variant: "world" };
describe("honest, independently seeded training bots", () => {
  it("requires an independent valid strength and supports only compatible games", () => {
    for (const botDifficulty of ["easy", "medium", "hard"]) {
      expect(parseGeoChallengeConfig({ ...config, invitationType: "bot", botDifficulty })?.botDifficulty).toBe(botDifficulty);
    }
    for (const botDifficulty of [undefined, "expert", 1, null]) {
      expect(parseGeoChallengeConfig({ ...config, invitationType: "bot", botDifficulty })).toBeNull();
    }
    expect(parseGeoChallengeConfig({ ...config, invitationType: "bot", botDifficulty: "easy", opponentName: "Bob" })).toBeNull();
    expect(parseGeoChallengeConfig({ ...config, invitationType: "random", botDifficulty: "easy" })).toBeNull();
    expect(parseGeoChallengeConfig({ ...config, gameId: "trivia", variant: "", invitationType: "bot", botDifficulty: "hard" })).toBeNull();
  });
  it.each(BOT_CHALLENGE_GAME_IDS)("uses valid real quiz scoring for %s and supports full-pool runs", (gameId) => {
    const game = getGame(gameId)!;
    for (const difficulty of ["easy", "medium", "hard"] as Difficulty[]) for (const timed of [false, true]) {
      const settings = { ...config, gameId, difficulty, timed, rounds: 0, variant: game.variants?.default ?? "" };
      const bot = buildBotAttempt(settings, "medium", "secret-seed", 196);
      expect(validGeoChallengeResult({ ...settings, ...bot }, settings)).toBe(true);
      expect(bot.bot).toBe(true);
      expect(bot.mine).toBe(false);
      expect(bot.score).toBeLessThanOrEqual(bot.correct * (timed ? 400 : difficulty === "hard" ? 200 : difficulty === "medium" ? 150 : 100));
    }
  });
  it("repeats exactly for the same committed seed; only actual question count, never player performance, is an input", () => {
    const first = buildBotAttempt(config, "medium", "private-A", 10);
    expect(buildBotAttempt(config, "medium", "private-A", 10)).toEqual(first);
    expect(buildBotAttempt(config, "medium", "private-B", 10)).not.toEqual(first);
    expect(Object.keys(first).sort()).toEqual(["bestStreak", "bot", "correct", "durationMs", "mine", "name", "score", "total"].sort());
  });
  it("raises expected accuracy and speed with strength without silently changing question difficulty", () => {
    const totals = { easy: 0, medium: 0, hard: 0 };
    for (let seed = 0; seed < 100; seed++) {
      const bots = (["easy", "medium", "hard"] as Difficulty[]).map((strength) => buildBotAttempt(config, strength, `seed-${seed}`, 10));
      expect(bots[0].correct).toBeLessThanOrEqual(bots[1].correct);
      expect(bots[1].correct).toBeLessThanOrEqual(bots[2].correct);
      expect(bots[0].durationMs).toBeGreaterThan(bots[1].durationMs);
      expect(bots[1].durationMs).toBeGreaterThan(bots[2].durationMs);
      expect(bots[0].score).toBeLessThanOrEqual(bots[1].score);
      expect(bots[1].score).toBeLessThanOrEqual(bots[2].score);
      for (const [index, strength] of (["easy", "medium", "hard"] as Difficulty[]).entries()) totals[strength] += bots[index].correct;
    }
    expect(totals.easy / 1000).toBeGreaterThan(0.35);
    expect(totals.easy / 1000).toBeLessThan(0.55);
    expect(totals.medium / 1000).toBeGreaterThan(0.6);
    expect(totals.hard / 1000).toBeGreaterThan(0.83);
    const easyQuestions = buildBotAttempt({ ...config, difficulty: "easy" }, "medium", "same", 10);
    const hardQuestions = buildBotAttempt({ ...config, difficulty: "hard" }, "medium", "same", 10);
    expect(easyQuestions.correct).toBe(hardQuestions.correct);
    expect(hardQuestions.score).toBeGreaterThanOrEqual(easyQuestions.score);
  });
  it("does not award hidden speed points in untimed mode and honors the actual mountain timer", () => {
    const untimed = buildBotAttempt(config, "hard", "fixed", 10);
    const timed = buildBotAttempt({ ...config, timed: true }, "hard", "fixed", 10);
    expect(timed.correct).toBe(untimed.correct);
    expect(timed.score).toBeGreaterThan(untimed.score);
    const mountain = buildBotAttempt({ ...config, gameId: "mountains", timed: true, variant: "" }, "easy", "timer", 10);
    expect(mountain.durationMs).toBeGreaterThan(10_000);
  });
  it.each([0, -1, 11, 1001, Infinity, NaN, 1.5])("rejects invalid or oversize count %s", (total) => {
    expect(() => buildBotAttempt(config, "medium", "fixed", total)).toThrow();
  });
});
