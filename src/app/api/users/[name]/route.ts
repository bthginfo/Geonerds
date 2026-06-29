import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ configured: false, found: false });
  }
  const raw = new URL(req.url).pathname.split("/").pop() || "";
  const name = decodeURIComponent(raw).slice(0, 40);
  if (!name) return NextResponse.json({ configured: true, found: false });

  const sql = await getDb();

  const totals = await sql<{ total: number; runs: number; streak: number; display: string | null }[]>`
    SELECT
      COALESCE(SUM(score), 0)::int AS total,
      COUNT(*)::int AS runs,
      COALESCE(MAX(best_streak), 0)::int AS streak,
      MAX(name) AS display
    FROM gn_scores
    WHERE lower(name) = lower(${name})
  `;
  const t = totals[0];
  if (!t || t.runs === 0) {
    return NextResponse.json({ configured: true, found: false });
  }

  const games = await sql<{ game_id: string; best: number; runs: number }[]>`
    SELECT game_id, MAX(score)::int AS best, COUNT(*)::int AS runs
    FROM gn_scores
    WHERE lower(name) = lower(${name})
    GROUP BY game_id
    ORDER BY best DESC
  `;

  return NextResponse.json({
    configured: true,
    found: true,
    profile: {
      name: t.display ?? name,
      totalScore: t.total,
      totalRuns: t.runs,
      bestStreak: t.streak,
      games,
    },
  });
}
