import { GAMES } from "@/games/registry";

/**
 * Anonymous play counters: one aggregated row per UTC day and game. They tell
 * which games people actually start and finish (guests included), without
 * storing who played. Used for the "Popular" shelf and catalogue decisions.
 */

export type PlayEvent = "start" | "finish";

export const PLAY_STAT_GAME_IDS: readonly string[] = [...GAMES.map((game) => game.id), "daily", "weekly"];

export interface PopularGame {
  gameId: string;
  /** Finished runs in the window. */
  finishes: number;
  starts: number;
}

export function parsePlayEvent(body: unknown): { gameId: string; event: PlayEvent } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { gameId, event } = body as Record<string, unknown>;
  if (typeof gameId !== "string" || !PLAY_STAT_GAME_IDS.includes(gameId)) return null;
  if (event !== "start" && event !== "finish") return null;
  return { gameId, event };
}

/** Rank by finished runs, then starts; ties keep catalogue order for stability. */
export function rankPopular(rows: readonly PopularGame[], limit = 8): PopularGame[] {
  const order = new Map(GAMES.map((game, index) => [game.id as string, index]));
  return rows
    .filter((row) => order.has(row.gameId) && (row.finishes > 0 || row.starts > 0))
    .sort((a, b) => b.finishes - a.finishes || b.starts - a.starts || (order.get(a.gameId)! - order.get(b.gameId)!))
    .slice(0, limit);
}

/** Editorial fallback when no live counts are available (based on November 2026 account play data). */
export const FALLBACK_POPULAR: readonly string[] = ["flags", "map-click", "capitals", "outline", "grid", "colorflag", "border-chain", "draw"];
