import {SPECIES} from "./data";
import {STANDARD_TYPES,typeMultiplier} from "./type-chart";
import type {Species} from "./types";
import {balancedGenerationBag,seedHash,seededShuffle} from "./variety";
export interface CircuitMove{id:string;name:{en:string;de:string};type:string;power:number;energy:number}
export const CIRCUIT_MOVES:CircuitMove[]=[
 ["ember","Ember","Glut","fire",40],["water-gun","Water Gun","Aquaknarre","water",40],["vine-whip","Vine Whip","Rankenhieb","grass",45],["thunder-shock","Thunder Shock","Donnerschock","electric",40],["quick-attack","Quick Attack","Ruckzuckhieb","normal",40],["rock-throw","Rock Throw","Steinwurf","rock",50],["confusion","Confusion","Konfusion","psychic",50],["ice-shard","Ice Shard","Eissplitter","ice",40],["bite","Bite","Biss","dark",60],["metal-claw","Metal Claw","Metallklaue","steel",50],["fairy-wind","Fairy Wind","Feenbrise","fairy",40],["mud-shot","Mud Shot","Lehmschuss","ground",55],["air-cutter","Air Cutter","Windschnitt","flying",60],["poison-sting","Poison Sting","Giftstachel","poison",15],["bug-bite","Bug Bite","Käferbiss","bug",60],["shadow-sneak","Shadow Sneak","Schattenstoß","ghost",40],["dragon-breath","Dragon Breath","Feuerodem","dragon",60],["karate-chop","Karate Chop","Karateschlag","fighting",50],
].map(([id,en,de,type,power])=>({id:String(id),name:{en:String(en),de:String(de)},type:String(type),power:Number(power),energy:1}));
export const circuitHp=(entry:Species)=>80+entry.stats.hp*2;
export const circuitMovesFor=(entry:Species):CircuitMove[]=>{
 const typed=entry.types.map((type)=>CIRCUIT_MOVES.find((move)=>move.type===type)).filter(Boolean) as CircuitMove[];
 const normal=CIRCUIT_MOVES.find((move)=>move.type==="normal")!;
 const coverage=CIRCUIT_MOVES[(entry.id*7)%CIRCUIT_MOVES.length];
 return [...new Map([...typed,normal,coverage].map((move)=>[move.id,move])).values()].slice(0,4);
};
export const circuitDamage=(move:CircuitMove,attacker:Species,defender:Species,guard=false)=>{
 const stab=attacker.types.includes(move.type)?1.5:1;return Math.max(1,Math.round(move.power/4*typeMultiplier(move.type,defender.types)*stab*(guard?.5:1)));
};
export const battleWinReward=(playerHp:number,turn:number)=>650+Math.max(0,playerHp)*2+Math.max(0,120-Math.max(0,turn-1)*15);
export const recoveryCounterOutcome=(currentHp:number,maxHp:number,restored:number,counterDamage:number)=>{const healedHp=Math.min(maxHp,currentHp+Math.max(0,restored));return{healedHp,remainingHp:Math.max(0,healedHp-Math.max(0,counterDamage))}};
export const circuitPartners=(cap:number,seed="partners")=>{const pool=SPECIES.filter((entry)=>entry.generation<=cap&&!entry.legendary&&!entry.mythical&&entry.stats.hp>=45);return balancedGenerationBag(pool,cap,Math.min(12,pool.length),`${seed}:partners`,(entry)=>String(entry.id))};
export const generateBattleCircuit=(cap:number,count:number,partnerId:number|undefined,seed:string,difficulty:"easy"|"medium"|"hard")=>{
 const partner=SPECIES.find((entry)=>entry.id===partnerId);
 const partnerBst=partner?Object.values(partner.stats).reduce((sum,value)=>sum+value,0):420;
 const generations=seededShuffle(Array.from({length:cap},(_,index)=>index+1),`${seed}:generations`);
 const result:Species[]=[];
 for(let index=0;index<count;index++){
  const generation=generations[index%generations.length];
  const stage=Math.floor(index/Math.max(1,count/4));
  const target=partnerBst+(difficulty==="easy"?-55:difficulty==="hard"?25:0)+stage*12;
  const band=SPECIES.filter((entry)=>entry.generation===generation&&entry.id!==partnerId&&!entry.mythical)
   .sort((a,b)=>Math.abs(Object.values(a.stats).reduce((sum,value)=>sum+value,0)-target)-Math.abs(Object.values(b.stats).reduce((sum,value)=>sum+value,0)-target));
  const candidates=band.slice(0,Math.max(6,Math.ceil(band.length*.18)));
  let entry=candidates[seedHash(`${seed}:${index}`)%candidates.length]??band[0];
  if(entry?.id===result.at(-1)?.id)entry=candidates.find((candidate)=>candidate.id!==entry.id)??entry;
  if(entry)result.push(entry);
 }
 return result;
};
