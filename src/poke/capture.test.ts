import {describe,expect,it} from "vitest";
import {captureChance,captureTelemetry,captureTierForSpecies,classifyThrow,generateCaptureEncounters,projectDragThrow,resolveCaptureAttempt} from "./capture";

describe("Field Capture",()=>{
 it("generates deterministic generation-scoped encounters with weighted rarity",()=>{
  const fixed=generateCaptureEncounters(3,20,"fixed"),again=generateCaptureEncounters(3,20,"fixed"),fresh=generateCaptureEncounters(3,20,"fresh");
  expect(fixed).toEqual(again);expect(fixed.map((entry)=>entry.id)).not.toEqual(fresh.map((entry)=>entry.id));
  fixed.forEach((entry)=>expect(entry.generation).toBeLessThanOrEqual(3));
  const sample=Array.from({length:800},(_,index)=>generateCaptureEncounters(9,1,`weight-${index}`)[0]);
  const counts=sample.reduce<Record<string,number>>((sum,entry)=>{const tier=captureTierForSpecies(entry);sum[tier]=(sum[tier]??0)+1;return sum},{});
  expect(counts.common).toBeGreaterThan(counts.uncommon);expect(counts.uncommon).toBeGreaterThan(counts.rare);expect(counts.legendary).toBeLessThan(counts.rare);
 });
 it("classifies accuracy, aperture timing, direction and curve without velocity gates",()=>{
  expect(classifyThrow({accuracy:.92,ring:.32,direction:.9,speed:.2,curve:true})).toBe("excellent");
  expect(classifyThrow({accuracy:.72,ring:.58,direction:.8,speed:.15,curve:false})).toBe("great");
  expect(classifyThrow({accuracy:.92,ring:.32,direction:.9,speed:.04,curve:false})).toBe("nice");
  expect(classifyThrow({accuracy:.2,ring:.3,direction:.9,speed:1,curve:false})).toBe("miss");
 });
 it("keeps catch modifiers visible, bounded and deterministic",()=>{
  const base=captureChance({tier:"rare",quality:"nice",curve:false,ball:"field",berry:false});
  const helped=captureChance({tier:"rare",quality:"excellent",curve:true,ball:"advanced",berry:true});
  expect(helped).toBeGreaterThan(base);expect(helped).toBeLessThanOrEqual(.92);
  expect(captureTelemetry("legendary","field",false)).toBe("low");
  const input={speciesId:25,tier:"rare" as const,quality:"great" as const,curve:true,ball:"advanced" as const,berry:true,attempt:1,seed:"fixed"};
  expect(resolveCaptureAttempt(input)).toEqual(resolveCaptureAttempt(input));
 });
 it("projects direct releases and ordinary upward drags into the target band",()=>{
  const direct=projectDragThrow({start:{x:187.5,y:550},end:{x:190,y:245},sceneWidth:375,sceneHeight:600});
  expect(direct.impact.x).toBeCloseTo(190);expect(direct.impact.y).toBeCloseTo(245);expect(direct.goodAim).toBe(true);
  const ordinary=projectDragThrow({start:{x:187.5,y:550},end:{x:187.5,y:442},sceneWidth:375,sceneHeight:600});
  expect(ordinary.goodAim).toBe(true);
  expect(classifyThrow({accuracy:ordinary.accuracy,ring:1,direction:ordinary.direction,speed:ordinary.speed,curve:false})).toBe("nice");
 });
 it("dampens modest drift, rejects strong sideways aim and ignores tiny taps",()=>{
  const drift=projectDragThrow({start:{x:187.5,y:550},end:{x:230,y:442},sceneWidth:375,sceneHeight:600});
  expect(drift.goodAim).toBe(true);
  const sideways=projectDragThrow({start:{x:187.5,y:550},end:{x:367.5,y:460},sceneWidth:375,sceneHeight:600});
  expect(sideways.goodAim).toBe(false);
  const tap=projectDragThrow({start:{x:187.5,y:550},end:{x:191,y:544},sceneWidth:375,sceneHeight:600});
  expect(tap.isThrow).toBe(false);
 });
 it("keeps displacement projection independent from gesture timing and sample frequency",()=>{
  const input={start:{x:187.5,y:550},end:{x:205,y:410},sceneWidth:375,sceneHeight:600};
  expect(projectDragThrow(input)).toEqual(projectDragThrow(input));
 });
});
