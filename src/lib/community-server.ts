import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import { sameGeoOrigin } from "@/lib/geo-challenge-server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { CHALLENGE_GAME_IDS } from "@/lib/challenges";
import {
  DUEL_DRAW_POINTS, DUEL_WIN_POINTS, parseFeedbackMessage, validSubmissionId,
  type DuelStanding, type FeedbackSubmission,
} from "@/lib/community";

type Row = Record<string, unknown>;
type RouteContext = { params: Promise<{ id: string }> };
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const PUBLIC_HEADERS = { "Cache-Control": "no-store" };

function failure(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status, headers: PRIVATE_HEADERS });
}

async function safely(work: () => Promise<NextResponse>) {
  try { return await work(); }
  catch (error) {
    // Do not log submissions, credentials, IPs or database connection details.
    console.error("Geo community service error", error instanceof Error ? error.name : "unknown");
    return failure("service_unavailable", 503);
  }
}

async function readBody(req: Request): Promise<Row | null> {
  if (Number(req.headers.get("content-length") ?? 0) > 32_768) return null;
  try {
    // Read a bounded body even if the client omits Content-Length.
    const reader = req.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 32_768) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return body && typeof body === "object" && !Array.isArray(body) ? body as Row : null;
  } catch { return null; }
}

function pageOptions(url: URL, defaultLimit: number) {
  const limit = Number(url.searchParams.get("limit") ?? defaultLimit);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || !Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) return null;
  return { limit, offset };
}

/** The signed UID must still belong to the designated account in the database. */
async function adminGate() {
  const session = await getSession();
  if (!session) return { response: failure("unauthorized", 401) };
  if (!isDbConfigured) return { response: failure("not_configured", 503) };
  const sql = await getDb();
  const users = await sql`SELECT id FROM gn_users WHERE id=${session.uid} AND name_lower='thecreator' LIMIT 1`;
  if (!users.length) return { response: failure("forbidden", 403) };
  return { sql, session };
}

export async function submitCommunityFeedback(req: Request) {
  return safely(async () => {
    if (!sameGeoOrigin(req)) return failure("invalid_origin", 403);
    if (!isDbConfigured) return failure("not_configured", 503);
    const body = await readBody(req);
    if (!body) return failure("bad_request");
    if (!validSubmissionId(body.id)) return failure("invalid_id");
    const id = body.id.toLowerCase();
    const message = parseFeedbackMessage(body.message);
    if (!message) return failure("invalid_message");
    const session = await getSession();
    const sql = await getDb();
    // Resolve the author from the real account, never from a client-supplied name.
    const users = session ? await sql`SELECT id,name FROM gn_users WHERE id=${session.uid} LIMIT 1` : [];
    if (session && !users.length) return failure("unauthorized", 401);
    const userId = session?.uid ?? null;
    const previous = await sql`SELECT user_id,message FROM gn_feedback WHERE id=${id} LIMIT 1`;
    if (previous.length) {
      return previous[0].user_id === userId && previous[0].message === message
        ? NextResponse.json({ ok: true, id }, { headers: PRIVATE_HEADERS })
        : failure("submission_conflict", 409);
    }
    const ipHash = createHash("sha256").update(clientIp(req)).digest("hex");
    const limits = [await rateLimit(`geo:feedback:ip:${ipHash}`, 5, 3600)];
    if (userId) limits.push(await rateLimit(`geo:feedback:user:${userId}`, 5, 3600));
    const blocked = limits.find((limit) => !limit.ok);
    if (blocked) return NextResponse.json({ ok: false, error: "rate_limited", retryAfter: blocked.retryAfter }, {
      status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(blocked.retryAfter) },
    });
    const inserted = await sql`INSERT INTO gn_feedback (id,user_id,author_name,message)
      VALUES (${id},${userId},${users[0]?.name ?? null},${message})
      ON CONFLICT (id) DO NOTHING RETURNING id`;
    // A concurrent retry must not duplicate a submission or claim a conflicting body was saved.
    if (!inserted.length) {
      const existing = await sql`SELECT user_id,message FROM gn_feedback WHERE id=${id} LIMIT 1`;
      if (!existing.length || existing[0].user_id !== userId || existing[0].message !== message) return failure("submission_conflict", 409);
    }
    return NextResponse.json({ ok: true, id }, { status: inserted.length ? 201 : 200, headers: PRIVATE_HEADERS });
  });
}

function serializeSubmission(row: Row): FeedbackSubmission {
  return {
    id: String(row.id), authorName: row.author_name == null ? null : String(row.author_name),
    message: String(row.message), status: row.status as FeedbackSubmission["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    reviewedAt: row.reviewed_at == null ? null : new Date(String(row.reviewed_at)).toISOString(),
  };
}

export async function listCommunityFeedback(req: Request) {
  return safely(async () => {
    const gate = await adminGate();
    if (gate.response) return gate.response;
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "all";
    const page = pageOptions(url, 50);
    if (!page || (status !== "all" && status !== "new" && status !== "reviewed")) return failure("invalid_filter");
    const { sql } = gate;
    // Keep counts and the visible page consistent while new ideas arrive.
    const result = await sql.begin("isolation level repeatable read read only", async (tx) => {
      const counts = await tx`SELECT COUNT(*)::int AS all_count,
        COUNT(*) FILTER (WHERE ${status}='all' OR status=${status})::int AS total,
        COUNT(*) FILTER (WHERE status='new')::int AS new_count FROM gn_feedback`;
      const rows = await tx`SELECT id,author_name,message,status,created_at,reviewed_at FROM gn_feedback
        WHERE ${status}='all' OR status=${status} ORDER BY created_at DESC,id ASC LIMIT ${page.limit} OFFSET ${page.offset}`;
      const total = Number(counts[0].total);
      return { configured: true, submissions: rows.map(serializeSubmission), total, allCount: Number(counts[0].all_count),
        newCount: Number(counts[0].new_count), hasMore: page.offset + rows.length < total };
    });
    return NextResponse.json(result, { headers: PRIVATE_HEADERS });
  });
}

export async function updateCommunityFeedback(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!sameGeoOrigin(req)) return failure("invalid_origin", 403);
    const gate = await adminGate();
    if (gate.response) return gate.response;
    const limit = await rateLimit(`geo:feedback-review:${gate.session.uid}`, 60, 60);
    if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited", retryAfter: limit.retryAfter }, {
      status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(limit.retryAfter) },
    });
    const { id } = await params;
    if (!validSubmissionId(id)) return failure("not_found", 404);
    const body = await readBody(req);
    if (!body || (body.status !== "new" && body.status !== "reviewed")) return failure("invalid_status");
    const rows = await gate.sql`UPDATE gn_feedback SET status=${body.status},
      reviewed_at=CASE WHEN ${body.status}='reviewed' THEN COALESCE(reviewed_at,now()) ELSE NULL END
      WHERE id=${id.toLowerCase()} RETURNING id`;
    return rows.length ? NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS }) : failure("not_found", 404);
  });
}

export async function listDuelStandings(req: Request) {
  return safely(async () => {
    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? "all";
    const game = url.searchParams.get("game") ?? "all";
    const page = pageOptions(url, 100);
    if (!page || (period !== "all" && period !== "month")
      || (game !== "all" && !CHALLENGE_GAME_IDS.some((id) => id === game))) return failure("invalid_filter");
    if (!isDbConfigured) return NextResponse.json({ configured: false, standings: [], hasMore: false }, { headers: PUBLIC_HEADERS });
    const sql = await getDb();
    const rows = await sql`
      WITH completed AS (
        SELECT c.id,c.challenger_id,c.opponent_id,c.winner_id
        FROM gn_challenges c
        JOIN gn_challenge_attempts a ON a.challenge_id=c.id AND a.user_id=c.challenger_id
        JOIN gn_challenge_attempts b ON b.challenge_id=c.id AND b.user_id=c.opponent_id
        WHERE c.status='resolved' AND c.resolved_at IS NOT NULL
          AND (c.winner_id IS NULL OR c.winner_id=c.challenger_id OR c.winner_id=c.opponent_id)
          AND (${game}='all' OR c.game_id=${game})
          AND (${period}='all' OR c.resolved_at>=date_trunc('month',now()))
      ), outcomes AS (
        SELECT challenger_id AS user_id,opponent_id AS rival_id,
          CASE WHEN winner_id=challenger_id THEN 1 ELSE 0 END AS win,
          CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END AS draw,
          CASE WHEN winner_id=opponent_id THEN 1 ELSE 0 END AS loss FROM completed
        UNION ALL
        SELECT opponent_id AS user_id,challenger_id AS rival_id,
          CASE WHEN winner_id=opponent_id THEN 1 ELSE 0 END AS win,
          CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END AS draw,
          CASE WHEN winner_id=challenger_id THEN 1 ELSE 0 END AS loss FROM completed
      ), totals AS (
        SELECT u.id,u.name,u.name_lower,COUNT(*)::int AS played,
          SUM(o.win)::int AS wins,SUM(o.draw)::int AS draws,SUM(o.loss)::int AS losses,
          COUNT(DISTINCT o.rival_id)::int AS opponents,
          (SUM(o.win)*${DUEL_WIN_POINTS}+SUM(o.draw)*${DUEL_DRAW_POINTS})::int AS points,
          SUM(o.win)::numeric/COUNT(*) AS win_fraction
        FROM outcomes o JOIN gn_users u ON u.id=o.user_id GROUP BY u.id,u.name,u.name_lower
      ), ranked AS (
        SELECT *,DENSE_RANK() OVER (ORDER BY points DESC,win_fraction DESC,wins DESC)::int AS rank FROM totals
      )
      SELECT rank,name,points,wins,draws,losses,played,ROUND(win_fraction*100,1) AS win_rate,opponents
      FROM ranked ORDER BY rank ASC,name_lower ASC,id ASC LIMIT ${page.limit + 1} OFFSET ${page.offset}
    `;
    const standings: DuelStanding[] = rows.slice(0, page.limit).map((row) => ({
      rank: Number(row.rank), name: String(row.name), points: Number(row.points), wins: Number(row.wins),
      draws: Number(row.draws), losses: Number(row.losses), played: Number(row.played),
      winRate: Number(row.win_rate), opponents: Number(row.opponents),
    }));
    return NextResponse.json({ configured: true, standings, hasMore: rows.length > page.limit }, { headers: PUBLIC_HEADERS });
  });
}
