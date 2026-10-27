import type { GeoChallengeAttempt, GeoChallengeConfig } from "./challenges";
import type { Difficulty } from "./types";
import { createSeededRandom } from "./random";
import { scoreForAnswer } from "./scoring";

/** These games share the real quiz scoring rules, including wrong-answer penalties. */
export const BOT_CHALLENGE_GAME_IDS = ["flags", "capitals", "outline", "waters", "origin", "mountains", "languages"] as const;
export const BOT_NAME = "GeoBot";
export const MAX_BOT_ROUNDS = 1000;

export function supportsBotGame(gameId: string): boolean {
  return BOT_CHALLENGE_GAME_IDS.some((id) => id === gameId);
}

const PROFILES: Record<Difficulty, { accuracy: number; minMs: number; maxMs: number }> = {
  easy: { accuracy: 0.45, minMs: 6500, maxMs: 9000 },
  medium: { accuracy: 0.7, minMs: 4000, maxMs: 7000 },
  hard: { accuracy: 0.9, minMs: 2200, maxMs: 5000 },
};

/**
 * A simulated training opponent, not a fake human account or an LLM.
 * The server commits a separate, secret seed before play. Only the available
 * question count is supplied afterwards: player score/accuracy/time never enter
 * this calculation. Retry results therefore cannot adapt to, or chase, a player.
 */
export function buildBotAttempt(config: GeoChallengeConfig, strength: Difficulty, privateSeed: string, total: number): GeoChallengeAttempt {
  if (!supportsBotGame(config.gameId) || !PROFILES[strength] || !privateSeed
    || !Number.isSafeInteger(total) || total < 1 || total > MAX_BOT_ROUNDS
    || (config.rounds > 0 && total > config.rounds)) throw new RangeError("Invalid bot challenge settings");
  const random = createSeededRandom(`${privateSeed}:geo-bot-v1:${config.gameId}`);
  const profile = PROFILES[strength];
  const limitMs = config.gameId === "mountains" ? 12000 : 10000;
  let score = 0, correct = 0, streak = 0, bestStreak = 0, durationMs = 0;
  for (let round = 0; round < total; round++) {
    // Consume the same draws at every strength; profile selection never shifts RNG.
    const right = random() < profile.accuracy;
    const responseDraw = random();
    const feedbackDraw = random();
    const typingMs = config.mode === "type" ? 1200 : 0;
    const timeMs = Math.min(limitMs - 200, Math.round(profile.minMs + responseDraw * (profile.maxMs - profile.minMs) + typingMs));
    score = Math.max(0, score + scoreForAnswer({ correct: right, difficulty: config.difficulty, timed: config.timed, timeMs, timeLimitMs: limitMs }));
    if (right) { correct++; streak++; bestStreak = Math.max(bestStreak, streak); }
    else streak = 0;
    durationMs += timeMs + 900 + Math.round(feedbackDraw * 1200);
  }
  return { name: BOT_NAME, score, correct, total, bestStreak, durationMs, mine: false, bot: true };
}
