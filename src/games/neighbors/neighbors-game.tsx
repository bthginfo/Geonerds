"use client";

import { useMemo } from "react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { getCountryByCca3, poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { pickQuestions } from "@/games/round-utils";
import { sample, shuffle } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

function neighborsOf(c: Country): Country[] {
  return c.borders.map((b) => getCountryByCca3(b)).filter((x): x is Country => !!x);
}

export function NeighborsGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
    const pool = poolForDifficulty(difficulty);
    const candidates = pool.filter((c) => neighborsOf(c).length >= 2);
    const count = roundCount === 0 ? candidates.length : roundCount;
    return pickQuestions(candidates, count).map((answer) => {
      const nbs = neighborsOf(answer);
      const distractors = sample(pool.filter((c) => c.cca3 !== answer.cca3), 3);
      const options = shuffle([answer, ...distractors]).map((c) => ({ id: c.cca3, label: countryName(c, locale) }));
      return {
        key: answer.cca3,
        prompt: (
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">{t("neighbors.prompt")}</span>
            <div className="flex max-w-sm flex-wrap justify-center gap-2">
              {nbs.map((n) => (
                <div key={n.cca3} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-sm font-medium">
                  <FlagImage code={n.flag} alt="" className="aspect-[4/3] w-6" rounded={false} />
                  {countryName(n, locale)}
                </div>
              ))}
            </div>
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
  }, [difficulty, roundCount]);

  return (
    <QuizGame gameId="neighbors" rounds={rounds} mode={mode} difficulty={difficulty} timed={timed} onFinish={onFinish} onExit={onExit} />
  );
}
