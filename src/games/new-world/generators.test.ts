import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import type { Difficulty } from "@/lib/types";
import { buildRelayMission, evaluateRelay, meetsRelayCondition, relayPoints } from "@/games/atlas-relay/generator";
import { buildWorldCircuitRounds, circuitDistance, evaluateCircuit, optimalCircuit } from "@/games/world-circuit/generator";
import { buildLatitudeRounds, evaluateLatitude } from "@/games/latitude-lab/generator";
import { buildCoastlineRounds, coastlinePoints, COAST_FRAGMENTS, COAST_META } from "@/games/coastline-case/generator";
import { buildClimateRounds, climateDistance, climateInsights, climatePoints, CLIMATE_META, CLIMATE_PROFILES, CLIMATE_SEPARATION } from "@/games/climate-passport/generator";
import { validGeoScore } from "@/lib/score-validation";

const difficulties: Difficulty[] = ["easy", "medium", "hard"];

it("accepts the five registered result contracts in the existing score boundary", () => {
  for (const gameId of ["atlas-relay", "world-circuit", "latitude-lab", "coastline-case", "climate-passport"]) {
    const run = { gameId, difficulty: "medium", mode: "choice", score: 5000, correct: 5, total: 5, bestStreak: 5, durationMs: 60_000 };
    expect(validGeoScore(run)).toBe(true);
    expect(validGeoScore({ ...run, correct: 6 })).toBe(false);
    expect(validGeoScore({ ...run, score: NaN })).toBe(false);
  }
});

describe("Atlas Relay: complete answer sets and branching routes", () => {
  it.each(difficulties)("has solvable, non-repeating %s journeys, accepting every valid country", (difficulty) => {
    const visited: string[] = [];
    for (let index = 0; index < 25; index++) {
      const settings = { difficulty, seed: "relay-integrity", index, previousId: visited.at(-1), visitedIds: visited };
      const mission = buildRelayMission(settings);
      expect(buildRelayMission(settings)).toEqual(mission);
      expect(mission.answerIds.length).toBeGreaterThanOrEqual(3);
      const allValid = COUNTRIES.filter((country) => !visited.includes(country.cca3) && mission.conditions.every((rule) => meetsRelayCondition(country, rule))).map((country) => country.cca3);
      expect(mission.answerIds).toEqual(allValid);
      for (const id of allValid) expect(evaluateRelay(mission, id).valid).toBe(true);
      for (const id of visited) expect(evaluateRelay(mission, id).valid).toBe(false);
      expect(evaluateRelay(mission, "INVALID").valid).toBe(false);
      expect(new Set(mission.conditions.map((rule) => rule.kind)).size).toBe(mission.conditions.length);
      visited.push(allValid[index % allValid.length]);
    }
  });
  it("changes starting missions between independent seeds", () => {
    const missions = Array.from({ length: 10 }, (_, index) => buildRelayMission({ difficulty: "medium", seed: `new:${index}`, index: 0 }).conditions.map((rule) => rule.id).join("|"));
    expect(new Set(missions).size).toBeGreaterThan(5);
    expect([0, 1, 2].map(relayPoints)).toEqual([1000, 800, 600]);
  });
});

describe("World Circuit: exact geometry and attainable budgets", () => {
  it.each(difficulties)("deals distinct deterministic %s circuits with a budget-feasible optimum", (difficulty) => {
    const rounds = buildWorldCircuitRounds(difficulty, 10, "circuit-integrity");
    expect(rounds).toHaveLength(10);
    expect(buildWorldCircuitRounds(difficulty, 10, "circuit-integrity")).toEqual(rounds);
    expect(new Set(rounds.map((round) => [round.hub, ...round.stops].map((city) => city.id).sort().join("|"))).size).toBe(rounds.length);
    for (const round of rounds) {
      const answer = evaluateCircuit(round, round.optimalRoute);
      expect(answer.valid && answer.correct).toBe(true);
      expect(answer.distanceKm).toBeCloseTo(round.optimalKm, 4);
      expect(answer.ratio).toBe(1);
      expect(answer.points).toBe(round.bonus ? 900 : 1000);
      expect(round.fuelKm).toBeGreaterThanOrEqual(round.optimalKm);
      expect(evaluateCircuit(round, round.optimalRoute.slice(1)).valid).toBe(false);
      expect(evaluateCircuit(round, [...round.optimalRoute, round.optimalRoute[0]]).valid).toBe(false);
      expect(evaluateCircuit(round, [...round.optimalRoute, "unknown"] ).valid).toBe(false);
      expect(evaluateCircuit(round, [...round.optimalRoute].reverse()).distanceKm).toBeCloseTo(answer.distanceKm, 5);
      if (round.bonus) {
        const optimum = optimalCircuit(round.hub, [...round.stops, round.bonus]);
        const bonus = evaluateCircuit(round, optimum.route);
        expect(bonus.correct && bonus.bonusIncluded).toBe(true);
        expect(bonus.points).toBe(1000);
      }
    }
  });
  it("returns zero for a round trip with no stops and a finite practice pack", () => {
    const round = buildWorldCircuitRounds("easy", 1, "hub")[0];
    expect(circuitDistance(round.hub, [])).toBe(0);
    expect(optimalCircuit(round.hub, [])).toEqual({ route: [], distanceKm: 0 });
    expect(buildWorldCircuitRounds("easy", 0, "practice")).toHaveLength(25);
    expect(buildWorldCircuitRounds("easy", 1, "other")[0].hub.id).not.toBe(round.hub.id);
  });
});

describe("Latitude Lab: continuous placement and explicit success rules", () => {
  it.each(difficulties)("generates distinct %s city boards and validates placements", (difficulty) => {
    const rounds = buildLatitudeRounds(difficulty, 10, "latitude-integrity");
    expect(rounds).toHaveLength(10);
    expect(buildLatitudeRounds(difficulty, 10, "latitude-integrity")).toEqual(rounds);
    for (const round of rounds) {
      expect(new Set(round.cities.map((city) => city.cca3)).size).toBe(round.cities.length);
      const perfect = Object.fromEntries(round.cities.map((city) => [city.id, city.lat]));
      expect(evaluateLatitude(round, perfect)).toMatchObject({ valid: true, correct: true, points: 1000, meanError: 0 });
      expect(evaluateLatitude(round, {}).valid).toBe(false);
      expect(evaluateLatitude(round, { ...perfect, extra: 0 }).valid).toBe(false);
      expect(evaluateLatitude(round, { ...perfect, [round.cities[0].id]: NaN }).valid).toBe(false);
      expect(evaluateLatitude(round, { ...perfect, [round.cities[0].id]: 91 }).valid).toBe(false);
      const bad = Object.fromEntries(round.cities.map((city) => [city.id, city.lat > 0 ? -90 : 90]));
      expect(evaluateLatitude(round, bad)).toMatchObject({ valid: true, correct: false, points: 0 });
    }
    expect(buildLatitudeRounds(difficulty, 0, "practice")).toHaveLength(25);
  });
});

describe("Coastline Case: genuine coast, never a shared land border", () => {
  it("retains reproducible provenance and broad country coverage", () => {
    const source = readFileSync("public/geo/countries-10m.json");
    expect(createHash("sha256").update(source).digest("hex")).toBe(COAST_META.sourceSha256);
    const topology = JSON.parse(source.toString());
    const owners = new Map<number, Set<string>>();
    const outer = new Map<string, Set<number>>();
    for (const geometry of topology.objects.countries.geometries) {
      const numeric = String(geometry.id).padStart(3, "0");
      const rings: number[][] = geometry.type === "Polygon" ? geometry.arcs : geometry.type === "MultiPolygon" ? geometry.arcs.flat() : [];
      for (const ring of rings) for (const ref of ring) {
        const arc = ref < 0 ? ~ref : ref;
        if (!owners.has(arc)) owners.set(arc, new Set());
        owners.get(arc)!.add(numeric);
      }
      const outerRings: number[][] = geometry.type === "Polygon" ? [geometry.arcs[0]] : geometry.type === "MultiPolygon" ? geometry.arcs.map((polygon: number[][]) => polygon[0]) : [];
      outer.set(numeric, new Set([...(outer.get(numeric) ?? []), ...outerRings.flat().map((ref) => ref < 0 ? ~ref : ref)]));
    }
    expect(new Set(COAST_FRAGMENTS.map((fragment) => fragment.cca3)).size).toBeGreaterThanOrEqual(100);
    expect(new Set(COAST_FRAGMENTS.map((fragment) => fragment.id)).size).toBe(COAST_FRAGMENTS.length);
    for (const fragment of COAST_FRAGMENTS) {
      const country = getCountryByCca3(fragment.cca3)!;
      expect(country.landlocked).toBe(false);
      expect(owners.get(fragment.sourceArc)?.size).toBe(1);
      expect(owners.get(fragment.sourceArc)?.has(country.ccn3!)).toBe(true);
      expect(outer.get(country.ccn3!)?.has(fragment.sourceArc)).toBe(true);
      expect(fragment.lengthKm).toBeGreaterThanOrEqual(25);
      expect(fragment.coordinates.length).toBeGreaterThanOrEqual(8);
      expect(fragment.coordinates.length).toBeLessThanOrEqual(180);
      for (const [index, [lng, lat]] of fragment.coordinates.entries()) {
        expect(Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90).toBe(true);
        if (index > 0) expect(Math.abs(lng - fragment.coordinates[index - 1][0])).toBeLessThanOrEqual(180);
      }
    }
  });
  it.each(difficulties)("deals each eligible %s country once with unambiguous options", (difficulty) => {
    const rounds = buildCoastlineRounds(difficulty, 0, "coast-integrity");
    expect(rounds.length).toBeGreaterThan(20);
    expect(buildCoastlineRounds(difficulty, 0, "coast-integrity")).toEqual(rounds);
    expect(new Set(rounds.map((round) => round.answer.cca3)).size).toBe(rounds.length);
    for (const round of rounds) {
      expect(round.fragment.cca3).toBe(round.answer.cca3);
      expect(new Set(round.options.map((country) => country.cca3)).size).toBe(4);
      expect(round.options.filter((country) => country.cca3 === round.answer.cca3)).toHaveLength(1);
      expect(round.options.every((country) => !country.landlocked)).toBe(true);
    }
    expect(buildCoastlineRounds(difficulty, 5, "other").map((round) => round.answer.cca3)).not.toEqual(rounds.slice(0, 5).map((round) => round.answer.cca3));
  });
});

describe("Climate Passport: comparable real climatology and fair distractors", () => {
  it("ships 65 consistent 1991–2020 profiles with full source links", () => {
    expect(CLIMATE_PROFILES).toHaveLength(65);
    expect(new Set(CLIMATE_PROFILES.map((profile) => profile.id)).size).toBe(65);
    expect(CLIMATE_META).toMatchObject({ periodStart: 1991, periodEnd: 2020, model: "MERRA-2" });
    expect(CLIMATE_META.meanMonthDays[1]).toBeCloseTo(28 + 8 / 30);
    expect(CLIMATE_PROFILES.some((profile) => profile.lat < 0)).toBe(true);
    for (const profile of CLIMATE_PROFILES) {
      expect(getCountryByCca3(profile.cca3)).toBeDefined();
      expect(profile.temperatureC).toHaveLength(12);
      expect(profile.precipitationMm).toHaveLength(12);
      expect(profile.temperatureC.every((value) => Number.isFinite(value) && value > -80 && value < 65)).toBe(true);
      expect(profile.precipitationMm.every((value) => Number.isFinite(value) && value >= 0 && value < 3000)).toBe(true);
      const url = new URL(profile.sourceUrl);
      expect(url.hostname).toBe("power.larc.nasa.gov");
      expect(url.searchParams.get("start")).toBe("1991");
      expect(url.searchParams.get("end")).toBe("2020");
      for (const locale of ["en", "de"] as const) expect(climateInsights(profile, locale)).toHaveLength(3);
    }
  });
  it.each(difficulties)("keeps %s alternatives measurably distinct, without repeating profiles", (difficulty) => {
    const rounds = buildClimateRounds(difficulty, 0, "climate-integrity");
    expect(rounds.length).toBeGreaterThanOrEqual(60);
    expect(buildClimateRounds(difficulty, 0, "climate-integrity")).toEqual(rounds);
    expect(new Set(rounds.map((round) => round.answer.id)).size).toBe(rounds.length);
    for (const round of rounds) {
      expect(new Set(round.options.map((option) => option.id)).size).toBe(4);
      expect(new Set(round.options.map((option) => option.cca3)).size).toBe(4);
      for (const option of round.options) if (option.id !== round.answer.id) expect(climateDistance(round.answer, option)).toBeGreaterThanOrEqual(CLIMATE_SEPARATION[difficulty]);
    }
    expect(buildClimateRounds(difficulty, 5, "other").map((round) => round.answer.id)).not.toEqual(rounds.slice(0, 5).map((round) => round.answer.id));
  });
  it("keeps hint scores finite, explicit and bounded", () => {
    expect([0, 1, 2, 3, 4].map(coastlinePoints)).toEqual([1000, 800, 600, 400, 400]);
    expect([0, 1, 2, 3].map(climatePoints)).toEqual([1000, 800, 600, 600]);
    expect(climatePoints(NaN)).toBe(1000);
    expect(coastlinePoints(-5)).toBe(1000);
  });
});
