"use client";

import { useMemo } from "react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { COUNTRIES, getCountryByCca3, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { sample, shuffle } from "@/lib/utils";
import { ITEMS } from "./items";
import { useT } from "@/i18n/I18nProvider";

export function OriginGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
    const usable = ITEMS.filter((it) => getCountryByCca3(it.cca3));
    const count = roundCount === 0 ? usable.length : roundCount;
    return sample(usable, Math.min(count, usable.length)).map((item) => {
      const answer = getCountryByCca3(item.cca3)!;
      const distractors = sample(COUNTRIES.filter((c) => c.cca3 !== answer.cca3), 3);
      const options = shuffle([answer, ...distractors]).map((c) => ({ id: c.cca3, label: countryName(c, locale) }));
      return {
        key: `${item.category}-${item.en}`,
        prompt: (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-7xl leading-none">{item.emoji}</span>
            <span className="text-xl font-bold">{locale === "de" ? item.de : item.en}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(`origin.category.${item.category}`)}
            </span>
          </div>
        ),
        options,
        correctId: answer.cca3,
        accepted: countryAccepted(answer),
        answerLabel: countryName(answer, locale),
        factCountry: answer,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundCount, locale]);

  return (
    <QuizGame gameId="origin" rounds={rounds} mode={mode} difficulty={difficulty} timed={timed} onFinish={onFinish} onExit={onExit} />
  );
}
