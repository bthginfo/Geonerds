import {SPECIES,SPECIES_BY_ID} from "./data";
import type {Species} from "./types";

export type CardRarity="common"|"uncommon"|"rare"|"epic"|"legendary"|"mythical";
export type CardFinish="standard"|"foil"|"reverse-holo"|"holo"|"special-art"|"gold";
export type CardArtVariant="official-artwork"|"home-render"|"shiny-official-artwork";
export type CardArtSource="pokeapi-official-artwork"|"pokeapi-home-render"|"pokeapi-shiny-official-artwork";
export interface PokeCard{id:string;speciesId:number;finish:CardFinish;rarity:CardRarity;generation:number;signature:string;artVariant:CardArtVariant;artSource:CardArtSource;artworkUrl:string;foil?:boolean}
export const CARD_ODDS={common:43,uncommon:28,rare:17,epic:8,legendary:3,mythical:1} as const;
export const FINISH_ODDS={standard:60,foil:20,"reverse-holo":12,holo:6,"special-art":1.5,gold:.5} as const;
export const BOOSTER_SIZE=5,BOOSTER_KEEP=2,BOOSTER_COST=60,GEN_UNLOCK_COST=100;

export function hashSeed(input:string){let value=2166136261;for(const char of input){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0}
export function seeded(seed:number){let value=seed>>>0;return()=>{value+=0x6d2b79f5;let result=value;result=Math.imul(result^result>>>15,result|1);result^=result+Math.imul(result^result>>>7,result|61);return((result^result>>>14)>>>0)/4294967296}}
const bst=(entry:Species)=>Object.values(entry.stats).reduce((sum,value)=>sum+value,0);
const hasEvolution=(id:number)=>SPECIES.some((entry)=>entry.evolvesFrom===id);

/** Stable fan-project taxonomy: canonical legendary/mythical flags first, then evolution position and BST. */
export function speciesRarity(entry:Species):CardRarity{
 if(entry.mythical)return"mythical";if(entry.legendary)return"legendary";const total=bst(entry);
 if(total>=570)return"epic";if(total>=510||(!hasEvolution(entry.id)&&entry.evolvesFrom!==null&&total>=480))return"rare";if(entry.evolvesFrom!==null||total>=430)return"uncommon";return"common";
}
export function rarityForRoll(roll:number):CardRarity{if(roll<.43)return"common";if(roll<.71)return"uncommon";if(roll<.88)return"rare";if(roll<.96)return"epic";if(roll<.99)return"legendary";return"mythical"}
export function finishForRoll(roll:number):CardFinish{if(roll<.6)return"standard";if(roll<.8)return"foil";if(roll<.92)return"reverse-holo";if(roll<.98)return"holo";if(roll<.995)return"special-art";return"gold"}

const rawRoot="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other";
export const standardArtworkUrl=(entry:Species)=>entry.sprite||`${rawRoot}/official-artwork/${entry.id}.png`;
export const alternativeArtworkUrl=(entry:Species,variant:Exclude<CardArtVariant,"official-artwork">)=>variant==="home-render"?`${rawRoot}/home/${entry.id}.png`:`${rawRoot}/official-artwork/shiny/${entry.id}.png`;
export const hasAllowlistedAlternative=(entry:Species,variant:Exclude<CardArtVariant,"official-artwork">)=>Number.isInteger(entry.id)&&entry.id>=1&&entry.id<=1025&&(variant==="home-render"||variant==="shiny-official-artwork");
export function resolveCardArt(entry:Species,requested:CardFinish,available:(entry:Species,variant:Exclude<CardArtVariant,"official-artwork">)=>boolean=hasAllowlistedAlternative){
 const standard={finish:requested,artVariant:"official-artwork" as const,artSource:"pokeapi-official-artwork" as const,artworkUrl:standardArtworkUrl(entry)};
 if(requested!=="special-art"&&requested!=="gold")return standard;
 const artVariant=requested==="special-art"?"home-render" as const:"shiny-official-artwork" as const;
 if(!available(entry,artVariant))return{...standard,finish:"holo" as const};
 return{finish:requested,artVariant,artSource:artVariant==="home-render"?"pokeapi-home-render" as const:"pokeapi-shiny-official-artwork" as const,artworkUrl:alternativeArtworkUrl(entry,artVariant)};
}

const rarityFallbackOrder:CardRarity[]=["common","uncommon","rare","epic","legendary","mythical"];
function poolForRarity(generation:number,rarity:CardRarity){
 const scoped=SPECIES.filter((entry)=>entry.generation===generation),exact=scoped.filter((entry)=>speciesRarity(entry)===rarity);if(exact.length)return exact;const origin=rarityFallbackOrder.indexOf(rarity);
 for(let distance=1;distance<rarityFallbackOrder.length;distance++){const lower=rarityFallbackOrder[origin-distance],upper=rarityFallbackOrder[origin+distance],fallback=scoped.filter((entry)=>speciesRarity(entry)===(lower??upper));if(fallback.length)return fallback}return scoped;
}
export function createCard(entry:Species,id:string,requestedFinish:CardFinish):PokeCard{
 const art=resolveCardArt(entry,requestedFinish);return{id,speciesId:entry.id,...art,rarity:speciesRarity(entry),generation:entry.generation,signature:`BST ${bst(entry)} · ${entry.stats.speed} SPD · ${entry.types.join("/")}`};
}
export function generateBooster(generation:number,seedText:string):PokeCard[]{
 if(!SPECIES.some((entry)=>entry.generation===generation))throw new Error(`No species for generation ${generation}`);const random=seeded(hashSeed(seedText)),used=new Set<string>(),cards:PokeCard[]=[];
 for(let slot=0;slot<BOOSTER_SIZE;slot++){const wanted=rarityForRoll(random()),pool=poolForRarity(generation,wanted);let entry=pool[Math.floor(random()*pool.length)],card=createCard(entry,`${seedText}-${slot}`,finishForRoll(random())),key=cardVariantKey(card);
  for(let retry=0;used.has(key)&&retry<pool.length*2;retry++){entry=pool[Math.floor(random()*pool.length)];card=createCard(entry,`${seedText}-${slot}`,finishForRoll(random()));key=cardVariantKey(card)}used.add(key);cards.push(card)}
 return cards;
}
export function normalizeLegacyCard(input:Partial<PokeCard>&{speciesId:number}):PokeCard{
 const entry=SPECIES_BY_ID.get(input.speciesId);if(!entry)throw new Error(`Unknown National Dex id ${input.speciesId}`);
 const rawFinish=String((input as {finish?:unknown}).finish??""),known=["standard","foil","reverse-holo","holo","special-art","gold"] as const;
 const legacyFinish:CardFinish=rawFinish==="research"?"holo":known.includes(rawFinish as CardFinish)?rawFinish as CardFinish:input.foil?"foil":"standard";
 const normalized=createCard(entry,input.id??`migrated-${entry.id}`,legacyFinish);
 return{...normalized,signature:input.signature??normalized.signature};
}
export function validKeepSelection(cards:PokeCard[],ids:string[]){return ids.length===BOOSTER_KEEP&&new Set(ids).size===BOOSTER_KEEP&&ids.every((id)=>cards.some((card)=>card.id===id))}
export const cardVariantKey=(card:PokeCard)=>`${card.speciesId}:${card.finish}`;
export const canSpendCredits=(balance:number,amount:number)=>Number.isFinite(balance)&&Number.isFinite(amount)&&amount>=0&&balance>=amount;
