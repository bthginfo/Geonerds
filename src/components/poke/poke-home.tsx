"use client";
import Link from "next/link";
import {ArrowRight,AudioWaveform,FileSearch,GitBranch,Grid3X3,Layers3,MapPinned,PawPrint,Route,ScanSearch,Swords,UsersRound} from "lucide-react";
import {useT} from "@/i18n/I18nProvider";
import {POKE_GAMES} from "@/poke/registry";
import {pl} from "@/poke/types";
import {species} from "@/poke/data";
import {usePokeProgression} from "@/poke/store";
import {POKE_BADGES,trainerLevel} from "@/poke/progression";
import {useAuth} from "@/store/auth";
import {getPokeChallenges,getPokeProfile,type PokeOnlineProfile} from "@/poke/online";
import {useEffect,useState} from "react";
import {PokemonSprite} from "./pokemon-sprite";
import {PokeDisclaimer} from "./disclaimer";
const marks=[ScanSearch,Route,MapPinned,PawPrint,Swords,UsersRound,GitBranch,Layers3,ScanSearch,AudioWaveform,Grid3X3,FileSearch];
export function PokeHome(){
 const {locale}=useT();const progress=usePokeProgression();const level=trainerLevel(progress.xp);
 const weakest=Object.entries(progress.competencyXp).sort((a,b)=>a[1]-b[1])[0]?.[0];const recommended=POKE_GAMES.find((game)=>game.competency===weakest)??POKE_GAMES[0];
 return <div className="poke-home">
  <section className="poke-hero">
   <div className="poke-hero-copy"><p className="poke-kicker">FIELD RESEARCH OS // KANTO-01</p><h1>{locale==="de"?"Beobachten. Kombinieren. Meistern.":"Observe. Connect. Master."}</h1><p>{locale==="de"?"Zwölf taktile Pokémon-Trainingsmissionen auf einem lebendigen Forschungstisch. Keine Quiztapete – echte Karten, Scanner, Labore und Teamentscheidungen.":"Twelve tactile Pokémon training missions on a living research table. No quiz wallpaper—real maps, scanners, labs and team decisions."}</p><Link className="poke-primary" href={`/poke-nerds/play/${recommended.id}`}>{locale==="de"?"Empfohlene Mission starten":"Start recommended mission"} <ArrowRight/></Link></div>
   <div className="poke-specimen-stage" aria-label={locale==="de"?"Lebender Forschungstisch":"Living research table"}>
    <div className="poke-reticle"/><PokemonSprite entry={species(25)} size={230}/><span className="poke-spec-label">SPECIMEN #025 · SIGNAL LOCK</span>
   </div>
   <aside className="poke-trainer-strip"><span>TRAINER LVL</span><b>{String(level).padStart(2,"0")}</b><div><i style={{width:`${Math.min(100,(progress.xp%100))}%`}}/></div><small>{progress.xp} XP · {progress.totalRuns} RUNS</small></aside>
  </section>
  <div className="mx-auto max-w-7xl px-4"><PokeDisclaimer/><Link href="/poke-nerds/cards" className="poke-cards-home-cta"><Layers3/><span><b>{locale==="de"?"Forschungssets & Kartenbinder":"Research sets & card binder"}</b><small>{locale==="de"?"Mit erspielten Forschungspunkten fünf Karten aufdecken und zwei behalten.":"Reveal five with earned Research Credits and keep two."}</small></span><ArrowRight/></Link></div>
  <PokeLeaguePulse locale={locale}/>
  <section className="poke-mission-index">
   <header><div><p className="poke-kicker">12 ACTIVE MODULES</p><h2>{locale==="de"?"Missionsverzeichnis":"Mission index"}</h2></div><p>{locale==="de"?"Jede Mission trainiert eine eigene Feldkompetenz.":"Each mission trains a distinct field competency."}</p></header>
   <div className="poke-game-stack">{POKE_GAMES.map((game,index)=>{const Icon=marks[index];return <Link href={`/poke-nerds/play/${game.id}`} className={`poke-game-entry signal-${game.signal}`} key={game.id}>
    <span className="poke-index">{String(index+1).padStart(2,"0")}</span><div className={`poke-game-instrument mechanic-${game.competency}`} aria-hidden><Icon/><span/><i/><b/><em/></div><div><p>{pl(game.eyebrow,locale)}</p><h3>{pl(game.title,locale)}</h3><span>{pl(game.description,locale)}</span></div><ArrowRight className="poke-row-arrow"/></Link>})}</div>
  </section>
  <footer className="poke-info-footer"><PokeDisclaimer full/></footer>
 </div>;
}
function PokeLeaguePulse({locale}:{locale:"en"|"de"}){
 const user=useAuth((state)=>state.user),[profile,setProfile]=useState<PokeOnlineProfile|null>(null),[pending,setPending]=useState(0);
 useEffect(()=>{if(!user)return;Promise.all([getPokeProfile(),getPokeChallenges()]).then(([a,b])=>{setProfile(a.profile);setPending((b.challenges??[]).filter((item)=>item.status==="pending"&&item.direction==="received").length)})},[user]);
 if(!user)return <section className="poke-league-pulse"><div><p className="poke-kicker">TRAINER LEAGUE</p><h2>{locale==="de"?"Direkte Rivalen. Gleiche Mission.":"Direct rivals. Identical mission."}</h2><span>{locale==="de"?"Dein GeoNerds-Account öffnet Ranglisten und servergesperrte asynchrone Challenges; lokales Spielen bleibt frei.":"Your GeoNerds account unlocks rankings and server-locked asynchronous challenges; local play stays free."}</span></div><Link className="poke-primary" href="/poke-nerds/challenges"><Swords/>{locale==="de"?"Liga öffnen":"Open league"}</Link></section>;
 const rating=profile?.rating,closest=POKE_BADGES.find((badge)=>badge.verified&&!profile?.awards.some((award)=>award.badge_id===badge.id));
 return <section className="poke-league-pulse"><div><p className="poke-kicker">TRAINER LEAGUE // {rating?.tier??"bronze"}</p><h2>{rating?.rating??1000} <small>MMR</small></h2><span>{rating?.placements??0}/5 {locale==="de"?"Platzierungen":"placements"} · {pending} {locale==="de"?"eingehende Challenges":"incoming challenges"} · {locale==="de"?"Nächstes Ziel":"next target"}: {closest?.name[locale]??"—"}</span></div><Link className="poke-primary" href="/poke-nerds/challenges"><Swords/>{locale==="de"?"Trainer herausfordern":"Challenge a trainer"}</Link></section>;
}
