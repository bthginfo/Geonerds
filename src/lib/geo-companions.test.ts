import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GEO_COMPANIONS, mergedCompanionGeometries, type CountriesTopology } from "@/lib/geo-companions";

function topology(res: string): CountriesTopology {
  return JSON.parse(readFileSync(resolve(process.cwd(), `public/geo/countries-${res}.json`), "utf8"));
}

function bbox(geometry: GeoJSON.Geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates]
      : geometry.type === "MultiPolygon" ? geometry.coordinates
        : [];
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  let outerRings = 0;
  for (const polygon of polygons) {
    outerRings += 1;
    for (const [lon, lat] of polygon[0]) {
      minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
  }
  return { minLon, maxLon, minLat, maxLat, outerRings };
}

describe("companion territory merging", () => {
  it("produces whole landmasses at 10m (used by the outline and draw games)", () => {
    const merged = mergedCompanionGeometries(topology("10m"));
    expect([...merged.keys()].sort()).toEqual(Object.keys(GEO_COMPANIONS).sort());

    // Cyprus: one island covering the Karpaz panhandle (NE tip ~34.6E) and
    // the full northern coast — no detached Ayia Napa exclave.
    const cyprus = bbox(merged.get("196")!);
    expect(cyprus.outerRings).toBe(1);
    expect(cyprus.maxLon).toBeGreaterThan(34.4);
    expect(cyprus.maxLat).toBeGreaterThan(35.55);

    // Somalia: the Horn including Somaliland reaches west past 43.5E.
    const somalia = bbox(merged.get("706")!);
    expect(somalia.minLon).toBeLessThan(43.5);
    expect(somalia.maxLat).toBeGreaterThan(11.4);
  });

  it("also merges what exists at 50m and 110m", () => {
    for (const res of ["50m", "110m"]) {
      const merged = mergedCompanionGeometries(topology(res));
      const cyprus = bbox(merged.get("196")!);
      expect(cyprus.outerRings, `Cyprus at ${res}`).toBe(1);
      expect(cyprus.maxLat, `Cyprus at ${res}`).toBeGreaterThan(35.5);
      const somalia = bbox(merged.get("706")!);
      expect(somalia.minLon, `Somalia at ${res}`).toBeLessThan(43.5);
    }
  });
});
