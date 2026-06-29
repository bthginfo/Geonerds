import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { verifyPasscode, setSessionCookie } from "@/lib/auth";
import { validateName, validatePasscode } from "@/lib/validate";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "rate_limited", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function POST(req: Request) {
  if (!isDbConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  let body: { name?: unknown; passcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const name = validateName(body.name);
  const passcode = validatePasscode(body.passcode);
  if (!name || !passcode) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Throttle: per-IP (broad) and per-account (targeted brute force).
  const ip = clientIp(req);
  const ipLimit = await rateLimit(`login:ip:${ip}`, 20, 600);
  if (!ipLimit.ok) return tooMany(ipLimit.retryAfter);
  const acctLimit = await rateLimit(`login:acct:${name.toLowerCase()}`, 8, 600);
  if (!acctLimit.ok) return tooMany(acctLimit.retryAfter);

  const sql = await getDb();
  const rows = await sql`
    SELECT id, name, passcode_hash FROM gn_users WHERE name_lower = ${name.toLowerCase()} LIMIT 1
  `;
  const user = rows[0];
  if (!user || !verifyPasscode(passcode, user.passcode_hash)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await setSessionCookie(user.id, user.name);
  return NextResponse.json({ user: { id: user.id, name: user.name } });
}
