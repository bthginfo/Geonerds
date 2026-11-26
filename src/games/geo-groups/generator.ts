import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { createSeededRandom } from "@/lib/random";
import type { Country, Difficulty } from "@/lib/types";

/**
 * Geo Groups board generator.
 *
 * A board is 16 countries that split into four hidden groups of four. Every
 * group is defined by a geographic category taken from the shared dataset.
 * Hard guarantee: each tile satisfies exactly one of the four chosen
 * categories, so the grouping is unique.
 *
 * Fairness beyond the raw data: every category lists "uncertain" countries
 * whose membership is debatable (border-line subregions, de-facto languages,
 * co-circulating currencies, values close to a threshold, overseas
 * territories). None of them may appear on a board that uses the category,
 * neither as a member nor as a tile of another group, so a defensible
 * alternative answer can never be marked wrong.
 *
 * Generation only uses cca3 codes and the seed, never localized names, so the
 * same seed deals the same board in English and German.
 */

export type GroupLevel = 0 | 1 | 2 | 3;

export const GROUP_LEVELS: readonly GroupLevel[] = [0, 1, 2, 3];

export interface CategoryDef {
  /** Stable id; the label lives at `geogroups.cat.<id>` in messages.ts. */
  id: string;
  /** At most one category per family on a board. */
  family: string;
  /** 1 (most straightforward) … 4 (trickiest). */
  rating: 1 | 2 | 3 | 4;
  /** cca3 codes that satisfy the category. */
  members: ReadonlySet<string>;
  /** cca3 codes that must not appear on a board using this category. */
  uncertain: ReadonlySet<string>;
  /** Countries that look as if they might belong; used to seed red herrings. */
  nearMiss: (country: Country) => boolean;
  /** Relative draw weight; lowers categories that would otherwise repeat too often. */
  weight: number;
}

export interface GeoGroup {
  categoryId: string;
  level: GroupLevel;
  /** Four cca3 codes. */
  members: string[];
}

export interface GeoGroupsBoard {
  /** Groups in difficulty order: yellow, green, blue, purple. */
  groups: GeoGroup[];
  /** The 16 tiles (cca3) in their dealt order. */
  tiles: string[];
  /** Tiles that also look like a plausible fit for another group on the board. */
  redHerrings: string[];
}

export function categoryLabelKey(categoryId: string): string {
  return `geogroups.cat.${categoryId}`;
}

// ── Dataset helpers ───────────────────────────────────────────────────

const BY_CCA3 = new Map(COUNTRIES.map((country) => [country.cca3, country]));

/** Land neighbours in the dataset, symmetric (either side listing the border counts). */
const NEIGHBOURS = new Map<string, Set<string>>(COUNTRIES.map((country) => [country.cca3, new Set<string>()]));
for (const country of COUNTRIES) {
  for (const other of country.borders) {
    if (!BY_CCA3.has(other)) continue;
    NEIGHBOURS.get(country.cca3)!.add(other);
    NEIGHBOURS.get(other)!.add(country.cca3);
  }
}

function neighbours(cca3: string): Set<string> {
  return NEIGHBOURS.get(cca3) ?? new Set();
}

function set(values: Iterable<string>): ReadonlySet<string> {
  return new Set(values);
}

function codes(predicate: (country: Country) => boolean): ReadonlySet<string> {
  return set(COUNTRIES.filter(predicate).map((country) => country.cca3));
}

function bordersAny(country: Country, members: ReadonlySet<string>): boolean {
  for (const other of neighbours(country.cca3)) if (members.has(other)) return true;
  return false;
}

function sharesSubregion(country: Country, members: ReadonlySet<string>): boolean {
  for (const code of members) if (BY_CCA3.get(code)?.subregion === country.subregion) return true;
  return false;
}

/** Countries close to a numeric threshold are left out of boards using it. */
function band(value: (country: Country) => number, low: number, high: number): ReadonlySet<string> {
  return codes((country) => value(country) >= low && value(country) <= high);
}

const CATEGORIES: CategoryDef[] = [];

function add(def: Omit<CategoryDef, "uncertain" | "nearMiss" | "weight"> & { uncertain?: Iterable<string>; nearMiss?: (country: Country) => boolean; weight?: number }) {
  CATEGORIES.push({ ...def, uncertain: set(def.uncertain ?? []), nearMiss: def.nearMiss ?? (() => false), weight: def.weight ?? 1 });
}

// ── Subregions (dataset `subregion`) ──────────────────────────────────
// Only subregions with a conventional, well-delimited meaning are used. The
// uncertain lists hold countries that are often counted in (or out of) the
// region in common usage.

const SUBREGIONS: { id: string; value: string; rating: 1 | 2 | 3 | 4; uncertain: string[]; weight?: number }[] = [
  { id: "central-america", value: "Central America", rating: 1, uncertain: ["MEX"] },
  { id: "south-america", value: "South America", rating: 1, uncertain: ["PAN", "TTO"] },
  { id: "northern-africa", value: "Northern Africa", rating: 1, uncertain: ["MRT", "SSD"] },
  { id: "northern-europe", value: "Northern Europe", rating: 1, uncertain: ["DEU", "NLD", "BEL", "POL", "BLR", "RUS"] },
  { id: "eastern-asia", value: "Eastern Asia", rating: 1, uncertain: ["RUS"] },
  { id: "caribbean", value: "Caribbean", rating: 2, uncertain: ["BLZ", "GUY", "SUR"] },
  { id: "central-asia", value: "Central Asia", rating: 2, uncertain: ["AFG", "MNG"] },
  { id: "western-africa", value: "Western Africa", rating: 2, uncertain: ["CMR", "TCD"] },
  { id: "southern-africa", value: "Southern Africa", rating: 2, uncertain: ["ZWE", "MOZ", "ZMB", "AGO", "MWI", "MDG", "MUS", "COM", "SYC"] },
  // The dataset files Iran and Afghanistan under Southern Asia; both are as often called Western/Central Asia.
  { id: "southern-asia", value: "Southern Asia", rating: 2, uncertain: ["IRN", "AFG", "MMR"] },
  { id: "south-eastern-asia", value: "South-Eastern Asia", rating: 2, uncertain: ["PNG"] },
  { id: "central-europe", value: "Central Europe", rating: 2, uncertain: ["DEU", "CHE", "LIE", "HRV", "ROU"] },
  { id: "southeast-europe", value: "Southeast Europe", rating: 2, uncertain: ["GRC", "SVN", "MDA", "TUR", "CYP", "HUN"] },
  // Kiribati spans Micronesia and Polynesia.
  { id: "micronesia", value: "Micronesia", rating: 4, uncertain: ["KIR"], weight: 0.4 },
];

for (const sub of SUBREGIONS) {
  const members = codes((country) => country.subregion === sub.value);
  const region = BY_CCA3.get([...members][0])?.region;
  if (!region) continue;
  add({
    id: `sub-${sub.id}`,
    family: "subregion",
    rating: sub.rating,
    members,
    uncertain: sub.uncertain,
    weight: sub.weight,
    // Decoys sit just outside the subregion: same continent and sharing a border with a member.
    nearMiss: (country) => country.region === region && bordersAny(country, members),
  });
}

// ── Coast and borders ─────────────────────────────────────────────────

const LANDLOCKED = codes((country) => country.landlocked);
add({
  id: "landlocked",
  family: "landlocked",
  rating: 2,
  members: LANDLOCKED,
  nearMiss: (country) => [...neighbours(country.cca3)].filter((code) => LANDLOCKED.has(code)).length >= 2,
});

add({
  id: "no-land-borders",
  family: "border-count",
  rating: 2,
  members: codes((country) => neighbours(country.cca3).size === 0 && country.borders.length === 0),
  // The British Sovereign Base Areas give Cyprus a land border with a UK territory.
  uncertain: ["CYP"],
  nearMiss: (country) => neighbours(country.cca3).size === 1,
});

add({
  id: "one-neighbour",
  family: "border-count",
  rating: 3,
  members: codes((country) => country.borders.length === 1 && neighbours(country.cca3).size === 1),
  // Hans Island (2022) gives Canada and Denmark a second neighbour; the UK borders
  // Spain and Cyprus through overseas territories.
  uncertain: ["CAN", "DNK", "GBR"],
  weight: 0.6,
  nearMiss: (country) => neighbours(country.cca3).size === 0 || neighbours(country.cca3).size === 2,
});

/**
 * "Borders X" for countries with at least four land neighbours in the dataset.
 * X itself never appears on the board. Extra uncertain countries cover borders
 * through overseas territories or disputed areas.
 */
const BORDER_TARGETS: { cca3: string; rating: 1 | 2 | 3 | 4; uncertain?: string[] }[] = [
  { cca3: "DEU", rating: 2 },
  { cca3: "FRA", rating: 2, uncertain: ["BRA", "SUR", "NLD"] }, // French Guiana, Saint Martin
  { cca3: "ITA", rating: 2 },
  { cca3: "ESP", rating: 2, uncertain: ["GBR"] }, // Gibraltar
  { cca3: "RUS", rating: 2 },
  { cca3: "CHN", rating: 2 },
  { cca3: "BRA", rating: 2, uncertain: ["FRA"] }, // French Guiana
  { cca3: "AUT", rating: 3 },
  { cca3: "CHE", rating: 3 },
  { cca3: "POL", rating: 3 },
  { cca3: "HUN", rating: 3 },
  { cca3: "UKR", rating: 3 },
  { cca3: "TUR", rating: 3 },
  { cca3: "IND", rating: 3, uncertain: ["AFG"] }, // Kashmir claim
  { cca3: "ARG", rating: 3 },
  { cca3: "PER", rating: 3 },
  { cca3: "COL", rating: 3 },
  { cca3: "BOL", rating: 3 },
  { cca3: "SAU", rating: 3 },
  { cca3: "IRN", rating: 3 },
  { cca3: "IRQ", rating: 3 },
  { cca3: "KAZ", rating: 3 },
  { cca3: "AFG", rating: 3, uncertain: ["IND"] }, // Kashmir claim
  { cca3: "THA", rating: 3 },
  { cca3: "ZAF", rating: 3 },
  { cca3: "NGA", rating: 3 },
  { cca3: "DZA", rating: 3 },
  { cca3: "LBY", rating: 3 },
  { cca3: "SRB", rating: 4, uncertain: ["ALB"] }, // Serbia's claim to Kosovo
  { cca3: "COD", rating: 4 },
  { cca3: "TZA", rating: 4 },
  { cca3: "ZMB", rating: 4 },
  { cca3: "KEN", rating: 4 },
  { cca3: "ETH", rating: 4 },
  { cca3: "SDN", rating: 4 },
  { cca3: "MLI", rating: 4 },
];

for (const target of BORDER_TARGETS) {
  const members = set(neighbours(target.cca3));
  const target2 = BY_CCA3.get(target.cca3)!;
  const secondRing = new Set<string>();
  for (const code of members) for (const next of neighbours(code)) if (next !== target.cca3 && !members.has(next)) secondRing.add(next);
  add({
    id: `borders-${target.cca3}`,
    family: "borders",
    rating: target.rating,
    members,
    uncertain: [target.cca3, ...(target.uncertain ?? [])],
    nearMiss: (country) => secondRing.has(country.cca3) || country.subregion === target2.subregion,
  });
}

// ── Official languages (dataset `languages`) ──────────────────────────
// The dataset lists national as well as official languages. Countries where a
// language is only regional, a working language, recently demoted or de facto
// are uncertain and stay off boards that use that language.

const LANGUAGES: { id: string; values: string[]; rating: 1 | 2 | 3 | 4; uncertain: string[] }[] = [
  { id: "spanish", values: ["Spanish"], rating: 1, uncertain: ["BLZ"] },
  { id: "english", values: ["English"], rating: 2, uncertain: ["ERI", "MYS", "MUS", "LKA", "BRN"] },
  // Mali (2023) and Burkina Faso (2024) demoted French to a working language; Niger (2025) likewise.
  { id: "french", values: ["French"], rating: 2, uncertain: ["LBN", "MUS", "MLI", "BFA", "NER", "DZA", "MAR", "TUN", "MRT", "ITA"] },
  // Israel downgraded Arabic to a "special status" in 2018; Eritrea has no official language.
  { id: "arabic", values: ["Arabic"], rating: 2, uncertain: ["ISR", "ERI"] },
  { id: "portuguese", values: ["Portuguese"], rating: 2, uncertain: [] },
  // German is a recognised national (not official) language in Namibia and regional in South Tyrol.
  { id: "german", values: ["German", "Austro-Bavarian German", "Swiss German"], rating: 2, uncertain: ["NAM", "ITA"] },
  // Russian is official only in Russia, Belarus, Kazakhstan and Kyrgyzstan.
  { id: "russian", values: ["Russian"], rating: 3, uncertain: ["AZE", "TJK", "TKM", "UZB", "UKR", "MDA", "GEO", "ARM"] },
];

for (const language of LANGUAGES) {
  const members = codes((country) => country.languages.some((value) => language.values.includes(value)));
  add({
    id: `lang-${language.id}`,
    family: "language",
    rating: language.rating,
    members,
    uncertain: language.uncertain,
    nearMiss: (country) => bordersAny(country, members),
  });
}

// ── Currencies (dataset `currencies`) ─────────────────────────────────
// Zimbabwe lists nine currencies and is left out of every currency group.

const CURRENCIES: { id: string; value: string; rating: 1 | 2 | 3 | 4; uncertain: string[] }[] = [
  { id: "euro", value: "Euro", rating: 2, uncertain: ["ZWE"] },
  // Liberia, Micronesia and the Bahamas also circulate the US dollar without the dataset listing it as sole tender.
  { id: "usd", value: "United States dollar", rating: 3, uncertain: ["ZWE", "FSM", "LBR", "BHS"] },
  { id: "xof", value: "West African CFA franc", rating: 3, uncertain: [] },
  { id: "xaf", value: "Central African CFA franc", rating: 4, uncertain: [] },
  { id: "xcd", value: "Eastern Caribbean dollar", rating: 4, uncertain: [] },
  { id: "zar", value: "South African rand", rating: 4, uncertain: ["ZWE"] },
  { id: "aud", value: "Australian dollar", rating: 4, uncertain: [] },
];

for (const currency of CURRENCIES) {
  const members = codes((country) => country.currencies.includes(currency.value));
  add({
    id: `cur-${currency.id}`,
    family: "currency",
    rating: currency.rating,
    members,
    uncertain: currency.uncertain,
    nearMiss: (country) => bordersAny(country, members) || (members.size <= 8 && sharesSubregion(country, members)),
  });
}

// ── Size ──────────────────────────────────────────────────────────────

add({
  id: "pop-over-100m",
  family: "population",
  rating: 2,
  members: codes((country) => country.population > 100_000_000),
  uncertain: band((country) => country.population, 95_000_000, 105_000_000),
  nearMiss: (country) => country.population > 60_000_000,
});

add({
  id: "pop-under-1m",
  family: "population",
  rating: 3,
  members: codes((country) => country.population < 1_000_000),
  uncertain: band((country) => country.population, 800_000, 1_300_000),
  nearMiss: (country) => country.population < 3_000_000,
});

add({
  id: "area-over-2m",
  family: "area",
  rating: 2,
  members: codes((country) => country.area > 2_000_000),
  uncertain: band((country) => country.area, 1_800_000, 2_200_000),
  nearMiss: (country) => country.area > 1_000_000,
});

add({
  id: "area-under-1000",
  family: "area",
  rating: 3,
  members: codes((country) => country.area < 1_000),
  uncertain: band((country) => country.area, 900, 1_100),
  nearMiss: (country) => country.area < 5_000,
});

// ── Names ─────────────────────────────────────────────────────────────
// Name categories must hold in both locales, otherwise the country is uncertain.

function nameCategory(id: string, rating: 1 | 2 | 3 | 4, test: (name: string) => boolean, nearMiss: (country: Country) => boolean) {
  add({
    id,
    family: "name",
    rating,
    members: codes((country) => test(country.name.en) && test(country.name.de)),
    uncertain: codes((country) => test(country.name.en) !== test(country.name.de)),
    nearMiss,
  });
}

nameCategory("name-stan", 1, (name) => /stan$/i.test(name), (country) => ["Central Asia", "Southern Asia", "Western Asia", "Eastern Asia"].includes(country.subregion));
nameCategory("name-guinea", 1, (name) => /guinea/i.test(name), (country) => country.cca3 === "GUY" || ["Western Africa", "Middle Africa", "Melanesia"].includes(country.subregion));

add({
  id: "name-saint",
  family: "name",
  rating: 4,
  members: codes((country) => /^(Saint|San|São) /.test(country.name.en)),
  // El Salvador (the Saviour), Dominica (Sunday) and the Dominican Republic (via Santo Domingo).
  uncertain: ["SLV", "DMA", "DOM"],
  weight: 0.6,
  nearMiss: (country) => country.subregion === "Caribbean" || / and /.test(country.name.en),
});

add({
  id: "capital-named-like-country",
  family: "capital",
  rating: 3,
  members: codes((country) => Boolean(country.capital?.toLowerCase().includes(country.name.en.toLowerCase()))),
  // Capitals that share only part of the name, or that the country is named after.
  uncertain: ["TUN", "GNB", "STP", "DZA", "BRA", "BLZ"],
  weight: 0.7,
  nearMiss: (country) => country.area < 3_000,
});

// ── Equator ───────────────────────────────────────────────────────────
// Source: Wikipedia, "Equator" (Geography section) — the equator crosses the land
// of these 11 countries. In the Maldives, Kiribati and Equatorial Guinea it only
// crosses territorial waters, so those three are uncertain.

const EQUATOR_LAND = set(["STP", "GAB", "COG", "COD", "UGA", "KEN", "SOM", "IDN", "ECU", "COL", "BRA"]);
add({
  id: "equator",
  family: "equator",
  rating: 3,
  members: EQUATOR_LAND,
  uncertain: ["MDV", "KIR", "GNQ"],
  weight: 0.7,
  nearMiss: (country) => Boolean(country.latlng && Math.abs(country.latlng[0]) < 8),
});

export const GEO_GROUP_CATEGORIES: readonly CategoryDef[] = CATEGORIES;

const CATEGORY_MAP = new Map(CATEGORIES.map((category) => [category.id, category]));

export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORY_MAP.get(id);
}

// ── Difficulty tuning ─────────────────────────────────────────────────

/** Category ratings allowed in each colour slot (yellow → purple). */
const SLOT_RATINGS: Record<Difficulty, number[][]> = {
  easy: [[1], [1, 2], [2], [2, 3]],
  medium: [[1, 2], [2], [2, 3], [3, 4]],
  hard: [[2], [3], [3, 4], [4]],
};

/** Highest country tier on the board, and how strongly each tier is preferred. */
const MAX_TIER: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 };
const TIER_WEIGHT: Record<Difficulty, number[]> = {
  easy: [0, 4, 1, 0, 0],
  medium: [0, 1, 2, 1.5, 0],
  hard: [0, 0.6, 1, 2, 2],
};

/** Minimum number of red-herring tiles a board aims for. */
const HERRING_TARGET: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

const POOLS: Record<Difficulty, Country[]> = {
  easy: COUNTRIES.filter((country) => country.difficulty <= MAX_TIER.easy),
  medium: COUNTRIES.filter((country) => country.difficulty <= MAX_TIER.medium),
  hard: COUNTRIES.filter((country) => country.difficulty <= MAX_TIER.hard),
};

/** Categories with at least four certain members in the difficulty's pool. */
function eligibleCategories(difficulty: Difficulty): CategoryDef[] {
  const pool = POOLS[difficulty];
  return CATEGORIES.filter((category) => pool.filter((country) => category.members.has(country.cca3) && !category.uncertain.has(country.cca3)).length >= 4);
}

const ELIGIBLE: Record<Difficulty, CategoryDef[]> = {
  easy: eligibleCategories("easy"),
  medium: eligibleCategories("medium"),
  hard: eligibleCategories("hard"),
};

// ── Generation ────────────────────────────────────────────────────────

function pickWeighted<T>(items: T[], weight: (item: T) => number, random: () => number): number {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = random() * total;
  for (let index = 0; index < items.length; index++) {
    roll -= weight(items[index]);
    if (roll < 0) return index;
  }
  return items.length - 1;
}

function shuffleInPlace<T>(values: T[], random: () => number): T[] {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

interface Attempt {
  board: GeoGroupsBoard;
  herrings: number;
}

function attemptBoard(difficulty: Difficulty, random: () => number): Attempt | null {
  const eligible = ELIGIBLE[difficulty];
  const chosen: CategoryDef[] = [];
  for (const ratings of SLOT_RATINGS[difficulty]) {
    const options = eligible.filter((category) => ratings.includes(category.rating) && !chosen.some((other) => other.family === category.family));
    if (!options.length) return null;
    // Damp large families (36 "Borders X") without letting single-category families dominate.
    const familySize = new Map<string, number>();
    for (const category of options) familySize.set(category.family, (familySize.get(category.family) ?? 0) + 1);
    chosen.push(options[pickWeighted(options, (category) => category.weight / Math.sqrt(familySize.get(category.family)!), random)]);
  }

  const blocked = new Set<string>();
  for (const category of chosen) for (const code of category.uncertain) blocked.add(code);

  const pool = POOLS[difficulty];
  const weights = TIER_WEIGHT[difficulty];
  const groups: GeoGroup[] = [];
  const herringSet = new Set<string>();

  for (let level = 0; level < chosen.length; level++) {
    const category = chosen[level];
    const others = chosen.filter((other) => other !== category);
    // Candidates satisfy this category and none of the other three. Candidate
    // sets of different categories are therefore disjoint.
    const candidates = pool.filter((country) =>
      category.members.has(country.cca3)
      && !blocked.has(country.cca3)
      && !others.some((other) => other.members.has(country.cca3)),
    );
    if (candidates.length < 4) return null;
    const isHerring = (country: Country) => others.some((other) => other.nearMiss(country));
    const picked: Country[] = [];
    const remaining = [...candidates];
    while (picked.length < 4) {
      const index = pickWeighted(remaining, (country) => (weights[country.difficulty] || 0.01) * (isHerring(country) ? 2.5 : 1), random);
      picked.push(remaining[index]);
      remaining.splice(index, 1);
    }
    for (const country of picked) if (isHerring(country)) herringSet.add(country.cca3);
    groups.push({ categoryId: category.id, level: level as GroupLevel, members: picked.map((country) => country.cca3).sort() });
  }

  const tiles = shuffleInPlace(groups.flatMap((group) => group.members), random);
  return { board: { groups, tiles, redHerrings: [...herringSet].sort() }, herrings: herringSet.size };
}

/**
 * Deterministic board for a seed and difficulty. Tries several deals and keeps
 * the first one with enough red herrings (or the one with the most).
 */
export function generateBoard(seed: string, difficulty: Difficulty): GeoGroupsBoard {
  const random = createSeededRandom(`geo-groups:board:${seed}:${difficulty}`);
  let best: Attempt | null = null;
  for (let tries = 0; tries < 400; tries++) {
    const attempt = attemptBoard(difficulty, random);
    if (!attempt) continue;
    if (attempt.herrings >= HERRING_TARGET[difficulty]) return attempt.board;
    if (!best || attempt.herrings > best.herrings) best = attempt;
    if (tries >= 120 && best) break;
  }
  if (best) return best.board;
  throw new Error(`Geo Groups: no board for ${difficulty} / ${seed}`);
}

/** Which of the board's categories a country satisfies (used by tests and the guarantee check). */
export function matchingGroups(board: GeoGroupsBoard, cca3: string): GroupLevel[] {
  return board.groups.filter((group) => getCategory(group.categoryId)?.members.has(cca3)).map((group) => group.level);
}

/** Validates the uniqueness guarantee for a board. */
export function isBoardValid(board: GeoGroupsBoard): boolean {
  if (board.groups.length !== 4 || board.tiles.length !== 16 || new Set(board.tiles).size !== 16) return false;
  const categories = board.groups.map((group) => getCategory(group.categoryId));
  if (categories.some((category) => !category)) return false;
  if (new Set(categories.map((category) => category!.family)).size !== 4) return false;
  for (const group of board.groups) {
    if (group.members.length !== 4) return false;
    for (const code of group.members) {
      if (!getCountryByCca3(code) || !board.tiles.includes(code)) return false;
      const matches = matchingGroups(board, code);
      if (matches.length !== 1 || matches[0] !== group.level) return false;
      if (categories.some((category) => category!.uncertain.has(code))) return false;
    }
  }
  return true;
}

// ── Scoring and share text ────────────────────────────────────────────

export const GROUP_POINTS = 250;
export const MISTAKE_PENALTY = 50;
export const MAX_MISTAKES = 4;

export function geoGroupsScore(opts: { solvedByPlayer: number; mistakes: number; multiplier: number }): number {
  const { solvedByPlayer, mistakes, multiplier } = opts;
  const perfect = solvedByPlayer === 4 && mistakes === 0;
  const raw = solvedByPlayer * GROUP_POINTS * multiplier - mistakes * MISTAKE_PENALTY + (perfect ? GROUP_POINTS * multiplier : 0);
  return Math.max(0, Math.round(raw));
}

export const LEVEL_EMOJI: Record<GroupLevel, string> = { 0: "🟨", 1: "🟩", 2: "🟦", 3: "🟪" };

/** One row of four squares per submission, coloured by each tile's true group. */
export function shareRows(board: GeoGroupsBoard, guesses: string[][]): string[] {
  const levelOf = new Map<string, GroupLevel>();
  for (const group of board.groups) for (const code of group.members) levelOf.set(code, group.level);
  return guesses.map((guess) => guess.map((code) => LEVEL_EMOJI[levelOf.get(code) ?? 0]).join(""));
}

/** Result of checking a 4-tile guess against the board. */
export type GuessOutcome =
  | { kind: "correct"; level: GroupLevel }
  | { kind: "one-away" }
  | { kind: "wrong" };

export function evaluateGuess(board: GeoGroupsBoard, guess: string[]): GuessOutcome {
  for (const group of board.groups) {
    const hits = guess.filter((code) => group.members.includes(code)).length;
    if (hits === 4) return { kind: "correct", level: group.level };
  }
  const best = Math.max(...board.groups.map((group) => guess.filter((code) => group.members.includes(code)).length));
  return best === 3 ? { kind: "one-away" } : { kind: "wrong" };
}

export function guessKey(guess: string[]): string {
  return [...guess].sort().join(",");
}
