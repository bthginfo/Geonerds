"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {Check,CircleHelp,Eye,Keyboard,ScanLine,X} from "lucide-react";
import {buildGuessOptions,buildGuessTargets,matchesSpeciesName,type GuessScope} from "@/poke/guess";
import {localizedType} from "@/poke/type-chart";
import {Feedback,RunHud,type GameProps} from "../gameplay";
import {PokemonSprite} from "../pokemon-sprite";

export function GuessThatPokemon({locale,difficulty,generationCap,roundCount,runSeed,onFinish}:GameProps){
 const [scope,setScope]=useState<GuessScope|null>(null);
 const targets=useMemo(()=>scope===null?[]:buildGuessTargets(generationCap,scope,roundCount,runSeed),[generationCap,roundCount,runSeed,scope]);
 const [round,setRound]=useState(0);
 const [score,setScore]=useState(0);
 const [correct,setCorrect]=useState(0);
 const [streak,setStreak]=useState(0);
 const [hint,setHint]=useState(false);
 const [answer,setAnswer]=useState<number|null>(null);
 const [typed,setTyped]=useState("");
 const [outcome,setOutcome]=useState<{good:boolean;nextScore:number;nextCorrect:number;nextStreak:number}|null>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const current=targets[round];
 const options=useMemo(()=>current&&difficulty!=="hard"?buildGuessOptions(current,difficulty,runSeed,round):[],[current,difficulty,round,runSeed]);
 useEffect(()=>{if(scope!==null&&difficulty==="hard"&&!outcome)inputRef.current?.focus()},[difficulty,outcome,round,scope]);
 const lock=(speciesId?:number)=>{
  if(!current||outcome)return;
  const good=difficulty==="hard"?matchesSpeciesName(typed,current):speciesId===current.id;
  const base=difficulty==="easy"?320:difficulty==="medium"?480:700;
  const penalty=hint?(difficulty==="easy"?80:difficulty==="medium"?130:180):0;
  const gained=good?Math.max(80,base-penalty)+streak*45:0;
  const nextScore=score+gained,nextCorrect=correct+(good?1:0),nextStreak=good?streak+1:0;
  setAnswer(speciesId??(good?current.id:-1));setScore(nextScore);setCorrect(nextCorrect);setStreak(nextStreak);setOutcome({good,nextScore,nextCorrect,nextStreak});
 };
 const next=()=>{
  if(!outcome||!current)return;
  const completed=round+1,ids=targets.slice(0,completed).map((entry)=>entry.id);
  if(completed>=targets.length){onFinish(outcome.nextScore,outcome.nextCorrect,completed,ids,completed);return}
  setRound(completed);setHint(false);setAnswer(null);setTyped("");setOutcome(null);
 };
 if(scope===null)return <section className="poke-guess-pool"><div className="poke-pool-signal"><ScanLine/><i/><span>SPECIMEN POOL</span></div><p className="poke-kicker">POOL CALIBRATION</p><h2>{locale==="de"?"Welche Generation soll in die Kammer?":"Which generation enters the chamber?"}</h2><p>{locale==="de"?`Der gemeinsame Missionsumfang endet bei Generation ${generationCap}. Wähle den gesamten kumulativen Pool oder exakt eine Generation.`:`The shared mission scope ends at Generation ${generationCap}. Choose the full cumulative pool or one exact generation.`}</p><div><button className="is-all" onClick={()=>setScope("all")}><Eye/><span><b>{locale==="de"?`Alle Gen 1–${generationCap}`:`All Gen 1–${generationCap}`}</b><small>{locale==="de"?"Kumulativer Pool":"Cumulative pool"}</small></span></button>{Array.from({length:generationCap},(_,index)=>index+1).map((generation)=><button key={generation} onClick={()=>setScope(generation)}><b>GEN {generation}</b><small>{locale==="de"?"Nur diese Generation":"This generation only"}</small></button>)}</div></section>;
 if(!current)return null;
 const poolLabel=scope==="all"?`GEN 1–${generationCap}`:`GEN ${scope}`;
 return <div className="poke-guess-game"><RunHud score={score} round={round+1} total={targets.length} resource={streak} label="STREAK"/><div className="poke-guess-meta"><span>POOL <b>{poolLabel}</b></span><div className="poke-streak-track">{Array.from({length:5},(_,index)=><i className={index<Math.min(5,streak)?"is-on":""} key={index}/>)}</div><span>MODE <b>{difficulty.toUpperCase()}</b></span></div><section className={`poke-reveal-chamber ${outcome?"is-revealed":""}`}><div className="poke-chamber-grid"/><div className="poke-aperture"><i/><b/><em/></div><span className="poke-redacted-dex">{outcome?`#${String(current.id).padStart(4,"0")}`:"#████"}</span><PokemonSprite entry={current} size={300} label={!!outcome}/><div className="poke-specimen-name"><small>{outcome?(locale==="de"?"SPEZIES BESTÄTIGT":"SPECIES CONFIRMED"):(locale==="de"?"VISUELLE IDENTIFIKATION":"VISUAL IDENTIFICATION")}</small><h2>{outcome?current.name[locale]:"WHO'S THAT POKÉMON?"}</h2>{outcome&&<><p>GEN {current.generation} · {current.types.map((type)=>localizedType(type,locale)).join(" · ")}</p><p>{locale==="de"?"Habitat":"Habitat"}: {current.habitat} · {locale==="de"?"Fähigkeit":"Ability"}: {current.abilities[0]??"—"}</p></>}</div></section>{!outcome&&<section className="poke-guess-console"><header><div><p className="poke-kicker">{difficulty==="hard"?"MANUAL SPECIES INPUT":"IDENTIFICATION ARRAY"}</p><h3>{locale==="de"?"Identifikation verriegeln":"Lock identification"}</h3></div><button disabled={hint} onClick={()=>setHint(true)}><CircleHelp/>{hint?(locale==="de"?"Hinweis aktiv":"Clue active"):(locale==="de"?`Hinweis −${difficulty==="easy"?80:difficulty==="medium"?130:180}`:`Clue −${difficulty==="easy"?80:difficulty==="medium"?130:180}`)}</button></header>{hint&&<div className="poke-guess-clue"><ScanLine/><span>{difficulty==="hard"?`${locale==="de"?"Erster Buchstabe":"First letter"}: ${current.name[locale].slice(0,1).toUpperCase()}`:`${locale==="de"?"Typen":"Types"}: ${current.types.map((type)=>localizedType(type,locale)).join(" · ")}`}</span></div>}{difficulty==="hard"?<form className="poke-guess-input" onSubmit={(event)=>{event.preventDefault();lock()}}><Keyboard/><label><span>{locale==="de"?"Pokémon-Name auf Deutsch oder Englisch":"Pokémon name in German or English"}</span><input ref={inputRef} value={typed} onChange={(event)=>setTyped(event.target.value)} autoComplete="off" spellCheck={false} placeholder={locale==="de"?"Spezies eingeben…":"Enter species…"}/></label><button disabled={!typed.trim()}>{locale==="de"?"PRÜFEN":"VERIFY"}</button></form>:<div className="poke-guess-options">{options.map((entry,index)=>{const chosen=answer===entry.id;return <button key={entry.id} onClick={()=>lock(entry.id)} className={chosen?"is-selected":""}><span>{index+1}</span><b>{entry.name[locale]}</b></button>})}</div>}</section>}{outcome&&<Feedback good={outcome.good}>{outcome.good?<Check/>:<X/>}<span><b>{outcome.good?(locale==="de"?"Spezies-Lock bestätigt":"Species lock confirmed"):(locale==="de"?`Falscher Lock · ${current.name[locale]}`:`Incorrect lock · ${current.name[locale]}`)}</b><small>#{String(current.id).padStart(4,"0")} · GEN {current.generation} · {current.types.map((type)=>localizedType(type,locale)).join(" / ")}</small></span><button onClick={next}>{round+1>=targets.length?(locale==="de"?"Mission abschließen":"Finish mission"):(locale==="de"?"Nächstes Exemplar":"Next specimen")} →</button></Feedback>}</div>;
}
