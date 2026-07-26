import {SPECIES} from "./data";
export type CardRarity="common"|"uncommon"|"rare"|"ultra"|"mythic";
export interface PokeCard{id:string;speciesId:number;foil:boolean;rarity:CardRarity;generation:number;signature:string}
export const CARD_ODDS={common:55,uncommon:28,rare:12,ultra:4,mythic:1} as const;
export const BOOSTER_SIZE=5,BOOSTER_KEEP=2,BOOSTER_COST=60,GEN_UNLOCK_COST=100;
export function hashSeed(input:string){let value=2166136261;for(const char of input){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0}
export function seeded(seed:number){let value=seed>>>0;return()=>{value+=0x6d2b79f5;let result=value;result=Math.imul(result^result>>>15,result|1);result^=result+Math.imul(result^result>>>7,result|61);return((result^result>>>14)>>>0)/4294967296}}
export function rarityForRoll(roll:number):CardRarity{if(roll<.55)return"common";if(roll<.83)return"uncommon";if(roll<.95)return"rare";if(roll<.99)return"ultra";return"mythic"}
export function generateBooster(generation:number,seedText:string):PokeCard[]{
 const pool=SPECIES.filter((entry)=>entry.generation===generation);if(!pool.length)throw new Error(`No species for generation ${generation}`);
 const random=seeded(hashSeed(seedText));return Array.from({length:BOOSTER_SIZE},(_,slot)=>{const entry=pool[Math.floor(random()*pool.length)];const rarity=rarityForRoll(random());const foil=random()<.1;const total=Object.values(entry.stats).reduce((sum,value)=>sum+value,0);return{id:`${seedText}-${slot}`,speciesId:entry.id,foil,rarity,generation,signature:`BST ${total} · ${entry.stats.speed} SPD · ${entry.types.join("/")}`}});
}
export function validKeepSelection(cards:PokeCard[],ids:string[]){return ids.length===BOOSTER_KEEP&&new Set(ids).size===BOOSTER_KEEP&&ids.every((id)=>cards.some((card)=>card.id===id))}
export const cardVariantKey=(card:PokeCard)=>`${card.speciesId}:${card.foil?"foil":"standard"}`;
export const canSpendCredits=(balance:number,amount:number)=>Number.isFinite(balance)&&Number.isFinite(amount)&&amount>=0&&balance>=amount;
