import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { getSession, newId } from "@/lib/auth";
import { isWineGameId } from "@/wine/registry";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const int=(v:unknown,min:number,max:number)=>Math.min(max,Math.max(min,Math.round(Number(v)||0)));

export async function GET(){
 if(!isDbConfigured)return NextResponse.json({configured:false,scores:[]});
 const sql=await getDb();
 // Overall rank sums each player's best performance in every Wine game.
 const scores=await sql`
  SELECT name, SUM(best_score)::integer AS score, COUNT(*)::integer AS games
  FROM (
   SELECT DISTINCT ON (user_id, game_id) user_id, name, game_id, score AS best_score
   FROM wn_scores ORDER BY user_id, game_id, score DESC, duration_ms ASC
  ) best
  GROUP BY user_id, name ORDER BY score DESC LIMIT 100
 `;
 return NextResponse.json({configured:true,scores});
}
export async function POST(req:Request){
 if(!isDbConfigured)return NextResponse.json({error:"not_configured"},{status:503});
 const session=await getSession();if(!session)return NextResponse.json({error:"unauthorized"},{status:401});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return NextResponse.json({error:"bad_request"},{status:400})}
 const gameId=String(body.gameId??"");if(!isWineGameId(gameId))return NextResponse.json({error:"invalid_game"},{status:400});
 const difficulty=["easy","medium","hard"].includes(String(body.difficulty))?String(body.difficulty):null;
 const sql=await getDb();
 await sql`INSERT INTO wn_scores (id,user_id,name,game_id,difficulty,score,correct,total,duration_ms)
  VALUES (${newId()},${session.uid},${session.name},${gameId},${difficulty},${int(body.score,0,1000000)},${int(body.correct,0,1000)},${int(body.total,0,1000)},${int(body.durationMs,0,86400000)})`;
 return NextResponse.json({ok:true});
}
