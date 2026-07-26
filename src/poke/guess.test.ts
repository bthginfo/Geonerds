import {describe,expect,it} from "vitest";
import {buildGuessOptions,buildGuessTargets,matchesSpeciesName,normalizePokemonName} from "./guess";
import {species} from "./data";

describe("Guess That Pokémon",()=>{
 it("matches localized names with normalized accents, punctuation and whitespace",()=>{
  expect(matchesSpeciesName("  Flabébé ",species(669))).toBe(true);
  expect(matchesSpeciesName("Farfetchd",species(83))).toBe(true);
  expect(normalizePokemonName("Mr. Mime")).toBe(normalizePokemonName("mr mime"));
  expect(matchesSpeciesName("Pikachu",species(25))).toBe(true);
  expect(matchesSpeciesName("Raichu",species(25))).toBe(false);
 });
 it("builds deterministic non-repeating scoped targets and four plausible options",()=>{
  const a=buildGuessTargets(4,3,20,"fixed"),b=buildGuessTargets(4,3,20,"fixed"),fresh=buildGuessTargets(4,3,20,"fresh");
  expect(a).toEqual(b);expect(a.map((entry)=>entry.id)).not.toEqual(fresh.map((entry)=>entry.id));
  expect(new Set(a.map((entry)=>entry.id)).size).toBe(20);a.forEach((entry)=>expect(entry.generation).toBe(3));
  const options=buildGuessOptions(a[0],"medium","fixed",0);
  expect(options).toHaveLength(4);expect(options).toContainEqual(a[0]);options.forEach((entry)=>expect(entry.generation).toBe(a[0].generation));
 });
});
