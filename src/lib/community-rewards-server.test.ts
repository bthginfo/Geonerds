import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ configured: true, session: null as { uid: string } | null,
  rows: [] as Record<string, unknown>[][], calls: [] as { text: string; values: unknown[] }[], fail: false, rateOk: true }));
async function query(parts: TemplateStringsArray, ...values: unknown[]) {
  state.calls.push({ text: parts.join("?"), values });
  return state.rows.shift() ?? [];
}
vi.mock("./auth", () => ({ getSession: async () => state.session }));
vi.mock("./db", () => ({ get isDbConfigured() { return state.configured; },
  getDb: async () => { if (state.fail) throw new Error("private database details"); return query; } }));
vi.mock("./ratelimit", () => ({ rateLimit: async () => ({ ok: state.rateOk, retryAfter: 60 }) }));
import { listCommunityRewards, readCommunityNotification } from "./community-rewards-server";

const id = "a".repeat(32);
const context = (value = id) => ({ params: Promise.resolve({ id: value }) });
const request = (origin = "https://www.geo-nerds.com") => new Request(`https://www.geo-nerds.com/api/account/notifications/${id}`, {
  method: "POST", headers: { Origin: origin }, body: "{}",
});
beforeEach(() => { state.configured = true; state.session = null; state.rows = []; state.calls = []; state.fail = false; state.rateOk = true; });

describe("account-owned community recognition", () => {
  it("never contacts a database for an offline preview or anonymous account", async () => {
    expect((await listCommunityRewards()).status).toBe(401);
    state.configured = false;
    expect(await (await listCommunityRewards()).json()).toEqual({ configured: false, awards: [], notifications: [] });
    expect(state.calls).toHaveLength(0);
  });
  it("returns only the signed-in account's award and unread notifications without private identifiers", async () => {
    state.session = { uid: "creator-account" };
    state.rows = [[{ badge_id: "game-creator", game_id: "adastra", awarded_at: "2026-10-06T10:00:00Z" }],
      [{ id, kind: "game-published", game_id: "adastra", created_at: "2026-10-06T10:00:00Z", read_at: null }]];
    const response = await listCommunityRewards();
    const result = await response.json();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(result.awards).toEqual([{ badgeId: "game-creator", gameId: "adastra", awardedAt: "2026-10-06T10:00:00.000Z" }]);
    expect(result.notifications[0]).toMatchObject({ id, kind: "game-published", gameId: "adastra", readAt: null });
    expect(state.calls.every((call) => call.values.includes("creator-account"))).toBe(true);
    expect(state.calls[1].text).toContain("read_at IS NULL");
    expect(JSON.stringify(result)).not.toContain("creator-account");
  });
  it("blocks cross-origin notification changes before database access", async () => {
    state.session = { uid: "owner" };
    expect((await readCommunityNotification(request("https://evil.example"), context())).status).toBe(403);
    expect(state.calls).toHaveLength(0);
  });
  it("requires a signed-in recipient and a bounded notification ID", async () => {
    expect((await readCommunityNotification(request(), context())).status).toBe(401);
    state.session = { uid: "owner" };
    expect((await readCommunityNotification(request(), context("bad-id"))).status).toBe(404);
    expect(state.calls).toHaveLength(0);
  });
  it("dismisses idempotently only for its owner and does not reveal another user's notification", async () => {
    state.session = { uid: "owner" }; state.rows = [[{ id }]];
    expect(await (await readCommunityNotification(request(), context())).json()).toEqual({ ok: true });
    expect(state.calls[0]).toMatchObject({ values: [id, "owner"] });
    expect(state.calls[0].text).toContain("COALESCE(read_at,now())");
    expect((await readCommunityNotification(request(), context())).status).toBe(404);
  });
  it("reports transient and rate-limit failures without leaking service credentials", async () => {
    state.session = { uid: "owner" }; state.rateOk = false;
    const blocked = await readCommunityNotification(request(), context());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("60");
    state.fail = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await listCommunityRewards();
      expect(result.status).toBe(503);
      expect(JSON.stringify(await result.json())).not.toContain("private database");
      expect(spy.mock.calls.flat().join(" ")).not.toContain("private database");
    } finally { spy.mockRestore(); }
  });
});
