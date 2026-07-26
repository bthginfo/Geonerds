"use client";

import {useEffect,useId,useMemo,useRef,useState} from "react";
import {LocateFixed,Minus,Plus,RotateCcw} from "lucide-react";
import type {Locale} from "@/lib/types";
import type {RegionDefinition} from "@/poke/regions";

type AtlasPoint={x:number;y:number};
type PointerSample={x:number;y:number;startX:number;startY:number};

interface RegionalAtlasProps{
 region:RegionDefinition;
 locale:Locale;
 onPlace?:(point:AtlasPoint)=>void;
 onSector?:(id:string)=>void;
 activeSector?:string;
 placement?:AtlasPoint;
 showLabels?:boolean;
 fog?:boolean;
 showRings?:boolean;
 concealBiomes?:boolean;
}

const BIOME_LABELS={
 forest:{en:"Forest",de:"Wald"},
 meadow:{en:"Meadow",de:"Wiese"},
 cave:{en:"Cave",de:"Höhle"},
 coast:{en:"Coast",de:"Küste"},
 mountain:{en:"Mountain",de:"Berg"},
 wetland:{en:"Wetland",de:"Feuchtgebiet"},
 desert:{en:"Desert",de:"Wüste"},
 snow:{en:"Snow",de:"Schnee"},
 ruins:{en:"Ruins",de:"Ruinen"},
 volcanic:{en:"Volcanic",de:"Vulkan"},
} as const;

export function RegionalAtlas({
 region,
 locale,
 onPlace,
 onSector,
 activeSector,
 placement,
 showLabels=true,
 fog=false,
 showRings=false,
 concealBiomes=false,
}:RegionalAtlasProps){
 const[zoom,setZoom]=useState(1);
 const[pan,setPan]=useState({x:0,y:0});
 const pointers=useRef(new Map<number,PointerSample>());
 const gesture=useRef({moved:false,lastDistance:0});
 const rawInstanceId=useId();
 const instanceId=rawInstanceId.replace(/[^a-zA-Z0-9_-]/g,"");
 const defs={
  ocean:`atlas-ocean-${region.id}-${instanceId}`,
  grid:`atlas-grid-${region.id}-${instanceId}`,
  land:`atlas-land-${region.id}-${instanceId}`,
  grain:`atlas-grain-${region.id}-${instanceId}`,
  clip:`atlas-clip-${region.id}-${instanceId}`,
  glow:`atlas-glow-${region.id}-${instanceId}`,
  fog:`atlas-fog-${region.id}-${instanceId}`,
 };
 const activeNode=region.nodes.find((node)=>node.id===activeSector);
 const biomeLegend=useMemo(()=>[...new Set(region.nodes.map((node)=>node.biome))].slice(0,3),[region]);
 const routes=useMemo(()=>region.nodes.slice(1).map((node,index)=>{
  const previous=region.nodes.slice(0,index+1);
  const nearest=previous.reduce((best,candidate)=>{
   const distance=Math.hypot(node.x-candidate.x,node.y-candidate.y);
   return distance<best.distance?{node:candidate,distance}:best;
  },{node:previous[0],distance:Number.POSITIVE_INFINITY});
  const bend=((index%3)-1)*4;
  return{from:nearest.node,to:node,bend};
 }),[region]);

 useEffect(()=>{
  setZoom(1);
  setPan({x:0,y:0});
  pointers.current.clear();
 },[region.id]);

 const applyZoom=(nextZoom:number)=>{
  const clamped=Math.max(1,Math.min(2.8,nextZoom));
  setZoom(clamped);
  if(clamped===1)setPan({x:0,y:0});
 };
 const reset=()=>{setZoom(1);setPan({x:0,y:0})};
 const pointFromEvent=(event:React.PointerEvent<SVGSVGElement>)=>{
  const rect=event.currentTarget.getBoundingClientRect();
  const rawX=(event.clientX-rect.left)/rect.width*100;
  const rawY=(event.clientY-rect.top)/rect.height*100;
  return{x:(rawX-50-pan.x)/zoom+50,y:(rawY-50-pan.y)/zoom+50};
 };
 const pointerDown=(event:React.PointerEvent<SVGSVGElement>)=>{
  event.currentTarget.setPointerCapture(event.pointerId);
  pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});
  gesture.current.moved=false;
  if(pointers.current.size===2){
   const[a,b]=[...pointers.current.values()];
   gesture.current.lastDistance=Math.hypot(a.x-b.x,a.y-b.y);
  }
 };
 const pointerMove=(event:React.PointerEvent<SVGSVGElement>)=>{
  const previous=pointers.current.get(event.pointerId);
  if(!previous)return;
  const current={...previous,x:event.clientX,y:event.clientY};
  pointers.current.set(event.pointerId,current);
  if(Math.hypot(event.clientX-previous.startX,event.clientY-previous.startY)>5)gesture.current.moved=true;
  if(pointers.current.size===2){
   const[a,b]=[...pointers.current.values()];
   const distance=Math.hypot(a.x-b.x,a.y-b.y);
   if(gesture.current.lastDistance>0)applyZoom(zoom*(distance/gesture.current.lastDistance));
   gesture.current.lastDistance=distance;
   gesture.current.moved=true;
   return;
  }
  if(zoom>1){
   const rect=event.currentTarget.getBoundingClientRect();
   setPan((value)=>({
    x:Math.max(-36,Math.min(36,value.x+(event.clientX-previous.x)/rect.width*100)),
    y:Math.max(-36,Math.min(36,value.y+(event.clientY-previous.y)/rect.height*100)),
   }));
  }
 };
 const pointerUp=(event:React.PointerEvent<SVGSVGElement>)=>{
  const wasTap=!gesture.current.moved&&pointers.current.size===1;
  pointers.current.delete(event.pointerId);
  gesture.current.lastDistance=0;
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  if(wasTap&&onPlace)onPlace(pointFromEvent(event));
 };

 const interactionHint=onPlace
  ?locale==="de"?"Karte antippen: Messpunkt setzen":"Tap map to place survey pin"
  :onSector
   ?locale==="de"?"Sektoren antippen: Mikroklima scannen":"Tap sectors to scan microclimate"
   :locale==="de"?"Ziehen, scrollen oder pinch-to-zoom":"Drag, scroll or pinch to zoom";

 return <figure className={`poke-atlas poke-regional-atlas ${fog?"has-fog":""} ${placement?"has-placement":""} ${concealBiomes?"has-concealed-biomes":""}`} style={{"--region-accent":region.accent,"--region-secondary":region.secondary} as React.CSSProperties}>
  <header className="poke-atlas-header">
   <div><span>{locale==="de"?"REGIONSATLAS":"REGIONAL ATLAS"} · GEN {region.generation}</span><b>{region.name[locale]}</b></div>
   <div className="poke-atlas-zoom-readout"><span>MAG</span><b>{zoom.toFixed(1)}×</b></div>
  </header>
  <div className="poke-atlas-tools" aria-label={locale==="de"?"Kartensteuerung":"Map controls"}>
   <button type="button" onClick={()=>applyZoom(zoom+.25)} disabled={zoom>=2.8} aria-label={locale==="de"?"Vergrößern":"Zoom in"}><Plus/></button>
   <button type="button" onClick={()=>applyZoom(zoom-.25)} disabled={zoom<=1} aria-label={locale==="de"?"Verkleinern":"Zoom out"}><Minus/></button>
   <button type="button" onClick={reset} disabled={zoom===1&&pan.x===0&&pan.y===0} aria-label={locale==="de"?"Karte zurücksetzen":"Reset map"}><RotateCcw/></button>
  </div>
  <svg
   viewBox="0 0 100 100"
   style={{touchAction:"none"}}
   onPointerDown={pointerDown}
   onPointerMove={pointerMove}
   onPointerUp={pointerUp}
   onPointerCancel={(event)=>pointers.current.delete(event.pointerId)}
   onWheel={(event)=>{event.preventDefault();applyZoom(zoom+(event.deltaY<0?.2:-.2))}}
   role="img"
   aria-label={`${region.name[locale]} · ${locale==="de"?"schematische Lernkarte":"schematic learning map"}`}
  >
   <defs>
    <linearGradient id={defs.ocean} x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stopColor="#071b2b"/>
     <stop offset=".52" stopColor="#0b2c3c"/>
     <stop offset="1" stopColor="#071722"/>
    </linearGradient>
    <linearGradient id={defs.land} x1=".12" y1=".08" x2=".9" y2=".92">
     <stop offset="0" stopColor={region.secondary} stopOpacity=".62"/>
     <stop offset=".5" stopColor="#204d52"/>
     <stop offset="1" stopColor={region.accent} stopOpacity=".42"/>
    </linearGradient>
    <pattern id={defs.grid} width="10" height="10" patternUnits="userSpaceOnUse">
     <path d="M10 0H0V10" fill="none" stroke="#7ed9e9" strokeOpacity=".12" strokeWidth=".22"/>
     <circle cx="0" cy="0" r=".34" fill="#a5edf4" fillOpacity=".18"/>
    </pattern>
    <pattern id={defs.grain} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
     <path d="M0 1.5H7M0 5.5H7" stroke="#e9fbf5" strokeOpacity=".09" strokeWidth=".28"/>
    </pattern>
    <clipPath id={defs.clip}><path d={region.path}/></clipPath>
    <filter id={defs.glow} x="-30%" y="-30%" width="160%" height="160%">
     <feGaussianBlur stdDeviation="1.5" result="blur"/>
     <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id={defs.fog}>
     <stop offset="0" stopColor="#06131b" stopOpacity=".04"/>
     <stop offset=".64" stopColor="#06131b" stopOpacity=".13"/>
     <stop offset="1" stopColor="#02080d" stopOpacity=".58"/>
    </radialGradient>
   </defs>

   <rect width="100" height="100" fill={`url(#${defs.ocean})`}/>
   <g className="poke-atlas-bathymetry" aria-hidden="true">
    <path d="M-8 18C18 8 29 29 53 17S83 6 108 20"/>
    <path d="M-9 84C16 68 38 92 62 78S87 69 110 82"/>
    <path d="M7 4C14 25 2 39 12 59S18 82 8 104"/>
   </g>
   <rect width="100" height="100" fill={`url(#${defs.grid})`}/>

   <g transform={`translate(${pan.x} ${pan.y}) translate(50 50) scale(${zoom}) translate(-50 -50)`}>
    <path className="poke-region-coast-glow" d={region.path} fill="none" stroke={region.accent} filter={`url(#${defs.glow})`}/>
    <path className="poke-region-land" d={region.path} fill={`url(#${defs.land})`} stroke={region.accent}/>
    <g clipPath={`url(#${defs.clip})`} className="poke-atlas-land-detail" aria-hidden="true">
     <rect width="100" height="100" fill={`url(#${defs.grain})`}/>
     <path d="M-5 24C12 13 28 31 44 22S72 7 105 22"/>
     <path d="M-8 37C15 25 29 45 50 33S78 24 108 39"/>
     <path d="M-8 56C18 43 30 63 51 53S78 42 108 58"/>
     <path d="M-8 73C17 62 37 82 58 68S86 61 108 75"/>
     <path d="M6 91C24 78 39 96 58 84S84 79 101 91"/>
     {region.nodes.map((node)=><circle key={`terrain-${node.id}`} className={`poke-biome-pocket ${concealBiomes?"biome-unknown":`biome-${node.biome}`}`} cx={node.x} cy={node.y} r="8.5"/>)}
    </g>
    <g className="poke-route-network" aria-hidden="true">
     {routes.map(({from,to,bend})=>{
      const mx=(from.x+to.x)/2+bend;
      const my=(from.y+to.y)/2-bend;
      return <path key={`${from.id}-${to.id}`} d={`M${from.x} ${from.y}Q${mx} ${my} ${to.x} ${to.y}`}/>;
     })}
    </g>
    {placement&&activeNode&&showRings&&<line className="poke-survey-vector" x1={placement.x} y1={placement.y} x2={activeNode.x} y2={activeNode.y}/>}
    {region.nodes.map((node)=><g
     key={node.id}
     role={onSector?"button":undefined}
     tabIndex={onSector?0:undefined}
     aria-label={onSector?node.name[locale]:undefined}
     aria-hidden={!onSector&&!showLabels&&!showRings?true:undefined}
     onKeyDown={(event)=>{if(onSector&&(event.key==="Enter"||event.key===" ")){event.preventDefault();onSector(node.id)}}}
     onClick={(event)=>{if(onSector){event.stopPropagation();onSector(node.id)}}}
     className={`poke-map-node ${concealBiomes?"biome-unknown":`biome-${node.biome}`} ${onSector?"is-interactive":""} ${activeSector===node.id?"is-active":""}`}
     transform={`translate(${node.x} ${node.y})`}
    >
     <circle className="poke-map-hit" r={6}/>
     <circle className="poke-map-node-halo" r={3.5}/>
     <circle className="poke-map-node-core" r={1.5}/>
     {showRings&&activeSector===node.id&&<><circle className="poke-distance-ring" r="7"/><circle className="poke-distance-ring is-wide" r="13"/><text className="poke-map-resolved-label" x="4" y="-4">{node.name[locale]}</text></>}
     {showLabels&&<text x="3.5" y="-2.5">{node.name[locale]}</text>}
    </g>)}
    {placement&&<g className="poke-survey-pin" transform={`translate(${placement.x} ${placement.y})`} aria-label={locale==="de"?"Dein Messpunkt":"Your survey pin"}>
     <circle className="poke-survey-pulse" r="6"/>
     <circle className="poke-survey-lock" r="3.3"/>
     <path d="M-5 0H5M0-5V5"/>
     <circle r=".85"/>
    </g>}
   </g>

   {fog&&<g className="poke-atlas-fog" pointerEvents="none" aria-hidden="true">
    <rect width="100" height="100" fill={`url(#${defs.fog})`}/>
    <path d="M-15 17L115 55M-15 37L115 75M-15 57L115 95"/>
   </g>}
   <g className="poke-coordinate-ticks" aria-hidden="true">
    {[10,30,50,70,90].map((value)=><g key={`tick-${value}`}><path d={`M${value} 0v1.6M${value} 100v-1.6M0 ${value}h1.6M100 ${value}h-1.6`}/><text x={value+.8} y="3.4">{value}</text></g>)}
   </g>
  </svg>
  <div className="poke-atlas-interaction"><LocateFixed/><span>{interactionHint}</span></div>
  <div className="poke-atlas-legend" aria-label={locale==="de"?"Kartenlegende":"Map legend"}>
   <span className="is-route"><i/>{locale==="de"?"Route":"Route"}</span>
   {concealBiomes?<span className="biome-unknown"><i/>{locale==="de"?"Unbekannte Sektoren":"Unknown sectors"}</span>:biomeLegend.map((biome)=><span key={biome} className={`biome-${biome}`}><i/>{BIOME_LABELS[biome][locale]}</span>)}
   {placement&&<span className="is-pin"><i/>{locale==="de"?"Dein Pin":"Your pin"}</span>}
  </div>
  <div className="poke-map-pan" aria-label={locale==="de"?"Karte verschieben":"Pan map"}>
   <button type="button" disabled={zoom<=1} onClick={()=>setPan((p)=>({...p,x:Math.min(36,p.x+5)}))} aria-label={locale==="de"?"Nach links verschieben":"Pan left"}>←</button>
   <button type="button" disabled={zoom<=1} onClick={()=>setPan((p)=>({...p,y:Math.min(36,p.y+5)}))} aria-label={locale==="de"?"Nach oben verschieben":"Pan up"}>↑</button>
   <button type="button" disabled={zoom<=1} onClick={()=>setPan((p)=>({...p,y:Math.max(-36,p.y-5)}))} aria-label={locale==="de"?"Nach unten verschieben":"Pan down"}>↓</button>
   <button type="button" disabled={zoom<=1} onClick={()=>setPan((p)=>({...p,x:Math.max(-36,p.x-5)}))} aria-label={locale==="de"?"Nach rechts verschieben":"Pan right"}>→</button>
  </div>
  <figcaption className="poke-map-caption">{locale==="de"?"Originale schematische Lernkarte · nicht maßstabsgetreu":"Original schematic learning map · not to scale"}</figcaption>
 </figure>;
}
