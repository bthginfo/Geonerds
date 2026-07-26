"use client";
import { Check, Eye, X } from "lucide-react";
import type { Grape } from "@/wine/types";

export function DeductionBoard({suspects,crossed,incompatible,selected,onToggle,onSelect,locked}:{suspects:Grape[];crossed:Set<string>;incompatible:Set<string>;selected:string|null;onToggle:(id:string)=>void;onSelect:(id:string)=>void;locked:boolean}){
 return <div className="wine-deduction-suspects">{suspects.map((suspect,index)=>{
  const isCrossed=crossed.has(suspect.id),conflict=incompatible.has(suspect.id),active=selected===suspect.id;
  return <article key={suspect.id} className={`wine-deduction-suspect ${isCrossed?"is-crossed":""} ${conflict?"has-conflict":""} ${active?"is-selected":""}`}>
   <button type="button" disabled={locked||isCrossed} onClick={()=>onSelect(suspect.id)} aria-pressed={active} className="wine-suspect-main"><span className="wine-suspect-vial"><i/>{String(index+1).padStart(2,"0")}</span><b>{suspect.name}</b><small>{suspect.structure.en}</small>{conflict&&<em><X className="h-3 w-3"/>clue conflict</em>}</button>
   <button type="button" disabled={locked} onClick={()=>onToggle(suspect.id)} aria-label={`${isCrossed?"Restore":"Cross out"} ${suspect.name}`} className="wine-cross-toggle">{isCrossed?<><Eye className="h-4 w-4"/>Restore</>:<><X className="h-4 w-4"/>Rule out</>}</button>
   {locked&&active&&<Check className="absolute right-2 top-2 h-5 w-5 text-[var(--wine-vine)]"/>}
  </article>})}</div>
}
