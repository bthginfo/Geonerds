export type Point = [number, number];

/** Largest-area outer ring of a projected GeoJSON polygon/multipolygon, in pixel coords. */
export function largestRing(
  geometry: GeoJSON.Geometry,
  project: (coord: [number, number]) => [number, number] | null
): Point[] {
  const rings: Point[][] = [];
  const pushRing = (ring: number[][]) => {
    const pts: Point[] = [];
    for (const c of ring) {
      const p = project([c[0], c[1]]);
      if (p) pts.push([p[0], p[1]]);
    }
    if (pts.length > 2) rings.push(pts);
  };

  if (geometry.type === "Polygon") {
    pushRing(geometry.coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) pushRing(poly[0]);
  }

  let best: Point[] = [];
  let bestArea = -1;
  for (const r of rings) {
    const a = Math.abs(ringArea(r));
    if (a > bestArea) {
      bestArea = a;
      best = r;
    }
  }
  return best;
}

function ringArea(ring: Point[]): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return area / 2;
}

/** Rasterize a polygon into a normalized binary mask (bbox fitted into size×size). */
function rasterize(points: Point[], size: number): { mask: Uint8Array; count: number } | null {
  if (points.length < 3) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const pad = size * 0.08;
  const scale = Math.min((size - 2 * pad) / w, (size - 2 * pad) / h);
  const offX = (size - w * scale) / 2;
  const offY = (size - h * scale) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const px = (x - minX) * scale + offX;
    const py = (y - minY) * scale + offY;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  const data = ctx.getImageData(0, 0, size, size).data;
  const mask = new Uint8Array(size * size);
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (data[i * 4 + 3] > 10) {
      mask[i] = 1;
      count++;
    }
  }
  return { mask, count };
}

/**
 * Intersection-over-union of two polygons after independent bbox normalization
 * (so the score is scale- and position-invariant). Returns 0..1.
 */
export function shapeOverlap(target: Point[], drawn: Point[], size = 200): number {
  const a = rasterize(target, size);
  const b = rasterize(drawn, size);
  if (!a || !b || a.count === 0 || b.count === 0) return 0;
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.mask.length; i++) {
    const x = a.mask[i] | b.mask[i];
    if (x) union++;
    if (a.mask[i] & b.mask[i]) inter++;
  }
  return union === 0 ? 0 : inter / union;
}
