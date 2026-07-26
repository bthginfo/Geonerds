"use client";

import {useMemo,useState} from "react";
import {Check,LockKeyhole,ShieldAlert,Swords} from "lucide-react";
import {SPECIES,species} from "@/poke/data";
import {buildGymTrials,evaluateGymDeployment,gymMemberUses,type GymDeployment} from "@/poke/gym-draft";
import {STANDARD_TYPES,TYPE_COLORS,localizedType} from "@/poke/type-chart";
import {seededShuffle} from "@/poke/variety";
import {Feedback,RunHud,type GameProps} from "../gameplay";
import {PokemonSprite} from "../pokemon-sprite";

const KANTO_DRAFT_IDS=[3,6,9,12,18,25,31,34,36,38,45,47,55,59,65,68,71,76,82,94,103,121,124,130,131,134,135,136,142,143];

export function GymDraftGauntlet({locale,difficulty,generationCap,roundCount,runSeed,onFinish}:GameProps){
 const pool=useMemo(()=>{
  if(generationCap===1)return seededShuffle(KANTO_DRAFT_IDS.map(species),`${runSeed}:draft-pool`);
  const scoped=seededShuffle(SPECIES.filter((entry)=>entry.generation<=generationCap),`${runSeed}:draft-pool`);
  const step=Math.max(1,Math.floor(scoped.length/30));
  return scoped.filter((_,index)=>index%step===0).slice(0,30);
 },[generationCap,runSeed]);
 const trials=useMemo(()=>buildGymTrials(roundCount,runSeed),[roundCount,runSeed]);
 const [draft,setDraft]=useState<number[]>([]);
 const [locked,setLocked]=useState(false);
 const [trialIndex,setTrialIndex]=useState(0);
 const [uses,setUses]=useState<Record<number,number>>({});
 const [score,setScore]=useState(0);
 const [correct,setCorrect]=useState(0);
 const [streak,setStreak]=useState(0);
 const [results,setResults]=useState<GymDeployment[]>([]);
 const [deployment,setDeployment]=useState<{memberId:number;outcome:GymDeployment;gained:number}|null>(null);
 const [filterType,setFilterType]=useState("all");
 const [sortBy,setSortBy]=useState<"seeded"|"cost"|"speed">("seeded");
 const budget=difficulty==="easy"?520:difficulty==="medium"?460:420;
 const maxUses=gymMemberUses(roundCount,difficulty);
 const cost=(id:number)=>Math.round(Object.values(species(id).stats).reduce((sum,value)=>sum+value,0)/6);
 const spent=draft.reduce((sum,id)=>sum+cost(id),0);
 const visiblePool=pool.filter((entry)=>filterType==="all"||entry.types.includes(filterType)).sort((a,b)=>sortBy==="cost"?cost(a.id)-cost(b.id):sortBy==="speed"?b.stats.speed-a.stats.speed:0);
 const forecast=Object.entries(trials.reduce<Record<string,number>>((counts,trial)=>({...counts,[trial.type]:(counts[trial.type]??0)+1}),{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const coverageFor=(ids:number[])=>trials.filter((trial)=>ids.some((id)=>evaluateGymDeployment(species(id).types,trial.type,0,maxUses,difficulty).success)).length;
 const projected=coverageFor(draft);

 const toggle=(id:number)=>setDraft((items)=>
  items.includes(id)
   ?items.filter((item)=>item!==id)
   :items.length<6&&spent+cost(id)<=budget?[...items,id]:items,
 );

 const current=trials[trialIndex];
 const deploy=(memberId:number)=>{
  if(!current||deployment||(uses[memberId]??0)>=maxUses)return;
  const outcome=evaluateGymDeployment(species(memberId).types,current.type,uses[memberId]??0,maxUses,difficulty);
  const comboBonus=outcome.success?streak*45:0;
  const gained=outcome.points+comboBonus;
  setUses((state)=>({...state,[memberId]:(state[memberId]??0)+1}));
  setScore((value)=>value+gained);
  setCorrect((value)=>value+(outcome.success?1:0));
  setStreak(outcome.success?streak+1:0);
  setResults((items)=>[...items,outcome]);
  setDeployment({memberId,outcome,gained});
 };

 const next=()=>{
  if(!deployment)return;
  const completed=trialIndex+1;
  if(completed>=trials.length){
   onFinish(score,correct,completed,draft);
   return;
  }
  setTrialIndex(completed);
  setDeployment(null);
 };

 if(locked&&current){
  const ready=draft.filter((id)=>(uses[id]??0)<maxUses).length;
  return <div className="poke-draft-report" style={{"--type-color":TYPE_COLORS[current.type]} as React.CSSProperties}>
   <RunHud score={score} round={trialIndex+1} total={trials.length} resource={ready} label={locale==="de"?"BEREIT":"READY"}/>
   <header className="poke-draft-header">
    <div>
     <p className="poke-kicker">ACTIVE TRIAL // {String(trialIndex+1).padStart(2,"0")}</p>
     <h2>{current.label[locale]}</h2>
     <p>{locale==="de"?"Setze ein Teammitglied ein. Offensive Coverage und defensive Resistenz zählen gemeinsam; wiederholte Einsätze erzeugen Erschöpfung.":"Deploy one team member. Offensive coverage and defensive resistance both matter; repeated deployments create fatigue."}</p>
    </div>
    <div>{localizedType(current.type,locale).toUpperCase()}<small> TYPE</small></div>
   </header>

   <div className="poke-path-history" aria-label={locale==="de"?"Prüfungsfortschritt":"Trial progress"}>
    {trials.map((trial,index)=><span key={trial.id} className={index<trialIndex?(results[index]?.success?"is-pass":"is-fail"):index===trialIndex?"is-current":""}>
     <b>{String(index+1).padStart(2,"0")}</b>
     {index<=trialIndex?localizedType(trial.type,locale):"LOCKED"}
     <small>{index<trialIndex?(results[index]?.success?"PASS":"LOGGED"):index===trialIndex?"ACTIVE":"SEALED"}</small>
    </span>)}
   </div>

   <div className="poke-draft-layout">
    <section className="poke-roster-wall" aria-label={locale==="de"?"Verbleibendes Team":"Remaining roster"}>
     {draft.map((id)=>{
      const entry=species(id);
      const used=uses[id]??0;
      const exhausted=used>=maxUses;
      const selected=deployment?.memberId===id;
      return <button
       key={id}
       onClick={()=>deploy(id)}
       disabled={exhausted||!!deployment}
       className={selected?"is-drafted":""}
       aria-label={`${entry.name[locale]}, ${maxUses-used} ${locale==="de"?"Einsätze übrig":"deployments remaining"}`}
      >
       <PokemonSprite entry={entry} size={92}/>
       <span>{entry.types.map((type)=>localizedType(type,locale)).join(" · ")}</span>
       <b>{entry.name[locale]}</b>
       <small>{locale==="de"?"ENERGIE":"ENERGY"} {Math.max(0,maxUses-used)}/{maxUses}</small>
      </button>;
     })}
    </section>
    <aside className="poke-draft-tray">
     <span>{locale==="de"?"PRÜFUNGSSIGNAL":"TRIAL SIGNAL"}</span>
     <div style={{gridColumn:"1 / -1"}}>
      <Swords/>
      <b>{localizedType(current.type,locale)}</b>
      <small>{current.field[locale]}</small>
     </div>
     <p>{locale==="de"
      ?`Jedes Teammitglied kann in dieser Mission höchstens ${maxUses}-mal antreten. Wiederholte Einsätze senken zusätzlich die Wertung.`
      :`Each team member can deploy at most ${maxUses} times this mission. Repeated use also reduces its score.`}</p>
     {!deployment&&<p>{locale==="de"?"Wähle jetzt ein verfügbares Teammitglied links.":"Choose an available team member now."}</p>}
    </aside>
   </div>

   {deployment&&<Feedback good={deployment.outcome.success}>
    {deployment.outcome.success?<Check/>:<ShieldAlert/>}
    <span>
     <b>{deployment.outcome.success
      ?(locale==="de"?"Effektiver Konter":"Effective counter")
      :(locale==="de"?"Protokolliert, aber ohne Typenvorteil":"Logged without a type advantage")}</b>
     <small>{species(deployment.memberId).name[locale]} · {deployment.outcome.effectiveness}× offense · {deployment.outcome.resistance}× incoming · +{deployment.gained} · {locale==="de"?"Einsatz":"deployment"} {uses[deployment.memberId]??0}/{maxUses}</small>
    </span>
    <button onClick={next}>{trialIndex+1>=trials.length
     ?(locale==="de"?"Gauntlet abschließen":"Complete gauntlet")
     :(locale==="de"?"Nächste Prüfung":"Next trial")} →</button>
   </Feedback>}
  </div>;
 }

 return <div className="poke-draft">
  <RunHud score={0} round={draft.length} total={6} resource={budget-spent} label="BUDGET"/>
  <header className="poke-draft-header">
   <div><p className="poke-kicker">BLIND TYPE TRIAL SEQUENCE</p><h2>{locale==="de"?"Drafte sechs unter Budget":"Draft six under budget"}</h2></div>
   <div>{spent}<small> / {budget}</small></div>
  </header>
  <section className="poke-draft-forecast"><div><span>{locale==="de"?"RISIKOPROGNOSE":"RISK FORECAST"}</span>{forecast.map(([type,count])=><b key={type} style={{"--type-color":TYPE_COLORS[type]} as React.CSSProperties}>{localizedType(type,locale)} <small>{count}×</small></b>)}</div><strong>{projected}/{trials.length}<small>{locale==="de"?" Prüfungen aktuell abgedeckt":" trials currently covered"}</small></strong></section>
  <div className="poke-draft-filters"><select aria-label={locale==="de"?"Typ filtern":"Filter type"} value={filterType} onChange={(event)=>setFilterType(event.target.value)}><option value="all">{locale==="de"?"Alle Typen":"All types"}</option>{STANDARD_TYPES.map((type)=><option key={type} value={type}>{localizedType(type,locale)}</option>)}</select><select aria-label={locale==="de"?"Sortieren":"Sort"} value={sortBy} onChange={(event)=>setSortBy(event.target.value as typeof sortBy)}><option value="seeded">{locale==="de"?"Seed-Reihenfolge":"Seed order"}</option><option value="cost">{locale==="de"?"Kosten aufsteigend":"Lowest cost"}</option><option value="speed">{locale==="de"?"Initiative absteigend":"Highest speed"}</option></select></div>
  <div className="poke-draft-layout">
   <div className="poke-roster-wall">{visiblePool.map((entry)=>{const selected=draft.includes(entry.id),coverageGain=selected?0:coverageFor([...draft,entry.id])-projected;return <button key={entry.id} onClick={()=>toggle(entry.id)} className={selected?"is-drafted":""} disabled={!selected&&(draft.length>=6||spent+cost(entry.id)>budget)}>
    <PokemonSprite entry={entry} size={82}/><span>#{entry.id} · {cost(entry.id)} · {entry.types.map((type)=>localizedType(type,locale)).join("/")}</span><b>{entry.name[locale]}</b><small>{selected?(locale==="de"?"IM TEAM":"IN TEAM"):`+${coverageGain} ${locale==="de"?"neue Prüfungs-Coverage":"new trial coverage"}`}</small>
   </button>})}</div>
   <aside className="poke-draft-tray">
    <span>FIELD SIX</span>
    {[0,1,2,3,4,5].map((slot)=>draft[slot]?<button key={slot} onClick={()=>toggle(draft[slot])}><PokemonSprite entry={species(draft[slot])} size={65}/><small>{species(draft[slot]).name[locale]}</small></button>:<div key={slot}>EMPTY</div>)}
    <p>{locale==="de"
     ?`Nach dem Lock spielst du ${roundCount} Prüfungen selbst. Jede Auswahl verbraucht Energie.`
     :`After lock-in, you actively play ${roundCount} trials. Every deployment consumes energy.`}</p>
    <button className="poke-primary" disabled={draft.length!==6} onClick={()=>setLocked(true)}>LOCK DRAFT <LockKeyhole/></button>
   </aside>
  </div>
 </div>;
}
