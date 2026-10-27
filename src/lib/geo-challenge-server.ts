import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type postgres from "postgres";
import { NextResponse } from "next/server";
import { getSession, newId } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { validateName } from "@/lib/validate";
import { CHALLENGE_INVITE_TTL_MS, CHALLENGE_PLAY_TTL_MS, compareGeoAttempts, geoChallengeTransition,
  parseGeoChallengeConfig, validGeoChallengeResult, type GeoChallenge, type GeoChallengeAttempt,
  type GeoChallengeConfig, type GeoChallengeInviteType, type GeoChallengeNotificationKind, type GeoChallengeStatus } from "@/lib/challenges";
import { guestTokenHash, newGuestChallengeAccess, readGuestChallengeToken, validGuestChallengeToken } from "./geo-challenge-guest";
import type { RunResult } from "@/lib/types";
import { ADASTRA_CATALOG_SEED_PREFIX } from "@/lib/adastra-catalog-version";
import { GEO_CONTENT_SEED_PREFIX } from "@/lib/geo-content-version";
import { BOT_NAME, MAX_BOT_ROUNDS, buildBotAttempt } from "@/lib/challenge-bots";
import type { Difficulty } from "@/lib/types";

type Query = postgres.Sql | postgres.TransactionSql;
type Row = Record<string, unknown>;
type RouteContext = { params: Promise<{ id: string }> };
type Viewer = { userId: string | null; name: string; guestToken: string | null };
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
const failure = (error: string, status = 400) => reply({ ok: false, error }, status);
const validId = (id: string) => /^[a-zA-Z0-9-]{1,64}$/.test(id);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const inviteType = (row: Row) => (row.invitation_type ?? "direct") as GeoChallengeInviteType;
const sharedInvite = (row: Row) => inviteType(row) === "open" || inviteType(row) === "link";

export function sameGeoOrigin(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host") || new URL(req.url).host;
    return new URL(origin).host === expected;
  } catch { return false; }
}

async function viewerFor(req: Request, id = ""): Promise<Viewer> {
  const session = await getSession();
  return { userId: session?.uid ?? null, name: session?.name ?? "", guestToken: id ? readGuestChallengeToken(req, id) : null };
}

function rateFailure(retryAfter: number) {
  const response = reply({ ok: false, error: "rate_limited", retryAfter }, 429);
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}

async function mutationGate(req: Request, operation: string, id = "", allowAnonymous = false, max = 30) {
  if (!sameGeoOrigin(req)) return { response: failure("invalid_origin", 403) };
  const viewer = await viewerFor(req, id);
  if (!viewer.userId && !viewer.guestToken && !allowAnonymous) return { response: failure("unauthorized", 401) };
  const actor = viewer.userId ?? (viewer.guestToken ? hash(viewer.guestToken) : `visitor:${hash(clientIp(req))}`);
  const limit = await rateLimit(`geo:${operation}:${actor}`, max, 60);
  if (!limit.ok) return { response: rateFailure(limit.retryAfter) };
  return { viewer };
}

/** Bound actual bytes too: callers may omit Content-Length. */
async function readBody(req: Request): Promise<Row | null> {
  if (Number(req.headers.get("content-length") ?? 0) > 16_384) return null;
  try {
    const reader = req.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 16_384) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return body && typeof body === "object" && !Array.isArray(body) ? body as Row : null;
  } catch { return null; }
}

const date = (value: unknown) => new Date(String(value)).toISOString();
function participant(row: Row, viewer: Viewer): "challenger" | "opponent" | "visitor" {
  if (viewer.userId && row.challenger_id === viewer.userId) return "challenger";
  if (viewer.userId && row.opponent_id === viewer.userId) return "opponent";
  if (!row.opponent_id && row.guest_name && validGuestChallengeToken(viewer.guestToken, row.guest_token_hash)) return "opponent";
  return "visitor";
}
const isGuest = (row: Row, viewer: Viewer) => participant(row, viewer) === "opponent" && !row.opponent_id && Boolean(row.guest_name);

/** A link grants a preview/claim, never another player's attempt or private result. */
export function serializeGeoChallenge(row: Row, viewerId: string, attempts?: GeoChallengeAttempt[], guest = false): GeoChallenge {
  const status = row.status as GeoChallengeStatus;
  const sent = row.challenger_id === viewerId;
  const invited = sent || row.opponent_id === viewerId || guest;
  const role = sent ? "challenger" : invited ? "opponent" : "visitor";
  const winnerSide = row.winner_side ?? (row.winner_id ? row.winner_id === row.challenger_id ? "challenger" : "opponent" : null);
  const bot = inviteType(row) === "bot";
  const rivalName = bot ? BOT_NAME : row.opponent_name ?? row.guest_name ?? "";
  return {
    id: String(row.id), status, gameId: row.game_id as GeoChallenge["gameId"],
    difficulty: row.difficulty as GeoChallenge["difficulty"], mode: row.mode as GeoChallenge["mode"],
    rounds: Number(row.rounds), timed: Boolean(row.timed), variant: String(row.variant ?? ""),
    seed: invited && status === "active" ? String(row.seed) : null,
    challengerName: String(row.challenger_name), opponentName: String(sent ? rivalName : row.challenger_name),
    direction: sent ? "sent" : invited ? "received" : "open", viewerRole: role,
    viewerAttempted: invited && Boolean(row.viewer_attempted), viewerStarted: invited && Boolean(row.viewer_started),
    attemptCount: invited ? Number(row.attempt_count ?? 0) : 0, expiresAt: date(row.expires_at), createdAt: date(row.created_at),
    winnerName: invited && winnerSide ? String(winnerSide === "challenger" ? row.challenger_name : rivalName) : null,
    viewerOutcome: !invited || status !== "resolved" ? null : !winnerSide ? "draw" : winnerSide === role ? "win" : "loss",
    invitationType: inviteType(row), viewerIsGuest: guest, opponentIsGuest: sent && Boolean(row.guest_name),
    ...(bot ? { opponentIsBot: true, botDifficulty: row.bot_difficulty as Difficulty } : {}),
    canAccept: status === "pending" && new Date(String(row.expires_at)).getTime() > Date.now()
      && (role === "opponent" || (role === "visitor" && sharedInvite(row) && !row.opponent_id && !row.guest_name)),
    ...(sharedInvite(row) ? { sharePath: `/challenges?invite=${encodeURIComponent(String(row.id))}` } : {}),
    ...(invited ? { viewerKey: guest ? `guest:${row.id}` : viewerId } : {}),
    ...(invited && attempts ? { attempts } : {}),
  };
}

async function notify(sql: Query, userId: unknown, row: Row, kind: GeoChallengeNotificationKind, actorName = "") {
  if (!userId) return;
  const id = createHash("md5").update(`${userId}:${row.id}:${kind}`).digest("hex");
  await sql`INSERT INTO gn_challenge_notifications (id,user_id,challenge_id,kind,actor_name,game_id)
    VALUES (${id},${String(userId)},${String(row.id)},${kind},${actorName},${String(row.game_id)})
    ON CONFLICT (user_id,challenge_id,kind) DO NOTHING`;
}

async function expire(sql: Query, viewerId?: string, id?: string, openOnly = false) {
  const uid = viewerId ?? null;
  const matchId = id ?? null;
  const rows = await sql`UPDATE gn_challenges SET status='expired',updated_at=now()
    WHERE status IN ('pending','active') AND expires_at<=now()
      AND (${uid}::text IS NULL OR challenger_id=${uid} OR opponent_id=${uid})
      AND (${matchId}::text IS NULL OR id=${matchId})
      AND (${!openOnly} OR (invitation_type='open' AND status='pending'))
    RETURNING id,challenger_id,opponent_id,game_id`;
  for (const row of rows) {
    await notify(sql, row.challenger_id, row, "expired");
    await notify(sql, row.opponent_id, row, "expired");
  }
}

async function load(sql: Query, id: string, viewer: Viewer): Promise<GeoChallenge | null> {
  const guestHash = viewer.guestToken ? guestTokenHash(viewer.guestToken) : null;
  const rows = await sql`
    SELECT c.*,a.name AS challenger_name,b.name AS opponent_name,
      ((SELECT COUNT(*)::int FROM gn_challenge_attempts t WHERE t.challenge_id=c.id)
        +(SELECT COUNT(*)::int FROM gn_challenge_guest_attempts t WHERE t.challenge_id=c.id)
        +(SELECT COUNT(*)::int FROM gn_challenge_bot_attempts t WHERE t.challenge_id=c.id)) AS attempt_count,
      (EXISTS(SELECT 1 FROM gn_challenge_attempts t WHERE t.challenge_id=c.id AND t.user_id=${viewer.userId})
        OR (c.guest_token_hash=${guestHash} AND EXISTS(SELECT 1 FROM gn_challenge_guest_attempts t WHERE t.challenge_id=c.id))) AS viewer_attempted,
      (EXISTS(SELECT 1 FROM gn_challenge_starts s WHERE s.challenge_id=c.id AND s.user_id=${viewer.userId})
        OR (c.guest_token_hash=${guestHash} AND EXISTS(SELECT 1 FROM gn_challenge_guest_starts s WHERE s.challenge_id=c.id))) AS viewer_started
    FROM gn_challenges c JOIN gn_users a ON a.id=c.challenger_id LEFT JOIN gn_users b ON b.id=c.opponent_id
    WHERE c.id=${id} AND (c.challenger_id=${viewer.userId} OR c.opponent_id=${viewer.userId}
      OR c.guest_token_hash=${guestHash} OR c.invitation_type IN ('open','link')) LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const role = participant(row, viewer);
  const guest = isGuest(row, viewer);
  if (role === "visitor") return sharedInvite(row) ? serializeGeoChallenge(row, "") : null;
  const raw = await sql`SELECT t.*,u.name FROM gn_challenge_attempts t JOIN gn_users u ON u.id=t.user_id
    WHERE t.challenge_id=${id} AND (${row.status === "resolved"} OR t.user_id=${guest ? null : viewer.userId}) ORDER BY t.created_at`;
  const attempts: GeoChallengeAttempt[] = raw.map((t) => ({
    name: String(t.name), score: Number(t.score), correct: Number(t.correct), total: Number(t.total),
    bestStreak: Number(t.best_streak), durationMs: Number(t.duration_ms), mine: !guest && t.user_id === viewer.userId,
  }));
  if (row.guest_name && (guest || row.status === "resolved")) {
    const guestRows = await sql`SELECT * FROM gn_challenge_guest_attempts WHERE challenge_id=${id}`;
    for (const t of guestRows) attempts.push({ name: String(row.guest_name), score: Number(t.score), correct: Number(t.correct),
      total: Number(t.total), bestStreak: Number(t.best_streak), durationMs: Number(t.duration_ms), mine: guest, guest: true });
  }
  if (inviteType(row) === "bot" && row.status === "resolved") {
    const botRows = await sql`SELECT * FROM gn_challenge_bot_attempts WHERE challenge_id=${id}`;
    for (const t of botRows) attempts.push({ name: BOT_NAME, score: Number(t.score), correct: Number(t.correct),
      total: Number(t.total), bestStreak: Number(t.best_streak), durationMs: Number(t.duration_ms), mine: false, bot: true });
  }
  return serializeGeoChallenge(row, viewer.userId ?? "", attempts, guest);
}

async function locked(sql: Query, id: string, viewer: Viewer, allowClaim = false) {
  const guestHash = viewer.guestToken ? guestTokenHash(viewer.guestToken) : null;
  const rows = await sql`SELECT * FROM gn_challenges WHERE id=${id}
    AND (challenger_id=${viewer.userId} OR opponent_id=${viewer.userId} OR guest_token_hash=${guestHash}
      OR (${allowClaim} AND invitation_type IN ('open','link'))) FOR UPDATE`;
  const row = rows[0];
  if (row && (row.status === "pending" || row.status === "active") && new Date(row.expires_at).getTime() <= Date.now()) {
    await sql`UPDATE gn_challenges SET status='expired',updated_at=now() WHERE id=${id}`;
    await notify(sql, row.challenger_id, row, "expired");
    await notify(sql, row.opponent_id, row, "expired");
    row.status = "expired";
  }
  return row;
}

/** Never return DB error text, tokens, IPs, or credentials. */
async function safely(work: () => Promise<NextResponse>): Promise<NextResponse> {
  try { return await work(); }
  catch (error) {
    console.error("Geo challenge service error", error instanceof Error ? error.name : "unknown");
    return failure("service_unavailable", 503);
  }
}

export async function listGeoChallenges() {
  return safely(async () => {
    if (!isDbConfigured) return reply({ configured: false, challenges: [] });
    const session = await getSession();
    if (!session) return failure("unauthorized", 401);
    const sql = await getDb();
    await sql.begin(async (tx) => expire(tx, session.uid));
    const rows = await sql`
      SELECT c.*,a.name AS challenger_name,b.name AS opponent_name,
        ((SELECT COUNT(*)::int FROM gn_challenge_attempts t WHERE t.challenge_id=c.id)
          +(SELECT COUNT(*)::int FROM gn_challenge_guest_attempts t WHERE t.challenge_id=c.id)
          +(SELECT COUNT(*)::int FROM gn_challenge_bot_attempts t WHERE t.challenge_id=c.id)) AS attempt_count,
        EXISTS(SELECT 1 FROM gn_challenge_attempts t WHERE t.challenge_id=c.id AND t.user_id=${session.uid}) AS viewer_attempted,
        EXISTS(SELECT 1 FROM gn_challenge_starts s WHERE s.challenge_id=c.id AND s.user_id=${session.uid}) AS viewer_started
      FROM gn_challenges c JOIN gn_users a ON a.id=c.challenger_id LEFT JOIN gn_users b ON b.id=c.opponent_id
      WHERE c.challenger_id=${session.uid} OR c.opponent_id=${session.uid} ORDER BY c.created_at DESC LIMIT 100
    `;
    return reply({ configured: true, challenges: rows.map((row) => serializeGeoChallenge(row, session.uid)) });
  });
}

export async function listOpenGeoChallenges(req: Request) {
  return safely(async () => {
    if (!isDbConfigured) return reply({ configured: false, challenges: [] });
    const session = await getSession();
    const limit = await rateLimit(`geo:open-list:${session?.uid ?? hash(clientIp(req))}`, 60, 60);
    if (!limit.ok) return rateFailure(limit.retryAfter);
    const sql = await getDb();
    await sql.begin(async (tx) => expire(tx, undefined, undefined, true));
    const rows = await sql`SELECT c.*,a.name AS challenger_name FROM gn_challenges c JOIN gn_users a ON a.id=c.challenger_id
      WHERE c.invitation_type='open' AND c.status='pending' AND c.expires_at>now()
        AND c.opponent_id IS NULL AND c.guest_name IS NULL ORDER BY c.created_at DESC LIMIT 50`;
    return reply({ configured: true, challenges: rows.map((row) => serializeGeoChallenge(row, session?.uid ?? "")) });
  });
}

export async function createGeoChallenge(req: Request) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const gate = await mutationGate(req, "create-challenge", "", false, 10);
    if (gate.response) return gate.response;
    const viewer = gate.viewer;
    const body = await readBody(req);
    if (!body) return failure("bad_request");
    const config = parseGeoChallengeConfig(body);
    if (!config) return failure("invalid_config");
    const invitationType = config.invitationType ?? "direct";
    const bot = invitationType === "bot";
    const hourly = await rateLimit(`geo:${bot ? "bot-games" : "invitations"}-hour:${viewer.userId}`, bot ? 120 : 12, 3600);
    if (!hourly.ok) return rateFailure(hourly.retryAfter);
    const sql = await getDb();
    return sql.begin(async (tx) => {
      // Serialize creations by account; concurrent sends cannot exceed the cap.
      const creatorRows = await tx`SELECT id,name FROM gn_users WHERE id=${viewer.userId} FOR UPDATE`;
      if (!creatorRows.length) return failure("unauthorized", 401);
      const creator = creatorRows[0];
      let opponent: Row | undefined;
      if (invitationType === "direct") {
        const users = await tx`SELECT id,name FROM gn_users WHERE name_lower=${config.opponentName!.toLowerCase()} LIMIT 1`;
        opponent = users[0];
        if (!opponent) return failure("unknown_user", 404);
        if (opponent.id === viewer.userId) return failure("self_challenge");
      } else if (invitationType === "random") {
        const users = await tx`SELECT u.id,u.name FROM gn_users u WHERE u.id<>${viewer.userId}
          AND NOT EXISTS(SELECT 1 FROM gn_challenges c WHERE c.status IN ('pending','active') AND c.expires_at>now()
            AND ((c.challenger_id=${viewer.userId} AND c.opponent_id=u.id) OR (c.opponent_id=${viewer.userId} AND c.challenger_id=u.id)))
          AND (SELECT COUNT(*) FROM gn_challenges c WHERE c.opponent_id=u.id AND c.status='pending' AND c.expires_at>now())<10
          ORDER BY EXISTS(SELECT 1 FROM gn_scores s WHERE s.user_id=u.id AND s.created_at>now()-interval '30 days') DESC,random() LIMIT 1`;
        opponent = users[0];
        if (!opponent) return failure("no_random_opponents", 409);
      }
      const open = await tx`SELECT COUNT(*)::int AS count FROM gn_challenges
        WHERE challenger_id=${viewer.userId} AND status IN ('pending','active') AND expires_at>now()`;
      if (Number(open[0]?.count ?? 0) >= 30) return failure("too_many_challenges", 429);
      if (opponent) {
        const duplicates = await tx`SELECT id FROM gn_challenges WHERE status IN ('pending','active') AND expires_at>now()
          AND ((challenger_id=${viewer.userId} AND opponent_id=${String(opponent.id)})
            OR (opponent_id=${viewer.userId} AND challenger_id=${String(opponent.id)})) LIMIT 1`;
        if (duplicates.length) return failure("already_challenged", 409);
      }
      const id = newId();
      const seed = `${config.gameId === "adastra" ? ADASTRA_CATALOG_SEED_PREFIX : GEO_CONTENT_SEED_PREFIX}${randomBytes(24).toString("base64url")}`;
      const expiresAt = new Date(Date.now() + (bot ? CHALLENGE_PLAY_TTL_MS : CHALLENGE_INVITE_TTL_MS));
      const botSeed = bot ? randomBytes(32).toString("base64url") : null;
      await tx`INSERT INTO gn_challenges (id,challenger_id,opponent_id,invitation_type,game_id,difficulty,mode,rounds,timed,variant,seed,expires_at,bot_difficulty,bot_seed,status,accepted_at)
        VALUES (${id},${viewer.userId},${opponent ? String(opponent.id) : null},${invitationType},${config.gameId},${config.difficulty},${config.mode},${config.rounds},${config.timed},${config.variant},${seed},${expiresAt},${config.botDifficulty ?? null},${botSeed},${bot ? "active" : "pending"},${bot ? new Date() : null})`;
      if (opponent) await notify(tx, opponent.id, { id, game_id: config.gameId }, "invited", String(creator.name));
      return reply({ ok: true, id, ...(bot ? { opponentName: BOT_NAME } : opponent ? { opponentName: String(opponent.name) } : { sharePath: `/challenges?invite=${id}` }) }, 201);
    });
  });
}

export async function getGeoChallenge(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return reply({ configured: false, challenge: null });
    const { id } = await params;
    if (!validId(id)) return failure("not_found", 404);
    const viewer = await viewerFor(req, id);
    const sql = await getDb();
    await sql.begin(async (tx) => expire(tx, undefined, id));
    const challenge = await load(sql, id, viewer);
    return challenge ? reply({ configured: true, challenge }) : failure("not_found", 404);
  });
}

export async function actGeoChallenge(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    if (!sameGeoOrigin(req)) return failure("invalid_origin", 403);
    const body = await readBody(req);
    const action = body?.action;
    if (action !== "accept" && action !== "decline" && action !== "cancel") return failure("invalid_action");
    const { id } = await params;
    if (!validId(id)) return failure("not_found", 404);
    const gate = await mutationGate(req, "challenge-action", id, action === "accept");
    if (gate.response) return gate.response;
    const viewer = gate.viewer;
    const sql = await getDb();
    return sql.begin(async (tx) => {
      const row = await locked(tx, id, viewer, action === "accept");
      if (!row) return failure("not_found", 404);
      let role = participant(row, viewer);
      let guestAccess: ReturnType<typeof newGuestChallengeAccess> | undefined;
      let acceptedName = viewer.name;
      if (role === "visitor" && action === "accept" && sharedInvite(row)) {
        if (row.status === "expired") return failure("expired", 409);
        if (row.status !== "pending" || row.opponent_id || row.guest_name) return failure("invitation_taken", 409);
        if (viewer.userId) {
          const users = await tx`SELECT id,name FROM gn_users WHERE id=${viewer.userId} LIMIT 1`;
          if (!users.length) return failure("unauthorized", 401);
          acceptedName = String(users[0].name);
          await tx`UPDATE gn_challenges SET opponent_id=${viewer.userId} WHERE id=${id}`;
          row.opponent_id = viewer.userId;
        } else {
          if (inviteType(row) !== "link") return failure("guest_requires_link", 401);
          const guestName = validateName(body?.guestName);
          if (!guestName) return failure("invalid_guest_name");
          guestAccess = newGuestChallengeAccess(id);
          acceptedName = guestName;
          await tx`UPDATE gn_challenges SET guest_name=${guestName},guest_token_hash=${guestAccess.hash} WHERE id=${id}`;
          row.guest_name = guestName;
        }
        role = "opponent";
      }
      if ((action === "cancel" && role !== "challenger") || (action !== "cancel" && role !== "opponent")) return failure("forbidden", 403);
      const next = geoChallengeTransition(row.status as GeoChallengeStatus, action, role as "challenger" | "opponent");
      if (!next) return failure(row.status === "expired" ? "expired" : "invalid_transition", 409);
      const acceptedAt = next === "active" ? new Date() : null;
      const expiresAt = acceptedAt ? new Date(acceptedAt.getTime() + CHALLENGE_PLAY_TTL_MS) : new Date(String(row.expires_at));
      await tx`UPDATE gn_challenges SET status=${next},accepted_at=${acceptedAt},expires_at=${expiresAt},updated_at=now() WHERE id=${id}`;
      await notify(tx, action === "cancel" ? row.opponent_id : row.challenger_id, row,
        action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled", acceptedName);
      if (viewer.userId) await tx`UPDATE gn_challenge_notifications SET read_at=COALESCE(read_at,now())
        WHERE user_id=${viewer.userId} AND challenge_id=${id} AND kind='invited'`;
      const response = reply({ ok: true });
      if (guestAccess) response.cookies.set(guestAccess.cookie);
      return response;
    });
  });
}

export async function startGeoChallenge(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const { id } = await params;
    if (!validId(id)) return failure("not_found", 404);
    const gate = await mutationGate(req, "challenge-start", id);
    if (gate.response) return gate.response;
    const viewer = gate.viewer;
    const sql = await getDb();
    return sql.begin(async (tx) => {
      const row = await locked(tx, id, viewer);
      if (!row || participant(row, viewer) === "visitor") return failure("not_found", 404);
      if (row.status !== "active") return failure(row.status === "expired" ? "expired" : "not_active", 409);
      const guest = isGuest(row, viewer);
      const done = guest ? await tx`SELECT 1 FROM gn_challenge_guest_attempts WHERE challenge_id=${id}`
        : await tx`SELECT 1 FROM gn_challenge_attempts WHERE challenge_id=${id} AND user_id=${viewer.userId}`;
      if (done.length) return failure("already_submitted", 409);
      const token = randomBytes(32).toString("base64url");
      const starts = guest ? await tx`INSERT INTO gn_challenge_guest_starts (challenge_id,token) VALUES (${id},${token})
        ON CONFLICT (challenge_id) DO UPDATE SET token=gn_challenge_guest_starts.token RETURNING token`
        : await tx`INSERT INTO gn_challenge_starts (challenge_id,user_id,token) VALUES (${id},${viewer.userId},${token})
        ON CONFLICT (challenge_id,user_id) DO UPDATE SET token=gn_challenge_starts.token RETURNING token`;
      return reply({ ok: true, attemptToken: starts[0].token });
    });
  });
}

export async function submitGeoChallenge(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const { id } = await params;
    if (!validId(id)) return failure("not_found", 404);
    const gate = await mutationGate(req, "challenge-submit", id);
    if (gate.response) return gate.response;
    const viewer = gate.viewer;
    const body = await readBody(req);
    if (!body) return failure("bad_request");
    const sql = await getDb();
    const response = await sql.begin(async (tx) => {
      const row = await locked(tx, id, viewer);
      if (!row || participant(row, viewer) === "visitor") return { error: "not_found", status: 404 };
      const config: GeoChallengeConfig = { gameId: row.game_id as GeoChallengeConfig["gameId"], difficulty: row.difficulty as GeoChallengeConfig["difficulty"],
        mode: row.mode as GeoChallengeConfig["mode"], rounds: Number(row.rounds), timed: Boolean(row.timed), variant: String(row.variant) };
      if (!validGeoChallengeResult(body, config)) return { error: "invalid_result", status: 400 };
      const bot = inviteType(row) === "bot";
      if (bot && Number(body.total) > MAX_BOT_ROUNDS) return { error: "invalid_result", status: 400 };
      const guest = isGuest(row, viewer);
      const existing = guest ? await tx`SELECT * FROM gn_challenge_guest_attempts WHERE challenge_id=${id}`
        : await tx`SELECT * FROM gn_challenge_attempts WHERE challenge_id=${id} AND user_id=${viewer.userId}`;
      if (existing.length) {
        const previous = existing[0];
        const same = previous.score === body.score && previous.correct === body.correct && previous.total === body.total
          && previous.best_streak === body.bestStreak && previous.duration_ms === body.durationMs;
        return same ? { ok: true } : { error: "already_submitted", status: 409 };
      }
      if (row.status !== "active") return { error: row.status === "expired" ? "expired" : "not_active", status: 409 };
      const starts = guest ? await tx`SELECT * FROM gn_challenge_guest_starts WHERE challenge_id=${id}`
        : await tx`SELECT * FROM gn_challenge_starts WHERE challenge_id=${id} AND user_id=${viewer.userId}`;
      const start = starts[0];
      const token = typeof body.attemptToken === "string" ? Buffer.from(body.attemptToken) : Buffer.alloc(0);
      const expected = Buffer.from(String(start?.token ?? ""));
      if (!start || token.length !== expected.length || !timingSafeEqual(token, expected)) return { error: "invalid_attempt", status: 403 };
      const run = body as unknown as RunResult;
      if (run.durationMs > Date.now() - new Date(String(start.started_at)).getTime() + 10_000) return { error: "invalid_result", status: 400 };
      if (guest) await tx`INSERT INTO gn_challenge_guest_attempts (challenge_id,score,correct,total,best_streak,duration_ms)
        VALUES (${id},${run.score},${run.correct},${run.total},${run.bestStreak},${run.durationMs})`;
      else await tx`INSERT INTO gn_challenge_attempts (challenge_id,user_id,score,correct,total,best_streak,duration_ms)
        VALUES (${id},${viewer.userId},${run.score},${run.correct},${run.total},${run.bestStreak},${run.durationMs})`;
      const attempts = await tx`SELECT * FROM gn_challenge_attempts WHERE challenge_id=${id}`;
      const guestAttempts = row.guest_name ? await tx`SELECT * FROM gn_challenge_guest_attempts WHERE challenge_id=${id}` : [];
      const a = attempts.find((attempt) => attempt.user_id === row.challenger_id);
      let b = row.guest_name ? guestAttempts[0] : attempts.find((attempt) => attempt.user_id === row.opponent_id);
      if (bot) {
        const opponent = buildBotAttempt(config, row.bot_difficulty as Difficulty, String(row.bot_seed ?? ""), run.total);
        await tx`INSERT INTO gn_challenge_bot_attempts (challenge_id,score,correct,total,best_streak,duration_ms)
          VALUES (${id},${opponent.score},${opponent.correct},${opponent.total},${opponent.bestStreak},${opponent.durationMs})`;
        b = { score: opponent.score, correct: opponent.correct, total: opponent.total, duration_ms: opponent.durationMs };
      }
      if (a && b) {
        const compare = compareGeoAttempts({ score: Number(a.score), correct: Number(a.correct), durationMs: Number(a.duration_ms) },
          { score: Number(b.score), correct: Number(b.correct), durationMs: Number(b.duration_ms) });
        const winnerSide = compare > 0 ? "challenger" : compare < 0 ? "opponent" : null;
        const winnerId = compare > 0 ? row.challenger_id : compare < 0 ? row.opponent_id : null;
        await tx`UPDATE gn_challenges SET status='resolved',winner_id=${winnerId},winner_side=${winnerSide},resolved_at=now(),updated_at=now() WHERE id=${id}`;
        await notify(tx, row.challenger_id, row, "resolved");
        await notify(tx, row.opponent_id, row, "resolved");
      } else {
        const rivalId = participant(row, viewer) === "challenger" ? row.opponent_id : row.challenger_id;
        await notify(tx, rivalId, row, "opponent-finished", guest ? String(row.guest_name) : viewer.name);
      }
      return { ok: true };
    });
    if ("error" in response) return failure(response.error!, response.status);
    const challenge = await load(sql, id, viewer);
    return reply({ ok: true, resolved: challenge?.status === "resolved", challenge });
  });
}

export async function listGeoChallengeNotifications() {
  return safely(async () => {
    if (!isDbConfigured) return reply({ configured: false, notifications: [] });
    const session = await getSession();
    if (!session) return failure("unauthorized", 401);
    const sql = await getDb();
    // Effective deadlines do not depend on an open browser; transitions notify once.
    await sql.begin(async (tx) => expire(tx, session.uid));
    const rows = await sql`SELECT id,challenge_id,kind,actor_name,game_id,created_at,read_at FROM gn_challenge_notifications
      WHERE user_id=${session.uid} AND read_at IS NULL ORDER BY created_at DESC,id ASC LIMIT 50`;
    return reply({ notifications: rows.map((row) => ({ id: String(row.id), challengeId: String(row.challenge_id),
      kind: row.kind, actorName: String(row.actor_name), gameId: row.game_id, createdAt: date(row.created_at),
      readAt: row.read_at == null ? null : date(row.read_at) })) });
  });
}

export async function readGeoChallengeNotification(req: Request, { params }: RouteContext) {
  return safely(async () => {
    if (!isDbConfigured) return failure("not_configured", 503);
    const gate = await mutationGate(req, "notification-read");
    if (gate.response) return gate.response;
    const { id } = await params;
    if (id !== "all" && !/^[a-f0-9]{32}$/i.test(id)) return failure("not_found", 404);
    const sql = await getDb();
    const rows = await sql`UPDATE gn_challenge_notifications SET read_at=COALESCE(read_at,now())
      WHERE user_id=${gate.viewer.userId} AND (${id}='all' OR id=${id.toLowerCase()}) RETURNING id`;
    return rows.length || id === "all" ? reply({ ok: true }) : failure("not_found", 404);
  });
}
