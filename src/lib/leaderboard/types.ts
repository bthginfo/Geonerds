import type { GameId, RunResult } from "@/lib/types";

export interface ScoreEntry extends RunResult {
  id: string;
  name?: string;
}

/**
 * Storage seam for scores. The app talks only to this interface, so a future
 * online backend (Vercel Postgres + API routes) can replace LocalScoreStore
 * without touching any game code.
 */
export interface ScoreStore {
  saveRun(result: RunResult): Promise<ScoreEntry>;
  topScores(opts?: { gameId?: GameId; limit?: number }): Promise<ScoreEntry[]>;
  bestScore(gameId: GameId): Promise<number>;
  allRuns(): Promise<ScoreEntry[]>;
  clear(): Promise<void>;
}
