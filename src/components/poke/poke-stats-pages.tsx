"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {Award,BarChart3,Check,CloudOff,Flame,LockKeyhole,RotateCcw,ShieldCheck,Trophy} from "lucide-react";
import {useT} from "@/i18n/I18nProvider";
import {AccountPanel} from "@/components/account/account-panel";
import {POKE_BADGES,POKE_COMPETENCIES,localCardBadgeValue,pokeDexStage,trainerLevel,type PokeBadgeCategory,type PokeBadgeDefinition} from "@/poke/progression";
import {POKE_GAMES,getPokeGame} from "@/poke/registry";
import {usePokeCards,usePokeDex,usePokeProgression,usePokeScores} from "@/poke/store";
import {pl} from "@/poke/types";
import {compareRankedRuns} from "@/poke/competition";
import {getPokeLeaderboard,getPokeProfile,updatePokeProfile,type PokeLeaderboardRow,type PokeOnlineProfile} from "@/poke/online";
import {useAuth} from "@/store/auth";
import {species} from "@/poke/data";
import {PokemonSprite} from "./pokemon-sprite";
import {STANDARD_TYPES} from "@/poke/type-chart";

export function PokeLeaderboard(){
 const{locale}=useT(),user=useAuth((state)=>state.user),loaded=useAuth((state)=>state.loaded);
 const localRuns=usePokeScores((state)=>state.runs);
 const [board,setBoard]=useState<"league"|"overall"|"game"|"local">("league"),[game,setGame]=useState(POKE_GAMES[0].id),[difficulty,setDifficulty]=useState(""),[rounds,setRounds]=useState("");
 const [data,setData]=useState<{rows:PokeLeaderboardRow[];season?:{title:string;endsAt:string};configured:boolean;currentUser?:PokeLeaderboardRow|null}|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{if(board==="local"){setLoading(false);return}setLoading(true);const query=new URLSearchParams({board});if(board==="game")query.set("game",game);if(difficulty)query.set("difficulty",difficulty);if(rounds)query.set("rounds",rounds);getPokeLeaderboard(query).then((result)=>{setData(result);setLoading(false)})},[board,game,difficulty,rounds]);
 const local=useMemo(()=>[...localRuns].sort((a,b)=>compareRankedRuns({...a,questions:a.total},{...b,questions:b.total})).slice(0,50),[localRuns]);
 const remaining=data?.season?Math.max(0,new Date(data.season.endsAt).getTime()-Date.now()):0,days=Math.ceil(remaining/86400000);
 return <StatsShell title={locale==="de"?"Trainer League Operations":"Trainer League Operations"} icon={<Trophy/>} kicker="SEASONAL COMPETITION">
  <section className="poke-season-command"><div><span>{data?.season?.title??"FIELD LEAGUE"}</span><b>{days||"—"}</b><small>{locale==="de"?"Tage bis Saisonende":"days until season end"}</small></div><div className="poke-expedition-timeline"><i/><i/><i className="is-live"/><i/></div>{data?.currentUser?<aside><span>{data.currentUser.tier} // #{data.currentUser.rank}</span><b>{data.currentUser.rating}</b><small>{(data.currentUser.placements??0)<5?`${data.currentUser.placements??0}/5 ${locale==="de"?"Platzierungen":"placements"}`:`${data.currentUser.wins}W · ${data.currentUser.losses}L · ${data.currentUser.draws}D`}</small></aside>:<aside><span>UNPLACED</span><b>1000</b><small>{locale==="de"?"Einloggen, um die Ligaakte zu führen":"Sign in to maintain a league file"}</small></aside>}</section>
  <div className="poke-rank-tabs">{(["league","overall","game","local"] as const).map((tab)=><button key={tab} aria-pressed={board===tab} onClick={()=>setBoard(tab)}>{tab==="overall"?(locale==="de"?"Gesamtmeisterschaft":"Overall mastery"):tab==="game"?(locale==="de"?"Nach Spiel":"By game"):tab==="local"?(locale==="de"?"Dieses Gerät":"Local device"):locale==="de"?"Liga":"League"}</button>)}</div>
  {board!=="league"&&board!=="local"&&<div className="poke-rank-filters">{board==="game"&&<select value={game} onChange={(event)=>setGame(event.target.value as typeof game)}>{POKE_GAMES.map((item)=><option value={item.id} key={item.id}>{pl(item.title,locale)}</option>)}</select>}<select value={difficulty} onChange={(event)=>setDifficulty(event.target.value)}><option value="">{locale==="de"?"Alle Schwierigkeiten":"All difficulties"}</option><option>easy</option><option>medium</option><option>hard</option></select><select value={rounds} onChange={(event)=>setRounds(event.target.value)}><option value="">{locale==="de"?"Alle Längen":"All lengths"}</option><option value="5">5</option><option value="10">10</option><option value="20">20</option></select></div>}
  {!loaded||loading?<div className="poke-loading-inline">SYNCING LEAGUE LEDGER…</div>:board==="local"?<LocalRanks runs={local} locale={locale}/>:!data?.configured?<OfflineFallback runs={local} locale={locale}/>:<><div className="poke-rank-list poke-rank-list-online">{data.rows.length?data.rows.map((row)=><Link href={`/poke-nerds/u/${encodeURIComponent(row.name)}`} key={`${row.user_id}-${row.rank}`} className={row.user_id===user?.id?"is-current":""}><b>{String(row.rank).padStart(2,"0")}</b><span>{row.name}<small>{row.tier.toUpperCase()} · {row.verified?"VERIFIED DUEL":"ACCOUNT-LINKED"}</small></span><em>{row.wins!==undefined?`${row.wins}W ${row.losses}L ${row.draws}D`:`${row.correct??0}/${row.total??0}`}</em><strong>{row.rating}</strong></Link>):<Empty locale={locale}/>}</div>{!user&&<div className="poke-auth-callout"><LockKeyhole/><span><b>{locale==="de"?"Deine Ligaakte wartet":"Your league file is waiting"}</b><small>{locale==="de"?"Bestehenden GeoNerds-Account verwenden.":"Use your existing GeoNerds account."}</small></span><AccountPanel/></div>}</>}
 </StatsShell>;
}

function LocalRanks({runs,locale}:{runs:ReturnType<typeof usePokeScores.getState>["runs"];locale:"en"|"de"}){
 return <div className="poke-rank-list">{runs.length?runs.map((run,index)=><div key={run.id}><b>{String(index+1).padStart(2,"0")}</b><span>{pl(getPokeGame(run.gameId).title,locale)}<small>{run.legacy?"LEGACY · DEVICE ONLY":`${run.correct}/${run.total} · ${run.completedRounds}/${run.selectedRounds}R`}</small></span><strong>{run.normalizedRating}</strong></div>):<Empty locale={locale}/>}</div>;
}
function OfflineFallback({runs,locale}:{runs:ReturnType<typeof usePokeScores.getState>["runs"];locale:"en"|"de"}){return <div><div className="poke-offline-ribbon"><CloudOff/>{locale==="de"?"Ligadienst nicht erreichbar – lokale, unverifizierte Rangfolge wird gezeigt.":"League service unavailable—showing local, unverified ranks."}</div><LocalRanks runs={runs} locale={locale}/></div>}

export function PokeBadges(){
 const{locale}=useT(),progress=usePokeProgression(),runs=usePokeScores((state)=>state.runs),cards=usePokeCards(),[online,setOnline]=useState<PokeOnlineProfile|null>(null),[category,setCategory]=useState<PokeBadgeCategory|"all">("all");
 useEffect(()=>{getPokeProfile().then((result)=>setOnline(result.profile))},[]);
 const earnedIds=new Set(online?.awards.map((item)=>item.badge_id)??[]);
 const localValue=(badge:PokeBadgeDefinition)=>{
  if(badge.metric==="runs")return progress.totalRuns;
  if(badge.metric==="correct")return progress.correct;
  if(badge.metric==="xp")return progress.xp;
  if(badge.metric==="games")return new Set(runs.map((run)=>run.gameId)).size;
  if(badge.metric==="cards"){
   return localCardBadgeValue(badge.id,cards.opened,Object.values(cards.collection).map((item)=>item.card.finish));
  }
  return 0;
 };
 const value=(badge:PokeBadgeDefinition)=>badge.verified?(earnedIds.has(badge.id)?badge.goal:0):localValue(badge);
 const visible=POKE_BADGES.filter((badge)=>category==="all"||badge.category===category),near=[...POKE_BADGES].filter((badge)=>value(badge)<badge.goal&&value(badge)>0).sort((a,b)=>value(b)/b.goal-value(a)/a.goal).slice(0,3);
 return <StatsShell title={locale==="de"?"Feldabzeichen":"Field badges"} icon={<Award/>} kicker="SPECIMEN MEDAL CASE">
  {near.length>0&&<section className="poke-near-badges"><p className="poke-kicker">{locale==="de"?"FAST FREIGESCHALTET":"NEARLY EARNED"}</p>{near.map((badge)=><div key={badge.id}><span>{badge.name[locale]}</span><i><b style={{width:`${Math.min(100,value(badge)/badge.goal*100)}%`}}/></i><strong>{value(badge)}/{badge.goal}</strong></div>)}</section>}
  <div className="poke-badge-filters"><button aria-pressed={category==="all"} onClick={()=>setCategory("all")}>{locale==="de"?"Alle":"All"}</button>{([...new Set(POKE_BADGES.map((badge)=>badge.category))] as PokeBadgeCategory[]).map((item)=><button aria-pressed={category===item} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div>
  <div className="poke-badge-cabinet">{visible.map((badge)=>{const current=value(badge),earned=current>=badge.goal;return <article className={`${earned?"is-earned":""} tier-${badge.tier}`} key={badge.id}><div className="poke-medal"><Award/><i style={{"--progress":`${Math.min(100,current/badge.goal*100)*3.6}deg`} as React.CSSProperties}/></div><p>{badge.name[locale]}</p><small>{badge.description[locale]}</small><span>{earned?<><Check/> {locale==="de"?"Freigeschaltet":"Unlocked"}</>:`${current} / ${badge.goal}`}</span><em>{badge.verified?(locale==="de"?"ONLINE-NACHWEIS":"ONLINE EVIDENCE"):(locale==="de"?"LOKAL":"LOCAL")}{badge.seasonal?" · SEASON":""}</em></article>})}</div>
  <p className="poke-proof-note"><ShieldCheck/>{locale==="de"?"Lokale Abzeichen stammen aus Gerätefortschritt. Social-, Liga- und Saisonabzeichen werden nur aus Account- und Challenge-Daten vergeben.":"Local medals use device progress. Social, league and seasonal medals are awarded only from account and challenge evidence."}</p>
 </StatsShell>;
}

export function PokeProfile(){
 const{locale}=useT(),user=useAuth((state)=>state.user),loaded=useAuth((state)=>state.loaded),progress=usePokeProgression(),records=usePokeDex((state)=>state.records);
 const [online,setOnline]=useState<PokeOnlineProfile|null>(null),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{if(user)getPokeProfile().then((result)=>setOnline(result.profile))},[user]);
 const discovered=Object.values(records).filter((record)=>pokeDexStage(record.correct,record.games.length)!=="sealed").map((record)=>record.id);
 const avatars=[...new Set([25,...discovered])].slice(0,30);
 const [avatar,setAvatar]=useState(25),[favorite,setFavorite]=useState("normal"),[bio,setBio]=useState(""),[visibility,setVisibility]=useState<"public"|"private">("public"),[featured,setFeatured]=useState<string[]>([]);
 useEffect(()=>{if(online){setAvatar(online.avatarSpeciesId);setFavorite(online.favoriteType);setBio(online.bio);setVisibility(online.visibility);setFeatured(online.featuredBadgeIds)}},[online]);
 const save=async()=>{setSaving(true);const result=await updatePokeProfile({avatarSpeciesId:avatar,favoriteType:favorite,bio,visibility,featuredBadgeIds:featured});setSaving(false);setMessage(result.ok?(locale==="de"?"Trainerpass versiegelt.":"Trainer passport sealed."):(result.error??"error"));if(result.profile)setOnline(result.profile)};
 if(!loaded)return null;
 if(!user)return <StatsShell title={locale==="de"?"Trainer-Feldakte":"Trainer field file"} icon={<BarChart3/>}><div className="poke-profile-auth"><PokemonSprite entry={species(25)} size={180}/><h2>{locale==="de"?"Ein Account, drei Nerd-Welten":"One account, three Nerd worlds"}</h2><p>{locale==="de"?"Nutze deinen vorhandenen GeoNerds-Account für Liga, Challenges und einen öffentlichen Trainerpass. Lokales Spielen bleibt ohne Login verfügbar.":"Use your existing GeoNerds account for league, challenges and a public trainer passport. Local play remains available without sign-in."}</p><AccountPanel/></div></StatsShell>;
 const rating=online?.rating;
 return <StatsShell title={locale==="de"?"Trainer-Feldakte":"Trainer field file"} icon={<BarChart3/>} kicker="RESEARCH PASSPORT">
  <div className="poke-passport"><section className="poke-passport-identity"><div><PokemonSprite entry={species(avatar)} size={180}/><span>#{String(avatar).padStart(4,"0")}</span></div><h2>{user.name}</h2><p>{bio|| (locale==="de"?"Noch keine Feldnotiz.":"No field note yet.")}</p><Link href={`/poke-nerds/u/${encodeURIComponent(user.name)}`}>{locale==="de"?"Öffentlichen Trainerpass öffnen":"Open public trainer passport"} →</Link></section><section className="poke-rating-clearance"><span>{locale==="de"?"SAISONRATING":"SEASON RATING"}</span><b>{rating?.rating??1000}</b><strong>{rating?.tier??"bronze"}</strong><small>{rating?.placements??0}/5 {locale==="de"?"Platzierungen":"placements"} · {rating?.wins??0}W {rating?.losses??0}L {rating?.draws??0}D</small></section><section className="poke-permanent-xp"><span>{locale==="de"?"PERMANENTE FORSCHUNG":"PERMANENT RESEARCH"}</span><b>LV {trainerLevel(progress.xp)}</b><small>{progress.xp} XP · {progress.totalRuns} RUNS</small></section></div>
  <form className="poke-profile-editor" onSubmit={(event)=>{event.preventDefault();save()}}><div><label>{locale==="de"?"Avatar aus erforschtem Dex":"Avatar from researched Dex"}</label><div className="poke-avatar-picker">{avatars.map((id)=><button type="button" aria-pressed={avatar===id} onClick={()=>setAvatar(id)} key={id}><PokemonSprite entry={species(id)} size={72}/><span>#{id}</span></button>)}</div></div><label>{locale==="de"?"Lieblingstyp":"Favorite type"}<select value={favorite} onChange={(event)=>setFavorite(event.target.value)}>{STANDARD_TYPES.map((type)=><option key={type}>{type}</option>)}</select></label><label>{locale==="de"?"Kurze Bio":"Short bio"}<textarea maxLength={180} value={bio} onChange={(event)=>setBio(event.target.value)}/><small>{bio.length}/180</small></label><label>{locale==="de"?"Sichtbarkeit":"Visibility"}<select value={visibility} onChange={(event)=>setVisibility(event.target.value as "public"|"private")}><option value="public">{locale==="de"?"Öffentlich":"Public"}</option><option value="private">{locale==="de"?"Privat":"Private"}</option></select></label><fieldset><legend>{locale==="de"?"Bis zu drei verifizierte Abzeichen zeigen":"Feature up to three verified badges"}</legend>{(online?.awards??[]).map((award)=><label key={`${award.badge_id}-${award.earned_at}`}><input type="checkbox" checked={featured.includes(award.badge_id)} disabled={!featured.includes(award.badge_id)&&featured.length>=3} onChange={()=>setFeatured((items)=>items.includes(award.badge_id)?items.filter((id)=>id!==award.badge_id):[...items,award.badge_id])}/>{POKE_BADGES.find((badge)=>badge.id===award.badge_id)?.name[locale]??award.badge_id}</label>)}</fieldset><button className="poke-primary" disabled={saving}>{saving?"SEALING…":locale==="de"?"Trainerpass speichern":"Save trainer passport"}</button>{message&&<p role="status">{message}</p>}</form>
 </StatsShell>;
}

function StatsShell({title,icon,kicker="PERSONAL RESEARCH RECORD",children}:{title:string;icon:React.ReactNode;kicker?:string;children:React.ReactNode}){return <div className="poke-stats-page"><header><span>{icon}</span><p className="poke-kicker">{kicker}</p><h1>{title}</h1></header>{children}</div>}
function Empty({locale}:{locale:string}){return <div className="poke-empty"><RotateCcw/><b>{locale==="de"?"Noch kein Feldbericht":"No field report yet"}</b><Link href="/poke-nerds">{locale==="de"?"Mission starten":"Start a mission"} →</Link></div>}
