import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {getDb,isDbConfigured} from "@/lib/db";
import {canTransitionChallenge,type ChallengeStatus} from "@/poke/competition";
import {requirePokeMutation} from "@/poke/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function load(id:string,userId:string){
 const sql=await getDb();
 const rows=await sql`
  SELECT c.*,challenger.name AS challenger_name,opponent.name AS opponent_name
  FROM pn_challenges c JOIN gn_users challenger ON challenger.id=c.challenger_id JOIN gn_users opponent ON opponent.id=c.opponent_id
  WHERE c.id=${id} AND (c.challenger_id=${userId} OR c.opponent_id=${userId}) LIMIT 1
 `;
 if(!rows[0])return null;
 if(["pending","active"].includes(rows[0].status)&&new Date(rows[0].expires_at).getTime()<=Date.now()){
  const expired=await sql<{status:string}[]>`UPDATE pn_challenges SET status='expired',updated_at=now() WHERE id=${id} AND status IN ('pending','active') AND expires_at<=now() RETURNING status`;
  if(expired.length)rows[0].status="expired";
  else{
   const current=await sql<{status:string}[]>`SELECT status FROM pn_challenges WHERE id=${id} LIMIT 1`;
   if(current[0])rows[0].status=current[0].status;
  }
 }
 const attempts=await sql`
  SELECT a.user_id,s.normalized_rating AS rating,s.raw_score AS score,s.correct,s.total,s.duration_ms,u.name
  FROM pn_challenge_attempts a JOIN pn_scores s ON s.id=a.score_id JOIN gn_users u ON u.id=a.user_id
  WHERE a.challenge_id=${id} ORDER BY a.created_at
 `;
 const row=rows[0],challenger=row.challenger_id===userId;
 return {id:row.id,status:row.status,gameId:row.game_id,difficulty:row.difficulty,generationCap:row.generation_cap,rounds:row.rounds,seed:["active","resolved"].includes(row.status)?row.seed:null,challengerName:row.challenger_name,opponentName:challenger?row.opponent_name:row.challenger_name,direction:challenger?"sent":"received",winnerId:row.winner_id,viewerId:userId,challengerId:row.challenger_id,opponentId:row.opponent_id,expiresAt:row.expires_at,createdAt:row.created_at,resolvedAt:row.resolved_at,attemptCount:attempts.length,viewerAttempted:attempts.some((attempt)=>attempt.user_id===userId),attempts};
}

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(!isDbConfigured)return NextResponse.json({configured:false,challenge:null});
 const session=await getSession();if(!session)return NextResponse.json({error:"unauthorized"},{status:401});
 const {id}=await params;
 const challenge=await load(id,session.uid);
 if(!challenge)return NextResponse.json({error:"not_found"},{status:404});
 return NextResponse.json({configured:true,challenge});
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!isDbConfigured)return NextResponse.json({error:"not_configured"},{status:503});
 const gate=await requirePokeMutation(req,"challenge-action",20,60);
 if("error" in gate)return NextResponse.json({error:gate.error,retryAfter:gate.retryAfter},{status:gate.status});
 const {id}=await params;
 let body:{action?:unknown};try{body=await req.json()}catch{return NextResponse.json({error:"bad_request"},{status:400})}
 const action=String(body.action) as "accept"|"decline"|"cancel";
 if(!["accept","decline","cancel"].includes(action))return NextResponse.json({error:"invalid_action"},{status:400});
 const sql=await getDb();
 const rows=await sql`SELECT * FROM pn_challenges WHERE id=${id} LIMIT 1`;
 const row=rows[0];
 if(!row||(row.challenger_id!==gate.session.uid&&row.opponent_id!==gate.session.uid))return NextResponse.json({error:"not_found"},{status:404});
 const expired=new Date(row.expires_at).getTime()<=Date.now();
 const next=canTransitionChallenge(row.status as ChallengeStatus,action,expired);
 if(!next){
  if(expired&&["pending","active"].includes(row.status))await sql`UPDATE pn_challenges SET status='expired',updated_at=now() WHERE id=${id}`;
  return NextResponse.json({error:expired?"expired":"invalid_transition"},{status:409});
 }
 if((action==="accept"||action==="decline")&&row.opponent_id!==gate.session.uid)return NextResponse.json({error:"forbidden"},{status:403});
 if(action==="cancel"&&row.challenger_id!==gate.session.uid)return NextResponse.json({error:"forbidden"},{status:403});
 const updated=await sql<{status:string}[]>`
  UPDATE pn_challenges
  SET status=${next},accepted_at=${next==="active"?new Date():null},updated_at=now()
  WHERE id=${id} AND status='pending' AND expires_at>now()
    AND ${action==="cancel"?sql`challenger_id=${gate.session.uid}`:sql`opponent_id=${gate.session.uid}`}
  RETURNING status
 `;
 if(!updated.length){
  const current=await sql<{status:string;expired:boolean}[]>`SELECT status,(expires_at<=now()) AS expired FROM pn_challenges WHERE id=${id} LIMIT 1`;
  if(current[0]?.expired&&["pending","active"].includes(current[0].status))await sql`UPDATE pn_challenges SET status='expired',updated_at=now() WHERE id=${id} AND status IN ('pending','active') AND expires_at<=now()`;
  return NextResponse.json({error:current[0]?.expired?"expired":"transition_conflict"},{status:409});
 }
 return NextResponse.json({ok:true,status:next});
}
