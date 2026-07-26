import type { PokeCompetency,PokeDexStage,PokeRun } from "./types";
import { getPokeGame } from "./registry";

export const POKE_COMPETENCIES:PokeCompetency[]=["exploration","locations","ecology","types","teamcraft","evolution","recognition","audio","taxonomy","deduction"];
export interface PokeProgressionData {xp:number;researchCredits:number;totalRuns:number;correct:number;total:number;activeDays:string[];competencyXp:Record<PokeCompetency,number>}
export const emptyPokeProgression=():PokeProgressionData=>({xp:0,researchCredits:120,totalRuns:0,correct:0,total:0,activeDays:[],competencyXp:Object.fromEntries(POKE_COMPETENCIES.map((item)=>[item,0])) as Record<PokeCompetency,number>});
export function applyPokeRun(state:PokeProgressionData,run:PokeRun):PokeProgressionData{
 if(run.practice)return state;
 const gained=Math.max(12,Math.round(run.score/8)+run.correct*8);
 const competency=getPokeGame(run.gameId).competency;
 const day=new Date(run.createdAt).toISOString().slice(0,10);
 return {...state,xp:state.xp+gained,researchCredits:state.researchCredits+Math.max(18,Math.round(run.score/45)),totalRuns:state.totalRuns+1,correct:state.correct+run.correct,total:state.total+run.total,activeDays:[...new Set([...state.activeDays,day])].slice(-90),competencyXp:{...state.competencyXp,[competency]:state.competencyXp[competency]+gained}};
}
export const trainerLevel=(xp:number)=>Math.floor(Math.sqrt(xp/100))+1;
export const normalizeRunScore=(score:number,completedRounds:number)=>Math.round(score/Math.max(1,completedRounds)*10);
export const shouldRecordDex=(practice:boolean)=>!practice;
export function pokeDexStage(correct=0,games=0):PokeDexStage {if(correct>=10&&games>=3)return"mastered";if(correct>=4&&games>=2)return"researched";if(correct>0)return"encountered";return"sealed"}
export const POKE_BADGES=[
 {id:"first-scan",name:{en:"First Contact",de:"Erstkontakt"},metric:"runs",goal:1},
 {id:"field-five",name:{en:"Field Regular",de:"Feldstammgast"},metric:"runs",goal:5},
 {id:"dex-25",name:{en:"Twenty-five Signals",de:"Fünfundzwanzig Signale"},metric:"correct",goal:25},
 {id:"xp-500",name:{en:"Research Grade II",de:"Forschungsgrad II"},metric:"xp",goal:500},
] as const;
