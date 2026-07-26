import {describe,expect,it} from "vitest";
import {POKE_GAME_IDS} from "./registry";
import {SPECIES,SPECIES_BY_ID} from "./data";
import {STANDARD_TYPES,typeMultiplier} from "./type-chart";
import {EVOLUTION_FAMILIES,CASE_CLUES,CASE_SUSPECTS,CASE_TARGET,buildDynamicCase,gridSolutions,isGridPlacementValid} from "./fixtures";
import {MAP_EDGES,MAP_NODES} from "./maps";
import {POKE_STORAGE_KEYS} from "./store";
import {BOOSTER_SIZE,canSpendCredits,generateBooster,rarityForRoll,validKeepSelection} from "./cards";
import {applyPokeRun,emptyPokeProgression} from "./progression";

describe("Poke-Nerds launch integrity",()=>{
 it("registers exactly ten unique games",()=>{expect(POKE_GAME_IDS).toHaveLength(10);expect(new Set(POKE_GAME_IDS).size).toBe(10)});
 it("contains 1,025 unique localized default species in correct cumulative caps",()=>{
  expect(SPECIES).toHaveLength(1025);expect(new Set(SPECIES.map((entry)=>entry.id)).size).toBe(1025);
  expect(new Set(SPECIES.map((entry)=>entry.name.en)).size).toBe(1025);expect(new Set(SPECIES.map((entry)=>entry.name.de)).size).toBe(1025);
  expect(SPECIES.filter((entry)=>entry.generation<=1)).toHaveLength(151);expect(SPECIES.filter((entry)=>entry.generation<=2)).toHaveLength(251);expect(SPECIES.filter((entry)=>entry.generation<=3)).toHaveLength(386);expect(SPECIES.filter((entry)=>entry.generation<=9)).toHaveLength(1025);
 });
 it("uses all 18 modern types and exact multiplied relations",()=>{
  expect(STANDARD_TYPES).toHaveLength(18);expect(new Set(STANDARD_TYPES).size).toBe(18);
  expect(typeMultiplier("electric",["ground"])).toBe(0);expect(typeMultiplier("ice",["dragon","flying"])).toBe(4);expect(typeMultiplier("fire",["water","dragon"])).toBe(.25);
 });
 it("has an acyclic evolution fixture graph with valid targets",()=>{
  const edges=EVOLUTION_FAMILIES.flatMap((family)=>[...family.edges]) as {from:number;to:number}[];for(const edge of edges){expect(SPECIES_BY_ID.has(edge.from)).toBe(true);expect(SPECIES_BY_ID.has(edge.to)).toBe(true)}
  const visit=(id:number,path=new Set<number>())=>{expect(path.has(id)).toBe(false);const next=new Set(path).add(id);edges.filter((edge)=>edge.from===id).forEach((edge)=>visit(edge.to,next))};EVOLUTION_FAMILIES.forEach((family)=>visit(family.nodes[0]));
 });
 it("keeps every map edge and encounter explicitly Kanto FireRed",()=>{
  const ids=new Set(MAP_NODES.map((node)=>node.id));
  MAP_EDGES.forEach(([a,b])=>{expect(ids.has(a)).toBe(true);expect(ids.has(b)).toBe(true)});
  MAP_NODES.forEach((node)=>{expect(node.kanto).toBe(true);expect(node.version).toBe("firered");node.encounters.forEach((id)=>expect(SPECIES_BY_ID.has(id)).toBe(true))});
 });
 it("ships a dense grid with a nine-distinct-species solution",()=>{
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)expect(gridSolutions(row,col).filter((entry)=>entry.generation===1).length).toBeGreaterThanOrEqual(3);
  const search=(cell:number,used:Set<number>):boolean=>{if(cell===9)return true;const row=Math.floor(cell/3),col=cell%3;return gridSolutions(row,col).filter((entry)=>entry.generation===1&&!used.has(entry.id)).some((entry)=>search(cell+1,new Set(used).add(entry.id)))};expect(search(0,new Set())).toBe(true);
  expect(isGridPlacementValid(43,0,0,[])).toBe(true);expect(isGridPlacementValid(25,0,0,[])).toBe(false);expect(isGridPlacementValid(43,0,0,[43])).toBe(false);
 });
 it("ships true Case File clues ending in exactly one candidate for every generation cap",()=>{
  CASE_CLUES.forEach((clue)=>expect(clue.test(CASE_TARGET.id)).toBe(true));const remaining=CASE_SUSPECTS.filter((entry)=>CASE_CLUES.every((clue)=>clue.test(entry.id)));expect(remaining.map((entry)=>entry.id)).toEqual([CASE_TARGET.id]);
  for(let cap=1;cap<=9;cap++){const dossier=buildDynamicCase(cap);dossier.clues.forEach((clue)=>expect(clue.test(dossier.target.id)).toBe(true));expect(dossier.suspects.filter((entry)=>dossier.clues.every((clue)=>clue.test(entry.id))).map((entry)=>entry.id)).toEqual([dossier.target.id])}
 });
 it("uses Poke-only storage namespaces",()=>{Object.values(POKE_STORAGE_KEYS).forEach((key)=>expect(key.startsWith("poke-nerds-")).toBe(true))});
 it("generates deterministic five-card, generation-scoped research sets",()=>{const a=generateBooster(3,"fixed"),b=generateBooster(3,"fixed");expect(a).toHaveLength(BOOSTER_SIZE);expect(a).toEqual(b);a.forEach((card)=>expect(SPECIES_BY_ID.get(card.speciesId)?.generation).toBe(3));expect(rarityForRoll(.54)).toBe("common");expect(rarityForRoll(.55)).toBe("uncommon");expect(rarityForRoll(.995)).toBe("mythic")});
 it("requires exactly two valid kept cards",()=>{const pack=generateBooster(1,"keep");expect(validKeepSelection(pack,[pack[0].id,pack[1].id])).toBe(true);expect(validKeepSelection(pack,[pack[0].id])).toBe(false);expect(validKeepSelection(pack,[pack[0].id,pack[0].id])).toBe(false)});
 it("earns credits without spending XP and rejects negative balances",()=>{const start=emptyPokeProgression();const next=applyPokeRun(start,{id:"x",gameId:"field-scanner",score:900,correct:1,total:1,difficulty:"medium",practice:false,speciesIds:[25],createdAt:0});expect(next.xp).toBeGreaterThan(start.xp);expect(next.researchCredits).toBeGreaterThan(start.researchCredits);expect(canSpendCredits(50,60)).toBe(false);expect(canSpendCredits(60,60)).toBe(true);expect(canSpendCredits(60,-1)).toBe(false)});
});
