import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { sameGeoOrigin } from "@/lib/geo-challenge-server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { summarizeDistribution, validateRareQuery, validateRareSubmission, type RareError } from "@/games/rare-finds/validate";

const NO_STORE = { "Cache-Control": "no-store" };
/** One counted answer per prompt, day and client; long enough to cover the whole UTC day. */
const COUNT_WINDOW_SEC = 36 * 3600;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

const ERROR_STATUS: Record<RareError, number> = { bad_request: 400, invalid_day: 422, unknown_prompt: 422, invalid_answer: 422 };

function failure(error: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ ok: false, configured: true, error }, { status, headers: { ...NO_STORE, ...headers } });
}

async function readRows(day: string, promptIndex: number) {
  const sql = await getDb();
  const rows = await sql<{ answer: string; count: number }[]>`
    SELECT answer, count FROM gn_rare_answers
    WHERE day = ${day}::date AND prompt_index = ${promptIndex}
  `;
  return rows.map((row) => ({ answer: row.answer, count: Number(row.count) }));
}

/** Shared per-client request budget; the address is only hashed into a short-lived bucket. */
async function requestBudget(ipHash: string) {
  return rateLimit(`geo:rare-api:${ipHash}`, 120, 3600);
}

/** POST /api/rare-finds — counts one valid daily answer and returns that prompt's distribution. */
export async function recordRareAnswer(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ ok: false, configured: false }, { headers: NO_STORE });
  if (!sameGeoOrigin(req)) return failure("invalid_origin", 403);
  if (Number(req.headers.get("content-length") ?? 0) > 512) return failure("bad_request", 400);
  let body: unknown = null;
  try {
    const text = await req.text();
    body = text.length <= 512 ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  const parsed = validateRareSubmission(body);
  if (!parsed.ok) return failure(parsed.error, ERROR_STATUS[parsed.error]);
  const { day, promptIndex, answer } = parsed.value;
  try {
    const ipHash = hash(clientIp(req));
    const budget = await requestBudget(ipHash);
    if (!budget.ok) return failure("rate_limited", 429, { "Retry-After": String(budget.retryAfter) });
    // At most one counted answer per prompt and day per client; repeats only read.
    const once = await rateLimit(`geo:rare:${day}:${promptIndex}:${ipHash}`, 1, COUNT_WINDOW_SEC);
    if (once.ok) {
      const sql = await getDb();
      await sql`
        INSERT INTO gn_rare_answers (day, prompt_index, answer, count)
        VALUES (${day}::date, ${promptIndex}, ${answer}, 1)
        ON CONFLICT (day, prompt_index, answer) DO UPDATE SET count = gn_rare_answers.count + 1
      `;
    }
    const rows = await readRows(day, promptIndex);
    return NextResponse.json({ ok: true, configured: true, ...summarizeDistribution(rows, answer, once.ok) }, { headers: NO_STORE });
  } catch (error) {
    console.error("Rare finds error", error instanceof Error ? error.name : "unknown");
    return failure("service_unavailable", 503);
  }
}

/** GET /api/rare-finds?day=YYYY-MM-DD&prompt=0 — today's most common answers, without counting. */
export async function rareFindsDistribution(req: Request) {
  if (!isDbConfigured) return NextResponse.json({ ok: false, configured: false }, { headers: NO_STORE });
  if (!sameGeoOrigin(req)) return failure("invalid_origin", 403);
  const params = new URL(req.url).searchParams;
  const parsed = validateRareQuery(params.get("day"), params.get("prompt"));
  if (!parsed.ok) return failure(parsed.error, ERROR_STATUS[parsed.error]);
  try {
    const budget = await requestBudget(hash(clientIp(req)));
    if (!budget.ok) return failure("rate_limited", 429, { "Retry-After": String(budget.retryAfter) });
    const rows = await readRows(parsed.value.day, parsed.value.promptIndex);
    return NextResponse.json({ ok: true, configured: true, ...summarizeDistribution(rows, null, false) }, { headers: NO_STORE });
  } catch (error) {
    console.error("Rare finds error", error instanceof Error ? error.name : "unknown");
    return failure("service_unavailable", 503);
  }
}
