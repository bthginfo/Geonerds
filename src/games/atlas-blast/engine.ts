import piecesRaw from "@/data/atlas-blast-pieces.json";
import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { createSeededRandom } from "@/lib/random";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import type { Country, Difficulty } from "@/lib/types";

/** Pure Atlas Blast engine: board, pieces, naming, scoring. No React. */

export const BOARD_SIZE = 9;
export const TRAY_SIZE = 3;
/** Outline path units per board cell (see scripts/build-atlas-blast-pieces.mjs). */
export const OUTLINE_UNITS = 10;

export type CellOffset = readonly [row: number, col: number];

export interface PieceShape {
  cca3: string;
  cells: readonly CellOffset[];
  w: number;
  h: number;
  /** Country outline in piece coordinates, OUTLINE_UNITS per cell. */
  outline: string;
  /** Outline bounds [minX, minY, maxX, maxY] in the same units. */
  box: readonly [number, number, number, number];
}

type RawPiece = { cells: number[][]; w: number; h: number; outline: string; box: number[] };

export const PIECES: Readonly<Record<string, PieceShape>> = Object.fromEntries(
  Object.entries(piecesRaw as Record<string, RawPiece>).map(([cca3, piece]) => [
    cca3,
    {
      cca3,
      cells: piece.cells.map(([r, c]) => [r, c] as const),
      w: piece.w,
      h: piece.h,
      outline: piece.outline,
      box: [piece.box[0], piece.box[1], piece.box[2], piece.box[3]] as const,
    },
  ]),
);

export function getPiece(cca3: string): PieceShape {
  const piece = PIECES[cca3];
  if (!piece) throw new Error(`No Atlas Blast piece for ${cca3}`);
  return piece;
}

/** Quarter turns clockwise. Only the blocks rotate; the outline stays north-up. */
export type Rotation = 0 | 1 | 2 | 3;
export const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3];

/** Rotates cells 90° clockwise inside a w×h box: (r, c) → (c, h − 1 − r); w and h swap. */
export function rotateCells(cells: readonly CellOffset[], w: number, h: number): { cells: CellOffset[]; w: number; h: number } {
  const rotated = cells.map(([r, c]) => [c, h - 1 - r] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { cells: rotated, w: h, h: w };
}

const oriented = new Map<string, PieceShape>();

/** The piece with its blocks turned `rotation` quarter turns clockwise. */
export function orientedShape(cca3: string, rotation: Rotation = 0): PieceShape {
  const base = getPiece(cca3);
  if (rotation === 0) return base;
  const key = `${cca3}:${rotation}`;
  let shape = oriented.get(key);
  if (!shape) {
    let current: { cells: readonly CellOffset[]; w: number; h: number } = base;
    for (let turn = 0; turn < rotation; turn++) current = rotateCells(current.cells, current.w, current.h);
    shape = { ...base, cells: current.cells, w: current.w, h: current.h };
    oriented.set(key, shape);
  }
  return shape;
}

/** Easy keeps to well-known countries, medium adds tier 3, hard plays everything. */
export const BLAST_MAX_TIER: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 };
export const CHOICE_COUNT: Record<Difficulty, number> = { easy: 3, medium: 3, hard: 4 };

/**
 * Relative draw weight by cell count. Easy deals fewer large pieces; hard
 * deals the atlas as it is.
 */
const SIZE_WEIGHT: Record<Difficulty, (cells: number) => number> = {
  easy: (n) => [1, 1, 1, 1, 1, 0.75, 0.45, 0.25, 0.15, 0.1][n] ?? 0.1,
  medium: (n) => [1, 1, 1, 1, 1, 0.85, 0.6, 0.4, 0.3, 0.2][n] ?? 0.2,
  hard: (n) => [1, 1, 1, 1, 1, 1, 0.75, 0.55, 0.45, 0.35][n] ?? 0.35,
};

const pools: Partial<Record<Difficulty, Country[]>> = {};

/** Countries dealt as pieces at a difficulty, in a stable order. */
export function blastPool(difficulty: Difficulty): Country[] {
  const maxTier = BLAST_MAX_TIER[difficulty];
  return (pools[difficulty] ??= COUNTRIES.filter((country) => country.difficulty <= maxTier && country.independent && PIECES[country.cca3])
    .sort((a, b) => a.cca3.localeCompare(b.cca3)));
}

// ---------------------------------------------------------------------------
// Piece sequence (deterministic per seed + difficulty, extended on demand)

interface Stream { random: () => number; deck: string[]; list: string[] }
const streams = new Map<string, Stream>();
const RECENT_WINDOW = 8;

function streamFor(seed: string, difficulty: Difficulty): Stream {
  const key = `${difficulty}|${seed}`;
  let stream = streams.get(key);
  if (!stream) {
    if (streams.size > 24) streams.delete(streams.keys().next().value as string);
    stream = { random: createSeededRandom(`atlas-blast:${difficulty}:${seed}`), deck: [], list: [] };
    streams.set(key, stream);
  }
  return stream;
}

function drawNext(stream: Stream, difficulty: Difficulty): string {
  const pool = blastPool(difficulty);
  const weight = SIZE_WEIGHT[difficulty];
  const recent = new Set(stream.list.slice(-RECENT_WINDOW));
  for (let guard = 0; guard < 10_000; guard++) {
    if (!stream.deck.length) {
      const deck = pool.map((country) => country.cca3);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(stream.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      stream.deck = deck;
    }
    const cca3 = stream.deck.pop()!;
    if (recent.has(cca3)) continue;
    if (stream.random() >= weight(PIECES[cca3].cells.length)) continue;
    return cca3;
  }
  throw new Error("Atlas Blast piece stream exhausted");
}

/** The `index`-th piece (0-based) of the run's sequence. */
export function pieceAt(seed: string, difficulty: Difficulty, index: number): string {
  const stream = streamFor(seed, difficulty);
  while (stream.list.length <= index) stream.list.push(drawNext(stream, difficulty));
  return stream.list[index];
}

export function pieceSequence(seed: string, difficulty: Difficulty, count: number): string[] {
  return Array.from({ length: count }, (_, index) => pieceAt(seed, difficulty, index));
}

// ---------------------------------------------------------------------------
// Naming choices

/**
 * Answer plus distractors from the same region and of similar size, in a
 * shuffled order. Names are unique in both locales. Locale-independent.
 */
export function namingChoices(seed: string, difficulty: Difficulty, index: number, cca3: string): string[] {
  const answer = getCountryByCca3(cca3);
  if (!answer) throw new Error(`Unknown country ${cca3}`);
  const random = createSeededRandom(`atlas-blast:name:${difficulty}:${seed}:${index}`);
  const maxTier = Math.min(4, BLAST_MAX_TIER[difficulty] + (difficulty === "easy" ? 0 : 1));
  const usedNames = new Set([answer.name.en, answer.name.de]);
  const ranked = COUNTRIES.filter((country) => country.cca3 !== cca3 && country.independent && country.difficulty <= maxTier)
    .map((country) => {
      let closeness = 0;
      if (country.region === answer.region) closeness += 2;
      if (country.subregion && country.subregion === answer.subregion) closeness += 1;
      closeness -= 0.45 * Math.abs(Math.log10(Math.max(1, country.area) / Math.max(1, answer.area)));
      return { country, closeness };
    })
    .sort((a, b) => b.closeness - a.closeness || a.country.cca3.localeCompare(b.country.cca3));
  const need = CHOICE_COUNT[difficulty] - 1;
  const sameRegion = ranked.filter((entry) => entry.country.region === answer.region);
  const shortlist = (sameRegion.length >= need ? sameRegion : ranked).slice(0, Math.max(need + 3, 6));
  const distractors: string[] = [];
  while (distractors.length < need && shortlist.length) {
    const [pick] = shortlist.splice(Math.floor(random() * shortlist.length), 1);
    if (usedNames.has(pick.country.name.en) || usedNames.has(pick.country.name.de)) continue;
    usedNames.add(pick.country.name.en);
    usedNames.add(pick.country.name.de);
    distractors.push(pick.country.cca3);
  }
  for (const { country } of ranked) {
    if (distractors.length >= need) break;
    if (usedNames.has(country.name.en) || usedNames.has(country.name.de)) continue;
    usedNames.add(country.name.en);
    usedNames.add(country.name.de);
    distractors.push(country.cca3);
  }
  const options = [cca3, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

// ---------------------------------------------------------------------------
// Board

/** 64 cells, row-major. 0 = empty, otherwise the placement id. */
export type Board = readonly number[];

export const emptyBoard = (): number[] => Array(BOARD_SIZE * BOARD_SIZE).fill(0);
export const cellIndex = (row: number, col: number) => row * BOARD_SIZE + col;

export function canPlace(board: Board, shape: Pick<PieceShape, "cells">, row: number, col: number): boolean {
  for (const [r, c] of shape.cells) {
    const rr = row + r;
    const cc = col + c;
    if (rr < 0 || cc < 0 || rr >= BOARD_SIZE || cc >= BOARD_SIZE) return false;
    if (board[cellIndex(rr, cc)] !== 0) return false;
  }
  return true;
}

export function fitsAnywhere(board: Board, shape: PieceShape): boolean {
  for (let row = 0; row <= BOARD_SIZE - shape.h; row++) {
    for (let col = 0; col <= BOARD_SIZE - shape.w; col++) if (canPlace(board, shape, row, col)) return true;
  }
  return false;
}

/** Nearest valid anchor to the board centre, or null. */
export function suggestAnchor(board: Board, shape: PieceShape): { row: number; col: number } | null {
  const centreRow = (BOARD_SIZE - shape.h) / 2;
  const centreCol = (BOARD_SIZE - shape.w) / 2;
  let best: { row: number; col: number; distance: number } | null = null;
  for (let row = 0; row <= BOARD_SIZE - shape.h; row++) {
    for (let col = 0; col <= BOARD_SIZE - shape.w; col++) {
      if (!canPlace(board, shape, row, col)) continue;
      const distance = Math.abs(row - centreRow) + Math.abs(col - centreCol);
      if (!best || distance < best.distance) best = { row, col, distance };
    }
  }
  return best && { row: best.row, col: best.col };
}

export function placeOnBoard(board: Board, shape: Pick<PieceShape, "cells">, row: number, col: number, id: number): number[] {
  const next = [...board];
  for (const [r, c] of shape.cells) next[cellIndex(row + r, col + c)] = id;
  return next;
}

export interface FullLines { rows: number[]; cols: number[] }

export function findFullLines(board: Board): FullLines {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[cellIndex(i, j)] === 0) rowFull = false;
      if (board[cellIndex(j, i)] === 0) colFull = false;
    }
    if (rowFull) rows.push(i);
    if (colFull) cols.push(i);
  }
  return { rows, cols };
}

/** Clears all full rows and columns at once. Returns the cleared cell indexes. */
export function clearLines(board: Board, lines: FullLines): { board: number[]; cleared: number[] } {
  const cleared = new Set<number>();
  for (const row of lines.rows) for (let col = 0; col < BOARD_SIZE; col++) cleared.add(cellIndex(row, col));
  for (const col of lines.cols) for (let row = 0; row < BOARD_SIZE; row++) cleared.add(cellIndex(row, col));
  const next = [...board];
  for (const index of cleared) next[index] = 0;
  return { board: next, cleared: [...cleared].sort((a, b) => a - b) };
}

/** Cells that a hypothetical placement would clear (for the ghost preview). */
/** True when the piece fits somewhere in any of its four rotations. */
export function pieceFits(board: Board, cca3: string): boolean {
  return ROTATIONS.some((rotation) => fitsAnywhere(board, orientedShape(cca3, rotation)));
}

export function previewClear(board: Board, shape: Pick<PieceShape, "cells">, row: number, col: number): number[] {
  if (!canPlace(board, shape, row, col)) return [];
  const placed = placeOnBoard(board, shape, row, col, -1);
  return clearLines(placed, findFullLines(placed)).cleared;
}

// ---------------------------------------------------------------------------
// Scoring

export interface PlacementPoints { cells: number; lines: number; combo: number; total: number }

/**
 * +10 × multiplier per cell (×2 when the piece was named correctly),
 * 100 × lines² × multiplier for clears, and from the second consecutive
 * clearing placement a combo bonus of 50 × combo × multiplier.
 */
export function placementPoints(input: { cells: number; named: boolean; lines: number; combo: number; difficulty: Difficulty }): PlacementPoints {
  const multiplier = DIFFICULTY_MULTIPLIER[input.difficulty];
  const cells = Math.round(10 * input.cells * multiplier * (input.named ? 2 : 1));
  const lines = Math.round(100 * input.lines * input.lines * multiplier);
  const combo = input.lines > 0 && input.combo >= 2 ? Math.round(50 * input.combo * multiplier) : 0;
  return { cells, lines, combo, total: cells + lines + combo };
}

// ---------------------------------------------------------------------------
// Run state

export type NamingState = "unknown" | "correct" | "wrong";

export interface TrayPiece {
  /** Position in the run's piece sequence. */
  index: number;
  cca3: string;
  naming: NamingState;
  rotation: Rotation;
}

export interface Placement { id: number; cca3: string; named: boolean; row: number; col: number; rotation: Rotation }

export const trayShape = (piece: Pick<TrayPiece, "cca3" | "rotation">) => orientedShape(piece.cca3, piece.rotation);

export interface LastMove {
  placementId: number;
  cca3: string;
  row: number;
  col: number;
  linesCleared: number;
  /** Cleared cell indexes with the placement id each held before clearing. */
  cleared: { index: number; id: number }[];
  combo: number;
  points: PlacementPoints;
}

export interface BlastState {
  seed: string;
  difficulty: Difficulty;
  practice: boolean;
  board: number[];
  placements: Record<number, Placement>;
  tray: (TrayPiece | null)[];
  drawn: number;
  score: number;
  lines: number;
  combo: number;
  bestCombo: number;
  placed: number;
  /** Placed pieces that had been named correctly. */
  namedPlaced: number;
  namingStreak: number;
  bestNamingStreak: number;
  attempts: number;
  hits: string[];
  over: boolean;
  last: LastMove | null;
}

function drawTray(seed: string, difficulty: Difficulty, from: number): TrayPiece[] {
  return Array.from({ length: TRAY_SIZE }, (_, offset) => ({ index: from + offset, cca3: pieceAt(seed, difficulty, from + offset), naming: "unknown" as const, rotation: 0 as const }));
}

export function anyTrayFits(board: Board, tray: readonly (TrayPiece | null)[]): boolean {
  return tray.some((piece) => piece !== null && pieceFits(board, piece.cca3));
}

export function createRun(seed: string, difficulty: Difficulty, practice = false): BlastState {
  const board = emptyBoard();
  const tray = drawTray(seed, difficulty, 0);
  // Every piece is at most 5×5, so the first tray always fits the empty 9×9 board.
  if (!anyTrayFits(board, tray)) throw new Error("First Atlas Blast tray does not fit");
  return {
    seed, difficulty, practice, board, placements: {}, tray, drawn: TRAY_SIZE,
    score: 0, lines: 0, combo: 0, bestCombo: 0, placed: 0, namedPlaced: 0,
    namingStreak: 0, bestNamingStreak: 0, attempts: 0, hits: [], over: false, last: null,
  };
}

export function trayChoices(state: BlastState, slot: number): string[] {
  const piece = state.tray[slot];
  return piece ? namingChoices(state.seed, state.difficulty, piece.index, piece.cca3) : [];
}

/** One naming attempt per tray piece. Returns the same state if not allowed. */
export function nameTrayPiece(state: BlastState, slot: number, guess: string): BlastState {
  const piece = state.tray[slot];
  if (state.over || !piece || piece.naming !== "unknown") return state;
  const correct = guess === piece.cca3;
  const tray = state.tray.map((entry, i) => (i === slot && entry ? { ...entry, naming: correct ? "correct" as const : "wrong" as const } : entry));
  const namingStreak = correct ? state.namingStreak + 1 : 0;
  return {
    ...state,
    tray,
    attempts: state.attempts + 1,
    namingStreak,
    bestNamingStreak: Math.max(state.bestNamingStreak, namingStreak),
    hits: correct && !state.hits.includes(piece.cca3) ? [...state.hits, piece.cca3] : state.hits,
  };
}

/** Turns a tray piece 90° clockwise. */
export function rotateTrayPiece(state: BlastState, slot: number): BlastState {
  const piece = state.tray[slot];
  if (state.over || !piece) return state;
  const rotation = ((piece.rotation + 1) % 4) as Rotation;
  return { ...state, tray: state.tray.map((entry, i) => (i === slot && entry ? { ...entry, rotation } : entry)) };
}

/** Places a tray piece (in its current rotation) with its top-left at (row, col). Returns null when invalid. */
export function placeTrayPiece(state: BlastState, slot: number, row: number, col: number): BlastState | null {
  const piece = state.tray[slot];
  if (state.over || !piece) return null;
  const shape = trayShape(piece);
  if (!canPlace(state.board, shape, row, col)) return null;
  const id = state.placed + 1;
  const named = piece.naming === "correct";
  const placedBoard = placeOnBoard(state.board, shape, row, col, id);
  const lines = findFullLines(placedBoard);
  const lineCount = lines.rows.length + lines.cols.length;
  const { board, cleared } = clearLines(placedBoard, lines);
  const combo = lineCount > 0 ? state.combo + 1 : 0;
  const points = placementPoints({ cells: shape.cells.length, named, lines: lineCount, combo, difficulty: state.difficulty });
  let tray = state.tray.map((entry, i) => (i === slot ? null : entry));
  let drawn = state.drawn;
  if (tray.every((entry) => entry === null)) {
    tray = drawTray(state.seed, state.difficulty, drawn);
    drawn += TRAY_SIZE;
  }
  return {
    ...state,
    board,
    placements: { ...state.placements, [id]: { id, cca3: piece.cca3, named, row, col, rotation: piece.rotation } },
    tray,
    drawn,
    score: state.practice ? 0 : state.score + points.total,
    lines: state.lines + lineCount,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    placed: state.placed + 1,
    namedPlaced: state.namedPlaced + (named ? 1 : 0),
    over: !anyTrayFits(board, tray),
    last: {
      placementId: id, cca3: piece.cca3, row, col, linesCleared: lineCount, combo, points,
      cleared: cleared.map((index) => ({ index, id: placedBoard[index] })),
    },
  };
}

export interface BlastSummary { score: number; correct: number; total: number; bestStreak: number; countryHits: string[] }

export function summarize(state: BlastState): BlastSummary {
  const total = Math.max(1, state.placed);
  const correct = Math.min(state.namedPlaced, total);
  return {
    score: state.practice ? 0 : Math.max(0, Math.round(state.score)),
    correct,
    total,
    bestStreak: Math.min(state.bestNamingStreak, correct),
    countryHits: [...state.hits],
  };
}
