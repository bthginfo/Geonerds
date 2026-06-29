import type { Country, Locale } from "@/lib/types";
import { FlagImage } from "@/components/flag-image";
import { poolForDifficulty, withCapital, countryName } from "@/data/countries";
import { capitalLabel, capitalAccepted, countryAccepted } from "@/games/aliases";
import { simplifyCurrency } from "@/lib/currency";
import { DAILY_COUNT, mulberry32, seedFromKey, sampleWith, shuffleWith } from "@/lib/daily";
import type { QuizRound } from "@/games/quiz-core";

type Builder = (answer: Country, pool: Country[], rng: () => number, locale: Locale) => QuizRound | null;

function opts(items: { id: string; label: string }[], rng: () => number) {
  return shuffleWith(items, rng);
}

const builders: Builder[] = [
  // Flag → country
  (a, pool, rng, locale) => {
    const distract = sampleWith(pool.filter((c) => c.cca3 !== a.cca3), 3, rng);
    return {
      key: `flag-${a.cca3}`,
      prompt: (
        <div className="flex flex-col items-center gap-3">
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
];

function popPrompt(locale: Locale) {
  return locale === "de" ? "Welches Land hat mehr Einwohner?" : "Which country has more people?";
}

/** Build the deterministic set of rounds for a given day. */
export function generateDailyRounds(key: string, locale: Locale): QuizRound[] {
  const rng = mulberry32(seedFromKey(key));
  const pool = withCapital(poolForDifficulty("medium"));
  const answers = sampleWith(pool, DAILY_COUNT * 2, rng);
  const rounds: QuizRound[] = [];
  let bi = 0;
  for (const a of answers) {
    if (rounds.length >= DAILY_COUNT) break;
    const builder = builders[bi % builders.length];
    bi += 1;
    const r = builder(a, pool, rng, locale);
    if (r) rounds.push(r);
  }
  return rounds;
}
