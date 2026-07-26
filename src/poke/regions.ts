import { species } from "./data";
import type { Localized, Species } from "./types";
import {seededShuffle,shuffleBag} from "./variety";

export type RegionId="kanto"|"johto"|"hoenn"|"sinnoh"|"unova"|"kalos"|"alola"|"galar"|"paldea";
export type Biome="forest"|"meadow"|"cave"|"coast"|"mountain"|"wetland"|"desert"|"snow"|"ruins"|"volcanic";
export interface RegionNode{id:string;name:Localized;x:number;y:number;biome:Biome}
export interface RegionDefinition{id:RegionId;generation:number;name:Localized;accent:string;secondary:string;path:string;nodes:RegionNode[]}
const n=(id:string,en:string,de:string,x:number,y:number,biome:Biome):RegionNode=>({id,name:{en,de},x,y,biome});
export const REGIONS:RegionDefinition[]=[
 {id:"kanto",generation:1,name:{en:"Kanto",de:"Kanto"},accent:"#45dff2",secondary:"#72d66d",path:"M12 18L42 9 62 18 84 15 91 39 78 55 91 70 65 91 40 86 17 96 9 69 18 52 8 35Z",nodes:[n("kanto-forest","Viridian Forest sector","Vertania-Wald-Sektor",28,38,"forest"),n("kanto-meadow","Pallet meadow sector","Alabastia-Wiesen-Sektor",27,77,"meadow"),n("kanto-cave","Mt. Moon cave sector","Mondberg-Höhlen-Sektor",48,29,"cave"),n("kanto-coast","Seafoam coast sector","Seeschaum-Küsten-Sektor",42,88,"coast"),n("kanto-ruins","Lavender ruin sector","Lavandia-Ruinen-Sektor",76,61,"ruins")]},
 {id:"johto",generation:2,name:{en:"Johto",de:"Johto"},accent:"#f0c257",secondary:"#7ed6b4",path:"M8 35L22 15 50 19 65 8 91 24 82 43 94 61 69 72 57 94 34 81 10 88 18 61Z",nodes:[n("johto-forest","Ilex Forest sector","Steineichenwald-Sektor",30,52,"forest"),n("johto-meadow","New Bark meadow","Neuborkia-Wiese",72,74,"meadow"),n("johto-mountain","Mt. Silver sector","Silberberg-Sektor",17,28,"mountain"),n("johto-wetland","Lake of Rage shore","See-des-Zorns-Ufer",58,24,"wetland"),n("johto-ruins","Ecruteak ruins","Teak-City-Ruinen",47,52,"ruins")]},
 {id:"hoenn",generation:3,name:{en:"Hoenn",de:"Hoenn"},accent:"#64b5ff",secondary:"#ff765e",path:"M9 47L20 22 44 13 58 28 79 19 94 43 78 59 89 79 61 91 44 75 23 91 11 69Z",nodes:[n("hoenn-forest","Petalburg Woods sector","Blütenburgwald-Sektor",25,54,"forest"),n("hoenn-coast","Slateport coast sector","Graphitport-Küsten-Sektor",55,78,"coast"),n("hoenn-volcanic","Mt. Chimney sector","Schlotberg-Sektor",44,30,"volcanic"),n("hoenn-cave","Granite cave sector","Granithöhlen-Sektor",19,72,"cave"),n("hoenn-meadow","Fortree canopy sector","Baumhausen-Sektor",72,43,"meadow")]},
 {id:"sinnoh",generation:4,name:{en:"Sinnoh",de:"Sinnoh"},accent:"#a7b6ff",secondary:"#e6e9ef",path:"M17 94L9 60 22 37 17 14 42 8 52 25 67 11 89 29 78 53 92 74 69 91 45 81Z",nodes:[n("sinnoh-forest","Eterna Forest sector","Ewigenau-Wald-Sektor",28,54,"forest"),n("sinnoh-mountain","Mt. Coronet sector","Kraterberg-Sektor",53,42,"mountain"),n("sinnoh-wetland","Great Marsh sector","Großmoor-Sektor",39,78,"wetland"),n("sinnoh-snow","Snowpoint sector","Blizzach-Schnee-Sektor",68,20,"snow"),n("sinnoh-meadow","Twinleaf field sector","Zweiblattdorf-Feldsektor",27,87,"meadow")]},
 {id:"unova",generation:5,name:{en:"Unova",de:"Einall"},accent:"#ffb764",secondary:"#9f91ff",path:"M18 8L47 13 63 7 85 19 80 42 92 57 73 70 68 93 43 84 24 94 10 71 19 51 8 31Z",nodes:[n("unova-forest","Pinwheel Forest sector","Ewigenwald-Sektor",25,63,"forest"),n("unova-desert","Desert Resort sector","Wüstenresort-Sektor",52,57,"desert"),n("unova-ruins","Dragonspiral ruins","Drachenstiege-Ruinen",64,19,"ruins"),n("unova-meadow","Nuvema field sector","Avenitia-Feldsektor",42,88,"meadow"),n("unova-coast","Castelia coast sector","Stratos-Küsten-Sektor",55,75,"coast")]},
 {id:"kalos",generation:6,name:{en:"Kalos",de:"Kalos"},accent:"#ed8fbc",secondary:"#70c8ff",path:"M48 8L61 27 86 21 79 45 94 61 68 69 61 94 43 77 17 89 20 62 7 47 31 35 25 15Z",nodes:[n("kalos-forest","Santalune Forest sector","Nouvaria-Wald-Sektor",27,62,"forest"),n("kalos-cave","Reflection Cave sector","Spiegelhöhlen-Sektor",64,60,"cave"),n("kalos-meadow","Vaniville meadow","Escissia-Wiese",38,83,"meadow"),n("kalos-snow","Snowbelle sector","Fractalia-Schnee-Sektor",73,75,"snow"),n("kalos-wetland","Kalos wetland sector","Kalos-Feuchtgebiet-Sektor",51,43,"wetland")]},
 {id:"alola",generation:7,name:{en:"Alola",de:"Alola"},accent:"#58e0c0",secondary:"#ff9d59",path:"M12 30L28 18 39 33 31 48 13 45ZM49 16L65 9 80 22 73 38 53 35ZM45 55L61 43 77 54 69 72 49 75ZM15 69L29 57 42 72 34 91 14 87Z",nodes:[n("alola-forest","Lush Jungle sector","Schattendschungel-Sektor",60,57,"forest"),n("alola-volcanic","Wela Volcano sector","Wela-Vulkan-Sektor",65,24,"volcanic"),n("alola-desert","Haina Desert sector","Haina-Wüsten-Sektor",25,78,"desert"),n("alola-coast","Melemele coast sector","Mele-Mele-Küsten-Sektor",25,35,"coast"),n("alola-mountain","Lanakila sector","Lanakila-Berg-Sektor",56,70,"mountain")]},
 {id:"galar",generation:8,name:{en:"Galar",de:"Galar"},accent:"#9b8cff",secondary:"#ff5e78",path:"M39 5L59 8 65 25 55 39 69 54 61 73 72 91 48 96 35 78 39 60 27 43 35 27Z",nodes:[n("galar-forest","Slumbering Weald sector","Schlummerwald-Sektor",44,77,"forest"),n("galar-meadow","Postwick field sector","Furlongham-Feldsektor",49,88,"meadow"),n("galar-ruins","Hammerlocke ruin sector","Claw-City-Ruinen-Sektor",54,48,"ruins"),n("galar-snow","Crown snow sector","Kronen-Schnee-Sektor",54,20,"snow"),n("galar-cave","Glimwood cave sector","Wirrschein-Höhlen-Sektor",45,60,"cave")]},
 {id:"paldea",generation:9,name:{en:"Paldea",de:"Paldea"},accent:"#ff756e",secondary:"#d7c65a",path:"M50 5L70 15 89 38 84 64 66 84 43 96 20 82 8 58 15 32 31 13Z",nodes:[n("paldea-meadow","Cabo Poco field sector","Cucharico-Feldsektor",55,81,"meadow"),n("paldea-forest","Tagtree sector","Schmierhain-Sektor",71,37,"forest"),n("paldea-desert","Asado Desert sector","Brutzelwüsten-Sektor",25,48,"desert"),n("paldea-snow","Glaseado sector","Montanata-Schnee-Sektor",54,19,"snow"),n("paldea-wetland","South marsh sector","Südlicher-Sumpf-Sektor",65,66,"wetland")]},
];
export const REGION_BY_ID=new Map(REGIONS.map((region)=>[region.id,region]));
export const eligibleRegions=(cap:number)=>REGIONS.filter((region)=>region.generation<=Math.max(1,Math.min(9,cap)));
export const regionForGeneration=(generation:number)=>REGIONS.find((region)=>region.generation===generation)??REGIONS[0];

export interface HabitatRound {key:string;region:RegionDefinition;target:Species;validSectorIds:string[];clues:{biome:Biome;weather:Localized;time:Localized}}
const habitat=(regionId:RegionId,speciesId:number,biome:Biome,weather:Localized,time:Localized):HabitatRound=>{
 const region=REGION_BY_ID.get(regionId)!;return{key:`${regionId}-${speciesId}`,region,target:species(speciesId),validSectorIds:region.nodes.filter((node)=>node.biome===biome).map((node)=>node.id),clues:{biome,weather,time}};
};
export const HABITAT_ROUNDS:HabitatRound[]=[
 habitat("kanto",25,"forest",{en:"dry air",de:"trockene Luft"},{en:"day",de:"Tag"}),habitat("kanto",41,"cave",{en:"still air",de:"stehende Luft"},{en:"night",de:"Nacht"}),
 habitat("johto",163,"forest",{en:"clear",de:"klar"},{en:"night",de:"Nacht"}),habitat("johto",179,"meadow",{en:"breeze",de:"Brise"},{en:"day",de:"Tag"}),
 habitat("hoenn",278,"coast",{en:"sea wind",de:"Seewind"},{en:"day",de:"Tag"}),habitat("hoenn",304,"cave",{en:"mineral dust",de:"Mineralstaub"},{en:"day",de:"Tag"}),
 habitat("sinnoh",403,"meadow",{en:"charged air",de:"geladene Luft"},{en:"dusk",de:"Dämmerung"}),habitat("sinnoh",459,"snow",{en:"snowfall",de:"Schneefall"},{en:"day",de:"Tag"}),
 habitat("unova",551,"desert",{en:"dry wind",de:"trockener Wind"},{en:"day",de:"Tag"}),habitat("unova",607,"ruins",{en:"still",de:"windstill"},{en:"night",de:"Nacht"}),
 habitat("kalos",661,"meadow",{en:"clear",de:"klar"},{en:"day",de:"Tag"}),habitat("kalos",704,"wetland",{en:"rain",de:"Regen"},{en:"dusk",de:"Dämmerung"}),
 habitat("alola",744,"mountain",{en:"warm breeze",de:"warme Brise"},{en:"day",de:"Tag"}),habitat("alola",755,"forest",{en:"humid",de:"feucht"},{en:"night",de:"Nacht"}),
 habitat("galar",821,"meadow",{en:"overcast",de:"bewölkt"},{en:"day",de:"Tag"}),habitat("galar",872,"snow",{en:"powder snow",de:"Pulverschnee"},{en:"night",de:"Nacht"}),
 habitat("paldea",921,"meadow",{en:"dry",de:"trocken"},{en:"day",de:"Tag"}),habitat("paldea",938,"wetland",{en:"rain",de:"Regen"},{en:"dusk",de:"Dämmerung"}),
];
export const habitatRoundsFor=(cap:number,count:number,seed="habitat-default")=>{
 const regions=seededShuffle(eligibleRegions(cap),`${seed}:regions`),perRegion=new Map(regions.map((region)=>[region.id,seededShuffle(HABITAT_ROUNDS.filter((round)=>round.region.id===region.id),`${seed}:${region.id}`)]));const cursors=new Map<RegionId,number>();const result:HabitatRound[]=[];
 for(let index=0;index<count;index++){const region=regions[index%regions.length],pool=perRegion.get(region.id)!;const cursor=cursors.get(region.id)??0;let item=pool[cursor%pool.length];cursors.set(region.id,cursor+1);if(result.at(-1)?.key===item.key&&pool.length>1)item=pool[(cursor+1)%pool.length];result.push(item)}return result;
};
export interface RangerRound{key:string;region:RegionDefinition;target:RegionNode}
export const rangerRoundsFor=(cap:number,count:number,seed="ranger-default"):RangerRound[]=>{
 const regions=seededShuffle(eligibleRegions(cap),`${seed}:regions`),bags=new Map(regions.map((region)=>[region.id,seededShuffle(region.nodes,`${seed}:${region.id}`)]));const cursors=new Map<RegionId,number>();const result:RangerRound[]=[];
 for(let index=0;index<count;index++){const region=regions[index%regions.length],pool=bags.get(region.id)!;const cursor=cursors.get(region.id)??0,target=pool[cursor%pool.length];cursors.set(region.id,cursor+1);result.push({key:`${region.id}-${target.id}`,region,target})}return result;
};
export function cycleWithoutImmediateDuplicates<T>(pool:readonly T[],count:number,key:(item:T)=>string):T[]{
 if(!pool.length||count<=0)return[];const result:T[]=[];let offset=Math.max(0,count%pool.length);
 for(let index=0;index<count;index++){let candidate=pool[(index*7+offset)%pool.length];if(result.length>0&&key(candidate)===key(result[result.length-1]))candidate=pool[(index*7+offset+1)%pool.length];result.push(candidate)}
 return result;
}
