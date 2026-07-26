"use client";

import {useMemo,useState} from "react";
import {Check,FlaskConical,X} from "lucide-react";
import {species} from "@/poke/data";
import {
 evolutionEdgeKey,
 evolutionFamilySequence,
 evolutionLevels,
 isBranchingFamily,
 shuffledEvolutionNodes,
 type EvolutionFamily,
} from "@/poke/evolution";
import {seededShuffle} from "@/poke/variety";
import {Feedback,RunHud,type GameProps} from "../gameplay";
import {PokemonSprite} from "../pokemon-sprite";

const CONDITION_DISTRACTORS=[
 {en:"Level 20",de:"Level 20"},
 {en:"Level 30",de:"Level 30"},
 {en:"Level 36",de:"Level 36"},
 {en:"Level 50",de:"Level 50"},
 {en:"High friendship",de:"Hohe Freundschaft"},
 {en:"Evolution stone",de:"Entwicklungsstein"},
 {en:"Moon Stone",de:"Mondstein"},
 {en:"Leaf Stone",de:"Blattstein"},
 {en:"Water Stone",de:"Wasserstein"},
 {en:"Trade",de:"Tausch"},
 {en:"Trade holding an item",de:"Tausch mit getragenem Item"},
 {en:"Level up during the day",de:"Levelaufstieg am Tag"},
 {en:"Level up at night",de:"Levelaufstieg bei Nacht"},
 {en:"Level up after learning a move",de:"Levelaufstieg nach Erlernen einer Attacke"},
 {en:"Level up during rain",de:"Levelaufstieg bei Regen"},
] as const;

export function EvolutionLab(props:GameProps){
 const families=useMemo(
  ()=>evolutionFamilySequence(props.generationCap,props.roundCount,props.runSeed),
  [props.generationCap,props.roundCount,props.runSeed],
 );
 const [index,setIndex]=useState(0);
 const [score,setScore]=useState(0);
 const [completed,setCompleted]=useState(0);
 const [encountered,setEncountered]=useState<number[]>([]);
 const family=families[index];

 if(!family)return null;
 const finish=(gained:number,ids:number[])=>{
  const nextScore=score+gained;
  const nextCompleted=completed+1;
  const nextEncountered=[...encountered,...ids];
  if(index+1>=families.length){
   props.onFinish(nextScore,nextCompleted,index+1,nextEncountered);
   return;
  }
  setScore(nextScore);
  setCompleted(nextCompleted);
  setEncountered(nextEncountered);
  setIndex((value)=>value+1);
 };

 return <EvolutionLabMission
  key={`${props.runSeed}:${index}:${family.id}`}
  family={family}
  locale={props.locale}
  difficulty={props.difficulty}
  runSeed={`${props.runSeed}:${index}`}
  missionIndex={index}
  missionTotal={families.length}
  previousScore={score}
  onComplete={finish}
 />;
}

interface MissionProps {
 family:EvolutionFamily;
 locale:"de"|"en";
 difficulty:GameProps["difficulty"];
 runSeed:string;
 missionIndex:number;
 missionTotal:number;
 previousScore:number;
 onComplete:(score:number,ids:number[])=>void;
}

function EvolutionLabMission({family,locale,difficulty,runSeed,missionIndex,missionTotal,previousScore,onComplete}:MissionProps){
 const levels=useMemo(()=>evolutionLevels(family),[family]);
 const drawer=useMemo(()=>shuffledEvolutionNodes(family,runSeed),[family,runSeed]);
 const branching=isBranchingFamily(family);
 const [selected,setSelected]=useState<number|null>(null);
 const [placed,setPlaced]=useState<Record<string,number>>({});
 const [conditions,setConditions]=useState<Record<string,string>>({});
 const [rejected,setRejected]=useState<number|null>(null);
 const [mistakes,setMistakes]=useState(0);
 const [validated,setValidated]=useState(false);
 const [resolved,setResolved]=useState(false);
 const placedIds=Object.values(placed);
 const allPlaced=placedIds.length===family.nodes.length;
 const allConditions=family.edges.every((edge)=>Boolean(conditions[evolutionEdgeKey(edge)]));
 const conditionsCorrect=family.edges.every((edge)=>conditions[evolutionEdgeKey(edge)]===edge.condition.en);
 const wrongEdges=family.edges.filter((edge)=>conditions[evolutionEdgeKey(edge)]!==edge.condition.en);
 const gained=Math.max(450,1500+family.edges.length*120-mistakes*90);

 const conditionOptions=useMemo(()=>{
  const distractorCount=difficulty==="easy"?3:difficulty==="medium"?6:9;
  const options=[
   ...family.edges.map((edge)=>edge.condition),
   ...seededShuffle(CONDITION_DISTRACTORS,`${runSeed}:distractors`).slice(0,distractorCount),
  ].filter((item,index,items)=>items.findIndex((candidate)=>candidate.en===item.en)===index);
  return seededShuffle(options,`${runSeed}:conditions`);
 },[difficulty,family,runSeed]);

 const place=(depth:number,slotKey:string)=>{
  if(selected===null||placed[slotKey]!==undefined)return;
  const eligibleAtDepth=levels[depth]??[];
  if(!eligibleAtDepth.includes(selected as never)||placedIds.includes(selected)){
   setRejected(selected);
   setMistakes((value)=>value+1);
   window.setTimeout(()=>setRejected(null),350);
   return;
  }
  setPlaced((state)=>({...state,[slotKey]:selected}));
  setSelected(null);
  setValidated(false);
  setResolved(false);
 };
 const remove=(slotKey:string,id:number)=>{
  if(resolved)return;
  setPlaced((state)=>Object.fromEntries(Object.entries(state).filter(([key])=>key!==slotKey)));
  const affected=new Set(family.edges.filter((edge)=>edge.from===id||edge.to===id).map(evolutionEdgeKey));
  setConditions((state)=>Object.fromEntries(Object.entries(state).filter(([key])=>!affected.has(key))));
  setValidated(false);
  setSelected(id);
 };

 const verify=()=>{
  setValidated(true);
  if(conditionsCorrect){
   setResolved(true);
   return;
  }
  setMistakes((value)=>value+family.edges.filter((edge)=>conditions[evolutionEdgeKey(edge)]!==edge.condition.en).length);
 };

 return <div className="poke-lab">
  <RunHud score={previousScore+gained} round={missionIndex+1} total={missionTotal} resource={mistakes} label={locale==="de"?"FEHLER":"FAULTS"}/>
  <div className="poke-path-history" aria-label={locale==="de"?"Laborfortschritt":"Lab progress"}>
   {Array.from({length:missionTotal},(_,index)=><span key={index} className={index<missionIndex?"is-pass":index===missionIndex?"is-current":""}>
    <b>{String(index+1).padStart(2,"0")}</b>
    {index<missionIndex?"ARCHIVED":index===missionIndex?(branching?"BRANCH RIG":"CHAIN RIG"):"SEALED"}
    <small>{index<missionIndex?"PASS":index===missionIndex?"ACTIVE":"LOCKED"}</small>
   </span>)}
  </div>
  <header className="poke-lab-header">
   <FlaskConical/>
   <div>
    <p className="poke-kicker">{branching?"BRANCHING FAMILY RIG":"LINEAR FAMILY RIG"} // VERIFIED EDGES</p>
    <h2>{locale==="de"?"Setze Familie und Bedingungen zusammen":"Assemble the family and its conditions"}</h2>
    <p>{locale==="de"
     ?"Wähle ein Exemplar und setze es in die richtige Entwicklungsstufe. Verzweigungen teilen sich eine Stufe und werden nicht als Kette dargestellt."
     :"Select a specimen and place it at the correct evolution depth. Branches share a stage and are never shown as a false chain."}</p>
   </div>
  </header>

  <section className={`poke-evolution-rig ${resolved?"is-active":""}`} aria-label={locale==="de"?"Evolutionsgraph":"Evolution graph"}>
   {levels.map((level,depth)=><div key={depth} style={{display:"grid",gridTemplateColumns:`repeat(${level.length}, minmax(0, 1fr))`,gap:".6rem",alignItems:"center"}}>
    <p className="poke-kicker" style={{gridColumn:"1 / -1"}}>{depth===0?"ROOT":`${locale==="de"?"STUFE":"STAGE"} ${depth+1}`}{level.length>1?` · ${level.length} BRANCHES`:""}</p>
    {level.map((_,slot)=>{
     const slotKey=`${depth}:${slot}`;
     const id=placed[slotKey];
     return <button className="poke-evolution-slot" key={slotKey} onClick={()=>id!==undefined?remove(slotKey,id):place(depth,slotKey)} disabled={resolved}>
      {id!==undefined?<><PokemonSprite entry={species(id)} size={118}/><b>{species(id).name[locale]}</b><small>{locale==="de"?"Zum Umsetzen antippen":"Tap to reposition"}</small></>:<span>{selected===null?(locale==="de"?"EXEMPLAR WÄHLEN":"SELECT SPECIMEN"):(locale==="de"?"HIER EINSETZEN":"PLACE HERE")}</span>}
     </button>;
    })}
   </div>)}
  </section>

  <div className="poke-specimen-drawer" aria-label={locale==="de"?"Exemplarschublade":"Specimen drawer"}>
   {drawer.filter((id)=>!placedIds.includes(id)).map((id)=><button
    key={id}
    className={rejected===id?"is-rejected":""}
    aria-pressed={selected===id}
    onClick={()=>setSelected(id)}
    style={selected===id?{borderColor:"var(--amber)"}:undefined}
   >
    <PokemonSprite entry={species(id)} size={100}/>
    <b>{species(id).name[locale]}</b>
   </button>)}
  </div>

  <section className="poke-radar-console" aria-label={locale==="de"?"Kanonische Entwicklungskanten":"Canonical evolution edges"}>
   <aside>
    {family.edges.map((edge,index)=>{
     const key=evolutionEdgeKey(edge);
     const visible=placedIds.includes(edge.from)&&placedIds.includes(edge.to);
     return <div key={key}>
      <span>
       <b>{visible?`${species(edge.from).name[locale]} → ${species(edge.to).name[locale]}`:`EDGE ${String(index+1).padStart(2,"0")} · ${locale==="de"?"KNOTEN EINSETZEN":"PLACE NODES"}`}</b>
       <small>{branching&&family.edges.filter((candidate)=>candidate.from===edge.from).length>1?(locale==="de"?"Verzweigung":"Branch"):(locale==="de"?"Entwicklungsstufe":"Evolution stage")}</small>
      </span>
      <select
       className={validated&&conditions[key]!==edge.condition.en?"is-invalid":resolved?"is-valid":""}
       aria-label={`${visible?`${species(edge.from).name[locale]} to ${species(edge.to).name[locale]}`:`Edge ${index+1}`} condition`}
       value={conditions[key]??""}
       disabled={!visible||resolved}
       onChange={(event)=>{setConditions((state)=>({...state,[key]:event.target.value}));setValidated(false);setResolved(false)}}
      >
       <option value="">{locale==="de"?"BEDINGUNG?":"CONDITION?"}</option>
       {conditionOptions.map((option)=><option key={option.en} value={option.en}>{option[locale]}</option>)}
      </select>
     </div>;
    })}
   </aside>
  </section>

  {allPlaced&&allConditions&&!resolved&&<button className="poke-primary" onClick={verify}>{locale==="de"?"RIG PRÜFEN":"VERIFY RIG"}</button>}
  {validated&&!conditionsCorrect&&!resolved&&<Feedback good={false}>
   <X/><span><b>{locale==="de"?`${wrongEdges.length} Bedingung(en) sind falsch verkabelt`:`${wrongEdges.length} condition(s) are wired incorrectly`}</b><small>{locale==="de"?"Fehlerhafte Ports sind markiert; Speziespositionen bleiben erhalten.":"Incorrect ports are marked; specimen positions remain in place."}</small></span>
  </Feedback>}
  {resolved&&<Feedback good>
   <Check/><span><b>{branching?(locale==="de"?"Verzweigungsrig stabil":"Branching rig stable"):(locale==="de"?"Evolutionsrig stabil":"Evolution rig stable")}</b><small>{locale==="de"?"Alle dargestellten Pfeile sind echte Kanten dieser kuratierten Familie.":"Every displayed arrow is a real edge in this curated family."}</small></span>
   <button onClick={()=>onComplete(gained,[...family.nodes])}>{missionIndex+1>=missionTotal?(locale==="de"?"Labor abschließen":"Complete lab"):(locale==="de"?"Nächste Familie":"Next family")} →</button>
  </Feedback>}
 </div>;
}
