import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {getSession,newId} from "@/lib/auth";
import {getDb,isDbConfigured} from "@/lib/db";
import {POKE_ROUND_COUNTS,viewerChallengeOutcome,type ChallengeStatus} from "@/poke/competition";
import {isPokeGameId} from "@/poke/registry";
import {ensureCurrentPokeSeason,requirePokeMutation} from "@/poke/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 if(!isDbConfigured)return NextResponse.json({configured:false,challenges:[]});
 const session=await getSession();
 if(!session)return NextResponse.json({error:"unauthorized"},{status:401});
 const sql=await getDb();
 await sql`UPDATE pn_challenges SET status='expired',updated_at=now() WHERE status IN ('pending','active') AND expires_at<=now()`;
 const rows=await sql`
  SELECT c.*,challenger.name AS challenger_name,opponent.name AS opponent_name,
   (SELECT COUNT(*)::int FROM pn_challenge_attempts a WHERE a.challenge_id=c.id) AS attempt_count
   ,EXISTS(SELECT 1 FROM pn_challenge_attempts mine WHERE mine.challenge_id=c.id AND mine.user_id=${session.uid}) AS viewer_attempted
  FROM pn_challenges c
  JOIN gn_users challenger ON challenger.id=c.challenger_id
  JOIN gn_users opponent ON opponent.id=c.opponent_id
  WHERE c.challenger_id=${session.uid} OR c.opponent_id=${session.uid}
  ORDER BY c.created_at DESC LIMIT 100
 `;
 return NextResponse.json({configured:true,challenges:rows.map((row)=>serialize(row,session.uid))});
}

export async function POST(req:Request){
 if(!isDbConfigured)return NextResponse.json({error:"not_configured"},{status:503});
 const gate=await requirePokeMutation(req,"challenge-create",10,60);
 if("error" in gate)return NextResponse.json({error:gate.error,retryAfter:gate.retryAfter},{status:gate.status});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return NextResponse.json({error:"bad_request"},{status:400})}
 const opponentName=String(body.opponentName??"").trim().slice(0,40);
 const gameId=String(body.gameId??"");
 const difficulty=String(body.difficulty??"");
 const generationCap=Number(body.generationCap);
 const rounds=Number(body.rounds);
 if(!opponentName||!isPokeGameId(gameId)||!["easy","medium","hard"].includes(difficulty)||!Number.isInteger(generationCap)||generationCap<1||generationCap>9||!POKE_ROUND_COUNTS.includes(rounds as 5|10|20))return NextResponse.json({error:"invalid_config"},{status:400});
 const sql=await getDb();
 const users=await sql<{id:string;name:string}[]>`SELECT id,name FROM gn_users WHERE name_lower=${opponentName.toLowerCase()} LIMIT 1`;
 const opponent=users[0];
 if(!opponent)return NextResponse.json({error:"unknown_trainer"},{status:404});
 if(opponent.id===gate.session.uid)return NextResponse.json({error:"self_challenge"},{status:400});
 const season=await ensureCurrentPokeSeason();
 const id=newId();
 const seed=`ranked:${randomBytes(24).toString("base64url")}`;
 const expiresAt=new Date(Date.now()+7*24*60*60*1000);
 await sql`
  INSERT INTO pn_challenges (id,challenger_id,opponent_id,season_id,game_id,difficulty,generation_cap,rounds,seed,expires_at)
  VALUES (${id},${gate.session.uid},${opponent.id},${season.id},${gameId},${difficulty},${generationCap},${rounds},${seed},${expiresAt})
 `;
 return NextResponse.json({ok:true,id,status:"pending",opponentName:opponent.name},{status:201});
}

function serialize(row:Record<string,unknown>,viewerId:string){
 const active=["active","resolved"].includes(String(row.status));
 const challenger=String(row.challenger_id)===viewerId;
 return {
  id:row.id,status:row.status,gameId:row.game_id,difficulty:row.difficulty,generationCap:row.generation_cap,rounds:row.rounds,
  challengerName:row.challenger_name,opponentName:challenger?row.opponent_name:row.challenger_name,
  direction:challenger?"sent":"received",seed:active?row.seed:null,winnerId:row.winner_id,
  attemptCount:row.attempt_count,expiresAt:row.expires_at,createdAt:row.created_at,resolvedAt:row.resolved_at,
  viewerAttempted:row.viewer_attempted,
  viewerOutcome:viewerChallengeOutcome(row.status as ChallengeStatus,row.winner_id?String(row.winner_id):null,viewerId),
 };
}
