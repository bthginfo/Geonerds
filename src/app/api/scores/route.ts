import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { getSession, newId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GAME_IDS = new Set([
  "flags",
  "capitals",
  "outline",
  "trivia",
  "higher-lower",
  "map-click",
  "draw",
  "border-chain",
  "ranking",
  "languages",
  "pin",
  "route",
  "waters",
  "neighbors",
  "trace",
  "origin",
  "nameall",
  "mountains",
  "colorflag",
  "millionaire",
  "daily",
]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function int(v: unknown, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ configured: false, scores: [] });
  }
  const url = new URL(req.url);
  const game = url.searchParams.get("game");
  const period = url.searchParams.get("period"); // "month" | "all" (default)
  const limit = int(url.searchParams.get("limit") ?? 100, 1, 100);
  const offset = int(url.searchParams.get("offset") ?? 0, 0, 100000);
  const sql = await getDb();

  // Restrict to the current calendar month when requested.
  const monthFilter = period === "month";

  let scores;
  if (game && GAME_IDS.has(game)) {
    // Best run per user for this game.
    scores = await sql`
      SELECT name, game_id, difficulty, mode, score, correct, total, best_streak, duration_ms, created_at
      FROM (
        SELECT DISTINCT ON (user_id) *
        FROM gn_scores
        WHERE game_id = ${game}
        ${monthFilter ? sql`AND created_at >= date_trunc('month', now())` : sql``}
        ORDER BY user_id, score DESC, duration_ms ASC
      ) best
      ORDER BY score DESC, duration_ms ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    scores = await sql`
      SELECT name, game_id, difficulty, mode, score, correct, total, best_streak, duration_ms, created_at
      FROM gn_scores
      ${monthFilter ? sql`WHERE created_at >= date_trunc('month', now())` : sql``}
      ORDER BY score DESC, duration_ms ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return NextResponse.json({ configured: true, scores });
}

export async function POST(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const gameId = String(body.gameId ?? "");
  if (!GAME_IDS.has(gameId)) {
    return NextResponse.json({ error: "invalid_game" }, { status: 400 });
  }
  const difficulty = DIFFICULTIES.has(String(body.difficulty)) ? String(body.difficulty) : null;
  const mode = body.mode != null ? String(body.mode).slice(0, 16) : null;
  const score = int(body.score, 0, 10_000_000);
  const correct = int(body.correct, 0, 100_000);
  const total = int(body.total, 0, 100_000);
  const bestStreak = int(body.bestStreak, 0, 100_000);
  const durationMs = int(body.durationMs, 0, 86_400_000);

  const sql = await getDb();
  await sql`
    INSERT INTO gn_scores
      (id, user_id, name, game_id, difficulty, mode, score, correct, total, best_streak, duration_ms)
    VALUES
      (${newId()}, ${session.uid}, ${session.name}, ${gameId}, ${difficulty}, ${mode},
       ${score}, ${correct}, ${total}, ${bestStreak}, ${durationMs})
  `;
  return NextResponse.json({ ok: true });
}
