"use client";
import type {Locale} from "@/lib/types";
import type {PokeDifficulty} from "@/poke/types";
export interface GameProps{locale:Locale;difficulty:PokeDifficulty;generationCap:number;roundCount:5|10|20;runSeed:string;onFinish:(score:number,correct:number,questions:number,speciesIds:number[],completedRounds?:number)=>void}
export function RunHud({score,round,total,resource,label}:{score:number;round:number;total:number;resource?:number;label?:string}){
 const progress=Math.min(100,Math.max(0,round/Math.max(1,total)*100));
 return <div className="poke-run-hud" role="status" aria-live="polite"><span>ROUND <b>{String(round).padStart(2,"0")}/{String(total).padStart(2,"0")}</b></span><div role="progressbar" aria-label="Run progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(total,round)}><i style={{width:`${progress}%`}}/></div>{resource!==undefined&&<span>{label} <b>{resource}</b></span>}<span>SCORE <b>{score}</b></span></div>;
}
export function Feedback({good,children}:{good:boolean;children:React.ReactNode}){return <div role="status" aria-live="polite" className={`poke-feedback ${good?"is-good":"is-bad"}`}>{children}</div>}
