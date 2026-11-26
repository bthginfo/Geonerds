import { rareFindsDistribution, recordRareAnswer } from "@/lib/rare-finds-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = rareFindsDistribution;
export const POST = recordRareAnswer;
