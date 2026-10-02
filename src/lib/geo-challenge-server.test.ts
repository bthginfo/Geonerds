import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  configured: true, session: { uid: "alice", name: "Alice" } as { uid: string; name: string } | null,
  responses: [] as Record<string, unknown>[][], calls: [] as { text: string; values: unknown[] }[],
  rateOk: true, failDb: false,
}));
async function fakeSql(parts: TemplateStringsArray, ...values: unknown[]) {
  state.calls.push({ text: parts.join("?"), values });
  return state.responses.shift() ?? [];
}
const sql = Object.assign(fakeSql, { begin: async <T>(work: (query: typeof fakeSql) => Promise<T>): Promise<T> => work(fakeSql) });
vi.mock("@/lib/db", () => ({
  get isDbConfigured() { return state.configured; },
  getDb: async () => { if (state.failDb) throw new Error("database unavailable"); return sql; },
}));
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session, newId: () => "new-challenge" }));
vi.mock("@/lib/ratelimit", () => ({ clientIp: () => "127.0.0.1", rateLimit: async () => ({ ok: state.rateOk, retryAfter: 30 }) }));

import { actGeoChallenge, createGeoChallenge, getGeoChallenge, listGeoChallenges, sameGeoOrigin, serializeGeoChallenge, startGeoChallenge, submitGeoChallenge } from "./geo-challenge-server";

const base = {
  id: "duel", challenger_id: "alice", opponent_id: "bob", challenger_name: "Alice", opponent_name: "Bob",
  game_id: "flags", difficulty: "medium", mode: "choice", rounds: 10, timed: false, variant: "world",
  seed: "shared-secret-seed", status: "pending", winner_id: null,
  created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString(),
  attempt_count: 0, viewer_attempted: false, viewer_started: false,
};
const ctx = { params: Promise.resolve({ id: "duel" }) };
const request = (body: unknown, method = "POST", origin = "https://geo-nerds.com") => new Request("https://geo-nerds.com/api/challenges/duel", {
  method, headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
});
const run = { gameId: "flags", difficulty: "medium", mode: "choice", score: 900, correct: 6, total: 10, bestStreak: 4, durationMs: 30_000, attemptToken: "token" };
const mine = { user_id: "alice", name: "Alice", score: 900, correct: 6, total: 10, best_streak: 4, duration_ms: 30_000 };
const other = { user_id: "bob", name: "Bob", score: 800, correct: 6, total: 10, best_streak: 3, duration_ms: 20_000 };

beforeEach(() => {
  state.configured = true; state.session = { uid: "alice", name: "Alice" };
  state.responses = []; state.calls = []; state.rateOk = true; state.failDb = false;
});

describe("Geo challenge API access", () => {
  it("returns an explicit offline state when the database is not configured", async () => {
    state.configured = false;
    expect(await (await listGeoChallenges()).json()).toEqual({ configured: false, challenges: [] });
    expect((await createGeoChallenge(request({}))).status).toBe(503);
    expect(state.calls).toHaveLength(0);
  });
  it("rejects unauthenticated reads and writes", async () => {
    state.session = null;
    expect((await listGeoChallenges()).status).toBe(401);
    expect((await startGeoChallenge(request({}), ctx)).status).toBe(401);
    expect(state.calls).toHaveLength(0);
  });
  it("rejects cross-origin mutations before querying the database", async () => {
    expect((await actGeoChallenge(request({ action: "accept" }, "PATCH", "https://attacker.example"), ctx)).status).toBe(403);
    expect(state.calls).toHaveLength(0);
    expect(sameGeoOrigin(request({}, "POST"))).toBe(true);
    expect(sameGeoOrigin(new Request("https://geo-nerds.com", { headers: { "Sec-Fetch-Site": "cross-site" } }))).toBe(false);
  });
  it("rate limits writes with a useful Retry-After header", async () => {
    state.rateOk = false;
    const response = await createGeoChallenge(request({}));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
  });
  it("does not reveal pending seeds or another player's results", () => {
    expect(serializeGeoChallenge(base, "alice").seed).toBeNull();
    const view = serializeGeoChallenge({ ...base, status: "active" }, "bob");
    expect(view.seed).toBe(base.seed);
    expect(view.direction).toBe("received");
    expect(view.opponentName).toBe("Alice");
  });
  it("returns not_found rather than exposing an invitation to a nonparticipant", async () => {
    state.responses = [[], []];
    expect((await getGeoChallenge(new Request("https://geo-nerds.com"), ctx)).status).toBe(404);
    const select = state.calls.find((call) => call.text.includes("FROM gn_challenges c"))!;
    expect(select.text).toContain("c.challenger_id=? OR c.opponent_id=?");
    expect(select.values).toContain("alice");
  });
});

describe("Geo challenge mutation guards", () => {
  it("cannot challenge yourself", async () => {
    state.responses = [[{ id: "alice", name: "Alice" }]];
    const response = await createGeoChallenge(request({ ...run, rounds: 10, timed: false, variant: "world", opponentName: "Alice" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("self_challenge");
  });
  it("cannot accept your own invitation", async () => {
    state.responses = [[base]];
    expect((await actGeoChallenge(request({ action: "accept" }, "PATCH"), ctx)).status).toBe(403);
    expect(state.calls).toHaveLength(1);
  });
  it("accepts the invitation only for the opponent", async () => {
    state.session = { uid: "bob", name: "Bob" };
    state.responses = [[base], []];
    expect((await actGeoChallenge(request({ action: "accept" }, "PATCH"), ctx)).status).toBe(200);
    expect(state.calls[0].text).toContain("FOR UPDATE");
    expect(state.calls[1].values).toContain("active");
  });
  it("cannot start before acceptance, after expiry or after a completed attempt", async () => {
    state.responses = [[base]];
    expect((await startGeoChallenge(request({}), ctx)).status).toBe(409);
    state.responses = [[{ ...base, status: "active", expires_at: "2020-01-01T00:00:00Z" }], []];
    expect((await startGeoChallenge(request({}), ctx)).status).toBe(409);
    state.responses = [[{ ...base, status: "active" }], [{ exists: true }]];
    expect((await startGeoChallenge(request({}), ctx)).status).toBe(409);
  });
  it("keeps the same token and start time when a start request is retried", async () => {
    for (let i = 0; i < 2; i++) {
      state.responses = [[{ ...base, status: "active" }], [], [{ token: "same-token" }]];
      expect(await (await startGeoChallenge(request({}), ctx)).json()).toEqual({ ok: true, attemptToken: "same-token" });
    }
    const insert = state.calls.find((call) => call.text.includes("INSERT INTO gn_challenge_starts"))!;
    expect(insert.text).toContain("SET token=gn_challenge_starts.token");
    expect(insert.text).not.toContain("started_at=");
  });
  it("rejects a submission without a matching issued attempt token", async () => {
    state.responses = [[{ ...base, status: "active" }], [], [{ token: "another-token", started_at: new Date(Date.now() - 35_000).toISOString() }]];
    expect((await submitGeoChallenge(request(run), ctx)).status).toBe(403);
    expect(state.calls.some((call) => call.text.includes("INSERT INTO gn_challenge_attempts"))).toBe(false);
  });
  it("does not overwrite a result if the client retries with a different score", async () => {
    state.responses = [[{ ...base, status: "resolved" }], [mine]];
    expect((await submitGeoChallenge(request({ ...run, score: 950 }), ctx)).status).toBe(409);
  });
  it("accepts an identical submission retry without granting a second attempt", async () => {
    state.responses = [[{ ...base, status: "resolved" }], [mine], [{ ...base, status: "resolved", winner_id: "alice", attempt_count: 2, viewer_attempted: true }], [mine, other]];
    const data = await (await submitGeoChallenge(request(run), ctx)).json();
    expect(data.ok).toBe(true);
    expect(data.resolved).toBe(true);
    expect(state.calls.some((call) => call.text.includes("INSERT INTO"))).toBe(false);
  });
  it("atomically resolves a second result using points before speed", async () => {
    state.responses = [
      [{ ...base, status: "active" }], [], [{ token: "token", started_at: new Date(Date.now() - 35_000).toISOString() }], [],
      [mine, other], [], [{ ...base, status: "resolved", winner_id: "alice", attempt_count: 2, viewer_attempted: true }], [mine, other],
    ];
    const response = await submitGeoChallenge(request(run), ctx);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.challenge.viewerOutcome).toBe("win");
    expect(data.challenge.attempts).toHaveLength(2);
    expect(state.calls[0].text).toContain("FOR UPDATE");
    const resolution = state.calls.find((call) => call.text.includes("status='resolved'"))!;
    expect(resolution.values).toContain("alice");
  });
});
