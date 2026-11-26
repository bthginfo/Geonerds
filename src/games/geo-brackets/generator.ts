import { COUNTRIES, DIFFICULTY_MAX_TIER } from "@/data/countries";
import { capitalAccepted, capitalLabel, countryAccepted } from "@/games/aliases";
import { matchAnswer, normalize, type MatchStatus } from "@/lib/fuzzy";
import { createSeededRandom } from "@/lib/random";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import type { Country, Difficulty, Locale } from "@/lib/types";
import { GEO_BRACKETS_DE_FORMS, GEO_BRACKETS_EN_NAMES, GEO_BRACKETS_EN_THE } from "./messages";

/**
 * Geo Brackets: one travel sentence whose slots are filled by chains of
 * nested clues. Every relation is computed from the country dataset and is
 * only used where its answer is unique (and, for superlatives, unique with a
 * clear margin so that slightly different data snapshots cannot flip it).
 */

export type RegionId = "africa" | "americas" | "asia" | "europe" | "oceania";
export type Metric = "largest" | "smallest" | "populous";

export type Entity =
  | { kind: "country"; cca3: string }
  | { kind: "capital"; cca3: string }
  | { kind: "region"; region: RegionId }
  | { kind: "group"; group: string };

export type Relation =
  | "capitalOf"
  | "countryOfCapital"
  | "onlyNeighbor"
  | "largestNeighbor"
  | "populousNeighbor"
  | "regionOf"
  | "largestIn"
  | "smallestIn"
  | "populousIn";

export interface Clue {
  /** Stable id: chain letter plus nesting path, e.g. "a", "a1", "a11". */
  id: string;
  relation: Relation;
  input: Clue | Entity;
  answer: Entity;
  /** Locale-independent accepted spellings for typed answers. */
  accepted: string[];
  /** Index of the top-level slot this clue belongs to. */
  chain: number;
}

export interface BracketPuzzle {
  frame: FrameId;
  difficulty: Difficulty;
  /** One top-level clue per sentence slot. */
  chains: Clue[];
  /** Every clue, innermost first within each chain. */
  clues: Clue[];
}

export type FrameId = "flight" | "postcard" | "meals2" | "bags" | "trip" | "meals3" | "souvenirs";
export const FRAMES: Record<2 | 3, FrameId[]> = {
  2: ["flight", "postcard", "meals2", "bags"],
  3: ["trip", "meals3", "souvenirs"],
};

export const DEPTH_RANGE: Record<Difficulty, [number, number]> = {
  easy: [1, 2],
  medium: [2, 3],
  hard: [3, 4],
};

/** Superlatives must beat the runner-up by this factor to count as unique. */
export const SUPERLATIVE_MARGIN = 1.2;

export function isClue(value: Clue | Entity): value is Clue {
  return "relation" in value;
}

// ── Dataset preparation ───────────────────────────────────────────────

/** Independent countries only; Palestine and Taiwan are left out to avoid disputed relations. */
export const UNIVERSE: Country[] = COUNTRIES.filter((c) => c.independent && c.capital && c.cca3 !== "PSE" && c.cca3 !== "TWN");
const BY_CCA3 = new Map(UNIVERSE.map((c) => [c.cca3, c]));

export function countryOf(cca3: string): Country {
  const country = BY_CCA3.get(cca3);
  if (!country) throw new Error(`Unknown country ${cca3}`);
  return country;
}

const REGION_IDS: Record<string, RegionId> = { Africa: "africa", Americas: "americas", Asia: "asia", Europe: "europe", Oceania: "oceania" };
export function regionIdOf(c: Country): RegionId | null {
  return REGION_IDS[c.region] ?? null;
}

/** Capitals that are disputed, split or officially unclear, or which simply repeat the country name. */
const AMBIGUOUS_CAPITAL = new Set(["BOL", "ZAF", "NLD", "CIV", "MYS", "LKA", "BEN", "TZA", "ISR", "BDI", "NRU", "TUV", "KIR", "PLW", "MHL", "FSM", "SWZ"]);
const squash = (value: string) => normalize(value).replace(/\s/g, "");
export function capitalUsable(c: Country): boolean {
  if (!c.capital || AMBIGUOUS_CAPITAL.has(c.cca3)) return false;
  const capital = squash(c.capital);
  return [c.name.en, c.name.de].every((name) => {
    const n = squash(name);
    return !capital.includes(n) && !n.includes(capital) && capital.slice(0, 4) !== n.slice(0, 4);
  });
}

/** Neighbor sets that are incomplete in the data (overseas territories, Gibraltar, Hans Island, Western Sahara, Kosovo, Palestine). */
const NEIGHBOR_BLOCK = new Set(["GBR", "ESP", "CYP", "DNK", "CAN", "FRA", "NLD", "BRA", "SUR", "MAR", "DZA", "MRT", "SRB", "ALB", "MKD", "MNE", "ISR", "EGY", "JOR"]);
/** Border codes of territories that belong to the country itself. */
const INTERNAL_BORDERS = new Set(["HKG", "MAC"]);
/** Transcontinental or commonly disputed continent assignment. */
const CONTINENT_BLOCK = new Set(["RUS", "TUR", "KAZ", "AZE", "GEO", "ARM", "CYP", "EGY", "IDN", "TLS"]);

/** Symmetric land neighbors; one-sided entries in the snapshot are treated as data errors. */
export function neighborsOf(c: Country): Country[] {
  return c.borders.map((code) => BY_CCA3.get(code)).filter((n): n is Country => Boolean(n && n.borders.includes(c.cca3)));
}

function neighborSetReliable(c: Country): boolean {
  return !NEIGHBOR_BLOCK.has(c.cca3) && c.borders.every((code) => INTERNAL_BORDERS.has(code) || BY_CCA3.has(code));
}

/** Unique extreme with a margin; null when it is too close to call. */
export function clearExtreme(list: Country[], metric: Metric): Country | null {
  if (list.length < 2) return null;
  const value = (c: Country) => (metric === "populous" ? c.population : c.area);
  const sorted = [...list].sort((a, b) => (metric === "smallest" ? value(a) - value(b) : value(b) - value(a)));
  const [first, second] = sorted;
  if (!(value(first) > 0 && value(second) > 0)) return null;
  const ratio = metric === "smallest" ? value(second) / value(first) : value(first) / value(second);
  return ratio >= SUPERLATIVE_MARGIN ? first : null;
}

export function onlyNeighbor(c: Country): Country | null {
  if (["CAN", "DNK", "GBR"].includes(c.cca3) || c.borders.length !== 1) return null;
  const list = neighborsOf(c);
  return list.length === 1 ? list[0] : null;
}

export function extremeNeighbor(c: Country, metric: "largest" | "populous"): Country | null {
  if (!neighborSetReliable(c)) return null;
  return clearExtreme(neighborsOf(c), metric);
}

// ── Regional groups for superlatives ─────────────────────────────────

export interface Group {
  id: string;
  region?: RegionId;
  subregion?: string;
  metrics: Metric[];
}

/**
 * Curated so that common alternative definitions of the area do not change
 * the answer (e.g. no "largest in Asia", because Russia counts as Europe in
 * the data; no "Central Europe", because many people include Germany).
 */
export const GROUPS: Group[] = [
  { id: "africa", region: "africa", metrics: ["smallest", "populous"] },
  { id: "americas", region: "americas", metrics: ["smallest", "populous"] },
  { id: "asia", region: "asia", metrics: ["smallest"] },
  { id: "europe", region: "europe", metrics: ["largest", "smallest", "populous"] },
  { id: "oceania", region: "oceania", metrics: ["largest", "smallest", "populous"] },
  { id: "southern-asia", subregion: "Southern Asia", metrics: ["largest", "smallest", "populous"] },
  { id: "northern-africa", subregion: "Northern Africa", metrics: ["largest", "smallest", "populous"] },
  { id: "southern-europe", subregion: "Southern Europe", metrics: ["largest", "smallest", "populous"] },
  { id: "middle-africa", subregion: "Middle Africa", metrics: ["largest", "smallest", "populous"] },
  { id: "caribbean", subregion: "Caribbean", metrics: ["largest", "smallest"] },
  { id: "south-america", subregion: "South America", metrics: ["largest", "populous"] },
  { id: "western-asia", subregion: "Western Asia", metrics: ["largest", "smallest"] },
  { id: "eastern-europe", subregion: "Eastern Europe", metrics: ["largest", "populous"] },
  { id: "western-europe", subregion: "Western Europe", metrics: ["largest", "populous"] },
  { id: "western-africa", subregion: "Western Africa", metrics: ["smallest", "populous"] },
  { id: "southern-africa", subregion: "Southern Africa", metrics: ["populous"] },
  { id: "south-eastern-asia", subregion: "South-Eastern Asia", metrics: ["largest", "smallest", "populous"] },
  { id: "eastern-africa", subregion: "Eastern Africa", metrics: ["smallest", "populous"] },
  { id: "north-america", subregion: "North America", metrics: ["populous"] },
  { id: "eastern-asia", subregion: "Eastern Asia", metrics: ["largest", "populous"] },
  { id: "northern-europe", subregion: "Northern Europe", metrics: ["largest", "populous"] },
  { id: "melanesia", subregion: "Melanesia", metrics: ["largest", "smallest", "populous"] },
  { id: "central-asia", subregion: "Central Asia", metrics: ["largest", "smallest", "populous"] },
  { id: "polynesia", subregion: "Polynesia", metrics: ["smallest"] },
];
const GROUP_BY_ID = new Map(GROUPS.map((g) => [g.id, g]));

export function groupMembers(group: Group): Country[] {
  return UNIVERSE.filter((c) => (group.region ? regionIdOf(c) === group.region : c.subregion === group.subregion));
}

const METRIC_RELATION: Record<Metric, Relation> = { largest: "largestIn", smallest: "smallestIn", populous: "populousIn" };
const RELATION_METRIC: Partial<Record<Relation, Metric>> = { largestIn: "largest", smallestIn: "smallest", populousIn: "populous" };

export function groupExtreme(groupId: string, metric: Metric): Country | null {
  const group = GROUP_BY_ID.get(groupId);
  if (!group || !group.metrics.includes(metric)) return null;
  return clearExtreme(groupMembers(group), metric);
}

// ── Accepted answers ──────────────────────────────────────────────────

const CAPITAL_EXTRA: Record<string, string[]> = {
  IND: ["Delhi"], UKR: ["Kiev"], MNG: ["Ulaanbaatar"], PRK: ["Pjöngjang"], CUB: ["Havanna"], OMN: ["Maskat"], SOM: ["Mogadischu"],
  SDN: ["Khartum"], UZB: ["Taschkent"], TJK: ["Duschanbe"], KGZ: ["Bischkek"], TKM: ["Aschgabad", "Aschchabat"], CMR: ["Jaunde"],
  SSD: ["Dschuba"], SGP: ["Singapur"], ISL: ["Reykjavík"], YEM: ["Sanaa"], KHM: ["Pnom Penh"], LTU: ["Wilna"], NPL: ["Katmandu"],
  ETH: ["Addis Abeba"], MEX: ["Mexiko-Stadt"], USA: ["Washington"],
};

const REGION_ACCEPT: Record<RegionId, string[]> = {
  africa: ["Africa", "Afrika"],
  americas: ["Americas", "the Americas", "America", "Amerika", "Doppelkontinent Amerika"],
  asia: ["Asia", "Asien"],
  europe: ["Europe", "Europa"],
  oceania: ["Oceania", "Ozeanien", "Australia", "Australien", "Australia and Oceania", "Australien und Ozeanien", "Australien/Ozeanien"],
};
const AMERICAS_PART: Record<string, string[]> = {
  "South America": ["South America", "Südamerika"],
  "Central America": ["Central America", "Mittelamerika", "Zentralamerika", "North America", "Nordamerika"],
  Caribbean: ["Caribbean", "Karibik", "Central America", "Mittelamerika", "North America", "Nordamerika"],
  "North America": ["North America", "Nordamerika"],
};

function acceptedFor(answer: Entity, input: Entity | null): string[] {
  if (answer.kind === "country") {
    const c = countryOf(answer.cca3);
    const extra = [GEO_BRACKETS_EN_NAMES[c.cca3], GEO_BRACKETS_DE_FORMS[c.cca3]?.nom].filter((v): v is string => Boolean(v));
    return Array.from(new Set([...countryAccepted(c), ...extra]));
  }
  if (answer.kind === "capital") {
    const c = countryOf(answer.cca3);
    return Array.from(new Set([...capitalAccepted(c), ...(CAPITAL_EXTRA[c.cca3] ?? [])]));
  }
  if (answer.kind === "region") {
    const source = input?.kind === "country" ? countryOf(input.cca3) : null;
    const part = answer.region === "americas" && source ? AMERICAS_PART[source.subregion] ?? [] : [];
    return Array.from(new Set([...REGION_ACCEPT[answer.region], ...part]));
  }
  return [];
}

/** Grades a typed answer. Correctly spelled other continents never count as a near miss. */
export function judgeAnswer(guess: string, clue: Clue): MatchStatus {
  const g = squash(guess);
  if (!g) return "wrong";
  if (clue.answer.kind === "region") {
    if (clue.accepted.some((a) => squash(a) === g)) return "correct";
    const otherRegion = (Object.keys(REGION_ACCEPT) as RegionId[]).some((id) => id !== (clue.answer as { region: RegionId }).region && REGION_ACCEPT[id].some((a) => squash(a) === g));
    if (otherRegion || Object.values(AMERICAS_PART).flat().some((a) => squash(a) === g)) return "wrong";
  }
  return matchAnswer(guess, clue.accepted).status;
}

// ── Chain generation ──────────────────────────────────────────────────

interface Step {
  relation: Relation;
  answer: Entity;
}
interface Leaf extends Step {
  given: Entity;
}

const tierOf = (e: Entity): number => (e.kind === "country" || e.kind === "capital" ? countryOf(e.cca3).difficulty : 1);
export function entityKey(e: Entity): string {
  switch (e.kind) {
    case "country": return `C:${e.cca3}`;
    case "capital": return `K:${e.cca3}`;
    case "region": return `R:${e.region}`;
    case "group": return `R:${e.group}`;
  }
}
/** Identity across chains: a country and its capital count as the same place. */
function identityOf(e: Entity): string {
  return e.kind === "country" || e.kind === "capital" ? e.cca3 : e.kind === "region" ? e.region : e.group;
}

function stepsFrom(e: Entity): Step[] {
  const steps: Step[] = [];
  if (e.kind === "country") {
    const c = countryOf(e.cca3);
    if (capitalUsable(c)) steps.push({ relation: "capitalOf", answer: { kind: "capital", cca3: c.cca3 } });
    const only = onlyNeighbor(c);
    if (only) steps.push({ relation: "onlyNeighbor", answer: { kind: "country", cca3: only.cca3 } });
    const largest = extremeNeighbor(c, "largest");
    if (largest) steps.push({ relation: "largestNeighbor", answer: { kind: "country", cca3: largest.cca3 } });
    const populous = extremeNeighbor(c, "populous");
    if (populous) steps.push({ relation: "populousNeighbor", answer: { kind: "country", cca3: populous.cca3 } });
    const region = regionIdOf(c);
    if (region && !CONTINENT_BLOCK.has(c.cca3)) steps.push({ relation: "regionOf", answer: { kind: "region", region } });
  } else if (e.kind === "region") {
    for (const metric of ["largest", "smallest", "populous"] as Metric[]) {
      const winner = groupExtreme(e.region, metric);
      if (winner) steps.push({ relation: METRIC_RELATION[metric], answer: { kind: "country", cca3: winner.cca3 } });
    }
  }
  return steps;
}

interface Pools {
  maxTier: number;
  leaves: Map<Relation, Leaf[]>;
}
const poolCache = new Map<Difficulty, Pools>();

function poolsFor(difficulty: Difficulty): Pools {
  const cached = poolCache.get(difficulty);
  if (cached) return cached;
  const maxTier = DIFFICULTY_MAX_TIER[difficulty];
  const givenTier = Math.min(4, maxTier + 1);
  const leaves = new Map<Relation, Leaf[]>();
  const add = (leaf: Leaf) => {
    if (leaf.answer.kind !== "region" && tierOf(leaf.answer) > maxTier) return;
    if (!leaves.has(leaf.relation)) leaves.set(leaf.relation, []);
    leaves.get(leaf.relation)!.push(leaf);
  };
  for (const c of UNIVERSE) {
    if (capitalUsable(c)) add({ relation: "countryOfCapital", given: { kind: "capital", cca3: c.cca3 }, answer: { kind: "country", cca3: c.cca3 } });
    if (c.difficulty > givenTier) continue;
    const given: Entity = { kind: "country", cca3: c.cca3 };
    for (const step of stepsFrom(given)) {
      // The capital of a named country is too direct unless the given country is in the answer pool.
      if (step.relation === "capitalOf" && c.difficulty > maxTier) continue;
      add({ ...step, given });
    }
  }
  for (const group of GROUPS) {
    for (const metric of group.metrics) {
      const winner = groupExtreme(group.id, metric);
      if (winner) add({ relation: METRIC_RELATION[metric], given: { kind: "group", group: group.id }, answer: { kind: "country", cca3: winner.cca3 } });
    }
  }
  const pools = { maxTier, leaves };
  poolCache.set(difficulty, pools);
  return pools;
}

const finalKind = (e: Entity) => e.kind === "country" || e.kind === "capital";

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** How often each relation is picked; easier levels lean on capitals and simple neighbors. */
const RELATION_WEIGHT: Record<Difficulty, Record<Relation, number>> = {
  easy: { capitalOf: 4, countryOfCapital: 4, onlyNeighbor: 3, populousIn: 3, largestIn: 2, smallestIn: 1, largestNeighbor: 1, populousNeighbor: 1, regionOf: 1 },
  medium: { capitalOf: 3, countryOfCapital: 3, onlyNeighbor: 2, populousIn: 2, largestIn: 2, smallestIn: 2, largestNeighbor: 2, populousNeighbor: 2, regionOf: 1.5 },
  hard: { capitalOf: 2, countryOfCapital: 2, onlyNeighbor: 2, populousIn: 2, largestIn: 2, smallestIn: 2, largestNeighbor: 2, populousNeighbor: 2, regionOf: 1.5 },
};

/** Weighted random order of relation kinds; relations already used in the sentence are tried later. */
function relationOrder(relations: Relation[], ctx: BuildContext): Relation[] {
  const key = (relation: Relation) => {
    const weight = RELATION_WEIGHT[ctx.difficulty][relation] / (1 + 2 * (ctx.usage.get(relation) ?? 0));
    return -Math.log(1 - ctx.random()) / weight;
  };
  return relations.map((relation) => ({ relation, k: key(relation) })).sort((a, b) => a.k - b.k).map((entry) => entry.relation);
}

function varied<T extends Step>(items: T[], ctx: BuildContext): T[] {
  const byRelation = new Map<Relation, T[]>();
  for (const item of items) {
    if (!byRelation.has(item.relation)) byRelation.set(item.relation, []);
    byRelation.get(item.relation)!.push(item);
  }
  const groups = relationOrder([...byRelation.keys()], ctx).map((relation) => shuffle(byRelation.get(relation)!, ctx.random));
  const result: T[] = [];
  for (let round = 0; groups.some((list) => round < list.length); round++) {
    for (const list of groups) if (round < list.length) result.push(list[round]);
  }
  return result;
}

interface BuildContext {
  difficulty: Difficulty;
  pools: Pools;
  random: () => number;
  /** Relation counts in the sentence so far. */
  usage: Map<Relation, number>;
  budget: number;
}

interface RawChain {
  given: Entity;
  steps: Step[];
}

function extend(entity: Entity, remaining: number, used: Set<string>, ctx: BuildContext): Step[] | null {
  if (remaining === 0) return finalKind(entity) ? [] : null;
  const options = stepsFrom(entity).filter((step) => {
    if (used.has(entityKey(step.answer))) return false;
    if (step.answer.kind !== "region" && tierOf(step.answer) > ctx.pools.maxTier) return false;
    if (remaining === 1) return finalKind(step.answer);
    return step.answer.kind !== "capital";
  });
  for (const step of varied(options, ctx)) {
    if (--ctx.budget < 0) return null;
    used.add(entityKey(step.answer));
    const rest = extend(step.answer, remaining - 1, used, ctx);
    if (rest) return [step, ...rest];
    used.delete(entityKey(step.answer));
  }
  return null;
}

function buildChain(depth: number, taken: Set<string>, ctx: BuildContext): RawChain | null {
  const relations = relationOrder([...ctx.pools.leaves.keys()], ctx);
  ctx.budget = 400;
  for (let attempt = 0; attempt < 60 && ctx.budget > 0; attempt++) {
    const list = ctx.pools.leaves.get(relations[attempt % relations.length])!;
    const leaf = list[Math.floor(ctx.random() * list.length)];
    if (depth === 1 ? !finalKind(leaf.answer) : leaf.answer.kind === "capital") continue;
    if (taken.has(identityOf(leaf.given)) || taken.has(identityOf(leaf.answer))) continue;
    const used = new Set([entityKey(leaf.given), entityKey(leaf.answer)]);
    const rest = extend(leaf.answer, depth - 1, used, ctx);
    if (!rest) continue;
    const chain = { given: leaf.given, steps: [{ relation: leaf.relation, answer: leaf.answer }, ...rest] };
    if (chainIdentities(chain).some((id) => taken.has(id))) continue;
    return chain;
  }
  return null;
}

function chainIdentities(chain: RawChain): string[] {
  return [chain.given, ...chain.steps.map((s) => s.answer)].map(identityOf);
}

function toClues(chain: RawChain, index: number): Clue {
  const letter = String.fromCharCode(97 + index);
  const depth = chain.steps.length;
  let input: Clue | Entity = chain.given;
  let top: Clue | null = null;
  chain.steps.forEach((step, level) => {
    const previous: Entity = level === 0 ? chain.given : chain.steps[level - 1].answer;
    top = { id: letter + "1".repeat(depth - 1 - level), relation: step.relation, input, answer: step.answer, accepted: acceptedFor(step.answer, previous), chain: index };
    input = top;
  });
  if (!top) throw new Error("Empty chain");
  return top;
}

/** Innermost first within each chain. */
export function flattenClues(top: Clue): Clue[] {
  return isClue(top.input) ? [...flattenClues(top.input), top] : [top];
}

export function generatePuzzle(seed: string, difficulty: Difficulty): BracketPuzzle {
  const random = createSeededRandom(`geo-brackets:${seed}:${difficulty}`);
  const pools = poolsFor(difficulty);
  const [minDepth, maxDepth] = DEPTH_RANGE[difficulty];
  for (let attempt = 0; attempt < 40; attempt++) {
    const slots = random() < 0.5 ? 2 : 3;
    const frames = FRAMES[slots];
    const frame = frames[Math.floor(random() * frames.length)];
    const depths = Array.from({ length: slots }, () => minDepth + Math.floor(random() * (maxDepth - minDepth + 1)));
    if (!depths.includes(maxDepth)) depths[Math.floor(random() * slots)] = maxDepth;
    const taken = new Set<string>();
    const chains: RawChain[] = [];
    const ctx: BuildContext = { difficulty, pools, random, usage: new Map(), budget: 0 };
    for (const depth of depths) {
      const chain = buildChain(depth, taken, ctx);
      if (!chain) break;
      chainIdentities(chain).forEach((id) => taken.add(id));
      chain.steps.forEach((step) => ctx.usage.set(step.relation, (ctx.usage.get(step.relation) ?? 0) + 1));
      chains.push(chain);
    }
    if (chains.length !== slots) continue;
    const tops = chains.map(toClues);
    return { frame, difficulty, chains: tops, clues: tops.flatMap(flattenClues) };
  }
  throw new Error(`Geo Brackets could not build a puzzle for ${seed}`);
}

// ── Play state helpers ───────────────────────────────────────────────

export function isSolvable(clue: Clue, solved: ReadonlySet<string>): boolean {
  return !solved.has(clue.id) && (!isClue(clue.input) || solved.has(clue.input.id));
}

export function solvableClues(puzzle: BracketPuzzle, solved: ReadonlySet<string>): Clue[] {
  return puzzle.clues.filter((clue) => isSolvable(clue, solved));
}

export function parentOf(puzzle: BracketPuzzle, id: string): Clue | undefined {
  return puzzle.clues.find((clue) => isClue(clue.input) && clue.input.id === id);
}

export interface ScoreTally {
  wrong: number;
  peeks: number;
  reveals: number;
}

export const BASE_SCORE = 1000;
export const PENALTY = { wrong: 50, peek: 100, reveal: 200 } as const;

export function bracketScore({ wrong, peeks, reveals }: ScoreTally, difficulty: Difficulty): number {
  const raw = BASE_SCORE - PENALTY.wrong * wrong - PENALTY.peek * peeks - PENALTY.reveal * reveals;
  return Math.max(0, Math.round(raw * DIFFICULTY_MULTIPLIER[difficulty]));
}

export interface ClueOutcome {
  revealed: boolean;
  mistakes: number;
  peeked: boolean;
}

export function outcomeEmoji(outcome: ClueOutcome | undefined): string {
  if (!outcome || outcome.revealed) return "🟥";
  return outcome.mistakes > 0 || outcome.peeked ? "🟨" : "✅";
}

/** One emoji line per top-level clue, innermost clue first. */
export function shareGrid(puzzle: BracketPuzzle, outcomes: Record<string, ClueOutcome>): string {
  return puzzle.chains.map((top) => flattenClues(top).map((clue) => outcomeEmoji(outcomes[clue.id])).join("")).join("\n");
}

// ── Rendering ─────────────────────────────────────────────────────────

export type Translate = (key: string, vars?: Record<string, string | number>) => string;
type Position = "plain" | "nom" | "gen" | "in" | "aus" | "bare" | "region";

export type Segment =
  | { type: "text"; text: string }
  | { type: "given"; text: string }
  | { type: "clue"; id: string; children: Segment[] }
  | { type: "answer"; id: string; prefix: string; name: string; suffix: string };

interface Form {
  prefix: string;
  name: string;
  suffix: string;
}

function splitName(template: string, name: string): Form {
  const at = template.indexOf("{name}");
  if (at < 0) return { prefix: "", name: template, suffix: "" };
  return { prefix: template.slice(0, at), name, suffix: template.slice(at + "{name}".length) };
}

/** Plain name used for answers, peeks and the recap ("United States", "Peking"). */
export function entityName(e: Entity, locale: Locale, t: Translate): string {
  switch (e.kind) {
    case "country": {
      const c = countryOf(e.cca3);
      return locale === "de" ? GEO_BRACKETS_DE_FORMS[c.cca3]?.nom ?? c.name.de : GEO_BRACKETS_EN_NAMES[c.cca3] ?? c.name.en;
    }
    case "capital": return capitalLabel(countryOf(e.cca3), locale);
    case "region": return t(`geobrackets.region.${e.region}`);
    case "group": return t(`geobrackets.group.${e.group}`);
  }
}

function entityForm(e: Entity, pos: Position, locale: Locale, t: Translate): Form {
  const name = entityName(e, locale, t);
  if (e.kind === "group") return { prefix: "", name: pos === "region" ? t(`geobrackets.groupIn.${e.group}`) : name, suffix: "" };
  if (e.kind === "region") return pos === "region" ? splitName(t("geobrackets.form.region"), name) : { prefix: "", name, suffix: "" };
  if (locale !== "de") {
    if (e.kind === "country" && GEO_BRACKETS_EN_THE.has(e.cca3)) return splitName(t("geobrackets.form.the"), name);
    return { prefix: "", name, suffix: "" };
  }
  if (pos !== "gen" && pos !== "in" && pos !== "aus") return { prefix: "", name, suffix: "" };
  if (e.kind === "capital") return splitName(t(`geobrackets.form.${pos}.bare`), name);
  const forms = GEO_BRACKETS_DE_FORMS[e.cca3];
  const gender = forms?.g ?? "bare";
  const inflected = pos === "gen" ? forms?.gen ?? forms?.nom ?? name : forms?.dat ?? forms?.nom ?? name;
  return splitName(t(`geobrackets.form.${pos}.${gender}`), inflected);
}

function childPosition(relation: Relation, locale: Locale): Position {
  if (RELATION_METRIC[relation]) return "region";
  if (locale !== "de") return "plain";
  return relation === "countryOfCapital" ? "bare" : "gen";
}

function templateFor(relation: Relation, pos: Position, locale: Locale, t: Translate): string {
  if (locale === "de") return t(`geobrackets.rel.${relation}.${pos}`);
  return t(relation === "regionOf" && pos === "region" ? "geobrackets.rel.regionOf.region" : `geobrackets.rel.${relation}`);
}

function renderClue(clue: Clue, pos: Position, locale: Locale, t: Translate, solved: ReadonlySet<string>): Segment {
  if (solved.has(clue.id)) return { type: "answer", id: clue.id, ...entityForm(clue.answer, pos, locale, t) };
  const template = templateFor(clue.relation, pos, locale, t);
  const [before, after = ""] = template.split("{x}");
  const childPos = childPosition(clue.relation, locale);
  const children: Segment[] = [];
  if (before) children.push({ type: "text", text: before });
  if (isClue(clue.input)) {
    children.push(renderClue(clue.input, childPos, locale, t, solved));
  } else {
    const form = entityForm(clue.input, childPos, locale, t);
    if (form.prefix) children.push({ type: "text", text: form.prefix });
    children.push({ type: "given", text: form.name });
    if (form.suffix) children.push({ type: "text", text: form.suffix });
  }
  if (after) children.push({ type: "text", text: after });
  return { type: "clue", id: clue.id, children };
}

/** The whole sentence as nested segments; solved clues collapse into their answers. */
export function renderSentence(puzzle: BracketPuzzle, locale: Locale, t: Translate, solved: ReadonlySet<string>): Segment[] {
  const template = t(`geobrackets.frame.${puzzle.frame}`);
  const segments: Segment[] = [];
  const pattern = /\{([abc])(?:\|(\w+))?\}/g;
  let last = 0;
  for (const match of template.matchAll(pattern)) {
    if (match.index > last) segments.push({ type: "text", text: template.slice(last, match.index) });
    const top = puzzle.chains[match[1].charCodeAt(0) - 97];
    const pos = (locale === "de" ? match[2] ?? "in" : "plain") as Position;
    if (top) segments.push(renderClue(top, pos, locale, t, solved));
    last = match.index + match[0].length;
  }
  if (last < template.length) segments.push({ type: "text", text: template.slice(last) });
  return segments;
}

export function segmentText(segments: Segment[]): string {
  return segments.map((s) => (s.type === "clue" ? segmentText(s.children) : s.type === "answer" ? s.prefix + s.name + s.suffix : s.text)).join("");
}

/** The clue on its own, for the answer panel ("The capital of Spain"). */
export function cluePrompt(clue: Clue, locale: Locale, t: Translate, solved: ReadonlySet<string>): string {
  const text = segmentText([renderClue(clue, locale === "de" ? "nom" : "plain", locale, t, solved)]);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Recap of one chain: given → every answer, e.g. Vientiane → Laos → China → Beijing. */
export function chainNames(top: Clue, locale: Locale, t: Translate): { id: string | null; name: string }[] {
  const clues = flattenClues(top);
  const first = clues[0].input as Entity;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return [{ id: null, name: cap(entityName(first, locale, t)) }, ...clues.map((clue) => ({ id: clue.id, name: cap(entityName(clue.answer, locale, t)) }))];
}

/** Display answer for reveals and peeks. */
export function answerName(clue: Clue, locale: Locale, t: Translate): string {
  const name = entityName(clue.answer, locale, t);
  return clue.answer.kind === "region" ? name.replace(/^the /, "") : name;
}
