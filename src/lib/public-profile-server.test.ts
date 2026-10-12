import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ configured: true, fail: false, rows: [] as Record<string, unknown>[][],
  calls: [] as { text: string; values: unknown[] }[], isolation: "" }));
async function query(parts: TemplateStringsArray, ...values: unknown[]) {
  state.calls.push({ text: parts.join("?"), values });
  return state.rows.shift() ?? [];
}
const sql = Object.assign(query, { begin: async (isolation: string, work: (tx: typeof query) => Promise<unknown>) => {
  state.isolation = isolation;
  return work(query);
} });
vi.mock("@/lib/db", () => ({ get isDbConfigured() { return state.configured; },
  getDb: async () => { if (state.fail) throw new Error("secret DB credentials"); return sql; } }));
import { GET } from "../app/api/users/[name]/route";

const request = (name = "Alice") => new Request(`https://www.geo-nerds.com/api/users/${name}`);
beforeEach(() => { state.configured = true; state.fail = false; state.rows = []; state.calls = []; state.isolation = ""; });

describe("public profile API", () => {
  it("does not contact the database for an offline preview or malformed name", async () => {
    state.configured = false;
    expect(await (await GET(request())).json()).toEqual({ configured: false, found: false });
    state.configured = true;
    for (const name of ["%ZZ", "x", "a%2Fb", "A".repeat(21)]) {
      expect(await (await GET(request(name))).json()).toEqual({ configured: true, found: false });
    }
    expect(state.calls).toHaveLength(0);
  });

  it("uses the viewed account ID, not stale score display names or the visitor's session", async () => {
    state.rows = [[{ id: "actual-target-id", name: "Alice" }],
      [{ total: 1000, runs: 1, max_score: 1000, streak: 10, perfect: 1, days: 1 }],
      [{ game_id: "flags", best: 1000, runs: 1, correct: 10, max_total: 10, streak: 10, perfect: 1 }],
      [{ badge_id: "contributor", feedback_id: "private-idea", read_at: "private-read-state" }]];
    const response = await GET(request("ALICE"));
    const body = await response.json();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.profile.name).toBe("Alice");
    expect(body.profile.badgeIds).toEqual(expect.arrayContaining(["contributor", "first", "score1k", "perfect"]));
    expect(state.calls[0].values).toEqual(["alice"]);
    expect(state.calls.slice(1).every((call) => call.values.includes("actual-target-id"))).toBe(true);
    expect(state.calls[1].text).not.toContain("LIMIT");
    expect(state.isolation).toBe("isolation level repeatable read read only");
    expect(JSON.stringify(body)).not.toMatch(/actual-target-id|private-idea|private-read-state/);
  });

  it("finds an award-only account even with zero games, but not an unknown account", async () => {
    state.rows = [[{ id: "author", name: "Shahin" }], [{ total: 0, runs: 0 }], [], [{ badge_id: "contributor" }]];
    const body = await (await GET(request("Shahin"))).json();
    expect(body.found).toBe(true);
    expect(body.profile.badgeIds).toEqual(["contributor"]);
    expect(body.profile.totalRuns).toBe(0);
    expect(await (await GET(request("Unknown"))).json()).toEqual({ configured: true, found: false });
  });

  it("reports a temporary outage without leaking private service errors", async () => {
    state.fail = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await GET(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ configured: true, found: false, error: "service_unavailable" });
      expect(spy.mock.calls.flat().join(" ")).not.toContain("secret DB credentials");
    } finally { spy.mockRestore(); }
  });
});
