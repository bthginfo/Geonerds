import type { Difficulty } from "./types";

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 100;
/** Streak multiplier caps at 2x (reached at a streak of 10). */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.max(streak, 0), 10) * 0.1;
}

export interface AnswerScoreInput {
  correct: boolean;
  difficulty: Difficulty;
  /** Streak BEFORE this answer (0 for the first). */
  streak: number;
  /** Time taken to answer, in ms. */
  timeMs?: number;
  /** Time budget for a full-speed bonus, in ms. */
  timeLimitMs?: number;
}

/** Points awarded for a single answer in the quiz-style games. */
export function scoreForAnswer({
  correct,
  difficulty,
  streak,
  timeMs = 0,
  timeLimitMs = 0,
}: AnswerScoreInput): number {
  if (!correct) return 0;
  let speedBonus = 0;
  if (timeLimitMs > 0) {
    const ratio = Math.max(0, (timeLimitMs - timeMs) / timeLimitMs);
    speedBonus = Math.round(MAX_SPEED_BONUS * ratio);
  }
  const raw = (BASE_POINTS + speedBonus) * DIFFICULTY_MULTIPLIER[difficulty] * streakMultiplier(streak);
  return Math.round(raw);
}

/** Points for the Draw-the-Outline game based on shape overlap (0..1). */
export function scoreForDrawing(overlap: number, difficulty: Difficulty): number {
  const clamped = Math.min(1, Math.max(0, overlap));
  return Math.round(clamped * 250 * DIFFICULTY_MULTIPLIER[difficulty]);
}

export function accuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
