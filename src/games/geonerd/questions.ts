import type { Country, Locale } from "@/lib/types";
import { COUNTRIES, countryName } from "@/data/countries";
import { capitalLabel } from "@/games/aliases";
import { translate } from "@/i18n/messages";
import { simplifyCurrency } from "@/lib/currency";
import { sample, shuffle, pickOne } from "@/lib/utils";

export interface GnQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
}

const CONTINENTS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];

function build(options: string[], correct: string): { options: string[]; correctIndex: number } {
  const opts = shuffle(options);
  return { options: opts, correctIndex: opts.indexOf(correct) };
}

type Builder = (pool: Country[], locale: Locale) => Omit<GnQuestion, "points"> | null;

const builders: Record<string, Builder> = {
  capital(pool, locale) {
    const withCap = pool.filter((c) => c.capital);
    if (withCap.length < 4) return null;
    const c = pickOne(withCap);
    const distract = sample(withCap.filter((x) => x.cca3 !== c.cca3), 3).map((x) => capitalLabel(x, locale));
    const correct = capitalLabel(c, locale);
    if (distract.includes(correct)) return null;
    const { options, correctIndex } = build([correct, ...distract], correct);
    return { text: translate(locale, "gn.q.capital", { c: countryName(c, locale) }), options, correctIndex };
  },
  countryByCapital(pool, locale) {
    const withCap = pool.filter((c) => c.capital);
    if (withCap.length < 4) return null;
    const c = pickOne(withCap);
    const distract = sample(withCap.filter((x) => x.cca3 !== c.cca3), 3).map((x) => countryName(x, locale));
    const correct = countryName(c, locale);
    const { options, correctIndex } = build([correct, ...distract], correct);
    return { text: translate(locale, "gn.q.countryByCapital", { cap: capitalLabel(c, locale) }), options, correctIndex };
  },
  continent(pool, locale) {
    const c = pickOne(pool.filter((x) => CONTINENTS.includes(x.region)));
    if (!c) return null;
    const others = CONTINENTS.filter((r) => r !== c.region);
    const opts = [c.region, ...sample(others, 3)].map((r) => translate(locale, `scope.${r}`));
    const correct = translate(locale, `scope.${c.region}`);
    const { options, correctIndex } = build(opts, correct);
    return { text: translate(locale, "gn.q.continent", { c: countryName(c, locale) }), options, correctIndex };
  },
  currency(pool, locale) {
    const withCur = pool.filter((c) => c.currencies.length);
    if (withCur.length < 4) return null;
    const c = pickOne(withCur);
    // Use the base unit so the country adjective never gives the answer away.
    const correct = simplifyCurrency(c.currencies[0]);
    const distract = Array.from(
      new Set(
        withCur
          .filter((x) => x.cca3 !== c.cca3)
          .map((x) => simplifyCurrency(x.currencies[0]))
          .filter((u) => u !== correct)
      )
    );
    if (distract.length < 3) return null;
    const { options, correctIndex } = build([correct, ...sample(distract, 3)], correct);
    return { text: translate(locale, "gn.q.currency", { c: countryName(c, locale) }), options, correctIndex };
  },
  language(pool, locale) {
    const withLang = pool.filter((c) => c.languages.length);
    if (withLang.length < 4) return null;
    const c = pickOne(withLang);
    const correct = c.languages[0];
    const distract = sample(
      withLang.filter((x) => !x.languages.includes(correct)),
      3
    ).map((x) => x.languages[0]);
    if (distract.length < 3 || distract.includes(correct)) return null;
    const { options, correctIndex } = build([correct, ...distract], correct);
    return { text: translate(locale, "gn.q.language", { c: countryName(c, locale) }), options, correctIndex };
  },
  largestArea(pool, locale) {
    const four = sample(pool.filter((c) => c.area > 0), 4);
    if (four.length < 4) return null;
    const correct = four.reduce((a, b) => (b.area > a.area ? b : a));
    const { options, correctIndex } = build(four.map((c) => countryName(c, locale)), countryName(correct, locale));
    return { text: translate(locale, "gn.q.largestArea"), options, correctIndex };
  },
  largestPop(pool, locale) {
    const four = sample(pool.filter((c) => c.population > 0), 4);
    if (four.length < 4) return null;
    const correct = four.reduce((a, b) => (b.population > a.population ? b : a));
    const { options, correctIndex } = build(four.map((c) => countryName(c, locale)), countryName(correct, locale));
    return { text: translate(locale, "gn.q.largestPop"), options, correctIndex };
  },
  neighbor(pool, locale) {
    const c = pickOne(pool.filter((x) => x.borders.length));
    if (!c) return null;
    const nb = c.borders.map((b) => COUNTRIES.find((x) => x.cca3 === b)).find(Boolean);
    if (!nb) return null;
    const nonNeighbors = COUNTRIES.filter((x) => x.cca3 !== c.cca3 && !c.borders.includes(x.cca3));
    const distract = sample(nonNeighbors, 3).map((x) => countryName(x, locale));
    const correct = countryName(nb, locale);
    const { options, correctIndex } = build([correct, ...distract], correct);
    return { text: translate(locale, "gn.q.neighbor", { c: countryName(c, locale) }), options, correctIndex };
  },
  landlocked(pool, locale) {
    const land = pool.filter((c) => c.landlocked);
    const coast = pool.filter((c) => !c.landlocked && c.borders.length > 0);
    if (!land.length || coast.length < 3) return null;
    const correct = pickOne(land);
    const distract = sample(coast, 3);
    const { options, correctIndex } = build(
      [correct, ...distract].map((c) => countryName(c, locale)),
      countryName(correct, locale)
    );
    return { text: translate(locale, "gn.q.landlocked"), options, correctIndex };
  },
};

function allowedBuilders(round: number): string[] {
  if (round < 3) return ["capital", "continent", "largestArea"];
  if (round < 6) return ["capital", "continent", "currency", "countryByCapital", "largestArea", "largestPop"];
  if (round < 10) return ["capital", "countryByCapital", "currency", "language", "largestArea", "largestPop", "neighbor", "landlocked"];
  // Late game leans on the trickier builders.
  return ["countryByCapital", "currency", "language", "neighbor", "landlocked", "capital"];
}

export function generateQuestion(round: number, locale: Locale): GnQuestion {
  // The more questions you clear, the harder and more obscure the countries get.
  const maxTier = Math.min(4, 1 + Math.floor(round / 2));
  // From the mid-game on, also drop the easiest countries so it stays challenging.
  const minTier = round >= 12 ? 3 : round >= 8 ? 2 : 1;
  let pool = COUNTRIES.filter((c) => c.difficulty <= maxTier && c.difficulty >= minTier);
  if (pool.length < 8) pool = COUNTRIES.filter((c) => c.difficulty <= maxTier);
  const points = 100 + round * 50;
  const names = allowedBuilders(round);
  for (let i = 0; i < 30; i++) {
    const q = builders[pickOne(names)](pool, locale);
    if (q) return { ...q, points };
  }
  // Fallback: capital from the whole world.
  const q = builders.capital(COUNTRIES, locale)!;
  return { ...q, points };
}
