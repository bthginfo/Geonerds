import type { GameId } from "@/lib/types";
import type { PlayEvent, PopularGame } from "@/lib/play-stats";

/** Fire-and-forget aggregate counter; never blocks or breaks gameplay. */
export function trackPlay(gameId: GameId, event: PlayEvent): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ gameId, event });
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/plays", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/plays", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    // Counting is best effort only.
  }
}

export async function apiPopularGames(signal?: AbortSignal): Promise<PopularGame[]> {
  try {
    const response = await fetch("/api/plays", { signal });
    if (!response.ok) return [];
    const data = await response.json() as { games?: PopularGame[] };
    return Array.isArray(data.games) ? data.games : [];
  } catch {
    return [];
  }
}
