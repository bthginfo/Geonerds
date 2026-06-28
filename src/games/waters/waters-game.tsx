"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FeatureMap } from "@/components/map/feature-map";
import { loadWaters, waterLabel, type Water } from "@/lib/waters";
import { sample, shuffle } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

export function WatersGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [waters, setWaters] = useState<Water[] | null>(null);

  useEffect(() => {
    loadWaters().then(setWaters);
  }, []);

  const rounds = useMemo<QuizRound[]>(() => {
    if (!waters) return [];
    // Easy favours the best-known (earlier in the list); hard uses all.
    const pool = difficulty === "easy" ? waters.filter((_, i) => i % 2 === 0) : waters;
    const count = roundCount === 0 ? pool.length : roundCount;
    return sample(pool, Math.min(count, pool.length)).map((answer) => {
      const distractors = sample(
        waters.filter((w) => w.id !== answer.id && w.kind === answer.kind),
        3
      );
      const options = shuffle([answer, ...distractors]).map((w) => ({ id: w.id, label: waterLabel(w, locale) }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waters, difficulty, roundCount]);

  if (!waters || rounds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <QuizGame gameId="waters" rounds={rounds} mode={mode} difficulty={difficulty} timed={timed} onFinish={onFinish} onExit={onExit} />
  );
}
