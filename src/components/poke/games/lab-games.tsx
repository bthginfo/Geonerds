"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {AudioLines,Check,CircleHelp,Ear,Mic2,ScanLine,Search,ShieldAlert,X} from "lucide-react";
import type {ComponentType} from "react";
import {SPECIES,species} from "@/poke/data";
import {buildDynamicCase,buildPokeGrid} from "@/poke/fixtures";
import {seedHash,seededShuffle} from "@/poke/variety";
import {PokemonSprite} from "../pokemon-sprite";
import {Feedback,RunHud,type GameProps} from "../gameplay";
export {EvolutionLab} from "./evolution-lab";

function MultiRound({Component,...props}:GameProps&{Component:ComponentType<GameProps>}){
 const[index,setIndex]=useState(0),[score,setScore]=useState(0),[correct,setCorrect]=useState(0),[questions,setQuestions]=useState(0),[encountered,setEncountered]=useState<number[]>([]);
 const finish=(gained:number,good:number,total:number,ids:number[])=>{
  const nextScore=score+gained,nextCorrect=correct+good,nextQuestions=questions+total,nextIds=[...encountered,...ids];
  if(index+1>=props.roundCount)props.onFinish(nextScore,nextCorrect,nextQuestions,nextIds,index+1);
  else{setScore(nextScore);setCorrect(nextCorrect);setQuestions(nextQuestions);setEncountered(nextIds);setIndex((value)=>value+1)}
 };
 return <Component {...props} key={`${props.runSeed}:${index}`} runSeed={`${props.runSeed}:${index}`} onFinish={finish}/>;
}

export function FieldScanner(props:GameProps){return <MultiRound {...props} Component={FieldScannerMission}/>}
function FieldScannerMission({locale,difficulty,generationCap,runSeed,onFinish}:GameProps){
 const pool=useMemo(()=>SPECIES.filter((entry)=>entry.generation<=generationCap),[generationCap]);
 const target=pool[seedHash(runSeed)%pool.length]??pool[24];
 const candidates=useMemo(()=>{
  const similarity=(entry:typeof target)=>
   entry.types.filter((type)=>target.types.includes(type)).length*5+
   Number(entry.shape===target.shape)*3+
   Number(entry.color===target.color)*2+
   Number(entry.generation===target.generation)*2+
   Math.max(0,3-Math.floor(Math.abs(entry.heightM-target.heightM)));
  const count=difficulty==="easy"?7:difficulty==="medium"?9:11;
  const distractors=seededShuffle(pool.filter((entry)=>entry.id!==target.id),`${runSeed}:scanner-distractors`)
   .sort((a,b)=>similarity(b)-similarity(a)).slice(0,count-1);
  return seededShuffle([target,...distractors],`${runSeed}:scanner-order`);
 },[difficulty,pool,runSeed,target]);
 const hintOptions=[
  {id:"type",cost:18,text:`${locale==="de"?"Typ":"Type"}: ${target.types.join(" / ")}`,test:(id:number)=>species(id).types.join("|")===target.types.join("|")},
  {id:"generation",cost:12,text:`${locale==="de"?"EinfÃ¼hrungs-Generation":"Introduction generation"}: ${target.generation}`,test:(id:number)=>species(id).generation===target.generation},
  {id:"habitat",cost:16,text:`${locale==="de"?"Habitat":"Habitat"}: ${target.habitat}`,test:(id:number)=>species(id).habitat===target.habitat},
  {id:"measure",cost:20,text:`${target.heightM} m Â· ${target.weightKg} kg`,test:(id:number)=>Math.abs(species(id).heightM-target.heightM)<.6&&Math.abs(species(id).weightKg-target.weightKg)<Math.max(12,target.weightKg*.35)},
  {id:"profile",cost:16,text:`${locale==="de"?"Profil":"Profile"}: ${target.color} Â· ${target.shape}`,test:(id:number)=>species(id).color===target.color&&species(id).shape===target.shape},
 ];
 const [hints,setHints]=useState<string[]>([]);
 const [wrong,setWrong]=useState<number[]>([]);
 const [guess,setGuess]=useState<number|null>(null);
 const [signal,setSignal]=useState(100);
 const [locks,setLocks]=useState(difficulty==="easy"?3:difficulty==="medium"?2:1);
 const matching=candidates.filter((entry)=>!wrong.includes(entry.id)&&hintOptions.filter((hint)=>hints.includes(hint.id)).every((hint)=>hint.test(entry.id)));
 const correct=guess===target.id;
 const buy=(id:string,cost:number)=>{if(hints.includes(id)||guess!==null)return;setHints((items)=>[...items,id]);setSignal((value)=>Math.max(0,value-cost))};
 const lock=(id:number)=>{
  if(guess!==null||wrong.includes(id))return;
  if(id===target.id){setGuess(id);return}
  const remaining=locks-1;setLocks(remaining);setWrong((items)=>[...items,id]);setSignal((value)=>Math.max(0,value-12));
  if(remaining<=0)setGuess(id);
 };
 return <div className="poke-scanner-game">
  <RunHud score={signal*12} round={guess!==null?1:0} total={1} resource={locks} label={locale==="de"?"LOCKS":"LOCKS"}/>
  <div className="poke-scanner-layout">
   <section className={`poke-scanner-window hints-${hints.length} ${guess!==null?"is-resolved":""}`}>
    <div className="poke-reticle"/><ScanLine/>
    <PokemonSprite entry={target} size={250} concealed={guess===null} pixelated={guess===null&&hints.length<2} label={guess!==null}/>
    <span>{guess!==null?`#${String(target.id).padStart(4,"0")} Â· ${target.name[locale]}`:"SPECIMEN ID REDACTED"}</span>
    <small>{matching.length} {locale==="de"?"Signaturen passen noch":"signatures still match"}</small>
   </section>
   <aside className="poke-hint-console"><p className="poke-kicker">{locale==="de"?"SIGNAL GEGEN INFORMATION":"TRADE SIGNAL FOR DATA"}</p>{hintOptions.map((hint)=><button key={hint.id} onClick={()=>buy(hint.id,hint.cost)} disabled={hints.includes(hint.id)||guess!==null}><CircleHelp/><span>{hints.includes(hint.id)?hint.text:`${hint.id.toUpperCase()} Â· âˆ’${hint.cost}`}</span></button>)}</aside>
  </div>
  <div className="poke-candidate-film">{candidates.map((entry)=>{
   const eliminated=wrong.includes(entry.id)||!matching.some((item)=>item.id===entry.id);
   return <button key={entry.id} disabled={guess!==null||eliminated} onClick={()=>lock(entry.id)} className={wrong.includes(entry.id)?"is-wrong":guess===entry.id?(correct?"is-correct":"is-wrong"):""}>
    <PokemonSprite entry={entry} size={90} concealed={guess===null&&hints.length<4}/>
    <span>{entry.name[locale]}<small>{eliminated?(locale==="de"?"AUSGESCHLOSSEN":"ELIMINATED"):`#${entry.id}`}</small></span>
   </button>;
  })}</div>
  {wrong.length>0&&guess===null&&<p className="poke-ruleset">{locale==="de"?`${species(wrong.at(-1)!).name.de} passt nicht. ${locks} Scanner-Lock(s) verbleiben.`:`${species(wrong.at(-1)!).name.en} does not match. ${locks} scanner lock(s) remain.`}</p>}
  {guess!==null&&<Feedback good={correct}>{correct?<Check/>:<X/>}<span><b>{correct?(locale==="de"?"Scanner-Lock bestÃ¤tigt":"Scanner lock confirmed"):`${locale==="de"?"Gesucht":"Target"}: ${target.name[locale]}`}</b><small>#{target.id} Â· {target.types.join(" / ")} Â· Gen {target.generation} Â· {100-signal} signal spent</small></span><button onClick={()=>onFinish(correct?signal*12:Math.round(signal*3),correct?1:0,1,[target.id])}>{locale==="de"?"Exemplar archivieren":"File specimen"} â†’</button></Feedback>}
 </div>;
}

export function CryRadar(props:GameProps){return <MultiRound {...props} Component={CryRadarMission}/>}
function CryRadarMission({locale,difficulty,generationCap,runSeed,onFinish}:GameProps){
 const pool=useMemo(()=>SPECIES.filter((entry)=>entry.generation<=generationCap&&entry.cry),[generationCap]);
 const target=pool[seedHash(runSeed)%pool.length]??pool[0];
 const candidates=useMemo(()=>{
  const similarity=(entry:typeof target)=>
   Number(entry.shape===target.shape)*4+
   entry.types.filter((type)=>target.types.includes(type)).length*3+
   Math.max(0,3-Math.floor(Math.abs(entry.stats.speed-target.stats.speed)/25))+
   Math.max(0,2-Math.floor(Math.abs(entry.heightM-target.heightM)));
  const size=difficulty==="easy"?4:difficulty==="medium"?5:6;
  const distractors=seededShuffle(pool.filter((entry)=>entry.id!==target.id),`${runSeed}:cry-distractors`).sort((a,b)=>similarity(b)-similarity(a)).slice(0,size-1);
  return seededShuffle([target,...distractors],`${runSeed}:cry-order`);
 },[difficulty,pool,runSeed,target]);
 const audio=useRef<HTMLAudioElement>(null),canvas=useRef<HTMLCanvasElement>(null),context=useRef<AudioContext|null>(null),analyser=useRef<AnalyserNode|null>(null),frame=useRef<number|null>(null);
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),[guess,setGuess]=useState<number|null>(null),[plays,setPlays]=useState(0);
 const correct=guess===target.id;
 const stopVisual=()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null;setPlaying(false)};
 useEffect(()=>()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);void context.current?.close()},[]);
 const draw=()=>{
  const node=analyser.current,surface=canvas.current;if(!node||!surface)return;
  const ratio=window.devicePixelRatio||1,width=Math.max(1,surface.clientWidth),height=Math.max(1,surface.clientHeight);
  if(surface.width!==Math.round(width*ratio)||surface.height!==Math.round(height*ratio)){surface.width=Math.round(width*ratio);surface.height=Math.round(height*ratio)}
  const data=new Uint8Array(node.frequencyBinCount);node.getByteFrequencyData(data);
  const ctx=surface.getContext("2d");if(!ctx)return;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
  const bars=48,gap=3,barWidth=Math.max(2,(width-gap*(bars-1))/bars);
  for(let index=0;index<bars;index++){const value=data[Math.floor(index/bars*data.length)]/255;const barHeight=Math.max(4,value*(height*.82));ctx.fillStyle=index%6===0?"#f15b61":"#45dff2";ctx.fillRect(index*(barWidth+gap),(height-barHeight)/2,barWidth,barHeight)}
  frame.current=requestAnimationFrame(draw);
 };
 const play=async()=>{
  if(!audio.current)return;
  try{
   if(!context.current){const AudioCtor=window.AudioContext;const next=new AudioCtor();const source=next.createMediaElementSource(audio.current);const analysis=next.createAnalyser();analysis.fftSize=256;source.connect(analysis);analysis.connect(next.destination);context.current=next;analyser.current=analysis}
   await context.current.resume();audio.current.currentTime=0;await audio.current.play();setPlaying(true);setPlays((value)=>value+1);draw();
  }catch{setFailed(true);stopVisual()}
 };
 const score=Math.max(120,(correct?1100:220)-Math.max(0,plays-1)*90-(difficulty==="easy"?0:40));
 return <div className="poke-cry">
  <RunHud score={guess!==null?score:0} round={guess!==null?1:0} total={1} resource={Math.max(0,3-plays)} label={locale==="de"?"BONUS-RUFE":"BONUS PLAYS"}/>
  <section className={`poke-spectrum ${playing?"is-playing":""}`}>
   <audio ref={audio} crossOrigin="anonymous" src={target.cry??undefined} onEnded={stopVisual} onError={()=>setFailed(true)}/>
   <canvas ref={canvas} className="poke-spectrum-canvas" aria-hidden/>
   <div className="poke-radar-dial"><AudioLines/><span>{failed?"MEDIA SIGNAL FAILED":playing?"LIVE ANALYSER":"READY / NO AUTOPLAY"}</span></div>
   <button className="poke-audio-button" onClick={play} disabled={failed||playing}><Mic2/>{playing?(locale==="de"?"Live-Analyse":"Live analysis"):(locale==="de"?"Ruf abspielen / wiederholen":"Play / replay cry")}</button>
   <p>{locale==="de"?"Die Anzeige wird in Echtzeit aus Frequenzdaten dieses Rufs erzeugt. Wiederholungen reduzieren den Bonus.":"The display is generated from this cry's live frequency data. Replays reduce the bonus."}</p>
  </section>
  <div className="poke-cry-candidates">{candidates.map((entry)=><button key={entry.id} disabled={guess!==null||failed} onClick={()=>setGuess(entry.id)}><PokemonSprite entry={entry} size={115}/><b>{entry.name[locale]}</b><small>#{entry.id} Â· Gen {entry.generation}</small></button>)}</div>
  {failed?<Feedback good={false}><Ear/><span><b>{locale==="de"?"Audiodatei nicht verfÃ¼gbar":"Audio file unavailable"}</b><small>{locale==="de"?"Diese Runde wird ohne Wertungsverlust Ã¼bersprungen.":"This round is skipped without a scoring penalty."}</small></span><button onClick={()=>onFinish(0,0,0,[])}>Skip safely â†’</button></Feedback>:guess!==null&&<Feedback good={correct}>{correct?<Check/>:<X/>}<span><b>{correct?(locale==="de"?"Akustischer Treffer":"Acoustic match"):`${locale==="de"?"Signal war":"Signal was"} ${target.name[locale]}`}</b><small>{plays} {locale==="de"?"Wiedergaben":"plays"} Â· {score} pts</small></span><button onClick={()=>onFinish(score,correct?1:0,1,[target.id])}>{locale==="de"?"Signal archivieren":"Archive signal"} â†’</button></Feedback>}
 </div>;
}

export function PokeGrid(props:GameProps){return <MultiRound {...props} Component={PokeGridMission}/>}
function PokeGridMission({locale,difficulty,generationCap,runSeed,onFinish}:GameProps){
 const board=useMemo(()=>buildPokeGrid(generationCap,runSeed),[generationCap,runSeed]);
 const allowed=useMemo(()=>SPECIES.filter((entry)=>entry.generation<=generationCap),[generationCap]);
 const [cells,setCells]=useState<Record<number,number>>({}),[active,setActive]=useState<number|null>(null),[query,setQuery]=useState(""),[strikes,setStrikes]=useState(0),[rejected,setRejected]=useState<number|null>(null);
 const used=Object.values(cells),maxStrikes=difficulty==="easy"?12:difficulty==="medium"?6:3;
 const options=useMemo(()=>active===null?[]:seededShuffle(allowed.filter((entry)=>!used.includes(entry.id)&&entry.name[locale].toLowerCase().includes(query.trim().toLowerCase())),`${runSeed}:search:${active}:${query}`).slice(0,48),[active,allowed,locale,query,runSeed,used]);
 const complete=used.length===9,failed=strikes>=maxStrikes&&!complete;
 const rarityBonus=Object.entries(cells).reduce((sum,[cell])=>sum+Math.max(20,220-(board.solutions[Number(cell)]?.length??50)*4),0);
 const score=Math.max(0,used.length*180+rarityBonus-strikes*70);
 const choose=(id:number)=>{
  if(active===null||failed)return;
  const row=Math.floor(active/3),col=active%3;
  if(used.includes(id)||!board.rows[row]?.test(id)||!board.cols[col]?.test(id)){setStrikes((value)=>value+1);setRejected(id);return}
  setCells((state)=>({...state,[active]:id}));setActive(null);setRejected(null);setQuery("");
 };
 return <div className="poke-grid-game">
  <RunHud score={score} round={used.length} total={9} resource={Math.max(0,maxStrikes-strikes)} label={locale==="de"?"VERSUCHE":"ATTEMPTS"}/>
  <header><p className="poke-kicker">SEEDED MATRIX // GEN 1â€“{generationCap}</p><h2>{locale==="de"?"Neun gÃ¼ltige, verschiedene Spezies":"Nine valid, distinct species"}</h2><p>{locale==="de"?"Jeder Run erzeugt eine neue, vorab auf eindeutige Neuner-LÃ¶sbarkeit geprÃ¼fte Matrix. Seltenere gÃ¼ltige Antworten geben mehr Punkte.":"Every run generates a new matrix pre-checked for a distinct nine-species solution. Rarer valid answers score more."}</p></header>
  <div className="poke-grid-board"><div className="poke-grid-corner">ROW Ã— COL</div>{board.cols.map((item,index)=><div className="poke-grid-label" key={index}>{item.label[locale]}</div>)}{board.rows.flatMap((row,rowIndex)=>[
   <div className="poke-grid-label" key={`r-${rowIndex}`}>{row.label[locale]}</div>,
   ...[0,1,2].map((colIndex)=>{const cell=rowIndex*3+colIndex,id=cells[cell],count=board.solutions[cell]?.length??0;return <button key={cell} onClick={()=>setActive(cell)} disabled={failed} className={id?"is-filled":active===cell?"is-active":""}>{id?<><PokemonSprite entry={species(id)} size={80}/><small>{species(id).name[locale]} Â· {count} {locale==="de"?"LÃ¶sungen":"solutions"}</small></>:<span>+</span>}</button>})
  ])}</div>
  {active!==null&&!failed&&<div className="poke-grid-search"><header><Search/><input autoFocus value={query} onChange={(event)=>{setQuery(event.target.value);setRejected(null)}} placeholder={locale==="de"?"PokÃ©mon im aktiven Gen-Pool suchen":"Search the active generation pool"}/><button onClick={()=>setActive(null)} aria-label={locale==="de"?"Suche schlieÃŸen":"Close search"}>Ã—</button></header><p>{board.rows[Math.floor(active/3)].label[locale]} Ã— {board.cols[active%3].label[locale]} Â· {board.solutions[active].length} {locale==="de"?"gÃ¼ltige Spezies":"valid species"}</p>{rejected!==null&&<div className="poke-grid-reject" role="status">{locale==="de"?`${species(rejected).name.de} erfÃ¼llt diese Schnittmenge nicht.`:`${species(rejected).name.en} does not satisfy this intersection.`}</div>}<div>{options.map((entry)=><button key={entry.id} className={rejected===entry.id?"is-rejected":""} onClick={()=>choose(entry.id)}><PokemonSprite entry={entry} size={65}/><span>{entry.name[locale]}<small>#{entry.id}</small></span></button>)}</div></div>}
  {(complete||failed)&&<Feedback good={complete}>{complete?<Check/>:<ShieldAlert/>}<span><b>{complete?(locale==="de"?"Matrix vollstÃ¤ndig":"Matrix complete"):(locale==="de"?"Versuchslimit erreicht":"Attempt limit reached")}</b><small>{used.length}/9 Â· rarity bonus {rarityBonus} Â· {strikes} strikes</small></span><button onClick={()=>onFinish(score,used.length,9,used)}>{locale==="de"?"Matrix versiegeln":"Seal grid"} â†’</button></Feedback>}
 </div>;
}

export function ProfessorCaseFiles(props:GameProps){return <MultiRound {...props} Component={ProfessorCaseMission}/>}
function ProfessorCaseMission({locale,generationCap,runSeed,onFinish}:GameProps){
 const dossier=useMemo(()=>buildDynamicCase(generationCap,runSeed),[generationCap,runSeed]);
 const [revealed,setRevealed]=useState(1),[crossed,setCrossed]=useState<number[]>([]),[guess,setGuess]=useState<number|null>(null),[contradiction,setContradiction]=useState<number|null>(null);
 const candidates=dossier.suspects.filter((entry)=>dossier.clues.slice(0,revealed).every((clue)=>clue.test(entry.id)));
 const correct=guess===dossier.target.id,score=Math.max(120,1800-revealed*110+(dossier.suspects.length-candidates.length)*25)*(correct?1:0);
 const toggleCross=(id:number)=>{
  if(guess!==null)return;
  if(candidates.some((entry)=>entry.id===id)){setContradiction(id);return}
  setContradiction(null);setCrossed((items)=>items.includes(id)?items.filter((item)=>item!==id):[...items,id]);
 };
 return <div className="poke-case">
  <RunHud score={Math.round(score)} round={revealed} total={dossier.clues.length} resource={candidates.length} label={locale==="de"?"KANDIDATEN":"SUSPECTS"}/>
  <div className="poke-case-layout">
   <section className="poke-suspect-board"><header><p className="poke-kicker">CASE #{String(dossier.target.id*37).padStart(5,"0")}</p><h2>{locale==="de"?"VerdÃ¤chtigenwand":"Suspect board"}</h2><p>{locale==="de"?"Streiche nur VerdÃ¤chtige, die mindestens einem sichtbaren Beweis widersprechen. Das System warnt vor logischen WidersprÃ¼chen.":"Cross out only suspects contradicted by visible evidence. The system warns about logical contradictions."}</p></header><div>{dossier.suspects.map((entry)=>{
    const possible=candidates.some((item)=>item.id===entry.id);
    return <button key={entry.id} className={`${crossed.includes(entry.id)?"is-crossed":""} ${!possible?"is-impossible":""}`} onClick={()=>toggleCross(entry.id)} disabled={guess!==null}><PokemonSprite entry={entry} size={95}/><span>{entry.name[locale]}<small>{possible?(locale==="de"?"LOGISCH MÃ–GLICH":"LOGICALLY POSSIBLE"):(locale==="de"?"WIDERLEGT":"CONTRADICTED")}</small></span>{crossed.includes(entry.id)&&<X/>}</button>;
   })}</div></section>
   <aside className="poke-evidence-ledger"><p className="poke-kicker">EVIDENCE LEDGER</p>{dossier.clues.slice(0,revealed).map((clue,index)=><div key={index}><span>E-{String(index+1).padStart(2,"0")}</span><p>{clue.label[locale]}</p></div>)}<p className="poke-candidate-count">{candidates.length} {locale==="de"?"logische Kandidaten":"logical candidates"}</p>{contradiction!==null&&<div className="poke-grid-reject" role="status">{locale==="de"?`${species(contradiction).name.de} passt noch zu allen sichtbaren Beweisen.`:`${species(contradiction).name.en} still matches every visible clue.`}</div>}{revealed<dossier.clues.length&&candidates.length>1&&<button className="poke-secondary" onClick={()=>{setRevealed((value)=>value+1);setContradiction(null)}}>{locale==="de"?"WEITEREN BEWEIS AUFDECKEN":"REVEAL NEXT EVIDENCE"} âˆ’110</button>}<div className="poke-case-lock">{candidates.filter((entry)=>!crossed.includes(entry.id)).map((entry)=><button key={entry.id} onClick={()=>setGuess(entry.id)} disabled={guess!==null}>{locale==="de"?"AKTE FESTLEGEN":"LOCK DOSSIER"} Â· {entry.name[locale]}</button>)}</div></aside>
  </div>
  {guess!==null&&<Feedback good={correct}>{correct?<Check/>:<X/>}<span><b>{correct?(locale==="de"?"Fall logisch gelÃ¶st":"Case solved logically"):`${locale==="de"?"Zielakte":"Target dossier"}: ${dossier.target.name[locale]}`}</b><small>#{dossier.target.id} Â· {dossier.target.types.join(" / ")} Â· Gen {dossier.target.generation} Â· {revealed} clues</small></span><button onClick={()=>onFinish(Math.round(score),correct?1:0,1,[dossier.target.id])}>{locale==="de"?"Akte versiegeln":"Seal dossier"} â†’</button></Feedback>}
 </div>;
}
