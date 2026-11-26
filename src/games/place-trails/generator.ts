import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { capitalLabel } from "@/games/aliases";
import { createSeededRandom } from "@/lib/random";
import type { Country, Difficulty, Locale } from "@/lib/types";

/**
 * Place Trails generator.
 *
 * A theme (derived from the country dataset) supplies 4–8 places whose letter
 * counts fill a 6-column grid exactly. The grid is then partitioned into one
 * 8-neighbour path per place with randomised backtracking. Every cell belongs
 * to exactly one hidden word, paths never reuse a cell and trails never cross
 * diagonally, so the drawn lines stay readable.
 *
 * The theme and the chosen places come from a locale-independent stream and
 * must fit the grid in English AND German, so the daily puzzle hides the same
 * places in both languages. The letters (and therefore the layout) follow the
 * player's language.
 */

export const TRAIL_COLS = 6;
export const MIN_WORD = 4;
export const MAX_WORD = 11;
const LOCALES: Locale[] = ["en", "de"];

/** German capital names the shared alias table does not list yet. */
const CAPITAL_DE_EXTRA: Record<string, string> = {
  LUX: "Luxemburg",
  VAT: "Vatikanstadt",
  CUB: "Havanna",
  GTM: "Guatemala-Stadt",
  PAN: "Panama-Stadt",
};

/**
 * Uppercase letters for the grid: spaces, hyphens and apostrophes vanish,
 * German umlauts stay single letters, ß becomes SS and other diacritics are
 * stripped. Names with any other character (dots, brackets, Ø …) are unusable.
 */
export function toTrailWord(name: string): string | null {
  let out = "";
  for (const char of name.normalize("NFC").toUpperCase()) {
    if (char === "Ä" || char === "Ö" || char === "Ü") out += char;
    else out += char.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  out = out.replace(/[\s\-'’‐‑]/g, "");
  return /^[A-ZÄÖÜ]+$/.test(out) ? out : null;
}

// ── Themes ─────────────────────────────────────────────────────────────

export type ThemeKind = "region" | "neighbors" | "capitals" | "landlocked" | "islands" | "language" | "euro" | "populous" | "largest";

export interface ThemeEntry {
  /** Country the place belongs to (the country itself, or the capital's country). */
  cca3: string;
  flag: string;
  tier: Country["difficulty"];
  label: Record<Locale, string>;
  word: Record<Locale, string>;
}

export interface TrailTheme {
  id: string;
  kind: ThemeKind;
  /** Message key of the title; `{region}` / `{country}` filled by the UI. */
  titleKey: string;
  /** Dataset region or subregion name (message key suffix). */
  region?: string;
  /** cca3 of the country whose neighbours are hidden. */
  country?: string;
  entries: ThemeEntry[];
}

/** Subregions and continents that have localized title phrases. */
export const THEME_REGIONS = [
  "Africa", "Asia", "Europe", "Americas", "Oceania",
  "Northern Africa", "Western Africa", "Middle Africa", "Eastern Africa", "Southern Africa",
  "Caribbean", "Central America", "South America",
  "Western Asia", "Central Asia", "Southern Asia", "Eastern Asia", "South-Eastern Asia",
  "Northern Europe", "Western Europe", "Central Europe", "Southern Europe", "Southeast Europe", "Eastern Europe",
  "Melanesia", "Micronesia", "Polynesia",
] as const;
const REGION_SET = new Set<string>(THEME_REGIONS);

export const LANGUAGE_THEMES = ["Spanish", "French", "Portuguese", "Arabic", "Russian"] as const;
/** Listed in the dataset, but not a fair "Arabic-speaking country" for a puzzle title. */
const LANGUAGE_EXCLUDE: Record<string, string[]> = { Arabic: ["ISR", "ERI"] };

function makeEntry(country: Country, label: Record<Locale, string>): ThemeEntry | null {
  const en = toTrailWord(label.en);
  const de = toTrailWord(label.de);
  if (!en || !de) return null;
  if (en.length < MIN_WORD || en.length > MAX_WORD || de.length < MIN_WORD || de.length > MAX_WORD) return null;
  return { cca3: country.cca3, flag: country.flag, tier: country.difficulty, label, word: { en, de } };
}

const countryEntry = (country: Country) => makeEntry(country, { en: country.name.en, de: country.name.de });

function capitalEntry(country: Country): ThemeEntry | null {
  if (!country.capital) return null;
  return makeEntry(country, { en: country.capital, de: CAPITAL_DE_EXTRA[country.cca3] ?? capitalLabel(country, "de") });
}

function entries(countries: Country[], build: (country: Country) => ThemeEntry | null): ThemeEntry[] {
  const list: ThemeEntry[] = [];
  const seen = new Set<string>();
  for (const country of countries) {
    const entry = build(country);
    if (!entry || seen.has(entry.word.en) || seen.has(`de:${entry.word.de}`)) continue;
    seen.add(entry.word.en);
    seen.add(`de:${entry.word.de}`);
    list.push(entry);
  }
  return list;
}

let themeCache: TrailTheme[] | null = null;

/** All themes the dataset supports; each lists every eligible place. */
export function allThemes(): TrailTheme[] {
  if (themeCache) return themeCache;
  const pool = COUNTRIES.filter((country) => country.independent);
  const themes: TrailTheme[] = [];
  const add = (theme: TrailTheme) => { if (theme.entries.length >= 5) themes.push(theme); };

  for (const region of THEME_REGIONS) {
    const members = pool.filter((country) => country.subregion === region);
    if (members.length) add({ id: `region:${region}`, kind: "region", titleKey: "placetrails.theme.region", region, entries: entries(members, countryEntry) });
  }
  for (const country of pool) {
    const neighbours = country.borders.map(getCountryByCca3).filter((item): item is Country => Boolean(item?.independent));
    add({ id: `neighbors:${country.cca3}`, kind: "neighbors", titleKey: "placetrails.theme.neighbors", country: country.cca3, entries: entries(neighbours, countryEntry) });
  }
  const capitalScopes = ["Europe", "Northern Europe", "Western Europe", "Central Europe", "Southern Europe", "Southeast Europe", "South America", "Central America", "Caribbean"];
  for (const region of capitalScopes) {
    const members = pool.filter((country) => country.region === region || country.subregion === region);
    add({ id: `capitals:${region}`, kind: "capitals", titleKey: "placetrails.theme.capitals", region, entries: entries(members, capitalEntry) });
  }
  for (const region of ["Africa", "Asia", "Europe"]) {
    add({ id: `landlocked:${region}`, kind: "landlocked", titleKey: "placetrails.theme.landlocked", region, entries: entries(pool.filter((country) => country.region === region && country.landlocked), countryEntry) });
  }
  // No land border and not landlocked: island states. Australia is a continent, not counted.
  const islandStates = pool.filter((country) => country.borders.length === 0 && !country.landlocked && country.cca3 !== "AUS");
  for (const region of ["Caribbean", "Africa", "Asia", "Oceania"]) {
    add({ id: `islands:${region}`, kind: "islands", titleKey: "placetrails.theme.islands", region, entries: entries(islandStates.filter((country) => country.region === region || country.subregion === region), countryEntry) });
  }
  for (const language of LANGUAGE_THEMES) {
    const exclude = new Set(LANGUAGE_EXCLUDE[language] ?? []);
    add({ id: `language:${language}`, kind: "language", titleKey: `placetrails.theme.language.${language}`, entries: entries(pool.filter((country) => country.languages.includes(language) && !exclude.has(country.cca3)), countryEntry) });
  }
  add({ id: "euro", kind: "euro", titleKey: "placetrails.theme.euro", entries: entries(pool.filter((country) => country.region === "Europe" && country.currencies.includes("Euro")), countryEntry) });
  add({ id: "populous", kind: "populous", titleKey: "placetrails.theme.populous", entries: entries(pool.filter((country) => country.population > 100_000_000), countryEntry) });
  add({ id: "largest", kind: "largest", titleKey: "placetrails.theme.largest", entries: entries([...pool].sort((a, b) => b.area - a.area).slice(0, 20), countryEntry) });

  for (const theme of themes) if (theme.region && !REGION_SET.has(theme.region)) throw new Error(`Missing region label for ${theme.region}`);
  themeCache = themes;
  return themes;
}

// ── Difficulty ─────────────────────────────────────────────────────────

interface DifficultyConfig {
  /** Allowed row counts; the first is preferred. */
  rows: number[];
  minWords: number;
  maxWords: number;
  maxTier: number;
  maxLen: number;
  /** −1 favours short, well-known names; +1 favours long, lesser-known ones. */
  bias: number;
}

export const TRAIL_DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { rows: [7, 8], minWords: 5, maxWords: 6, maxTier: 2, maxLen: 10, bias: -1 },
  medium: { rows: [8, 7, 9], minWords: 6, maxWords: 7, maxTier: 3, maxLen: 11, bias: 0 },
  hard: { rows: [9, 8], minWords: 6, maxWords: 8, maxTier: 4, maxLen: 11, bias: 1 },
};

function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

/**
 * Kinds in weighted random order (weight √themes, so the many neighbour and
 * region themes appear more often without crowding out the rest), each kind's
 * themes shuffled. A kind with no feasible theme simply falls through.
 */
function themeOrder(random: () => number): TrailTheme[] {
  const byKind = new Map<ThemeKind, TrailTheme[]>();
  for (const theme of allThemes()) byKind.set(theme.kind, [...(byKind.get(theme.kind) ?? []), theme]);
  const kinds = [...byKind.entries()]
    .map(([kind, themes]) => ({ kind, key: Math.pow(random(), 1 / Math.sqrt(themes.length)) }))
    .sort((a, b) => b.key - a.key);
  return kinds.flatMap(({ kind }) => shuffleInPlace([...(byKind.get(kind) ?? [])], random));
}

/**
 * Picks places whose letter totals fit a 6-column grid in both locales.
 * The candidates are tried in a biased random order (shorter/better-known
 * first on easy, longer/lesser-known first on hard).
 */
export function pickPlaces(candidates: ThemeEntry[], config: DifficultyConfig, random: () => number, sizes: number[]): ThemeEntry[] | null {
  const allowed = new Set(sizes);
  const maxSize = Math.max(...sizes);
  const scored = candidates.map((entry) => {
    const length = (entry.word.en.length + entry.word.de.length) / 2;
    const weight = ((entry.tier - 1) / 3) * 0.6 + ((length - MIN_WORD) / (MAX_WORD - MIN_WORD)) * 0.4;
    return { entry, key: random() + config.bias * weight };
  });
  const ordered = scored.sort((a, b) => b.key - a.key).map((item) => item.entry);
  const chosen: ThemeEntry[] = [];
  let nodes = 0;
  const search = (index: number, sumEn: number, sumDe: number): boolean => {
    if (++nodes > 6000) return false;
    const count = chosen.length;
    if (count >= config.minWords && allowed.has(sumEn) && allowed.has(sumDe)) return true;
    if (count >= config.maxWords || index >= ordered.length) return false;
    if (ordered.length - index + count < config.minWords) return false;
    const entry = ordered[index];
    if (sumEn + entry.word.en.length <= maxSize && sumDe + entry.word.de.length <= maxSize) {
      chosen.push(entry);
      if (search(index + 1, sumEn + entry.word.en.length, sumDe + entry.word.de.length)) return true;
      chosen.pop();
    }
    return search(index + 1, sumEn, sumDe);
  };
  return search(0, 0, 0) ? [...chosen] : null;
}

// ── Grid partition ─────────────────────────────────────────────────────

const neighbourCache = new Map<string, number[][]>();

export function gridNeighbours(rows: number, cols: number): number[][] {
  const key = `${rows}x${cols}`;
  const cached = neighbourCache.get(key);
  if (cached) return cached;
  const list: number[][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell: number[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < rows && c >= 0 && c < cols) cell.push(r * cols + c);
        }
      }
      list.push(cell);
    }
  }
  neighbourCache.set(key, list);
  return list;
}

export function areAdjacent(a: number, b: number, cols: number): boolean {
  if (a === b) return false;
  return Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) <= 1 && Math.abs((a % cols) - (b % cols)) <= 1;
}

/** Index of the 2×2 block a diagonal step passes through, times 4, plus 1 ("\") or 2 ("/"); −1 for straight steps. */
export function diagonalCode(a: number, b: number, cols: number): number {
  const ra = Math.floor(a / cols);
  const ca = a % cols;
  const rb = Math.floor(b / cols);
  const cb = b % cols;
  if (ra === rb || ca === cb) return -1;
  const block = Math.min(ra, rb) * (cols - 1) + Math.min(ca, cb);
  return block * 4 + ((rb - ra) * (cb - ca) > 0 ? 1 : 2);
}

/**
 * Splits a rows×cols grid into paths of the given lengths. The next word
 * always starts at the first empty cell in reading order and grows through
 * random empty neighbours; branches are pruned when the leftover region has
 * a component that the remaining word lengths cannot fill exactly. Returns
 * null when the step budget runs out.
 */
export function partitionGrid(lengths: number[], rows: number, cols: number, random: () => number, budget = 800, jitter = 2.5): number[][] | null {
  const size = rows * cols;
  if (lengths.reduce((sum, length) => sum + length, 0) !== size || lengths.length > 30) return null;
  const neighbours = gridNeighbours(rows, cols);
  const owner = new Int16Array(size).fill(-1);
  const diagonal = new Uint8Array(Math.max(1, (rows - 1) * (cols - 1)));
  const paths: number[][] = lengths.map(() => []);
  const sumsCache = new Map<number, Uint8Array>();
  const stamp = new Int32Array(size);
  const queue = new Int16Array(size);
  let stampId = 0;
  let steps = 0;
  let aborted = false;

  const reachable = (mask: number): Uint8Array => {
    const cached = sumsCache.get(mask);
    if (cached) return cached;
    const sums = new Uint8Array(size + 1);
    sums[0] = 1;
    for (let word = 0; word < lengths.length; word++) {
      if (!(mask & (1 << word))) continue;
      for (let total = size; total >= lengths[word]; total--) if (sums[total - lengths[word]]) sums[total] = 1;
    }
    sumsCache.set(mask, sums);
    return sums;
  };

  /** Every empty component (except those touching `tip`) must be an exact sum of remaining lengths. */
  const regionsFit = (restMask: number, tip: number, need: number): boolean => {
    const sums = reachable(restMask);
    stampId++;
    let tipReach = 0;
    for (let seed = 0; seed < size; seed++) {
      if (owner[seed] !== -1 || stamp[seed] === stampId) continue;
      let head = 0;
      let tail = 0;
      queue[tail++] = seed;
      stamp[seed] = stampId;
      let touchesTip = false;
      while (head < tail) {
        const cell = queue[head++];
        for (const next of neighbours[cell]) {
          if (next === tip) touchesTip = true;
          if (owner[next] === -1 && stamp[next] !== stampId) {
            stamp[next] = stampId;
            queue[tail++] = next;
          }
        }
      }
      if (tip >= 0 && touchesTip) { tipReach += tail; continue; }
      if (!sums[tail]) return false;
    }
    return tip < 0 || tipReach >= need;
  };

  const extend = (word: number, path: number[], restMask: number): boolean => {
    if (++steps > budget) { aborted = true; return false; }
    if (path.length === lengths[word]) {
      if (!regionsFit(restMask, -1, 0)) return false;
      if (solve(restMask)) { paths[word] = [...path]; return true; }
      return false;
    }
    const tip = path[path.length - 1];
    // Warnsdorff-style ordering with jitter: squeezed cells first, so the
    // trail does not leave unreachable pockets, while paths still bend randomly.
    const options = neighbours[tip]
      .filter((next) => owner[next] === -1)
      .map((next) => {
        let free = 0;
        for (const around of neighbours[next]) if (owner[around] === -1) free++;
        return { next, key: free + random() * jitter };
      })
      .sort((a, b) => a.key - b.key);
    for (const { next } of options) {
      const code = diagonalCode(tip, next, cols);
      if (code >= 0 && diagonal[code >> 2]) continue;
      owner[next] = word;
      path.push(next);
      if (code >= 0) diagonal[code >> 2] = code & 3;
      if (regionsFit(restMask, next, lengths[word] - path.length) && extend(word, path, restMask)) return true;
      if (code >= 0) diagonal[code >> 2] = 0;
      path.pop();
      owner[next] = -1;
      if (aborted) return false;
    }
    return false;
  };

  const solve = (mask: number): boolean => {
    if (mask === 0) return true;
    let start = 0;
    while (start < size && owner[start] !== -1) start++;
    if (start >= size) return false;
    const words = shuffleInPlace(lengths.map((_, word) => word).filter((word) => mask & (1 << word)), random);
    const triedLengths = new Set<number>();
    for (const word of words) {
      // Paths only depend on the length; another word of the same length cannot do better.
      if (triedLengths.has(lengths[word])) continue;
      triedLengths.add(lengths[word]);
      owner[start] = word;
      if (extend(word, [start], mask & ~(1 << word))) return true;
      owner[start] = -1;
      if (aborted) return false;
    }
    return false;
  };

  return solve((1 << lengths.length) - 1) ? paths : null;
}

// ── Puzzle ─────────────────────────────────────────────────────────────

export interface TrailWord {
  id: number;
  cca3: string;
  flag: string;
  /** Display name in the board's locale. */
  label: string;
  /** Grid letters, in reading order of the trail. */
  word: string;
  /** Cell indices, path[i] holds word[i]. */
  path: number[];
}

export interface TrailPuzzle {
  seed: string;
  difficulty: Difficulty;
  locale: Locale;
  theme: Omit<TrailTheme, "entries">;
  rows: number;
  cols: number;
  letters: string[];
  words: TrailWord[];
}

function buildPuzzle(seed: string, difficulty: Difficulty, locale: Locale, theme: TrailTheme, places: ThemeEntry[], rows: number, paths: number[][], random: () => number): TrailPuzzle {
  const letters = new Array<string>(rows * TRAIL_COLS).fill("");
  const words = places.map((place, id): TrailWord => {
    const word = place.word[locale];
    // The solver grows each trail from its top-left cell; flip half of them so
    // the first letter is not always the upper end.
    const path = random() < 0.5 ? [...paths[id]].reverse() : [...paths[id]];
    path.forEach((cell, index) => { letters[cell] = word[index]; });
    return { id, cca3: place.cca3, flag: place.flag, label: place.label[locale], word, path };
  });
  const { entries: _entries, ...meta } = theme;
  void _entries;
  return { seed, difficulty, locale, theme: meta, rows, cols: TRAIL_COLS, letters, words };
}

/** Deterministic per (seed, difficulty, locale). Theme and places do not depend on the locale. */
export function generateTrailPuzzle(seed: string, difficulty: Difficulty, locale: Locale): TrailPuzzle {
  const config = TRAIL_DIFFICULTY[difficulty];
  const themes = themeOrder(createSeededRandom(`${seed}:themes`));
  const passes = [[config.rows[0]], config.rows];
  for (const theme of themes) {
    const candidates = theme.entries.filter((entry) => entry.tier <= config.maxTier && LOCALES.every((code) => entry.word[code].length <= config.maxLen));
    if (candidates.length < config.minWords) continue;
    for (let pass = 0; pass < passes.length; pass++) {
      const places = pickPlaces(candidates, config, createSeededRandom(`${seed}:${theme.id}:${pass}`), passes[pass].map((rows) => rows * TRAIL_COLS));
      if (!places) continue;
      const lengths = places.map((place) => place.word[locale].length);
      const rows = lengths.reduce((sum, length) => sum + length, 0) / TRAIL_COLS;
      for (let attempt = 0; attempt < 10; attempt++) {
        const random = createSeededRandom(`${seed}:${theme.id}:${pass}:${locale}:${attempt}`);
        const paths = partitionGrid(lengths, rows, TRAIL_COLS, random);
        if (paths) return buildPuzzle(seed, difficulty, locale, theme, places, rows, paths, random);
      }
    }
  }
  throw new Error(`No Place Trails board for seed ${seed}`);
}

/** The cells of the selection spell `word` along its hidden trail (either reading direction). */
export function matchesTrail(selection: readonly number[], word: TrailWord, letters: readonly string[]): boolean {
  if (selection.length !== word.path.length) return false;
  const cells = new Set(word.path);
  if (!selection.every((cell) => cells.has(cell)) || new Set(selection).size !== selection.length) return false;
  const spelled = selection.map((cell) => letters[cell]).join("");
  return spelled === word.word || [...spelled].reverse().join("") === word.word;
}

export type TrailCheck =
  | { kind: "short" }
  | { kind: "found"; word: TrailWord }
  | { kind: "already"; word: TrailWord }
  | { kind: "other-path"; word: TrailWord }
  | { kind: "wrong" };

/**
 * Judges one submitted selection. A theme word counts only on its own hidden
 * cells: accepting the same letters elsewhere could strand the remaining
 * letters, so a different trail gets the neutral "different path" answer.
 */
export function checkSelection(puzzle: TrailPuzzle, selection: readonly number[], found: ReadonlySet<number>): TrailCheck {
  if (selection.length < MIN_WORD) return { kind: "short" };
  const spelled = selection.map((cell) => puzzle.letters[cell]).join("");
  const reversed = [...spelled].reverse().join("");
  const exact = puzzle.words.find((word) => matchesTrail(selection, word, puzzle.letters));
  if (exact) return found.has(exact.id) ? { kind: "already", word: exact } : { kind: "found", word: exact };
  const sameWord = puzzle.words.find((word) => word.word === spelled || word.word === reversed);
  if (sameWord) return found.has(sameWord.id) ? { kind: "already", word: sameWord } : { kind: "other-path", word: sameWord };
  return { kind: "wrong" };
}

// ── Scoring ────────────────────────────────────────────────────────────

export const WORD_POINTS = 150;
export const HINT_COST = 100;
export const CLEAN_BONUS = 300;

export function trailScore({ found, hints, complete, multiplier }: { found: number; hints: number; complete: boolean; multiplier: number }): number {
  const bonus = complete && hints === 0 ? CLEAN_BONUS : 0;
  return Math.max(0, Math.round((WORD_POINTS * found - HINT_COST * hints + bonus) * multiplier));
}
