import {notFound} from "next/navigation";
import {Suspense} from "react";
import {PokeGameRunner} from "@/components/poke/poke-game-runner";
import {POKE_GAME_IDS,isPokeGameId} from "@/poke/registry";
export function generateStaticParams(){return POKE_GAME_IDS.map((game)=>({game}))}
export default async function Page({params}:{params:Promise<{game:string}>}){const{game}=await params;if(!isPokeGameId(game))notFound();return <Suspense fallback={<div className="poke-loading"><div/><span>CALIBRATING MODULE…</span></div>}><PokeGameRunner gameId={game}/></Suspense>}
