import fs from "node:fs";
import crypto from "node:crypto";
import { feature } from "topojson-client";

const source = "public/geo/countries-10m.json";
const raw = fs.readFileSync(source);
const topology = JSON.parse(raw);
const countries = JSON.parse(fs.readFileSync("src/data/countries.json", "utf8"));
const byNumericId = new Map(countries.filter((country) => country.ccn3).map((country) => [String(country.ccn3).padStart(3, "0"), country]));
const geometries = topology.objects.countries.geometries;
const owners = new Map();
const normalizeArc = (arc) => arc < 0 ? ~arc : arc;
function rings(geometry) {
  return geometry.type === "Polygon" ? geometry.arcs : geometry.type === "MultiPolygon" ? geometry.arcs.flat() : [];
}
function outerRings(geometry) {
  return geometry.type === "Polygon" ? [geometry.arcs[0]] : geometry.type === "MultiPolygon" ? geometry.arcs.map((polygon) => polygon[0]) : [];
}
geometries.forEach((geometry, index) => {
  for (const ring of rings(geometry)) for (const ref of ring) {
    const arc = normalizeArc(ref);
    if (!owners.has(arc)) owners.set(arc, new Set());
    owners.get(arc).add(index);
  }
});
function km(a, b) {
  const radians = Math.PI / 180;
  const dLat = (b[1] - a[1]) * radians;
  const dLng = (b[0] - a[0]) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function length(coords) { return coords.slice(1).reduce((total, point, index) => total + km(coords[index], point), 0); }
function splitDateline(coords) {
  const parts = [[]];
  for (const point of coords) {
    const current = parts.at(-1);
    if (current.length && Math.abs(current.at(-1)[0] - point[0]) > 180) parts.push([]);
    parts.at(-1).push(point);
  }
  return parts.filter((part) => part.length >= 8);
}
function inlandWater(coords) {
  // Outer country boundaries can touch a lake; do not market those as ocean coast.
  const boxes = [[45, 56, 34, 49], [-94, -75, 40, 50], [28.5, 35, -3.5, 2], [28, 32, -9, -3], [33, 36, -15, -9]];
  return boxes.some(([west, east, south, north]) => coords.every(([lng, lat]) => lng >= west && lng <= east && lat >= south && lat <= north));
}
function windows(coords) {
  const total = length(coords);
  if (total <= 3500) return [coords];
  const cumulative = [0];
  for (let index = 1; index < coords.length; index++) cumulative.push(cumulative.at(-1) + km(coords[index - 1], coords[index]));
  const span = Math.min(3000, total * 0.55);
  return [0, 0.5, 1].map((fraction) => {
    const start = (total - span) * fraction;
    return coords.filter((_, index) => cumulative[index] >= start && cumulative[index] <= start + span);
  });
}
function sample(coords) {
  if (coords.length <= 180) return coords;
  return Array.from({ length: 180 }, (_, index) => coords[Math.round(index * (coords.length - 1) / 179)]);
}
const fragments = [];
for (const [geometryIndex, geometry] of geometries.entries()) {
  const country = byNumericId.get(String(geometry.id).padStart(3, "0"));
  if (!country || country.landlocked || country.cca3 === "ATA") continue;
  const candidates = [];
  for (const ref of new Set(outerRings(geometry).flat())) {
    const sourceArc = normalizeArc(ref);
    if (owners.get(sourceArc)?.size !== 1 || !owners.get(sourceArc).has(geometryIndex)) continue;
    const decoded = feature(topology, { type: "LineString", arcs: [sourceArc] }).geometry.coordinates;
    for (const part of splitDateline(decoded)) for (const [windowIndex, coords] of windows(part).entries()) {
      const lengthKm = length(coords);
      if (coords.length < 8 || lengthKm < 25 || inlandWater(coords)) continue;
      const chord = km(coords[0], coords.at(-1));
      if (chord / lengthKm > 0.975) continue;
      const sampled = sample(coords).map(([lng, lat]) => [Number(lng.toFixed(4)), Number(lat.toFixed(4))]);
      candidates.push({ id: `${country.cca3}:${sourceArc}:${windowIndex}`, cca3: country.cca3, sourceArc, coordinates: sampled, lengthKm: Math.round(lengthKm), quality: Math.min(lengthKm, 2000) * (1 - chord / lengthKm) });
    }
  }
  candidates.sort((a, b) => b.quality - a.quality);
  const selected = [];
  for (const candidate of candidates) {
    if (selected.some((other) => other.id === candidate.id)) continue;
    // Prefer distinct stretches, but allow multiple windows on a long mainland coast.
    if (selected.length < 2 && selected.some((other) => other.sourceArc === candidate.sourceArc) && candidates.some((other) => !selected.some((item) => item.sourceArc === other.sourceArc))) continue;
    selected.push({ id: candidate.id, cca3: candidate.cca3, sourceArc: candidate.sourceArc, coordinates: candidate.coordinates, lengthKm: candidate.lengthKm });
    if (selected.length === 3) break;
  }
  fragments.push(...selected);
}
const result = {
  meta: {
    source: "Natural Earth via world-atlas 2.0.2", sourceResolution: "1:10m", sourceFile: source,
    sourceSha256: crypto.createHash("sha256").update(raw).digest("hex"),
    attributionUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
    extraction: "Only outer-ring arcs owned by one country geometry. Shared land borders excluded; no invented geometry. Dateline jumps split. Major inland-water bounds excluded. Long arcs cropped; at most 180 sampled source vertices per fragment.",
  },
  fragments,
};
fs.writeFileSync("src/data/coastline-fragments.json", JSON.stringify(result) + "\n");
console.log(`${new Set(fragments.map((fragment) => fragment.cca3)).size} coastal countries / ${fragments.length} source-derived fragments`);
