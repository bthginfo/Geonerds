import {speciesRarity} from "./cards";
import {SPECIES} from "./data";
import type {Species} from "./types";
import {seededRandom} from "./variety";

export type CaptureTier="common"|"uncommon"|"rare"|"ultra"|"legendary";
export type ThrowQuality="miss"|"nice"|"great"|"excellent";
export type CaptureBall="field"|"advanced";

export interface ThrowMetrics{accuracy:number;ring:number;direction:number;speed:number;curve:boolean}
export interface CaptureAttempt{
 speciesId:number;tier:CaptureTier;quality:ThrowQuality;curve:boolean;ball:CaptureBall;berry:boolean;attempt:number;seed:string;
}

const TIER_WEIGHTS:Record<CaptureTier,number>={common:62,uncommon:27,rare:8,ultra:2.4,legendary:.6};
const BASE_CATCH:Record<CaptureTier,number>={common:.64,uncommon:.49,rare:.34,ultra:.22,legendary:.11};
const tierCache=new Map<number,CaptureTier>();
const encounterPools=new Map<number,{pool:Species[];groups:Record<CaptureTier,Species[]>}>();

export function captureTierForSpecies(entry:Species):CaptureTier{
 const cached=tierCache.get(entry.id);if(cached)return cached;
 let tier:CaptureTier;
 if(entry.legendary||entry.mythical)tier="legendary";
 else{
 const rarity=speciesRarity(entry);
  if(rarity==="epic")tier="ultra";
  else if(rarity==="rare")tier="rare";
  else if(rarity==="uncommon")tier="uncommon";
  else tier="common";
 }
 tierCache.set(entry.id,tier);return tier;
}

export function generateCaptureEncounters(generationCap:number,count:number,seed:string){
 let cached=encounterPools.get(generationCap);
 if(!cached){
  const pool=SPECIES.filter((entry)=>entry.generation<=generationCap);
  const groups=Object.fromEntries((Object.keys(TIER_WEIGHTS) as CaptureTier[]).map((tier)=>[tier,pool.filter((entry)=>captureTierForSpecies(entry)===tier)])) as Record<CaptureTier,Species[]>;
  cached={pool,groups};encounterPools.set(generationCap,cached);
 }
 const{pool,groups}=cached;
 const random=seededRandom(`${seed}:encounters`),tiers=Object.keys(TIER_WEIGHTS) as CaptureTier[],result:Species[]=[];
 for(let index=0;index<count;index++){
  const roll=random()*100;let cumulative=0,tier:CaptureTier="common";
  for(const candidate of tiers){cumulative+=TIER_WEIGHTS[candidate];if(roll<cumulative){tier=candidate;break}}
  let candidates=groups[tier];
  if(!candidates.length)candidates=pool;
  let chosen=candidates[Math.floor(random()*candidates.length)]??pool[0];
  if(chosen?.id===result.at(-1)?.id&&candidates.length>1)chosen=candidates[(candidates.indexOf(chosen)+1+Math.floor(random()*(candidates.length-1)))%candidates.length];
  if(chosen)result.push(chosen);
 }
 return result;
}

export function classifyThrow(metrics:ThrowMetrics):ThrowQuality{
 if(metrics.direction<.28||metrics.accuracy<.34)return"miss";
 if(metrics.accuracy>=.84&&metrics.ring<=.46&&metrics.speed>=.14)return"excellent";
 if(metrics.accuracy>=.64&&metrics.ring<=.72&&metrics.speed>=.09)return"great";
 return"nice";
}

export function captureChance(input:Omit<CaptureAttempt,"speciesId"|"attempt"|"seed">){
 if(input.quality==="miss")return 0;
 const quality={nice:.05,great:.14,excellent:.25,miss:0}[input.quality];
 const curve=input.curve?.06:0,ball=input.ball==="advanced"?1.35:1,berry=input.berry?1.24:1;
 return Math.min(.92,(BASE_CATCH[input.tier]+quality+curve)*ball*berry);
}

export function resolveCaptureAttempt(input:CaptureAttempt){
 const chance=captureChance(input),caught=seededRandom(`${input.seed}:catch:${input.speciesId}:${input.attempt}:${input.quality}:${input.curve}:${input.ball}:${input.berry}`)()<chance;
 const fleeBase:Record<CaptureTier,number>={common:.035,uncommon:.06,rare:.1,ultra:.16,legendary:.23};
 const fled=!caught&&input.quality!=="miss"&&seededRandom(`${input.seed}:flee:${input.speciesId}:${input.attempt}`)()<Math.min(.7,fleeBase[input.tier]+Math.max(0,input.attempt-1)*.08);
 return{caught,fled,chance};
}

export function captureTelemetry(tier:CaptureTier,ball:CaptureBall,berry:boolean){
 const chance=captureChance({tier,quality:"nice",curve:false,ball,berry});
 return chance>=.68?"high":chance>=.42?"steady":"low";
}

export const captureTierWeight=(tier:CaptureTier)=>TIER_WEIGHTS[tier];
