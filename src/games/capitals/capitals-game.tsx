"use client";

import { useMemo } from "react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { poolForDifficulty, withCapital, countryName } from "@/data/countries";
import { capitalAccepted, capitalLabel } from "@/games/aliases";
import { makeChoices, pickQuestions } from "@/games/round-utils";
import { useT } from "@/i18n/I18nProvider";

export function CapitalsGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
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
  }, [difficulty, roundCount]);

  return (
    <QuizGame
      gameId="capitals"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      timed={timed}
      onFinish={onFinish}
      onExit={onExit}
      typePlaceholderKey="type.placeholderCapital"
    />
  );
}
