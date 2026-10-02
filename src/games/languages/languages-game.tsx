"use client";

import { useEffect, useMemo } from "react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { QuizGame, type QuizRound } from "@/games/quiz-core";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { sample, shuffle, pickOne } from "@/lib/utils";
import { simplifyCurrency } from "@/lib/currency";
import { findScript, loadScriptFonts } from "./scripts";
import { useT } from "@/i18n/I18nProvider";
import { createSeededRandom } from "@/lib/random";

export function LanguagesGame({ difficulty, roundCount, timed, scope, practice, seed, challenge, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  useEffect(() => {
    loadScriptFonts();
  }, []);

  const rounds = useMemo<QuizRound[]>(() => {
    const random = seed ? createSeededRandom(seed) : Math.random;
    const pool = poolForDifficulty(difficulty).filter((c) => (!scope || c.region === scope) && (c.currencies.length > 0 || findScript(c)));
    const count = roundCount === 0 ? pool.length : Math.min(roundCount, pool.length);
    // Bias toward script-capable countries so language clues show up often.
    const scriptCountries = pool.filter((c) => findScript(c));
    const scriptShare = Math.min(scriptCountries.length, Math.round(count * 0.6));
    const chosen = sample(scriptCountries, scriptShare, random);
    const rest = sample(
      pool.filter((c) => !chosen.includes(c)),
      Math.max(0, count - chosen.length),
      random
    );
    const questions = shuffle([...chosen, ...rest], random);

    return questions.map((answer) => {
      const script = findScript(answer, random);
      // Always use the script clue when available (otherwise fall back to currency).
      const useScript = !!script;

      let prompt: React.ReactNode;
      let distractors: Country[];

      if (useScript && script) {
        prompt = (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("languages.clue.language")}
            </span>
            <span
              className="text-5xl font-semibold leading-tight"
              style={{ fontFamily: `'${script.sample.font}', sans-serif` }}
              lang=""
            >
              {script.sample.text}
            </span>
          </div>
        );
        const lang = script.language;
        distractors = sample(
          pool.filter((c) => c.cca3 !== answer.cca3 && !c.languages.includes(lang)),
          3,
          random
        );
      } else {
        const currency = pickOne(answer.currencies, random);
        const simple = simplifyCurrency(currency);
        // Options must not share the simplified unit, so there's one answer.
        let candidates = pool.filter(
          (c) => c.cca3 !== answer.cca3 && !c.currencies.some((cu) => simplifyCurrency(cu) === simple)
        );
        let display = simple;
        if (candidates.length < 3) {
          // Too many share this unit (e.g. dollar/euro) — fall back to the full name.
          candidates = pool.filter((c) => c.cca3 !== answer.cca3 && !c.currencies.includes(currency));
          display = currency;
        }
        prompt = (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("languages.clue.currency")}
            </span>
            <span className="text-3xl font-bold">{display}</span>
          </div>
        );
        distractors = sample(candidates, 3, random);
      }

      const options = shuffle([answer, ...distractors], random).map((c) => ({ id: c.cca3, label: countryName(c, locale) }));

      return {
        key: answer.cca3,
        prompt: <div className="flex min-h-32 items-center justify-center">{prompt}</div>,
        options,
        correctId: answer.cca3,
        accepted: countryAccepted(answer),
        answerLabel: countryName(answer, locale),
        factCountry: answer,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, roundCount, scope, locale, seed]);

  return (
    <QuizGame
      gameId="languages"
      rounds={rounds}
      mode="choice"
      difficulty={difficulty}
      timed={timed}
      practice={practice}
      challenge={challenge}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}
