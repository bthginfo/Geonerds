import type { Country, Difficulty, Locale } from "@/lib/types";
import { FlagImage } from "@/components/flag-image";
import { poolForDifficulty, withCapital, countryName, getCountryByCca3 } from "@/data/countries";
import { capitalLabel, capitalAccepted, countryAccepted } from "@/games/aliases";
import { simplifyCurrency } from "@/lib/currency";
import { DAILY_COUNT, WEEKLY_COUNT, mulberry32, seedFromKey, sampleWith, shuffleWith } from "@/lib/daily";
import type { QuizRound } from "@/games/quiz-core";

type Builder = (answer: Country, pool: Country[], rng: () => number, locale: Locale) => QuizRound | null;

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
];

function popPrompt(locale: Locale) {
  return locale === "de" ? "Welches Land hat mehr Einwohner?" : "Which country has more people?";
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
  const answers = sampleWith(pool, count * 4, rng);
  const rounds: QuizRound[] = [];
  const usedKeys = new Set<string>();
  let bi = 0;
  for (const a of answers) {
    if (rounds.length >= count) break;
    // Try builders starting at a rotating offset so the mix stays varied, but
    // fall through when a builder can't handle this country (e.g. landlocked).
    for (let k = 0; k < builders.length; k++) {
      const r = builders[(bi + k) % builders.length](a, pool, rng, locale);
      if (r && !usedKeys.has(r.key)) {
        usedKeys.add(r.key);
        rounds.push(r);
        bi += 1;
        break;
      }
    }
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
