import {getDb} from "@/lib/db";
import {getSession,newId} from "@/lib/auth";
import {clientIp,rateLimit} from "@/lib/ratelimit";
import {isPokeGameId} from "./registry";
import {isPlausibleRankedRun,POKE_ROUND_COUNTS,type PokeRoundCount,type RankedRunInput} from "./competition";
import type {PokeDifficulty} from "./types";

export interface CurrentSeason {id:string;title:string;startsAt:string;endsAt:string}

export function sameOriginMutation(req:Request):boolean {
 const origin=req.headers.get("origin");
 const host=req.headers.get("x-forwarded-host")??req.headers.get("host");
 if(origin&&host){
  try{return new URL(origin).host===host}catch{return false}
 }
 return req.headers.get("sec-fetch-site")!=="cross-site";
}

export async function requirePokeMutation(req:Request,bucket:string,max=30,windowSec=60){
 if(!sameOriginMutation(req))return {error:"invalid_origin" as const,status:403};
 const session=await getSession();
 if(!session)return {error:"unauthorized" as const,status:401};
 const limit=await rateLimit(`poke:${bucket}:${session.uid}:${clientIp(req)}`,max,windowSec);
 if(!limit.ok)return {error:"rate_limited" as const,status:429,retryAfter:limit.retryAfter};
 return {session};
}

export function currentSeasonWindow(now=new Date()){
 const year=now.getUTCFullYear();
 const quarter=Math.floor(now.getUTCMonth()/3);
 const start=new Date(Date.UTC(year,quarter*3,1));
 const end=new Date(Date.UTC(quarter===3?year+1:year,(quarter+1)*3,1));
 return {id:`${year}-Q${quarter+1}`,title:`Field League ${year} · Q${quarter+1}`,start,end};
}

export async function ensureCurrentPokeSeason(now=new Date()):Promise<CurrentSeason>{
 const sql=await getDb();
 const season=currentSeasonWindow(now);
 await sql`
  INSERT INTO pn_seasons (id,title,starts_at,ends_at)
  VALUES (${season.id},${season.title},${season.start},${season.end})
  ON CONFLICT (id) DO NOTHING
 `;
 return {id:season.id,title:season.title,startsAt:season.start.toISOString(),endsAt:season.end.toISOString()};
}

export function parseRankedRun(body:Record<string,unknown>,locked?:Partial<Pick<RankedRunInput,"gameId"|"difficulty"|"generationCap"|"selectedRounds">>):RankedRunInput|null {
 const gameId=String(locked?.gameId??body.gameId??"");
 const difficulty=String(locked?.difficulty??body.difficulty??"") as PokeDifficulty;
 const generationCap=Number(locked?.generationCap??body.generationCap);
 const selectedRounds=Number(locked?.selectedRounds??body.selectedRounds) as PokeRoundCount;
 const input:RankedRunInput={
  gameId:gameId as RankedRunInput["gameId"],
  difficulty,
  generationCap,
  selectedRounds,
  score:Number(body.score),
  correct:Number(body.correct),
  questions:Number(body.total??body.questions),
  completedRounds:Number(body.completedRounds),
  speciesIds:Array.isArray(body.speciesIds)?body.speciesIds.map(Number).filter((id)=>Number.isInteger(id)&&id>=1&&id<=1025).slice(0,200):[],
  durationMs:Number(body.durationMs),
 };
 if(!isPokeGameId(gameId)||!["easy","medium","hard"].includes(difficulty)||!POKE_ROUND_COUNTS.includes(selectedRounds)||!isPlausibleRankedRun(input))return null;
 return input;
}

export function validClientRunId(value:unknown):string|null {
 const id=String(value??"");
 return /^[a-zA-Z0-9-]{8,80}$/.test(id)?id:null;
}

export async function ensurePokeRating(userId:string,seasonId:string){
 const sql=await getDb();
 await sql`INSERT INTO pn_ratings (user_id,season_id) VALUES (${userId},${seasonId}) ON CONFLICT DO NOTHING`;
}

export async function awardPokeBadge(userId:string,badgeId:string,seasonId:string|null=null){
 const sql=await getDb();
 await sql`
  INSERT INTO pn_badge_awards (id,user_id,badge_id,season_id)
  VALUES (${newId()},${userId},${badgeId},${seasonId})
  ON CONFLICT DO NOTHING
 `;
}
