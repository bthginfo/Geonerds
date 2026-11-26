// Builds the Atlas Blast piece set: every independent country rasterised into a
// small polyomino (north up, Equal Earth centred on the country) plus a compact
// outline path in the same grid coordinates (10 units per cell).
//
//   node scripts/build-atlas-blast-pieces.mjs
//
// Reads public/geo/countries-{50m,10m,110m}.json (Natural Earth via world-atlas)
// and writes src/data/atlas-blast-pieces.json.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { geoCentroid, geoEqualEarth } from "d3-geo";
import { feature } from "topojson-client";
import { createServer } from "vite";

const ROOT = resolve(import.meta.dirname, "..");
const RESOLUTIONS = ["50m", "10m", "110m"];
const MIN_CELLS = 3;
const MAX_CELLS = 9;
// A cell counts as filled at ≥ 40 % coverage. Long, thin countries (Chile,
// Norway, Vietnam, …) never reach that at 2–5 cells, so they fall back to a
// lower threshold as long as the raster still holds most of the country.
const COVERAGES = [0.4, 0.3, 0.22, 0.15];
const MIN_RECALL = 0.5;
const SAMPLES = 10; // samples per cell side
const MIN_FIDELITY = 0.42;
const MIN_FIDELITY_THIN = 0.15;
const DETAIL_BONUS = Number(process.env.DETAIL_BONUS ?? 0.04);
const SIZE_COST = Number(process.env.SIZE_COST ?? 0.025);
const UNITS = 10; // outline units per cell
const MAX_OUTLINE = 400;

const countries = JSON.parse(readFileSync(resolve(ROOT, "src/data/countries.json"), "utf8"));

// Same companion merge the app applies at runtime (Northern Cyprus → Cyprus, …).
const vite = await createServer({
  root: ROOT,
  configFile: false,
  logLevel: "silent",
  server: { middlewareMode: true },
  resolve: { alias: { "@": resolve(ROOT, "src") } },
});
const { mergedCompanionGeometries } = await vite.ssrLoadModule("/src/lib/geo-companions.ts");
await vite.close();

function ringAreaLonLat(ring) {
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

const polygonAreaLonLat = (coordinates) =>
  Math.max(0, ringAreaLonLat(coordinates[0] ?? []) - coordinates.slice(1).reduce((sum, ring) => sum + ringAreaLonLat(ring), 0));

function geometryAreaLonLat(geometry) {
  if (geometry.type === "Polygon") return polygonAreaLonLat(geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.reduce((sum, polygon) => sum + polygonAreaLonLat(polygon), 0);
  return 0;
}

function longitudeDistance(left, right) {
  const delta = Math.abs(left - right) % 360;
  return delta > 180 ? 360 - delta : delta;
}

// Mirrors scripts/rebuild-country-outlines.mjs: keep nearby islands, drop remote territories.
function prepareGeometry(geometry) {
  if (geometry.type !== "MultiPolygon") return geometry;
  const parts = geometry.coordinates
    .map((coordinates, index) => {
      const shape = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates } };
      return { index, coordinates, area: polygonAreaLonLat(coordinates), centroid: geoCentroid(shape) };
    })
    .filter((part) => part.area > 1e-9);
  if (!parts.length) return geometry;
  const main = parts.reduce((best, part) => (part.area > best.area ? part : best));
  const smallIslandState = main.area < 2;
  const kept = parts
    .filter((part) => {
      if (part === main) return true;
      if (part.area < main.area * (smallIslandState ? 0.004 : 0.012)) return false;
      const distance = Math.hypot(longitudeDistance(part.centroid[0], main.centroid[0]), part.centroid[1] - main.centroid[1]);
      return distance <= (smallIslandState ? 55 : 32);
    })
    .sort((left, right) => left.index - right.index);
  return { type: "MultiPolygon", coordinates: kept.map((part) => part.coordinates) };
}

const planarArea = (ring) => {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return sum / 2;
};

/** Even-odd point in polygon over all projected rings. */
function inside(rings, x, y) {
  let hit = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

function largestComponent(filled, rows, cols) {
  const seen = new Set();
  let best = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = r * cols + c;
      if (!filled[key] || seen.has(key)) continue;
      const stack = [key];
      const component = [];
      seen.add(key);
      while (stack.length) {
        const current = stack.pop();
        component.push(current);
        const cr = Math.floor(current / cols);
        const cc = current % cols;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const next = nr * cols + nc;
          if (filled[next] && !seen.has(next)) { seen.add(next); stack.push(next); }
        }
      }
      if (component.length > best.length) best = component;
    }
  }
  return best;
}

function rasterize(rings, bounds, longest, ox, oy, totalArea, threshold) {
  const [[minX, minY], [maxX, maxY]] = bounds;
  const size = Math.max(maxX - minX, maxY - minY) / longest;
  const x0 = minX - ox * size;
  const y0 = minY - oy * size;
  const cols = Math.ceil((maxX - x0) / size - 1e-9);
  const rows = Math.ceil((maxY - y0) / size - 1e-9);
  const coverage = new Float64Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          if (inside(rings, x0 + (c + (sx + 0.5) / SAMPLES) * size, y0 + (r + (sy + 0.5) / SAMPLES) * size)) hits++;
        }
      }
      coverage[r * cols + c] = hits / (SAMPLES * SAMPLES);
    }
  }
  const filled = Array.from(coverage, (value) => value >= threshold);
  const component = largestComponent(filled, rows, cols);
  if (!component.length) return null;
  const cellsRaw = component.map((key) => [Math.floor(key / cols), key % cols]);
  const r0 = Math.min(...cellsRaw.map(([r]) => r));
  const c0 = Math.min(...cellsRaw.map(([, c]) => c));
  const cells = cellsRaw.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const h = Math.max(...cells.map(([r]) => r)) + 1;
  const w = Math.max(...cells.map(([, c]) => c)) + 1;
  const intersection = component.reduce((sum, key) => sum + coverage[key], 0) * size * size;
  const union = totalArea + component.length * size * size - intersection;
  return {
    cells, w, h, longest,
    fidelity: intersection / union,
    recall: intersection / totalArea,
    transform: (x, y) => [((x - x0) / size - c0) * UNITS, ((y - y0) / size - r0) * UNITS],
  };
}

function perpendicular(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (!length) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / length;
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let index = 0;
  let distance = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > distance) { distance = d; index = i; }
  }
  if (distance <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

function simplifyRing(ring, tolerance) {
  // Split the closed ring at its farthest point so both halves keep their shape.
  const open = ring.slice(0, -1);
  if (open.length < 4) return open;
  let far = 0;
  let farDistance = 0;
  for (let i = 1; i < open.length; i++) {
    const d = Math.hypot(open[i][0] - open[0][0], open[i][1] - open[0][1]);
    if (d > farDistance) { farDistance = d; far = i; }
  }
  const first = simplify(open.slice(0, far + 1), tolerance);
  const second = simplify([...open.slice(far), open[0]], tolerance);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

function outlinePath(rings, transform) {
  const grid = rings.map((ring) => ring.map(([x, y]) => transform(x, y)));
  const largest = Math.max(...grid.map((ring) => Math.abs(planarArea(ring))));
  const meaningful = grid
    .filter((ring) => Math.abs(planarArea(ring)) >= largest * 0.02 && Math.abs(planarArea(ring)) >= 1.5)
    .sort((a, b) => Math.abs(planarArea(b)) - Math.abs(planarArea(a)));
  for (let tolerance = 0.25; tolerance < 20; tolerance *= 1.2) {
    for (let keep = meaningful.length; keep >= 1; keep--) {
      const parts = [];
      for (const ring of meaningful.slice(0, keep)) {
        const simplified = simplifyRing(ring, tolerance).map(([x, y]) => [Math.round(x), Math.round(y)]);
        const deduped = simplified.filter((point, i) => i === 0 || point[0] !== simplified[i - 1][0] || point[1] !== simplified[i - 1][1]);
        if (deduped.length < 3 || Math.abs(planarArea(deduped)) < 1) continue;
        parts.push(`M${deduped[0][0]},${deduped[0][1]}L${deduped.slice(1).map(([x, y]) => `${x},${y}`).join(" ")}Z`);
      }
      const d = parts.join("");
      if (d && d.length <= MAX_OUTLINE) return d;
      if (d.length <= MAX_OUTLINE * 1.6) break; // try more tolerance before dropping islands
    }
  }
  return null;
}

const maps = new Map();
for (const resolution of RESOLUTIONS) {
  const topology = JSON.parse(readFileSync(resolve(ROOT, `public/geo/countries-${resolution}.json`), "utf8"));
  const collection = feature(topology, topology.objects.countries);
  const byId = new Map();
  for (const candidate of collection.features) {
    if (candidate.id == null) continue;
    const id = String(candidate.id);
    const current = byId.get(id);
    if (!current || geometryAreaLonLat(candidate.geometry) > geometryAreaLonLat(current.geometry)) byId.set(id, candidate);
  }
  for (const [id, geometry] of mergedCompanionGeometries(topology)) {
    const existing = byId.get(id);
    if (existing) byId.set(id, { ...existing, geometry });
  }
  maps.set(resolution, byId);
}

const output = {};
const dropped = [];
const stats = [];
for (const country of countries) {
  if (!country.independent || !country.ccn3) continue;
  let chosen;
  for (const resolution of RESOLUTIONS) {
    chosen = maps.get(resolution).get(String(country.ccn3));
    if (chosen) break;
  }
  if (!chosen) { dropped.push(`${country.cca3}:no-geometry`); continue; }
  const geometry = prepareGeometry(chosen.geometry);
  const [longitude] = geoCentroid({ type: "Feature", properties: {}, geometry });
  const projection = geoEqualEarth().rotate([-longitude, 0]).scale(1000).translate([0, 0]);
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rings = polygons.flatMap((polygon) => polygon.map((ring) => ring.map((point) => projection(point))));
  const outer = polygons.map((polygon) => polygon[0].map((point) => projection(point)));
  const totalArea = polygons.reduce(
    (sum, polygon) => sum + Math.max(0, Math.abs(planarArea(polygon[0].map((p) => projection(p)))) - polygon.slice(1).reduce((s, ring) => s + Math.abs(planarArea(ring.map((p) => projection(p)))), 0)),
    0,
  );
  const xs = rings.flat().map(([x]) => x);
  const ys = rings.flat().map(([, y]) => y);
  const bounds = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];

  // Coarse copy of the rings for rasterising (the outline uses full detail).
  const span = Math.max(bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]);
  const rasterRings = rings.map((ring) => simplifyRing(ring, span * 0.002)).filter((ring) => ring.length >= 3);

  // Take the first coverage threshold whose best raster is faithful enough.
  let best = null;
  let closest = null;
  for (const threshold of COVERAGES) {
    let levelBest = null;
    for (let longest = 2; longest <= 5; longest++) {
      for (const ox of [0, 0.25, 0.5, 0.75]) {
        for (const oy of [0, 0.25, 0.5, 0.75]) {
          const candidate = rasterize(rasterRings, bounds, longest, ox, oy, totalArea, threshold);
          if (!candidate) continue;
          const n = candidate.cells.length;
          if (n < MIN_CELLS || n > MAX_CELLS) continue;
          if (Math.max(candidate.w, candidate.h) < 2 || Math.max(candidate.w, candidate.h) > 5) continue;
          if (candidate.recall < MIN_RECALL) continue;
          // Favour a faithful raster with some detail, and keep the set from
          // filling up with 3×3 blocks (the 8×8 board needs smaller pieces too).
          const value = candidate.fidelity + DETAIL_BONUS * longest - SIZE_COST * n;
          if (!levelBest || value > levelBest.value) levelBest = { ...candidate, value, threshold };
        }
      }
    }
    if (!levelBest) continue;
    if (!closest || levelBest.fidelity > closest.fidelity) closest = levelBest;
    if (levelBest.fidelity >= (threshold === COVERAGES[0] ? MIN_FIDELITY : MIN_FIDELITY_THIN)) { best = levelBest; break; }
  }
  if (!best) { dropped.push(`${country.cca3}:${closest ? `fidelity ${closest.fidelity.toFixed(2)}` : "degenerate"}`); continue; }
  stats.push(`${country.cca3} L${best.longest} n${best.cells.length} t${best.threshold} f${best.fidelity.toFixed(2)} r${best.recall.toFixed(2)}`);
  const outline = outlinePath(outer, best.transform);
  if (!outline) { dropped.push(`${country.cca3}:outline`); continue; }
  // Outline bounds in the same units; islands may reach beyond the blocks.
  const numbers = outline.match(/-?\d+/g).map(Number);
  const xs2 = numbers.filter((_, i) => i % 2 === 0);
  const ys2 = numbers.filter((_, i) => i % 2 === 1);
  const box = [Math.min(...xs2), Math.min(...ys2), Math.max(...xs2), Math.max(...ys2)];
  output[country.cca3] = { cells: best.cells, w: best.w, h: best.h, outline, box };
}

const target = resolve(ROOT, "src/data/atlas-blast-pieces.json");
const lines = Object.entries(output).map(([cca3, piece]) => `${JSON.stringify(cca3)}:${JSON.stringify(piece)}`);
writeFileSync(target, `{\n${lines.join(",\n")}\n}\n`, "utf8");
console.log(`Wrote ${lines.length} Atlas Blast pieces to ${target}`);
if (dropped.length) console.log(`Dropped ${dropped.length}: ${dropped.join(", ")}`);
const histogram = {};
for (const piece of Object.values(output)) histogram[piece.cells.length] = (histogram[piece.cells.length] ?? 0) + 1;
console.log("Cells:", JSON.stringify(histogram));
if (process.argv.includes("--stats")) console.log(stats.join("\n"));
if (process.argv.includes("--preview")) {
  for (const code of process.argv.slice(process.argv.indexOf("--preview") + 1)) {
    const piece = output[code];
    if (!piece) { console.log(code, "missing"); continue; }
    const grid = Array.from({ length: piece.h }, () => Array(piece.w).fill("·"));
    for (const [r, c] of piece.cells) grid[r][c] = "█";
    console.log(`${code} ${piece.w}×${piece.h} (${piece.cells.length})\n${grid.map((row) => row.join("")).join("\n")}`);
  }
}
