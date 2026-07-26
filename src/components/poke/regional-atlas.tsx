"use client";
import {useEffect,useRef,useState} from "react";
import {Minus,Plus,RotateCcw} from "lucide-react";
import type {Locale} from "@/lib/types";
import type {RegionDefinition} from "@/poke/regions";
export function RegionalAtlas({region,locale,onPlace,onSector,activeSector,showLabels=true,fog=false,showRings=false}:{region:RegionDefinition;locale:Locale;onPlace?:(point:{x:number;y:number})=>void;onSector?:(id:string)=>void;activeSector?:string;showLabels?:boolean;fog?:boolean;showRings?:boolean}){
 const[zoom,setZoom]=useState(1);const[pan,setPan]=useState({x:0,y:0});
 const pointers=useRef(new Map<number,{x:number;y:number}>()),gesture=useRef({moved:false,lastDistance:0});
 useEffect(()=>{setZoom(1);setPan({x:0,y:0});pointers.current.clear()},[region.id]);
 const pointFromEvent=(event:React.PointerEvent<SVGSVGElement>)=>{
  const rect=event.currentTarget.getBoundingClientRect(),rawX=(event.clientX-rect.left)/rect.width*100,rawY=(event.clientY-rect.top)/rect.height*100;
  return{x:(rawX-50-pan.x)/zoom+50,y:(rawY-50-pan.y)/zoom+50};
 };
 const pointerDown=(event:React.PointerEvent<SVGSVGElement>)=>{
  event.currentTarget.setPointerCapture(event.pointerId);pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
  gesture.current.moved=false;
  if(pointers.current.size===2){const [a,b]=[...pointers.current.values()];gesture.current.lastDistance=Math.hypot(a.x-b.x,a.y-b.y)}
 };
 const pointerMove=(event:React.PointerEvent<SVGSVGElement>)=>{
  const previous=pointers.current.get(event.pointerId);if(!previous)return;
  pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.current.size===2){
   const [a,b]=[...pointers.current.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
   if(gesture.current.lastDistance>0){const ratio=distance/gesture.current.lastDistance;setZoom((value)=>Math.max(1,Math.min(2.8,value*ratio)))}
   gesture.current.lastDistance=distance;gesture.current.moved=true;return;
  }
  const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
  if(Math.hypot(dx,dy)>2&&zoom>1){const rect=event.currentTarget.getBoundingClientRect();setPan((value)=>({x:Math.max(-34,Math.min(34,value.x+dx/rect.width*100)),y:Math.max(-34,Math.min(34,value.y+dy/rect.height*100))}));gesture.current.moved=true}
 };
 const pointerUp=(event:React.PointerEvent<SVGSVGElement>)=>{
  const wasTap=!gesture.current.moved&&pointers.current.size===1;pointers.current.delete(event.pointerId);gesture.current.lastDistance=0;
  if(wasTap&&onPlace)onPlace(pointFromEvent(event));
 };
 return <div className="poke-atlas poke-regional-atlas" style={{"--region-accent":region.accent,"--region-secondary":region.secondary} as React.CSSProperties}>
  <header><span>REGION / GEN {region.generation}</span><b>{region.name[locale]}</b></header>
  <div className="poke-atlas-tools"><button onClick={()=>setZoom((z)=>Math.min(2.2,z+.25))} aria-label="Zoom in"><Plus/></button><button onClick={()=>setZoom((z)=>Math.max(1,z-.25))} aria-label="Zoom out"><Minus/></button><button onClick={()=>{setZoom(1);setPan({x:0,y:0})}} aria-label="Reset"><RotateCcw/></button></div>
  <svg viewBox="0 0 100 100" style={{touchAction:"none"}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={(event)=>pointers.current.delete(event.pointerId)} onWheel={(event)=>{event.preventDefault();setZoom((value)=>Math.max(1,Math.min(2.8,value+(event.deltaY<0 ? .2 : -.2))))}} role="img" aria-label={`${region.name[locale]} · ${locale==="de"?"schematische Lernkarte":"schematic learning map"}`}>
   <defs><pattern id={`grid-${region.id}`} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".25"/></pattern></defs><rect width="100" height="100" fill={`url(#grid-${region.id})`}/>
   <g transform={`translate(${pan.x} ${pan.y}) translate(50 50) scale(${zoom}) translate(-50 -50)`}><path className="poke-region-land" d={region.path}/>{region.nodes.map((node)=><g key={node.id} role={onSector?"button":undefined} tabIndex={onSector?0:undefined} aria-label={node.name[locale]} onKeyDown={(event)=>{if(onSector&&(event.key==="Enter"||event.key===" ")){event.preventDefault();onSector(node.id)}}} onClick={(event)=>{if(onSector){event.stopPropagation();onSector(node.id)}}} className={`poke-map-node biome-${node.biome} ${activeSector===node.id?"is-active":""}`} transform={`translate(${node.x} ${node.y})`}><circle className="poke-map-hit" r={5}/><circle r={2}/>{showRings&&activeSector===node.id&&<><circle className="poke-distance-ring" r="7"/><circle className="poke-distance-ring is-wide" r="13"/></>}{showLabels&&<text x="3" y="-2">{node.name[locale]}</text>}</g>)}</g>
   {fog&&<rect className="poke-atlas-fog" width="100" height="100"/>}
  </svg>
  <div className="poke-map-pan"><button onClick={()=>setPan((p)=>({...p,x:p.x+5}))}>←</button><button onClick={()=>setPan((p)=>({...p,y:p.y+5}))}>↑</button><button onClick={()=>setPan((p)=>({...p,y:p.y-5}))}>↓</button><button onClick={()=>setPan((p)=>({...p,x:p.x-5}))}>→</button></div>
  <p className="poke-map-caption">{locale==="de"?"Originale schematische Lernkarte · nicht maßstabsgetreu":"Original schematic learning map · not to scale"}</p>
 </div>
}
