"use client";
import {useState} from "react";
import {Minus,Plus,RotateCcw} from "lucide-react";
import {MAP_EDGES,MAP_NODES} from "@/poke/maps";
import type {Locale} from "@/lib/types";
export function KantoMap({locale,onPlace,activeNode,showLabels=true}:{locale:Locale;onPlace?:(point:{x:number;y:number})=>void;activeNode?:string;showLabels?:boolean}){
 const [zoom,setZoom]=useState(1);const [pan,setPan]=useState({x:0,y:0});
 return <div className="poke-atlas">
  <div className="poke-atlas-tools"><button onClick={()=>setZoom((z)=>Math.min(2.2,z+.25))} aria-label="Zoom in"><Plus/></button><button onClick={()=>setZoom((z)=>Math.max(1,z-.25))} aria-label="Zoom out"><Minus/></button><button onClick={()=>{setZoom(1);setPan({x:0,y:0})}} aria-label="Reset map"><RotateCcw/></button></div>
  <svg viewBox="0 0 100 100" role="img" aria-label={locale==="de"?"Interaktive schematische Kanto-Karte":"Interactive schematic Kanto map"} onClick={(event)=>{if(!onPlace)return;const rect=event.currentTarget.getBoundingClientRect();const rawX=(event.clientX-rect.left)/rect.width*100;const rawY=(event.clientY-rect.top)/rect.height*100;onPlace({x:(rawX-50-pan.x)/zoom+50,y:(rawY-50-pan.y)/zoom+50})}}>
   <defs><pattern id="poke-grid-map" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="rgba(75,223,245,.11)" strokeWidth=".25"/></pattern></defs>
   <rect width="100" height="100" fill="url(#poke-grid-map)"/>
   <g transform={`translate(${pan.x} ${pan.y}) translate(50 50) scale(${zoom}) translate(-50 -50)`}>
    <path className="poke-kanto-land" d="M18 14L39 11 48 19 61 17 74 25 83 39 80 56 90 64 83 78 67 84 55 95 37 93 22 99 14 87 19 73 10 61 17 48 11 34Z"/>
    {MAP_EDGES.map(([a,b])=>{const from=MAP_NODES.find((node)=>node.id===a)!;const to=MAP_NODES.find((node)=>node.id===b)!;return <line key={`${a}-${b}`} className="poke-map-edge" x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>})}
    {MAP_NODES.map((node)=><g key={node.id} className={`poke-map-node ${activeNode===node.id?"is-active":""}`} transform={`translate(${node.x} ${node.y})`}>
      <circle r={node.kind==="town"?1.8:1.35}/>{showLabels&&<text x="2.8" y="-1.8">{node.name[locale]}</text>}
    </g>)}
   </g>
  </svg>
  <div className="poke-map-pan"><button onClick={()=>setPan((p)=>({...p,x:p.x+5}))}>←</button><button onClick={()=>setPan((p)=>({...p,y:p.y+5}))}>↑</button><button onClick={()=>setPan((p)=>({...p,y:p.y-5}))}>↓</button><button onClick={()=>setPan((p)=>({...p,x:p.x-5}))}>→</button></div>
  <p className="poke-map-caption">{locale==="de"?"Schematische Karte · nicht maßstabsgetreu":"Schematic map · not to scale"}</p>
 </div>;
}

