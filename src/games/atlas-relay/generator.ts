import { COUNTRIES, getCountryByCca3 } from "@/data/countries";
import type { Country, Difficulty, Locale } from "@/lib/types";
import { createSeededRandom } from "@/lib/random";
import { shuffle } from "@/lib/utils";
import { regionLabel } from "@/lib/regions";

export interface RelayCondition {
  id: string;
  label: Record<Locale, string>;
  kind: "region" | "language" | "neighbour" | "coast" | "hemisphere" | "area" | "borders";
  value: string;
}
export interface RelayMission { id: string; conditions: RelayCondition[]; answerIds: string[] }
const LANGUAGES: Record<string, string> = {
  English: "Englisch", French: "Französisch", Spanish: "Spanisch", Arabic: "Arabisch",
  Portuguese: "Portugiesisch", German: "Deutsch", Russian: "Russisch", Italian: "Italienisch", Malay: "Malaiisch",
};

export function meetsRelayCondition(country: Country, condition: RelayCondition): boolean {
  const { kind, value } = condition;
  if (kind === "region") return country.region === value;
  if (kind === "language") return country.languages.includes(value);
  if (kind === "neighbour") return getCountryByCca3(value)?.borders.includes(country.cca3) ?? false;
  if (kind === "coast") return value === "landlocked" ? country.landlocked : !country.landlocked;
  if (kind === "hemisphere") return !!country.latlng && (value === "north" ? country.latlng[0] >= 0 : country.latlng[0] < 0);
  if (kind === "area") return country.area > 0 && (value === "small" ? country.area < 100_000 : value === "large" ? country.area >= 1_000_000 : country.area >= 100_000 && country.area < 1_000_000);
  return country.borders.length === Number(value);
}

function condition(kind: RelayCondition["kind"], value: string, en: string, de: string): RelayCondition {
  return { id: `${kind}:${value}`, kind, value, label: { en, de } };
}

export function buildRelayMission({ difficulty, seed, index, previousId, visitedIds = [] }: {
  difficulty: Difficulty; seed: string; index: number; previousId?: string; visitedIds?: readonly string[];
}): RelayMission {
  const previous = previousId ? getCountryByCca3(previousId) : undefined;
  const used = new Set(visitedIds);
  const pool = COUNTRIES.filter((country) => !used.has(country.cca3));
  const random = createSeededRandom(`${seed}:relay:${index}:${previousId ?? "start"}`);
  const conditions: RelayCondition[] = [];
  for (const region of ["Africa", "Americas", "Asia", "Europe", "Oceania"]) {
    conditions.push(condition("region", region, `Region: ${region}`, `Region: ${regionLabel(region, "de")}`));
  }
  for (const [language, de] of Object.entries(LANGUAGES)) {
    conditions.push(condition("language", language, `An official language: ${language}`, `Eine Amtssprache: ${de}`));
  }
  conditions.push(
    condition("coast", "landlocked", "Landlocked: no sea access", "Binnenstaat: kein Meereszugang"),
    condition("coast", "coastal", "Has sea access", "Mit Meereszugang"),
    condition("hemisphere", "north", "Map reference point north of the equator", "Kartenmittelpunkt nördlich des Äquators"),
    condition("hemisphere", "south", "Map reference point south of the equator", "Kartenmittelpunkt südlich des Äquators"),
    condition("area", "small", "Area below 100,000 km²", "Fläche unter 100.000 km²"),
    condition("area", "medium", "Area from 100,000 to under 1 million km²", "Fläche ab 100.000 bis unter 1 Mio. km²"),
    condition("area", "large", "Area of at least 1 million km²", "Fläche ab 1 Mio. km²"),
  );
  for (const count of [0, 1, 2, 3, 4, 5]) conditions.push(condition("borders", String(count), `Exactly ${count} land neighbours`, `Genau ${count} Landnachbarn`));
  if (previous) conditions.unshift(condition("neighbour", previous.cca3, `Borders ${previous.name.en} by land`, `Landnachbar von ${previous.name.de}`));
  const ordered = shuffle(conditions, random);
  const preferred = previous ? ordered.filter((item) => (item.kind === "neighbour" && item.value === previous.cca3) ||
    (item.kind === "region" && item.value === previous.region) || (item.kind === "language" && previous.languages.includes(item.value))) : ordered;
  const anchors = [...new Set([...preferred, ...ordered])];
  const matches = new Map(ordered.map((rule) => [rule.id, new Set(pool.filter((country) => meetsRelayCondition(country, rule)).map((country) => country.cca3))]));
  const wanted = difficulty === "hard" ? 3 : 2;
  for (const first of anchors) for (const second of ordered) {
    if (first.kind === second.kind) continue;
    const pair = [first, second];
    const pairs = wanted === 3 ? ordered.filter((third) => !pair.some((item) => item.kind === third.kind)).map((third) => [...pair, third]) : [pair];
    for (const rules of pairs) {
      const answers = pool.filter((country) => rules.every((rule) => matches.get(rule.id)!.has(country.cca3)));
      if (answers.length < 3 || answers.length > (difficulty === "easy" ? 60 : 35)) continue;
      // Every visible condition must narrow the answer set: no fake extra clue.
      if (rules.some((_, omitted) => pool.filter((country) => rules.every((rule, ruleIndex) => ruleIndex === omitted || matches.get(rule.id)!.has(country.cca3))).length === answers.length)) continue;
      // Seeded first-fit keeps phone work bounded; no exhaustive ranking of
      // thousands of equivalent condition permutations is needed.
      return { id: `${seed}:${index}`, conditions: rules, answerIds: answers.map((country) => country.cca3) };
    }
  }
  if (difficulty === "hard") return buildRelayMission({ difficulty: "medium", seed, index, previousId, visitedIds });
  {
    // Even late practice runs retain a truthful, complete and non-empty task.
    const region = ["Africa", "Americas", "Asia", "Europe", "Oceania"].find((value) => pool.filter((country) => country.region === value).length >= 3) ?? "Africa";
    const rule = conditions.find((item) => item.kind === "region" && item.value === region)!;
    return { id: `${seed}:${index}`, conditions: [rule], answerIds: pool.filter((country) => meetsRelayCondition(country, rule)).map((country) => country.cca3) };
  }
}

export function evaluateRelay(mission: RelayMission, countryId: string): { valid: boolean; checks: boolean[] } {
  const country = getCountryByCca3(countryId);
  const checks = mission.conditions.map((rule) => !!country && meetsRelayCondition(country, rule));
  return { valid: mission.answerIds.includes(countryId) && checks.every(Boolean), checks };
}

export function relayPoints(failedAttempts: number): number {
  return Math.max(0, 1000 - (Number.isFinite(failedAttempts) ? Math.max(0, Math.floor(failedAttempts)) : 0) * 200);
}
