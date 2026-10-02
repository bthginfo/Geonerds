"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { CountrySilhouette } from "@/components/map/country-silhouette";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { makeChoices, pickQuestions } from "@/games/round-utils";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { isRecognizableOutline } from "@/lib/geometry";
import { useT } from "@/i18n/I18nProvider";
import { createSeededRandom } from "@/lib/random";
import { GameLoadState } from "@/games/load-state";

export function OutlineGame({ difficulty, mode, roundCount, timed, scope, practice, seed, challenge, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    featuresByCcn3("10m").then(setFeatures).catch(() => setLoadFailed(true));
  }, []);

  const rounds = useMemo<QuizRound[]>(() => {
    if (!features) return [];
    const random = seed ? createSeededRandom(seed) : Math.random;
    const pool = poolForDifficulty(difficulty, { requireGeometry: true }).filter(
      (country) => {
        if (scope && country.region !== scope) return false;
        if (!country.ccn3) return false;
        const feature = features.get(String(country.ccn3));
        return feature ? isRecognizableOutline(feature.geometry) : false;
      }
    );
    const count = roundCount === 0 ? pool.length : roundCount;
    const questions = pickQuestions(pool, count, random);
    return questions.map((answer) => {
      const choices = makeChoices(answer, pool, difficulty, 4, random);
      const feat = features.get(String(answer.ccn3))!;
      return {
        key: answer.cca3,
        prompt: (
          <div className="h-64 w-72 max-w-full sm:h-72 sm:w-80">
            <CountrySilhouette
              feature={feat}
              fillClassName="fill-primary"
              label={t("outline.imageAlt")}
            />
          </div>
        ),
        options: choices.map((c) => ({ id: c.cca3, label: countryName(c, locale) })),
        correctId: answer.cca3,
        accepted: countryAccepted(answer),
        answerLabel: countryName(answer, locale),
        factCountry: answer,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, difficulty, roundCount, scope, locale, seed]);

  if (loadFailed || !features || rounds.length === 0) return <GameLoadState onExit={onExit} failed={loadFailed} empty={!!features && !rounds.length} />;

  return (
    <QuizGame
      gameId="outline"
      rounds={rounds}
      mode={mode}
      difficulty={difficulty}
      timed={timed}
      practice={practice}
      challenge={challenge}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}
