"use client";
import { Flame, Lightbulb, Shield } from "lucide-react";

export function WineRunHud({score,streak,hints,lives}:{score:number;streak:number;hints?:number;lives?:number}){
 return <div className="wine-run-hud" aria-live="polite">
  <span><b>{score}</b><small>PTS</small></span>
  <span><Flame className="h-4 w-4"/><b>{streak}</b><small>COMBO</small></span>
  {hints!==undefined&&<span><Lightbulb className="h-4 w-4"/><b>{hints}</b><small>CLUES</small></span>}
  {lives!==undefined&&<span><Shield className="h-4 w-4"/><b>{lives}</b><small>LIVES</small></span>}
 </div>
}
