import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { adminGate } from "@/lib/community-server";
import { sameGeoOrigin } from "@/lib/geo-challenge-server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { parsePlayEvent, rankPopular, type PopularGame } from "@/lib/play-stats";

const NO_STORE = { "Cache-Control": "no-store" };

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

/** POST /api/plays — increments today's aggregate counter for one game. */
export async function recordPlayEvent(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ ok: false, configured: false }, { headers: NO_STORE });
  if (!sameGeoOrigin(req)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  if (Number(req.headers.get("content-length") ?? 0) > 512) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: NO_STORE });
  let parsed: ReturnType<typeof parsePlayEvent> = null;
  try { parsed = parsePlayEvent(JSON.parse(await req.text())); } catch { parsed = null; }
  if (!parsed) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: NO_STORE });
  try {
    // The address is only hashed into a short-lived rate-limit bucket, never stored with the counters.
    const limit = await rateLimit(`geo:plays:${hash(clientIp(req))}`, 120, 3600);
    if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter) } });
    const sql = await getDb();
    const starts = parsed.event === "start" ? 1 : 0;
    const finishes = parsed.event === "finish" ? 1 : 0;
    await sql`
      INSERT INTO gn_play_stats (day, game_id, starts, finishes)
      VALUES ((now() AT TIME ZONE 'utc')::date, ${parsed.gameId}, ${starts}, ${finishes})
      ON CONFLICT (day, game_id) DO UPDATE SET
        starts = gn_play_stats.starts + EXCLUDED.starts,
        finishes = gn_play_stats.finishes + EXCLUDED.finishes
    `;
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error("Play stats error", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

async function windowTotals(days: number): Promise<PopularGame[]> {
  const sql = await getDb();
  const rows = await sql<{ game_id: string; starts: number; finishes: number }[]>`
    SELECT game_id, SUM(starts)::int AS starts, SUM(finishes)::int AS finishes
    FROM gn_play_stats
    WHERE day >= (now() AT TIME ZONE 'utc')::date - ${days}::int
    GROUP BY game_id
  `;
  return rows.map((row) => ({ gameId: row.game_id, starts: Number(row.starts), finishes: Number(row.finishes) }));
}

/** GET /api/plays — public, aggregated "popular this week" list; CDN-cacheable. */
export async function popularGames() {
  if (!isDbConfigured) return NextResponse.json({ configured: false, games: [] }, { headers: NO_STORE });
  try {
    const games = rankPopular(await windowTotals(7), 8);
    return NextResponse.json({ configured: true, games }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Play stats error", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ configured: true, games: [] }, { status: 503, headers: NO_STORE });
  }
}

/** GET /api/admin/plays?days=30 — complete per-game totals for the administrator. */
export async function adminPlayStats(req: Request) {
  const gate = await adminGate();
  if (gate.response) return gate.response;
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  if (!Number.isSafeInteger(days) || days < 1 || days > 365) return NextResponse.json({ ok: false, error: "invalid_filter" }, { status: 400, headers: NO_STORE });
  try {
    const totals = await windowTotals(days);
    const accountRuns = await gate.sql<{ game_id: string; runs: number; players: number }[]>`
      SELECT game_id, COUNT(*)::int AS runs, COUNT(DISTINCT user_id)::int AS players
      FROM gn_scores WHERE created_at >= now() - ${days}::int * interval '1 day'
      GROUP BY game_id
    `;
    return NextResponse.json({
      ok: true,
      days,
      anonymous: totals.sort((a, b) => b.finishes - a.finishes || b.starts - a.starts),
      accounts: accountRuns.map((row) => ({ gameId: row.game_id, runs: Number(row.runs), players: Number(row.players) })),
    }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch (error) {
    console.error("Play stats error", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
