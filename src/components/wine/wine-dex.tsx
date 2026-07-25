"use client";
import { useMemo, useState } from "react";
import { Heart, LockKeyhole, Search } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { APPELLATIONS, AROMAS, GRAPES, REGIONS } from "@/wine/content";
import { dexStage } from "@/wine/progression";
import { useWineDex } from "@/wine/store";
import type { WineEntityType } from "@/wine/types";
import { localize } from "@/wine/types";

type Tab="grape"|"region"|"appellation"|"aroma";
export function WineDex() {
 const {locale}=useT();const [tab,setTab]=useState<Tab>("grape"),[query,setQuery]=useState(""),[favorites,setFavorites]=useState(false);const {records,toggleFavorite}=useWineDex();
 const items=useMemo(()=>{
  if(tab==="grape")return GRAPES.map(x=>({id:x.id,name:x.name,type:"grape" as WineEntityType,summary:localize(x.climate,locale),detail:`${localize(x.structure,locale)} · ${x.aromas.join(", ")} · ${x.regions.join(", ")}`}));
  if(tab==="region")return REGIONS.map(x=>({id:x.id,name:localize(x.name,locale),type:"region" as WineEntityType,summary:localize(x.country,locale),detail:`${localize(x.climate,locale)} · ${x.grapes.map(id=>GRAPES.find(g=>g.id===id)?.name).join(", ")}`}));
  if(tab==="appellation")return APPELLATIONS.map(x=>({id:x.id,name:x.name,type:"appellation" as WineEntityType,summary:localize(x.level,locale),detail:localize(x.style,locale)}));
  return AROMAS.map(x=>({id:x.id,name:localize(x.name,locale),type:"aroma" as WineEntityType,summary:x.family,detail:localize(x.note,locale)}));
 },[tab,locale]);
 const visible=items.filter(x=>(!favorites||records[x.id]?.favorite)&&x.name.toLowerCase().includes(query.toLowerCase()));
 return <div className="mx-auto max-w-6xl px-4 py-10">
  <p className="wine-kicker">{locale==="de"?"Kellerpass-Archiv":"Cellar passport archive"}</p><h1 className="mt-3 text-5xl font-black tracking-[-.05em] text-[var(--wine-cream)]">Wine-Dex</h1><p className="mt-4 max-w-2xl text-[var(--wine-muted)]">{locale==="de"?"Begegne einem Eintrag, studiere ihn in mehreren Spielen und zertifiziere sein vollständiges Profil.":"Encounter an entry, study it across games, then certify its complete profile."}</p>
  <div className="mt-8 flex flex-wrap gap-2">{(["grape","region","appellation","aroma"] as Tab[]).map(t=><button key={t} onClick={()=>setTab(t)} className={`wine-mini capitalize ${tab===t?"is-selected":""}`}>{t}</button>)}</div>
  <div className="mt-5 flex gap-2"><label className="flex min-h-11 flex-1 items-center gap-2 border border-[var(--wine-line)] bg-black/15 px-3"><Search className="h-4 w-4 text-[var(--wine-muted)]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={locale==="de"?"Filtern":"Filter"} className="w-full bg-transparent outline-none"/></label><button onClick={()=>setFavorites(x=>!x)} className={`wine-icon ${favorites?"is-selected":""}`} aria-label="Favorites"><Heart className="h-5 w-5"/></button></div>
  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map(item=>{const record=records[item.id],stage=dexStage(record),open=stage==="certified"||stage==="mastered";return <article key={item.id} className={`wine-dex-card ${stage==="sealed"?"is-sealed":""}`}>
   <div className="flex items-start justify-between gap-3"><div><p className="wine-kicker">{stage}</p><h2 className="mt-2 text-xl font-bold text-[var(--wine-cream)]">{stage==="sealed"?"••••••":item.name}</h2></div>{record&&<button onClick={()=>toggleFavorite(item.id)} className="wine-icon h-9 w-9"><Heart className={`h-4 w-4 ${record.favorite?"fill-current text-[var(--wine-copper)]":""}`}/></button>}</div>
   {open?<><p className="mt-3 text-sm font-semibold text-[var(--wine-copper)]">{item.summary}</p><p className="mt-2 text-sm leading-6 text-[var(--wine-muted)]">{item.detail}</p></>:<div className="mt-4 flex items-start gap-2 border-t border-[var(--wine-line)] pt-4 text-xs leading-5 text-[var(--wine-muted)]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>{stage==="sealed"?(locale==="de"?"Noch nicht in einem Spiel erkannt.":"Not yet encountered in a game."):(locale==="de"?`${record?.correct??0}/6 Treffer · In zwei Spielen lernen, um das Profil zu öffnen.`:`${record?.correct??0}/6 correct · Study in two games to open the profile.`)}</div>}
  </article>})}</div>
 </div>
}

