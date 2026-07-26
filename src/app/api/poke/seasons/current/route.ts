import {NextResponse} from "next/server";
import {isDbConfigured} from "@/lib/db";
import {ensureCurrentPokeSeason} from "@/poke/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 if(!isDbConfigured)return NextResponse.json({configured:false,season:null});
 return NextResponse.json({configured:true,season:await ensureCurrentPokeSeason()});
}
