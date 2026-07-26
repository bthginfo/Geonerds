export interface MapNode {id:string;name:{en:string;de:string};x:number;y:number;kind:"town"|"landmark"|"route";kanto:true;encounters:number[];version:"firered"}
export const MAP_NODES:MapNode[]=[
 {id:"pallet",name:{en:"Pallet Town",de:"Alabastia"},x:34,y:82,kind:"town",kanto:true,encounters:[16,19],version:"firered"},
 {id:"viridian",name:{en:"Viridian City",de:"Vertania City"},x:31,y:68,kind:"town",kanto:true,encounters:[19,21,29,32],version:"firered"},
 {id:"forest",name:{en:"Viridian Forest",de:"Vertania-Wald"},x:34,y:54,kind:"landmark",kanto:true,encounters:[10,11,13,14,25],version:"firered"},
 {id:"pewter",name:{en:"Pewter City",de:"Marmoria City"},x:31,y:42,kind:"town",kanto:true,encounters:[16,19,21],version:"firered"},
 {id:"moon",name:{en:"Mt. Moon",de:"Mondberg"},x:46,y:38,kind:"landmark",kanto:true,encounters:[41,46,74],version:"firered"},
 {id:"cerulean",name:{en:"Cerulean City",de:"Azuria City"},x:61,y:35,kind:"town",kanto:true,encounters:[19,21,23,27],version:"firered"},
 {id:"rock-tunnel",name:{en:"Rock Tunnel",de:"Felstunnel"},x:78,y:45,kind:"landmark",kanto:true,encounters:[41,66,74,95],version:"firered"},
 {id:"lavender",name:{en:"Lavender Town",de:"Lavandia"},x:77,y:61,kind:"town",kanto:true,encounters:[92,93,104],version:"firered"},
 {id:"celadon",name:{en:"Celadon City",de:"Prismania City"},x:56,y:57,kind:"town",kanto:true,encounters:[19,52,58],version:"firered"},
 {id:"saffron",name:{en:"Saffron City",de:"Saffronia City"},x:65,y:57,kind:"town",kanto:true,encounters:[52,63],version:"firered"},
 {id:"vermilion",name:{en:"Vermilion City",de:"Orania City"},x:66,y:74,kind:"town",kanto:true,encounters:[19,21,52,96],version:"firered"},
 {id:"fuchsia",name:{en:"Fuchsia City",de:"Fuchsania City"},x:57,y:86,kind:"town",kanto:true,encounters:[29,32,102,111,115,123,127],version:"firered"},
 {id:"seafoam",name:{en:"Seafoam Islands",de:"Seeschauminseln"},x:35,y:92,kind:"landmark",kanto:true,encounters:[41,54,86,90,98],version:"firered"},
 {id:"cinnabar",name:{en:"Cinnabar Island",de:"Zinnoberinsel"},x:24,y:91,kind:"town",kanto:true,encounters:[58,77,88,109],version:"firered"},
];
export const MAP_EDGES:[string,string][]=[
 ["pallet","viridian"],["viridian","forest"],["forest","pewter"],["pewter","moon"],["moon","cerulean"],["cerulean","rock-tunnel"],["rock-tunnel","lavender"],["lavender","saffron"],["saffron","celadon"],["saffron","vermilion"],["vermilion","fuchsia"],["fuchsia","seafoam"],["seafoam","cinnabar"],["cinnabar","pallet"],
];
export const RANGER_TARGETS=MAP_NODES.filter((node)=>node.kind!=="route");

