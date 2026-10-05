import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  configured: true,
  session: { uid: "alice", name: "Alice" } as { uid: string; name: string } | null,
  rows: [] as Record<string, unknown>[],
  calls: [] as { text: string; values: unknown[] }[],
  rateCalls: [] as unknown[][],
  rateOk: true,
  failDb: false,
}));

vi.mock("@/lib/db", () => ({
  get isDbConfigured() { return state.configured; },
  getDb: async () => {
    if (state.failDb) throw new Error("private connection details");
    return async (parts: TemplateStringsArray, ...values: unknown[]) => {
      state.calls.push({ text: parts.join("?"), values });
      return state.rows;
    };
  },
}));
vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: async (...args: unknown[]) => {
  state.rateCalls.push(args);
  return { ok: state.rateOk, retryAfter: 30 };
} }));

import { listGeoChallengeUsers } from "./challenge-users-server";

const request = (query = "") => new Request(`https://www.geo-nerds.com/api/challenges/users${query}`);

beforeEach(() => {
  state.configured = true;
  state.session = { uid: "alice", name: "Alice" };
  state.rows = [];
  state.calls = [];
  state.rateCalls = [];
  state.rateOk = true;
  state.failDb = false;
});

describe("challenge player directory", () => {
  it("reports offline without querying the database", async () => {
    state.configured = false;
    expect(await (await listGeoChallengeUsers(request())).json()).toEqual({ configured: false, users: [], nextCursor: null });
    expect(state.calls).toHaveLength(0);
    expect(state.rateCalls).toHaveLength(0);
  });

  it("requires a signed-in session and prevents shared caching", async () => {
    state.session = null;
    const response = await listGeoChallengeUsers(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(state.calls).toHaveLength(0);
    expect(state.rateCalls).toHaveLength(0);
  });

  it("browses all registered accounts without score requirements, excludes self and only serializes names", async () => {
    state.rows = [{ name: "AtlasFan", id: "private-id", passcode_hash: "secret", created_at: "private-date" }];
    const response = await listGeoChallengeUsers(request());
    expect(await response.json()).toEqual({ configured: true, users: [{ name: "AtlasFan" }], nextCursor: null });
    expect(state.calls[0].text).toContain("SELECT name FROM gn_users");
    expect(state.calls[0].text).toContain("id <> ?");
    expect(state.calls[0].text).not.toContain("gn_scores");
    expect(state.calls[0].text).toContain("ORDER BY name_lower ASC");
    expect(state.calls[0].values).toEqual(["alice", "", "", "", "", 21]);
    expect(state.rateCalls).toEqual([["geo:challenge-users:alice", 120, 60]]);
  });

  it("uses trimmed case-insensitive literal substring search, not SQL wildcard interpolation", async () => {
    await listGeoChallengeUsers(request("?q=%20ATLAS_%25%20"));
    expect(state.calls[0].text).toContain("strpos(name_lower, ?)");
    expect(state.calls[0].text).not.toContain("ATLAS");
    expect(state.calls[0].values).toContain("atlas_%");
  });

  it("returns twenty names and a usable cursor when more registered users exist", async () => {
    state.rows = Array.from({ length: 21 }, (_, index) => ({ name: `Player${String(index).padStart(2, "0")}` }));
    const data = await (await listGeoChallengeUsers(request())).json();
    expect(data.users).toHaveLength(20);
    expect(data.nextCursor).toBe("Player19");
    await listGeoChallengeUsers(request(`?after=${encodeURIComponent(data.nextCursor)}`));
    expect(state.calls[1].text).toContain("name_lower > ?");
    expect(state.calls[1].values).toEqual(["alice", "", "", "player19", "player19", 21]);
  });

  it("preserves Unicode cursor names instead of validating expanded lowercased strings as usernames", async () => {
    const name = "İ".repeat(20);
    state.rows = [...Array.from({ length: 19 }, (_, index) => ({ name: `Player${index}` })), { name }, { name: "Zulu" }];
    const data = await (await listGeoChallengeUsers(request())).json();
    expect(data.nextCursor).toBe(name);
    expect((await listGeoChallengeUsers(request(`?after=${encodeURIComponent(data.nextCursor)}`))).status).toBe(200);
    expect(state.calls[1].values).toContain(name.toLowerCase());
  });

  it("ends pagination for an exact full page or an empty result", async () => {
    state.rows = Array.from({ length: 20 }, (_, index) => ({ name: `Player${index}` }));
    expect((await (await listGeoChallengeUsers(request())).json()).nextCursor).toBeNull();
    state.rows = [];
    expect(await (await listGeoChallengeUsers(request("?q=missing"))).json()).toEqual({ configured: true, users: [], nextCursor: null });
  });

  it("bounds search and rejects invalid cursors before database work", async () => {
    for (const query of ["?q=" + "x".repeat(21), "?q=abc%00def", "?after=%3Cscript%3E", "?after=x"]) {
      expect((await listGeoChallengeUsers(request(query))).status).toBe(400);
    }
    expect(state.calls).toHaveLength(0);
    expect(state.rateCalls).toHaveLength(0);
  });

  it("throttles excessive directory requests with Retry-After", async () => {
    state.rateOk = false;
    const response = await listGeoChallengeUsers(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.json()).toEqual({ ok: false, error: "rate_limited", retryAfter: 30 });
    expect(state.calls).toHaveLength(0);
  });

  it("reports a retryable service error without exposing database details", async () => {
    state.failDb = true;
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await listGeoChallengeUsers(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, error: "service_unavailable" });
      expect(JSON.stringify(logger.mock.calls)).not.toContain("private connection details");
    } finally { logger.mockRestore(); }
  });
});
