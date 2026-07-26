"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {Apple,Archive,Check,CircleDot,Crosshair,Gauge,Keyboard,MousePointer2,Radar,ShieldPlus,Sparkles,Wind,X,Zap} from "lucide-react";
import {captureTelemetry,captureTierForSpecies,classifyThrow,generateCaptureEncounters,resolveCaptureAttempt,type CaptureBall,type CaptureTier,type ThrowMetrics,type ThrowQuality} from "@/poke/capture";
import {seedHash,seededRandom} from "@/poke/variety";
import {localizedType} from "@/poke/type-chart";
import {RunHud,type GameProps} from "../gameplay";
import {PokemonSprite} from "../pokemon-sprite";

type PrepReward="advanced"|"berry"|"steady"|"extra";
type FlightState="ready"|"flight"|"shake";
interface Point{x:number;y:number;t:number}
interface ThrowResult{quality:ThrowQuality;curve:boolean;caught:boolean;escaped:boolean;chance:number;attemptsLeft:number}

const TIER_SCORE:Record<CaptureTier,number>={common:420,uncommon:620,rare:900,ultra:1350,legendary:2100};
const TIER_RESISTANCE:Record<CaptureTier,string>={common:"01",uncommon:"02",rare:"03",ultra:"04",legendary:"05"};

export function FieldCapture({locale,difficulty,generationCap,roundCount,runSeed,onFinish}:GameProps){
 const encounters=useMemo(()=>generateCaptureEncounters(generationCap,roundCount,runSeed),[generationCap,roundCount,runSeed]);
 const [phase,setPhase]=useState<"prep"|"encounter"|"summary">("prep");
 const [round,setRound]=useState(0);
 const [score,setScore]=useState(0);
 const [caughtCount,setCaughtCount]=useState(0);
 const [streak,setStreak]=useState(0);
 const [scanPos,setScanPos]=useState(0);
 const [prepResult,setPrepResult]=useState<{success:boolean;clean:boolean}|null>(null);
 const [inventory,setInventory]=useState({advanced:0,berries:0});
 const [activePrep,setActivePrep]=useState<PrepReward|null>(null);
 const [attemptsLeft,setAttemptsLeft]=useState(3);
 const [maxAttempts,setMaxAttempts]=useState(3);
 const [ball,setBall]=useState<CaptureBall>("field");
 const [berry,setBerry]=useState(false);
 const [kitReviewed,setKitReviewed]=useState(false);
 const [ring,setRing]=useState(1);
 const [aim,setAim]=useState(50);
 const [flight,setFlight]=useState<FlightState>("ready");
 const [impact,setImpact]=useState({x:50,y:46});
 const [drag,setDrag]=useState<{active:boolean;start:Point|null;points:Point[]}>({active:false,start:null,points:[]});
 const [result,setResult]=useState<ThrowResult|null>(null);
 const [caughtLog,setCaughtLog]=useState<{id:number;tier:CaptureTier;quality:ThrowQuality;curve:boolean}[]>([]);
 const [encounterLog,setEncounterLog]=useState<{id:number;caught:boolean;tier:CaptureTier}[]>([]);
 const interactionRef=useRef<HTMLDivElement>(null),clearingRef=useRef<HTMLDivElement>(null),timers=useRef<number[]>([]);
 const current=encounters[round],tier=current?captureTierForSpecies(current):"common";
 const reward=useMemo(()=>["advanced","berry","steady","extra"][seedHash(`${runSeed}:prep:${round}`)%4] as PrepReward,[round,runSeed]);
 const target=useMemo(()=>{const random=seededRandom(`${runSeed}:scan:${round}`),width=difficulty==="easy"?30:difficulty==="hard"?16:23;return{left:12+random()*(76-width),width}},[difficulty,round,runSeed]);
 const speed=difficulty==="easy"?3200:difficulty==="hard"?2050:2600;

 useEffect(()=>{if(phase!=="prep"||prepResult)return;const started=performance.now();const id=window.setInterval(()=>{const travel=((performance.now()-started)%speed)/speed;setScanPos(travel<=.5?travel*200:(1-travel)*200)},32);return()=>window.clearInterval(id)},[phase,prepResult,speed,round]);
 useEffect(()=>{if(phase!=="encounter"||result)return;const started=performance.now(),tierSpeed={common:2500,uncommon:2200,rare:1850,ultra:1500,legendary:1250}[tier]*(activePrep==="steady"?1.35:1);const id=window.setInterval(()=>{const elapsed=performance.now()-started;setRing(.28+Math.abs(Math.sin(elapsed/tierSpeed*Math.PI))*.72);setAim(50+Math.sin(elapsed/920*Math.PI)*45)},35);return()=>window.clearInterval(id)},[activePrep,phase,result,round,tier]);
 useEffect(()=>()=>timers.current.forEach(window.clearTimeout),[]);

 const stopScanner=()=>{
  if(prepResult)return;const success=scanPos>=target.left&&scanPos<=target.left+target.width,clean=success&&Math.abs(scanPos-(target.left+target.width/2))<=target.width*.22;
  setPrepResult({success,clean});if(clean)setScore((value)=>value+90);
 };
 const beginEncounter=()=>{
  const earned=prepResult?.success?reward:null;setActivePrep(earned);
  if(earned==="advanced")setInventory((value)=>({...value,advanced:value.advanced+1}));
  if(earned==="berry")setInventory((value)=>({...value,berries:value.berries+1}));
  const attempts=3+(earned==="extra"?1:0);setAttemptsLeft(attempts);setMaxAttempts(attempts);setBall("field");setBerry(false);setKitReviewed(false);setResult(null);setFlight("ready");setDrag({active:false,start:null,points:[]});setPhase("encounter");
 };
 const beginDrag=(event:React.PointerEvent<HTMLDivElement>)=>{
  if(!kitReviewed||result||flight!=="ready"||!(event.target as HTMLElement).closest("[data-capture-cradle]"))return;
  event.currentTarget.setPointerCapture(event.pointerId);const rect=interactionRef.current!.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top,t:performance.now()};setDrag({active:true,start:point,points:[point]});
 };
 const moveDrag=(event:React.PointerEvent<HTMLDivElement>)=>{
  if(!drag.active||!interactionRef.current)return;const rect=interactionRef.current.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top,t:performance.now()};setDrag((value)=>({...value,points:[...value.points.slice(-18),point]}));
 };
 const releaseDrag=(event:React.PointerEvent<HTMLDivElement>)=>{
  if(!drag.active||!drag.start||!interactionRef.current||!clearingRef.current)return;
  const wrapper=interactionRef.current.getBoundingClientRect(),clear=clearingRef.current.getBoundingClientRect(),end={x:event.clientX-wrapper.left,y:event.clientY-wrapper.top,t:performance.now()},targetPoint={x:clear.left-wrapper.left+clear.width/2,y:clear.top-wrapper.top+clear.height*.48};
  const distance=Math.hypot(end.x-targetPoint.x,end.y-targetPoint.y),maxDistance=Math.hypot(clear.width*.58,clear.height*.58),accuracy=Math.max(0,1-distance/maxDistance);
  const direction=Math.max(0,Math.min(1,(drag.start.y-end.y)/Math.max(90,drag.start.y-targetPoint.y)));
  const points=[...drag.points,end],previous=points.at(-2)??drag.start,velocity=Math.hypot(end.x-previous.x,end.y-previous.y)/Math.max(8,end.t-previous.t),curve=curveAmount(points,drag.start,end)>Math.max(25,wrapper.width*.07);
  const x=Math.max(5,Math.min(95,(end.x-(clear.left-wrapper.left))/clear.width*100)),y=Math.max(8,Math.min(88,(end.y-(clear.top-wrapper.top))/clear.height*100));
  setDrag({active:false,start:null,points:[]});performThrow({accuracy,ring,direction,speed:Math.min(1,velocity/1.1),curve},{x,y});
 };
 const fallbackThrow=()=>{if(!kitReviewed)return;performThrow({accuracy:Math.max(0,1-Math.abs(aim-50)/50),ring,direction:.82,speed:.35,curve:false},{x:aim,y:48})};
 const performThrow=(metrics:ThrowMetrics,landing:{x:number;y:number})=>{
  if(!current||result||flight!=="ready")return;
  const quality=classifyThrow(metrics),attempt=maxAttempts-attemptsLeft+1,usedBall=ball,usedBerry=berry;
  const resolved=resolveCaptureAttempt({speciesId:current.id,tier,quality,curve:metrics.curve,ball:usedBall,berry:usedBerry,attempt,seed:`${runSeed}:${round}`});
  const nextAttempts=Math.max(0,attemptsLeft-1),escaped=!resolved.caught&&(resolved.fled||nextAttempts<=0);
  if(usedBall==="advanced")setInventory((value)=>({...value,advanced:Math.max(0,value.advanced-1)}));
  if(usedBerry)setInventory((value)=>({...value,berries:Math.max(0,value.berries-1)}));
  setBall("field");setBerry(false);setImpact(landing);setFlight("flight");
  timers.current.push(window.setTimeout(()=>setFlight(quality==="miss"?"flight":"shake"),430));
  timers.current.push(window.setTimeout(()=>{
   setAttemptsLeft(nextAttempts);setResult({quality,curve:metrics.curve,caught:resolved.caught,escaped,chance:resolved.chance,attemptsLeft:nextAttempts});
   if(resolved.caught){const nextStreak=streak+1,multiplier=quality==="excellent"?1.45:quality==="great"?1.22:1;setScore((value)=>value+Math.round(TIER_SCORE[tier]*multiplier+(metrics.curve?120:0)+nextStreak*80));setCaughtCount((value)=>value+1);setStreak(nextStreak);setCaughtLog((items)=>[...items,{id:current.id,tier,quality,curve:metrics.curve}]);setEncounterLog((items)=>[...items,{id:current.id,caught:true,tier}])}
   else if(escaped){setStreak(0);setEncounterLog((items)=>[...items,{id:current.id,caught:false,tier}])}
   setFlight("ready");
  },quality==="miss"?620:1420));
 };
 const retry=()=>{setResult(null);setFlight("ready");setDrag({active:false,start:null,points:[]})};
 const advance=()=>{
  if(!result||(!result.caught&&!result.escaped))return;
  if(round+1>=encounters.length){setPhase("summary");return}
  setRound((value)=>value+1);setPrepResult(null);setResult(null);setActivePrep(null);setKitReviewed(false);setFlight("ready");setScanPos(0);setPhase("prep");
 };
 const archive=()=>onFinish(score,caughtCount,encounters.length,encounters.map((entry)=>entry.id),encounters.length);

 if(!current)return null;
 if(phase==="summary"){
  const rarest=[...caughtLog].sort((a,b)=>tierRank(b.tier)-tierRank(a.tier))[0];
  return <section className="poke-capture-summary"><div className="poke-capture-summary-mark"><Radar/><i/></div><p className="poke-kicker">FIELD SURVEY ARCHIVED</p><h2>{locale==="de"?"Fanglauf abgeschlossen":"Capture run complete"}</h2><p>{locale==="de"?"Alle Sichtungen wurden protokolliert – gefangen oder entkommen.":"Every sighting was logged—caught or escaped."}</p><div className="poke-capture-summary-stats"><span><b>{caughtCount}/{roundCount}</b>{locale==="de"?"GEFANGEN":"CAUGHT"}</span><span><b>{score}</b>SCORE</span><span><b>{caughtLog.filter((item)=>item.quality==="excellent").length}</b>EXCELLENT</span><span><b>{caughtLog.filter((item)=>item.curve).length}</b>CURVE</span></div><div className="poke-capture-log">{encounterLog.map((item,index)=><span key={`${item.id}-${index}`} className={item.caught?"is-caught":"is-escaped"}><i>{String(index+1).padStart(2,"0")}</i><PokemonSprite entry={encounters[index]} size={72}/><b>{encounters[index].name[locale]}</b><small>{tierLabel(item.tier,locale)} · {item.caught?(locale==="de"?"GEFANGEN":"CAUGHT"):(locale==="de"?"ENTKOMMEN":"ESCAPED")}</small></span>)}</div>{rarest&&<div className="poke-rarest-lock"><Sparkles/><span><small>{locale==="de"?"SELTENSTER FUND":"RAREST DISCOVERY"}</small><b>{encounters.find((entry)=>entry.id===rarest.id)?.name[locale]}</b><em>{tierLabel(rarest.tier,locale)}</em></span></div>}<button className="poke-primary" onClick={archive}><Archive/>{locale==="de"?"Feldlog archivieren":"Archive field log"}</button></section>;
 }
 if(phase==="prep")return <section className="poke-capture-prep"><RunHud score={score} round={round+1} total={roundCount} resource={streak} label="STREAK"/><CaptureMissionGuide locale={locale} step={1} scannerDone={!!prepResult}/><header><div><p className="poke-kicker">FIELD PREPARATION // {String(round+1).padStart(2,"0")}</p><h2>{locale==="de"?"Scanner auf das Signalfenster stoppen":"Stop the scanner inside the signal window"}</h2><p>{locale==="de"?"Eine saubere Kalibrierung bringt einen taktischen Bonus für die kommende Sichtung.":"A clean calibration earns one tactical bonus for the incoming sighting."}</p></div><RewardPreview reward={reward} locale={locale}/></header><p className="poke-active-instruction"><Zap/><span><b>{locale==="de"?"JETZT: Beobachte den Blitz":"NOW: Watch the bolt"}</b>{locale==="de"?"Drücke, sobald er im gelb markierten Signalfenster steht. Die Mitte bringt +90 Punkte.":"Press when it enters the amber signal window. Its center awards +90 score."}</span></p><div className={`poke-scanner-stop ${prepResult?"is-stopped":""}`}><div className="poke-scanner-scale">{Array.from({length:11},(_,index)=><span key={index}>{index*10}</span>)}</div><div className="poke-scanner-track"><i className="poke-scan-band" style={{left:`${target.left}%`,width:`${target.width}%`}}/><b style={{left:`${scanPos}%`}}><Zap/></b></div><div className="poke-scanner-readout"><span>POS <b>{scanPos.toFixed(1)}</b></span><span>WINDOW <b>{target.left.toFixed(0)}–{(target.left+target.width).toFixed(0)}</b></span><span>SPEED <b>{difficulty.toUpperCase()}</b></span></div></div>{!prepResult?<button className="poke-capture-lock" onClick={stopScanner}><Crosshair/>{locale==="de"?"SIGNAL STOPPEN":"STOP SIGNAL"}<span>SPACE / TAP</span></button>:<div className={`poke-prep-result ${prepResult.success?"is-good":"is-bad"}`}>{prepResult.success?<Check/>:<X/>}<span><b>{prepResult.success?(prepResult.clean?(locale==="de"?"Perfekte Feldkalibrierung":"Perfect field calibration"):(locale==="de"?"Signalfenster erfasst":"Signal window acquired")):(locale==="de"?"Signalfenster verpasst":"Signal window missed")}</b><small>{prepResult.success?`${rewardName(reward,locale)}${prepResult.clean?" · +90 SCORE":""}`:(locale==="de"?"Sichtung startet ohne Bonus.":"Sighting begins without a bonus.")}</small></span><button onClick={beginEncounter}>{locale==="de"?"Zu Schritt 2: Ausrüstung":"Step 2: inspect gear"} →</button></div>}</section>;

 const terminal=!!result&&(result.caught||result.escaped),telemetry=captureTelemetry(tier,ball,berry),fleePressure=maxAttempts-attemptsLeft;
 const tierName=current.mythical?(locale==="de"?"MYTHISCH":"MYTHICAL"):current.legendary?(locale==="de"?"LEGENDÄR":"LEGENDARY"):tierLabel(tier,locale).toUpperCase();
 const fleeName=(locale==="de"?["NIEDRIG","NIEDRIG","STEIGEND","HOCH"]:["LOW","LOW","RISING","HIGH"])[Math.min(3,fleePressure)];
 return <div className={`poke-capture-game tier-${tier}`}><RunHud score={score} round={round+1} total={roundCount} resource={streak} label="STREAK"/><CaptureMissionGuide locale={locale} step={kitReviewed?3:2} scannerDone kitDone={kitReviewed}/><div className="poke-capture-hud"><span>{locale==="de"?"STUFE":"TIER"} <b>{tierName}</b></span><span>{locale==="de"?"WIDERSTAND":"RESIST"} <b>{TIER_RESISTANCE[tier]}/05</b></span><span>{locale==="de"?"VERSUCHE":"ATTEMPTS"} <b>{attemptsLeft}/{maxAttempts}</b></span><span>{locale==="de"?"FLUCHT":"FLEE"} <b>{fleeName}</b></span></div><div className="poke-capture-interaction" ref={interactionRef} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={releaseDrag}><section className="poke-capture-clearing" ref={clearingRef}><div className="poke-field-sky"/><div className="poke-field-grass is-back"/><div className="poke-field-grass is-front"/><div className="poke-catch-aperture" style={{width:`${Math.round(220*ring)}px`,height:`${Math.round(220*ring)}px`}}><i/></div><div className="poke-capture-reticle"/><PokemonSprite entry={current} size={260}/><div className="poke-capture-specimen"><span>#{String(current.id).padStart(4,"0")} · GEN {current.generation}</span><h2>{current.name[locale]}</h2><small>{current.types.map((type)=>localizedType(type,locale)).join(" · ")}</small></div>{drag.points.length?<div className="poke-live-trajectory">{drag.points.map((point,index)=><i key={index} style={{left:point.x,top:point.y}}/>)}</div>:<div className="poke-trajectory-preview">{Array.from({length:7},(_,index)=><i key={index} style={{"--dot":index} as React.CSSProperties}/>)}</div>}<div className={`poke-ball-flight is-${flight}`} style={{left:`${impact.x}%`,top:`${impact.y}%`}}><CircleDot/></div></section><section className="poke-field-kit"><header><div><p className="poke-kicker">{locale==="de"?"FANG-TELEMETRIE":"CAPTURE TELEMETRY"}</p><h3>{kitReviewed?(locale==="de"?"Wurf ausrichten":"Line up the throw"):(locale==="de"?"Feldkit vorbereiten":"Prepare field kit")}</h3></div><div className={`poke-catch-forecast is-${telemetry}`}><Gauge/><span>{locale==="de"?"FANGSIGNAL":"CATCH SIGNAL"}<b>{telemetryLabel(telemetry,locale)}</b></span></div></header>{!kitReviewed?<p className="poke-active-instruction is-compact"><ShieldPlus/><span><b>{locale==="de"?"JETZT: Ausrüstung prüfen":"NOW: Inspect your gear"}</b>{locale==="de"?"Aktiviere Ball oder Beere, falls verfügbar. Jeder Gegenstand wird beim nächsten Wurf verbraucht.":"Activate a ball or berry if available. Each selected item is consumed by the next throw."}</span></p>:<p className="poke-active-instruction is-compact"><MousePointer2/><span><b>{locale==="de"?"JETZT: Ball nach oben ziehen":"NOW: Drag the ball upward"}</b>{locale==="de"?"Über dem Pokémon loslassen. Ein kleiner Ring belohnt präzises Timing; seitliche Kurve gibt einen Bonus.":"Release over the Pokémon. A smaller ring rewards timing; a sideways curve adds a bonus."}</span></p>}<div className="poke-modifier-rack"><button aria-pressed={ball==="advanced"} disabled={!inventory.advanced||!!result||kitReviewed} onClick={()=>setBall((value)=>value==="advanced"?"field":"advanced")}><ShieldPlus/><span><b>{locale==="de"?"Verstärkter Ball":"Advanced ball"}</b><small>{inventory.advanced} {locale==="de"?"VORRAT":"STOCK"} · 1.35×</small></span></button><button aria-pressed={berry} disabled={!inventory.berries||!!result||kitReviewed} onClick={()=>setBerry((value)=>!value)}><Apple/><span><b>{locale==="de"?"Feldbeere":"Field berry"}</b><small>{inventory.berries} {locale==="de"?"VORRAT":"STOCK"} · 1.24×</small></span></button><span className={activePrep==="steady"?"is-active":""}><Crosshair/><b>{locale==="de"?"RINGSTABILITÄT":"RING STABILITY"}</b><small>{activePrep==="steady"?(locale==="de"?"AKTIV · LANGSAMER":"ACTIVE · SLOWER"):(locale==="de"?"NICHT AKTIV":"NOT ACTIVE")}</small></span></div>{!kitReviewed?<button className="poke-kit-confirm" onClick={()=>setKitReviewed(true)}><Check/>{locale==="de"?"KIT GEPRÜFT · ZUM WURF":"KIT CHECKED · CONTINUE TO THROW"} →</button>:<><div className="poke-aim-fallback"><div><span style={{left:`${aim}%`}}/><i/></div><button disabled={!!result||flight!=="ready"} onClick={fallbackThrow}><Keyboard/>{locale==="de"?"AIM-LOCK AUSLÖSEN":"TRIGGER AIM LOCK"}</button></div><div className="poke-throw-cradle"><button data-capture-cradle disabled={!!result||flight!=="ready"} aria-label={locale==="de"?"Ball nach oben zum Pokémon ziehen":"Drag ball upward toward the Pokémon"}><CircleDot/></button><span><MousePointer2/><b>{locale==="de"?"ZIEHEN & LOSLASSEN":"DRAG & RELEASE"}</b><small>{locale==="de"?"Richtung · Landung · kleiner Ring · Curve":"direction · landing · small ring · curve"}</small></span><Wind/></div></>}</section></div>{result&&<div className={`poke-capture-resolution ${result.caught?"is-caught":result.escaped?"is-escaped":"is-breakout"}`}>{result.caught?<Check/>:result.escaped?<X/>:<CircleDot/>}<span><small>{throwLabel(result.quality,result.curve).toUpperCase()}</small><b>{result.caught?(locale==="de"?"Forschungssperre bestätigt":"Research lock confirmed"):result.escaped?(locale==="de"?"Spezies entkommen":"Specimen escaped"):(locale==="de"?"Ausgebrochen – neu kalibrieren":"Breakout—recalibrate")}</b><em>{result.caught?`${tierLabel(tier,locale)} · +${TIER_SCORE[tier]} ${locale==="de"?"BASIS":"BASE"}`:result.escaped?(locale==="de"?"Sichtung protokolliert":"Sighting logged"):`${result.attemptsLeft} ${locale==="de"?"Versuche übrig":"attempts remaining"} · ${locale==="de"?"Fluchtrisiko":"flee risk"} ${fleeName}`}</em></span><button onClick={terminal?advance:retry}>{terminal?(round+1>=roundCount?(locale==="de"?"Zusammenfassung":"Summary"):(locale==="de"?"Nächstes Feld":"Next field")):(locale==="de"?"Noch einmal werfen":"Throw again")} →</button></div>}</div>;
}

function CaptureMissionGuide({locale,step,scannerDone=false,kitDone=false}:{locale:"en"|"de";step:1|2|3;scannerDone?:boolean;kitDone?:boolean}){
 const items=[
  {title:{de:"Scanner stoppen",en:"Stop scanner"},copy:{de:"Blitz ins Signalfenster",en:"Bolt inside signal window"}},
  {title:{de:"Ausrüstung prüfen",en:"Inspect gear"},copy:{de:"Boni bewusst aktivieren",en:"Activate bonuses deliberately"}},
  {title:{de:"Ball werfen",en:"Throw ball"},copy:{de:"Nach oben ziehen & loslassen",en:"Drag upward & release"}},
 ];
 return <nav className="poke-capture-guide" aria-label={locale==="de"?"Fangmission in drei Schritten":"Three-step capture mission"}>
  {items.map((item,index)=>{const number=(index+1) as 1|2|3,done=number===1?scannerDone:number===2?kitDone:false,active=number===step&&!done;return <div key={number} className={`${active?"is-active":""} ${done?"is-done":""}`} aria-current={active?"step":undefined}><span>{done?<Check/>:number}</span><p><b>{item.title[locale]}</b><small>{done?(locale==="de"?"ERLEDIGT":"COMPLETE"):item.copy[locale]}</small></p></div>})}
 </nav>;
}

function RewardPreview({reward,locale}:{reward:PrepReward;locale:"en"|"de"}){return <aside className="poke-prep-reward"><span>{locale==="de"?"MÖGLICHER BONUS":"AVAILABLE BONUS"}</span><RewardIcon reward={reward}/><b>{rewardName(reward,locale)}</b><small>{rewardDescription(reward,locale)}</small></aside>}
function RewardIcon({reward}:{reward:PrepReward}){if(reward==="advanced")return <ShieldPlus/>;if(reward==="berry")return <Apple/>;if(reward==="steady")return <Crosshair/>;return <CircleDot/>}
function rewardName(reward:PrepReward,locale:"en"|"de"){return reward==="advanced"?(locale==="de"?"Verstärkter Ball":"Advanced ball"):reward==="berry"?(locale==="de"?"Feldbeere":"Field berry"):reward==="steady"?(locale==="de"?"Stabiler Fangring":"Steady aperture"):(locale==="de"?"Zusatzversuch":"Extra attempt")}
function rewardDescription(reward:PrepReward,locale:"en"|"de"){return reward==="advanced"?(locale==="de"?"Einmalig 1,35× Fangsignal.":"One-use 1.35× catch signal."):reward==="berry"?(locale==="de"?"Einmalig 1,24× Fangsignal.":"One-use 1.24× catch signal."):reward==="steady"?(locale==="de"?"Fangring bewegt sich langsamer.":"Catch aperture moves more slowly."):(locale==="de"?"Vier statt drei Würfe.":"Four throws instead of three.")}
function tierLabel(tier:CaptureTier,locale:"en"|"de"){const labels={common:{en:"common",de:"häufig"},uncommon:{en:"uncommon",de:"ungewöhnlich"},rare:{en:"rare",de:"selten"},ultra:{en:"ultra-rare",de:"ultra-selten"},legendary:{en:"legendary / mythical",de:"legendär / mythisch"}};return labels[tier][locale]}
function telemetryLabel(value:string,locale:"en"|"de"){return value==="high"?(locale==="de"?"HOCH":"HIGH"):value==="steady"?(locale==="de"?"STABIL":"STEADY"):(locale==="de"?"NIEDRIG":"LOW")}
function throwLabel(quality:ThrowQuality,curve:boolean){return`${curve?"Curve ":""}${quality}`}
function tierRank(tier:CaptureTier){return["common","uncommon","rare","ultra","legendary"].indexOf(tier)}
function curveAmount(points:Point[],start:Point,end:Point){if(points.length<3)return 0;const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy)||1;return Math.max(...points.map((point)=>Math.abs(dy*point.x-dx*point.y+end.x*start.y-end.y*start.x)/length))}
