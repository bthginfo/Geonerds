import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { verifyPasscode, setSessionCookie } from "@/lib/auth";
import { validateName, validatePasscode } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
