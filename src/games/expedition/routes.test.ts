import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { EXPEDITION_ROUTES, energyLossForAccuracy, normalizedStageScore, starsForAccuracy } from "./routes";

describe("Geo Expedition routes", () => {
  it("ships six unique journeys with six bounded checkpoints", () => {
    expect(EXPEDITION_ROUTES).toHaveLength(6);
    expect(new Set(EXPEDITION_ROUTES.map((route) => route.id)).size).toBe(6);
    for (const route of EXPEDITION_ROUTES) {
      expect(route.checkpoints).toHaveLength(6);
      expect(route.checkpoints.slice(0, -1).every((checkpoint) => checkpoint.options.length === 2)).toBe(true);
      expect(route.checkpoints.at(-1)?.options).toHaveLength(1);
      expect(route.checkpoints.at(-1)?.options[0].boss).toBe(true);
      if (route.scope) expect(COUNTRIES.filter((country) => country.region === route.scope).length).toBeGreaterThanOrEqual(12);
    }
  });

  it("caps energy loss at one and normalizes unlike stage scores", () => {
    expect(energyLossForAccuracy(0, 3)).toBe(1);
    expect(energyLossForAccuracy(1, 3)).toBe(1);
    expect(energyLossForAccuracy(2, 3)).toBe(0);
    expect(starsForAccuracy(3, 3)).toBe(3);
    expect(starsForAccuracy(2, 3)).toBe(1);
    expect(normalizedStageScore(3, 3, 3)).toBe(1000);
  });
});
