"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { CountrySilhouette } from "@/components/map/country-silhouette";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { makeChoices, pickQuestions, ROUNDS_PER_GAME } from "@/games/round-utils";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { useT } from "@/i18n/I18nProvider";

export function OutlineGame({ difficulty, mode, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);

  useEffect(() => {
    featuresByCcn3("50m").then(setFeatures);
  }, []);

  const rounds = useMemo<QuizRound[]>(() => {
    if (!features) return [];
    const pool = poolForDifficulty(difficulty, { requireGeometry: true }).filter(
      (c) => c.ccn3 && features.has(String(c.ccn3))
    );
    const questions = pickQuestions(pool, ROUNDS_PER_GAME);
    return questions.map((answer) => {
      const choices = makeChoices(answer, pool, difficulty);
      const feat = features.get(String(answer.ccn3))!;
      return {
        key: answer.cca3,
        prompt: (
          <div className="h-56 w-56 sm:h-64 sm:w-64">
            <CountrySilhouette feature={feat} fillClassName="fill-primary" />
          </div>
        ),
        options: choices.map((c) => ({ id: c.cca3, label: countryName(c, locale) })),
        correctId: answer.cca3,
        accepted: countryAccepted(answer),
        answerLabel: countryName(answer, locale),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, difficulty]);

  if (!features || rounds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <QuizGame
      gameId="outline"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}
