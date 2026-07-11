import { getCountryByCca3 } from "@/data/countries";
import type { Country, Difficulty } from "@/lib/types";

export interface NeighborPuzzle {
  anchor: Country;
  neighbors: Country[];
}

export interface NeighborJigsawPresentation {
  minNeighbors: number;
  maxNeighbors: number;
  namedPieces: boolean;
  boundsPadding: number;
  centroidRadius: number;
}

export interface NeighborTarget {
  code: string;
  cx: number;
  cy: number;
  bounds: [[number, number], [number, number]];
  tiny: boolean;
}

export interface JigsawDropBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const JIGSAW_PRESENTATION: Record<Difficulty, NeighborJigsawPresentation> = {
  easy: { minNeighbors: 2, maxNeighbors: 4, namedPieces: true, boundsPadding: 64, centroidRadius: 96 },
  medium: { minNeighbors: 4, maxNeighbors: 6, namedPieces: true, boundsPadding: 48, centroidRadius: 76 },
  hard: { minNeighbors: 6, maxNeighbors: 9, namedPieces: false, boundsPadding: 36, centroidRadius: 62 },
};

function shuffleWith<T>(values: readonly T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds a complete, trustworthy neighborhood. If even one declared border is
 * missing, asymmetric, or lacks map geometry, the anchor is rejected instead
 * of silently creating a misleading partial puzzle.
 */
export function neighborPuzzleForAnchor(
  anchor: Country,
  geometryIds: ReadonlySet<string>
): NeighborPuzzle | null {
  if (!anchor.independent || !anchor.ccn3 || !geometryIds.has(String(anchor.ccn3))) return null;
  if (anchor.borders.length < 2 || new Set(anchor.borders).size !== anchor.borders.length) return null;

  const neighbors: Country[] = [];
  for (const code of anchor.borders) {
    const neighbor = getCountryByCca3(code);
    if (!neighbor?.ccn3 || !geometryIds.has(String(neighbor.ccn3))) return null;
    if (!neighbor.borders.includes(anchor.cca3)) return null;
    neighbors.push(neighbor);
  }
  if (neighbors.length > 9) return null;
  return { anchor, neighbors };
}

export function eligibleNeighborPuzzles(
  countries: readonly Country[],
  geometryIds: ReadonlySet<string>,
  difficulty: Difficulty
): NeighborPuzzle[] {
  const { minNeighbors, maxNeighbors } = JIGSAW_PRESENTATION[difficulty];
  return [...countries]
    .sort((a, b) => a.cca3.localeCompare(b.cca3))
    .map((anchor) => neighborPuzzleForAnchor(anchor, geometryIds))
    .filter((puzzle): puzzle is NeighborPuzzle => Boolean(
      puzzle && puzzle.neighbors.length >= minNeighbors && puzzle.neighbors.length <= maxNeighbors
    ));
}

export function selectNeighborPuzzles(
  countries: readonly Country[],
  geometryIds: ReadonlySet<string>,
  difficulty: Difficulty,
  count: number,
  rng: () => number = Math.random
): NeighborPuzzle[] {
  const eligible = eligibleNeighborPuzzles(countries, geometryIds, difficulty);
  return shuffleWith(eligible, rng).slice(0, Math.max(0, Math.min(count, eligible.length)));
}

export function neighborRunSummary(puzzles: readonly NeighborPuzzle[]): { total: number; countryHits: string[] } {
  return {
    total: puzzles.reduce((sum, puzzle) => sum + puzzle.neighbors.length, 0),
    countryHits: [...new Set(puzzles.flatMap((puzzle) => [
      puzzle.anchor.cca3,
      ...puzzle.neighbors.map((neighbor) => neighbor.cca3),
    ]))],
  };
}

/** A rough placement succeeds within the expanded true bounds or near its centroid. */
export function dropMatchesTarget(
  point: { x: number; y: number },
  target: NeighborTarget,
  difficulty: Difficulty
): boolean {
  const presentation = JIGSAW_PRESENTATION[difficulty];
  const extra = target.tiny ? 26 : 0;
  const padding = presentation.boundsPadding + extra;
  const [[left, top], [right, bottom]] = target.bounds;
  const insideExpandedBounds = point.x >= left - padding
    && point.x <= right + padding
    && point.y >= top - padding
    && point.y <= bottom + padding;
  const nearCentroid = Math.hypot(point.x - target.cx, point.y - target.cy)
    <= presentation.centroidRadius + extra;
  return insideExpandedBounds || nearCentroid;
}

export type CompassSector = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export function compassSector(
  anchor: Pick<NeighborTarget, "cx" | "cy">,
  target: Pick<NeighborTarget, "cx" | "cy">
): CompassSector {
  const angle = Math.atan2(target.cy - anchor.cy, target.cx - anchor.cx) * 180 / Math.PI;
  const sectors: CompassSector[] = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  return sectors[Math.round(((angle + 360) % 360) / 45) % 8];
}

/** A tray tap is selection only; placement starts after a real drag ending on the board. */
export function isRealBoardDrop(
  start: { x: number; y: number },
  end: { x: number; y: number },
  board: JigsawDropBounds,
  minimumDistance = 8
): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) >= minimumDistance
    && end.x >= board.left && end.x <= board.right
    && end.y >= board.top && end.y <= board.bottom;
}
