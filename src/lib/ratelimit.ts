import { getDb, isDbConfigured } from "@/lib/db";

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds until the window resets
}

/**
 * Fixed-window rate limiter backed by Postgres (works across serverless
 * instances). Atomically increments a counter per bucket; once it exceeds
 * `max` within `windowSec`, requests are rejected until the window resets.
 */
export async function rateLimit(bucket: string, max: number, windowSec: number): Promise<RateResult> {
  if (!isDbConfigured) return { ok: true, retryAfter: 0 };
  const sql = await getDb();
  const rows = await sql<{ count: number; reset_at: string }[]>`
    INSERT INTO gn_rate_limit (bucket, count, reset_at)
    VALUES (${bucket}, 1, now() + ${windowSec} * interval '1 second')
    ON CONFLICT (bucket) DO UPDATE SET
      count = CASE WHEN gn_rate_limit.reset_at < now() THEN 1 ELSE gn_rate_limit.count + 1 END,
      reset_at = CASE WHEN gn_rate_limit.reset_at < now()
                      THEN now() + ${windowSec} * interval '1 second'
                      ELSE gn_rate_limit.reset_at END
    RETURNING count, reset_at
  `;
  const { count, reset_at } = rows[0];
  if (count > max) {
    const retryAfter = Math.max(1, Math.ceil((new Date(reset_at).getTime() - Date.now()) / 1000));
    return { ok: false, retryAfter };
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
