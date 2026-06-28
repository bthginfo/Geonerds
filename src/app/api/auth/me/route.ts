import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    configured: isDbConfigured,
    user: session ? { id: session.uid, name: session.name } : null,
  });
}
