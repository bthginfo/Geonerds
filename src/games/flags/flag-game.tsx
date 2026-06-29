"use client";

import { useMemo } from "react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { COUNTRIES, poolForDifficulty, countryName, getCountryByCca3 } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { makeChoices, pickQuestions } from "@/games/round-utils";
import { confusableFlags } from "./confusable";
import { sample, shuffle } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";
import type { Country } from "@/lib/types";

export function FlagGame({ difficulty, mode, roundCount, timed, variant, onFinish, onExit }: PlayHandlers) {
  const { locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
    // World uses the difficulty tiers; a continent uses all its countries.
    const pool =
      !variant || variant === "world"
        ? poolForDifficulty(difficulty)
        : COUNTRIES.filter((c) => c.region === variant);
    const count = roundCount === 0 ? pool.length : roundCount;
    const poolCodes = new Set(pool.map((c) => c.cca3));
    const questions = pickQuestions(pool, count);
    return questions.map((answer) => {
      let choices: Country[];
      if (difficulty === "hard") {
        // Lead with look-alike flags, then fill from the same region.
        const lookalikes = confusableFlags(answer.cca3)
          .filter((code) => poolCodes.has(code))
          .map((code) => getCountryByCca3(code)!)
          .filter(Boolean);
        const picked = sample(lookalikes, Math.min(2, lookalikes.length));
        const rest = makeChoices(answer, pool, difficulty).filter(
          (c) => c.cca3 !== answer.cca3 && !picked.some((p) => p.cca3 === c.cca3)
        );
        const distract = [...picked, ...rest].slice(0, 3);
        choices = shuffle([answer, ...distract]);
      } else {
        choices = makeChoices(answer, pool, difficulty);
      }
      return {
        key: answer.cca3,
        prompt: (
          <FlagImage code={answer.flag} hideText alt="flag" className="aspect-[4/3] w-64 max-w-full shadow-lg" />
        ),
        revealPrompt: <FlagImage code={answer.flag} alt="flag" className="aspect-[4/3] w-64 max-w-full shadow-lg" />,
        options: choices.map((c) => ({ id: c.cca3, label: countryName(c, locale) })),
        correctId: answer.cca3,
        accepted: countryAccepted(answer),
        answerLabel: countryName(answer, locale),
        factCountry: answer,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, roundCount, variant]);

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
