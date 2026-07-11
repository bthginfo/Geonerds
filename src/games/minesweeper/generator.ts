import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { mulberry32, shuffleWith } from "@/lib/daily";
import type { Country, Difficulty } from "@/lib/types";

export type MinePropertyId =
  | "landlocked"
  | "population-under-10m"
  | "population-under-25m"
  | "area-under-150k"
  | "area-over-500k"
  | "five-borders"
  | "high-latitude"
  | "euro";

export interface MineProperty {
  id: MinePropertyId;
  family: "terrain" | "population" | "area" | "borders" | "latitude" | "currency";
  value?: number;
}

export interface MinesweeperBoard {
  seed: number;
  difficulty: Difficulty;
  codes: string[];
  edges: [string, string][];
  mines: string[];
  mineCount: number;
  clues: Record<string, number>;
  initialRevealed: string[];
  property: MineProperty;
}

const SIZE: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 12 };
const MINE_RANGE: Record<Difficulty, readonly [number, number]> = { easy: [2, 2], medium: [2, 4], hard: [3, 4] };
const PROPERTY_DEFS: MineProperty[] = [
  { id: "landlocked", family: "terrain" },
  { id: "population-under-10m", family: "population", value: 10_000_000 },
  { id: "population-under-25m", family: "population", value: 25_000_000 },
  { id: "area-under-150k", family: "area", value: 150_000 },
  { id: "area-over-500k", family: "area", value: 500_000 },
  { id: "five-borders", family: "borders", value: 5 },
  { id: "high-latitude", family: "latitude", value: 45 },
  { id: "euro", family: "currency" },
];

const COUNTRY_MAP = new Map(COUNTRIES.map((country) => [country.cca3, country]));
function realNeighbors(code: string): string[] {
  const country = COUNTRY_MAP.get(code);
  return (country?.borders ?? []).filter((neighbor) => COUNTRY_MAP.get(neighbor)?.borders.includes(code));
}
const GRAPH_COUNTRIES = COUNTRIES.filter((country) => country.independent && realNeighbors(country.cca3).length > 0);
const GRAPH_CODES = new Set(GRAPH_COUNTRIES.map((country) => country.cca3));

export function propertyMatches(country: Country, property: MineProperty): boolean {
  switch (property.id) {
    case "landlocked": return country.landlocked;
    case "population-under-10m": return country.population > 0 && country.population < 10_000_000;
    case "population-under-25m": return country.population > 0 && country.population < 25_000_000;
    case "area-under-150k": return country.area > 0 && country.area < 150_000;
    case "area-over-500k": return country.area > 500_000;
    case "five-borders": return country.borders.length >= 5;
    case "high-latitude": return Boolean(country.latlng && Math.abs(country.latlng[0]) >= 45);
    case "euro": return country.currencies.some((currency) => currency.toLocaleLowerCase().includes("euro"));
  }
}

export function boardNeighbors(board: Pick<MinesweeperBoard, "codes" | "edges">, code: string): string[] {
  return board.edges.flatMap(([left, right]) => left === code ? [right] : right === code ? [left] : []);
}

function edgesFor(codes: readonly string[]): [string, string][] {
  const set = new Set(codes);
  const seen = new Set<string>();
  const edges: [string, string][] = [];
  for (const code of codes) {
    const country = COUNTRY_MAP.get(code);
    if (!country) continue;
    for (const neighbor of realNeighbors(code)) {
      if (!set.has(neighbor)) continue;
      const pair = [code, neighbor].sort() as [string, string];
      const key = pair.join("-");
      if (!seen.has(key)) { seen.add(key); edges.push(pair); }
    }
  }
  return edges.sort((a, b) => `${a[0]}-${a[1]}`.localeCompare(`${b[0]}-${b[1]}`));
}

function connectedCodes(size: number, rng: () => number): string[] | null {
  const start = GRAPH_COUNTRIES[Math.floor(rng() * GRAPH_COUNTRIES.length)];
  const selected = new Set<string>([start.cca3]);
  while (selected.size < size) {
    const frontier = shuffleWith(
      [...selected].flatMap((code) => realNeighbors(code))
        .filter((code) => GRAPH_CODES.has(code) && !selected.has(code)),
      rng
    );
    const next = frontier[0];
    if (!next) return null;
    selected.add(next);
  }
  return [...selected];
}

function enumerateMasks(nodeCount: number, mineCount: number): number[] {
  const masks: number[] = [];
  const limit = 1 << nodeCount;
  for (let mask = 0; mask < limit; mask++) {
    let bits = mask;
    let count = 0;
    while (bits) { bits &= bits - 1; count += 1; }
    if (count === mineCount) masks.push(mask);
  }
  return masks;
}

export function compatibleMasks(
  codes: readonly string[],
  edges: readonly [string, string][],
  mineCount: number,
  revealedClues: Readonly<Record<string, number>>
): number[] {
  const index = new Map(codes.map((code, i) => [code, i]));
  const neighbors = new Map(codes.map((code) => [code, [] as number[]]));
  for (const [left, right] of edges) {
    neighbors.get(left)?.push(index.get(right)!);
    neighbors.get(right)?.push(index.get(left)!);
  }
  return enumerateMasks(codes.length, mineCount).filter((mask) =>
    Object.entries(revealedClues).every(([code, clue]) => {
      const ownIndex = index.get(code);
      if (ownIndex == null || ((mask >> ownIndex) & 1) === 1) return false;
      return (neighbors.get(code) ?? []).reduce((sum, neighborIndex) => sum + ((mask >> neighborIndex) & 1), 0) === clue;
    })
  );
}

function buildCandidate(seed: number, difficulty: Difficulty, codes: string[], property: MineProperty): MinesweeperBoard | null {
  const edges = edgesFor(codes);
  const mines = codes.filter((code) => {
    const country = COUNTRY_MAP.get(code);
    return country ? propertyMatches(country, property) : false;
  });
  const [minimum, maximum] = MINE_RANGE[difficulty];
  if (mines.length < minimum || mines.length > maximum) return null;
  const mineSet = new Set(mines);
  const clues = Object.fromEntries(codes.map((code) => [code, boardNeighbors({ codes, edges }, code).filter((neighbor) => mineSet.has(neighbor)).length]));
  const safe = codes.filter((code) => !mineSet.has(code));
  let best: string[] | null = null;
  for (const leaveOut of safe) {
    let revealed = safe.filter((code) => code !== leaveOut);
    const clueMap = () => Object.fromEntries(revealed.map((code) => [code, clues[code]]));
    if (compatibleMasks(codes, edges, mines.length, clueMap()).length !== 1) continue;
    for (const code of [...revealed]) {
      const reduced = revealed.filter((candidate) => candidate !== code);
      const reducedClues = Object.fromEntries(reduced.map((candidate) => [candidate, clues[candidate]]));
      if (reduced.length > 0 && compatibleMasks(codes, edges, mines.length, reducedClues).length === 1) revealed = reduced;
    }
    if (!best || revealed.length < best.length) best = revealed;
  }
  if (!best || best.length >= safe.length) return null;
  return { seed, difficulty, codes, edges, mines, mineCount: mines.length, clues, initialRevealed: best, property };
}

const FALLBACK_CODES: Record<Difficulty, string[]> = {
  easy: ["FRA", "ESP", "PRT", "DEU", "POL", "CZE", "AUT", "CHE"],
  medium: ["FRA", "ESP", "PRT", "DEU", "POL", "CZE", "AUT", "CHE", "BEL", "NLD"],
  hard: ["FRA", "ESP", "PRT", "DEU", "POL", "CZE", "AUT", "CHE", "BEL", "NLD", "SVK", "HUN"],
};

export function fallbackMinesweeperBoard(seed: number, difficulty: Difficulty): MinesweeperBoard | null {
  return buildCandidate(seed, difficulty, FALLBACK_CODES[difficulty], PROPERTY_DEFS[1]);
}

export function generateMinesweeperBoard(seed: number, difficulty: Difficulty): MinesweeperBoard {
  const size = SIZE[difficulty];
  for (let attempt = 0; attempt < 320; attempt++) {
    const rng = mulberry32((seed + Math.imul(attempt + 1, 0x9e3779b1)) >>> 0);
    const codes = connectedCodes(size, rng);
    if (!codes) continue;
    for (const property of shuffleWith(PROPERTY_DEFS, rng)) {
      const board = buildCandidate(seed, difficulty, codes, property);
      if (board) return board;
    }
  }
  const fallback = fallbackMinesweeperBoard(seed, difficulty);
  if (!fallback) throw new Error(`No valid Geo Minesweeper fallback for ${difficulty}`);
  return fallback;
}

export interface BoardPosition { x: number; y: number }

export function layoutMinesweeperBoard(codes: readonly string[]): Record<string, BoardPosition> {
  const raw = codes.map((code) => ({ code, country: getCountryByCca3(code)! })).filter((entry) => entry.country?.latlng);
  const latitudes = raw.map((entry) => entry.country.latlng![0]);
  const longitudes = raw.map((entry) => entry.country.latlng![1]);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes), maxLng = Math.max(...longitudes);
  const positions = Object.fromEntries(raw.map((entry) => [entry.code, {
    x: 45 + ((entry.country.latlng![1] - minLng) / Math.max(1, maxLng - minLng)) * 300,
    y: 55 + ((maxLat - entry.country.latlng![0]) / Math.max(1, maxLat - minLat)) * 350,
  }]));
  // Deterministic collision relaxation keeps 44px controls usable in dense regions.
  for (let iteration = 0; iteration < 40; iteration++) {
    for (let left = 0; left < codes.length; left++) for (let right = left + 1; right < codes.length; right++) {
      const a = positions[codes[left]], b = positions[codes[right]];
      if (!a || !b) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= 58) continue;
      if (distance < 0.01) { dx = (right - left) % 2 ? 1 : -1; dy = 1; }
      const push = (58 - Math.max(distance, 1)) / 2;
      const length = Math.max(1, Math.hypot(dx, dy));
      a.x = Math.max(28, Math.min(362, a.x - dx / length * push));
      a.y = Math.max(30, Math.min(430, a.y - dy / length * push));
      b.x = Math.max(28, Math.min(362, b.x + dx / length * push));
      b.y = Math.max(30, Math.min(430, b.y + dy / length * push));
    }
  }
  return positions;
}
