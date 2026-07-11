import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const ROOT = resolve(import.meta.dirname, "..");
const VIEWBOX_SIZE = 280;
const PAD = 10;
const resolutions = ["110m", "50m", "10m"];
const countries = JSON.parse(readFileSync(resolve(ROOT, "src/data/countries.json"), "utf8"));

function ringArea(ring) {
  let sum = 0;
  let previous = Number(ring[0]?.[0] ?? 0);
  const points = ring.map(([rawLongitude, rawLatitude]) => {
    let longitude = Number(rawLongitude);
    while (longitude - previous > 180) longitude -= 360;
    while (longitude - previous < -180) longitude += 360;
    previous = longitude;
    return [longitude, Number(rawLatitude)];
  });
  for (let index = 0, before = points.length - 1; index < points.length; before = index++) {
    sum += points[before][0] * points[index][1] - points[index][0] * points[before][1];
  }
  return Math.abs(sum / 2);
}

function polygonArea(coordinates) {
  return Math.max(0, ringArea(coordinates[0] ?? []) - coordinates.slice(1).reduce((sum, ring) => sum + ringArea(ring), 0));
}

function geometryArea(geometry) {
  if (geometry.type === "Polygon") return polygonArea(geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
  return 0;
}

function longitudeDistance(left, right) {
  const delta = Math.abs(left - right) % 360;
  return delta > 180 ? 360 - delta : delta;
}

// Mirrors the app's outline preparation: retain meaningful nearby islands while
// excluding remote territories that would make the home-country shape unreadable.
function prepareGeometry(geometry) {
  if (geometry.type !== "MultiPolygon") return geometry;
  const parts = geometry.coordinates
    .map((coordinates, index) => {
      const shape = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates } };
      return { index, coordinates, area: polygonArea(coordinates), centroid: geoCentroid(shape) };
    })
    .filter((part) => part.area > 1e-9);
  if (!parts.length) return geometry;
  const main = parts.reduce((best, part) => part.area > best.area ? part : best);
  const smallIslandState = main.area < 2;
  const kept = parts
    .filter((part) => {
      if (part === main) return true;
      if (part.area < main.area * (smallIslandState ? 0.004 : 0.012)) return false;
      const distance = Math.hypot(longitudeDistance(part.centroid[0], main.centroid[0]), part.centroid[1] - main.centroid[1]);
      return distance <= (smallIslandState ? 55 : 32);
    })
    .sort((left, right) => right.area - left.area)
    .slice(0, smallIslandState ? 48 : 32)
    .sort((left, right) => left.index - right.index);
  return { type: "MultiPolygon", coordinates: kept.map((part) => part.coordinates) };
}

const maps = new Map();
for (const resolution of resolutions) {
  const topology = JSON.parse(readFileSync(resolve(ROOT, `public/geo/countries-${resolution}.json`), "utf8"));
  const collection = feature(topology, topology.objects.countries);
  const byId = new Map();
  for (const candidate of collection.features) {
    if (candidate.id == null) continue;
    const id = String(candidate.id);
    const current = byId.get(id);
    if (!current || geometryArea(candidate.geometry) > geometryArea(current.geometry)) byId.set(id, candidate);
  }
  maps.set(resolution, byId);
}

const output = {};
for (const country of countries) {
  let chosen;
  let source;
  for (const resolution of resolutions) {
    chosen = maps.get(resolution).get(String(country.ccn3));
    if (chosen) { source = resolution; break; }
  }
  if (!chosen || !source) throw new Error(`No geometry for ${country.cca3} (${country.ccn3})`);
  const geometry = prepareGeometry(chosen.geometry);
  const shape = { type: "Feature", properties: {}, geometry };
  const [longitude] = geoCentroid(shape);
  const projection = geoMercator()
    .rotate([-longitude, 0])
    .fitExtent([[PAD, PAD], [VIEWBOX_SIZE - PAD, VIEWBOX_SIZE - PAD]], shape);
  const d = geoPath(projection).digits(1)(shape) ?? "";
  if (!d || /NaN|Infinity/.test(d)) throw new Error(`Invalid path for ${country.cca3}`);
  output[country.cca3] = { d, source };
}

const target = resolve(ROOT, "src/data/country-outlines.json");
writeFileSync(target, `${JSON.stringify({ viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`, countries: output })}\n`, "utf8");
console.log(`Wrote ${Object.keys(output).length} normalized country outlines to ${target}`);
