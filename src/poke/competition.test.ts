import {describe,expect,it} from "vitest";
import {canTransitionChallenge,challengePlayBlockReason,compareRankedRuns,eloPair,isPlausibleRankedRun,leagueTier,normalizedPokeRating,qualifiesAtlasClearance,viewerChallengeOutcome} from "./competition";

const run={gameId:"poke-grid" as const,difficulty:"medium" as const,generationCap:9,selectedRounds:10 as const,score:9000,correct:45,questions:50,completedRounds:10,speciesIds:[25],durationMs:60_000};

describe("Poke competition contract",()=>{
 it("never derives accuracy above 100 percent and rewards honest completion",()=>{
  expect(isPlausibleRankedRun({...run,correct:51})).toBe(false);
  expect(normalizedPokeRating(run)).toBe(935);
  expect(normalizedPokeRating({...run,completedRounds:5})).toBeLessThan(normalizedPokeRating(run));
 });
 it("sorts by normalized rating, then correctness and lower duration",()=>{
  expect(compareRankedRuns(run,{...run,correct:40})).toBeLessThan(0);
  expect(compareRankedRuns(run,{...run,durationMs:90_000})).toBeLessThan(0);
 });
 it("uses stable league boundaries",()=>{
  expect(leagueTier(1049)).toBe("bronze");expect(leagueTier(1050)).toBe("silver");expect(leagueTier(1250)).toBe("gold");expect(leagueTier(1500)).toBe("platinum");expect(leagueTier(1800)).toBe("master");
 });
 it("keeps Elo symmetric for wins and draws",()=>{
  const win=eloPair(1000,1000,1),draw=eloPair(1200,1000,.5);
  expect(win.a-1000).toBe(-(win.b-1000));expect(draw.a-1200).toBe(-(draw.b-1000));expect(draw.a).toBeLessThan(1200);
 });
 it("allows only participant-safe pending transitions",()=>{
  expect(canTransitionChallenge("pending","accept")).toBe("active");expect(canTransitionChallenge("pending","decline")).toBe("declined");expect(canTransitionChallenge("pending","cancel")).toBe("cancelled");expect(canTransitionChallenge("active","cancel")).toBeNull();expect(canTransitionChallenge("pending","accept",true)).toBeNull();
 });
 it("blocks pending, resolved, seedless and already-submitted challenge play",()=>{
  expect(challengePlayBlockReason({status:"pending",seed:null})).toBe("challenge_pending");
  expect(challengePlayBlockReason({status:"resolved",seed:"seed"})).toBe("challenge_resolved");
  expect(challengePlayBlockReason({status:"active",seed:null})).toBe("challenge_seed_unavailable");
  expect(challengePlayBlockReason({status:"active",seed:"seed",viewerAttempted:true})).toBe("challenge_attempt_already_submitted");
  expect(challengePlayBlockReason({status:"active",seed:"seed"})).toBeNull();
 });
 it("awards atlas clearance only for a complete generation-nine map run",()=>{
  expect(qualifiesAtlasClearance({...run,gameId:"region-ranger",generationCap:9})).toBe(true);
  expect(qualifiesAtlasClearance({...run,gameId:"poke-grid",generationCap:9})).toBe(false);
  expect(qualifiesAtlasClearance({...run,gameId:"region-ranger",generationCap:8})).toBe(false);
  expect(qualifiesAtlasClearance({...run,gameId:"region-ranger",generationCap:9,completedRounds:5})).toBe(false);
 });
 it("derives a resolved challenge outcome from the viewer perspective",()=>{
  expect(viewerChallengeOutcome("resolved","trainer-a","trainer-a")).toBe("win");
  expect(viewerChallengeOutcome("resolved","trainer-a","trainer-b")).toBe("loss");
  expect(viewerChallengeOutcome("resolved",null,"trainer-a")).toBe("draw");
  expect(viewerChallengeOutcome("active",null,"trainer-a")).toBeNull();
 });
});
