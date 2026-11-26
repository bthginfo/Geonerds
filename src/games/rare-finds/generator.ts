import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import { categoryLabelKey, getCategory } from "@/games/geo-groups/generator";
import { createSeededRandom } from "@/lib/random";
import type { Country } from "@/lib/types";

/**
 * Rare Finds board generator.
 *
 * A board is five prompts, each a geographic category with many valid
 * answers. Categories are reused from Geo Groups (same membership data and
 * labels); four compound prompts are derived from the same dataset.
 *
 * Fairness: Geo Groups marks debatable members as "uncertain". Rare Finds
 * accepts those as borderline answers (a defensible alternative must not be
 * marked wrong) but never shows them as examples. Numeric thresholds
 * (population, area) are judged by the dataset value only, and the value is
 * shown with the answer. The country a "Borders X" prompt names is never valid.
 *
 * Generation uses only category ids and the seed, never localized names, so a
 * seed deals the same board in English and German; answers are cca3 codes.
 */

export const PROMPTS_PER_BOARD = 5;

/** Minimum number of certain, independent members a prompt needs. */
export const MIN_CERTAIN = 8;

export type PromptFact = "population" | "area";

export interface RarePrompt {
  id: string;
  /** At most one prompt per family on a board. */
  family: string;
  /** i18n key of the prompt label. */
  labelKey: string;
  /** 1 = broad (many answers) … 3 = tricky. */
  breadth: 1 | 2 | 3;
  /** Clear-cut, independent members; examples are drawn from these. */
  certain: ReadonlySet<string>;
  /** Every answer that scores: certain members plus borderline cases. */
  accepted: ReadonlySet<string>;
  /** Accepted, but debatable; flagged in the reveal. */
  borderline: ReadonlySet<string>;
  /** Dataset value shown with every answer to a threshold prompt. */
  fact?: PromptFact;
}

export interface RareBoard {
  /** Prompt ids in play order, broad → tricky. */
  promptIds: string[];
}

const PROMPTS: RarePrompt[] = [];

function isIndependent(cca3: string): boolean {
  return Boolean(getCountryByCca3(cca3)?.independent);
}

function addPrompt(def: {
  id: string;
  family: string;
  labelKey: string;
  breadth: 1 | 2 | 3;
  members: ReadonlySet<string>;
  uncertain: ReadonlySet<string>;
  /** Accept uncertain countries outside the dataset members as borderline. */
  lenient: boolean;
  exclude?: string[];
  fact?: PromptFact;
}) {
  const exclude = new Set(def.exclude ?? []);
  const accepted = new Set<string>();
  for (const code of def.members) if (!exclude.has(code) && getCountryByCca3(code)) accepted.add(code);
  if (def.lenient) for (const code of def.uncertain) if (!exclude.has(code) && getCountryByCca3(code)) accepted.add(code);
  const borderline = new Set([...accepted].filter((code) => def.uncertain.has(code)));
  const certain = new Set([...accepted].filter((code) => !borderline.has(code) && isIndependent(code)));
  PROMPTS.push({ id: def.id, family: def.family, labelKey: def.labelKey, breadth: def.breadth, certain, accepted, borderline, fact: def.fact });
}

/** Geo Groups categories that hold up as open "name one" prompts. */
const REUSED: { id: string; breadth: 1 | 2 | 3; lenient?: boolean; fact?: PromptFact }[] = [
  // Broad: dozens of answers.
  { id: "landlocked", breadth: 1 },
  { id: "no-land-borders", breadth: 1 },
  { id: "lang-english", breadth: 1 },
  { id: "lang-french", breadth: 1 },
  { id: "lang-arabic", breadth: 1 },
  { id: "lang-spanish", breadth: 1 },
  { id: "cur-euro", breadth: 1 },
  { id: "pop-under-1m", breadth: 1, lenient: false, fact: "population" },
  { id: "area-under-1000", breadth: 1, lenient: false, fact: "area" },
  // Medium: a dozen or so.
  { id: "sub-south-america", breadth: 2 },
  { id: "sub-caribbean", breadth: 2 },
  { id: "sub-western-africa", breadth: 2 },
  { id: "sub-south-eastern-asia", breadth: 2 },
  { id: "one-neighbour", breadth: 2 },
  { id: "borders-RUS", breadth: 2 },
  { id: "borders-CHN", breadth: 2 },
  { id: "pop-over-100m", breadth: 2, lenient: false, fact: "population" },
  { id: "area-over-2m", breadth: 2, lenient: false, fact: "area" },
  { id: "equator", breadth: 2 },
  // Tricky: eight to eleven answers.
  { id: "borders-DEU", breadth: 3 },
  { id: "borders-FRA", breadth: 3 },
  { id: "borders-BRA", breadth: 3 },
  { id: "borders-AUT", breadth: 3 },
  { id: "borders-TUR", breadth: 3 },
  { id: "borders-COD", breadth: 3 },
  { id: "borders-TZA", breadth: 3 },
  { id: "borders-ZMB", breadth: 3 },
  { id: "lang-portuguese", breadth: 3 },
  { id: "cur-usd", breadth: 3 },
  { id: "cur-xof", breadth: 3 },
];

for (const entry of REUSED) {
  const category = getCategory(entry.id);
  if (!category) throw new Error(`Rare Finds: unknown Geo Groups category ${entry.id}`);
  const target = entry.id.startsWith("borders-") ? entry.id.slice("borders-".length) : null;
  addPrompt({
    id: entry.id,
    family: category.family,
    labelKey: categoryLabelKey(entry.id),
    breadth: entry.breadth,
    members: category.members,
    uncertain: category.uncertain,
    lenient: entry.lenient ?? true,
    exclude: target ? [target] : [],
    fact: entry.fact,
  });
}

// ── Compound prompts derived from the same dataset ────────────────────

function codes(predicate: (country: Country) => boolean): ReadonlySet<string> {
  return new Set(COUNTRIES.filter(predicate).map((country) => country.cca3));
}

// Armenia, Azerbaijan and Kazakhstan are filed under Asia but are as often
// counted as (partly) European, so either continent accepts them.
const TRANSCONTINENTAL = new Set(["ARM", "AZE", "KAZ"]);

addPrompt({
  id: "landlocked-africa",
  family: "landlocked",
  labelKey: "rarefinds.cat.landlocked-africa",
  breadth: 2,
  members: codes((country) => country.landlocked && country.region === "Africa"),
  uncertain: new Set(),
  lenient: true,
});
addPrompt({
  id: "landlocked-europe",
  family: "landlocked",
  labelKey: "rarefinds.cat.landlocked-europe",
  breadth: 2,
  members: codes((country) => country.landlocked && country.region === "Europe"),
  uncertain: TRANSCONTINENTAL,
  lenient: true,
});
addPrompt({
  id: "landlocked-asia",
  family: "landlocked",
  labelKey: "rarefinds.cat.landlocked-asia",
  breadth: 2,
  members: codes((country) => country.landlocked && country.region === "Asia"),
  uncertain: TRANSCONTINENTAL,
  lenient: true,
});
const NO_LAND_BORDERS = getCategory("no-land-borders")!;
addPrompt({
  id: "oceania-no-land-borders",
  family: "border-count",
  labelKey: "rarefinds.cat.oceania-no-land-borders",
  breadth: 2,
  members: codes((country) => country.region === "Oceania" && NO_LAND_BORDERS.members.has(country.cca3)),
  uncertain: new Set(),
  lenient: true,
});

export const RARE_PROMPTS: readonly RarePrompt[] = PROMPTS.filter((prompt) => prompt.certain.size >= MIN_CERTAIN);

const PROMPT_MAP = new Map(RARE_PROMPTS.map((prompt) => [prompt.id, prompt]));

export function getRarePrompt(id: string): RarePrompt | undefined {
  return PROMPT_MAP.get(id);
}

export function isAcceptedAnswer(prompt: RarePrompt, cca3: string): boolean {
  return prompt.accepted.has(cca3);
}

// ── Generation ────────────────────────────────────────────────────────

/** Breadth allowed in each of the five slots, broad → tricky. */
const SLOT_BREADTH: (1 | 2 | 3)[][] = [[1], [1, 2], [2], [2, 3], [3]];

function pickWeighted<T>(items: T[], weight: (item: T) => number, random: () => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

/** Deterministic board for a seed: five prompts from five different families. */
function attemptBoard(random: () => number): RarePrompt[] | null {
  const chosen: RarePrompt[] = [];
  for (const breadths of SLOT_BREADTH) {
    const options = RARE_PROMPTS.filter((prompt) => breadths.includes(prompt.breadth) && !chosen.some((other) => other.family === prompt.family));
    if (!options.length) return null;
    // Damp large families (eight "Borders X") so they don't crowd out the rest.
    const familySize = new Map<string, number>();
    for (const prompt of options) familySize.set(prompt.family, (familySize.get(prompt.family) ?? 0) + 1);
    chosen.push(pickWeighted(options, (prompt) => 1 / Math.sqrt(familySize.get(prompt.family)!), random));
  }
  return chosen;
}

export function generateRareBoard(seed: string): RareBoard {
  const random = createSeededRandom(`rare-finds:board:${seed}`);
  let chosen: RarePrompt[] | null = null;
  // An early slot can use up every family the last slot needs; deal again (same stream, still deterministic).
  for (let tries = 0; tries < 100 && !chosen; tries++) chosen = attemptBoard(random);
  if (!chosen) throw new Error(`Rare Finds: no board for ${seed}`);
  const ordered = chosen
    .map((prompt, slot) => ({ prompt, slot }))
    .sort((a, b) => a.prompt.breadth - b.prompt.breadth || b.prompt.accepted.size - a.prompt.accepted.size || a.slot - b.slot)
    .map(({ prompt }) => prompt.id);
  return { promptIds: ordered };
}

// ── Examples shown in the reveal ──────────────────────────────────────

function certainCountries(prompt: RarePrompt, exclude: ReadonlySet<string>): Country[] {
  return [...prompt.certain].filter((code) => !exclude.has(code)).map((code) => getCountryByCca3(code)!).filter(Boolean);
}

/** Lesser-known valid answers: highest difficulty tier first, then smallest population. */
export function rareExamples(prompt: RarePrompt, exclude: ReadonlySet<string> = new Set(), count = 3): string[] {
  return certainCountries(prompt, exclude)
    .sort((a, b) => b.difficulty - a.difficulty || a.population - b.population || a.cca3.localeCompare(b.cca3))
    .slice(0, count)
    .map((country) => country.cca3);
}

/** Well-known valid answers: lowest tier first, then largest population. */
export function commonExamples(prompt: RarePrompt, exclude: ReadonlySet<string> = new Set(), count = 2): string[] {
  return certainCountries(prompt, exclude)
    .sort((a, b) => a.difficulty - b.difficulty || b.population - a.population || a.cca3.localeCompare(b.cca3))
    .slice(0, count)
    .map((country) => country.cca3);
}
