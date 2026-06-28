"use client";

import { useEffect, useMemo } from "react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { pickQuestions } from "@/games/round-utils";
import { sample, shuffle, pickOne } from "@/lib/utils";
import { findScript, loadScriptFonts } from "./scripts";
import { useT } from "@/i18n/I18nProvider";

export function LanguagesGame({ difficulty, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  useEffect(() => {
    loadScriptFonts();
  }, []);

  const rounds = useMemo<QuizRound[]>(() => {
    const pool = poolForDifficulty(difficulty).filter((c) => c.currencies.length > 0 || findScript(c));
    const count = roundCount === 0 ? pool.length : roundCount;
    const questions = pickQuestions(pool, count);

    return questions.map((answer) => {
      const script = findScript(answer);
      // Prefer the script clue ~65% of the time when available.
      const useScript = !!script && (Math.random() < 0.65 || answer.currencies.length === 0);

      let prompt: React.ReactNode;
      let distractors: Country[];

      if (useScript && script) {
        prompt = (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("languages.clue.language")}
            </span>
            <span
              className="text-5xl font-semibold leading-tight"
              style={{ fontFamily: `'${script.sample.font}', sans-serif` }}
              lang=""
            >
              {script.sample.text}
            </span>
          </div>
        );
        const lang = script.language;
        distractors = sample(
          pool.filter((c) => c.cca3 !== answer.cca3 && !c.languages.includes(lang)),
          3
        );
      } else {
        const currency = pickOne(answer.currencies);
        prompt = (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("languages.clue.currency")}
            </span>
            <span className="text-3xl font-bold">{currency}</span>
          </div>
        );
        distractors = sample(
          pool.filter((c) => c.cca3 !== answer.cca3 && !c.currencies.includes(currency)),
          3
        );
      }

      const options = shuffle([answer, ...distractors]).map((c) => ({ id: c.cca3, label: countryName(c, locale) }));

      return {
        key: answer.cca3,
        prompt: <div className="flex min-h-32 items-center justify-center">{prompt}</div>,
        options,
        correctId: answer.cca3,
        accepted: countryAccepted(answer),
        answerLabel: countryName(answer, locale),
        factCountry: answer,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, roundCount]);

  return (
    <QuizGame
      gameId="languages"
      rounds={rounds}
      mode="choice"
      difficulty={difficulty}
      timed={timed}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}
