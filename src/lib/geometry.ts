type Position = GeoJSON.Position;
type PolygonCoordinates = GeoJSON.Polygon["coordinates"];

const MIN_RING_AREA = 1e-9;

interface RingMetrics {
  signedArea: number;
  area: number;
  centroid: [number, number];
  uniquePoints: number;
}

/** Stable local area that cannot mistake a tiny reversed ring for the globe. */
function ringMetrics(ring: Position[]): RingMetrics {
  if (ring.length < 4) {
    return { signedArea: 0, area: 0, centroid: [0, 0], uniquePoints: 0 };
  }

  const points: [number, number][] = [];
  let previousLongitude = Number(ring[0][0]);
  for (const coordinate of ring) {
    let longitude = Number(coordinate[0]);
    const latitude = Number(coordinate[1]);
    while (longitude - previousLongitude > 180) longitude -= 360;
    while (longitude - previousLongitude < -180) longitude += 360;
    points.push([longitude, latitude]);
    previousLongitude = longitude;
  }

  let crossSum = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x0, y0] = points[j];
    const [x1, y1] = points[i];
    const cross = x0 * y1 - x1 * y0;
    crossSum += cross;
    centroidX += (x0 + x1) * cross;
    centroidY += (y0 + y1) * cross;
  }

  const signedArea = crossSum / 2;
  const fallback = points.reduce(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1]] as [number, number],
    [0, 0] as [number, number]
  );
  const centroid: [number, number] =
    Math.abs(crossSum) > MIN_RING_AREA
      ? [centroidX / (3 * crossSum), centroidY / (3 * crossSum)]
      : [fallback[0] / points.length, fallback[1] / points.length];
  const latitudeScale = Math.max(0.05, Math.cos((centroid[1] * Math.PI) / 180));
  const uniquePoints = new Set(points.map(([x, y]) => `${x.toFixed(7)},${y.toFixed(7)}`)).size;

  return {
    signedArea,
    area: Math.abs(signedArea) * latitudeScale,
    centroid: [((centroid[0] + 180) % 360 + 360) % 360 - 180, centroid[1]],
    uniquePoints,
  };
}

function polygonAreaScore(coordinates: PolygonCoordinates): number {
  if (!coordinates.length) return 0;
  const outer = ringMetrics(coordinates[0]).area;
  const holes = coordinates.slice(1).reduce((sum, ring) => sum + ringMetrics(ring).area, 0);
  return Math.max(0, outer - holes);
}

function normalizeRing(ring: Position[], clockwise: boolean): Position[] {
  const isClockwise = ringMetrics(ring).signedArea < 0;
  return isClockwise === clockwise ? ring : [...ring].reverse();
}

function cleanPolygon(coordinates: PolygonCoordinates): PolygonCoordinates | null {
  if (!coordinates.length) return null;
  const outerMetrics = ringMetrics(coordinates[0]);
  if (outerMetrics.area <= MIN_RING_AREA || outerMetrics.uniquePoints < 3) return null;

  const outer = normalizeRing(coordinates[0], true);
  const holes = coordinates
    .slice(1)
    .filter((ring) => ringMetrics(ring).area > outerMetrics.area * 1e-7)
    .map((ring) => normalizeRing(ring, false));
  return [outer, ...holes];
}

function longitudeDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

export function geometryAreaScore(geometry: GeoJSON.Geometry): number {
  if (geometry.type === "Polygon") return polygonAreaScore(geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce((sum, polygon) => sum + polygonAreaScore(polygon), 0);
  }
  return 0;
}

/** Returns the genuine largest landmass, ignoring degenerate rings and winding. */
export function largestPolygonGeometry(geometry: GeoJSON.Geometry): GeoJSON.Polygon | null {
  if (geometry.type === "Polygon") {
    const coordinates = cleanPolygon(geometry.coordinates);
    return coordinates ? { type: "Polygon", coordinates } : null;
  }
  if (geometry.type !== "MultiPolygon") return null;

  let best: PolygonCoordinates | null = null;
  let bestArea = -1;
  for (const polygon of geometry.coordinates) {
    const cleaned = cleanPolygon(polygon);
    if (!cleaned) continue;
    const area = polygonAreaScore(cleaned);
    if (area > bestArea) {
      best = cleaned;
      bestArea = area;
    }
  }
  return best ? { type: "Polygon", coordinates: best } : null;
}

/** Cleans and crops country geometry into a readable quiz silhouette. */
export function prepareOutlineGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type === "Polygon") {
    const coordinates = cleanPolygon(geometry.coordinates);
    return coordinates ? { type: "Polygon", coordinates } : geometry;
  }
  if (geometry.type !== "MultiPolygon") return geometry;

  const parts = geometry.coordinates
    .map((polygon, index) => {
      const coordinates = cleanPolygon(polygon);
      if (!coordinates) return null;
      const metrics = ringMetrics(coordinates[0]);
      return { index, coordinates, area: polygonAreaScore(coordinates), centroid: metrics.centroid };
    })
    .filter((part): part is NonNullable<typeof part> => part !== null && part.area > MIN_RING_AREA);

  if (!parts.length) return geometry;
  const main = parts.reduce((best, part) => (part.area > best.area ? part : best));
  const isSmallIslandState = main.area < 2;
  const minRelativeArea = isSmallIslandState ? 0.004 : 0.012;
  const maxDistance = isSmallIslandState ? 55 : 32;
  const maxParts = isSmallIslandState ? 48 : 32;

  const kept = parts
    .filter((part) => {
      if (part === main) return true;
      if (part.area < main.area * minRelativeArea) return false;
      const distance = Math.hypot(
        longitudeDistance(part.centroid[0], main.centroid[0]),
        part.centroid[1] - main.centroid[1]
      );
      return distance <= maxDistance;
    })
    .sort((a, b) => b.area - a.area)
    .slice(0, maxParts)
    .sort((a, b) => a.index - b.index);

  return { type: "MultiPolygon", coordinates: kept.map((part) => part.coordinates) };
}

/** Data-driven replacement for an arbitrary country-area cutoff. */
export function isRecognizableOutline(geometry: GeoJSON.Geometry): boolean {
  const prepared = prepareOutlineGeometry(geometry);
  const polygons =
    prepared.type === "Polygon"
      ? [prepared.coordinates]
      : prepared.type === "MultiPolygon"
        ? prepared.coordinates
        : [];
  const usefulPoints = polygons.reduce(
    (sum, polygon) => sum + (polygon[0] ? ringMetrics(polygon[0]).uniquePoints : 0),
    0
  );
  return usefulPoints >= 8 && geometryAreaScore(prepared) > MIN_RING_AREA;
}
