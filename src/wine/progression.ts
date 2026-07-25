import type { WineCompetency, WineDexStage, WineEntityType, WineRun } from "./types";
import { getWineGame } from "./registry";

export interface WineDexRecord {
  id: string;
  type: WineEntityType;
  correct: number;
  games: string[];
  favorite: boolean;
}

export interface WineProgressionData {
  xp: number;
  totalRuns: number;
  correct: number;
  total: number;
  activeDays: string[];
  competencyXp: Record<WineCompetency, number>;
}

export const WINE_COMPETENCIES: WineCompetency[] = ["geography","terroir","grapes","sensory","pairing","service","production","theory"];
export const emptyWineProgression = (): WineProgressionData => ({
  xp:0,totalRuns:0,correct:0,total:0,activeDays:[],
  competencyXp:Object.fromEntries(WINE_COMPETENCIES.map((c)=>[c,0])) as Record<WineCompetency,number>,
});

export function applyWineRun(state: WineProgressionData, run: WineRun): WineProgressionData {
  if (run.practice) return state;
  const day = new Date(run.createdAt).toISOString().slice(0,10);
  const competency = getWineGame(run.gameId).competency;
  const gained = Math.max(10, Math.round(run.score / 10) + run.correct * 6);
  return {
    ...state,
    xp:state.xp+gained,
    totalRuns:state.totalRuns+1,
    correct:state.correct+run.correct,
    total:state.total+run.total,
    activeDays:[...new Set([...state.activeDays,day])].slice(-90),
    competencyXp:{...state.competencyXp,[competency]:state.competencyXp[competency]+gained},
  };
}

export function wineLevel(xp:number) { return Math.floor(Math.sqrt(xp/120))+1; }
export function cellarRank(xp:number) {
  if(xp>=8000)return "Cellar Mentor";
  if(xp>=4000)return "Appellation Scholar";
  if(xp>=1800)return "Tasting Captain";
  if(xp>=700)return "Curious Steward";
  return "Cellar Apprentice";
}
export function learningStreak(days:string[], now=new Date()) {
  const set=new Set(days); let streak=0; const d=new Date(now);
  for(;;){const key=d.toISOString().slice(0,10);if(!set.has(key))break;streak++;d.setUTCDate(d.getUTCDate()-1);}
  return streak;
}
export function dexStage(record?:WineDexRecord):WineDexStage {
  if(!record)return "sealed";
  if(record.correct>=12&&record.games.length>=4)return "mastered";
  if(record.correct>=6&&record.games.length>=2)return "certified";
  if(record.correct>=3)return "studied";
  return "tasted";
}
export const WINE_BADGES = [
 {id:"first-pour",name:{en:"First Pour",de:"Erster Schluck"},goal:1,metric:"runs"},
 {id:"palate-10",name:{en:"Palate in Training",de:"Gaumen im Training"},goal:10,metric:"correct"},
 {id:"map-50",name:{en:"Vineyard Cartographer",de:"Weinberg-Kartograf"},goal:50,metric:"xp"},
 {id:"cellar-500",name:{en:"Cellar Regular",de:"Stammgast im Keller"},goal:500,metric:"xp"},
 {id:"flight-7",name:{en:"Seven-Day Flight",de:"Sieben-Tage-Flight"},goal:7,metric:"days"},
] as const;

