"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {Archive,ArrowUp,BookOpen,Check,ChevronRight,HeartPulse,Layers3,ScanLine,Shield,ShieldAlert,Sparkles,Swords,Zap} from "lucide-react";
import {buildAscensionRoutes,cardBaseDamage,cardEnergyCost,finishResonance,type AscensionRoute,type AscensionRouteKind} from "@/poke/ascension";
import {standardArtworkUrl,type PokeCard} from "@/poke/cards";
import {species} from "@/poke/data";
import {usePokeCards} from "@/poke/store";
import {TYPE_COLORS,localizedType,typeMultiplier} from "@/poke/type-chart";
import type {PokeDifficulty,Species} from "@/poke/types";
import {seededShuffle} from "@/poke/variety";
import {RunHud,type GameProps} from "../gameplay";
import {PokemonSprite} from "../pokemon-sprite";

type Phase="deck"|"route"|"combat"|"reward"|"summary";
type ProtocolId="sleeves"|"medicine"|"overclock"|"scanner"|`amp:${string}`;
type IntentKind="strike"|"fortify"|"disrupt";
interface Intent{kind:IntentKind;damage:number;block:number}
interface CombatState{
 route:AscensionRoute;
 enemyHp:number;
 enemyMaxHp:number;
 enemyBlock:number;
 playerBlock:number;
 energy:number;
 turn:number;
 intent:Intent;
 hand:PokeCard[];
 drawPile:PokeCard[];
 discard:PokeCard[];
 shuffleIndex:number;
 burn:number;
 poison:number;
 charge:number;
 intentReduction:number;
 firstPlayed:boolean;
 resonanceUsed:string[];
 log:string[];
}

export function BinderAscension({locale,difficulty,generationCap,roundCount,runSeed,onFinish}:GameProps){
 const collection=usePokeCards((state)=>state.collection);
 const owned=useMemo(()=>Object.values(collection).map((item)=>item.card).filter((card)=>card.generation<=generationCap).sort((a,b)=>a.speciesId-b.speciesId||finishRank(b.finish)-finishRank(a.finish)),[collection,generationCap]);
 const totalDistinct=new Set(Object.values(collection).map((item)=>item.card.speciesId)).size;
 const scopedDistinct=new Set(owned.map((card)=>card.speciesId)).size;
 const [phase,setPhase]=useState<Phase>("deck");
 const [deck,setDeck]=useState<PokeCard[]>([]);
 const maxHp=difficulty==="easy"?100:difficulty==="hard"?76:88;
 const [playerHp,setPlayerHp]=useState(maxHp);
 const [score,setScore]=useState(0);
 const [wins,setWins]=useState(0);
 const [attempted,setAttempted]=useState(0);
 const [encounter,setEncounter]=useState(0);
 const [protocols,setProtocols]=useState<ProtocolId[]>([]);
 const [opponentIds,setOpponentIds]=useState<number[]>([]);
 const [path,setPath]=useState<{kind:AscensionRouteKind;opponentId:number}[]>([]);
 const [combat,setCombat]=useState<CombatState|null>(null);
 const [damageLedger,setDamageLedger]=useState<Record<number,number>>({});
 const routes=useMemo(()=>deck.length?buildAscensionRoutes(generationCap,encounter,runSeed,deck,difficulty,opponentIds):[],[deck,difficulty,encounter,generationCap,opponentIds,runSeed]);
 const rewardOptions=useMemo(()=>protocolRewardOptions(deck,protocols,`${runSeed}:reward:${wins}`),[deck,protocols,runSeed,wins]);

 const toggleCard=(card:PokeCard)=>{
  setDeck((current)=>{
   const exact=current.some((item)=>item.id===card.id);
   if(exact)return current.filter((item)=>item.id!==card.id);
   const same=current.findIndex((item)=>item.speciesId===card.speciesId);
   if(same>=0){const next=[...current];next[same]=card;return next}
   if(current.length>=10)return current;
   return[...current,card];
  });
 };
 const launch=()=>{if(deck.length<4)return;setPlayerHp(maxHp);setScore(0);setWins(0);setAttempted(0);setEncounter(0);setProtocols([]);setOpponentIds([]);setPath([]);setDamageLedger({});setPhase("route")};
 const chooseRoute=(route:AscensionRoute)=>{
  const enemyMax=enemyMaxHp(route,encounter,difficulty);
  const shuffled=seededShuffle(deck,`${runSeed}:draw:${encounter}:0`);
  const startBlock=countProtocol(protocols,"sleeves")*4;
  setCombat({route,enemyHp:enemyMax,enemyMaxHp:enemyMax,enemyBlock:0,playerBlock:startBlock,energy:3,turn:1,intent:enemyIntent(route,encounter,1,difficulty,runSeed),hand:shuffled.slice(0,3),drawPile:shuffled.slice(3),discard:[],shuffleIndex:0,burn:0,poison:0,charge:0,intentReduction:0,firstPlayed:false,resonanceUsed:[],log:[locale==="de"?`${route.opponent.name.de} erfasst. Absicht sichtbar.`:`${route.opponent.name.en} acquired. Intent exposed.`]});
  setPath((items)=>[...items,{kind:route.kind,opponentId:route.opponent.id}]);
  setOpponentIds((items)=>[...items,route.opponent.id]);
  setAttempted(encounter+1);
  setPhase("combat");
 };
 const finishVictory=(state:CombatState,currentHp=playerHp)=>{
  const nextWins=wins+1;
  const medicine=countProtocol(protocols,"medicine");
  const routeHeal=state.route.kind==="research"?7:0;
  const nextHp=Math.min(maxHp,currentHp+routeHeal+medicine*2);
  const gained=state.route.reward+Math.round(nextHp*2)+Math.max(0,150-(state.turn-1)*22)+countProtocol(protocols,"scanner")*70;
  setPlayerHp(nextHp);setScore((value)=>value+gained);setWins(nextWins);setCombat(null);
  if(nextWins>=roundCount){setPhase("summary");return}
  setEncounter((value)=>value+1);
  setPhase(state.route.kind==="elite"||nextWins%2===0?"reward":"route");
 };
 const failRun=(state:CombatState)=>{
  setCombat(state);setPlayerHp(0);setPhase("summary");
 };
 const playCard=(card:PokeCard)=>{
  if(!combat)return;
  const entry=species(card.speciesId);
  const discount=!combat.firstPlayed&&countProtocol(protocols,"overclock")>0?1:0;
  const cost=Math.max(0,cardEnergyCost(entry)-discount);
  if(cost>combat.energy)return;
  const attackType=entry.types[0];
  const multiplier=typeMultiplier(attackType,combat.route.opponent.types);
  const amplifier=1+protocols.filter((item)=>item===`amp:${attackType}`).length*.16;
  const resonance=combat.resonanceUsed.includes(card.id)?{damage:0,block:0}:finishResonance(card.finish);
  const chargeFactor=1+combat.charge*.2;
  let rawDamage=Math.round(cardBaseDamage(entry)*multiplier*amplifier*chargeFactor)+resonance.damage;
  const rider=applyRider(attackType,entry,combat,playerHp,maxHp);
  rawDamage+=rider.bonusDamage;
  const dealt=Math.max(0,rawDamage-combat.enemyBlock);
  const nextEnemyHp=Math.max(0,combat.enemyHp-dealt);
  const nextEnemyBlock=Math.max(0,combat.enemyBlock-rawDamage);
  const nextHp=Math.min(maxHp,playerHp+rider.heal);
  let drawPile=combat.drawPile,discard=[...combat.discard,card],hand=combat.hand.filter((item)=>item.id!==card.id),shuffleIndex=combat.shuffleIndex;
  if(rider.draw){
   const drawn=drawFromPiles(drawPile,discard,1,`${runSeed}:reshuffle:${encounter}`,shuffleIndex);
   drawPile=drawn.drawPile;discard=drawn.discard;shuffleIndex=drawn.shuffleIndex;hand=[...hand,...drawn.cards];
  }
  const next:CombatState={...combat,enemyHp:nextEnemyHp,enemyBlock:nextEnemyBlock,energy:combat.energy-cost,playerBlock:combat.playerBlock+rider.block+resonance.block,hand,drawPile,discard,shuffleIndex,burn:combat.burn+rider.burn,poison:combat.poison+rider.poison,charge:attackType==="electric"?Math.min(3,combat.charge+1):0,intentReduction:combat.intentReduction+rider.weaken,firstPlayed:true,resonanceUsed:resonance.damage||resonance.block?[...combat.resonanceUsed,card.id]:combat.resonanceUsed,log:[`${entry.name[locale]} · ${localizedType(attackType,locale)} · ${dealt} DMG`,...combat.log].slice(0,5)};
  setPlayerHp(nextHp);setDamageLedger((ledger)=>({...ledger,[entry.id]:(ledger[entry.id]??0)+dealt}));
  if(nextEnemyHp<=0)finishVictory(next,nextHp);else setCombat(next);
 };
 const endTurn=(guard=0)=>{
  if(!combat)return;
  const dot=combat.burn+combat.poison;
  const afterDot=Math.max(0,combat.enemyHp-dot);
  if(afterDot<=0){finishVictory({...combat,enemyHp:0});return}
  const availableBlock=combat.playerBlock+guard;
  const incoming=Math.max(0,combat.intent.damage-combat.intentReduction);
  const received=Math.max(0,incoming-availableBlock);
  const nextHp=Math.max(0,playerHp-received);
  const enemyBlock=combat.enemyBlock+combat.intent.block;
  if(nextHp<=0){failRun({...combat,enemyHp:afterDot,enemyBlock,playerBlock:0,log:[locale==="de"?`Gegnerische Absicht: −${received} KP`:`Enemy intent: −${received} HP`,...combat.log].slice(0,5)});return}
  const pooled=[...combat.discard,...combat.hand];
  const drawn=drawFromPiles(combat.drawPile,pooled,3,`${runSeed}:reshuffle:${encounter}`,combat.shuffleIndex);
  const nextTurn=combat.turn+1;
  const next:CombatState={...combat,enemyHp:afterDot,enemyBlock,playerBlock:0,energy:3,turn:nextTurn,intent:enemyIntent(combat.route,encounter,nextTurn,difficulty,runSeed),hand:drawn.cards,drawPile:drawn.drawPile,discard:drawn.discard,shuffleIndex:drawn.shuffleIndex,burn:Math.max(0,combat.burn-1),firstPlayed:false,intentReduction:0,log:[locale==="de"?`Absicht aufgelöst: −${received} KP`:`Intent resolved: −${received} HP`,...combat.log].slice(0,5)};
  setPlayerHp(nextHp);setCombat(next);
 };
 const chooseProtocol=(id:ProtocolId)=>{setProtocols((items)=>[...items,id]);if(id==="medicine")setPlayerHp((value)=>Math.min(maxHp,value+12));setPhase("route")};
 const archive=()=>onFinish(score,wins,Math.max(1,attempted),[...new Set([...deck.map((card)=>card.speciesId),...opponentIds])],wins);

 if(phase==="deck"){
  if(scopedDistinct<4)return <BinderEmpty locale={locale} generationCap={generationCap} scopedDistinct={scopedDistinct} totalDistinct={totalDistinct}/>;
  return <section className="poke-ascension-deck"><header><div><p className="poke-kicker">BINDER DECK CLEARANCE</p><h2>{locale==="de"?"Stelle dein Aufstiegsdeck zusammen":"Assemble your ascension deck"}</h2><p>{locale==="de"?`Nur Karten bis Generation ${generationCap} sind für diesen Run freigegeben. Finishes bleiben kosmetisch – jede besondere Karte resoniert einmal pro Kampf minimal.`:`Only cards through Generation ${generationCap} are cleared for this run. Finishes stay cosmetic—each special card resonates once per combat.`}</p></div><div className="poke-deck-meter"><b>{deck.length}<small>/10</small></b><span>{locale==="de"?"GEWÄHLTE SPEZIES":"SELECTED SPECIES"}</span><i><em style={{width:`${deck.length/10*100}%`}}/></i></div></header>
   <div className="poke-ascension-binder">{owned.map((card)=>{const selected=deck.some((item)=>item.id===card.id),sibling=deck.some((item)=>item.speciesId===card.speciesId&&!selected);return <button key={`${card.speciesId}:${card.finish}`} aria-pressed={selected} onClick={()=>toggleCard(card)} className={selected?"is-selected":sibling?"is-variant":""}><AscensionCard card={card} locale={locale}/>{selected&&<span className="poke-card-lock"><Check/> DECK</span>}{sibling&&<span className="poke-card-lock">{locale==="de"?"VARIANTE":"VARIANT"}</span>}</button>})}</div>
   <footer className="poke-deck-launch"><span><b>{deck.length<4?(locale==="de"?`Noch ${4-deck.length} wählen`:`Choose ${4-deck.length} more`):(locale==="de"?"Deck bereit":"Deck ready")}</b><small>{locale==="de"?"4–10 verschiedene Spezies · Karten werden nie verbraucht":"4–10 distinct species · cards are never consumed"}</small></span><button className="poke-primary" disabled={deck.length<4} onClick={launch}><ArrowUp/>{locale==="de"?"Turm betreten":"Enter tower"}</button></footer>
  </section>;
 }
 if(phase==="route")return <div className="poke-ascension-route"><RunHud score={score} round={encounter+1} total={roundCount} resource={playerHp} label="HP"/><header><div><p className="poke-kicker">ASCENSION LAYER {String(encounter+1).padStart(2,"0")}</p><h2>{locale==="de"?"Wähle den nächsten Archivpfad":"Choose the next archive path"}</h2></div><ProtocolRail protocols={protocols} locale={locale}/></header><div className="poke-tower-rail" aria-hidden><i/><b>{encounter+1}</b><span/><em>{roundCount}</em></div><div className="poke-route-branches">{routes.map((route)=><RouteCard key={route.kind} route={route} locale={locale} encounter={encounter} difficulty={difficulty} runSeed={runSeed} onChoose={()=>chooseRoute(route)}/>)}</div></div>;
 if(phase==="reward")return <div className="poke-protocol-reward"><RunHud score={score} round={encounter+1} total={roundCount} resource={playerHp} label="HP"/><header><Sparkles/><p className="poke-kicker">PROTOCOL UPLINK</p><h2>{locale==="de"?"Ein Upgrade bleibt für diesen Run aktiv":"One upgrade remains active for this run"}</h2><p>{locale==="de"?"Wähle genau ein von drei gesetzten Forschungsprotokollen.":"Choose exactly one of three seeded research protocols."}</p></header><div>{rewardOptions.map((id)=><button key={id} onClick={()=>chooseProtocol(id)}><ProtocolIcon id={id}/><span><small>{protocolKicker(id,locale)}</small><b>{protocolName(id,locale)}</b><em>{protocolDescription(id,locale)}</em></span><ChevronRight/></button>)}</div><ProtocolRail protocols={protocols} locale={locale}/></div>;
 if(phase==="summary"){
  const strongest=Object.entries(damageLedger).sort((a,b)=>b[1]-a[1])[0];
  return <section className={`poke-ascension-summary ${wins===roundCount?"is-cleared":"is-defeated"}`}><div className="poke-summary-sigil">{wins===roundCount?<ArrowUp/>:<ShieldAlert/>}</div><p className="poke-kicker">{wins===roundCount?"TOWER CLEARANCE GRANTED":"ASCENSION INTERRUPTED"}</p><h2>{wins===roundCount?(locale==="de"?"Archivspitze erreicht":"Archive summit reached"):(locale==="de"?"Der Binder bleibt intakt":"The binder remains intact")}</h2><p>{locale==="de"?"Keine Karte wurde verbraucht. Der gesamte Pfad kann jetzt im Feldlog archiviert werden.":"No card was consumed. The entire path can now be archived in the field log."}</p><div className="poke-summary-telemetry"><span><b>{wins}/{roundCount}</b>{locale==="de"?"SIEGE":"WINS"}</span><span><b>{path.filter((item)=>item.kind==="elite"&&path.indexOf(item)<wins).length}</b>ELITES</span><span><b>{score}</b>SCORE</span><span><b>{playerHp}</b>HP</span></div><div className="poke-summary-path">{path.map((item,index)=><span key={`${item.opponentId}-${index}`} className={index<wins?"is-won":"is-lost"}><i>{index+1}</i><PokemonSprite entry={species(item.opponentId)} size={58}/><small>{routeName(item.kind,locale)}</small></span>)}</div>{strongest&&<div className="poke-strongest-card"><Zap/><span><small>{locale==="de"?"STÄRKSTE KARTE":"STRONGEST CARD"}</small><b>{species(Number(strongest[0])).name[locale]}</b><em>{strongest[1]} {locale==="de"?"Gesamtschaden":"total damage"}</em></span></div>}<button className="poke-primary" onClick={archive}><Archive/>{locale==="de"?"Run archivieren":"Archive run"}</button></section>;
 }
 if(!combat)return null;
 const intentDamage=Math.max(0,combat.intent.damage-combat.intentReduction);
 return <div className="poke-ascension-combat"><RunHud score={score} round={encounter+1} total={roundCount} resource={playerHp} label="HP"/><div className="poke-combat-meta"><ProtocolRail protocols={protocols} locale={locale}/><span>TURN <b>{combat.turn}</b></span></div><section className="poke-archive-battle"><div className="poke-player-console"><header><span>FIELD OPERATOR</span><b>{playerHp}/{maxHp} HP</b></header><div className="poke-health-track"><i style={{width:`${playerHp/maxHp*100}%`}}/></div><div><span><Shield/> {combat.playerBlock} BLOCK</span><span><Zap/> {combat.energy}/3 ENERGY</span><span>{combat.charge}× CHARGE</span></div></div><div className="poke-enemy-stage"><div className="poke-enemy-intent"><IntentIcon kind={combat.intent.kind}/><span><small>{locale==="de"?"NÄCHSTE ABSICHT":"NEXT INTENT"}</small><b>{intentName(combat.intent.kind,locale)}</b><em>{intentDamage} DMG{combat.intent.block?` · +${combat.intent.block} BLOCK`:""}</em></span></div><PokemonSprite entry={combat.route.opponent} size={210}/><h2>{combat.route.opponent.name[locale]}</h2><div className="poke-enemy-hp"><i style={{width:`${combat.enemyHp/combat.enemyMaxHp*100}%`}}/><b>{combat.enemyHp}/{combat.enemyMaxHp}</b></div><p>{combat.route.opponent.types.map((type)=>localizedType(type,locale)).join(" · ")} · {routeName(combat.route.kind,locale)}</p></div><aside className="poke-battle-log"><span>BATTLE LOG</span>{combat.log.map((item,index)=><p key={`${item}-${index}`}>{item}</p>)}</aside></section><section className="poke-hand-console"><header><div><p className="poke-kicker">ACTIVE BINDER HAND</p><h3>{locale==="de"?"Spiele Karten oder sichere den Zug":"Play cards or secure the turn"}</h3></div><div><span>{combat.drawPile.length} DRAW</span><span>{combat.discard.length} DISCARD</span></div></header><div className="poke-ascension-hand">{combat.hand.map((card)=>{const entry=species(card.speciesId),discount=!combat.firstPlayed&&countProtocol(protocols,"overclock")>0?1:0,cost=Math.max(0,cardEnergyCost(entry)-discount),disabled=cost>combat.energy;return <button key={card.id} disabled={disabled} onClick={()=>playCard(card)} aria-label={`${entry.name[locale]} · ${cost} energy · ${locale==="de"?"spielen":"play"}`}><AscensionCard card={card} locale={locale} compact/><span className="poke-hand-cost"><Zap/>{cost}</span>{disabled&&<span className="poke-card-disabled">{locale==="de"?"ZU WENIG ENERGIE":"LOW ENERGY"}</span>}</button>})}</div><footer><button onClick={()=>endTurn(5)}><Shield/> <span><b>{locale==="de"?"Sichern & Zug beenden":"Guard & end turn"}</b><small>+5 BLOCK · {intentDamage} {locale==="de"?"angekündigter Schaden":"telegraphed damage"}</small></span><ChevronRight/></button></footer></section></div>;
}

function BinderEmpty({locale,generationCap,scopedDistinct,totalDistinct}:{locale:"en"|"de";generationCap:number;scopedDistinct:number;totalDistinct:number}){
 const capBlocked=totalDistinct>=4&&scopedDistinct<4;
 return <section className="poke-binder-empty"><div className="poke-empty-archive"><Layers3/><i/><span>{scopedDistinct}/4</span></div><p className="poke-kicker">BINDER DECK CLEARANCE</p><h2>{capBlocked?(locale==="de"?"Zu wenige Karten im gewählten Generationenbereich":"Not enough cards in the selected generation scope"):(locale==="de"?"Dein Binder braucht vier Spezies":"Your binder needs four species")}</h2><p>{capBlocked?(locale==="de"?`Für Gen 1–${generationCap} sind ${scopedDistinct} verschiedene Spezies verfügbar. Wähle im Missionssetup einen größeren Umfang oder erweitere deinen Binder.`:`Gen 1–${generationCap} currently contains ${scopedDistinct} distinct species. Choose a wider scope in mission setup or expand your binder.`):(locale==="de"?"Öffne Forschungssets und archiviere mindestens vier verschiedene Pokémon. Karten werden für Binder Ascension weder ausgegeben noch verbraucht.":"Open research sets and archive at least four different Pokémon. Binder Ascension never spends or consumes cards.")}</p><Link className="poke-primary" href="/poke-nerds/cards"><BookOpen/>{locale==="de"?"Zum Kartenarchiv":"Open card archive"}</Link></section>;
}

function RouteCard({route,locale,encounter,difficulty,runSeed,onChoose}:{route:AscensionRoute;locale:"en"|"de";encounter:number;difficulty:PokeDifficulty;runSeed:string;onChoose:()=>void}){
 const intent=enemyIntent(route,encounter,1,difficulty,runSeed),hp=enemyMaxHp(route,encounter,difficulty);
 return <button className={`poke-route-card is-${route.kind}`} onClick={onChoose} aria-label={`${routeName(route.kind,locale)} · ${route.opponent.name[locale]}`}><header><span>{routeIcon(route.kind)} {routeName(route.kind,locale).toUpperCase()}</span><b>{Array.from({length:5},(_,index)=><i className={index<route.threat?"is-on":""} key={index}/>)}</b></header><div className="poke-route-opponent"><PokemonSprite entry={route.opponent} size={150}/><span><small>#{String(route.opponent.id).padStart(4,"0")}</small><strong>{route.opponent.name[locale]}</strong><em>{route.opponent.types.map((type)=>localizedType(type,locale)).join(" · ")}</em></span></div><dl><div><dt>HP</dt><dd>{hp}</dd></div><div><dt>{locale==="de"?"ERSTE ABSICHT":"FIRST INTENT"}</dt><dd>{intent.damage} DMG</dd></div><div><dt>{locale==="de"?"BELOHNUNG":"REWARD"}</dt><dd>+{route.reward}</dd></div></dl><p>{routeDescription(route.kind,locale)}</p><footer>{locale==="de"?"Pfad verriegeln":"Lock route"} <ChevronRight/></footer></button>;
}

function AscensionCard({card,locale,compact=false}:{card:PokeCard;locale:"en"|"de";compact?:boolean}){
 const entry=species(card.speciesId),[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[card.artworkUrl,card.speciesId]);
 const src=failed?standardArtworkUrl(entry):card.artworkUrl,type=entry.types[0],power=cardBaseDamage(entry),cost=cardEnergyCost(entry);
 return <article className={`poke-ascension-card rarity-${card.rarity} finish-${card.finish} ${compact?"is-compact":""}`} style={{"--card-type":TYPE_COLORS[type]} as React.CSSProperties}><header><span>#{String(entry.id).padStart(4,"0")}</span><b>{card.finish.replaceAll("-"," ").toUpperCase()}</b></header><div className="poke-ascension-art"><img src={src} onError={()=>setFailed(true)} width={compact?122:145} height={compact?122:145} alt={entry.name[locale]} draggable={false}/><i/></div><h3>{entry.name[locale]}</h3><div className="poke-card-operation"><span style={{background:TYPE_COLORS[type]}}>{localizedType(type,locale)}</span><b>{power} PWR</b><b><Zap/>{cost}</b></div><footer>{riderText(type,locale)}<small>{card.finish==="standard"?(locale==="de"?"Keine Resonanz":"No resonance"):`+${finishResonance(card.finish).damage} DMG · +${finishResonance(card.finish).block} BLK`}</small></footer></article>;
}

function ProtocolRail({protocols,locale}:{protocols:ProtocolId[];locale:"en"|"de"}){
 if(!protocols.length)return <div className="poke-protocol-rail is-empty"><ScanLine/><span>{locale==="de"?"NOCH KEINE PROTOKOLLE":"NO PROTOCOLS YET"}</span></div>;
 return <div className="poke-protocol-rail">{protocols.map((id,index)=><span key={`${id}-${index}`} title={protocolDescription(id,locale)}><ProtocolIcon id={id}/>{protocolName(id,locale)}</span>)}</div>;
}
function ProtocolIcon({id}:{id:ProtocolId}){if(id==="sleeves")return <Shield/>;if(id==="medicine")return <HeartPulse/>;if(id==="overclock")return <Zap/>;if(id==="scanner")return <ScanLine/>;return <Sparkles/>}
function IntentIcon({kind}:{kind:IntentKind}){return kind==="strike"?<Swords/>:kind==="fortify"?<Shield/>:<Zap/>}

function enemyMaxHp(route:AscensionRoute,encounter:number,difficulty:PokeDifficulty){
 const routeFactor=route.kind==="safe"?.82:route.kind==="elite"?1.24:1;
 const difficultyFactor=difficulty==="easy"?.9:difficulty==="hard"?1.1:1;
 return Math.max(32,Math.round((35+route.opponent.stats.hp*.48+encounter*4)*routeFactor*difficultyFactor));
}
function enemyIntent(route:AscensionRoute,encounter:number,turn:number,difficulty:PokeDifficulty,runSeed:string):Intent{
 const offense=Math.max(route.opponent.stats.attack,route.opponent.stats.specialAttack);
 const routeFactor=route.kind==="safe"?.82:route.kind==="elite"?1.22:1;
 const difficultyFactor=difficulty==="easy"?.85:difficulty==="hard"?1.12:1;
 const base=Math.max(3,Math.round((4+offense/24+encounter*.32)*routeFactor*difficultyFactor));
 const order=seededShuffle<IntentKind>(["strike","fortify","disrupt"],`${runSeed}:intent:${route.opponent.id}:${encounter}`);
 const kind=order[(turn-1)%order.length];
 return kind==="fortify"?{kind,damage:Math.max(2,Math.round(base*.55)),block:5+Math.round(encounter*.4)}:kind==="disrupt"?{kind,damage:Math.max(2,Math.round(base*.78)),block:0}:{kind,damage:base,block:0};
}
function drawFromPiles(drawPile:PokeCard[],discard:PokeCard[],count:number,seed:string,shuffleIndex:number){
 let draw=[...drawPile],bin=[...discard],index=shuffleIndex;const cards:PokeCard[]=[];
 while(cards.length<count&&(draw.length||bin.length)){if(!draw.length){draw=seededShuffle(bin,`${seed}:${index++}`);bin=[]}const card=draw.shift();if(card)cards.push(card)}
 return{cards,drawPile:draw,discard:bin,shuffleIndex:index};
}
function applyRider(type:string,entry:Species,combat:CombatState,playerHp:number,maxHp:number){
 const result={block:0,heal:0,burn:0,poison:0,weaken:0,draw:0,bonusDamage:0};
 if(type==="water")result.block=4;
 else if(type==="grass")result.heal=Math.min(3,maxHp-playerHp);
 else if(type==="fire")result.burn=3;
 else if(type==="electric")result.bonusDamage=combat.charge;
 else if(type==="psychic"||type==="bug")result.draw=1;
 else if(type==="steel"||type==="rock")result.block=5;
 else if(type==="fairy"){result.heal=Math.min(2,maxHp-playerHp);result.block=2}
 else if(type==="flying"||type==="ghost")result.block=3;
 else if(type==="poison")result.poison=2;
 else if(type==="ground")result.bonusDamage=combat.enemyBlock;
 else if(type==="ice"||type==="dark")result.weaken=2;
 else if(type==="dragon"||type==="fighting")result.bonusDamage=3;
 else if(type==="normal")result.bonusDamage=entry.stats.speed>=80?2:1;
 return result;
}
function protocolRewardOptions(deck:PokeCard[],protocols:ProtocolId[],seed:string):ProtocolId[]{
 const types=[...new Set(deck.map((card)=>species(card.speciesId).types[0]))].map((type)=>`amp:${type}` as ProtocolId);
 const pool:ProtocolId[]=["sleeves","medicine","scanner",...(!protocols.includes("overclock")?["overclock" as const]:[]),...types];
 return seededShuffle(pool,seed).slice(0,3);
}
function countProtocol(protocols:ProtocolId[],id:ProtocolId){return protocols.filter((item)=>item===id).length}
function finishRank(finish:PokeCard["finish"]){return["standard","foil","reverse-holo","holo","special-art","gold"].indexOf(finish)}
function routeIcon(kind:AscensionRouteKind){return kind==="safe"?"◇":kind==="research"?"⌁":"◆"}
function routeName(kind:AscensionRouteKind,locale:"en"|"de"){return kind==="safe"?(locale==="de"?"Sicherer Pfad":"Safe route"):kind==="research"?(locale==="de"?"Forschungspfad":"Research route"):(locale==="de"?"Elitepfad":"Elite route")}
function routeDescription(kind:AscensionRouteKind,locale:"en"|"de"){return kind==="safe"?(locale==="de"?"Niedrigere Gefahr · Standardbelohnung":"Lower threat · standard reward"):kind==="research"?(locale==="de"?"Ausgewogen · nach Sieg +7 KP":"Balanced · restore 7 HP after victory"):(locale==="de"?"Hohe Gefahr · starke Punkte + sofortiges Protokoll":"High threat · strong score + immediate protocol")}
function intentName(kind:IntentKind,locale:"en"|"de"){return kind==="strike"?(locale==="de"?"Direkter Angriff":"Direct strike"):kind==="fortify"?(locale==="de"?"Panzerschlag":"Fortify strike"):(locale==="de"?"Störimpuls":"Disrupt pulse")}
function protocolKicker(id:ProtocolId,locale:"en"|"de"){return id.startsWith("amp:")?`${localizedType(id.slice(4),locale).toUpperCase()} // TYPE`:"ARCHIVE // PASSIVE"}
function protocolName(id:ProtocolId,locale:"en"|"de"){if(id==="sleeves")return locale==="de"?"Verstärkte Hüllen":"Reinforced sleeves";if(id==="medicine")return locale==="de"?"Feldmedizin":"Field medicine";if(id==="overclock")return"Overclock";if(id==="scanner")return locale==="de"?"Gefahrenscanner":"Threat scanner";return`${localizedType(id.slice(4),locale)} ${locale==="de"?"Verstärker":"amplifier"}`}
function protocolDescription(id:ProtocolId,locale:"en"|"de"){if(id==="sleeves")return locale==="de"?"+4 Block zu Beginn jedes Kampfes.":"Start each combat with +4 block.";if(id==="medicine")return locale==="de"?"Jetzt +12 KP; nach jedem Sieg +2 KP.":"Heal 12 now; restore 2 HP after each win.";if(id==="overclock")return locale==="de"?"Die erste Karte jedes Kampfes kostet 1 Energie weniger.":"The first card each combat costs 1 less energy.";if(id==="scanner")return locale==="de"?"+70 Punkte nach jedem Sieg.":"Gain +70 score after every win.";return locale==="de"?`Karten dieses Typs verursachen +16 % Schaden.`:`Cards of this type deal +16% damage.`}
function riderText(type:string,locale:"en"|"de"){
 const en:Record<string,string>={water:"+4 block",grass:"heal 3",fire:"3 burn",electric:"build charge",psychic:"draw 1",bug:"draw 1",steel:"+5 block",rock:"+5 block",fairy:"heal 2 · +2 block",flying:"+3 block",ghost:"+3 block",poison:"+2 poison",ground:"break armor",ice:"weaken intent −2",dark:"weaken intent −2",dragon:"+3 damage",fighting:"+3 damage",normal:"speed strike"};
 const de:Record<string,string>={water:"+4 Block",grass:"heilt 3",fire:"3 Brand",electric:"baut Ladung",psychic:"zieht 1",bug:"zieht 1",steel:"+5 Block",rock:"+5 Block",fairy:"heilt 2 · +2 Block",flying:"+3 Block",ghost:"+3 Block",poison:"+2 Gift",ground:"bricht Panzerung",ice:"schwächt Absicht −2",dark:"schwächt Absicht −2",dragon:"+3 Schaden",fighting:"+3 Schaden",normal:"Tempoangriff"};
 return(locale==="de"?de:en)[type]??(locale==="de"?"Standardangriff":"standard strike");
}
