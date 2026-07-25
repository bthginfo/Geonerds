import { APPELLATIONS, AROMAS, GRAPES, PAIRINGS, REGIONS } from "./content";
import type { Localized, WineGameId } from "./types";

export function seeded(seed:number) {
  let value=seed>>>0;
  return ()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};
}
export function shuffle<T>(items:T[], seed:number) {
  const out=[...items],random=seeded(seed);
  for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
export function uniqueChoices<T extends {id:string}>(answer:T,pool:T[],count:number,seed:number) {
  return [answer,...shuffle(pool.filter(x=>x.id!==answer.id),seed).slice(0,count-1)];
}
export interface WineQuestion {
 id:string; prompt:Localized; choices:{id:string;label:Localized}[]; answer:string; explanation:Localized;
 entity?:{id:string;type:"grape"|"region"|"appellation"|"aroma"|"style"};
}
export function questionsFor(game:WineGameId,seed=1):WineQuestion[] {
 const grapeQs=GRAPES.map((g,i)=>({
  id:`${game}-${g.id}`,prompt:game==="grape-dna"?g.clue:{en:`Which grape is commonly associated with ${g.aromas.slice(0,2).join(" and ")} and ${g.climate.en} sites?`,de:`Welche Rebsorte wird häufig mit ${g.aromas.slice(0,2).join(" und ")} sowie ${g.climate.de}en Lagen verbunden?`},
  choices:uniqueChoices(g,GRAPES,4,seed+i).map(x=>({id:x.id,label:{en:x.name,de:x.name}})),answer:g.id,
  explanation:{en:`${g.name}: ${g.structure.en}. Typical is contextual, not absolute.`,de:`${g.name}: ${g.structure.de}. Typische Merkmale sind kontextabhängig, nicht absolut.`},
  entity:{id:g.id,type:"grape" as const},
 }));
 if(game==="terroir-detective"||game==="grape-dna")return shuffle(grapeQs,seed);
 if(game==="label-decoder")return shuffle(APPELLATIONS.map((a,i)=>({
  id:`label-${a.id}`,prompt:{en:`Synthetic label: “North Lantern · ${a.name} · 2022 · Estate Bottled”. What does ${a.name} identify?`,de:`Fiktives Etikett: „North Lantern · ${a.name} · 2022 · Estate Bottled“. Was bezeichnet ${a.name}?`},
  choices:uniqueChoices(a,APPELLATIONS,4,seed+i).map(x=>({id:x.id,label:{en:`${x.name} — ${x.level.en}`,de:`${x.name} — ${x.level.de}`}})),answer:a.id,
  explanation:{en:`${a.name} is a ${a.level.en} associated here with ${a.style.en}.`,de:`${a.name} ist ${a.level.de} und wird hier mit ${a.style.de} verbunden.`},
  entity:{id:a.id,type:"appellation" as const},
 })),seed);
 if(game==="pairing-duel")return shuffle(PAIRINGS.map(p=>({id:p.id,prompt:{en:`Which is the more defensible match for ${p.dish.en}?`,de:`Was ist das plausiblere Pairing zu ${p.dish.de}?`},choices:[{id:"a",label:p.a},{id:"b",label:p.b}],answer:p.answer,explanation:p.why,entity:{id:p.id,type:"style" as const}})),seed);
 if(game==="aroma-atelier")return shuffle(AROMAS.filter(a=>a.grapeIds.length).map((a,i)=>{
  const g=GRAPES.find(x=>x.id===a.grapeIds[0])!;
  return {id:`aroma-${a.id}`,prompt:{en:`Place “${a.name.en}” with the most defensible grape association.`,de:`Ordne „${a.name.de}“ der plausibelsten Rebsorte zu.`},choices:uniqueChoices(g,GRAPES,4,seed+i).map(x=>({id:x.id,label:{en:x.name,de:x.name}})),answer:g.id,explanation:a.note,entity:{id:a.id,type:"aroma" as const}};
 }),seed);
 const regionQs=REGIONS.map((r,i)=>({id:`region-${r.id}`,prompt:{en:`Which region fits: ${r.climate.en}; ${r.grapes.map(id=>GRAPES.find(g=>g.id===id)?.name).filter(Boolean).join(", ")}?`,de:`Welche Region passt: ${r.climate.de}; ${r.grapes.map(id=>GRAPES.find(g=>g.id===id)?.name).filter(Boolean).join(", ")}?`},choices:uniqueChoices(r,REGIONS,4,seed+i).map(x=>({id:x.id,label:x.name})),answer:r.id,explanation:{en:`${r.name.en}, ${r.country.en}, lies near ${r.lat.toFixed(1)}°, ${r.lng.toFixed(1)}°.`,de:`${r.name.de}, ${r.country.de}, liegt etwa bei ${r.lat.toFixed(1)}°, ${r.lng.toFixed(1)}°.`},entity:{id:r.id,type:"region" as const}}));
 return shuffle(regionQs,seed);
}

export function scoreMapClick(lat:number,lng:number,target:{lat:number;lng:number}) {
 const dy=lat-target.lat; const dx=(lng-target.lng)*Math.cos(target.lat*Math.PI/180); const distance=Math.sqrt(dy*dy+dx*dx);
 return {distance,score:Math.max(0,Math.round(1000-distance*35)),correct:distance<=8};
}

