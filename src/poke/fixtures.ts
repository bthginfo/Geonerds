import { SPECIES, SPECIES_BY_ID, species } from "./data";
import {seedHash,seededShuffle} from "./variety";

export const EVOLUTION_FAMILIES=[
 {id:"bulbasaur",nodes:[1,2,3],edges:[{from:1,to:2,condition:{en:"Level 16",de:"Level 16"}},{from:2,to:3,condition:{en:"Level 32",de:"Level 32"}}]},
 {id:"charmander",nodes:[4,5,6],edges:[{from:4,to:5,condition:{en:"Level 16",de:"Level 16"}},{from:5,to:6,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"squirtle",nodes:[7,8,9],edges:[{from:7,to:8,condition:{en:"Level 16",de:"Level 16"}},{from:8,to:9,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"eevee",nodes:[133,134,135,136],edges:[{from:133,to:134,condition:{en:"Water Stone",de:"Wasserstein"}},{from:133,to:135,condition:{en:"Thunder Stone",de:"Donnerstein"}},{from:133,to:136,condition:{en:"Fire Stone",de:"Feuerstein"}}]},
 {id:"caterpie",nodes:[10,11,12],edges:[{from:10,to:11,condition:{en:"Level 7",de:"Level 7"}},{from:11,to:12,condition:{en:"Level 10",de:"Level 10"}}]},
 {id:"pichu",nodes:[172,25,26],edges:[{from:172,to:25,condition:{en:"High friendship",de:"Hohe Freundschaft"}},{from:25,to:26,condition:{en:"Thunder Stone",de:"Donnerstein"}}]},
 {id:"chikorita",nodes:[152,153,154],edges:[{from:152,to:153,condition:{en:"Level 16",de:"Level 16"}},{from:153,to:154,condition:{en:"Level 32",de:"Level 32"}}]},
 {id:"treecko",nodes:[252,253,254],edges:[{from:252,to:253,condition:{en:"Level 16",de:"Level 16"}},{from:253,to:254,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"ralts",nodes:[280,281,282],edges:[{from:280,to:281,condition:{en:"Level 20",de:"Level 20"}},{from:281,to:282,condition:{en:"Level 30",de:"Level 30"}}]},
 {id:"shinx",nodes:[403,404,405],edges:[{from:403,to:404,condition:{en:"Level 15",de:"Level 15"}},{from:404,to:405,condition:{en:"Level 30",de:"Level 30"}}]},
 {id:"turtwig",nodes:[387,388,389],edges:[{from:387,to:388,condition:{en:"Level 18",de:"Level 18"}},{from:388,to:389,condition:{en:"Level 32",de:"Level 32"}}]},
 {id:"snivy",nodes:[495,496,497],edges:[{from:495,to:496,condition:{en:"Level 17",de:"Level 17"}},{from:496,to:497,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"roggenrola",nodes:[524,525,526],edges:[{from:524,to:525,condition:{en:"Level 25",de:"Level 25"}},{from:525,to:526,condition:{en:"Trade",de:"Tausch"}}]},
 {id:"litwick",nodes:[607,608,609],edges:[{from:607,to:608,condition:{en:"Level 41",de:"Level 41"}},{from:608,to:609,condition:{en:"Dusk Stone",de:"Finsterstein"}}]},
 {id:"chespin",nodes:[650,651,652],edges:[{from:650,to:651,condition:{en:"Level 16",de:"Level 16"}},{from:651,to:652,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"scatterbug",nodes:[664,665,666],edges:[{from:664,to:665,condition:{en:"Level 9",de:"Level 9"}},{from:665,to:666,condition:{en:"Level 12",de:"Level 12"}}]},
 {id:"goomy",nodes:[704,705,706],edges:[{from:704,to:705,condition:{en:"Level 40",de:"Level 40"}},{from:705,to:706,condition:{en:"Level 50 during rain",de:"Level 50 bei Regen"}}]},
 {id:"rowlet",nodes:[722,723,724],edges:[{from:722,to:723,condition:{en:"Level 17",de:"Level 17"}},{from:723,to:724,condition:{en:"Level 34",de:"Level 34"}}]},
 {id:"grookey",nodes:[810,811,812],edges:[{from:810,to:811,condition:{en:"Level 16",de:"Level 16"}},{from:811,to:812,condition:{en:"Level 35",de:"Level 35"}}]},
 {id:"rookidee",nodes:[821,822,823],edges:[{from:821,to:822,condition:{en:"Level 18",de:"Level 18"}},{from:822,to:823,condition:{en:"Level 38",de:"Level 38"}}]},
 {id:"applin",nodes:[840,841,842],edges:[{from:840,to:841,condition:{en:"Tart Apple",de:"Saurer Apfel"}},{from:840,to:842,condition:{en:"Sweet Apple",de:"Süßer Apfel"}}]},
 {id:"sprigatito",nodes:[906,907,908],edges:[{from:906,to:907,condition:{en:"Level 16",de:"Level 16"}},{from:907,to:908,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"pawmi",nodes:[921,922,923],edges:[{from:921,to:922,condition:{en:"Level 18",de:"Level 18"}},{from:922,to:923,condition:{en:"Walk 1,000 steps, then level up",de:"1.000 Schritte gehen, dann Levelaufstieg"}}]},
 {id:"smoliv",nodes:[928,929,930],edges:[{from:928,to:929,condition:{en:"Level 25",de:"Level 25"}},{from:929,to:930,condition:{en:"Level 35",de:"Level 35"}}]},
 {id:"weedle",nodes:[13,14,15],edges:[{from:13,to:14,condition:{en:"Level 7",de:"Level 7"}},{from:14,to:15,condition:{en:"Level 10",de:"Level 10"}}]},
 {id:"pidgey",nodes:[16,17,18],edges:[{from:16,to:17,condition:{en:"Level 18",de:"Level 18"}},{from:17,to:18,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"zubat",nodes:[41,42,169],edges:[{from:41,to:42,condition:{en:"Level 22",de:"Level 22"}},{from:42,to:169,condition:{en:"High friendship",de:"Hohe Freundschaft"}}]},
 {id:"oddish",nodes:[43,44,45,182],edges:[{from:43,to:44,condition:{en:"Level 21",de:"Level 21"}},{from:44,to:45,condition:{en:"Leaf Stone",de:"Blattstein"}},{from:44,to:182,condition:{en:"Sun Stone",de:"Sonnenstein"}}]},
 {id:"poliwag",nodes:[60,61,62,186],edges:[{from:60,to:61,condition:{en:"Level 25",de:"Level 25"}},{from:61,to:62,condition:{en:"Water Stone",de:"Wasserstein"}},{from:61,to:186,condition:{en:"Trade holding King's Rock",de:"Tausch mit King-Stein"}}]},
 {id:"abra",nodes:[63,64,65],edges:[{from:63,to:64,condition:{en:"Level 16",de:"Level 16"}},{from:64,to:65,condition:{en:"Trade",de:"Tausch"}}]},
 {id:"machop",nodes:[66,67,68],edges:[{from:66,to:67,condition:{en:"Level 28",de:"Level 28"}},{from:67,to:68,condition:{en:"Trade",de:"Tausch"}}]},
 {id:"gastly",nodes:[92,93,94],edges:[{from:92,to:93,condition:{en:"Level 25",de:"Level 25"}},{from:93,to:94,condition:{en:"Trade",de:"Tausch"}}]},
 {id:"dratini",nodes:[147,148,149],edges:[{from:147,to:148,condition:{en:"Level 30",de:"Level 30"}},{from:148,to:149,condition:{en:"Level 55",de:"Level 55"}}]},
 {id:"cyndaquil",nodes:[155,156,157],edges:[{from:155,to:156,condition:{en:"Level 14",de:"Level 14"}},{from:156,to:157,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"totodile",nodes:[158,159,160],edges:[{from:158,to:159,condition:{en:"Level 18",de:"Level 18"}},{from:159,to:160,condition:{en:"Level 30",de:"Level 30"}}]},
 {id:"mareep",nodes:[179,180,181],edges:[{from:179,to:180,condition:{en:"Level 15",de:"Level 15"}},{from:180,to:181,condition:{en:"Level 30",de:"Level 30"}}]},
 {id:"larvitar",nodes:[246,247,248],edges:[{from:246,to:247,condition:{en:"Level 30",de:"Level 30"}},{from:247,to:248,condition:{en:"Level 55",de:"Level 55"}}]},
 {id:"torchic",nodes:[255,256,257],edges:[{from:255,to:256,condition:{en:"Level 16",de:"Level 16"}},{from:256,to:257,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"mudkip",nodes:[258,259,260],edges:[{from:258,to:259,condition:{en:"Level 16",de:"Level 16"}},{from:259,to:260,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"bagon",nodes:[371,372,373],edges:[{from:371,to:372,condition:{en:"Level 30",de:"Level 30"}},{from:372,to:373,condition:{en:"Level 50",de:"Level 50"}}]},
 {id:"chimchar",nodes:[390,391,392],edges:[{from:390,to:391,condition:{en:"Level 14",de:"Level 14"}},{from:391,to:392,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"piplup",nodes:[393,394,395],edges:[{from:393,to:394,condition:{en:"Level 16",de:"Level 16"}},{from:394,to:395,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"gible",nodes:[443,444,445],edges:[{from:443,to:444,condition:{en:"Level 24",de:"Level 24"}},{from:444,to:445,condition:{en:"Level 48",de:"Level 48"}}]},
 {id:"tepig",nodes:[498,499,500],edges:[{from:498,to:499,condition:{en:"Level 17",de:"Level 17"}},{from:499,to:500,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"oshawott",nodes:[501,502,503],edges:[{from:501,to:502,condition:{en:"Level 17",de:"Level 17"}},{from:502,to:503,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"deino",nodes:[633,634,635],edges:[{from:633,to:634,condition:{en:"Level 50",de:"Level 50"}},{from:634,to:635,condition:{en:"Level 64",de:"Level 64"}}]},
 {id:"fennekin",nodes:[653,654,655],edges:[{from:653,to:654,condition:{en:"Level 16",de:"Level 16"}},{from:654,to:655,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"froakie",nodes:[656,657,658],edges:[{from:656,to:657,condition:{en:"Level 16",de:"Level 16"}},{from:657,to:658,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"litten",nodes:[725,726,727],edges:[{from:725,to:726,condition:{en:"Level 17",de:"Level 17"}},{from:726,to:727,condition:{en:"Level 34",de:"Level 34"}}]},
 {id:"popplio",nodes:[728,729,730],edges:[{from:728,to:729,condition:{en:"Level 17",de:"Level 17"}},{from:729,to:730,condition:{en:"Level 34",de:"Level 34"}}]},
 {id:"scorbunny",nodes:[813,814,815],edges:[{from:813,to:814,condition:{en:"Level 16",de:"Level 16"}},{from:814,to:815,condition:{en:"Level 35",de:"Level 35"}}]},
 {id:"sobble",nodes:[816,817,818],edges:[{from:816,to:817,condition:{en:"Level 16",de:"Level 16"}},{from:817,to:818,condition:{en:"Level 35",de:"Level 35"}}]},
 {id:"fuecoco",nodes:[909,910,911],edges:[{from:909,to:910,condition:{en:"Level 16",de:"Level 16"}},{from:910,to:911,condition:{en:"Level 36",de:"Level 36"}}]},
 {id:"quaxly",nodes:[912,913,914],edges:[{from:912,to:913,condition:{en:"Level 16",de:"Level 16"}},{from:913,to:914,condition:{en:"Level 36",de:"Level 36"}}]},
] as const;

export type GridPredicate={label:{en:string;de:string};test:(id:number)=>boolean};
const gp=(en:string,de:string,test:(id:number)=>boolean):GridPredicate=>({label:{en,de},test});
const typeNames:Record<string,{en:string;de:string}>={
 normal:{en:"Normal type",de:"Typ Normal"},fire:{en:"Fire type",de:"Typ Feuer"},water:{en:"Water type",de:"Typ Wasser"},
 electric:{en:"Electric type",de:"Typ Elektro"},grass:{en:"Grass type",de:"Typ Pflanze"},ice:{en:"Ice type",de:"Typ Eis"},
 fighting:{en:"Fighting type",de:"Typ Kampf"},poison:{en:"Poison type",de:"Typ Gift"},ground:{en:"Ground type",de:"Typ Boden"},
 flying:{en:"Flying type",de:"Typ Flug"},psychic:{en:"Psychic type",de:"Typ Psycho"},bug:{en:"Bug type",de:"Typ Käfer"},
 rock:{en:"Rock type",de:"Typ Gestein"},ghost:{en:"Ghost type",de:"Typ Geist"},dragon:{en:"Dragon type",de:"Typ Drache"},
 dark:{en:"Dark type",de:"Typ Unlicht"},steel:{en:"Steel type",de:"Typ Stahl"},fairy:{en:"Fairy type",de:"Typ Fee"},
};
const gridTypeOrder=["grass","poison","water",...Object.keys(typeNames).filter((type)=>!["grass","poison","water"].includes(type))];
export const GRID_ROWS:GridPredicate[]=gridTypeOrder.map((type)=>gp(typeNames[type].en,typeNames[type].de,(id)=>species(id).types.includes(type)));
export const GRID_COLS:GridPredicate[]=[
 gp("Blue body","Körperfarbe Blau",(id)=>species(id).color==="blue"),
 gp("Evolves onward","Entwickelt sich weiter",(id)=>SPECIES.some((candidate)=>candidate.evolvesFrom===id)),
 gp("Under 1 metre","Unter 1 Meter",(id)=>species(id).heightM<1),
 ...["black","brown","gray","green","pink","purple","red","white","yellow"].map((color)=>gp(
  `${color[0].toUpperCase()}${color.slice(1)} body`,
  `Körperfarbe ${({black:"Schwarz",blue:"Blau",brown:"Braun",gray:"Grau",green:"Grün",pink:"Rosa",purple:"Violett",red:"Rot",white:"Weiß",yellow:"Gelb"} as Record<string,string>)[color]}`,
  (id)=>species(id).color===color,
 )),
 gp("Final evolution","Letzte Entwicklungsstufe",(id)=>!SPECIES.some((candidate)=>candidate.evolvesFrom===id)),
 gp("At least 2 metres","Mindestens 2 Meter",(id)=>species(id).heightM>=2),
 gp("Under 20 kg","Unter 20 kg",(id)=>species(id).weightKg<20),
 gp("At least 100 kg","Mindestens 100 kg",(id)=>species(id).weightKg>=100),
 gp("Dual type","Doppeltyp",(id)=>species(id).types.length===2),
 gp("Single type","Einzeltyp",(id)=>species(id).types.length===1),
 gp("Speed 100+","Initiative 100+",(id)=>species(id).stats.speed>=100),
 gp("Defense 100+","Verteidigung 100+",(id)=>species(id).stats.defense>=100),
 gp("Has a known habitat","Habitat erfasst",(id)=>species(id).habitat!=="unknown"&&species(id).habitat!==""),
];
export const gridSolutions=(row:number,col:number)=>SPECIES.filter((entry)=>GRID_ROWS[row].test(entry.id)&&GRID_COLS[col].test(entry.id));
export const isGridPlacementValid=(id:number,row:number,col:number,used:readonly number[])=>
 !used.includes(id)&&Boolean(SPECIES_BY_ID.get(id))&&GRID_ROWS[row]?.test(id)===true&&GRID_COLS[col]?.test(id)===true;

export interface PokeGridDefinition{rows:GridPredicate[];cols:GridPredicate[];solutions:number[][]}
function distinctGridSolution(solutions:number[][]):boolean{
 const order=solutions.map((ids,index)=>({ids,index})).sort((a,b)=>a.ids.length-b.ids.length);
 const used=new Set<number>();
 const visit=(slot:number):boolean=>{
  if(slot===order.length)return true;
  for(const id of order[slot].ids){
   if(used.has(id))continue;
   used.add(id);
   if(visit(slot+1))return true;
   used.delete(id);
  }
  return false;
 };
 return visit(0);
}
export function buildPokeGrid(generationCap:number,seed:string):PokeGridDefinition{
 const allowed=SPECIES.filter((entry)=>entry.generation<=generationCap);
 const rows=seededShuffle(GRID_ROWS,`${seed}:row-pool`);
 const cols=seededShuffle(GRID_COLS,`${seed}:col-pool`);
 for(let rowStart=0;rowStart<Math.min(rows.length,14);rowStart++){
  const pickedRows=[rows[rowStart],rows[(rowStart+3)%rows.length],rows[(rowStart+7)%rows.length]];
  for(let colStart=0;colStart<Math.min(cols.length,18);colStart++){
   const pickedCols=[cols[colStart],cols[(colStart+5)%cols.length],cols[(colStart+11)%cols.length]];
   const solutions=pickedRows.flatMap((row)=>pickedCols.map((col)=>allowed.filter((entry)=>row.test(entry.id)&&col.test(entry.id)).map((entry)=>entry.id)));
   if(solutions.every((items)=>items.length>=2)&&distinctGridSolution(solutions))return{rows:pickedRows,cols:pickedCols,solutions};
  }
 }
 const fallbackRows=GRID_ROWS.filter((item)=>["Grass type","Poison type","Water type"].includes(item.label.en));
 const fallbackCols=GRID_COLS.filter((item)=>["Blue body","Evolves onward","Under 1 metre"].includes(item.label.en));
 return{rows:fallbackRows,cols:fallbackCols,solutions:fallbackRows.flatMap((row)=>fallbackCols.map((col)=>allowed.filter((entry)=>row.test(entry.id)&&col.test(entry.id)).map((entry)=>entry.id)))};
}

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

export function buildDynamicCase(cap:number,seed=`case:${cap}`):DynamicCase {
 const safeCap=Math.max(1,Math.min(9,Math.floor(cap)));
 const allowed=SPECIES.filter((entry)=>entry.generation<=safeCap&&!entry.mythical);
 const target=allowed[seedHash(seed)%allowed.length];
 const similarity=(entry:typeof target)=>
  Number(entry.generation===target.generation)*3+
  Number(entry.color===target.color)*2+
  Number(entry.shape===target.shape)*2+
  Number(entry.habitat===target.habitat)*2+
  entry.types.filter((type)=>target.types.includes(type)).length*4+
  Math.max(0,3-Math.floor(Math.abs(entry.stats.speed-target.stats.speed)/25));
 const distractors=seededShuffle(allowed.filter((entry)=>entry.id!==target.id),`${seed}:suspects`)
  .sort((a,b)=>similarity(b)-similarity(a)).slice(0,11);
 const suspects=seededShuffle([target,...distractors],`${seed}:wall`);
 const speedBand=Math.floor(target.stats.speed/20)*20;
 const heightBand=Math.floor(target.heightM);
 const weightBand=Math.floor(target.weightKg/25)*25;
 const strongestStat=Object.entries(target.stats).sort((a,b)=>b[1]-a[1])[0][0] as keyof typeof target.stats;
 const pool:CaseClue[]=[
  {label:{en:`Introduced in Generation ${target.generation}`,de:`Eingeführt in Generation ${target.generation}`},test:(id)=>species(id).generation===target.generation},
  {label:{en:`Recorded color: ${target.color}`,de:`Erfasste Farbe: ${target.color}`},test:(id)=>species(id).color===target.color},
  {label:{en:`Includes type ${target.types[0]}`,de:`Besitzt Typ ${target.types[0]}`},test:(id)=>species(id).types.includes(target.types[0])},
  ...(target.types[1]?[{label:{en:`Its second type is ${target.types[1]}`,de:`Sein zweiter Typ ist ${target.types[1]}`},test:(id:number)=>species(id).types[1]===target.types[1]}]:[]),
  {label:{en:`Body shape class: ${target.shape}`,de:`Körperform-Klasse: ${target.shape}`},test:(id)=>species(id).shape===target.shape},
  {label:{en:`Habitat record: ${target.habitat}`,de:`Habitat-Eintrag: ${target.habitat}`},test:(id)=>species(id).habitat===target.habitat},
  {label:{en:`Speed band ${speedBand}–${speedBand+19}`,de:`Initiative-Band ${speedBand}–${speedBand+19}`},test:(id)=>Math.floor(species(id).stats.speed/20)*20===speedBand},
  {label:{en:`Height band ${heightBand}–${heightBand+1} m`,de:`Größenband ${heightBand}–${heightBand+1} m`},test:(id)=>Math.floor(species(id).heightM)===heightBand},
  {label:{en:`Weight band ${weightBand}–${weightBand+24} kg`,de:`Gewichtsband ${weightBand}–${weightBand+24} kg`},test:(id)=>Math.floor(species(id).weightKg/25)*25===weightBand},
  {label:{en:`Strongest base stat: ${strongestStat}`,de:`Stärkster Basiswert: ${strongestStat}`},test:(id)=>Object.entries(species(id).stats).sort((a,b)=>b[1]-a[1])[0][0]===strongestStat},
  {label:{en:target.evolvesFrom===null?"No recorded pre-evolution":"Has a recorded pre-evolution",de:target.evolvesFrom===null?"Keine Vorentwicklung erfasst":"Vorentwicklung erfasst"},test:(id)=>(species(id).evolvesFrom===null)===(target.evolvesFrom===null)},
  ...(target.abilities[0]?[{label:{en:`Ability record includes ${target.abilities[0]}`,de:`Fähigkeitseintrag enthält ${target.abilities[0]}`},test:(id:number)=>species(id).abilities.includes(target.abilities[0])}]:[]),
 ];
 let remaining=suspects;
 const clues:CaseClue[]=[];
 for(const clue of seededShuffle(pool,`${seed}:clues`).sort((a,b)=>remaining.filter((entry)=>a.test(entry.id)).length-remaining.filter((entry)=>b.test(entry.id)).length)){
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
