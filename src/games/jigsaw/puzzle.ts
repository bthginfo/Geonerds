import type { Country, Difficulty } from "@/lib/types";

export interface JigsawPuzzle {
  subregion: string;
  context: Country[];
  pieces: Country[];
}

export interface JigsawPresentation {
  pieceCount: number;
  namedPieces: boolean;
  sequential: boolean;
  exactSlots: boolean;
  positionMarkers: boolean;
  tolerance: number;
}

export interface JigsawTarget {
  code: string;
  cx: number;
  cy: number;
  tiny: boolean;
}

export interface JigsawDropBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const JIGSAW_PRESENTATION: Record<Difficulty, JigsawPresentation> = {
  easy: { pieceCount: 6, namedPieces: true, sequential: true, exactSlots: true, positionMarkers: true, tolerance: 110 },
  medium: { pieceCount: 9, namedPieces: false, sequential: false, exactSlots: false, positionMarkers: true, tolerance: 74 },
  hard: { pieceCount: 12, namedPieces: false, sequential: false, exactSlots: false, positionMarkers: false, tolerance: 52 },
};

function shuffleWith<T>(values: readonly T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function jigsawPieceCount(difficulty: Difficulty) {
  return JIGSAW_PRESENTATION[difficulty].pieceCount;
}

export function targetTolerance(difficulty: Difficulty, tiny: boolean): number {
  return JIGSAW_PRESENTATION[difficulty].tolerance * (tiny ? 1.65 : 1);
}

export function nearestJigsawTarget(
  point: { x: number; y: number },
  targets: readonly JigsawTarget[],
  difficulty: Difficulty
): JigsawTarget | null {
  let nearest: JigsawTarget | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const distance = Math.hypot(point.x - target.cx, point.y - target.cy);
    if (distance <= targetTolerance(difficulty, target.tiny) && distance < nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  }
  return nearest;
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

export function selectJigsawPuzzle(
  countries: readonly Country[],
  geometryIds: ReadonlySet<string>,
  difficulty: Difficulty,
  rng: () => number = Math.random
): JigsawPuzzle | null {
  const count = jigsawPieceCount(difficulty);
  const geometric = countries.filter(
    (country) => country.ccn3 && geometryIds.has(String(country.ccn3)) && country.subregion && country.independent
  );
  const groups = new Map<string, Country[]>();
  for (const country of geometric) {
    const group = groups.get(country.subregion) ?? [];
    group.push(country);
    groups.set(country.subregion, group);
  }
  const eligible = [...groups.entries()].filter(([, group]) => group.length >= count);
  if (!eligible.length) return null;
  const [subregion, group] = eligible[Math.floor(rng() * eligible.length)];
  const context = [...group].sort((a, b) => a.cca3.localeCompare(b.cca3));
  const tierLimit = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
  const preferred = context.filter((country) => country.difficulty <= tierLimit);
  const source = preferred.length >= count ? preferred : context;
  return { subregion, context, pieces: shuffleWith(source, rng).slice(0, count) };
}
