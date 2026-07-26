import {notFound} from "next/navigation";
import {PokeGameRunner} from "@/components/poke/poke-game-runner";
import {POKE_GAME_IDS,isPokeGameId} from "@/poke/registry";
export function generateStaticParams(){return POKE_GAME_IDS.map((game)=>({game}))}
export default async function Page({params}:{params:Promise<{game:string}>}){const{game}=await params;if(!isPokeGameId(game))notFound();return <PokeGameRunner gameId={game}/>}

