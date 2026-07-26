import {NextResponse} from "next/server";
import {getDb,isDbConfigured} from "@/lib/db";
import {newId} from "@/lib/auth";
import {normalizedPokeRating,qualifiesAtlasClearance} from "@/poke/competition";
import {awardPokeBadge,ensureCurrentPokeSeason,parseRankedRun,requirePokeMutation,validClientRunId} from "@/poke/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 if(!isDbConfigured)return NextResponse.json({error:"not_configured"},{status:503});
 const gate=await requirePokeMutation(req,"score",20,60);
 if("error" in gate)return NextResponse.json({error:gate.error,retryAfter:gate.retryAfter},{status:gate.status});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return NextResponse.json({error:"bad_request"},{status:400})}
 if(body.practice===true)return NextResponse.json({error:"practice_not_ranked"},{status:400});
 const clientRunId=validClientRunId(body.clientRunId??body.id);
 const run=parseRankedRun(body);
 if(!clientRunId||!run)return NextResponse.json({error:"invalid_or_impossible_run"},{status:400});
 const season=await ensureCurrentPokeSeason();
 const rating=normalizedPokeRating(run);
 const sql=await getDb();
 const inserted=await sql<{id:string}[]>`
  INSERT INTO pn_scores
   (id,client_run_id,user_id,season_id,game_id,difficulty,generation_cap,selected_rounds,completed_rounds,raw_score,normalized_rating,correct,total,duration_ms,verified,ranked)
  VALUES
   (${newId()},${clientRunId},${gate.session.uid},${season.id},${run.gameId},${run.difficulty},${run.generationCap},${run.selectedRounds},${run.completedRounds},${run.score},${rating},${run.correct},${run.questions},${run.durationMs},false,true)
  ON CONFLICT (user_id,client_run_id) DO NOTHING
  RETURNING id
 `;
 if(!inserted.length){
  const existing=await sql<{normalized_rating:number}[]>`SELECT normalized_rating FROM pn_scores WHERE user_id=${gate.session.uid} AND client_run_id=${clientRunId} LIMIT 1`;
  return NextResponse.json({ok:true,duplicate:true,rating:existing[0]?.normalized_rating??rating});
 }
 const awards:Promise<unknown>[]=[awardPokeBadge(gate.session.uid,"season-participant",season.id)];
 if(run.correct===run.questions){
  awards.push(awardPokeBadge(gate.session.uid,"accuracy-first"));
  if(run.selectedRounds===10&&run.completedRounds===10)awards.push(awardPokeBadge(gate.session.uid,"accuracy-perfect-10"));
  if(run.difficulty==="hard"&&run.completedRounds===run.selectedRounds)awards.push(awardPokeBadge(gate.session.uid,"accuracy-hard"));
 }
 if(rating>=1000)awards.push(awardPokeBadge(gate.session.uid,"specialist"));
 if(qualifiesAtlasClearance(run))awards.push(awardPokeBadge(gate.session.uid,"regions-nine"));
 if(run.gameId==="type-clash-arena"&&run.completedRounds===run.selectedRounds){
  awards.push(awardPokeBadge(gate.session.uid,"circuit-1"));
  if(run.selectedRounds>=10)awards.push(awardPokeBadge(gate.session.uid,"circuit-10"));
  if(run.selectedRounds===20)awards.push(awardPokeBadge(gate.session.uid,"circuit-20"));
 }
 await Promise.allSettled(awards);
 return NextResponse.json({ok:true,rating,verified:false,label:"account_linked"});
}
