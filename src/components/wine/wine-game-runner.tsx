"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw, Sparkles, X } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { getWineGame } from "@/wine/registry";
import type { WineGameId, WineRun } from "@/wine/types";
import { localize } from "@/wine/types";
import { questionsFor, scoreMapClick, shuffle, type WineQuestion } from "@/wine/engine";
import { APPELLATIONS, CELLAR_BOTTLES, CELLAR_BRIEFS, DILEMMAS, GRAPES, REGIONS } from "@/wine/content";
import { useWineDaily, useWineDex, useWineProgression, useWineScores } from "@/wine/store";

type Difficulty="easy"|"medium"|"hard";
const ROUND_COUNTS:Record<Difficulty,number>={easy:5,medium:8,hard:12};

export function WineGameRunner({gameId}:{gameId:WineGameId}) {
 const {locale}=useT(); const game=getWineGame(gameId);
 const [difficulty,setDifficulty]=useState<Difficulty>("medium");
 const [practice,setPractice]=useState(false); const [started,setStarted]=useState(false); const [session,setSession]=useState(1);
 if(!started)return <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
  <Link href="/wine-nerds" className="wine-back"><ArrowLeft className="h-4 w-4"/>{locale==="de"?"Zum Weinkeller":"To the wine cellar"}</Link>
  <p className="wine-kicker mt-10">{localize(game.eyebrow,locale)}</p>
  <h1 className="mt-3 text-4xl font-black tracking-[-.05em] text-[var(--wine-cream)] md:text-6xl">{localize(game.title,locale)}</h1>
  <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--wine-muted)]">{localize(game.description,locale)}</p>
  <div className="mt-10 border-y border-[var(--wine-line)] py-7">
   <p className="wine-kicker">{locale==="de"?"Schwierigkeit":"Difficulty"}</p>
   <div className="mt-3 grid grid-cols-3 gap-2">{(["easy","medium","hard"] as Difficulty[]).map(d=><button key={d} onClick={()=>setDifficulty(d)} className={`wine-option ${difficulty===d?"is-selected":""}`}>{d==="easy"?(locale==="de"?"Einstieg":"Cellar door"):d==="medium"?(locale==="de"?"Service":"Service"):(locale==="de"?"Prüfung":"Exam")}</button>)}</div>
   <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--wine-muted)]"><input type="checkbox" checked={practice} onChange={e=>setPractice(e.target.checked)} className="h-5 w-5 accent-[var(--wine-copper)]"/><span><b className="text-[var(--wine-cream)]">{locale==="de"?"Übungsmodus":"Practice mode"}</b> · {locale==="de"?"speichert keine XP, Stempel oder Scores":"saves no XP, stamps or scores"}</span></label>
  </div>
  {gameId==="sommelier-exam"&&<p className="mt-5 text-xs leading-5 text-[var(--wine-muted)]">{locale==="de"?"Inoffizielle Übungsprüfung. Nicht mit WSET oder einer anderen Zertifizierungsstelle verbunden. Kein Alkoholkonsum erforderlich.":"Unofficial practice exam. Not affiliated with WSET or any certification body. No alcohol consumption is required."}</p>}
  <button className="wine-button mt-8 w-full sm:w-auto" onClick={()=>setStarted(true)}>{locale==="de"?"Session starten":"Start session"}<ArrowRight className="h-4 w-4"/></button>
 </div>;
 const props={gameId,difficulty,practice,seed:Date.now()+session,onReplay:()=>setSession(x=>x+1),onExit:()=>setStarted(false)};
 if(gameId==="wine-map")return <MapGame {...props}/>;
 if(gameId==="cellar-builder")return <CellarBuilder {...props}/>;
 if(gameId==="regional-connections")return <ConnectionsGame {...props}/>;
 if(gameId==="appellation-ladder")return <LadderGame {...props}/>;
 if(gameId==="winemakers-dilemma")return <DilemmaGame {...props}/>;
 if(gameId==="same-grape")return <SameGrapeGame {...props}/>;
 if(gameId==="cellar-mystery")return <MysteryGame {...props}/>;
 if(gameId==="tasting-note-builder")return <NoteBuilder {...props}/>;
 return <ChoiceGame {...props}/>;
}

interface PlayProps {gameId:WineGameId;difficulty:Difficulty;practice:boolean;seed:number;onReplay:()=>void;onExit:()=>void}
function useFinish({gameId,difficulty,practice}:PlayProps) {
 const progress=useWineProgression(s=>s.record), add=useWineScores(s=>s.add), daily=useWineDaily(s=>s.complete);
 return (score:number,correct:number,total:number,streak:number,start:number)=>{
  const run:WineRun={id:`wine-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,gameId,difficulty,practice,score,correct,total,bestStreak:streak,durationMs:Date.now()-start,createdAt:Date.now()};
  progress(run);add(run);if(!practice){daily(new Date().toISOString().slice(0,10));void fetch("/api/wine-scores",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(run)}).catch(()=>undefined)}return run;
 };
}
function PlayHeader({gameId,round,total,score,practice,onExit}:{gameId:WineGameId;round:number;total:number;score:number;practice:boolean;onExit:()=>void}){
 const {locale}=useT();return <header className="border-b border-[var(--wine-line)] bg-black/15"><div className="mx-auto flex min-h-16 max-w-4xl items-center gap-4 px-4"><button onClick={onExit} className="wine-icon" aria-label="Exit"><X className="h-5 w-5"/></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[var(--wine-cream)]">{localize(getWineGame(gameId).title,locale)}</p><div className="mt-1 h-1 bg-white/10"><div className="h-full bg-[var(--wine-copper)]" style={{width:`${Math.min(100,round/Math.max(1,total)*100)}%`}}/></div></div><span className="font-mono text-sm font-bold">{score}</span>{practice&&<span className="hidden text-[10px] uppercase tracking-wider text-[var(--wine-vine)] sm:block">practice</span>}</div></header>
}
function ChoiceGame(props:PlayProps){
 const {locale}=useT();const isExam=props.gameId==="sommelier-exam";const count=isExam?12:ROUND_COUNTS[props.difficulty];
 const questions=useMemo(()=> {
  if (!isExam) return questionsFor(props.gameId,props.seed).slice(0,count);
  return shuffle([
   ...questionsFor("terroir-detective",props.seed),
   ...questionsFor("grape-dna",props.seed+1),
   ...questionsFor("aroma-atelier",props.seed+2),
   ...questionsFor("pairing-duel",props.seed+3),
   ...questionsFor("label-decoder",props.seed+4),
   ...questionsFor("wine-map",props.seed+5),
  ],props.seed+6).slice(0,count);
 },[props.gameId,props.seed,count,isExam]);
 const [index,setIndex]=useState(0),[selected,setSelected]=useState<string|null>(null),[score,setScore]=useState(0),[correct,setCorrect]=useState(0),[streak,setStreak]=useState(0),[best,setBest]=useState(0),[done,setDone]=useState(false);const [start]=useState(Date.now());
 const encounter=useWineDex(s=>s.encounter), finish=useFinish(props); const q=questions[index];
 const answer=(id:string)=>{if(selected)return;setSelected(id);const ok=id===q.answer;const next=ok?streak+1:0;if(ok){setCorrect(x=>x+1);setScore(x=>x+100+Math.min(100,next*10));setBest(Math.max(best,next));}setStreak(next);if(q.entity&&!props.practice)encounter(q.entity.id,q.entity.type,props.gameId,ok)};
 const next=()=>{if(index+1>=questions.length){finish(score+(selected===q.answer?0:0),correct,questions.length,best,start);setDone(true)}else{setIndex(x=>x+1);setSelected(null)}};
 if(done)return <Result {...props} score={score} correct={correct} total={questions.length} onReplay={props.onReplay}/>;
 return <><PlayHeader gameId={props.gameId} round={index+1} total={questions.length} score={score} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-3xl px-4 py-8">
  {isExam&&<div className="mb-5 flex items-center gap-2 text-xs text-[var(--wine-muted)]"><Clock3 className="h-4 w-4"/>{locale==="de"?"Inoffizielle gemischte Übung · 12 Aufgaben":"Unofficial mixed practice · 12 prompts"}</div>}
  <p className="wine-kicker">{locale==="de"?`Aufgabe ${index+1} von ${questions.length}`:`Prompt ${index+1} of ${questions.length}`}</p>
  <h1 className="mt-4 text-2xl font-black leading-tight text-[var(--wine-cream)] md:text-4xl">{localize(q.prompt,locale)}</h1>
  <div className="mt-8 grid gap-3 sm:grid-cols-2">{q.choices.map(c=>{const reveal=selected!==null,ok=c.id===q.answer,chosen=c.id===selected;return <button key={c.id} disabled={reveal} onClick={()=>answer(c.id)} className={`wine-answer ${reveal&&ok?"is-correct":""} ${reveal&&chosen&&!ok?"is-wrong":""}`}><span>{localize(c.label,locale)}</span>{reveal&&ok&&<Check className="h-5 w-5"/>}{reveal&&chosen&&!ok&&<X className="h-5 w-5"/>}</button>})}</div>
  {selected&&<div className="wine-reveal"><p className="wine-kicker">{selected===q.answer?(locale==="de"?"Stimmige Begründung":"Defensible reasoning"):(locale==="de"?"Lernmoment":"Study the miss")}</p><p className="mt-2 leading-6">{localize(q.explanation,locale)}</p><button onClick={next} className="wine-button mt-5">{index+1===questions.length?(locale==="de"?"Auswertung":"Results"):(locale==="de"?"Nächste Aufgabe":"Next prompt")}<ArrowRight className="h-4 w-4"/></button></div>}
 </div></>;
}
function MapGame(props:PlayProps){
 const {locale}=useT();const regions=useMemo(()=>shuffle(REGIONS,props.seed).slice(0,ROUND_COUNTS[props.difficulty]),[props.seed,props.difficulty]);const [i,setI]=useState(0),[pin,setPin]=useState<{lat:number;lng:number}|null>(null),[score,setScore]=useState(0),[correct,setCorrect]=useState(0),[done,setDone]=useState(false),[start]=useState(Date.now());const finish=useFinish(props),encounter=useWineDex(s=>s.encounter),target=regions[i];const result=pin?scoreMapClick(pin.lat,pin.lng,target):null;
 const click=(e:React.MouseEvent<HTMLButtonElement>)=>{if(pin)return;const r=e.currentTarget.getBoundingClientRect();setPin({lng:(e.clientX-r.left)/r.width*360-180,lat:90-(e.clientY-r.top)/r.height*180})};
 const next=()=>{if(result){setScore(x=>x+result.score);if(result.correct)setCorrect(x=>x+1);if(!props.practice)encounter(target.id,"region",props.gameId,result.correct)}if(i+1===regions.length){finish(score+(result?.score??0),correct+(result?.correct?1:0),regions.length,0,start);setDone(true)}else{setI(x=>x+1);setPin(null)}};
 if(done)return <Result {...props} score={score} correct={correct} total={regions.length} onReplay={props.onReplay}/>;
 return <><PlayHeader gameId={props.gameId} round={i+1} total={regions.length} score={score} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-4xl px-4 py-8"><p className="wine-kicker">{locale==="de"?"Setze den Pin":"Place the pin"}</p><h1 className="mt-2 text-3xl font-black text-[var(--wine-cream)]">{localize(target.name,locale)} · {localize(target.country,locale)}</h1><button onClick={click} className="wine-world mt-6 block w-full" aria-label={locale==="de"?"Weltkarte, Position wählen":"World map, choose a position"}>{pin&&<span className="wine-pin" style={{left:`${(pin.lng+180)/3.6}%`,top:`${(90-pin.lat)/1.8}%`}}/>}{pin&&<span className="wine-target" style={{left:`${(target.lng+180)/3.6}%`,top:`${(90-target.lat)/1.8}%`}}/>}<span className="wine-continent c1"/><span className="wine-continent c2"/><span className="wine-continent c3"/><span className="wine-continent c4"/><span className="wine-continent c5"/></button>{result&&<div className="wine-reveal"><p className="text-2xl font-black">{Math.round(result.distance*111)} km · +{result.score}</p><p className="mt-2 text-[var(--wine-muted)]">{localize(target.climate,locale)} · {target.grapes.map(id=>GRAPES.find(g=>g.id===id)?.name).join(", ")}</p><button className="wine-button mt-5" onClick={next}>{locale==="de"?"Weiter":"Continue"}<ArrowRight className="h-4 w-4"/></button></div>}</div></>;
}
function CellarBuilder(props:PlayProps){
 const {locale}=useT();const brief=CELLAR_BRIEFS[props.seed%CELLAR_BRIEFS.length];const [selected,setSelected]=useState<string[]>([]),[done,setDone]=useState(false),[start]=useState(Date.now());const finish=useFinish(props);const cost=CELLAR_BOTTLES.filter(b=>selected.includes(b.id)).reduce((s,b)=>s+b.price,0);const covered=new Set(CELLAR_BOTTLES.filter(b=>selected.includes(b.id)).map(b=>b.category));const valid=cost<=brief.budget&&brief.needs.every(n=>covered.has(n));
 const submit=()=>{finish(valid?1000:Math.max(0,500-Math.abs(cost-brief.budget)*5),valid?1:0,1,0,start);setDone(true)};
 if(done)return <Result {...props} score={valid?1000:400} correct={valid?1:0} total={1} onReplay={props.onReplay}/>;
 return <><PlayHeader gameId={props.gameId} round={1} total={1} score={Math.max(0,1000-cost*3)} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-4xl px-4 py-8"><p className="wine-kicker">{localize(brief.title,locale)}</p><h1 className="mt-3 text-3xl font-black text-[var(--wine-cream)]">{locale==="de"?`Baue einen Keller unter €${brief.budget}`:`Build a cellar under €${brief.budget}`}</h1><p className="mt-3 text-[var(--wine-muted)]">{locale==="de"?"Pflichtkategorien":"Required categories"}: {brief.needs.join(", ")}</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{CELLAR_BOTTLES.map(b=><button key={b.id} onClick={()=>setSelected(s=>s.includes(b.id)?s.filter(x=>x!==b.id):[...s,b.id])} className={`wine-answer ${selected.includes(b.id)?"is-selected":""}`}><span><b>{b.name}</b><small className="mt-1 block text-[var(--wine-muted)]">{b.category}</small></span><span className="font-mono">€{b.price}</span></button>)}</div><div className="wine-reveal flex flex-wrap items-center justify-between gap-4"><p className={`font-mono text-xl font-black ${cost>brief.budget?"text-red-300":""}`}>€{cost} / €{brief.budget}</p><button disabled={!selected.length} onClick={submit} className="wine-button">{locale==="de"?"Keller bewerten":"Evaluate cellar"}</button></div></div></>;
}
function ConnectionsGame(props:PlayProps){
 const {locale}=useT();const groups=useMemo(()=>[
  {id:"bordeaux",items:[locale==="de"?"Frankreich":"France","Cabernet Sauvignon","maritime","Pauillac"]},
  {id:"rioja",items:[locale==="de"?"Spanien":"Spain","Tempranillo","Atlantic influence","Rioja Alta"]},
  {id:"barossa",items:[locale==="de"?"Australien":"Australia","Shiraz","warm Mediterranean","Barossa GI"]},
  {id:"mosel",items:[locale==="de"?"Deutschland":"Germany","Riesling","steep slate slopes","Mosel"]},
 ],[locale]);const items=useMemo(()=>shuffle(groups.flatMap(g=>g.items.map((label,i)=>({id:`${g.id}-${i}`,group:g.id,label}))),props.seed+2),[groups,props.seed]);const [selected,setSelected]=useState<string[]>([]),[solved,setSolved]=useState<string[]>([]),[mistakes,setMistakes]=useState(0),[done,setDone]=useState(false),[start]=useState(Date.now());const finish=useFinish(props);
 const submit=()=>{const picked=items.filter(x=>selected.includes(x.id));if(picked.length===4&&new Set(picked.map(x=>x.group)).size===1){const next=[...solved,picked[0].group];setSolved(next);setSelected([]);if(next.length===4){finish(Math.max(200,1000-mistakes*100),4,4,4,start);setDone(true)}}else{setMistakes(x=>x+1);setSelected([])}};
 if(done)return <Result {...props} score={Math.max(200,1000-mistakes*100)} correct={4} total={4} onReplay={props.onReplay}/>;
 return <><PlayHeader gameId={props.gameId} round={solved.length+1} total={4} score={solved.length*250-mistakes*25} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-3xl font-black text-[var(--wine-cream)]">{locale==="de"?"Finde vier Begriffe mit einer gemeinsamen Wein-Verbindung.":"Find four terms with one wine connection."}</h1><div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">{items.filter(x=>!solved.includes(x.group)).map(x=><button key={x.id} onClick={()=>setSelected(s=>s.includes(x.id)?s.filter(id=>id!==x.id):s.length<4?[...s,x.id]:s)} className={`wine-tile ${selected.includes(x.id)?"is-selected":""}`}>{x.label}</button>)}</div><button disabled={selected.length!==4} onClick={submit} className="wine-button mt-6">{locale==="de"?"Gruppe prüfen":"Check group"}</button>{mistakes>0&&<p className="mt-3 text-sm text-[var(--wine-muted)]">{mistakes} {locale==="de"?"Fehlversuche":"misses"}</p>}</div></>;
}
function LadderGame(props:PlayProps){
 const {locale}=useT();const chain=useMemo(()=>{const a=APPELLATIONS[props.seed%APPELLATIONS.length],r=REGIONS.find(x=>x.id===a.regionId)!;return [{key:"country",answer:localize(r.country,locale),options:shuffle([...new Set(REGIONS.map(x=>localize(x.country,locale)))],props.seed).slice(0,3)},{key:"region",answer:localize(r.name,locale),options:shuffle(REGIONS.map(x=>localize(x.name,locale)),props.seed+1).slice(0,3)},{key:"appellation",answer:a.name,options:shuffle(APPELLATIONS.map(x=>x.name),props.seed+2).slice(0,3)},{key:"style",answer:localize(a.style,locale),options:shuffle(APPELLATIONS.map(x=>localize(x.style,locale)),props.seed+3).slice(0,3)}].map(x=>({...x,options:shuffle([...new Set([...x.options,x.answer])],props.seed+4).slice(0,4)}))},[props.seed,locale]);const [step,setStep]=useState(0),[score,setScore]=useState(0),[done,setDone]=useState(false),[start]=useState(Date.now());const finish=useFinish(props),current=chain[step];const answer=(v:string)=>{const ok=v===current.answer;const next=score+(ok?250:0);setScore(next);if(step===chain.length-1){finish(next,Math.round(next/250),4,0,start);setDone(true)}else setStep(x=>x+1)};
 if(done)return <Result {...props} score={score} correct={Math.round(score/250)} total={4} onReplay={props.onReplay}/>;
 return <><PlayHeader gameId={props.gameId} round={step+1} total={4} score={score} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-2xl px-4 py-8"><p className="wine-kicker">{chain.slice(0,step).map(x=>x.answer).join(" → ")|| (locale==="de"?"Beginne beim Land":"Begin with the country")}</p><h1 className="mt-4 text-4xl font-black capitalize text-[var(--wine-cream)]">{current.key}</h1><div className="mt-8 grid gap-3">{current.options.map(o=><button key={o} onClick={()=>answer(o)} className="wine-answer">{o}<ArrowRight className="h-4 w-4"/></button>)}</div></div></>;
}
function DilemmaGame(props:PlayProps){
 const {locale}=useT();const scenarios=useMemo(()=>shuffle(DILEMMAS,props.seed).slice(0,3),[props.seed]);const [step,setStep]=useState(0),[profile,setProfile]=useState({freshness:0,body:0}),[done,setDone]=useState(false),[start]=useState(Date.now());const finish=useFinish(props),d=scenarios[step];const choose=(c:typeof d.choices[number])=>{const next={freshness:profile.freshness+c.delta.freshness,body:profile.body+c.delta.body};setProfile(next);if(step===2){finish(800,3,3,3,start);setDone(true)}else setStep(x=>x+1)};
 if(done)return <Result {...props} score={800} correct={3} total={3} onReplay={props.onReplay} note={`${locale==="de"?"Dein Stilprofil":"Your style profile"}: freshness ${profile.freshness}, body ${profile.body}`}/>;
 return <><PlayHeader gameId={props.gameId} round={step+1} total={3} score={step*250} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-3xl px-4 py-8"><p className="wine-kicker">{locale==="de"?"Entscheidung mit Trade-offs":"A decision with trade-offs"}</p><h1 className="mt-4 text-3xl font-black text-[var(--wine-cream)]">{localize(d.setup,locale)}</h1><div className="mt-8 grid gap-3">{d.choices.map(c=><button key={c.id} onClick={()=>choose(c)} className="wine-answer items-start"><span><b>{localize(c.label,locale)}</b><small className="mt-2 block leading-5 text-[var(--wine-muted)]">{localize(c.effect,locale)}</small></span><ArrowRight className="h-5 w-5 shrink-0"/></button>)}</div></div></>;
}
function SameGrapeGame(props:PlayProps){
 const {locale}=useT();const grape=GRAPES[props.seed%GRAPES.length],a=grape.regions[0],b=grape.regions[1]??"another region";const traits=[`cooler / fresher expression`,`warmer / richer expression`,`more restrained fruit`,`riper fruit weight`];const [assigned,setAssigned]=useState<Record<string,"a"|"b">>({}),[done,setDone]=useState(false),[finalCorrect,setFinalCorrect]=useState(0),[start]=useState(Date.now());const finish=useFinish(props);const submit=()=>{const correct=[0,1,2,3].filter(i=>assigned[i]===(i%2===0?"a":"b")).length;setFinalCorrect(correct);finish(correct*250,correct,4,correct,start);setDone(true)};
 if(done)return <Result {...props} score={finalCorrect*250} correct={finalCorrect} total={4} onReplay={props.onReplay}/>;
 return <><PlayHeader gameId={props.gameId} round={Object.keys(assigned).length} total={4} score={Object.keys(assigned).length*200} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-3xl px-4 py-8"><p className="wine-kicker">{grape.name}</p><h1 className="mt-3 text-3xl font-black text-[var(--wine-cream)]">{locale==="de"?`Ordne die Stilhinweise ${a} oder ${b} zu.`:`Assign each style clue to ${a} or ${b}.`}</h1><div className="mt-7 space-y-3">{traits.map((t,i)=><div key={t} className="wine-assign"><span>{locale==="de"?t.replace("cooler","kühler").replace("warmer","wärmer").replace("fruit","Frucht"):t}</span><div className="flex gap-2"><button onClick={()=>setAssigned(x=>({...x,[i]:"a"}))} className={`wine-mini ${assigned[i]==="a"?"is-selected":""}`}>{a}</button><button onClick={()=>setAssigned(x=>({...x,[i]:"b"}))} className={`wine-mini ${assigned[i]==="b"?"is-selected":""}`}>{b}</button></div></div>)}</div><button disabled={Object.keys(assigned).length<4} onClick={submit} className="wine-button mt-6">{locale==="de"?"Vergleich prüfen":"Review comparison"}</button></div></>;
}
function MysteryGame(props:PlayProps){
 const {locale}=useT();const answer=GRAPES[props.seed%GRAPES.length];const options=useMemo(()=>shuffle([answer,...GRAPES.filter(g=>g.id!==answer.id).slice(0,5)],props.seed),[answer,props.seed]);const clues=[answer.climate,answer.clue,{en:`Structure: ${answer.structure.en}`,de:`Struktur: ${answer.structure.de}`}];const [shown,setShown]=useState(1),[done,setDone]=useState(false),[score,setScore]=useState(0),[start]=useState(Date.now());const finish=useFinish(props);const choose=(id:string)=>{const ok=id===answer.id;const s=ok?Math.max(300,1000-(shown-1)*200):0;setScore(s);finish(s,ok?1:0,1,0,start);setDone(true)};
 if(done)return <Result {...props} score={score} correct={score?1:0} total={1} onReplay={props.onReplay} note={localize(answer.clue,locale)}/>;
 return <><PlayHeader gameId={props.gameId} round={shown} total={3} score={1000-(shown-1)*200} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-3xl px-4 py-8"><p className="wine-kicker">{locale==="de"?"Fallakte":"Case file"}</p><h1 className="mt-3 text-3xl font-black text-[var(--wine-cream)]">{locale==="de"?"Welche Flasche bleibt übrig?":"Which bottle survives the clues?"}</h1><ol className="mt-7 space-y-2">{clues.slice(0,shown).map((c,i)=><li key={i} className="border-l-2 border-[var(--wine-copper)] py-2 pl-4 text-[var(--wine-muted)]">{localize(c,locale)}</li>)}</ol><div className="mt-7 grid gap-2 sm:grid-cols-2">{options.map(o=><button key={o.id} onClick={()=>choose(o.id)} className="wine-answer">{o.name}</button>)}</div>{shown<3&&<button onClick={()=>setShown(x=>x+1)} className="wine-button wine-button-quiet mt-5">{locale==="de"?"Weiteren Hinweis (-200)":"Reveal clue (-200)"}</button>}</div></>;
}
function NoteBuilder(props:PlayProps){
 const {locale}=useT();const categories=[
  {id:"appearance",label:{en:"Appearance",de:"Aussehen"},options:["pale ruby","deep ruby","pale lemon"]},
  {id:"nose",label:{en:"Nose",de:"Nase"},options:["fresh red fruit","ripe dark fruit","citrus and herbs"]},
  {id:"palate",label:{en:"Palate",de:"Gaumen"},options:["high acidity, fine tannin","full body, firm tannin","light body, vivid acidity"]},
  {id:"development",label:{en:"Development",de:"Entwicklung"},options:["youthful","developing","mature"]},
  {id:"conclusion",label:{en:"Conclusion",de:"Schluss"},options:["best enjoyed young","can develop further","drink now"]},
  ];const [values,setValues]=useState<Record<string,string>>({}),[done,setDone]=useState(false),[finalScore,setFinalScore]=useState(0),[start]=useState(Date.now());const finish=useFinish(props);const submit=()=>{const coherent=(values.appearance==="pale ruby"&&values.nose==="fresh red fruit")||(values.appearance==="deep ruby"&&values.nose==="ripe dark fruit")||(values.appearance==="pale lemon"&&values.nose==="citrus and herbs");const s=coherent?1000:650;setFinalScore(s);finish(s,coherent?5:4,5,0,start);setDone(true)};
 if(done)return <Result {...props} score={finalScore} correct={finalScore===1000?5:4} total={5} onReplay={props.onReplay} note={locale==="de"?"Professionell heißt hier: beobachtbar, präzise und in sich konsistent.":"Professional here means observable, precise and internally consistent."}/>;
 return <><PlayHeader gameId={props.gameId} round={Object.keys(values).length} total={5} score={Object.keys(values).length*160} practice={props.practice} onExit={props.onExit}/><div className="mx-auto max-w-3xl px-4 py-8"><p className="wine-kicker">{locale==="de"?"Originales Lernschema":"Original learning schema"}</p><h1 className="mt-3 text-3xl font-black text-[var(--wine-cream)]">{locale==="de"?"Baue eine in sich stimmige Tasting Note.":"Build an internally coherent tasting note."}</h1><div className="mt-7 space-y-5">{categories.map(c=><fieldset key={c.id}><legend className="wine-kicker">{localize(c.label,locale)}</legend><div className="mt-2 flex flex-wrap gap-2">{c.options.map(o=><button type="button" key={o} onClick={()=>setValues(v=>({...v,[c.id]:o}))} className={`wine-mini ${values[c.id]===o?"is-selected":""}`}>{o}</button>)}</div></fieldset>)}</div><button disabled={Object.keys(values).length<5} onClick={submit} className="wine-button mt-8">{locale==="de"?"Notiz prüfen":"Review note"}</button></div></>;
}
function Result(props:PlayProps&{score:number;correct:number;total:number;onReplay:()=>void;note?:string}){
 const {locale}=useT();const accuracy=Math.round(props.correct/Math.max(1,props.total)*100);return <div className="mx-auto max-w-3xl px-4 py-12 md:py-20"><p className="wine-kicker">{props.practice?(locale==="de"?"Übungsrunde beendet":"Practice complete"):(locale==="de"?"Kellerpass gestempelt":"Cellar passport stamped")}</p><h1 className="mt-3 text-5xl font-black tracking-[-.05em] text-[var(--wine-cream)]">{props.score} <span className="text-2xl text-[var(--wine-copper)]">pts</span></h1><div className="mt-8 grid grid-cols-2 gap-3"><div className="wine-stat"><span>{props.correct}/{props.total}</span><small>{locale==="de"?"stimmig":"defensible"}</small></div><div className="wine-stat"><span>{accuracy}%</span><small>{locale==="de"?"Genauigkeit":"accuracy"}</small></div></div>{props.note&&<p className="wine-reveal">{props.note}</p>}<p className="mt-6 text-sm leading-6 text-[var(--wine-muted)]">{props.practice?(locale==="de"?"Wie versprochen wurde nichts gespeichert.":"As promised, nothing was saved."):(locale==="de"?"XP, Kompetenzfortschritt und neue Wine-Dex-Begegnungen wurden separat gespeichert.":"XP, competency progress and new Wine-Dex encounters were saved separately.")}</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={props.onReplay} className="wine-button"><RotateCcw className="h-4 w-4"/>{locale==="de"?"Nochmal":"Play again"}</button><Link href="/wine-nerds" className="wine-button wine-button-quiet">{locale==="de"?"Zum Keller":"Wine cellar"}</Link></div></div>
}
