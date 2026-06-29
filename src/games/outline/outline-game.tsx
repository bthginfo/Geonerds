"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { CountrySilhouette } from "@/components/map/country-silhouette";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { makeChoices, pickQuestions } from "@/games/round-utils";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { useT } from "@/i18n/I18nProvider";

export function OutlineGame({ difficulty, mode, roundCount, timed, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);

  useEffect(() => {
    // Some bundled 10m geometries are degenerate (e.g. Australia is a 5-point
    // box); patch them from a small override file before building rounds.
    Promise.all([
      featuresByCcn3("10m"),
      fetch("/geo/outline-overrides.json").then((r) => r.json()).catch(() => ({})),
    ]).then(([feats, overrides]: [Map<string, CountryFeature>, Record<string, GeoJSON.Geometry>]) => {
      for (const [ccn3, geometry] of Object.entries(overrides)) {
        const f = feats.get(ccn3);
        if (f) feats.set(ccn3, { ...f, geometry } as CountryFeature);
      }
      setFeatures(feats);
    });
  }, []);

  const rounds = useMemo<QuizRound[]>(() => {
    if (!features) return [];
    // Micro-states have no recognisable silhouette — their coarse geometry just
    // blows up into a featureless blob — so keep the outline quiz to countries
    // with a meaningful shape.
    const MIN_AREA_KM2 = 2500;
    const pool = poolForDifficulty(difficulty, { requireGeometry: true }).filter(
      (c) => c.ccn3 && features.has(String(c.ccn3)) && c.area >= MIN_AREA_KM2
    );
    const count = roundCount === 0 ? pool.length : roundCount;
    const questions = pickQuestions(pool, count);
    return questions.map((answer) => {
      const choices = makeChoices(answer, pool, difficulty);
      const feat = features.get(String(answer.ccn3))!;
      return {
        key: answer.cca3,
        prompt: (
          <div className="h-64 w-72 max-w-full sm:h-72 sm:w-80">
            <CountrySilhouette feature={feat} fillClassName="fill-primary" />
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
  }, [features, difficulty, roundCount]);

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
      timed={timed}
      practice={practice}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}
