"use client";

import type {PokeDifficulty,PokeGameId,PokeRun} from "./types";

export interface PokeSeason{id:string;title:string;startsAt:string;endsAt:string}
export interface PokeChallenge{
 id:string;status:"pending"|"active"|"resolved"|"declined"|"cancelled"|"expired";gameId:PokeGameId;difficulty:PokeDifficulty;generationCap:number;rounds:5|10|20;
 challengerName:string;opponentName:string;direction:"sent"|"received";seed:string|null;winnerId?:string|null;viewerId?:string;challengerId?:string;opponentId?:string;
 attemptCount?:number;viewerAttempted?:boolean;viewerOutcome?:"win"|"loss"|"draw"|null;attempts?:Array<{user_id:string;name:string;rating:number;score:number;correct:number;total:number;duration_ms:number}>;expiresAt:string;createdAt:string;resolvedAt?:string|null;
}
export interface PokeLeaderboardRow{name:string;user_id:string;rank:number;rating:number;tier:string;wins?:number;losses?:number;draws?:number;placements?:number;current_streak?:number;matches?:number;games?:number;correct?:number;total?:number;duration_ms?:number;verified?:boolean;movement?:number}
export interface PokeOnlineProfile{name:string;avatarSpeciesId:number;favoriteType:string;bio:string;featuredBadgeIds:string[];visibility:"public"|"private";season:PokeSeason;rating:{rating:number;tier:string;wins:number;losses:number;draws:number;placements:number;current_streak:number;best_streak:number;matches:number};awards:Array<{badge_id:string;earned_at:string;season_id:string|null}>;activity:Array<Record<string,unknown>>}

async function request<T>(url:string,init?:RequestInit):Promise<T&{error?:string}>{
 try{
  const response=await fetch(url,{cache:"no-store",...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
  const data=await response.json().catch(()=>({}));
  return {...data,ok:response.ok} as T&{error?:string};
 }catch{return {error:"offline",ok:false} as unknown as T&{error?:string}}
}
const post=(url:string,body:unknown,method="POST")=>request<any>(url,{method,body:JSON.stringify(body)});

export function apiSubmitPokeScore(run:PokeRun){return post("/api/poke/scores",{...run,clientRunId:run.id}) as Promise<{ok:boolean;rating?:number;error?:string}>}
export function getPokeSeason(){return request<{configured:boolean;season:PokeSeason|null}>("/api/poke/seasons/current")}
export function getPokeLeaderboard(params:URLSearchParams){return request<{configured:boolean;season:PokeSeason;rows:PokeLeaderboardRow[];currentUser:PokeLeaderboardRow|null}>(`/api/poke/leaderboard?${params}`)}
export function getPokeChallenges(){return request<{configured:boolean;challenges:PokeChallenge[]}>("/api/poke/challenges")}
export function getPokeChallenge(id:string){return request<{configured:boolean;challenge:PokeChallenge|null}>(`/api/poke/challenges/${encodeURIComponent(id)}`)}
export function createPokeChallenge(body:{opponentName:string;gameId:PokeGameId;difficulty:PokeDifficulty;generationCap:number;rounds:5|10|20}){return post("/api/poke/challenges",body) as Promise<{ok:boolean;id?:string;error?:string}>}
export function actOnPokeChallenge(id:string,action:"accept"|"decline"|"cancel"){return post(`/api/poke/challenges/${encodeURIComponent(id)}`,{action},"PATCH") as Promise<{ok:boolean;status?:string;error?:string}>}
export function submitPokeChallengeAttempt(id:string,run:PokeRun){return post(`/api/poke/challenges/${encodeURIComponent(id)}/attempt`,{...run,clientRunId:run.id}) as Promise<{ok:boolean;resolved?:boolean;error?:string}>}
export function getPokeProfile(){return request<{configured:boolean;profile:PokeOnlineProfile|null}>("/api/poke/profile")}
export function updatePokeProfile(body:Pick<PokeOnlineProfile,"avatarSpeciesId"|"favoriteType"|"bio"|"featuredBadgeIds"|"visibility">){return post("/api/poke/profile",body,"PATCH") as Promise<{ok:boolean;profile?:PokeOnlineProfile;error?:string}>}
export function getPublicPokeProfile(name:string){return request<{configured:boolean;found:boolean;private?:boolean;profile?:any}>(`/api/poke/users/${encodeURIComponent(name)}`)}
