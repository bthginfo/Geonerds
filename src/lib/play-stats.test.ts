import { describe, expect, it } from "vitest";
import { FALLBACK_POPULAR, parsePlayEvent, rankPopular } from "./play-stats";
import { GAMES } from "@/games/registry";

describe("anonymous play stats", () => {
  it("accepts only current games and known events", () => {
    expect(parsePlayEvent({ gameId: "flags", event: "start" })).toEqual({ gameId: "flags", event: "start" });
    expect(parsePlayEvent({ gameId: "daily", event: "finish" })).toEqual({ gameId: "daily", event: "finish" });
    expect(parsePlayEvent({ gameId: "trivia", event: "start" })).toBeNull();
    expect(parsePlayEvent({ gameId: "flags", event: "delete" })).toBeNull();
    expect(parsePlayEvent([{ gameId: "flags", event: "start" }])).toBeNull();
    expect(parsePlayEvent(null)).toBeNull();
  });

  it("ranks by finishes, then starts, and drops unknown or empty rows", () => {
    const ranked = rankPopular([
      { gameId: "capitals", finishes: 5, starts: 9 },
      { gameId: "flags", finishes: 5, starts: 12 },
      { gameId: "trivia", finishes: 99, starts: 99 },
      { gameId: "grid", finishes: 0, starts: 0 },
      { gameId: "outline", finishes: 1, starts: 1 },
    ]);
    expect(ranked.map((row) => row.gameId)).toEqual(["flags", "capitals", "outline"]);
  });

  it("keeps the fallback shelf within the live catalogue", () => {
    const ids = new Set<string>(GAMES.map((game) => game.id));
    for (const id of FALLBACK_POPULAR) expect(ids.has(id)).toBe(true);
  });
});
