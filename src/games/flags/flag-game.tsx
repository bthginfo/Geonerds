"use client";

import { useMemo } from "react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { makeChoices, pickQuestions } from "@/games/round-utils";
import { useT } from "@/i18n/I18nProvider";

export function FlagGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
    const pool = poolForDifficulty(difficulty);
    const count = roundCount === 0 ? pool.length : roundCount;
    const questions = pickQuestions(pool, count);
    return questions.map((answer) => {
      const choices = makeChoices(answer, pool, difficulty);
      return {
        key: answer.cca3,
        prompt: (
          <FlagImage
            code={answer.flag}
            hideText
            alt="flag"
            className="aspect-[4/3] w-64 max-w-full shadow-lg"
          />
        ),
        options: choices.map((c) => ({ id: c.cca3, label: countryName(c, locale) })),
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
      gameId="flags"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      timed={timed}
      onFinish={onFinish}
      onExit={onExit}
      typePlaceholderKey="type.placeholder"
    />
  );
}
