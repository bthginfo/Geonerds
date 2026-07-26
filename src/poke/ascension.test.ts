import {describe,expect,it} from "vitest";
import {buildAscensionRoutes,cardBaseDamage,cardEnergyCost,finishResonance} from "./ascension";
import {createCard} from "./cards";
import {species} from "./data";

const deck=[1,4,7,25].map((id,index)=>createCard(species(id),`test-${index}`,index===3?"holo":"standard"));

describe("Binder Ascension",()=>{
 it("builds deterministic, distinct, generation-scoped route branches",()=>{
  const a=buildAscensionRoutes(1,3,"tower-seed",deck,"medium"),b=buildAscensionRoutes(1,3,"tower-seed",deck,"medium");
  expect(a).toEqual(b);
  expect(a.map((route)=>route.kind)).toEqual(["safe","research","elite"]);
  expect(new Set(a.map((route)=>route.opponent.id)).size).toBe(3);
  a.forEach((route)=>expect(route.opponent.generation).toBeLessThanOrEqual(1));
 });
 it("varies fresh openings and keeps card economy and finish resonance bounded",()=>{
  const a=buildAscensionRoutes(9,0,"alpha",deck,"medium"),b=buildAscensionRoutes(9,0,"beta",deck,"medium");
  expect(a.map((route)=>route.opponent.id)).not.toEqual(b.map((route)=>route.opponent.id));
  expect(cardEnergyCost(species(1))).toBe(1);
  expect(cardEnergyCost(species(6))).toBe(2);
  expect(cardBaseDamage(species(6))).toBeGreaterThan(cardBaseDamage(species(1)));
  expect(finishResonance("gold").damage).toBeLessThanOrEqual(3);
 });
});
