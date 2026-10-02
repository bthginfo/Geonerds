import { getGame } from "@/games/registry";
import type { RunResult } from "@/lib/types";

/** Reject malformed scores instead of turning invalid inputs into leaderboard entries. */
export function validGeoScore(body: Record<string, unknown>): boolean {
  if (typeof body.gameId !== "string" || (!getGame(body.gameId) && body.gameId !== "daily" && body.gameId !== "weekly")) return false;
  if (!["easy", "medium", "hard"].includes(String(body.difficulty))) return false;
  if (body.mode != null && (typeof body.mode !== "string" || body.mode.length > 128)) return false;
  if (![body.score, body.correct, body.total, body.bestStreak, body.durationMs].every(
    (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
  )) return false;
  const run = body as unknown as RunResult;
  return run.score <= 10_000_000 && run.total > 0 && run.total <= 100_000
    // Logic games count a streak of safe moves separately from final solved mines.
    && run.correct <= run.total && run.bestStreak <= 100_000 && run.durationMs <= 86_400_000;
}
