import type { Country, Difficulty, Locale } from "@/lib/types";
import { FlagImage } from "@/components/flag-image";
import { poolForDifficulty, withCapital, countryName, getCountryByCca3 } from "@/data/countries";
import { capitalLabel, capitalAccepted, countryAccepted } from "@/games/aliases";
import { simplifyCurrency } from "@/lib/currency";
import { FACT_QUESTIONS } from "@/lib/fact-questions";
import { DAILY_COUNT, WEEKLY_COUNT, mulberry32, seedFromKey, sampleWith, shuffleWith } from "@/lib/daily";
import type { QuizRound } from "@/games/quiz-core";

type Builder = (answer: Country, pool: Country[], rng: () => number, locale: Locale, maxFactTier: 1 | 2 | 3) => QuizRound | null;

export function uniqueExtreme<T>(items: readonly T[], value: (item: T) => number, direction: "min" | "max"): T | null {
  if (items.length < 4) return null;
  const sorted = [...items].sort((a, b) => direction === "min" ? value(a) - value(b) : value(b) - value(a));
  return value(sorted[0]) === value(sorted[1]) ? null : sorted[0];
}

export function borderCountOptions(real: number, rng: () => number): number[] | null {
  if (!Number.isInteger(real) || real < 0) return null;
  const candidates = shuffleWith(
    Array.from({ length: 15 }, (_, index) => index).filter((value) => value !== real),
    rng
  );
  const distractors = candidates.slice(0, 3);
  return distractors.length === 3 ? shuffleWith([real, ...distractors], rng) : null;
}

export function maxFactTierForDifficulty(difficulty: Difficulty): 1 | 2 | 3 {
  return difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
}

export function eligibleFactQuestions(pool: readonly Country[], maxTier: 1 | 2 | 3) {
  const poolSet = new Set(pool.map((country) => country.cca3));
  return FACT_QUESTIONS.filter((question) => question.tier <= maxTier && poolSet.has(question.cca3) && getCountryByCca3(question.cca3));
}

function opts(items: { id: string; label: string }[], rng: () => number) {
  return shuffleWith(items, rng);
}

function Q({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-base font-semibold">{children}</div>;
}
function qt(locale: Locale, en: string, de: string) {
  return locale === "de" ? de : en;
}

const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];
const REGION_DE: Record<string, string> = {
  Africa: "Afrika",
  Americas: "Amerika",
  Asia: "Asien",
  Europe: "Europa",
  Oceania: "Ozeanien",
};
function regionLabel(r: string, locale: Locale) {
  return locale === "de" ? REGION_DE[r] ?? r : r;
}

function FlagQ({ a, locale, en, de }: { a: Country; locale: Locale; en: string; de: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Q>{qt(locale, en, de)}</Q>
      <FlagImage code={a.flag} alt="flag" className="aspect-[4/3] w-24 shadow-md" />
      <div className="text-xl font-bold">{countryName(a, locale)}</div>
    </div>
  );
}

const builders: Builder[] = [
  // Flag → country
  (a, pool, rng, locale) => {
    const distract = sampleWith(pool.filter((c) => c.cca3 !== a.cca3), 3, rng);
    return {
      key: `flag-${a.cca3}`,
      prompt: (
        <div className="flex flex-col items-center gap-3">
          <Q>{qt(locale, "Which country's flag is this?", "Welches Land hat diese Flagge?")}</Q>
          <FlagImage code={a.flag} alt="flag" className="aspect-[4/3] w-28 shadow-md" />
        </div>
      ),
      options: opts([a, ...distract].map((c) => ({ id: c.cca3, label: countryName(c, locale) })), rng),
      correctId: a.cca3,
      accepted: countryAccepted(a),
      answerLabel: countryName(a, locale),
      factCountry: a,
    };
  },
  // Country → capital
  (a, pool, rng, locale) => {
    const withCap = pool.filter((c) => c.capital);
    if (!a.capital || withCap.length < 4) return null;
    const distract = sampleWith(withCap.filter((c) => c.cca3 !== a.cca3), 3, rng);
    return {
      key: `cap-${a.cca3}`,
      prompt: (
        <div className="flex flex-col items-center gap-3">
          <Q>{qt(locale, "What is the capital of…", "Was ist die Hauptstadt von…")}</Q>
          <FlagImage code={a.flag} alt="flag" className="aspect-[4/3] w-24 shadow-md" />
          <div className="text-xl font-bold">{countryName(a, locale)}</div>
        </div>
      ),
      options: opts([a, ...distract].map((c) => ({ id: c.cca3, label: capitalLabel(c, locale) })), rng),
      correctId: a.cca3,
      accepted: capitalAccepted(a),
      answerLabel: capitalLabel(a, locale),
      factCountry: a,
    };
  },
  // Currency (base unit) → country
  (a, pool, rng, locale) => {
    if (!a.currencies.length) return null;
    const correct = simplifyCurrency(a.currencies[0]);
    const distract = Array.from(
      new Set(
        pool
          .filter((c) => c.cca3 !== a.cca3 && c.currencies.length)
          .map((c) => simplifyCurrency(c.currencies[0]))
          .filter((u) => u !== correct)
      )
    );
    if (distract.length < 3) return null;
    const labels = opts(
      [{ id: "c", label: correct }, ...sampleWith(distract, 3, rng).map((u, i) => ({ id: `d${i}`, label: u }))],
      rng
    );
    return {
      key: `cur-${a.cca3}`,
      prompt: (
        <div className="flex flex-col items-center gap-3">
          <Q>{qt(locale, "Which currency does it use?", "Welche Währung nutzt es?")}</Q>
          <FlagImage code={a.flag} alt="flag" className="aspect-[4/3] w-24 shadow-md" />
          <div className="text-xl font-bold">{countryName(a, locale)}</div>
        </div>
      ),
      options: labels,
      correctId: "c",
      accepted: [correct],
      answerLabel: correct,
      factCountry: a,
    };
  },
  // Which has more people?
  (a, pool, rng, locale) => {
    const other = sampleWith(pool.filter((c) => c.cca3 !== a.cca3 && c.population > 0), 1, rng)[0];
    if (!other || a.population <= 0) return null;
    const bigger = a.population >= other.population ? a : other;
    return {
      key: `pop-${a.cca3}-${other.cca3}`,
      prompt: <div className="text-center text-lg font-bold">{popPrompt(locale)}</div>,
      options: opts([a, other].map((c) => ({ id: c.cca3, label: countryName(c, locale) })), rng),
      correctId: bigger.cca3,
      accepted: [countryName(bigger, locale)],
      answerLabel: countryName(bigger, locale),
      factCountry: bigger,
    };
  },
  // Capital → country
  (a, pool, rng, locale) => {
    const withCap = pool.filter((c) => c.capital);
    if (!a.capital || withCap.length < 4) return null;
    const distract = sampleWith(withCap.filter((c) => c.cca3 !== a.cca3), 3, rng);
    return {
      key: `bycap-${a.cca3}`,
      prompt: (
        <div className="flex flex-col items-center gap-2">
          <Q>{qt(locale, "Which country's capital is this?", "Welches Land hat diese Hauptstadt?")}</Q>
          <div className="text-2xl font-extrabold">{capitalLabel(a, locale)}</div>
        </div>
      ),
      options: opts([a, ...distract].map((c) => ({ id: c.cca3, label: countryName(c, locale) })), rng),
      correctId: a.cca3,
      accepted: countryAccepted(a),
      answerLabel: countryName(a, locale),
      factCountry: a,
    };
  },
  // Which continent?
  (a, pool, rng, locale) => {
    if (!REGIONS.includes(a.region)) return null;
    const distract = sampleWith(REGIONS.filter((r) => r !== a.region), 3, rng);
    return {
      key: `cont-${a.cca3}`,
      prompt: <FlagQ a={a} locale={locale} en="On which continent is…" de="Auf welchem Kontinent liegt…" />,
      options: opts([a.region, ...distract].map((r) => ({ id: r, label: regionLabel(r, locale) })), rng),
      correctId: a.region,
      accepted: [regionLabel(a.region, locale)],
      answerLabel: regionLabel(a.region, locale),
      factCountry: a,
    };
  },
  // Official language
  (a, pool, rng, locale) => {
    if (!a.languages.length) return null;
    const correct = a.languages[0];
    const distract = Array.from(
      new Set(
        pool.filter((c) => c.cca3 !== a.cca3 && c.languages.length && !c.languages.includes(correct)).map((c) => c.languages[0])
      )
    );
    if (distract.length < 3) return null;
    return {
      key: `lang-${a.cca3}`,
      prompt: <FlagQ a={a} locale={locale} en="Which is an official language?" de="Welche Sprache ist hier Amtssprache?" />,
      options: opts(
        [{ id: "c", label: correct }, ...sampleWith(distract, 3, rng).map((l, i) => ({ id: `d${i}`, label: l }))],
        rng
      ),
      correctId: "c",
      accepted: [correct],
      answerLabel: correct,
      factCountry: a,
    };
  },
  // Which borders this country?
  (a, pool, rng, locale) => {
    if (!a.borders.length) return null;
    const nb = a.borders.map((b) => getCountryByCca3(b)).find(Boolean);
    if (!nb) return null;
    const distract = sampleWith(
      pool.filter((c) => c.cca3 !== a.cca3 && c.cca3 !== nb.cca3 && !a.borders.includes(c.cca3)),
      3,
      rng
    );
    return {
      key: `nb-${a.cca3}`,
      prompt: <FlagQ a={a} locale={locale} en="Which country borders it?" de="Welches Land grenzt daran?" />,
      options: opts([nb, ...distract].map((c) => ({ id: c.cca3, label: countryName(c, locale) })), rng),
      correctId: nb.cca3,
      accepted: countryAccepted(nb),
      answerLabel: countryName(nb, locale),
      factCountry: nb,
    };
  },
  // Which of these is landlocked? (answer must be landlocked)
  (a, pool, rng, locale) => {
    if (!a.landlocked) return null;
    const coast = pool.filter((c) => c.cca3 !== a.cca3 && !c.landlocked && c.borders.length > 0);
    if (coast.length < 3) return null;
    const distract = sampleWith(coast, 3, rng);
    return {
      key: `land-${a.cca3}`,
      prompt: <div className="text-center text-lg font-bold">{qt(locale, "Which of these is landlocked?", "Welches davon ist ein Binnenstaat?")}</div>,
      options: opts([a, ...distract].map((c) => ({ id: c.cca3, label: countryName(c, locale) })), rng),
      correctId: a.cca3,
      accepted: countryAccepted(a),
      answerLabel: countryName(a, locale),
      factCountry: a,
    };
  },
  // Which has the larger area? (2 options)
  (a, pool, rng, locale) => {
    const other = sampleWith(pool.filter((c) => c.cca3 !== a.cca3 && c.area > 0), 1, rng)[0];
    if (!other || a.area <= 0) return null;
    const bigger = a.area >= other.area ? a : other;
    return {
      key: `area-${a.cca3}-${other.cca3}`,
      prompt: <div className="text-center text-lg font-bold">{qt(locale, "Which country is larger by area?", "Welches Land ist flächenmäßig größer?")}</div>,
      options: opts([a, other].map((c) => ({ id: c.cca3, label: countryName(c, locale) })), rng),
      correctId: bigger.cca3,
      accepted: [countryName(bigger, locale)],
      answerLabel: countryName(bigger, locale),
      factCountry: bigger,
    };
  },
  // Smallest area among four (ties are rejected).
  (_a, pool, rng, locale) => {
    const four = sampleWith(pool.filter((country) => country.area > 0), 4, rng);
    if (four.length < 4) return null;
    const correct = uniqueExtreme(four, (country) => country.area, "min");
    if (!correct) return null;
    return {
      key: `min-area-${four.map((country) => country.cca3).sort().join("-")}`,
      prompt: <Q>{qt(locale, "Which country is the smallest by area?", "Welches Land ist flächenmäßig am kleinsten?")}</Q>,
      options: opts(four.map((country) => ({ id: country.cca3, label: countryName(country, locale) })), rng),
      correctId: correct.cca3,
      accepted: countryAccepted(correct),
      answerLabel: countryName(correct, locale),
      factCountry: correct,
    };
  },
  // Smallest population among four (ties are rejected).
  (_a, pool, rng, locale) => {
    const four = sampleWith(pool.filter((country) => country.population > 0), 4, rng);
    if (four.length < 4) return null;
    const correct = uniqueExtreme(four, (country) => country.population, "min");
    if (!correct) return null;
    return {
      key: `min-pop-${four.map((country) => country.cca3).sort().join("-")}`,
      prompt: <Q>{qt(locale, "Which country has the smallest population?", "Welches Land hat die kleinste Bevölkerung?")}</Q>,
      options: opts(four.map((country) => ({ id: country.cca3, label: countryName(country, locale) })), rng),
      correctId: correct.cca3,
      accepted: countryAccepted(correct),
      answerLabel: countryName(correct, locale),
      factCountry: correct,
    };
  },
  // Most land neighbours among four (ties are rejected).
  (_a, pool, rng, locale) => {
    const four = sampleWith(pool.filter((country) => country.borders.length > 0), 4, rng);
    if (four.length < 4) return null;
    const correct = uniqueExtreme(four, (country) => country.borders.length, "max");
    if (!correct) return null;
    return {
      key: `max-borders-${four.map((country) => country.cca3).sort().join("-")}`,
      prompt: <Q>{qt(locale, "Which country has the most land neighbours?", "Welches Land hat die meisten Landnachbarn?")}</Q>,
      options: opts(four.map((country) => ({ id: country.cca3, label: countryName(country, locale) })), rng),
      correctId: correct.cca3,
      accepted: countryAccepted(correct),
      answerLabel: countryName(correct, locale),
      factCountry: correct,
    };
  },
  // Exact border count with unique numeric distractors.
  (a, _pool, rng, locale) => {
    const values = borderCountOptions(a.borders.length, rng);
    if (!values) return null;
    const correct = String(a.borders.length);
    return {
      key: `border-count-${a.cca3}`,
      prompt: <Q>{qt(locale, `How many countries border ${countryName(a, locale)}?`, `An wie viele Länder grenzt ${countryName(a, locale)}?`)}</Q>,
      options: values.map((value) => ({ id: String(value), label: String(value) })),
      correctId: correct,
      accepted: [correct],
      answerLabel: correct,
      factCountry: a,
    };
  },
  // Island/no-land-border country among mainland distractors.
  (a, pool, rng, locale) => {
    const islands = pool.filter((country) => country.borders.length === 0 && !country.landlocked);
    const mainland = pool.filter((country) => country.borders.length > 0);
    if (!islands.length || mainland.length < 3) return null;
    const correct = islands.find((country) => country.cca3 === a.cca3) ?? sampleWith(islands, 1, rng)[0];
    const distractors = sampleWith(mainland, 3, rng);
    return {
      key: `island-${correct.cca3}`,
      prompt: <Q>{qt(locale, "Which of these countries has no land border?", "Welches dieser Länder hat keine Landgrenze?")}</Q>,
      options: opts([correct, ...distractors].map((country) => ({ id: country.cca3, label: countryName(country, locale) })), rng),
      correctId: correct.cca3,
      accepted: countryAccepted(correct),
      answerLabel: countryName(correct, locale),
      factCountry: correct,
    };
  },
  // Southern-hemisphere country among northern distractors.
  (a, pool, rng, locale) => {
    const south = pool.filter((country) => country.latlng && country.latlng[0] < 0);
    const north = pool.filter((country) => country.latlng && country.latlng[0] > 0);
    if (!south.length || north.length < 3) return null;
    const correct = south.find((country) => country.cca3 === a.cca3) ?? sampleWith(south, 1, rng)[0];
    const distractors = sampleWith(north, 3, rng);
    return {
      key: `southern-${correct.cca3}`,
      prompt: <Q>{qt(locale, "Which country lies in the Southern Hemisphere?", "Welches Land liegt auf der Südhalbkugel?")}</Q>,
      options: opts([correct, ...distractors].map((country) => ({ id: country.cca3, label: countryName(country, locale) })), rng),
      correctId: correct.cca3,
      accepted: countryAccepted(correct),
      answerLabel: countryName(correct, locale),
      factCountry: correct,
    };
  },
  // Curated "did you know" fact question (ignores `a`, picks from the library).
  (_a, pool, rng, locale, maxFactTier) => {
    const cand = eligibleFactQuestions(pool, maxFactTier);
    if (!cand.length) return null;
    const fq = sampleWith(cand, 1, rng)[0];
    const ans = getCountryByCca3(fq.cca3);
    if (!ans) return null;
    const distract = sampleWith(pool.filter((c) => c.cca3 !== ans.cca3), 3, rng);
    if (distract.length < 3) return null;
    return {
      key: `fact-${fq.cca3}-${seedFromKey(fq.q.en)}`,
      prompt: <div className="text-center text-base font-semibold">{qt(locale, fq.q.en, fq.q.de)}</div>,
      options: opts([ans, ...distract].map((c) => ({ id: c.cca3, label: countryName(c, locale) })), rng),
      correctId: ans.cca3,
      accepted: countryAccepted(ans),
      answerLabel: countryName(ans, locale),
      factCountry: ans,
    };
  },
];

export const CHALLENGE_BUILDER_COUNT = builders.length;

function popPrompt(locale: Locale) {
  return locale === "de" ? "Welches Land hat mehr Einwohner?" : "Which country has more people?";
}

function isValidChoiceRound(round: QuizRound): boolean {
  if (!round.options?.length) return true;
  const ids = round.options.map((option) => option.id);
  const labels = round.options.map((option) => option.label);
  return new Set(ids).size === ids.length
    && new Set(labels).size === labels.length
    && ids.filter((id) => id === round.correctId).length === 1;
}

/** Build a deterministic set of challenge rounds. */
function generateChallengeRounds(
  key: string,
  locale: Locale,
  count: number,
  difficulty: Difficulty
): QuizRound[] {
  const rng = mulberry32(seedFromKey(key));
  const pool = withCapital(poolForDifficulty(difficulty));
  const answers = sampleWith(pool, pool.length, rng);
  const rounds: QuizRound[] = [];
  const usedKeys = new Set<string>();
  const usedAnswerCountries = new Set<string>();
  const builderUses = Array.from({ length: builders.length }, () => 0);
  const maxFactTier = maxFactTierForDifficulty(difficulty);
  let attempt = 0;

  while (rounds.length < count && attempt < answers.length * 4) {
    const answer = answers[attempt % answers.length];
    const offset = attempt % builders.length;
    const order = builders.map((_, index) => index).sort((left, right) =>
      builderUses[left] - builderUses[right]
      || ((left - offset + builders.length) % builders.length) - ((right - offset + builders.length) % builders.length)
    );
    for (const index of order) {
      const round = builders[index](answer, pool, rng, locale, maxFactTier);
      const answerCountry = round?.factCountry?.cca3;
      if (!round || usedKeys.has(round.key) || (answerCountry && usedAnswerCountries.has(answerCountry)) || !isValidChoiceRound(round)) continue;
      usedKeys.add(round.key);
      if (answerCountry) usedAnswerCountries.add(answerCountry);
      builderUses[index] += 1;
      rounds.push(round);
      break;
    }
    attempt += 1;
  }

  // Safe deterministic fallback: flags have unique country IDs/names and can
  // fill any remaining slots without weakening the integrity guarantees.
  for (const answer of answers) {
    if (rounds.length >= count) break;
    if (usedAnswerCountries.has(answer.cca3)) continue;
    const round = builders[0](answer, pool, rng, locale, maxFactTier);
    if (!round || usedKeys.has(round.key) || !isValidChoiceRound(round)) continue;
    usedKeys.add(round.key);
    usedAnswerCountries.add(answer.cca3);
    rounds.push(round);
  }
  return rounds;
}

/** The day's 8-round mixed challenge (medium difficulty). */
export function generateDailyRounds(key: string, locale: Locale): QuizRound[] {
  return generateChallengeRounds(key, locale, DAILY_COUNT, "medium");
}

/** The week's longer, harder 20-round challenge. */
export function generateWeeklyRounds(key: string, locale: Locale): QuizRound[] {
  return generateChallengeRounds(`week-${key}`, locale, WEEKLY_COUNT, "hard");
}
