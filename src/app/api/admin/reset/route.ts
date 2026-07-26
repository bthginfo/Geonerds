import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Token-protected leaderboard reset.
 * POST /api/admin/reset                         → wipes all scores
 * POST /api/admin/reset?users=1                 → also wipes user accounts
 * Send `Authorization: Bearer <ADMIN_RESET_TOKEN>` so the secret never appears
 * in browser history, proxy logs or analytics URLs.
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_RESET_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "not_enabled" }, { status: 403 });
  }
  const url = new URL(req.url);
  const authorization = req.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (
    expectedBytes.length !== providedBytes.length ||
    !timingSafeEqual(expectedBytes, providedBytes)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sql = await getDb();
  const wipeUsers = url.searchParams.get("users") === "1";

  if (wipeUsers) {
    // Clear competition rows in explicit FK order before account cascade.
    await sql`DELETE FROM pn_challenge_attempts`;
    await sql`DELETE FROM pn_scores`;
    await sql`DELETE FROM pn_challenges`;
    await sql`DELETE FROM pn_badge_awards`;
    await sql`DELETE FROM pn_ratings`;
    await sql`DELETE FROM pn_profiles`;
    await sql`DELETE FROM gn_scores`;
    await sql`DELETE FROM gn_users`;
  } else {
    await sql`DELETE FROM pn_challenge_attempts`;
    await sql`DELETE FROM pn_scores`;
    await sql`DELETE FROM pn_challenges`;
    await sql`DELETE FROM pn_badge_awards`;
    await sql`DELETE FROM pn_ratings`;
    await sql`DELETE FROM gn_scores`;
  }

  return NextResponse.json({ ok: true, wiped: wipeUsers ? "scores+users" : "scores" });
}
