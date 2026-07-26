import {species} from "./data";
import {seedHash,seededShuffle} from "./variety";

export const PRINCIPAL_STARTER_IDS=[
 [1,4,7],[152,155,158],[252,255,258],[387,390,393],[495,498,501],
 [650,653,656],[722,725,728],[810,813,816],[906,909,912],
] as const;

/** One Grass, Fire and Water starter, each drawn from an eligible principal generation. */
export function expeditionStarterRoster(cap:number,seed:string){
 const safeCap=Math.max(1,Math.min(9,Math.floor(cap)));
 const roster=[0,1,2].map((typeSlot)=>{const generation=seedHash(`${seed}:starter:${typeSlot}`)%safeCap;return species(PRINCIPAL_STARTER_IDS[generation][typeSlot])});
 return seededShuffle(roster,`${seed}:starter-order`);
}
