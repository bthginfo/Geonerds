"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WineDexRecord, WineProgressionData } from "./progression";
import { applyWineRun, emptyWineProgression } from "./progression";
import type { WineEntityType, WineRun } from "./types";

export const WINE_STORAGE_KEYS = {
  progression:"wine-nerds-progression",
  dex:"wine-nerds-dex",
  scores:"wine-nerds-scores",
  daily:"wine-nerds-daily",
} as const;

interface ProgressionStore extends WineProgressionData {
  record: (run:WineRun)=>void;
  reset:()=>void;
}
export const useWineProgression=create<ProgressionStore>()(persist((set)=>({
  ...emptyWineProgression(),
  record:(run)=>set((state)=>applyWineRun(state,run)),
  reset:()=>set(emptyWineProgression()),
}),{name:WINE_STORAGE_KEYS.progression,version:1}));

interface DexStore {
  records:Record<string,WineDexRecord>;
  encounter:(id:string,type:WineEntityType,gameId:string,correct:boolean)=>void;
  toggleFavorite:(id:string)=>void;
}
export const useWineDex=create<DexStore>()(persist((set)=>({
  records:{},
  encounter:(id,type,gameId,correct)=>set((state)=>{
    if(!correct)return state;
    const old=state.records[id]??{id,type,correct:0,games:[],favorite:false};
    return {records:{...state.records,[id]:{...old,correct:old.correct+1,games:[...new Set([...old.games,gameId])]}}};
  }),
  toggleFavorite:(id)=>set((state)=>{
    const old=state.records[id]; if(!old)return state;
    return {records:{...state.records,[id]:{...old,favorite:!old.favorite}}};
  }),
}),{name:WINE_STORAGE_KEYS.dex,version:1}));

interface ScoresStore { runs:WineRun[]; add:(run:WineRun)=>void; }
export const useWineScores=create<ScoresStore>()(persist((set)=>({
  runs:[],add:(run)=>set((state)=>run.practice?state:{runs:[run,...state.runs].slice(0,250)}),
}),{name:WINE_STORAGE_KEYS.scores,version:1}));

interface DailyStore { lastFlight:string|null; completed:number; complete:(day:string)=>void; }
export const useWineDaily=create<DailyStore>()(persist((set)=>({
  lastFlight:null,completed:0,complete:(day)=>set((s)=>s.lastFlight===day?s:{lastFlight:day,completed:s.completed+1}),
}),{name:WINE_STORAGE_KEYS.daily,version:1}));
