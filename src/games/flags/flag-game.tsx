"use client";

import { useMemo } from "react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { makeChoices, pickQuestions, ROUNDS_PER_GAME } from "@/games/round-utils";
import { useT } from "@/i18n/I18nProvider";

export function FlagGame({ difficulty, mode, onFinish, onExit }: PlayHandlers) {
  const { locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
    const pool = poolForDifficulty(difficulty);
    const questions = pickQuestions(pool, ROUNDS_PER_GAME);
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
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  return (
    <QuizGame
      gameId="flags"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      onFinish={onFinish}
      onExit={onExit}
      typePlaceholderKey="type.placeholder"
    />
  );
}
