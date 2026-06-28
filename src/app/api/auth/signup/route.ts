import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { hashPasscode, newId, setSessionCookie } from "@/lib/auth";
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
  const nameLower = name.toLowerCase();
  const existing = await sql`SELECT id FROM gn_users WHERE name_lower = ${nameLower} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "name_taken" }, { status: 409 });
  }

  const id = newId();
  await sql`
    INSERT INTO gn_users (id, name, name_lower, passcode_hash)
    VALUES (${id}, ${name}, ${nameLower}, ${hashPasscode(passcode)})
  `;
  await setSessionCookie(id, name);
  return NextResponse.json({ user: { id, name } });
}
