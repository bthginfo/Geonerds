"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Flame, Target, Trophy } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { WINE_BADGES, WINE_COMPETENCIES, cellarRank, learningStreak, wineLevel } from "@/wine/progression";
import { WINE_GAMES } from "@/wine/registry";
import { useWineProgression, useWineScores } from "@/wine/store";
import { useAuth } from "@/store/auth";

export function WineLeaderboard() {
 const {locale}=useT();const runs=useWineScores(s=>s.runs);const user=useAuth(s=>s.user);
 const [global,setGlobal]=useState<{configured:boolean;scores:{name:string;score:number;games:number}[]}|null>(null);
 useEffect(()=>{let live=true;fetch("/api/wine-scores").then(r=>r.json()).then(data=>{if(live)setGlobal(data)}).catch(()=>{if(live)setGlobal({configured:false,scores:[]})});return()=>{live=false}},[]);
 const aggregate=Object.values(runs.reduce<Record<string,{score:number;runs:number}>>((acc,r)=>{const old=acc[r.gameId]??{score:0,runs:0};acc[r.gameId]={score:Math.max(old.score,r.score),runs:old.runs+1};return acc},{}));
 const total=aggregate.reduce((s,x)=>s+x.score,0);
 return <Page title={locale==="de"?"Wine-Rangliste":"Wine leaderboard"} kicker={locale==="de"?"Beste Leistung je Spiel · kein Lucky Run":"Best performance per game · no lucky-run ranking"}>
  <div className="wine-leader"><div className="font-mono text-2xl font-black text-[var(--wine-copper)]">01</div><div><b className="text-[var(--wine-cream)]">{user?.name??(locale==="de"?"Du auf diesem Gerät":"You on this device")}</b><p className="text-xs text-[var(--wine-muted)]">{aggregate.length}/14 {locale==="de"?"Spiele im Gesamtrang":"games contributing"}</p></div><span className="ml-auto font-mono text-xl font-black">{total}</span></div>
  <p className="mt-5 text-xs leading-5 text-[var(--wine-muted)]">{locale==="de"?"Die Wine-Rangliste nutzt ausschließlich wine-nerds-scores. Wenn die globale Datenbank nicht konfiguriert ist, bleibt diese gerätebasierte Rangliste verfügbar.":"The Wine leaderboard reads only wine-nerds-scores. When the global database is not configured, this device leaderboard remains available."}</p>
  {global?.configured&&global.scores.length>0&&<section className="mt-8"><p className="wine-kicker">{locale==="de"?"Globale Rangliste":"Global ranking"}</p><div className="mt-3">{global.scores.map((row,i)=><div key={`${row.name}-${i}`} className="wine-rank-row"><span><b className="mr-3 font-mono text-[var(--wine-copper)]">{String(i+1).padStart(2,"0")}</b>{row.name}</span><span className="font-mono">{row.score} · {row.games}/14</span></div>)}</div></section>}
  <div className="mt-8 space-y-2">{WINE_GAMES.map(g=>{const best=runs.filter(r=>r.gameId===g.id).sort((a,b)=>b.score-a.score)[0];return <div key={g.id} className="wine-rank-row"><span>{locale==="de"?g.title.de:g.title.en}</span><b className="font-mono">{best?.score??"—"}</b></div>})}</div>
 </Page>;
}
export function WineBadges() {
 const {locale}=useT();const p=useWineProgression();const streak=learningStreak(p.activeDays);
 return <Page title={locale==="de"?"Wine-Badges":"Wine badges"} kicker={locale==="de"?"Meilensteine mit Bedeutung":"Milestones that mean something"}><div className="grid gap-3 sm:grid-cols-2">{WINE_BADGES.map(b=>{const value=b.metric==="runs"?p.totalRuns:b.metric==="correct"?p.correct:b.metric==="days"?streak:p.xp;const progress=Math.min(100,value/b.goal*100);return <article key={b.id} className="wine-dex-card"><Award className={`h-7 w-7 ${progress===100?"text-[var(--wine-copper)]":"text-[var(--wine-muted)]"}`}/><h2 className="mt-4 text-xl font-bold text-[var(--wine-cream)]">{locale==="de"?b.name.de:b.name.en}</h2><p className="mt-1 font-mono text-xs text-[var(--wine-muted)]">{Math.min(value,b.goal)} / {b.goal}</p><div className="mt-4 h-2 bg-black/25"><div className="h-full bg-[var(--wine-copper)]" style={{width:`${progress}%`}}/></div></article>})}</div></Page>
}
export function WineProfile() {
 const {locale}=useT();const p=useWineProgression();const weakest=[...WINE_COMPETENCIES].sort((a,b)=>p.competencyXp[a]-p.competencyXp[b])[0];const rec=WINE_GAMES.find(g=>g.competency===weakest)!;
 return <Page title={locale==="de"?"Dein Wine-Profil":"Your Wine profile"} kicker={`${cellarRank(p.xp)} · Level ${wineLevel(p.xp)}`}><div className="grid gap-3 sm:grid-cols-3"><Stat icon={Flame} value={learningStreak(p.activeDays)} label={locale==="de"?"Tage Serie":"day streak"}/><Stat icon={Target} value={p.total?`${Math.round(p.correct/p.total*100)}%`:"—"} label={locale==="de"?"Genauigkeit":"accuracy"}/><Stat icon={Trophy} value={p.totalRuns} label={locale==="de"?"Sessions":"sessions"}/></div><h2 className="mt-10 text-xl font-black text-[var(--wine-cream)]">{locale==="de"?"Kompetenzprofil":"Competency profile"}</h2><div className="mt-4 space-y-3">{WINE_COMPETENCIES.map(c=><div key={c} className="grid grid-cols-[100px_1fr_55px] items-center gap-3"><span className="text-xs uppercase text-[var(--wine-muted)]">{c}</span><div className="h-2 bg-black/25"><div className="h-full bg-[var(--wine-vine)]" style={{width:`${Math.min(100,p.competencyXp[c]/10)}%`}}/></div><b className="text-right font-mono text-xs">{p.competencyXp[c]}</b></div>)}</div><Link href={`/wine-nerds/play/${rec.id}`} className="wine-feature mt-10"><div><p className="wine-kicker">{locale==="de"?"Empfehlung für dein schwächstes Feld":"Recommendation for your weakest field"}</p><h2 className="mt-2 text-xl font-bold text-[var(--wine-cream)]">{locale==="de"?rec.title.de:rec.title.en}</h2></div><ArrowRight className="h-5 w-5 text-[var(--wine-copper)]"/></Link></Page>
}
function Page({title,kicker,children}:{title:string;kicker:string;children:React.ReactNode}){return <div className="mx-auto max-w-5xl px-4 py-10"><p className="wine-kicker">{kicker}</p><h1 className="mt-3 mb-8 text-5xl font-black tracking-[-.05em] text-[var(--wine-cream)]">{title}</h1>{children}</div>}
function Stat({icon:Icon,value,label}:{icon:typeof Flame;value:string|number;label:string}){return <div className="wine-stat"><Icon className="h-5 w-5 text-[var(--wine-copper)]"/><span>{value}</span><small>{label}</small></div>}
