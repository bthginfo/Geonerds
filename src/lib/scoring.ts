import type { Difficulty } from "./types";

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 100;
export const WRONG_PENALTY = 50;

export interface AnswerScoreInput {
  correct: boolean;
  difficulty: Difficulty;
  /** Only when timed: faster answers earn up to MAX_SPEED_BONUS. */
  timed?: boolean;
  timeMs?: number;
  timeLimitMs?: number;
}

/**
 * Points delta for a single answer: a fixed amount per correct answer
 * (× difficulty), plus a speed bonus only in timed mode; a flat penalty when
 * wrong. No hidden time decay in untimed mode.
 */
export function scoreForAnswer({
  correct,
  difficulty,
  timed = false,
  timeMs = 0,
  timeLimitMs = 0,
}: AnswerScoreInput): number {
  if (!correct) return -WRONG_PENALTY;
  let speedBonus = 0;
  if (timed && timeLimitMs > 0) {
    const ratio = Math.max(0, (timeLimitMs - timeMs) / timeLimitMs);
    speedBonus = Math.round(MAX_SPEED_BONUS * ratio);
  }
  return Math.round((BASE_POINTS + speedBonus) * DIFFICULTY_MULTIPLIER[difficulty]);
}

/** Points for the Draw / Trace games based on shape overlap (0..1). */
export function scoreForDrawing(overlap: number, difficulty: Difficulty): number {
  const clamped = Math.min(1, Math.max(0, overlap));
  return Math.round(clamped * 250 * DIFFICULTY_MULTIPLIER[difficulty]);
}

/** Points for a Trivia answer given clues revealed (1..4): fewer = more. */
export const TRIVIA_REVEAL_FACTOR = [1, 0.7, 0.45, 0.25];
export function scoreForTrivia(revealed: number, difficulty: Difficulty): number {
  const factor = TRIVIA_REVEAL_FACTOR[Math.min(Math.max(revealed, 1), 4) - 1];
  return Math.round(BASE_POINTS * factor * DIFFICULTY_MULTIPLIER[difficulty]);
}

export function accuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
