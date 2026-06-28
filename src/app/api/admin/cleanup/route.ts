import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary maintenance endpoint: removes verification/test accounts.
export async function POST(req: Request) {
  const token = process.env.CLEANUP_TOKEN;
  if (!token || req.headers.get("x-cleanup-token") !== token) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isDbConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const sql = await getDb();
  const deleted = await sql`DELETE FROM gn_users WHERE name LIKE 'TestNerd_%' RETURNING id`;
  return NextResponse.json({ deletedUsers: deleted.length });
}
