import { describe, expect, it } from "vitest";
import { featuredUntil, isFeaturedGame, nextFeatureTransition } from "./featured";

describe("one-month game features", () => {
  it.each([
    ["2026-10-06T18:55:46Z", "2026-11-06T18:55:46Z"],
    ["2026-01-31T12:34:56Z", "2026-02-28T12:34:56Z"],
    ["2028-01-31T12:34:56Z", "2028-02-29T12:34:56Z"],
    ["2026-08-31T23:59:59Z", "2026-09-30T23:59:59Z"],
    ["2026-12-31T00:00:00Z", "2027-01-31T00:00:00Z"],
    ["2026-03-29T01:30:00.123Z", "2026-04-29T01:30:00.123Z"],
  ])("expires %s at %s, clamping month ends and preserving UTC time", (start, end) => {
    expect(featuredUntil(start)).toBe(Date.parse(end));
  });

  it.each([
    undefined, "", "invalid", "2026-10-06", "2026-10-06T18:55:46",
    "2026-10-06T18:55:46+02:00", "2026-02-30T00:00:00Z", "2026-13-01T00:00:00Z",
  ])("rejects missing, invalid or non-UTC launch dates: %s", (since) => {
    expect(featuredUntil(since)).toBeNull();
    expect(isFeaturedGame({ featuredSince: since }, Date.parse("2026-10-12T00:00:00Z"))).toBe(false);
  });

  it("starts inclusively and ends exclusively", () => {
    const game = { featuredSince: "2026-10-06T18:55:46Z" };
    const start = Date.parse(game.featuredSince);
    const end = Date.parse("2026-11-06T18:55:46Z");
    expect(isFeaturedGame(game, start - 1)).toBe(false);
    expect(isFeaturedGame(game, start)).toBe(true);
    expect(isFeaturedGame(game, end - 1)).toBe(true);
    expect(isFeaturedGame(game, end)).toBe(false);
    expect(isFeaturedGame(game, null)).toBe(false);
    expect(isFeaturedGame(game, NaN)).toBe(false);
  });

  it("schedules the next start or expiry and stops when all windows are past", () => {
    const games = [{ featuredSince: "2026-10-06T18:55:46Z" }, { featuredSince: "2026-11-01T00:00:00Z" }];
    expect(nextFeatureTransition(games, Date.parse("2026-10-01T00:00:00Z"))).toBe(Date.parse(games[0].featuredSince));
    expect(nextFeatureTransition(games, Date.parse(games[0].featuredSince))).toBe(Date.parse(games[1].featuredSince));
    expect(nextFeatureTransition(games, Date.parse(games[1].featuredSince))).toBe(Date.parse("2026-11-06T18:55:46Z"));
    expect(nextFeatureTransition(games, Date.parse("2026-11-06T18:55:46Z"))).toBe(Date.parse("2026-12-01T00:00:00Z"));
    expect(nextFeatureTransition(games, Date.parse("2026-12-01T00:00:00Z"))).toBeNull();
    expect(nextFeatureTransition([], Date.now())).toBeNull();
    expect(nextFeatureTransition([{ featuredSince: "invalid" }], Date.now())).toBeNull();
    expect(nextFeatureTransition(games, NaN)).toBeNull();
  });
});
