"use client";
import {create} from "zustand";
import {persist} from "zustand/middleware";
import {applyPokeRun,emptyPokeProgression,type PokeProgressionData} from "./progression";
import type {PokeRun} from "./types";
import {BOOSTER_COST,GEN_UNLOCK_COST,canSpendCredits,cardVariantKey,generateBooster,validKeepSelection,type PokeCard} from "./cards";

export const POKE_STORAGE_KEYS={progression:"poke-nerds-progression",dex:"poke-nerds-dex",scores:"poke-nerds-scores",daily:"poke-nerds-daily",cards:"poke-nerds-cards"} as const;
interface ProgressionStore extends PokeProgressionData{record:(run:PokeRun)=>void;spendCredits:(amount:number)=>boolean;addCredits:(amount:number)=>void;reset:()=>void}
export const usePokeProgression=create<ProgressionStore>()(persist((set,get)=>({...emptyPokeProgression(),record:(run)=>set((state)=>applyPokeRun(state,run)),spendCredits:(amount)=>{if(!canSpendCredits(get().researchCredits,amount))return false;set((state)=>({...state,researchCredits:state.researchCredits-amount}));return true},addCredits:(amount)=>set((state)=>({...state,researchCredits:state.researchCredits+Math.max(0,amount)})),reset:()=>set(emptyPokeProgression())}),{name:POKE_STORAGE_KEYS.progression,version:2}));
export interface DexRecord{id:number;correct:number;games:string[];favorite:boolean}
interface DexStore{records:Record<number,DexRecord>;encounter:(id:number,gameId:string,correct:boolean)=>void;toggleFavorite:(id:number)=>void}
export const usePokeDex=create<DexStore>()(persist((set)=>({records:{},encounter:(id,gameId,correct)=>set((state)=>{if(!correct)return state;const old=state.records[id]??{id,correct:0,games:[],favorite:false};return{records:{...state.records,[id]:{...old,correct:old.correct+1,games:[...new Set([...old.games,gameId])]}}}}),toggleFavorite:(id)=>set((state)=>{const old=state.records[id];if(!old)return state;return{records:{...state.records,[id]:{...old,favorite:!old.favorite}}}})}),{name:POKE_STORAGE_KEYS.dex,version:1}));
interface ScoresStore{runs:PokeRun[];add:(run:PokeRun)=>void}
export const usePokeScores=create<ScoresStore>()(persist((set)=>({runs:[],add:(run)=>set((state)=>run.practice?state:{runs:[run,...state.runs].slice(0,250)})}),{name:POKE_STORAGE_KEYS.scores,version:1}));

interface CardStore{collection:Record<string,{card:PokeCard;count:number}>;dust:number;opened:number;unlockedGenerations:number[];pending:PokeCard[]|null;selected:string[];open:(generation:number)=>boolean;toggle:(id:string)=>void;confirm:()=>boolean;unlock:(generation:number)=>boolean}
export const usePokeCards=create<CardStore>()(persist((set,get)=>({collection:{},dust:0,opened:0,unlockedGenerations:[1],pending:null,selected:[],
 open:(generation)=>{const state=get();if(state.pending||!state.unlockedGenerations.includes(generation))return false;if(!usePokeProgression.getState().spendCredits(BOOSTER_COST))return false;const cards=generateBooster(generation,`poke-pack-${generation}-${state.opened}`);set({pending:cards,selected:[],opened:state.opened+1});return true},
 toggle:(id)=>set((state)=>state.pending?.some((card)=>card.id===id)?{selected:state.selected.includes(id)?state.selected.filter((item)=>item!==id):state.selected.length<2?[...state.selected,id]:state.selected}:state),
 confirm:()=>{const state=get();if(!state.pending||!validKeepSelection(state.pending,state.selected))return false;let dust=state.dust;const collection={...state.collection};for(const card of state.pending.filter((item)=>state.selected.includes(item.id))){const key=cardVariantKey(card);const current=collection[key];if(current)dust+=card.foil?18:8;else collection[key]={card,count:1}}set({collection,dust,pending:null,selected:[]});return true},
 unlock:(generation)=>{const state=get();if(generation<2||generation>9||state.unlockedGenerations.includes(generation))return false;if(!usePokeProgression.getState().spendCredits(GEN_UNLOCK_COST))return false;set({unlockedGenerations:[...state.unlockedGenerations,generation].sort()});return true},
}),{name:POKE_STORAGE_KEYS.cards,version:1}));
