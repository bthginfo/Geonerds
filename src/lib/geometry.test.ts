import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { geoBounds } from "d3-geo";
import { feature } from "topojson-client";
import { describe, expect, it } from "vitest";
import {
  geometryAreaScore,
  isRecognizableOutline,
  largestPolygonGeometry,
  prepareOutlineGeometry,
} from "./geometry";

interface TestFeature {
  id: string;
  geometry: GeoJSON.Geometry;
}

function highResolutionCountries(): TestFeature[] {
  const topo = JSON.parse(
    readFileSync(resolve(process.cwd(), "public/geo/countries-10m.json"), "utf8")
  );
  return (feature(topo, topo.objects.countries) as unknown as { features: TestFeature[] }).features;
}

describe("outline geometry", () => {
  it("removes degenerate island rings that d3 interprets as the whole globe", () => {
    const maldives = highResolutionCountries().find((country) => String(country.id) === "462");
    expect(maldives).toBeDefined();

    const prepared = prepareOutlineGeometry(maldives!.geometry);
    const bounds = geoBounds(prepared);

    expect(bounds[0][0]).toBeGreaterThan(70);
    expect(bounds[1][0]).toBeLessThan(76);
    expect(bounds[0][1]).toBeGreaterThan(-2);
    expect(bounds[1][1]).toBeLessThan(9);
  });

  it("keeps useful small-country outlines instead of filtering by land area", () => {
    const countries = highResolutionCountries();
    const monaco = countries.find((country) => String(country.id) === "492");
    const liechtenstein = countries.find((country) => String(country.id) === "438");

    expect(monaco && isRecognizableOutline(monaco.geometry)).toBe(true);
    expect(liechtenstein && isRecognizableOutline(liechtenstein.geometry)).toBe(true);
  });

  it("selects landmasses by real planar area regardless of ring winding", () => {
    const main: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [0, 8], [10, 8], [10, 0], [0, 0]]],
    };
    const reversedTiny: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[[40, 0], [40.001, 0], [40, 0.001], [40, 0]]],
    };
    const geometry: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [reversedTiny.coordinates, main.coordinates],
    };

    const largest = largestPolygonGeometry(geometry);
    expect(largest).not.toBeNull();
    expect(geometryAreaScore(largest!)).toBeGreaterThan(70);
  });
});
