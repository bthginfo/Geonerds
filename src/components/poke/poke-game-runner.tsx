"use client";

import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {useEffect,useState} from "react";
import {ArrowLeft,Check,RotateCcw,Sparkles} from "lucide-react";
import {useT} from "@/i18n/I18nProvider";
import {getPokeGame} from "@/poke/registry";
import {pl,type PokeDifficulty,type PokeGameId,type PokeRun} from "@/poke/types";
import {usePokeDex,usePokeProgression,usePokeScores,usePokeSession} from "@/poke/store";
import {normalizeRunScore,shouldRecordDex} from "@/poke/progression";
import {apiSubmitPokeScore,getPokeChallenge,submitPokeChallengeAttempt,type PokeChallenge} from "@/poke/online";
import {challengePlayBlockReason} from "@/poke/competition";
import {PokePathExpedition,RegionRanger,HabitatHunt,TypeClashArena,GymDraftGauntlet} from "./games/exploration-games";
import {CryRadar,EvolutionLab,FieldScanner,PokeGrid,ProfessorCaseFiles} from "./games/lab-games";
import {BinderAscension} from "./games/binder-ascension";
import {GuessThatPokemon} from "./games/guess-that-pokemon";
import {FieldCapture} from "./games/field-capture";

const components={"guess-that-pokemon":GuessThatPokemon,"poke-path-expedition":PokePathExpedition,"region-ranger":RegionRanger,"habitat-hunt":HabitatHunt,"type-clash-arena":TypeClashArena,"gym-draft-gauntlet":GymDraftGauntlet,"evolution-lab":EvolutionLab,"binder-ascension":BinderAscension,"field-capture":FieldCapture,"field-scanner":FieldScanner,"cry-radar":CryRadar,"poke-grid":PokeGrid,"professor-case-files":ProfessorCaseFiles};
const mapGames:PokeGameId[]=["poke-path-expedition","region-ranger","habitat-hunt"];
const gameSkills:Record<PokeGameId,{en:string[];de:string[]}>={
 "guess-that-pokemon":{en:["Visual recognition","Generation pools","Ability recall"],de:["Visuelles Erkennen","Generationen-Pools","Fähigkeitenwissen"]},
 "poke-path-expedition":{en:["Route choices","Team synergy","Resource planning"],de:["Routenwahl","Team-Synergie","Ressourcenplanung"]},
 "region-ranger":{en:["Map reading","Distance judgement","Spatial memory"],de:["Kartenlesen","Distanzgefühl","Räumliches Gedächtnis"]},
 "habitat-hunt":{en:["Biome clues","Weather logic","Habitat matching"],de:["Biom-Spuren","Wetterlogik","Habitat-Zuordnung"]},
 "type-clash-arena":{en:["Type matchups","Energy timing","Move upgrades"],de:["Typenwirkung","Energie-Timing","Attacken-Upgrades"]},
 "gym-draft-gauntlet":{en:["Coverage","Budget drafting","Trial prediction"],de:["Coverage","Budget-Draft","Prüfungsprognose"]},
 "evolution-lab":{en:["Family order","Evolution triggers","Branch logic"],de:["Familienfolge","Entwicklungsbedingungen","Verzweigungslogik"]},
 "binder-ascension":{en:["Deck building","Enemy intents","Risky routing"],de:["Deckbau","Gegnerabsichten","Risikorouten"]},
 "field-capture":{en:["Scanner timing","Gear bonuses","Skill throws"],de:["Scanner-Timing","Ausrüstungsboni","Präzisionswürfe"]},
 "field-scanner":{en:["Silhouettes","Information value","Ability clues"],de:["Silhouetten","Informationswert","Fähigkeitsspuren"]},
 "cry-radar":{en:["Audio memory","Waveform reading","Signal comparison"],de:["Audio-Gedächtnis","Wellenform-Lesen","Signalvergleich"]},
 "poke-grid":{en:["Taxonomy","Constraint solving","Rarity strategy"],de:["Taxonomie","Schnittmengenlogik","Seltenheitsstrategie"]},
 "professor-case-files":{en:["Deduction","Evidence value","Confidence calls"],de:["Deduktion","Beweiswert","Sicherheitsentscheidung"]},
};

export function PokeGameRunner({gameId}:{gameId:PokeGameId}){
 const {locale}=useT();
 const game=getPokeGame(gameId);
 const challengeId=useSearchParams().get("challenge");
 const [challenge,setChallenge]=useState<PokeChallenge|null>(null);
 const [challengeError,setChallengeError]=useState<string|null>(null);
 const [started,setStarted]=useState(false);
 const [runSeed,setRunSeed]=useState<string|null>(null);
 const [startedAt,setStartedAt]=useState(0);
 const [difficulty,setDifficulty]=useState<PokeDifficulty>("medium");
 const [practice,setPractice]=useState(false);
 const [generationCap,setGenerationCap]=useState(1);
 const storedRoundCount=usePokeSession((state)=>state.roundCount);
 const [roundCount,setLocalRoundCount]=useState<5|10|20>(storedRoundCount);
 const setStoredRoundCount=usePokeSession((state)=>state.setRoundCount);
 const setRoundCount=(value:5|10|20)=>{setLocalRoundCount(value);setStoredRoundCount(value)};
 const [result,setResult]=useState<{score:number;correct:number;total:number;completedRounds:number;rating:number;online:string}|null>(null);
 const record=usePokeProgression((state)=>state.record);
 const add=usePokeScores((state)=>state.add);
 const encounter=usePokeDex((state)=>state.encounter);
 const Component=components[gameId];
 const isMap=mapGames.includes(gameId);

 useEffect(()=>{
  if(!challengeId)return;
  getPokeChallenge(challengeId).then((data)=>{
   if(!data.challenge||data.challenge.gameId!==gameId){setChallengeError(data.error??"invalid_challenge");return}
   const item=data.challenge;
   const seed=item.seed;
   const viewerAttempted=item.viewerAttempted??item.attempts?.some((attempt)=>attempt.user_id===item.viewerId)??false;
   const block=challengePlayBlockReason({status:item.status,seed,viewerAttempted});
   if(block||!seed){setChallengeError(block??"challenge_seed_unavailable");return}
   setChallenge({...item,viewerAttempted});setDifficulty(item.difficulty);setGenerationCap(item.generationCap);setLocalRoundCount(item.rounds);setPractice(false);setRunSeed(seed);setStarted(true);setStartedAt(Date.now());
  });
 },[challengeId,gameId]);

 const finish=async(score:number,correct:number,questions:number,speciesIds:number[],completed=questions)=>{
  const total=Math.max(0,Math.round(questions));
  const safeCorrect=Math.min(Math.max(0,Math.round(correct)),total);
  const completedRounds=Math.min(roundCount,Math.max(0,Math.round(completed)));
  const durationMs=Math.max(1000,Date.now()-startedAt);
  const base={correct:safeCorrect,total,selectedRounds:roundCount,completedRounds,difficulty};
  const rating=normalizeRunScore(base);
  const run:PokeRun={id:crypto.randomUUID(),gameId,score:Math.max(0,Math.round(score)),correct:safeCorrect,total,selectedRounds:roundCount,completedRounds,normalizedRating:rating,difficulty,generationCap,durationMs,practice,speciesIds:[...new Set(speciesIds)],createdAt:Date.now(),verified:false};
  record(run);add(run);
  if(shouldRecordDex(practice))speciesIds.forEach((id)=>encounter(id,gameId,safeCorrect>0));
  let online=practice?"practice":challengeId?"challenge_pending":"device";
  if(challengeId){
   const response=await submitPokeChallengeAttempt(challengeId,run);
   online=response.ok?(response.resolved?"challenge_resolved":"challenge_waiting"):(response.error??"offline");
  }else if(!practice){
   const response=await apiSubmitPokeScore(run);
   online=response.ok?"account_linked":response.error??"offline";
  }
  setResult({score:run.score,correct:safeCorrect,total,completedRounds,rating,online});
 };

 if(result){
  const accuracy=Math.round(result.correct/Math.max(1,result.total)*100);
  return <div className="poke-result"><div className="poke-result-mark"><Check/></div><p className="poke-kicker">MISSION ARCHIVED</p><h1>{pl(game.title,locale)}</h1><div><span><b>{result.score}</b>{locale==="de"?"ROHPUNKTE":"RAW SCORE"}</span><span><b>{result.correct}/{result.total}</b>{accuracy}% {locale==="de"?"GENAUIGKEIT":"ACCURACY"}</span><span><b>{result.rating}</b>FIELD RATING</span></div><p>{locale==="de"?`Gewählt: ${roundCount} · abgeschlossen: ${result.completedRounds} · Fragen: ${result.total}. Das Rating kombiniert Abschluss und Genauigkeit auf einer spielübergreifend vergleichbaren Skala.`:`Selected: ${roundCount} · completed: ${result.completedRounds} · questions: ${result.total}. Rating combines completion and accuracy on a cross-game comparable scale.`}</p><p className="poke-online-proof">{result.online==="account_linked"?(locale==="de"?"Account-verknüpftes Leaderboard-Ergebnis gespeichert.":"Account-linked leaderboard result saved."):result.online==="challenge_waiting"?(locale==="de"?"Verifizierter Challenge-Versuch versiegelt. Warte auf den Rivalen.":"Verified challenge attempt sealed. Waiting for the rival."):result.online==="challenge_resolved"?(locale==="de"?"Challenge aufgelöst – öffne die Wettbewerbsakte.":"Challenge resolved—open the competition dossier."):(locale==="de"?"Auf diesem Gerät gespeichert; wird nicht als serververifiziert ausgewiesen.":"Saved on this device; not presented as server-verified.")}</p>{challengeId?<Link className="poke-primary" href="/poke-nerds/challenges">{locale==="de"?"Challenge-Akte öffnen":"Open challenge dossier"}</Link>:<button className="poke-primary" onClick={()=>{setResult(null);setStarted(false)}}><RotateCcw/>{locale==="de"?"Neuen Run konfigurieren":"Configure another run"}</button>}<Link className="poke-secondary" href="/poke-nerds">{locale==="de"?"Zur Forschungsbasis":"Research base"}</Link></div>;
 }
 if(challengeError)return <div className="poke-result"><p className="poke-kicker">DOSSIER REJECTED</p><h1>{locale==="de"?"Challenge nicht spielbar":"Challenge unavailable"}</h1><p>{challengeErrorText(challengeError,locale)}</p><Link className="poke-primary" href="/poke-nerds/challenges">{locale==="de"?"Zu den Challenges":"Open challenges"}</Link></div>;
 if(!started)return <div className="poke-game-setup"><Link className="poke-back" href="/poke-nerds"><ArrowLeft/>{locale==="de"?"Missionsverzeichnis":"Mission index"}</Link><div className={`poke-setup-signal signal-${game.signal}`}><span>{game.eyebrow[locale]}</span><i/><b>MODULE {String(Object.keys(components).indexOf(gameId)+1).padStart(2,"0")}</b></div><h1>{pl(game.title,locale)}</h1><p>{pl(game.description,locale)}</p><section className="poke-skill-brief"><div><Sparkles/><span><b>{locale==="de"?"DAS TRAINIERST DU":"SKILLS IN THIS MISSION"}</b><small>{locale==="de"?"Mechaniken und Lernziele bleiben im Run sichtbar.":"Mechanics and learning goals stay visible during the run."}</small></span></div><ul>{gameSkills[gameId][locale].map((skill,index)=><li key={skill}><span>0{index+1}</span>{skill}</li>)}</ul></section><section className="poke-config-desk"><div><label>{locale==="de"?"Schwierigkeit":"Difficulty"}</label><div className="poke-segmented">{(["easy","medium","hard"] as const).map((option)=><button key={option} aria-pressed={difficulty===option} onClick={()=>setDifficulty(option)}>{option}</button>)}</div><small>{difficulty==="easy"?(locale==="de"?"Mehr Ressourcen und größere Toleranzen":"More resources and wider tolerances"):difficulty==="hard"?(locale==="de"?"Knappere Ressourcen und präzisere Entscheidungen":"Tighter resources and more exact decisions"):(locale==="de"?"Ausgewogene Feldbedingungen":"Balanced field conditions")}</small></div><div><label>{locale==="de"?"Missionslänge":"Mission length"}</label><div className="poke-segmented">{([5,10,20] as const).map((count)=><button key={count} aria-pressed={roundCount===count} onClick={()=>setRoundCount(count)}>{count} {locale==="de"?"Runden":"rounds"}</button>)}</div><small>{locale==="de"?"Gewertete Runs vergleichen Abschluss und Genauigkeit, nicht bloß gefarmte Rohpunkte.":"Ranked runs compare completion and accuracy, not farmed raw points."}</small></div><div><label>{locale==="de"?"Pokédex-Umfang":"Pokédex scope"}</label><div className="poke-generation-select">{Array.from({length:9},(_,index)=>index+1).map((cap)=><button key={cap} onClick={()=>setGenerationCap(cap)} aria-pressed={generationCap===cap}><b>{cap===1?"Gen 1":cap===9?"Gen 1–9":`→ Gen ${cap}`}</b><small>{[151,251,386,493,649,721,809,905,1025][cap-1]}</small></button>)}</div>{isMap&&<div className="poke-scope-lock"><b>MULTI-REGION SCHEMATIC ATLAS</b><span>{locale==="de"?"Eine Region pro Einführungsgeneration. Alle Karten und Habitatsektoren sind eigens erstellte Lernfixtures und nicht maßstabsgetreu.":"One region per introduction generation. All maps and habitat sectors are original learning fixtures and not to scale."}</span></div>}</div><label className="poke-practice"><input type="checkbox" checked={practice} onChange={(event)=>setPractice(event.target.checked)}/><span><b>{locale==="de"?"Übungsmodus":"Practice mode"}</b><small>{locale==="de"?"Keine XP, Scores oder Dex-Fortschritte speichern":"Do not save XP, scores or Dex progress"}</small></span></label></section><button className="poke-launch" onClick={()=>{const nonce=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;setRunSeed(`${gameId}:${nonce}`);setStartedAt(Date.now());setStarted(true)}}><Sparkles/>{locale==="de"?"Mission initialisieren":"Initialize mission"}<span>NEW SEED ↻</span></button></div>;
 if(!runSeed)return null;
 return <div className="poke-game-live">{challenge&&<div className="poke-challenge-lock"><b>RANKED DOSSIER</b><span>VS {challenge.opponentName} · SEED {challenge.seed?.slice(0,12)}…</span><small>{locale==="de"?"Konfiguration serverseitig gesperrt":"Server-locked configuration"}</small></div>}<div className="poke-game-live-top"><Link href="/poke-nerds"><ArrowLeft/>{locale==="de"?"Abbrechen":"Abort"}</Link><span>{pl(game.title,locale)}</span><small>{difficulty.toUpperCase()} · GEN 1–{generationCap} · {roundCount}R</small></div><div className="poke-live-skills" aria-label={locale==="de"?"Aktive Missionsfähigkeiten":"Active mission skills"}>{gameSkills[gameId][locale].map((skill,index)=><span key={skill}><b>0{index+1}</b>{skill}</span>)}</div><Component locale={locale} difficulty={difficulty} generationCap={generationCap} roundCount={roundCount} runSeed={runSeed} onFinish={finish}/></div>;
}

function challengeErrorText(code:string,locale:"en"|"de"){
 const copy:Record<string,{en:string;de:string}>={
  challenge_pending:{en:"This dossier must be accepted before its shared seed is revealed.",de:"Diese Akte muss erst angenommen werden, bevor der gemeinsame Seed sichtbar wird."},
  challenge_resolved:{en:"This challenge has already been resolved.",de:"Diese Challenge wurde bereits aufgelöst."},
  challenge_declined:{en:"This challenge was declined.",de:"Diese Challenge wurde abgelehnt."},
  challenge_cancelled:{en:"This challenge was cancelled.",de:"Diese Challenge wurde zurückgezogen."},
  challenge_expired:{en:"This challenge has expired.",de:"Diese Challenge ist abgelaufen."},
  challenge_seed_unavailable:{en:"The shared challenge seed is unavailable.",de:"Der gemeinsame Challenge-Seed ist nicht verfügbar."},
  challenge_attempt_already_submitted:{en:"Your single ranked attempt is already sealed.",de:"Dein einziger gewerteter Versuch ist bereits versiegelt."},
  invalid_challenge:{en:"This dossier does not match the requested mission.",de:"Diese Akte passt nicht zur aufgerufenen Mission."},
  unauthorized:{en:"Sign in with your GeoNerds account to play this challenge.",de:"Melde dich mit deinem GeoNerds-Account an, um diese Challenge zu spielen."},
 };
 return copy[code]?.[locale]??code;
}
