import { SPECIES, SPECIES_BY_ID, species } from "./data";

export const EVOLUTION_FAMILIES=[
 {id:"bulbasaur",nodes:[1,2,3],edges:[{from:1,to:2,condition:{en:"Level 16",de:"Level 16"}},{from:2,to:3,condition:{en:"Level 32",de:"Level 32"}}]},
 {id:"charmander",nodes:[4,5,6],edges:[{from:4,to:5,condition:{en:"Level 16",de:"Level 16"}},{from:5,to:6,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"squirtle",nodes:[7,8,9],edges:[{from:7,to:8,condition:{en:"Level 16",de:"Level 16"}},{from:8,to:9,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"eevee",nodes:[133,134,135,136],edges:[{from:133,to:134,condition:{en:"Water Stone",de:"Wasserstein"}},{from:133,to:135,condition:{en:"Thunder Stone",de:"Donnerstein"}},{from:133,to:136,condition:{en:"Fire Stone",de:"Feuerstein"}}]},
 {id:"chikorita",nodes:[152,153,154],edges:[{from:152,to:153,condition:{en:"Level 16",de:"Level 16"}},{from:153,to:154,condition:{en:"Level 32",de:"Level 32"}}]},
 {id:"treecko",nodes:[252,253,254],edges:[{from:252,to:253,condition:{en:"Level 16",de:"Level 16"}},{from:253,to:254,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"turtwig",nodes:[387,388,389],edges:[{from:387,to:388,condition:{en:"Level 18",de:"Level 18"}},{from:388,to:389,condition:{en:"Level 32",de:"Level 32"}}]},
 {id:"snivy",nodes:[495,496,497],edges:[{from:495,to:496,condition:{en:"Level 17",de:"Level 17"}},{from:496,to:497,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"chespin",nodes:[650,651,652],edges:[{from:650,to:651,condition:{en:"Level 16",de:"Level 16"}},{from:651,to:652,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"rowlet",nodes:[722,723,724],edges:[{from:722,to:723,condition:{en:"Level 17",de:"Level 17"}},{from:723,to:724,condition:{en:"Level 34",de:"Level 34"}}]},
 {id:"grookey",nodes:[810,811,812],edges:[{from:810,to:811,condition:{en:"Level 16",de:"Level 16"}},{from:811,to:812,condition:{en:"Level 35",de:"Level 35"}}]},
 {id:"sprigatito",nodes:[906,907,908],edges:[{from:906,to:907,condition:{en:"Level 16",de:"Level 16"}},{from:907,to:908,condition:{en:"Level 36",de:"Level 36"}}]},
] as const;

export type GridPredicate={label:{en:string;de:string};test:(id:number)=>boolean};
export const GRID_ROWS:GridPredicate[]=[
 {label:{en:"Grass type",de:"Typ Pflanze"},test:(id)=>species(id).types.includes("grass")},
 {label:{en:"Poison type",de:"Typ Gift"},test:(id)=>species(id).types.includes("poison")},
 {label:{en:"Water type",de:"Typ Wasser"},test:(id)=>species(id).types.includes("water")},
];
export const GRID_COLS:GridPredicate[]=[
 {label:{en:"Blue",de:"Blau"},test:(id)=>species(id).color==="blue"},
 {label:{en:"Evolves onward",de:"Entwickelt sich weiter"},test:(id)=>SPECIES.some((candidate)=>candidate.evolvesFrom===id)},
 {label:{en:"Under 1 metre",de:"Unter 1 Meter"},test:(id)=>species(id).heightM<1},
];
export const gridSolutions=(row:number,col:number)=>SPECIES.filter((entry)=>GRID_ROWS[row].test(entry.id)&&GRID_COLS[col].test(entry.id));
export const isGridPlacementValid=(id:number,row:number,col:number,used:readonly number[])=>
 !used.includes(id)&&Boolean(SPECIES_BY_ID.get(id))&&GRID_ROWS[row]?.test(id)===true&&GRID_COLS[col]?.test(id)===true;

export interface CaseClue {label:{en:string;de:string};test:(id:number)=>boolean}
export const CASE_TARGET=species(94);
export const CASE_SUSPECTS=[45,49,65,76,89,94,105,121,123,127].map(species);
export const CASE_CLUES:CaseClue[]=[
 {label:{en:"The specimen has two types.",de:"Das Exemplar hat zwei Typen."},test:(id)=>species(id).types.length===2},
 {label:{en:"One of its types is Ghost.",de:"Einer seiner Typen ist Geist."},test:(id)=>species(id).types.includes("ghost")},
 {label:{en:"Its Speed is above 100.",de:"Seine Initiative liegt über 100."},test:(id)=>species(id).stats.speed>100},
];

export interface DynamicCase {
 target: ReturnType<typeof species>;
 suspects: ReturnType<typeof species>[];
 clues: CaseClue[];
}

export function buildDynamicCase(cap:number):DynamicCase {
 const safeCap=Math.max(1,Math.min(9,Math.floor(cap)));
 const allowed=SPECIES.filter((entry)=>entry.generation<=safeCap&&!entry.mythical);
 const target=allowed[Math.min(allowed.length-1,Math.max(24,safeCap*103))];
 const step=Math.max(1,Math.floor(allowed.length/18));
 const distractors=allowed.filter((entry)=>entry.id!==target.id).filter((_,index)=>index%step===0).slice(0,11);
 const suspects=[target,...distractors].sort((a,b)=>(a.id*17)%23-(b.id*17)%23);
 const pool:CaseClue[]=[
  {label:{en:`Introduced in Generation ${target.generation}`,de:`Eingeführt in Generation ${target.generation}`},test:(id)=>species(id).generation===target.generation},
  {label:{en:`Recorded color: ${target.color}`,de:`Erfasste Farbe: ${target.color}`},test:(id)=>species(id).color===target.color},
  {label:{en:`Includes type ${target.types[0]}`,de:`Besitzt Typ ${target.types[0]}`},test:(id)=>species(id).types.includes(target.types[0])},
  {label:{en:`Body shape class: ${target.shape}`,de:`Körperform-Klasse: ${target.shape}`},test:(id)=>species(id).shape===target.shape},
  {label:{en:`Speed band ${Math.floor(target.stats.speed/20)*20}–${Math.floor(target.stats.speed/20)*20+19}`,de:`Initiative-Band ${Math.floor(target.stats.speed/20)*20}–${Math.floor(target.stats.speed/20)*20+19}`},test:(id)=>Math.floor(species(id).stats.speed/20)===Math.floor(target.stats.speed/20)},
 ];
 let remaining=suspects;
 const clues:CaseClue[]=[];
 for(const clue of pool){
  const next=remaining.filter((entry)=>clue.test(entry.id));
  if(next.length>0&&next.length<remaining.length){clues.push(clue);remaining=next}
  if(remaining.length===1)break;
 }
 while(remaining.length>1){
  const sorted=[...remaining].sort((a,b)=>a.id-b.id);
  const pivot=sorted[Math.floor(sorted.length/2)-1]?.id??sorted[0].id;
  const targetIsLower=target.id<=pivot;
  const clue:CaseClue=targetIsLower
   ?{label:{en:`National Dex file number is at most ${pivot}`,de:`Die National-Dex-Aktennummer ist höchstens ${pivot}`},test:(id)=>id<=pivot}
   :{label:{en:`National Dex file number is above ${pivot}`,de:`Die National-Dex-Aktennummer liegt über ${pivot}`},test:(id)=>id>pivot};
  const next=remaining.filter((entry)=>clue.test(entry.id));
  if(next.length===remaining.length)throw new Error("Case clue failed to reduce candidates");
  clues.push(clue);remaining=next;
 }
 return {target,suspects,clues};
}
