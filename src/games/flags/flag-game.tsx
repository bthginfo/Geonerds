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
import { createSeededRandom } from "@/lib/random";

export function FlagGame({ difficulty, mode, roundCount, timed, variant, scope, practice, seed, challenge, onFinish, onExit }: PlayHandlers) {
  const { locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
    const random = seed ? createSeededRandom(seed) : Math.random;
    // World uses the difficulty tiers; a continent uses all its countries.
    const requestedRegion = scope || (variant && variant !== "world" ? variant : undefined);
    const pool = requestedRegion
      ? COUNTRIES.filter((c) => c.region === requestedRegion)
      : poolForDifficulty(difficulty);
    const count = roundCount === 0 ? pool.length : roundCount;
    const poolCodes = new Set(pool.map((c) => c.cca3));
    const questions = pickQuestions(pool, count, random);
    return questions.map((answer) => {
      let choices: Country[];
      if (difficulty === "hard") {
        // Lead with look-alike flags, then fill from the same region.
        const lookalikes = confusableFlags(answer.cca3)
          .filter((code) => poolCodes.has(code))
          .map((code) => getCountryByCca3(code)!)
          .filter(Boolean);
        const picked = sample(lookalikes, Math.min(2, lookalikes.length), random);
        const rest = makeChoices(answer, pool, difficulty, 4, random).filter(
          (c) => c.cca3 !== answer.cca3 && !picked.some((p) => p.cca3 === c.cca3)
        );
        const distract = [...picked, ...rest].slice(0, 3);
        choices = shuffle([answer, ...distract], random);
      } else {
        choices = makeChoices(answer, pool, difficulty, 4, random);
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
  }, [difficulty, roundCount, variant, scope, locale, seed]);

  return (
    <QuizGame
      gameId="flags"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      timed={timed}
      practice={practice}
      challenge={challenge}
      onFinish={onFinish}
      onExit={onExit}
      typePlaceholderKey="type.placeholder"
    />
  );
}
