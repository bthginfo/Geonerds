import type { Difficulty } from "@/lib/types";

export interface WineDifficultyProfile {
  suspects: number;
  clueBudget: number;
  clueCost: number;
  startingLives: number;
  examSeconds: number;
}

export const WINE_DIFFICULTY:Record<Difficulty,WineDifficultyProfile>={
  easy:{suspects:5,clueBudget:4,clueCost:80,startingLives:3,examSeconds:180},
  medium:{suspects:6,clueBudget:3,clueCost:120,startingLives:2,examSeconds:120},
  hard:{suspects:6,clueBudget:2,clueCost:180,startingLives:1,examSeconds:90},
};

export type Confidence="safe"|"standard"|"bold";
export const CONFIDENCE_MULTIPLIER:Record<Confidence,number>={safe:0.8,standard:1,bold:1.35};

export function deductionScore(base:number,cluesUsed:number,difficulty:Difficulty,confidence:Confidence,correct:boolean){
  if(!correct)return 0;
  return Math.max(100,Math.round((base-cluesUsed*WINE_DIFFICULTY[difficulty].clueCost)*CONFIDENCE_MULTIPLIER[confidence]));
}

export function objectiveScore(profile:Record<string,number>,target:Record<string,number>,riskCost=0){
  const distance=Object.keys(target).reduce((sum,key)=>sum+Math.abs((profile[key]??0)-target[key]),0);
  return Math.max(0,Math.round(1000-distance*70-riskCost*25));
}
