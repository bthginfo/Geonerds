"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {ArrowLeft,LockKeyhole,ShieldCheck,Swords} from "lucide-react";
import {useT} from "@/i18n/I18nProvider";
import {getPublicPokeProfile} from "@/poke/online";
import {species} from "@/poke/data";
import {PokemonSprite} from "./pokemon-sprite";
import {POKE_BADGES} from "@/poke/progression";
import {getPokeGame as findPokeGame} from "@/poke/registry";
import {pl} from "@/poke/types";
import {useAuth} from "@/store/auth";

const getPokeGame=(id:any)=>findPokeGame(id).title;

export function PokePublicProfile({name}:{name:string}){
 const{locale}=useT(),viewer=useAuth((state)=>state.user),[state,setState]=useState<{loading:boolean;found:boolean;private?:boolean;profile?:any;error?:string}>({loading:true,found:false});
 useEffect(()=>{getPublicPokeProfile(name).then((result)=>setState({loading:false,...result}))},[name]);
 if(state.loading)return <div className="poke-loading"><div/><span>OPENING TRAINER PASSPORT…</span></div>;
 if(!state.found)return <main className="poke-public-passport"><Link className="poke-back" href="/poke-nerds/leaderboard"><ArrowLeft/>{locale==="de"?"Zur Liga":"Back to league"}</Link><div className="poke-empty"><LockKeyhole/><b>{locale==="de"?"Trainerakte nicht gefunden":"Trainer file not found"}</b></div></main>;
 if(state.private)return <main className="poke-public-passport"><Link className="poke-back" href="/poke-nerds/leaderboard"><ArrowLeft/>{locale==="de"?"Zur Liga":"Back to league"}</Link><div className="poke-private-pass"><LockKeyhole/><p className="poke-kicker">RESEARCH PASSPORT // PRIVATE</p><h1>{name}</h1><p>{locale==="de"?"Dieser Trainer hält den öffentlichen Teil der Feldakte geschlossen.":"This trainer keeps the public section of their field file closed."}</p></div></main>;
 const profile=state.profile,rating=profile.rating;
 return <main className="poke-public-passport"><Link className="poke-back" href="/poke-nerds/leaderboard"><ArrowLeft/>{locale==="de"?"Zur Liga":"Back to league"}</Link><article className="poke-trainer-passport"><header><div><p className="poke-kicker">PUBLIC TRAINER RESEARCH PASSPORT</p><h1>{profile.name}</h1><span>FAVORITE TYPE // {profile.favoriteType.toUpperCase()}</span></div><div className={`poke-clearance-stamp tier-${rating.tier}`}><b>{rating.tier}</b><strong>{rating.rating}</strong><small>{rating.placements}/5 PLACEMENTS</small></div></header><div className="poke-passport-main"><section className="poke-passport-portrait"><PokemonSprite entry={species(profile.avatarSpeciesId)} size={240}/><span>SPECIMEN AVATAR #{String(profile.avatarSpeciesId).padStart(4,"0")}</span></section><section><blockquote>{profile.bio|| (locale==="de"?"Keine öffentliche Feldnotiz.":"No public field note.")}</blockquote><dl><div><dt>RECORD</dt><dd>{rating.wins}W · {rating.losses}L · {rating.draws}D</dd></div><div><dt>STREAK</dt><dd>{rating.current_streak} // BEST {rating.best_streak}</dd></div><div><dt>MATCHES</dt><dd>{rating.matches}</dd></div></dl>{viewer&&!profile.isSelf&&<Link className="poke-primary" href={`/poke-nerds/challenges?opponent=${encodeURIComponent(profile.name)}`}><Swords/>{locale==="de"?"Trainer herausfordern":"Challenge this trainer"}</Link>}</section></div><section className="poke-passport-medals"><p className="poke-kicker">FEATURED CLEARANCES</p><div>{profile.featuredBadges.length?profile.featuredBadges.map((award:any)=>{const badge=POKE_BADGES.find((item)=>item.id===award.badge_id);return <span key={award.badge_id}><ShieldCheck/><b>{badge?.name[locale]??award.badge_id}</b></span>}):<small>{locale==="de"?"Keine Abzeichen ausgestellt.":"No medals featured."}</small>}</div></section><section className="poke-best-modules"><p className="poke-kicker">BEST MODULE RATINGS</p>{profile.bestGames.map((row:any)=><div key={row.game_id}><span>{pl(getPokeGame(row.game_id),locale)}</span><i><b style={{width:`${Math.min(100,row.rating/12)}%`}}/></i><strong>{row.rating}</strong><em>{row.verified?"VERIFIED":"ACCOUNT"}</em></div>)}</section><section className="poke-rival-ledger"><p className="poke-kicker">RECENT RESOLVED DOSSIERS</p>{profile.recentChallenges.map((item:any)=><div key={item.id}><span>VS {item.rival_name}</span><b>{item.winner_id===profile.userId?"WIN":item.winner_id?"LOSS":"DRAW"}</b><small>{new Date(item.resolved_at).toLocaleDateString(locale)}</small></div>)}</section></article></main>;
}
