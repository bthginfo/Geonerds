import rawChart from "./data/type-chart.json";

export const STANDARD_TYPES = ["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"] as const;
type TypeName = typeof STANDARD_TYPES[number];
const chart = rawChart as Record<TypeName,{double:string[];half:string[];none:string[]}>;

export function typeMultiplier(attack:string, defenders:string[]) {
  const relation=chart[attack as TypeName];
  if(!relation) return 1;
  return defenders.reduce((value,defender)=>{
    if(relation.none.includes(defender)) return 0;
    if(relation.double.includes(defender)) return value*2;
    if(relation.half.includes(defender)) return value*.5;
    return value;
  },1);
}

export function typeBreakdown(attack:string,defenders:string[]) {
  return defenders.map((defender)=>({defender,multiplier:typeMultiplier(attack,[defender])}));
}

export const TYPE_COLORS:Record<string,string>={normal:"#9da17f",fire:"#f05b3e",water:"#3d92e8",electric:"#f4c94a",grass:"#55b65c",ice:"#66cfd4",fighting:"#c34337",poison:"#9d4cb2",ground:"#cfaa5e",flying:"#7fa6e9",psychic:"#ef5a91",bug:"#9ab33b",rock:"#aa914d",ghost:"#6656a2",dragon:"#6651dc",dark:"#4d4545",steel:"#7895a3",fairy:"#e482ad"};
export const TYPE_NAMES_DE:Record<string,string>={normal:"Normal",fire:"Feuer",water:"Wasser",electric:"Elektro",grass:"Pflanze",ice:"Eis",fighting:"Kampf",poison:"Gift",ground:"Boden",flying:"Flug",psychic:"Psycho",bug:"Käfer",rock:"Gestein",ghost:"Geist",dragon:"Drache",dark:"Unlicht",steel:"Stahl",fairy:"Fee"};
export const localizedType=(type:string,locale:"en"|"de")=>locale==="de"?(TYPE_NAMES_DE[type]??type):type;
