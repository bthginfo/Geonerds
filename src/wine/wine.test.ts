import { describe, expect, it } from "vitest";
import { APPELLATIONS, AROMAS, CELLAR_BRIEFS, DILEMMAS, EXAM_PROMPTS, GRAPES, PAIRINGS, REGIONS } from "./content";
import { questionsFor } from "./engine";
import { applyWineRun, dexStage, emptyWineProgression } from "./progression";
import { GRAPHICAL_WINE_GAME_IDS, WINE_GAME_IDS, WINE_GAMES } from "./registry";
import { WINE_STORAGE_KEYS } from "./store";
import { AROMA_WHEEL_FAMILIES, SAME_GRAPE_PAIRS, SERVICE_SCENARIOS, VINTAGE_SCENARIOS } from "./visual-content";

const unique=(values:string[])=>new Set(values).size===values.length;
describe("Wine-Nerds content",()=>{
 it("meets launch depth and bilingual requirements",()=>{
  expect(GRAPES.length).toBeGreaterThanOrEqual(30);
  expect(REGIONS.length).toBeGreaterThanOrEqual(35);
  expect(APPELLATIONS.length).toBeGreaterThanOrEqual(45);
  expect(AROMAS.length).toBeGreaterThanOrEqual(60);
  expect(PAIRINGS.length).toBeGreaterThanOrEqual(35);
  expect(DILEMMAS.length).toBeGreaterThanOrEqual(25);
  expect(CELLAR_BRIEFS.length).toBeGreaterThanOrEqual(25);
  expect(EXAM_PROMPTS.length).toBeGreaterThanOrEqual(80);
  expect(new Set(EXAM_PROMPTS.map(x=>x.competency))).toEqual(new Set(["grapes","terroir","geography","theory","sensory","pairing","production","service"]));
  for(const grape of GRAPES){expect(grape.climate.en).toBeTruthy();expect(grape.climate.de).toBeTruthy();expect(grape.clue.en).toBeTruthy();expect(grape.clue.de).toBeTruthy()}
 });
 it("has unique IDs, valid cross references and coordinates",()=>{
  for(const list of [GRAPES,REGIONS,APPELLATIONS,AROMAS])expect(unique(list.map(x=>x.id))).toBe(true);
  const grapeIds=new Set(GRAPES.map(x=>x.id)),regionIds=new Set(REGIONS.map(x=>x.id));
  for(const region of REGIONS){expect(region.lat).toBeGreaterThanOrEqual(-90);expect(region.lat).toBeLessThanOrEqual(90);expect(region.lng).toBeGreaterThanOrEqual(-180);expect(region.lng).toBeLessThanOrEqual(180);region.grapes.forEach(id=>expect(grapeIds.has(id)).toBe(true))}
  APPELLATIONS.forEach(a=>expect(regionIds.has(a.regionId)).toBe(true));
  AROMAS.forEach(a=>a.grapeIds.forEach(id=>expect(grapeIds.has(id)).toBe(true)));
 });
});
describe("Wine game engine",()=>{
 it("keeps registry and routes at fifteen distinct games",()=>{
  expect(WINE_GAMES).toHaveLength(15);expect(unique(WINE_GAME_IDS)).toBe(true);
  expect(GRAPHICAL_WINE_GAME_IDS).toHaveLength(13);
  GRAPHICAL_WINE_GAME_IDS.forEach(id=>expect(WINE_GAME_IDS).toContain(id));
 });
 it("creates thousands of safe choice rounds with one included answer",()=>{
  const ids=["terroir-detective","grape-dna","aroma-atelier","pairing-duel","label-decoder","wine-map"] as const;
  let checked=0;
  for(let seed=1;seed<=50;seed++)for(const id of ids)for(const q of questionsFor(id,seed).slice(0,8)){
   expect(unique(q.choices.map(c=>c.id))).toBe(true);expect(q.choices.filter(c=>c.id===q.answer)).toHaveLength(1);checked++;
  }
  expect(checked).toBeGreaterThan(1000);
 });
});
describe("Wine visual content",()=>{
 it("uses explicit aroma families for every playable grape aroma",()=>{
  const classified=new Set(AROMA_WHEEL_FAMILIES.flatMap(f=>f.tokens));
  const missing=[...new Set(GRAPES.flatMap(g=>g.aromas).filter(aroma=>!classified.has(aroma)))];
  expect(missing).toEqual([]);
 });
 it("cross-references curated comparison pairs",()=>{
  const grapeIds=new Set(GRAPES.map(g=>g.id)),regionIds=new Set(REGIONS.map(r=>r.id));
  expect(SAME_GRAPE_PAIRS.length).toBeGreaterThanOrEqual(5);
  for(const pair of SAME_GRAPE_PAIRS){expect(grapeIds.has(pair.grapeId)).toBe(true);expect(regionIds.has(pair.regionAId)).toBe(true);expect(regionIds.has(pair.regionBId)).toBe(true);expect(REGIONS.find(r=>r.id===pair.regionAId)?.grapes).toContain(pair.grapeId);expect(REGIONS.find(r=>r.id===pair.regionBId)?.grapes).toContain(pair.grapeId);expect(pair.tendencies).toHaveLength(4)}
 });
 it("has deep bilingual simulator and service content",()=>{
  expect(VINTAGE_SCENARIOS.length).toBeGreaterThanOrEqual(6);
  VINTAGE_SCENARIOS.forEach(s=>{expect(s.title.en).toBeTruthy();expect(s.title.de).toBeTruthy();expect(s.stages).toHaveLength(4);s.stages.forEach(stage=>expect(stage.choices.length).toBeGreaterThanOrEqual(2))});
  expect(SERVICE_SCENARIOS.length).toBeGreaterThanOrEqual(12);
  SERVICE_SCENARIOS.forEach(s=>{expect(s.title.en).toBeTruthy();expect(s.title.de).toBeTruthy();expect(Object.keys(s.answers)).toHaveLength(4)});
 });
});
describe("Wine progression isolation",()=>{
 it("does not persist practice runs",()=>{
  const empty=emptyWineProgression();const next=applyWineRun(empty,{id:"p",gameId:"grape-dna",score:999,correct:5,total:5,bestStreak:5,durationMs:1,difficulty:"hard",practice:true,createdAt:Date.now()});
  expect(next).toBe(empty);
 });
 it("uses Wine-only keys and staged Dex thresholds",()=>{
  Object.values(WINE_STORAGE_KEYS).forEach(key=>{expect(key.startsWith("wine-nerds-")).toBe(true);expect(key.startsWith("geonerds-")).toBe(false)});
  expect(dexStage()).toBe("sealed");
  expect(dexStage({id:"x",type:"grape",correct:1,games:["a"],favorite:false})).toBe("tasted");
  expect(dexStage({id:"x",type:"grape",correct:6,games:["a","b"],favorite:false})).toBe("certified");
  expect(dexStage({id:"x",type:"grape",correct:12,games:["a","b","c","d"],favorite:false})).toBe("mastered");
 });
});
