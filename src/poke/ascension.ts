import type {PokeCard} from "./cards";
import {SPECIES} from "./data";
import type {PokeDifficulty,Species} from "./types";
import {seededShuffle} from "./variety";

export type AscensionRouteKind="safe"|"research"|"elite";
export interface AscensionRoute{
 kind:AscensionRouteKind;
 opponent:Species;
 threat:number;
 reward:number;
 level:number;
}

export const speciesBst=(entry:Species)=>Object.values(entry.stats).reduce((sum,value)=>sum+value,0);
export const cardEnergyCost=(entry:Species)=>Math.max(entry.stats.attack,entry.stats.specialAttack)>=100?2:1;
export const cardBaseDamage=(entry:Species)=>Math.round(5+Math.max(entry.stats.attack,entry.stats.specialAttack)/8);
export const finishResonance=(finish:PokeCard["finish"])=>{
 if(finish==="gold")return{damage:3,block:2};
 if(finish==="special-art")return{damage:2,block:1};
 if(finish==="holo")return{damage:2,block:0};
 if(finish==="reverse-holo")return{damage:0,block:2};
 if(finish==="foil")return{damage:1,block:0};
 return{damage:0,block:0};
};

export function buildAscensionRoutes(
 generationCap:number,
 encounter:number,
 runSeed:string,
 deck:readonly PokeCard[],
 difficulty:PokeDifficulty,
 previousOpponentIds:readonly number[]=[],
):AscensionRoute[]{
 const deckEntries=deck.map((card)=>SPECIES.find((entry)=>entry.id===card.speciesId)).filter(Boolean) as Species[];
 const deckStrength=deckEntries.length?deckEntries.reduce((sum,entry)=>sum+speciesBst(entry),0)/deckEntries.length:420;
 const difficultyOffset=difficulty==="easy"?-70:difficulty==="hard"?35:0;
 const baseTarget=deckStrength+difficultyOffset+encounter*9;
 const kinds:AscensionRouteKind[]=["safe","research","elite"];
 const multipliers={safe:.82,research:1,elite:1.18};
 const used=new Set<number>();
 return kinds.map((kind)=>{
  const target=baseTarget*multipliers[kind];
  const shuffled=seededShuffle(
   SPECIES.filter((entry)=>entry.generation<=generationCap&&!entry.mythical&&!previousOpponentIds.slice(-1).includes(entry.id)),
   `${runSeed}:tower:${encounter}:${kind}`,
  );
  const band=[...shuffled].sort((a,b)=>Math.abs(speciesBst(a)-target)-Math.abs(speciesBst(b)-target));
  const opponent=band.find((entry)=>!used.has(entry.id))??band[0];
  if(!opponent)throw new Error("No eligible Binder Ascension opponent");
  used.add(opponent.id);
  const threat=Math.max(1,Math.min(5,Math.round((speciesBst(opponent)-deckStrength+180)/75)+(kind==="elite"?1:0)));
  return{kind,opponent,threat,reward:kind==="safe"?460:kind==="research"?610:920,level:speciesBst(opponent)};
 });
}
