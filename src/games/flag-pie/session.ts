import type { PlayResult } from "@/components/game/game-shell";

export interface VisualSession {
  score: number;
  correct: number;
  streak: number;
  bestStreak: number;
  marks: boolean[];
  countryHits: string[];
}

export function initialSession(): VisualSession {
  return { score: 0, correct: 0, streak: 0, bestStreak: 0, marks: [], countryHits: [] };
}

/** An index may be recorded once only, including simultaneous timer/answer events. */
export function recordVisualRound(
  session: VisualSession,
  index: number,
  total: number,
  correct: boolean,
  earned: number,
  countryHit?: string,
): VisualSession {
  if (index !== session.marks.length || index >= total) return session;
  const streak = correct ? session.streak + 1 : 0;
  return {
    score: Math.max(0, session.score + (correct ? Math.max(0, Math.round(earned)) : 0)),
    correct: session.correct + Number(correct),
    streak,
    bestStreak: Math.max(session.bestStreak, streak),
    marks: [...session.marks, correct],
    countryHits: correct && countryHit ? [...session.countryHits, countryHit] : session.countryHits,
  };
}

export function visualResult(session: VisualSession, total: number, durationMs: number, mode: string): PlayResult {
  return {
    score: session.score,
    correct: session.correct,
    total,
    bestStreak: session.bestStreak,
    durationMs,
    mode,
    marks: session.marks,
    countryHits: session.countryHits,
  };
}
