"use client";

import { useMemo } from "react";
import type { Locale } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { poolForDifficulty, withCapital, countryName } from "@/data/countries";
import { capitalAccepted, capitalLabel } from "@/games/aliases";
import { makeChoices, pickQuestions } from "@/games/round-utils";
import { CITIES, CITY_COUNTRY_CODES, type CityEntry } from "./cities";
import { sample, shuffle, pickOne } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

function cityLabel(c: CityEntry, locale: Locale): string {
  return locale === "de" && c.de ? c.de : c.en;
}
function cityAccepted(c: CityEntry): string[] {
  return [c.en, c.de].filter(Boolean) as string[];
}

export function CapitalsGame({ difficulty, mode, variant, roundCount, timed, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const cityMode = variant === "cities";

  const rounds = useMemo<QuizRound[]>(() => {
    if (cityMode) {
      const pool = poolForDifficulty(difficulty).filter((c) => CITY_COUNTRY_CODES.has(c.cca3));
      const count = roundCount === 0 ? pool.length : roundCount;
      const questions = pickQuestions(pool, count);
      // Flat list of (city, country) for distractors.
      const allCities = pool.flatMap((c) => CITIES[c.cca3].map((city) => ({ city, cca3: c.cca3 })));

      return questions.map((answer) => {
        const city = pickOne(CITIES[answer.cca3]);
        const answerText = cityLabel(city, locale);
        const distractors = sample(
          allCities.filter((x) => x.cca3 !== answer.cca3 && cityLabel(x.city, locale) !== answerText),
          3
        );
        const options = shuffle([
          { id: answer.cca3, label: answerText },
          ...distractors.map((d) => ({ id: `${d.cca3}-${d.city.en}`, label: cityLabel(d.city, locale) })),
        ]);
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
          accepted: CITIES[answer.cca3].flatMap(cityAccepted),
          answerLabel: answerText,
          factCountry: answer,
        };
      });
    }

    const pool = withCapital(poolForDifficulty(difficulty));
    const count = roundCount === 0 ? pool.length : roundCount;
    const questions = pickQuestions(pool, count);
    return questions.map((answer) => {
      const choices = makeChoices(answer, pool, difficulty);
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
  }, [difficulty, roundCount, cityMode, locale]);

  return (
    <QuizGame
      gameId="capitals"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      timed={timed}
      practice={practice}
      onFinish={onFinish}
      onExit={onExit}
      typePlaceholderKey={cityMode ? "type.placeholderCity" : "type.placeholderCapital"}
    />
  );
}
