"use client";

import { useMemo } from "react";
import { Globe2, Compass, Languages as LangIcon, Coins, Waves, Users, Maximize2 } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { FlagImage } from "@/components/flag-image";
import { getCountryByCca3, poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { pickQuestions } from "@/games/round-utils";
import { sample, shuffle, formatNumber } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

function neighborsOf(c: Country): Country[] {
  return c.borders.map((b) => getCountryByCca3(b)).filter((x): x is Country => !!x);
}

function roundPeople(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function NeighborsGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const rounds = useMemo<QuizRound[]>(() => {
    const pool = poolForDifficulty(difficulty);
    // Need countries with enough identifying signal.
    const candidates = pool.filter((c) => c.region && (c.languages.length > 0 || c.currencies.length > 0));
    const count = roundCount === 0 ? candidates.length : roundCount;
    // Fewer clues as difficulty rises.
    const clueBudget = difficulty === "easy" ? 6 : difficulty === "medium" ? 4 : 3;

    return pickQuestions(candidates, count).map((answer) => {
      const nbs = neighborsOf(answer);

      // Build prioritised clues; strongest first so trimming still leaves it solvable.
      type Clue = { id: string; icon: typeof Globe2; label: string; node: React.ReactNode };
      const clues: Clue[] = [];

      if (nbs.length > 0) {
        clues.push({
          id: "neighbours",
          icon: Compass,
          label: t("neighbors.clue.neighbours"),
          node: (
            <div className="flex flex-wrap gap-1.5">
              {nbs.slice(0, 6).map((n) => (
                <span key={n.cca3} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  <FlagImage code={n.flag} alt="" className="aspect-[4/3] w-4" rounded={false} />
                  {countryName(n, locale)}
                </span>
              ))}
            </div>
          ),
        });
      }
      clues.push({ id: "subregion", icon: Compass, label: t("neighbors.clue.subregion"), node: answer.subregion || answer.region });
      if (answer.languages.length > 0)
        clues.push({ id: "language", icon: LangIcon, label: t("neighbors.clue.language"), node: answer.languages.slice(0, 2).join(", ") });
      if (answer.currencies.length > 0)
        clues.push({ id: "currency", icon: Coins, label: t("neighbors.clue.currency"), node: answer.currencies[0] });
      clues.push({ id: "region", icon: Globe2, label: t("neighbors.clue.region"), node: answer.region });
      clues.push({
        id: "coast",
        icon: Waves,
        label: t("neighbors.clue.coast"),
        node: answer.landlocked ? t("neighbors.clue.coastNo") : t("neighbors.clue.coastYes"),
      });
      if (answer.population > 0)
        clues.push({ id: "pop", icon: Users, label: t("neighbors.clue.population"), node: t("neighbors.clue.people", { n: roundPeople(answer.population) }) });
      if (answer.area > 0)
        clues.push({ id: "area", icon: Maximize2, label: t("neighbors.clue.area"), node: t("neighbors.clue.km2", { n: formatNumber(Math.round(answer.area), locale) }) });

      const shown = clues.slice(0, clueBudget);

      // On hard, distractors come from the same region for extra confusion.
      const distractorPool =
        difficulty === "hard"
          ? pool.filter((c) => c.cca3 !== answer.cca3 && c.region === answer.region)
          : pool.filter((c) => c.cca3 !== answer.cca3);
      const distractors = sample(distractorPool.length >= 3 ? distractorPool : pool.filter((c) => c.cca3 !== answer.cca3), 3);
      const options = shuffle([answer, ...distractors]).map((c) => ({ id: c.cca3, label: countryName(c, locale) }));

      return {
        key: answer.cca3,
        prompt: (
          <div className="flex w-full max-w-sm flex-col items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">{t("neighbors.promptClues")}</span>
            <div className="w-full space-y-2">
              {shown.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.id} className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
                      <div className="text-sm font-medium">{c.node}</div>
                    </div>
                  </div>
                );
              })}
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
  }, [difficulty, roundCount, locale]);

  return (
    <QuizGame gameId="neighbors" rounds={rounds} mode={mode} difficulty={difficulty} timed={timed} onFinish={onFinish} onExit={onExit} />
  );
}
