"use client";

import { useMemo } from "react";
import type { Locale } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { COUNTRIES, poolForDifficulty, withCapital, countryName } from "@/data/countries";
import { capitalAccepted, capitalLabel, countryAccepted } from "@/games/aliases";
import { makeChoices, pickQuestions } from "@/games/round-utils";
import { CITIES, LEGACY_CITIES, type CityEntry } from "./cities";
import { sample, shuffle, pickOne } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";
import { createSeededRandom } from "@/lib/random";
import { isLegacyGeoSeed } from "@/lib/geo-content-version";

function cityLabel(c: CityEntry, locale: Locale): string {
  return locale === "de" && c.de ? c.de : c.en;
}
function cityAccepted(c: CityEntry): string[] {
  return [c.en, c.de].filter(Boolean) as string[];
}

export function CapitalsGame({ difficulty, mode, variant, scope, roundCount, timed, practice, seed, challenge, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const cityMode = variant === "cities";
  const legacyCityMode = cityMode && isLegacyGeoSeed(seed);

  const rounds = useMemo<QuizRound[]>(() => {
    const random = seed ? createSeededRandom(seed) : Math.random;
    if (cityMode) {
      const source = scope ? COUNTRIES.filter((c) => c.region === scope) : poolForDifficulty(difficulty);
      const citySource = legacyCityMode ? LEGACY_CITIES : CITIES;
      const pool = source.filter((c) => citySource[c.cca3]?.length);
      if (!legacyCityMode) {
        // Every city is a target, rather than just one randomly selected city per
        // country. Exclude cross-country namesakes so a bare city has one answer.
        const allCities = pool.flatMap((country) => citySource[country.cca3].map((city) => ({ city, country })));
        const owners = new Map<string, Set<string>>();
        for (const entry of allCities) {
          const label = cityLabel(entry.city, locale).toLocaleLowerCase(locale);
          const countries = owners.get(label) ?? new Set<string>();
          countries.add(entry.country.cca3);
          owners.set(label, countries);
        }
        const unambiguous = allCities.filter(({ city }) => owners.get(cityLabel(city, locale).toLocaleLowerCase(locale))?.size === 1);
        const count = roundCount === 0 ? unambiguous.length : Math.min(roundCount, unambiguous.length);
        return sample(unambiguous, count, random).map(({ city, country: answer }) => ({
          key: `${answer.cca3}-${city.en}`,
          prompt: (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-3xl font-bold leading-tight">{cityLabel(city, locale)}</div>
              <p className="text-sm text-muted-foreground">{t("refresh.capitals.cityCountry")}</p>
            </div>
          ),
          revealPrompt: (
            <div className="flex flex-col items-center gap-3 text-center">
              <FlagImage code={answer.flag} alt="" className="aspect-[4/3] w-24 shadow-md" />
              <div className="text-2xl font-bold">{cityLabel(city, locale)}</div>
              <div className="text-sm text-muted-foreground">{countryName(answer, locale)}</div>
            </div>
          ),
          options: makeChoices(answer, pool, difficulty, 4, random).map((country) => ({ id: country.cca3, label: countryName(country, locale) })),
          correctId: answer.cca3,
          accepted: countryAccepted(answer),
          answerLabel: countryName(answer, locale),
          factCountry: answer,
        }));
      }
      // Existing geo: invitations retain the exact previous question stream.
      const count = roundCount === 0 ? pool.length : roundCount;
      const questions = pickQuestions(pool, count, random);
      // Flat list of (city, country) for distractors.
      const allCities = pool.flatMap((c) => citySource[c.cca3].map((city) => ({ city, cca3: c.cca3 })));

      return questions.map((answer) => {
        const city = pickOne(citySource[answer.cca3], random);
        const answerText = cityLabel(city, locale);
        const distractors = sample(
          allCities.filter((x) => x.cca3 !== answer.cca3 && cityLabel(x.city, locale) !== answerText),
          3,
          random
        );
        const options = shuffle([
          { id: answer.cca3, label: answerText },
          ...distractors.map((d) => ({ id: `${d.cca3}-${d.city.en}`, label: cityLabel(d.city, locale) })),
        ], random);
        return {
          key: answer.cca3,
          prompt: (
            <div className="flex flex-col items-center gap-4">
              <FlagImage code={answer.flag} alt="flag" className="aspect-[4/3] w-28 shadow-md" />
              <div className="text-2xl font-bold">{countryName(answer, locale)}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("capitals.cityPrompt")}</div>
            </div>
          ),
          options,
          correctId: answer.cca3,
          accepted: citySource[answer.cca3].flatMap(cityAccepted),
          answerLabel: answerText,
          factCountry: answer,
        };
      });
    }

    const source = scope ? COUNTRIES.filter((c) => c.region === scope) : poolForDifficulty(difficulty);
    const pool = withCapital(source);
    const count = roundCount === 0 ? pool.length : roundCount;
    const questions = pickQuestions(pool, count, random);
    return questions.map((answer) => {
      const choices = makeChoices(answer, pool, difficulty, 4, random);
      return {
        key: answer.cca3,
        prompt: (
          <div className="flex flex-col items-center gap-4">
            <FlagImage code={answer.flag} alt="flag" className="aspect-[4/3] w-28 shadow-md" />
            <div className="text-2xl font-bold">{countryName(answer, locale)}</div>
          </div>
        ),
        options: choices.map((c) => ({ id: c.cca3, label: capitalLabel(c, locale) })),
        correctId: answer.cca3,
        accepted: capitalAccepted(answer),
        answerLabel: capitalLabel(answer, locale),
        factCountry: answer,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, roundCount, cityMode, legacyCityMode, locale, scope, seed]);

  return (
    <QuizGame
      gameId="capitals"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      timed={timed}
      practice={practice}
      challenge={challenge}
      onFinish={onFinish}
      onExit={onExit}
      typePlaceholderKey={cityMode ? legacyCityMode ? "type.placeholderCity" : "type.placeholder" : "type.placeholderCapital"}
    />
  );
}
