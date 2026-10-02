import { afterEach, describe, expect, it, vi } from "vitest";
import type { GeoChallenge } from "@/lib/challenges";
import { attemptStorageKey, challengeError, challengePlayBlock, readSavedAttempt, writeSavedAttempt } from "./challenge-ui";

const record: GeoChallenge = {
  id: "challenge-1", gameId: "flags", difficulty: "medium", mode: "choice", rounds: 10, timed: false, variant: "world", seed: "same-questions", status: "active", challengerName: "Atlas", opponentName: "Explorer", direction: "sent", viewerAttempted: false, viewerStarted: false, attemptCount: 0, expiresAt: "2026-10-10T12:00:00Z", createdAt: "2026-10-01T12:00:00Z", winnerName: null, viewerOutcome: null,
};
const now = new Date("2026-10-02T12:00:00Z").getTime();

afterEach(() => vi.unstubAllGlobals());

describe("challenge play gate", () => {
  it("only permits an active, fresh matching game with a shared seed", () => {
    expect(challengePlayBlock(record, "flags", now)).toBeNull();
    expect(challengePlayBlock(record, "capitals", now)).toBe("wrong_game");
    expect(challengePlayBlock({ ...record, status: "pending" }, "flags", now)).toBe("not_active");
    expect(challengePlayBlock({ ...record, seed: null }, "flags", now)).toBe("missing_seed");
  });
  it("blocks completed or already-started attempts instead of offering replay", () => {
    expect(challengePlayBlock({ ...record, viewerAttempted: true }, "flags", now)).toBe("already_submitted");
    expect(challengePlayBlock({ ...record, viewerStarted: true }, "flags", now)).toBe("already_started");
  });
  it("blocks expired and malformed expiry dates", () => {
    expect(challengePlayBlock({ ...record, expiresAt: "2026-10-01T12:00:00Z" }, "flags", now)).toBe("expired");
    expect(challengePlayBlock({ ...record, expiresAt: "not-a-date" }, "flags", now)).toBe("expired");
  });
});

describe("recoverable submission", () => {
  function memoryStorage() {
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    return values;
  }
  it("stores the exact result and server-issued token together, scoped to the account", () => {
    memoryStorage();
    const key = attemptStorageKey("user-a", record.id);
    const saved = { attemptToken: "issued-token", localSaved: true, countryHits: ["DEU"], run: { gameId: "flags" as const, difficulty: "medium" as const, mode: "choice", score: 1200, correct: 4, total: 10, bestStreak: 2, durationMs: 40_000, createdAt: now } };
    writeSavedAttempt(key, saved);
    expect(readSavedAttempt(key)).toEqual(saved);
    expect(readSavedAttempt(attemptStorageKey("user-b", record.id))).toBeNull();
  });
  it("tolerates disabled storage and rejects corrupted saved data", () => {
    const values = memoryStorage();
    values.set("broken", "{");
    values.set("missing-token", JSON.stringify({ localSaved: true }));
    expect(readSavedAttempt("broken")).toBeNull();
    expect(readSavedAttempt("missing-token")).toBeNull();
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    expect(() => writeSavedAttempt("key", { attemptToken: "token", localSaved: false })).not.toThrow();
    expect(readSavedAttempt("key")).toBeNull();
  });
  it("translates service and sign-in errors without displaying raw error codes", () => {
    expect(challengeError("unauthorized", "en")).toContain("Sign in");
    expect(challengeError("not_configured", "de")).toContain("normalen Spiele");
    expect(challengeError("future_internal_error", "en")).not.toContain("future_internal_error");
  });
});
