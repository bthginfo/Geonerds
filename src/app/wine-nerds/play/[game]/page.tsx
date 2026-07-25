import { notFound } from "next/navigation";
import { WineGameRunner } from "@/components/wine/wine-game-runner";
import { isWineGameId, WINE_GAME_IDS } from "@/wine/registry";
export function generateStaticParams(){return WINE_GAME_IDS.map(game=>({game}))}
export default async function Page({params}:{params:Promise<{game:string}>}){const {game}=await params;if(!isWineGameId(game))notFound();return <WineGameRunner gameId={game}/>}

