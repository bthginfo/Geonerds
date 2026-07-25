"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, Flame, LockKeyhole, Sparkles, Target, Trophy } from "lucide-react";
import { WINE_GAMES } from "@/wine/registry";
import { useT } from "@/i18n/I18nProvider";
import { localize } from "@/wine/types";
import { cellarRank, learningStreak, wineLevel, WINE_COMPETENCIES } from "@/wine/progression";
import { useWineDex, useWineProgression } from "@/wine/store";
import { dexStage } from "@/wine/progression";

export function WineHome() {
 const {locale}=useT(); const p=useWineProgression(); const records=useWineDex(s=>s.records);
 const level=wineLevel(p.xp), streak=learningStreak(p.activeDays);
 const weakest=[...WINE_COMPETENCIES].sort((a,b)=>p.competencyXp[a]-p.competencyXp[b])[0];
 const recommended=WINE_GAMES.find(g=>g.competency===weakest)??WINE_GAMES[0];
 const certified=Object.values(records).filter(r=>["certified","mastered"].includes(dexStage(r))).length;
 return <div>
  <section className="wine-hero relative overflow-hidden border-b border-[var(--wine-line)]">
   <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.3fr_.7fr] md:py-20">
    <div>
     <p className="wine-kicker">{locale==="de"?"Dein Sommelier-Lernkeller":"Your sommelier learning cellar"}</p>
     <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[.94] tracking-[-.06em] text-[var(--wine-cream)] md:text-7xl">{locale==="de"?"Lerne, Wein zu begründen.":"Learn to reason about wine."}</h1>
     <p className="mt-6 max-w-xl text-base leading-7 text-[var(--wine-muted)]">{locale==="de"?"Vierzehn spielbare Übungen für Herkunft, Rebsorten, Sensorik, Pairing und Kellerentscheidungen. Kein Konsum erforderlich.":"Fourteen playable drills for origin, grapes, sensory reasoning, pairing and cellar decisions. No consumption required."}</p>
     <div className="mt-8 flex flex-wrap gap-3">
      <Link href={`/wine-nerds/play/${recommended.id}`} className="wine-button"><Sparkles className="h-4 w-4"/>{locale==="de"?"Empfohlene Session":"Recommended session"}<ArrowRight className="h-4 w-4"/></Link>
      <Link href="/wine-nerds/dex" className="wine-button wine-button-quiet"><BookOpen className="h-4 w-4"/>Wine-Dex</Link>
     </div>
    </div>
    <div className="wine-passport self-end">
     <div className="flex items-center justify-between"><span className="wine-kicker">{locale==="de"?"Kellerpass":"Cellar passport"}</span><span className="font-mono text-3xl font-black text-[var(--wine-copper)]">L{level}</span></div>
     <p className="mt-2 text-2xl font-bold text-[var(--wine-cream)]">{cellarRank(p.xp)}</p>
     <div className="mt-6 grid grid-cols-3 gap-2 text-center">
      <Metric icon={Flame} value={streak} label={locale==="de"?"Serie":"streak"}/>
      <Metric icon={Target} value={p.total?`${Math.round(p.correct/p.total*100)}%`:"—"} label={locale==="de"?"Treffer":"accuracy"}/>
      <Metric icon={Trophy} value={certified} label={locale==="de"?"Zertifiziert":"certified"}/>
     </div>
     <div className="mt-5 h-2 overflow-hidden bg-black/25"><div className="h-full bg-[var(--wine-copper)]" style={{width:`${Math.min(100,(p.xp%Math.max(120,level*120))/(level*120)*100)}%`}}/></div>
     <p className="mt-2 text-xs text-[var(--wine-muted)]">{p.xp} XP · {locale==="de"?"Nächster Rang entsteht durch wiederholte Begründung.":"Your next rank comes from repeated reasoning."}</p>
    </div>
   </div>
  </section>
  <section className="mx-auto max-w-6xl px-4 py-10">
   <div className="mb-6 flex items-end justify-between gap-4"><div><p className="wine-kicker">{locale==="de"?"Täglicher Flight":"Daily tasting flight"}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--wine-cream)]">{locale==="de"?"Heute: deine schwächste Disziplin":"Today: your weakest skill"}</h2></div><span className="hidden font-mono text-sm uppercase text-[var(--wine-vine)] sm:block">{weakest}</span></div>
   <Link href={`/wine-nerds/play/${recommended.id}?daily=1`} className="wine-feature group">
    <div><span className="wine-kicker">{localize(recommended.eyebrow,locale)}</span><h3 className="mt-2 text-2xl font-bold text-[var(--wine-cream)]">{localize(recommended.title,locale)}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--wine-muted)]">{localize(recommended.description,locale)}</p></div>
    <ArrowRight className="h-6 w-6 text-[var(--wine-copper)] transition-transform group-hover:translate-x-1"/>
   </Link>
  </section>
  <section className="mx-auto max-w-6xl px-4 pb-16">
   <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black text-[var(--wine-cream)]">{locale==="de"?"Übungskeller":"Practice cellar"}</h2><span className="text-xs text-[var(--wine-muted)]">14 {locale==="de"?"aktive Spiele":"live games"}</span></div>
   <div className="wine-game-list">{WINE_GAMES.map((game,i)=><Link key={game.id} href={`/wine-nerds/play/${game.id}`} className={`wine-game-row wine-tone-${game.tone}`}>
    <span className="font-mono text-xs text-[var(--wine-muted)]">{String(i+1).padStart(2,"0")}</span>
    <div><p className="wine-kicker">{localize(game.eyebrow,locale)}</p><h3 className="mt-1 text-xl font-bold text-[var(--wine-cream)]">{localize(game.title,locale)}</h3><p className="mt-1 text-sm leading-5 text-[var(--wine-muted)]">{localize(game.description,locale)}</p></div>
    <div className="flex items-center gap-3"><span className="hidden text-xs uppercase tracking-widest text-[var(--wine-muted)] sm:block">{game.competency}</span><ArrowRight className="h-5 w-5"/></div>
   </Link>)}</div>
   <p className="mt-8 flex items-start gap-2 border-l-2 border-[var(--wine-vine)] pl-4 text-xs leading-5 text-[var(--wine-muted)]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>{locale==="de"?"Wine-XP, Wine-Dex und Ranglisten sind vollständig von deinem GeoNerds-Fortschritt getrennt. Wine-Nerds ist ein unabhängiges Übungstool und keine offizielle Zertifizierung.":"Wine XP, Wine-Dex and rankings are fully separate from GeoNerds progress. Wine-Nerds is an independent practice tool, not an official certification."}</p>
  </section>
 </div>;
}
function Metric({icon:Icon,value,label}:{icon:typeof Flame;value:string|number;label:string}){return <div className="border border-[var(--wine-line)] bg-black/15 p-3"><Icon className="mx-auto h-4 w-4 text-[var(--wine-copper)]"/><p className="mt-1 font-mono text-xl font-bold">{value}</p><p className="text-[10px] uppercase tracking-wider text-[var(--wine-muted)]">{label}</p></div>}

