"use client";
import {useT} from "@/i18n/I18nProvider";
import type {Locale} from "@/lib/types";
import type {PokeDifficulty} from "@/poke/types";
export interface GameProps{locale:Locale;difficulty:PokeDifficulty;generationCap:number;roundCount:5|10|20;runSeed:string;onFinish:(score:number,correct:number,questions:number,speciesIds:number[],completedRounds?:number)=>void}
export function RunHud({score,round,total,resource,label}:{score:number;round:number;total:number;resource?:number;label?:string}){
 const {locale}=useT();
 const progress=Math.min(100,Math.max(0,round/Math.max(1,total)*100));
 const resourceLabel=locale==="de"?({STREAK:"SERIE",COMBO:"KOMBO",SHIELDS:"SCHILDE",ENERGY:"ENERGIE",SCANS:"SCANS",FAULTS:"FEHLER"}[label??""]??label):label;
 return <div className="poke-run-hud" role="status" aria-live="polite"><span>{locale==="de"?"RUNDE":"ROUND"} <b>{String(round).padStart(2,"0")}/{String(total).padStart(2,"0")}</b></span><div role="progressbar" aria-label={locale==="de"?"Run-Fortschritt":"Run progress"} aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(total,round)}><i style={{width:`${progress}%`}}/></div>{resource!==undefined&&<span>{resourceLabel} <b>{resource}</b></span>}<span>{locale==="de"?"PUNKTE":"SCORE"} <b>{score}</b></span></div>;
}
export function Feedback({good,children}:{good:boolean;children:React.ReactNode}){
 const {locale}=useT();
 return <div role="status" aria-live="assertive" className={`poke-feedback ${good?"is-good":"is-bad"}`}>
  <strong className="poke-feedback-verdict">{good?(locale==="de"?"RICHTIG · STARK GELÖST":"CORRECT · STRONG READ"):(locale==="de"?"NICHT GANZ · LERNHINWEIS":"NOT QUITE · LEARNING READ")}</strong>
  {children}
 </div>;
}
