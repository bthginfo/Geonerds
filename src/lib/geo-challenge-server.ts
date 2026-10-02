import { randomBytes, timingSafeEqual } from "node:crypto";
import type postgres from "postgres";
import { NextResponse } from "next/server";
import { getSession, newId } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import {
  compareGeoAttempts, geoChallengeTransition, parseGeoChallengeConfig, validGeoChallengeResult,
  type GeoChallenge, type GeoChallengeAttempt, type GeoChallengeConfig, type GeoChallengeStatus,
} from "@/lib/challenges";
import type { RunResult } from "@/lib/types";

type Query = postgres.Sql | postgres.TransactionSql;
type Row = Record<string, unknown>;
type RouteContext = { params: Promise<{ id: string }> };
const failure = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export function sameGeoOrigin(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host") || new URL(req.url).host;
    return new URL(origin).host === expected;
  } catch { return false; }
}

async function mutationGate(req: Request, operation: string, max = 30) {
  if (!sameGeoOrigin(req)) return { response: failure("invalid_origin", 403) };
  const session = await getSession();
  if (!session) return { response: failure("unauthorized", 401) };
  const limit = await rateLimit(`geo:${operation}:${session.uid}:${clientIp(req)}`, max, 60);
  if (!limit.ok) return { response: NextResponse.json({ ok: false, error: "rate_limited", retryAfter: limit.retryAfter }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }) };
  return { session };
}

async function readBody(req: Request): Promise<Row | null> {
  if (Number(req.headers.get("content-length") || 0) > 16_384) return null;
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Row : null;
  } catch { return null; }
}

function date(value: unknown): string { return new Date(String(value)).toISOString(); }

export function serializeGeoChallenge(row: Row, viewerId: string, attempts?: GeoChallengeAttempt[]): GeoChallenge {
  const status = row.status as GeoChallengeStatus;
  const sent = row.challenger_id === viewerId;
  const winnerId = row.winner_id ? String(row.winner_id) : null;
  return {
    id: String(row.id), status, gameId: row.game_id as GeoChallenge["gameId"],
    difficulty: row.difficulty as GeoChallenge["difficulty"], mode: row.mode as GeoChallenge["mode"],
    rounds: Number(row.rounds), timed: Boolean(row.timed), variant: String(row.variant ?? ""),
    seed: status === "active" ? String(row.seed) : null,
    challengerName: String(row.challenger_name), opponentName: String(sent ? row.opponent_name : row.challenger_name),
    direction: sent ? "sent" : "received", viewerAttempted: Boolean(row.viewer_attempted), viewerStarted: Boolean(row.viewer_started),
    attemptCount: Number(row.attempt_count ?? 0), expiresAt: date(row.expires_at), createdAt: date(row.created_at),
    winnerName: winnerId ? String(winnerId === row.challenger_id ? row.challenger_name : row.opponent_name) : null,
    viewerOutcome: status !== "resolved" ? null : !winnerId ? "draw" : winnerId === viewerId ? "win" : "loss",
    ...(attempts ? { attempts } : {}),
  };
}

async function expire(sql: Query, viewerId: string, id?: string) {
  await sql`UPDATE gn_challenges SET status='expired',updated_at=now()
    WHERE (challenger_id=${viewerId} OR opponent_id=${viewerId})
    AND status IN ('pending','active') AND expires_at<=now() ${id ? sql`AND id=${id}` : sql``}`;
}

async function load(sql: Query, id: string, userId: string): Promise<GeoChallenge | null> {
  const rows = await sql`
    SELECT c.*,a.name AS challenger_name,b.name AS opponent_name,
      (SELECT COUNT(*)::int FROM gn_challenge_attempts t WHERE t.challenge_id=c.id) AS attempt_count,
      EXISTS(SELECT 1 FROM gn_challenge_attempts t WHERE t.challenge_id=c.id AND t.user_id=${userId}) AS viewer_attempted,
      EXISTS(SELECT 1 FROM gn_challenge_starts s WHERE s.challenge_id=c.id AND s.user_id=${userId}) AS viewer_started
    FROM gn_challenges c JOIN gn_users a ON a.id=c.challenger_id JOIN gn_users b ON b.id=c.opponent_id
    WHERE c.id=${id} AND (c.challenger_id=${userId} OR c.opponent_id=${userId}) LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const raw = await sql`SELECT t.*,u.name FROM gn_challenge_attempts t JOIN gn_users u ON u.id=t.user_id
    WHERE t.challenge_id=${id} AND (${row.status === "resolved"} OR t.user_id=${userId}) ORDER BY t.created_at`;
  const attempts: GeoChallengeAttempt[] = raw.map((t) => ({
    name: String(t.name), score: Number(t.score), correct: Number(t.correct), total: Number(t.total),
    bestStreak: Number(t.best_streak), durationMs: Number(t.duration_ms), mine: t.user_id === userId,
  }));
  return serializeGeoChallenge(row, userId, attempts);
}

async function locked(sql: Query, id: string, userId: string) {
  const rows = await sql`SELECT * FROM gn_challenges WHERE id=${id}
    AND (challenger_id=${userId} OR opponent_id=${userId}) FOR UPDATE`;
  const row = rows[0];
  if (row && (row.status === "pending" || row.status === "active") && new Date(row.expires_at).getTime() <= Date.now()) {
    await sql`UPDATE gn_challenges SET status='expired',updated_at=now() WHERE id=${id}`;
    row.status = "expired";
  }
  return row;
}

/** Every public handler reports a retryable service failure without exposing DB errors. */
async function safely(work: () => Promise<NextResponse>): Promise<NextResponse> {
  try { return await work(); }
  catch (error) {
    console.error("Geo challenge service error", error instanceof Error ? error.name : "unknown");
    return failure("service_unavailable", 503);
  }
}

export async function listGeoChallenges() {
  return safely(async () => {
    if (!isDbConfigured) return NextResponse.json({ configured: false, challenges: [] });
    const session = await getSession();
    if (!session) return failure("unauthorized", 401);
    const sql = await getDb();
    await expire(sql, session.uid);
    const rows = await sql`
      SELECT c.*,a.name AS challenger_name,b.name AS opponent_name,
        (SELECT COUNT(*)::int FROM gn_challenge_attempts t WHERE t.challenge_id=c.id) AS attempt_count,
        EXISTS(SELECT 1 FROM gn_challenge_attempts t WHERE t.challenge_id=c.id AND t.user_id=${session.uid}) AS viewer_attempted,
        EXISTS(SELECT 1 FROM gn_challenge_starts s WHERE s.challenge_id=c.id AND s.user_id=${session.uid}) AS viewer_started
      FROM gn_challenges c JOIN gn_users a ON a.id=c.challenger_id JOIN gn_users b ON b.id=c.opponent_id
      WHERE c.challenger_id=${session.uid} OR c.opponent_id=${session.uid} ORDER BY c.created_at DESC LIMIT 100
    `;
    return NextResponse.json({ configured: true, challenges: rows.map((row) => serializeGeoChallenge(row, session.uid)) });
  });
}

export async function createGeoChallenge(req: Request) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const gate = await mutationGate(req, "create-challenge", 10);
    if (gate.response) return gate.response;
    const body = await readBody(req);
    if (!body) return failure("bad_request");
    const config = parseGeoChallengeConfig(body);
    if (!config) return failure("invalid_config");
    const sql = await getDb();
    const users = await sql`SELECT id,name FROM gn_users WHERE name_lower=${config.opponentName.toLowerCase()} LIMIT 1`;
    const opponent = users[0];
    if (!opponent) return failure("unknown_user", 404);
    if (opponent.id === gate.session.uid) return failure("self_challenge");
    const open = await sql`SELECT COUNT(*)::int AS count FROM gn_challenges
      WHERE challenger_id=${gate.session.uid} AND status IN ('pending','active') AND expires_at>now()`;
    if (Number(open[0].count) >= 30) return failure("too_many_challenges", 429);
    const id = newId();
    const seed = `geo:${randomBytes(24).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await sql`INSERT INTO gn_challenges (id,challenger_id,opponent_id,game_id,difficulty,mode,rounds,timed,variant,seed,expires_at)
      VALUES (${id},${gate.session.uid},${opponent.id},${config.gameId},${config.difficulty},${config.mode},${config.rounds},${config.timed},${config.variant},${seed},${expiresAt})`;
    return NextResponse.json({ ok: true, id }, { status: 201 });
  });
}

export async function getGeoChallenge(_req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return NextResponse.json({ configured: false, challenge: null });
    const session = await getSession();
    if (!session) return failure("unauthorized", 401);
    const { id } = await params;
    const sql = await getDb();
    await expire(sql, session.uid, id);
    const challenge = await load(sql, id, session.uid);
    return challenge ? NextResponse.json({ configured: true, challenge }) : failure("not_found", 404);
  });
}

export async function actGeoChallenge(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const gate = await mutationGate(req, "challenge-action");
    if (gate.response) return gate.response;
    const body = await readBody(req);
    const action = body?.action;
    if (action !== "accept" && action !== "decline" && action !== "cancel") return failure("invalid_action");
    const { id } = await params;
    const sql = await getDb();
    return sql.begin(async (tx) => {
      const row = await locked(tx, id, gate.session.uid);
      if (!row) return failure("not_found", 404);
      const role = row.challenger_id === gate.session.uid ? "challenger" : "opponent";
      if ((action === "cancel" && role !== "challenger") || (action !== "cancel" && role !== "opponent")) return failure("forbidden", 403);
      const next = geoChallengeTransition(row.status, action, role);
      if (!next) return failure(row.status === "expired" ? "expired" : "invalid_transition", 409);
      await tx`UPDATE gn_challenges SET status=${next},accepted_at=${next === "active" ? new Date() : null},updated_at=now() WHERE id=${id}`;
      return NextResponse.json({ ok: true });
    });
  });
}

export async function startGeoChallenge(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const gate = await mutationGate(req, "challenge-start");
    if (gate.response) return gate.response;
    const { id } = await params;
    const sql = await getDb();
    return sql.begin(async (tx) => {
      const row = await locked(tx, id, gate.session.uid);
      if (!row) return failure("not_found", 404);
      if (row.status !== "active") return failure(row.status === "expired" ? "expired" : "not_active", 409);
      const done = await tx`SELECT 1 FROM gn_challenge_attempts WHERE challenge_id=${id} AND user_id=${gate.session.uid}`;
      if (done.length) return failure("already_submitted", 409);
      const starts = await tx`INSERT INTO gn_challenge_starts (challenge_id,user_id,token)
        VALUES (${id},${gate.session.uid},${randomBytes(32).toString("base64url")})
        ON CONFLICT (challenge_id,user_id) DO UPDATE SET token=gn_challenge_starts.token RETURNING token`;
      return NextResponse.json({ ok: true, attemptToken: starts[0].token });
    });
  });
}

export async function submitGeoChallenge(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const gate = await mutationGate(req, "challenge-submit");
    if (gate.response) return gate.response;
    const body = await readBody(req);
    if (!body) return failure("bad_request");
    const { id } = await params;
    const sql = await getDb();
    const response = await sql.begin(async (tx) => {
      const row = await locked(tx, id, gate.session.uid);
      if (!row) return { error: "not_found", status: 404 };
      const config: GeoChallengeConfig = {
        gameId: row.game_id, difficulty: row.difficulty, mode: row.mode,
        rounds: row.rounds, timed: row.timed, variant: row.variant,
      };
      if (!validGeoChallengeResult(body, config)) return { error: "invalid_result", status: 400 };
      const existing = await tx`SELECT * FROM gn_challenge_attempts WHERE challenge_id=${id} AND user_id=${gate.session.uid}`;
      if (existing.length) {
        const previous = existing[0];
        const same = previous.score === body.score && previous.correct === body.correct && previous.total === body.total
          && previous.best_streak === body.bestStreak && previous.duration_ms === body.durationMs;
        return same ? { ok: true } : { error: "already_submitted", status: 409 };
      }
      if (row.status !== "active") return { error: row.status === "expired" ? "expired" : "not_active", status: 409 };
      const starts = await tx`SELECT * FROM gn_challenge_starts WHERE challenge_id=${id} AND user_id=${gate.session.uid}`;
      const start = starts[0];
      const token = typeof body.attemptToken === "string" ? Buffer.from(body.attemptToken) : Buffer.alloc(0);
      const expected = Buffer.from(String(start?.token ?? ""));
      if (!start || token.length !== expected.length || !timingSafeEqual(token, expected)) return { error: "invalid_attempt", status: 403 };
      const run = body as unknown as RunResult;
      if (run.durationMs > Date.now() - new Date(start.started_at).getTime() + 10_000) return { error: "invalid_result", status: 400 };
      await tx`INSERT INTO gn_challenge_attempts (challenge_id,user_id,score,correct,total,best_streak,duration_ms)
        VALUES (${id},${gate.session.uid},${run.score},${run.correct},${run.total},${run.bestStreak},${run.durationMs})`;
      const attempts = await tx`SELECT * FROM gn_challenge_attempts WHERE challenge_id=${id}`;
      if (attempts.length === 2) {
        const a = attempts.find((attempt) => attempt.user_id === row.challenger_id)!;
        const b = attempts.find((attempt) => attempt.user_id === row.opponent_id)!;
        const compare = compareGeoAttempts(
          { score: a.score, correct: a.correct, durationMs: a.duration_ms },
          { score: b.score, correct: b.correct, durationMs: b.duration_ms },
        );
        const winnerId = compare > 0 ? row.challenger_id : compare < 0 ? row.opponent_id : null;
        await tx`UPDATE gn_challenges SET status='resolved',winner_id=${winnerId},resolved_at=now(),updated_at=now() WHERE id=${id}`;
      }
      return { ok: true };
    });
    if ("error" in response) return failure(response.error!, response.status);
    const challenge = await load(sql, id, gate.session.uid);
    return NextResponse.json({ ok: true, resolved: challenge?.status === "resolved", challenge });
  });
}
