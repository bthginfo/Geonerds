import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { getDb, isDbConfigured } from "./db";
import { sameGeoOrigin } from "./geo-challenge-server";
import { rateLimit } from "./ratelimit";
import { GAME_CREATOR_BADGE_ID, type CommunityAward, type CommunityNotification } from "./community-rewards";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: HEADERS });

export async function listCommunityRewards() {
  try {
    if (!isDbConfigured) return reply({ configured: false, awards: [], notifications: [] });
    const session = await getSession();
    if (!session) return reply({ error: "unauthorized" }, 401);
    const sql = await getDb();
    const awards = await sql`SELECT badge_id,game_id,awarded_at FROM gn_badge_awards
      WHERE user_id=${session.uid} AND badge_id=${GAME_CREATOR_BADGE_ID} ORDER BY awarded_at DESC`;
    const notifications = await sql`SELECT id,kind,game_id,created_at,read_at FROM gn_community_notifications
      WHERE user_id=${session.uid} AND read_at IS NULL ORDER BY created_at DESC,id ASC LIMIT 20`;
    const data = {
      configured: true,
      awards: awards.map((row): CommunityAward => ({ badgeId: GAME_CREATOR_BADGE_ID, gameId: String(row.game_id),
        awardedAt: new Date(String(row.awarded_at)).toISOString() })),
      notifications: notifications.map((row): CommunityNotification => ({ id: String(row.id), kind: "game-published",
        gameId: String(row.game_id), createdAt: new Date(String(row.created_at)).toISOString(),
        readAt: row.read_at == null ? null : new Date(String(row.read_at)).toISOString() })),
    };
    return reply(data);
  } catch (error) {
    console.error("Community rewards service error", error instanceof Error ? error.name : "unknown");
    return reply({ error: "service_unavailable" }, 503);
  }
}

export async function readCommunityNotification(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameGeoOrigin(req)) return reply({ error: "invalid_origin" }, 403);
    if (!isDbConfigured) return reply({ error: "not_configured" }, 503);
    const session = await getSession();
    if (!session) return reply({ error: "unauthorized" }, 401);
    const { id } = await params;
    if (!/^[a-f0-9]{32}$/i.test(id)) return reply({ error: "not_found" }, 404);
    const limit = await rateLimit(`geo:notifications:${session.uid}`, 60, 60);
    if (!limit.ok) return NextResponse.json({ error: "rate_limited", retryAfter: limit.retryAfter }, {
      status: 429, headers: { ...HEADERS, "Retry-After": String(limit.retryAfter) },
    });
    const sql = await getDb();
    const rows = await sql`UPDATE gn_community_notifications SET read_at=COALESCE(read_at,now())
      WHERE id=${id.toLowerCase()} AND user_id=${session.uid} RETURNING id`;
    return rows.length ? reply({ ok: true }) : reply({ error: "not_found" }, 404);
  } catch (error) {
    console.error("Community notification service error", error instanceof Error ? error.name : "unknown");
    return reply({ error: "service_unavailable" }, 503);
  }
}
