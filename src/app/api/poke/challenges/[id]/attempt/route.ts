import {NextResponse} from "next/server";
import {getDb,isDbConfigured} from "@/lib/db";
import {newId} from "@/lib/auth";
import {compareRankedRuns,eloPair,leagueTier,normalizedPokeRating,qualifiesAtlasClearance} from "@/poke/competition";
import {awardPokeBadge,parseRankedRun,requirePokeMutation,validClientRunId} from "@/poke/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!isDbConfigured)return NextResponse.json({error:"not_configured"},{status:503});
 const gate=await requirePokeMutation(req,"challenge-attempt",8,300);
 if("error" in gate)return NextResponse.json({error:gate.error,retryAfter:gate.retryAfter},{status:gate.status});
 const {id}=await params;
 let body:Record<string,unknown>;try{body=await req.json()}catch{return NextResponse.json({error:"bad_request"},{status:400})}
 const clientRunId=validClientRunId(body.clientRunId??body.id);
 if(!clientRunId||body.practice===true)return NextResponse.json({error:"invalid_run"},{status:400});
 const sql=await getDb();
 try{
  const outcome=await sql.begin(async(tx)=>{
   const challenges=await tx`SELECT * FROM pn_challenges WHERE id=${id} FOR UPDATE`;
   const challenge=challenges[0];
   if(!challenge||(challenge.challenger_id!==gate.session.uid&&challenge.opponent_id!==gate.session.uid))throw new ChallengeError("not_found",404);
   if(new Date(challenge.expires_at).getTime()<=Date.now()){
    await tx`UPDATE pn_challenges SET status='expired',updated_at=now() WHERE id=${id} AND status IN ('pending','active')`;
    return {error:"expired" as const,status:409};
   }
   if(challenge.status!=="active")throw new ChallengeError("not_active",409);
   const existing=await tx`SELECT id FROM pn_challenge_attempts WHERE challenge_id=${id} AND user_id=${gate.session.uid} LIMIT 1`;
   if(existing.length)throw new ChallengeError("duplicate_attempt",409);
   const run=parseRankedRun(body,{gameId:challenge.game_id,difficulty:challenge.difficulty,generationCap:challenge.generation_cap,selectedRounds:challenge.rounds});
   if(!run)throw new ChallengeError("invalid_or_impossible_run",400);
   const rating=normalizedPokeRating(run),scoreId=newId();
   const inserted=await tx`
    INSERT INTO pn_scores
     (id,client_run_id,user_id,season_id,game_id,difficulty,generation_cap,selected_rounds,completed_rounds,raw_score,normalized_rating,correct,total,duration_ms,challenge_id,verified,ranked)
    VALUES
     (${scoreId},${clientRunId},${gate.session.uid},${challenge.season_id},${challenge.game_id},${challenge.difficulty},${challenge.generation_cap},${challenge.rounds},${run.completedRounds},${run.score},${rating},${run.correct},${run.questions},${run.durationMs},${id},true,true)
    ON CONFLICT (user_id,client_run_id) DO NOTHING RETURNING id
   `;
   if(!inserted.length)throw new ChallengeError("duplicate_client_run",409);
   await tx`INSERT INTO pn_challenge_attempts (id,challenge_id,user_id,score_id) VALUES (${newId()},${id},${gate.session.uid},${scoreId})`;
   const attempts=await tx`
    SELECT a.user_id,s.normalized_rating,s.raw_score,s.correct,s.total,s.duration_ms,s.completed_rounds,s.selected_rounds,s.difficulty
    FROM pn_challenge_attempts a JOIN pn_scores s ON s.id=a.score_id WHERE a.challenge_id=${id} ORDER BY a.created_at
   `;
   const atlasClearance=qualifiesAtlasClearance(run);
   if(attempts.length<2)return {resolved:false,rating,seasonId:challenge.season_id,atlasClearance};
   const a=attempts[0],b=attempts[1];
   const compared=compareRankedRuns({score:a.raw_score,correct:a.correct,questions:a.total,durationMs:a.duration_ms,completedRounds:a.completed_rounds,selectedRounds:a.selected_rounds,difficulty:a.difficulty},{score:b.raw_score,correct:b.correct,questions:b.total,durationMs:b.duration_ms,completedRounds:b.completed_rounds,selectedRounds:b.selected_rounds,difficulty:b.difficulty});
   const winnerId=compared<0?a.user_id:compared>0?b.user_id:null;
   await tx`INSERT INTO pn_ratings (user_id,season_id) VALUES (${challenge.challenger_id},${challenge.season_id}),(${challenge.opponent_id},${challenge.season_id}) ON CONFLICT DO NOTHING`;
   const ratings=await tx`SELECT * FROM pn_ratings WHERE season_id=${challenge.season_id} AND user_id IN (${challenge.challenger_id},${challenge.opponent_id}) FOR UPDATE`;
   const challenger=ratings.find((row)=>row.user_id===challenge.challenger_id),opponent=ratings.find((row)=>row.user_id===challenge.opponent_id);
   if(!challenger||!opponent)throw new ChallengeError("rating_state_failed",500);
   const challengerOutcome=winnerId===null?.5:winnerId===challenge.challenger_id?1:0;
   const elo=eloPair(challenger.rating,opponent.rating,challengerOutcome,challenger.placements,opponent.placements);
   await updateRating(tx,challenger,elo.a,challengerOutcome);
   await updateRating(tx,opponent,elo.b,1-challengerOutcome);
   const resolved=await tx`UPDATE pn_challenges SET status='resolved',winner_id=${winnerId},resolved_at=now(),updated_at=now() WHERE id=${id} AND status='active' RETURNING id`;
   if(!resolved.length)throw new ChallengeError("resolution_conflict",409);
   return {resolved:true,rating,seasonId:challenge.season_id,atlasClearance,winnerId,ratings:{[challenger.user_id]:{rating:elo.a,tier:leagueTier(elo.a)},[opponent.user_id]:{rating:elo.b,tier:leagueTier(elo.b)}}};
  });
  if("error" in outcome)return NextResponse.json({error:outcome.error},{status:outcome.status});
  const postCommitAwards:Promise<unknown>[]=[];
  if(outcome.atlasClearance)postCommitAwards.push(awardPokeBadge(gate.session.uid,"regions-nine"));
  if(outcome.resolved){
   postCommitAwards.push(...Object.keys(outcome.ratings??{}).map((userId)=>awardResolutionBadges(userId,outcome.seasonId,outcome.winnerId===userId)));
  }
  await Promise.allSettled(postCommitAwards);
  return NextResponse.json({ok:true,verified:true,...outcome});
 }catch(error){
  if(error instanceof ChallengeError)return NextResponse.json({error:error.code},{status:error.status});
  throw error;
 }
}

async function updateRating(tx:any,row:any,rating:number,outcome:number){
 const won=outcome===1,lost=outcome===0,draw=outcome===.5;
 const streak=won?row.current_streak+1:0;
 await tx`
  UPDATE pn_ratings SET rating=${rating},wins=wins+${won?1:0},losses=losses+${lost?1:0},draws=draws+${draw?1:0},
   placements=LEAST(5,placements+1),current_streak=${streak},best_streak=GREATEST(best_streak,${streak}),matches=matches+1,updated_at=now()
  WHERE user_id=${row.user_id} AND season_id=${row.season_id}
 `;
}
async function awardResolutionBadges(userId:string,seasonId:string,won:boolean){
 await awardPokeBadge(userId,"social-first");
 if(won)await awardPokeBadge(userId,"social-win");
 await awardPokeBadge(userId,"season-participant",seasonId);
 const sql=await getDb();
 const ratings=await sql`SELECT rating,placements,current_streak FROM pn_ratings WHERE user_id=${userId} AND season_id=${seasonId} LIMIT 1`;
 const rating=ratings[0];
 if(rating){
  if(rating.placements>=5)await awardPokeBadge(userId,"league-placed",seasonId);
  const tier=leagueTier(rating.rating);
  for(const item of ["silver","gold","platinum","master"]){
   const order=["bronze","silver","gold","platinum","master"];
   if(order.indexOf(tier)>=order.indexOf(item))await awardPokeBadge(userId,`league-${item}`,seasonId);
  }
  for(const target of [3,5,10])if(rating.current_streak>=target)await awardPokeBadge(userId,`streak-${target}`,seasonId);
 }
 const rivals=await sql<{count:number}[]>`
  SELECT COUNT(DISTINCT CASE WHEN challenger_id=${userId} THEN opponent_id ELSE challenger_id END)::int AS count
  FROM pn_challenges WHERE status='resolved' AND (challenger_id=${userId} OR opponent_id=${userId})
 `;
 if((rivals[0]?.count??0)>=5)await awardPokeBadge(userId,"social-five");
 const rematches=await sql<{found:boolean}[]>`
  SELECT EXISTS(
   SELECT 1 FROM pn_challenges WHERE status='resolved' AND (challenger_id=${userId} OR opponent_id=${userId})
   GROUP BY LEAST(challenger_id,opponent_id),GREATEST(challenger_id,opponent_id) HAVING COUNT(*)>=2
  ) AS found
 `;
 if(rematches[0]?.found)await awardPokeBadge(userId,"social-rematch");
}
class ChallengeError extends Error{constructor(public code:string,public status:number){super(code)}}
