import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  configured: true, session: { uid: "alice", name: "Alice" } as { uid: string; name: string } | null,
  responses: [] as Record<string, unknown>[][], calls: [] as { text: string; values: unknown[] }[],
  rateOk: true, failDb: false,
}));
async function fakeSql(parts: TemplateStringsArray, ...values: unknown[]) {
  state.calls.push({ text: parts.join("?"), values });
  if (parts.join("?").includes("INSERT INTO gn_challenge_notifications")) return [];
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
import { ADASTRA_CATALOG_SEED_PREFIX } from "./adastra-catalog-version";
import { GEO_CONTENT_SEED_PREFIX } from "./geo-content-version";

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
    for (const viewer of ["alice", "bob"]) {
      expect(serializeGeoChallenge({ ...base, rounds: 0, status: "active" }, viewer).rounds).toBe(0);
    }
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
  it("creates a ready bot game without fake accounts, invitations, or a shareable seat", async () => {
    state.responses = [[{ id: "alice", name: "Alice" }], [{ count: 0 }], []];
    const response = await createGeoChallenge(request({ ...run, rounds: 10, timed: false, variant: "world", invitationType: "bot", botDifficulty: "easy" }));
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.opponentName).toBe("GeoBot");
    expect(data.sharePath).toBeUndefined();
    const insert = state.calls.find((call) => call.text.includes("INSERT INTO gn_challenges"))!;
    expect(insert.text).toContain("bot_difficulty,bot_seed,status,accepted_at");
    expect(insert.values).toContain("active");
    expect(insert.values).toContain("easy");
    expect(insert.values.some((value) => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value))).toBe(true);
    expect(state.calls.some((call) => call.text.includes("WHERE name_lower="))).toBe(false);
    expect(state.calls.some((call) => call.text.includes("INSERT INTO gn_users"))).toBe(false);
    expect(state.calls.some((call) => call.text.includes("INSERT INTO gn_challenge_notifications"))).toBe(false);
  });
  it("serializes an explicit Bot marker and never exposes its committed performance seed", () => {
    const view = serializeGeoChallenge({ ...base, opponent_id: null, opponent_name: null, invitation_type: "bot", bot_difficulty: "hard", bot_seed: "private-bot-seed", status: "active" }, "alice");
    expect(view.opponentIsBot).toBe(true);
    expect(view.opponentName).toBe("GeoBot");
    expect(view.botDifficulty).toBe("hard");
    expect(view.canAccept).toBe(false);
    expect(JSON.stringify(view)).not.toContain("private-bot-seed");
    expect(view.sharePath).toBeUndefined();
  });
  it.each([0, 1500])("resolves a bot game immediately and keeps bot wins separate from human winner IDs (player score %s)", async (score) => {
    const botRow = { ...base, opponent_id: null, opponent_name: null, invitation_type: "bot", bot_difficulty: "medium", bot_seed: "private-bot-seed", status: "active" };
    const human = { ...mine, score, correct: score ? 10 : 0, best_streak: score ? 10 : 0 };
    state.responses = [
      [botRow], [], [{ token: "token", started_at: new Date(Date.now() - 35_000).toISOString() }], [],
      [human], [], [], [{ ...botRow, status: "resolved", winner_side: score ? "challenger" : "opponent", attempt_count: 2, viewer_attempted: true }], [human],
      [{ score: 700, correct: 7, total: 10, best_streak: 3, duration_ms: 60000 }],
    ];
    const response = await submitGeoChallenge(request({ ...run, score, correct: human.correct, bestStreak: human.best_streak }), ctx);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.resolved).toBe(true);
    expect(data.challenge.attempts).toHaveLength(2);
    expect(data.challenge.attempts[1].bot).toBe(true);
    expect(data.challenge.viewerOutcome).toBe(score ? "win" : "loss");
    const resolution = state.calls.find((call) => call.text.includes("SET status='resolved'"))!;
    expect(resolution.values[0]).toBe(score ? "alice" : null);
    expect(resolution.values[1]).toBe(score ? "challenger" : "opponent");
    expect(state.calls.filter((call) => call.text.includes("INSERT INTO gn_challenge_bot_attempts"))).toHaveLength(1);
    expect(state.calls.filter((call) => call.text.includes("INSERT INTO gn_challenge_notifications"))).toHaveLength(1);
  });
  it.each([
    ["adastra", "", ADASTRA_CATALOG_SEED_PREFIX, 10],
    ["flags", "world", GEO_CONTENT_SEED_PREFIX, 10],
    ["flags", "world", GEO_CONTENT_SEED_PREFIX, 0],
  ])("versions new %s seeds with %s scope without changing other games", async (gameId, variant, prefix, rounds) => {
    state.responses = [[{ id: "alice", name: "Alice" }], [{ id: "bob", name: "Bob" }], [{ count: 0 }], [], []];
    const response = await createGeoChallenge(request({
      gameId, difficulty: "medium", mode: "choice", rounds, timed: false, variant, opponentName: "Bob",
    }));
    expect(response.status).toBe(201);
    const insert = state.calls.find((call) => call.text.includes("INSERT INTO gn_challenges"))!;
    const seed = insert.values.find((value) => typeof value === "string" && value.startsWith(prefix));
    expect(seed).toEqual(expect.stringMatching(new RegExp(`^${prefix}[A-Za-z0-9_-]{32}$`)));
    expect(insert.values[7]).toBe(rounds);
  });
  it("cannot challenge yourself", async () => {
    state.responses = [[{ id: "alice", name: "Alice" }], [{ id: "alice", name: "Alice" }]];
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
  it("saves and resolves a full-pool duel with more than fifty actual rounds", async () => {
    const fullRun = { ...run, total: 196, correct: 150, bestStreak: 20, score: 19_000, durationMs: 600_000 };
    const fullMine = { ...mine, total: 196, correct: 150, best_streak: 20, score: 19_000, duration_ms: 600_000 };
    const fullOther = { ...other, total: 196, correct: 149, best_streak: 18, score: 18_000, duration_ms: 590_000 };
    const fullRow = { ...base, rounds: 0 };
    state.responses = [
      [{ ...fullRow, status: "active" }], [], [{ token: "token", started_at: new Date(Date.now() - 605_000).toISOString() }], [],
      [fullMine, fullOther], [], [{ ...fullRow, status: "resolved", winner_id: "alice", attempt_count: 2, viewer_attempted: true }], [fullMine, fullOther],
    ];
    const response = await submitGeoChallenge(request(fullRun), ctx);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.challenge.rounds).toBe(0);
    expect(data.challenge.viewerOutcome).toBe("win");
    expect(data.challenge.attempts.map((attempt: { total: number }) => attempt.total)).toEqual([196, 196]);
    expect(state.calls.find((call) => call.text.includes("INSERT INTO gn_challenge_attempts"))?.values).toContain(196);
  });
});
