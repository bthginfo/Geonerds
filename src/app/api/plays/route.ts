import { popularGames, recordPlayEvent } from "@/lib/play-stats-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = popularGames;
export const POST = recordPlayEvent;
