"use client";
import {useEffect,useState} from "react";
import {Minus,Plus,RotateCcw} from "lucide-react";
import type {Locale} from "@/lib/types";
import type {RegionDefinition} from "@/poke/regions";
export function RegionalAtlas({region,locale,onPlace,onSector,activeSector,showLabels=true,fog=false,showRings=false}:{region:RegionDefinition;locale:Locale;onPlace?:(point:{x:number;y:number})=>void;onSector?:(id:string)=>void;activeSector?:string;showLabels?:boolean;fog?:boolean;showRings?:boolean}){
 const[zoom,setZoom]=useState(1);const[pan,setPan]=useState({x:0,y:0});useEffect(()=>{setZoom(1);setPan({x:0,y:0})},[region.id]);
 return <div className="poke-atlas poke-regional-atlas" style={{"--region-accent":region.accent,"--region-secondary":region.secondary} as React.CSSProperties}>
  <header><span>REGION / GEN {region.generation}</span><b>{region.name[locale]}</b></header>
  <div className="poke-atlas-tools"><button onClick={()=>setZoom((z)=>Math.min(2.2,z+.25))} aria-label="Zoom in"><Plus/></button><button onClick={()=>setZoom((z)=>Math.max(1,z-.25))} aria-label="Zoom out"><Minus/></button><button onClick={()=>{setZoom(1);setPan({x:0,y:0})}} aria-label="Reset"><RotateCcw/></button></div>
  <svg viewBox="0 0 100 100" onClick={(event)=>{if(!onPlace)return;const rect=event.currentTarget.getBoundingClientRect();const rawX=(event.clientX-rect.left)/rect.width*100,rawY=(event.clientY-rect.top)/rect.height*100;onPlace({x:(rawX-50-pan.x)/zoom+50,y:(rawY-50-pan.y)/zoom+50})}} role="img" aria-label={`${region.name[locale]} · ${locale==="de"?"schematische Lernkarte":"schematic learning map"}`}>
   <defs><pattern id={`grid-${region.id}`} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".25"/></pattern></defs><rect width="100" height="100" fill={`url(#grid-${region.id})`}/>
   <g transform={`translate(${pan.x} ${pan.y}) translate(50 50) scale(${zoom}) translate(-50 -50)`}><path className="poke-region-land" d={region.path}/>{region.nodes.map((node)=><g key={node.id} role={onSector?"button":undefined} aria-label={showLabels?node.name[locale]:undefined} onClick={(event)=>{if(onSector){event.stopPropagation();onSector(node.id)}}} className={`poke-map-node biome-${node.biome} ${activeSector===node.id?"is-active":""}`} transform={`translate(${node.x} ${node.y})`}><circle r={2}/>{showRings&&activeSector===node.id&&<><circle className="poke-distance-ring" r="7"/><circle className="poke-distance-ring is-wide" r="13"/></>}{showLabels&&<text x="3" y="-2">{node.name[locale]}</text>}</g>)}</g>
   {fog&&<rect className="poke-atlas-fog" width="100" height="100"/>}
  </svg>
  <div className="poke-map-pan"><button onClick={()=>setPan((p)=>({...p,x:p.x+5}))}>←</button><button onClick={()=>setPan((p)=>({...p,y:p.y+5}))}>↑</button><button onClick={()=>setPan((p)=>({...p,y:p.y-5}))}>↓</button><button onClick={()=>setPan((p)=>({...p,x:p.x-5}))}>→</button></div>
  <p className="poke-map-caption">{locale==="de"?"Originale schematische Lernkarte · nicht maßstabsgetreu":"Original schematic learning map · not to scale"}</p>
 </div>
}
