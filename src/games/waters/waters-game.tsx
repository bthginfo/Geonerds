"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FeatureMap } from "@/components/map/feature-map";
import { loadWaters, waterLabel, waterPoolForDifficulty, type Water } from "@/lib/waters";
import { sample, shuffle } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";
import { createSeededRandom } from "@/lib/random";
import { GameLoadState } from "@/games/load-state";

export function WatersGame({ difficulty, mode, roundCount, timed, practice, seed, challenge, onFinish, onExit }: PlayHandlers) {
  const { locale } = useT();
  const [waters, setWaters] = useState<Water[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    loadWaters().then(setWaters).catch(() => setLoadFailed(true));
  }, []);

  const rounds = useMemo<QuizRound[]>(() => {
    if (!waters) return [];
    const random = seed ? createSeededRandom(seed) : Math.random;
    const pool = waterPoolForDifficulty(waters, difficulty);
    const count = roundCount === 0 ? pool.length : roundCount;
    return sample(pool, Math.min(count, pool.length), random).map((answer) => {
      const distractors = sample(
        waters.filter((w) => w.id !== answer.id && w.kind === answer.kind),
        3,
        random
      );
      const options = shuffle([answer, ...distractors], random).map((w) => ({ id: w.id, label: waterLabel(w, locale) }));
      return {
        key: answer.id,
        prompt: (
          <div className="aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl border border-border">
            <FeatureMap geometry={answer.geometry} kind={answer.kind} />
          </div>
        ),
        options,
        correctId: answer.id,
        accepted: answer.accepted,
        answerLabel: waterLabel(answer, locale),
      };
    });
  }, [waters, difficulty, roundCount, locale, seed]);

  if (loadFailed || !waters || rounds.length === 0) return <GameLoadState onExit={onExit} failed={loadFailed} empty={!!waters && !rounds.length} />;

  return (
    <QuizGame gameId="waters" rounds={rounds} mode={mode} difficulty={difficulty} timed={timed} practice={practice} challenge={challenge} onFinish={onFinish} onExit={onExit} />
  );
}
