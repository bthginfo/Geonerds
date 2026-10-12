import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { validateName } from "@/lib/validate";
import { publicProfileFromAggregates } from "@/lib/public-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function GET(req: Request) {
  if (!isDbConfigured) {
    return reply({ configured: false, found: false });
  }
  let name: string | null;
  try {
    const raw = new URL(req.url).pathname.split("/").pop() || "";
    name = validateName(decodeURIComponent(raw));
  } catch {
    return reply({ configured: true, found: false });
  }
  if (!name) return reply({ configured: true, found: false });

  try {
    const sql = await getDb();
    const profile = await sql.begin("isolation level repeatable read read only", async (tx) => {
      const users = await tx`SELECT id,name FROM gn_users WHERE name_lower=${name.toLowerCase()} LIMIT 1`;
      const user = users[0];
      if (!user) return null;
      const uid = String(user.id);
      const [totals, games, awards] = await Promise.all([
        tx`SELECT COALESCE(SUM(score),0) AS total, COUNT(*) AS runs,
          COALESCE(MAX(score),0) AS max_score, COALESCE(MAX(best_streak),0) AS streak,
          COUNT(*) FILTER (WHERE total>0 AND correct=total) AS perfect,
          COUNT(*) FILTER (WHERE total>=25 AND correct=total) AS big_perfect,
          COUNT(*) FILTER (WHERE difficulty='hard' AND correct>0) AS hard_runs,
          COUNT(*) FILTER (WHERE difficulty='hard' AND total>0 AND correct=total) AS hard_perfect,
          COUNT(*) FILTER (WHERE mode='type') AS type_runs,
          COUNT(DISTINCT (created_at AT TIME ZONE 'UTC')::date) AS days
          FROM gn_scores WHERE user_id=${uid}`,
        tx`SELECT game_id, MAX(score) AS best, COUNT(*) AS runs,
          COALESCE(SUM(correct),0) AS correct, COALESCE(MAX(best_streak),0) AS streak,
          COALESCE(MAX(total),0) AS max_total,
          COUNT(*) FILTER (WHERE total>0 AND correct=total) AS perfect,
          COUNT(*) FILTER (WHERE difficulty='hard') AS hard_runs,
          COUNT(*) FILTER (WHERE difficulty='hard' AND total>0 AND correct=total) AS hard_perfect,
          COUNT(*) FILTER (WHERE strpos(mode,'flawless')>0) AS flawless
          FROM gn_scores WHERE user_id=${uid} GROUP BY game_id ORDER BY best DESC,game_id ASC`,
        tx`SELECT badge_id FROM gn_badge_awards WHERE user_id=${uid}`,
      ]);
      return publicProfileFromAggregates(String(user.name), totals[0] ?? {}, games, awards);
    });
    return profile ? reply({ configured: true, found: true, profile }) : reply({ configured: true, found: false });
  } catch (error) {
    console.error("Public profile service error", error instanceof Error ? error.name : "unknown");
    return reply({ configured: true, found: false, error: "service_unavailable" }, 503);
  }
}
