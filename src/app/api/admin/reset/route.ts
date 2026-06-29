import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Token-protected leaderboard reset.
 * POST /api/admin/reset?token=SECRET            → wipes all scores
 * POST /api/admin/reset?token=SECRET&users=1    → also wipes user accounts
 * The token must match the ADMIN_RESET_TOKEN environment variable.
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_RESET_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "not_enabled" }, { status: 403 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sql = await getDb();
  const wipeUsers = url.searchParams.get("users") === "1";

  if (wipeUsers) {
    // gn_scores cascades on user delete, but delete explicitly to be safe.
    await sql`DELETE FROM gn_scores`;
    await sql`DELETE FROM gn_users`;
  } else {
    await sql`DELETE FROM gn_scores`;
  }

  return NextResponse.json({ ok: true, wiped: wipeUsers ? "scores+users" : "scores" });
}
