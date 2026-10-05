import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGeoChallengeUsers } from "./challenge-online";

afterEach(() => { vi.unstubAllGlobals(); });

describe("challenge directory client", () => {
  it("supports browsing and safely encodes search/cursor with cancellable no-store requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ configured: true, users: [{ name: "AtlasFan", id: "not-needed" }], nextCursor: "AtlasFan" }));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    expect(await apiGeoChallengeUsers({ query: "Böb &", cursor: "Anna _.", signal })).toEqual({ configured: true, users: [{ name: "AtlasFan" }], nextCursor: "AtlasFan" });
    const [path, options] = fetcher.mock.calls[0];
    const url = new URL(path, "https://www.geo-nerds.com");
    expect(url.pathname).toBe("/api/challenges/users");
    expect(url.searchParams.get("q")).toBe("Böb &");
    expect(url.searchParams.get("after")).toBe("Anna _.");
    expect(options).toMatchObject({ method: "GET", cache: "no-store", credentials: "same-origin", signal });
    await apiGeoChallengeUsers();
    expect(fetcher.mock.calls[1][0]).toBe("/api/challenges/users");
  });

  it("keeps offline and retryable service failures distinct", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ configured: false, users: [], nextCursor: null }))
      .mockResolvedValueOnce(Response.json({ ok: false, error: "rate_limited", retryAfter: 30 }, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await apiGeoChallengeUsers()).toEqual({ configured: false, users: [], nextCursor: null });
    expect(await apiGeoChallengeUsers()).toEqual({ configured: true, users: [], nextCursor: null, error: "rate_limited", retryAfter: 30 });
  });

  it("normalizes network failures without throwing away the manual-entry fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await apiGeoChallengeUsers()).toEqual({ configured: true, users: [], nextCursor: null, error: "network_error" });
  });
});
