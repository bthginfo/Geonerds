import {Suspense} from "react";
import {PokeChallenges} from "@/components/poke/poke-challenges";
export default function Page(){return <Suspense fallback={<div className="poke-loading-inline">OPENING CHALLENGE DESK…</div>}><PokeChallenges/></Suspense>}
