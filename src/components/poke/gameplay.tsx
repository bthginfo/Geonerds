"use client";
import type {Locale} from "@/lib/types";
import type {PokeDifficulty} from "@/poke/types";
export interface GameProps{locale:Locale;difficulty:PokeDifficulty;generationCap:number;onFinish:(score:number,correct:number,total:number,speciesIds:number[])=>void}
export function RunHud({score,round,total,resource,label}:{score:number;round:number;total:number;resource?:number;label?:string}){
 return <div className="poke-run-hud"><span>ROUND <b>{String(round).padStart(2,"0")}/{String(total).padStart(2,"0")}</b></span><div><i style={{width:`${Math.min(100,round/total*100)}%`}}/></div>{resource!==undefined&&<span>{label} <b>{resource}</b></span>}<span>SCORE <b>{score}</b></span></div>;
}
export function Feedback({good,children}:{good:boolean;children:React.ReactNode}){return <div className={`poke-feedback ${good?"is-good":"is-bad"}`}>{children}</div>}
