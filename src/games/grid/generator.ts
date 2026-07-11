import type { Country, Difficulty } from "@/lib/types";

export type GridConstraintKind =
  | "region" | "subregion" | "border" | "coast" | "hemisphere"
  | "population" | "area" | "borders" | "language" | "currency";

export interface GridConstraint {
  id: string;
  kind: GridConstraintKind;
  value: string;
}

export interface GridCell {
  row: number;
  column: number;
  candidates: string[];
}

export interface GridPuzzle {
  seed: number;
  difficulty: Difficulty;
  rows: GridConstraint[];
  columns: GridConstraint[];
  cells: GridCell[];
  witness: string[];
  fallback: boolean;
}

const MIN_CANDIDATES: Record<Difficulty, number> = { easy: 4, medium: 2, hard: 1 };
const RETRIES = 240;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function matchesGridConstraint(country: Country, constraint: GridConstraint): boolean {
  const n = Number(constraint.value);
  switch (constraint.kind) {
    case "region": return country.region === constraint.value;
    case "subregion": return country.subregion === constraint.value;
    case "border": return country.borders.includes(constraint.value);
    case "coast": return constraint.value === "landlocked" ? country.landlocked : !country.landlocked;
    case "hemisphere": return !!country.latlng && (constraint.value === "north" ? country.latlng[0] >= 0 : country.latlng[0] < 0);
    case "population":
      return constraint.value === "small" ? country.population < 10_000_000
        : constraint.value === "large" ? country.population >= 50_000_000 : country.population >= 10_000_000 && country.population < 50_000_000;
    case "area":
      return constraint.value === "small" ? country.area < 100_000
        : constraint.value === "large" ? country.area >= 500_000 : country.area >= 100_000 && country.area < 500_000;
    case "borders":
      return constraint.value === "few" ? country.borders.length <= 2
        : constraint.value === "many" ? country.borders.length >= 5 : country.borders.length >= 3 && country.borders.length <= 4;
    case "language": return country.languages.includes(constraint.value);
    case "currency": return country.currencies.includes(constraint.value);
    default: return Number.isFinite(n) && false;
  }
}

export function countryFitsCell(country: Country, puzzle: Pick<GridPuzzle, "rows" | "columns">, row: number, column: number): boolean {
  return matchesGridConstraint(country, puzzle.rows[row]) && matchesGridConstraint(country, puzzle.columns[column]);
}

function constraintsFor(countries: Country[], difficulty: Difficulty): GridConstraint[] {
  const base: GridConstraint[] = [
    ...["Africa", "Americas", "Asia", "Europe", "Oceania"].map((value) => ({ id: `region:${value}`, kind: "region" as const, value })),
    { id: "coast:coastal", kind: "coast", value: "coastal" },
    { id: "coast:landlocked", kind: "coast", value: "landlocked" },
    { id: "hemisphere:north", kind: "hemisphere", value: "north" },
    { id: "hemisphere:south", kind: "hemisphere", value: "south" },
    ...["small", "medium", "large"].map((value) => ({ id: `population:${value}`, kind: "population" as const, value })),
    ...["small", "medium", "large"].map((value) => ({ id: `area:${value}`, kind: "area" as const, value })),
    ...["few", "medium", "many"].map((value) => ({ id: `borders:${value}`, kind: "borders" as const, value })),
  ];
  if (difficulty !== "easy") {
    for (const value of ["English", "French", "Spanish", "Arabic", "Portuguese"]) base.push({ id: `language:${value}`, kind: "language", value });
    for (const value of ["Euro", "United States dollar", "West African CFA franc", "Central African CFA franc"]) base.push({ id: `currency:${value}`, kind: "currency", value });
  }
  if (difficulty === "hard") {
    const subregions = ["Western Europe", "Eastern Europe", "Western Asia", "Southern Asia", "South America", "Northern Africa", "Western Africa", "Eastern Africa"]
      .filter((value) => countries.some((country) => country.subregion === value));
    for (const value of subregions) base.push({ id: `subregion:${value}`, kind: "subregion", value });
    for (const country of countries.filter((c) => c.borders.length >= 4)) base.push({ id: `border:${country.cca3}`, kind: "border", value: country.cca3 });
  }
  return base;
}

function perfectMatching(candidateCodes: string[][], random: () => number): string[] | null {
  const order = candidateCodes.map((_, index) => index).sort((a, b) => candidateCodes[a].length - candidateCodes[b].length);
  const answer = Array<string>(candidateCodes.length);
  const owner = new Map<string, number>();
  const options = candidateCodes.map((codes) => shuffle(codes, random));
  function augment(cell: number, seen: Set<string>): boolean {
    for (const code of options[cell]) {
      if (seen.has(code)) continue;
      seen.add(code);
      const previous = owner.get(code);
      if (previous === undefined || augment(previous, seen)) {
        owner.set(code, cell);
        answer[cell] = code;
        return true;
      }
    }
    return false;
  }
  for (const cell of order) if (!augment(cell, new Set())) return null;
  return answer;
}

function tryBoard(countries: Country[], difficulty: Difficulty, rows: GridConstraint[], columns: GridConstraint[], random: () => number, seed: number, fallback: boolean): GridPuzzle | null {
  const floor = MIN_CANDIDATES[difficulty];
  const cells: GridCell[] = [];
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
    const candidates = countries.filter((country) => matchesGridConstraint(country, rows[row]) && matchesGridConstraint(country, columns[column])).map((country) => country.cca3);
    if (candidates.length < floor) return null;
    cells.push({ row, column, candidates });
  }
  const witness = perfectMatching(cells.map((cell) => cell.candidates), random);
  return witness ? { seed, difficulty, rows, columns, cells, witness, fallback } : null;
}

const FALLBACKS: Record<Difficulty, { rows: [GridConstraint, GridConstraint, GridConstraint]; columns: [GridConstraint, GridConstraint, GridConstraint] }> = {
  easy: {
    rows: ["Africa", "Asia", "Europe"].map((value) => ({ id: `region:${value}`, kind: "region", value })) as [GridConstraint, GridConstraint, GridConstraint],
    columns: ["small", "medium", "large"].map((value) => ({ id: `population:${value}`, kind: "population", value })) as [GridConstraint, GridConstraint, GridConstraint],
  },
  medium: {
    rows: ["Africa", "Americas", "Europe"].map((value) => ({ id: `region:${value}`, kind: "region", value })) as [GridConstraint, GridConstraint, GridConstraint],
    columns: ["small", "medium", "large"].map((value) => ({ id: `area:${value}`, kind: "area", value })) as [GridConstraint, GridConstraint, GridConstraint],
  },
  hard: {
    rows: ["Africa", "Americas", "Asia"].map((value) => ({ id: `region:${value}`, kind: "region", value })) as [GridConstraint, GridConstraint, GridConstraint],
    columns: ["small", "medium", "large"].map((value) => ({ id: `area:${value}`, kind: "area", value })) as [GridConstraint, GridConstraint, GridConstraint],
  },
};

export function generateGrid(countries: Country[], difficulty: Difficulty, seed: number): GridPuzzle {
  const clean = countries.filter((country) => country.independent && country.cca3 && country.latlng);
  const random = seededRandom(seed);
  const pool = constraintsFor(clean, difficulty);
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    const picked = shuffle(pool, random).slice(0, 6);
    const rows = picked.slice(0, 3);
    const columns = picked.slice(3);
    if (new Set(picked.map((c) => c.id)).size !== 6) continue;
    const puzzle = tryBoard(clean, difficulty, rows, columns, random, seed >>> 0, false);
    if (puzzle) return puzzle;
  }
  const puzzle = generateFallbackGrid(clean, difficulty, seed, random);
  if (!puzzle) throw new Error(`Geo Grid fallback is invalid for ${difficulty}`);
  return puzzle;
}

export function generateFallbackGrid(countries: Country[], difficulty: Difficulty, seed: number, random = seededRandom(seed)): GridPuzzle | null {
  const clean = countries.filter((country) => country.independent && country.cca3 && country.latlng);
  const fallback = FALLBACKS[difficulty];
  return tryBoard(clean, difficulty, fallback.rows, fallback.columns, random, seed >>> 0, true);
}

export function validateGridEntry(puzzle: GridPuzzle, countries: Country[], row: number, column: number, cca3: string, used: ReadonlySet<string>, filledCells: ReadonlySet<number> = new Set()): "valid" | "duplicate" | "mismatch" | "deadEnd" {
  if (used.has(cca3)) return "duplicate";
  const country = countries.find((item) => item.cca3 === cca3);
  if (!country || !countryFitsCell(country, puzzle, row, column)) return "mismatch";
  const occupied = new Set([...used, cca3]);
  const chosenIndex = row * 3 + column;
  const remaining = puzzle.cells.filter((_, index) => index !== chosenIndex && !filledCells.has(index))
    .map((cell) => cell.candidates.filter((code) => !occupied.has(code)));
  if (remaining.some((options) => options.length === 0) || !perfectMatching(remaining, seededRandom(puzzle.seed ^ chosenIndex))) return "deadEnd";
  return "valid";
}
