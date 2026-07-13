import { describe, expect, it } from "vitest";
import watersJson from "../../public/geo/waters.json";
import { waterPoolForDifficulty, type Water } from "./waters";

const waters = watersJson as unknown as Water[];

function points(water: Water): number[][] {
  if (water.geometry.type === "LineString") return water.geometry.coordinates;
  if (water.geometry.type === "MultiLineString") return water.geometry.coordinates.flat();
  if (water.geometry.type === "Polygon") return water.geometry.coordinates.flat();
  if (water.geometry.type === "MultiPolygon") return water.geometry.coordinates.flat(2);
  return [];
}

function bounds(name: string) {
  const water = waters.find((entry) => entry.name === name);
  expect(water, `${name} is missing`).toBeDefined();
  const coordinates = points(water!);
  return {
    minLon: Math.min(...coordinates.map(([longitude]) => longitude)),
    maxLon: Math.max(...coordinates.map(([longitude]) => longitude)),
    minLat: Math.min(...coordinates.map(([, latitude]) => latitude)),
    maxLat: Math.max(...coordinates.map(([, latitude]) => latitude)),
  };
}

describe("water geography", () => {
  it("contains the complete upper and lower Danube", () => {
    const danube = bounds("Danube");
    expect(danube.minLon).toBeLessThan(9);
    expect(danube.maxLon).toBeGreaterThan(28);
    expect(danube.maxLat).toBeGreaterThan(48.5);
  });

  it("contains the Rhine from the Alps to the North Sea", () => {
    const rhine = bounds("Rhine");
    expect(rhine.minLat).toBeLessThan(47);
    expect(rhine.maxLat).toBeGreaterThan(51.5);
    expect(rhine.minLon).toBeLessThan(6);
  });

  it("keeps important renamed river systems complete", () => {
    expect(bounds("Nile").minLat).toBeLessThan(0);
    expect(bounds("Mekong").maxLat).toBeGreaterThan(30);
    expect(bounds("Yangtze").minLon).toBeLessThan(100);
    expect(bounds("Congo").minLat).toBeLessThan(-10);
    // Rivers whose upstream stretches carry local Natural Earth names.
    expect(bounds("Tagus").maxLon, "Tagus must include the Spanish Tajo").toBeGreaterThan(-3);
    expect(bounds("Euphrates").maxLat, "Euphrates must reach Turkey (Firat)").toBeGreaterThan(38);
    expect(bounds("Tigris").maxLat, "Tigris must include the Turkish Dicle").toBeGreaterThan(37.5);
    expect(bounds("Yenisey").minLat, "Yenisey must reach its Tuva headwaters").toBeLessThan(53);
  });

  it("quizzes whole lakes, not national halves", () => {
    expect(bounds("Lake Tanganyika").minLat).toBeLessThan(-8);
    expect(waters.filter((water) => water.name === "Vistula Lagoon")).toHaveLength(1);
    for (const half of ["Kaliningradskiy Zaliv", "Zalev Wislany"]) {
      expect(waters.some((water) => water.name === half), `${half} should be merged away`).toBe(false);
    }
  });

  it("has valid, unique and tiered water entries", () => {
    expect(new Set(waters.map((water) => water.id)).size).toBe(waters.length);
    for (const water of waters) {
      expect([1, 2, 3]).toContain(water.tier);
      expect(water.accepted.length).toBeGreaterThan(0);
      const coordinates = points(water);
      expect(coordinates.length, `${water.name} has no coordinates`).toBeGreaterThan(1);
      expect(coordinates.every(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude))).toBe(true);
    }
  });

  it("uses famous waters on easy and unlocks the full atlas on hard", () => {
    const easy = waterPoolForDifficulty(waters, "easy");
    const medium = waterPoolForDifficulty(waters, "medium");
    const hard = waterPoolForDifficulty(waters, "hard");
    expect(easy.every((water) => water.tier === 1)).toBe(true);
    expect(medium.every((water) => water.tier <= 2)).toBe(true);
    expect(easy.map((water) => water.name)).toContain("Rhine");
    expect(easy.map((water) => water.name)).toContain("Danube");
    expect(easy.length).toBeLessThan(medium.length);
    expect(medium.length).toBeLessThan(hard.length);
  });
});
