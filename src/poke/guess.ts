import {SPECIES} from "./data";
import type {PokeDifficulty,Species} from "./types";
import {seededShuffle} from "./variety";

export type GuessScope="all"|number;

export function normalizePokemonName(value:string){
 return value.trim().toLocaleLowerCase()
  .replaceAll("♀"," female ")
  .replaceAll("♂"," male ")
  .replaceAll("ß","ss")
  .normalize("NFD")
  .replace(/\p{M}/gu,"")
  .replace(/[\p{P}\p{Z}\p{S}]+/gu,"");
}

export function matchesSpeciesName(value:string,target:Species){
 const normalized=normalizePokemonName(value);
 return normalized.length>0&&[target.name.en,target.name.de].some((name)=>normalizePokemonName(name)===normalized);
}

export function buildGuessTargets(generationCap:number,scope:GuessScope,count:number,runSeed:string){
 const pool=SPECIES.filter((entry)=>scope==="all"?entry.generation<=generationCap:entry.generation===scope);
 return seededShuffle(pool,`${runSeed}:guess-targets:${scope}`).slice(0,count);
}

export function buildGuessOptions(target:Species,difficulty:Exclude<PokeDifficulty,"hard">,runSeed:string,round:number){
 const candidates=seededShuffle(SPECIES.filter((entry)=>entry.generation===target.generation&&entry.id!==target.id),`${runSeed}:guess-options:${round}`);
 const similarity=(entry:Species)=>{
  const sharedType=entry.types.some((type)=>target.types.includes(type))?4:0;
  const color=entry.color===target.color?3:0,shape=entry.shape===target.shape?3:0;
  const height=Math.abs(entry.heightM-target.heightM)<=Math.max(.4,target.heightM*.35)?2:0;
  return sharedType+color+shape+height;
 };
 const distractors=difficulty==="medium"?[...candidates].sort((a,b)=>similarity(b)-similarity(a)).slice(0,3):candidates.slice(0,3);
 return seededShuffle([target,...distractors],`${runSeed}:guess-order:${round}`);
}
