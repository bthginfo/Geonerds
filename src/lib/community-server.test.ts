import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  configured: true, session: null as { uid: string; name: string } | null,
  responses: [] as Record<string, unknown>[][], calls: [] as { text: string; values: unknown[] }[],
  rateOk: true, rateCalls: [] as unknown[][], failDb: false,
}));
async function fakeSql(parts: TemplateStringsArray, ...values: unknown[]) {
  state.calls.push({ text: parts.join("?"), values });
  return state.responses.shift() ?? [];
}
const sql = Object.assign(fakeSql, {
  begin: async <T>(_options: string, work: (query: typeof fakeSql) => Promise<T>): Promise<T> => work(fakeSql),
});
vi.mock("@/lib/db", () => ({
  get isDbConfigured() { return state.configured; },
  getDb: async () => { if (state.failDb) throw new Error("private connection details"); return sql; },
}));
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
vi.mock("@/lib/ratelimit", () => ({
  clientIp: () => "192.0.2.42",
  rateLimit: async (...args: unknown[]) => { state.rateCalls.push(args); return { ok: state.rateOk, retryAfter: 1800 }; },
}));

import { listCommunityFeedback, listDuelStandings, submitCommunityFeedback, updateCommunityFeedback } from "./community-server";

const id = "d462c382-7375-4ec3-af44-612ec184b949";
const message = "I'd love a harder island flag game!";
const req = (body: unknown, method = "POST", origin = "https://www.geo-nerds.com") => new Request("https://www.geo-nerds.com/api/feedback", {
  method, headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
});
const listReq = (query = "") => new Request(`https://www.geo-nerds.com/api/admin/feedback${query}`);
const duelReq = (query = "") => new Request(`https://www.geo-nerds.com/api/leaderboard/duels${query}`);
const ctx = { params: Promise.resolve({ id }) };
const record = { id, author_name: "Alice", message, status: "new", created_at: "2026-10-05T10:00:00Z", reviewed_at: null };

beforeEach(() => {
  state.configured = true; state.session = null; state.responses = []; state.calls = [];
  state.rateOk = true; state.rateCalls = []; state.failDb = false;
});

describe("idea submission", () => {
  it("saves guest feedback anonymously and ignores a claimed admin identity", async () => {
    state.responses = [[], [{ id }]];
    const response = await submitCommunityFeedback(req({ id, message, userId: "admin", name: "TheCreator" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, id });
    const insert = state.calls.find((call) => call.text.includes("INSERT INTO gn_feedback"))!;
    expect(insert.values).toEqual([id, null, null, message]);
    expect(state.rateCalls[0]).toEqual([expect.stringMatching(/^geo:feedback:ip:[0-9a-f]{64}$/), 5, 3600]);
    expect(JSON.stringify(state.calls)).not.toContain("192.0.2.42");
  });
  it("attributes signed-in feedback to the real DB name, not a client or stale token name", async () => {
    state.session = { uid: "alice", name: "TheCreator" };
    state.responses = [[{ id: "alice", name: "Alice" }], [], [{ id }]];
    expect((await submitCommunityFeedback(req({ id, message, authorName: "TheCreator" }))).status).toBe(201);
    expect(state.calls[2].values).toEqual([id, "alice", "Alice", message]);
    expect(state.rateCalls[1]).toEqual(["geo:feedback:user:alice", 5, 3600]);
  });
  it("does not save feedback under a deleted account", async () => {
    state.session = { uid: "deleted", name: "Alice" }; state.responses = [[]];
    expect((await submitCommunityFeedback(req({ id, message }))).status).toBe(401);
    expect(state.calls).toHaveLength(1);
  });
  it("rejects bad JSON, shapes, IDs, text and actual oversized chunked bodies", async () => {
    const badJson = new Request("https://www.geo-nerds.com/api/feedback", { method: "POST", body: "{" });
    expect((await submitCommunityFeedback(badJson)).status).toBe(400);
    for (const body of [null, [], { id: "bad", message }, { id, message: "hi" }, { id, message: "a".repeat(4001) }, { id, message: `${message}\u0000` }]) {
      expect((await submitCommunityFeedback(req(body))).status).toBe(400);
    }
    expect((await submitCommunityFeedback(req({ id, message, extra: "a".repeat(40_000) }))).status).toBe(400);
    expect(state.calls).toHaveLength(0);
  });
  it("blocks cross-origin writes before any database query", async () => {
    expect((await submitCommunityFeedback(req({ id, message }, "POST", "https://evil.example"))).status).toBe(403);
    expect(state.calls).toHaveLength(0);
  });
  it("provides an explicit offline state without claiming to save the idea", async () => {
    state.configured = false;
    const response = await submitCommunityFeedback(req({ id, message }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("not_configured");
  });
  it("is idempotent on retries, even after the rate limit was reached", async () => {
    state.rateOk = false; state.responses = [[{ user_id: null, message }]];
    expect((await submitCommunityFeedback(req({ id, message }))).status).toBe(200);
    expect(state.rateCalls).toHaveLength(0);
    expect(state.calls).toHaveLength(1);
  });
  it("rejects an ID reused with another message or identity without revealing the old idea", async () => {
    state.responses = [[{ user_id: "alice", message: "a private submission" }]];
    const response = await submitCommunityFeedback(req({ id, message }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "submission_conflict" });
  });
  it("handles concurrent identical retries as one persisted submission", async () => {
    state.responses = [[], [], [{ user_id: null, message }]];
    expect((await submitCommunityFeedback(req({ id, message }))).status).toBe(200);
    expect(state.calls[1].text).toContain("ON CONFLICT (id) DO NOTHING");
  });
  it("rate limits spam with a useful retry time and no saved submission", async () => {
    state.rateOk = false; state.responses = [[]];
    const response = await submitCommunityFeedback(req({ id, message }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1800");
    expect((await response.json()).retryAfter).toBe(1800);
    expect(state.calls).toHaveLength(1);
  });
});

describe("private feedback administration", () => {
  it("requires an authenticated account for list and status updates", async () => {
    expect((await listCommunityFeedback(listReq())).status).toBe(401);
    expect((await updateCommunityFeedback(req({ status: "reviewed" }, "PATCH"), ctx)).status).toBe(401);
    expect(state.calls).toHaveLength(0);
  });
  it("refuses an ordinary account even when its signed token claims TheCreator", async () => {
    state.session = { uid: "alice", name: "TheCreator" }; state.responses = [[]];
    expect((await listCommunityFeedback(listReq())).status).toBe(403);
    expect(state.calls[0].text).toContain("id=? AND name_lower='thecreator'");
    expect(state.calls[0].values).toEqual(["alice"]);
    expect(state.calls).toHaveLength(1);
  });
  it("lists all submissions only for the current TheCreator account, with private cache headers", async () => {
    state.session = { uid: "creator", name: "TheCreator" };
    state.responses = [[{ id: "creator" }], [{ total: 2, all_count: 5, new_count: 2 }], [record]];
    const response = await listCommunityFeedback(listReq("?status=new&limit=1"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(await response.json()).toEqual({ configured: true, submissions: [{
      id, authorName: "Alice", message, status: "new", createdAt: "2026-10-05T10:00:00.000Z", reviewedAt: null,
    }], total: 2, allCount: 5, newCount: 2, hasMore: true });
    expect(state.calls[2].text).not.toContain("user_id");
  });
  it("rejects invalid list filters and pagination", async () => {
    state.session = { uid: "creator", name: "TheCreator" };
    for (const query of ["?status=deleted", "?limit=0", "?limit=101", "?offset=-1", "?offset=1.5"]) {
      state.responses = [[{ id: "creator" }]];
      expect((await listCommunityFeedback(listReq(query))).status).toBe(400);
    }
  });
  it("permits non-destructive new/reviewed updates and rejects arbitrary statuses", async () => {
    state.session = { uid: "creator", name: "TheCreator" };
    state.responses = [[{ id: "creator" }], [{ id }]];
    expect((await updateCommunityFeedback(req({ status: "reviewed" }, "PATCH"), ctx)).status).toBe(200);
    expect(state.calls[1].text).toContain("COALESCE(reviewed_at,now())");
    expect(state.calls[1].values).toEqual(["reviewed", "reviewed", id]);
    state.responses = [[{ id: "creator" }]];
    expect((await updateCommunityFeedback(req({ status: "deleted" }, "PATCH"), ctx)).status).toBe(400);
  });
  it("returns not_found for missing submissions and blocks CSRF on review mutations", async () => {
    state.session = { uid: "creator", name: "TheCreator" };
    state.responses = [[{ id: "creator" }], []];
    expect((await updateCommunityFeedback(req({ status: "new" }, "PATCH"), ctx)).status).toBe(404);
    const count = state.calls.length;
    expect((await updateCommunityFeedback(req({ status: "reviewed" }, "PATCH", "https://evil.example"), ctx)).status).toBe(403);
    expect(state.calls).toHaveLength(count);
  });
});

describe("public duel standings", () => {
  it("distinguishes an unconfigured service from an empty configured leaderboard", async () => {
    state.configured = false;
    expect(await (await listDuelStandings(duelReq())).json()).toEqual({ configured: false, standings: [], hasMore: false });
    state.configured = true;
    expect(await (await listDuelStandings(duelReq())).json()).toEqual({ configured: true, standings: [], hasMore: false });
  });
  it("validates game, period and pagination before executing SQL", async () => {
    for (const query of ["?game=wine", "?game=map-click", "?period=week", "?limit=-1", "?offset=NaN", "?offset=100001"]) {
      expect((await listDuelStandings(duelReq(query))).status).toBe(400);
    }
    expect(state.calls).toHaveLength(0);
  });
  it("counts only resolved head-to-head matches with both participants' results", async () => {
    await listDuelStandings(duelReq("?period=month&game=flags"));
    const query = state.calls[0];
    expect(query.text).toContain("c.status='resolved' AND c.resolved_at IS NOT NULL");
    expect(query.text).toContain("a.user_id=c.challenger_id");
    expect(query.text).toContain("b.user_id=c.opponent_id");
    expect(query.text).toContain("c.resolved_at>=date_trunc('month',now())");
    expect(query.text).toContain("UNION ALL");
    expect(query.text).toContain("COUNT(DISTINCT o.rival_id)");
    expect(query.text).toContain("DENSE_RANK() OVER (ORDER BY points DESC,win_fraction DESC,wins DESC)");
    expect(query.values).toEqual(["flags", "flags", "month", 3, 1, 101, 0]);
  });
  it("returns public aggregates and stable tied ranks, not invitations, seeds, user IDs or attempts", async () => {
    state.responses = [[
      { rank: 1, name: "Alice", points: 7, wins: 2, draws: 1, losses: 1, played: 4, win_rate: "50.0", opponents: 3, seed: "private", id: "alice" },
      { rank: 1, name: "Bob", points: 7, wins: 2, draws: 1, losses: 1, played: 4, win_rate: "50.0", opponents: 2 },
      { rank: 2, name: "Charlie", points: 0, wins: 0, draws: 0, losses: 2, played: 2, win_rate: "0", opponents: 2 },
    ]];
    const data = await (await listDuelStandings(duelReq("?limit=2&offset=0"))).json();
    expect(data.standings).toHaveLength(2);
    expect(data.hasMore).toBe(true);
    expect(data.standings[0]).toEqual({ rank: 1, name: "Alice", points: 7, wins: 2, draws: 1, losses: 1, played: 4, winRate: 50, opponents: 3 });
    expect(data.standings[1].rank).toBe(1);
    expect(JSON.stringify(data)).not.toContain("private");
    expect(data.standings[0]).not.toHaveProperty("id");
  });
});

it("contains database failures instead of exposing sensitive errors", async () => {
  state.failDb = true;
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const response = await submitCommunityFeedback(req({ id, message }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ ok: false, error: "service_unavailable" });
  expect(log).toHaveBeenCalledWith("Geo community service error", "Error");
  log.mockRestore();
});
