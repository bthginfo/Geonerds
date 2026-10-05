import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { validateName } from "@/lib/validate";

const PAGE_SIZE = 20;

function json(body: object, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie", ...headers },
  });
}

/** Signed-in challengers can browse public names, including accounts without any scores. */
export async function listGeoChallengeUsers(req: Request) {
  try {
    if (!isDbConfigured) return json({ configured: false, users: [], nextCursor: null });
    const session = await getSession();
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);

    const params = new URL(req.url).searchParams;
    const rawQuery = params.get("q") ?? "";
    const rawCursor = params.get("after") ?? "";
    const cursor = rawCursor ? validateName(rawCursor) : "";
    if (rawQuery.length > 20 || /[\u0000-\u001f\u007f]/u.test(rawQuery) || cursor === null) {
      return json({ ok: false, error: "invalid_request" }, 400);
    }

    const limit = await rateLimit(`geo:challenge-users:${session.uid}`, 120, 60);
    if (!limit.ok) {
      return json({ ok: false, error: "rate_limited", retryAfter: limit.retryAfter }, 429, { "Retry-After": String(limit.retryAfter) });
    }

    const sql = await getDb();
    const query = rawQuery.trim().toLowerCase();
    const after = cursor.toLowerCase();
    const rows = await sql<{ name: string }[]>`
      SELECT name FROM gn_users
      WHERE id <> ${session.uid}
        AND (${query} = '' OR strpos(name_lower, ${query}) > 0)
        AND (${after} = '' OR name_lower > ${after})
      ORDER BY name_lower ASC
      LIMIT ${PAGE_SIZE + 1}
    `;
    const users = rows.slice(0, PAGE_SIZE).map((row) => ({ name: row.name }));
    return json({
      configured: true,
      users,
      // Keep the original name: Unicode lowercasing can add combining characters.
      nextCursor: rows.length > PAGE_SIZE ? users[users.length - 1].name : null,
    });
  } catch (error) {
    console.error("Geo challenge user directory error", error instanceof Error ? error.name : "unknown");
    return json({ ok: false, error: "service_unavailable" }, 503);
  }
}
