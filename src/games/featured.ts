import type { GameConfig } from "./registry";

/** One UTC calendar month, clamped to the next month's last day, not a fixed 30 days. */
export function featuredUntil(since?: string): number | null {
  if (!since || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(since)) return null;
  const start = new Date(since);
  if (!Number.isFinite(start.getTime()) || start.toISOString().replace(".000Z", "Z") !== since.replace(".000Z", "Z")) return null;
  const end = new Date(start.getTime());
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDay = new Date(end.getTime());
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  end.setUTCDate(Math.min(day, lastDay.getUTCDate()));
  return end.getTime();
}

export function isFeaturedGame(game: Pick<GameConfig, "featuredSince">, now: number | null): boolean {
  const end = featuredUntil(game.featuredSince);
  return now !== null && Number.isFinite(now) && end !== null
    && now >= Date.parse(game.featuredSince!) && now < end;
}

/** Allows an open Home tab to update exactly at a launch/expiry without polling a server. */
export function nextFeatureTransition(games: readonly Pick<GameConfig, "featuredSince">[], now: number): number | null {
  if (!Number.isFinite(now)) return null;
  const future = games.flatMap((game) => {
    const end = featuredUntil(game.featuredSince);
    return end === null ? [] : [Date.parse(game.featuredSince!), end].filter((time) => time > now);
  });
  return future.length ? Math.min(...future) : null;
}
