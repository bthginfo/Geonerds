"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, CornerDownLeft, Plus, Lightbulb } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { pickQuestions } from "@/games/round-utils";
import { sample, shuffle } from "@/lib/utils";
import { triviaClues, randomFact } from "@/lib/facts";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { scoreForTrivia } from "@/lib/scoring";
import { matchAnswer } from "@/lib/fuzzy";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";

const MAX_CLUES = 4;
const PER_ROUND_BUDGET_MS = 15000;

interface TriviaRound {
  answer: Country;
  clues: string[];
  options: { id: string; label: string }[];
  accepted: string[];
}

export function TriviaGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const rounds = useMemo<TriviaRound[]>(() => {
    const pool = poolForDifficulty(difficulty);
    const count = roundCount === 0 ? pool.length : roundCount;
    return pickQuestions(pool, count).map((answer) => {
      // Cross-region distractors so the early clues (continent, hemisphere…) help.
      const distractors = sample(pool.filter((c) => c.cca3 !== answer.cca3), 3);
      const options = shuffle([answer, ...distractors]).map((c) => ({ id: c.cca3, label: countryName(c, locale) }));
      return {
        answer,
        clues: triviaClues(answer, locale).slice(0, MAX_CLUES),
        options,
        accepted: countryAccepted(answer),
      };
    });
  }, [difficulty, roundCount, locale]);

  const total = rounds.length;
  const budget = total * PER_ROUND_BUDGET_MS;

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(budget);

  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  const finishedRef = useRef(false);

  const round = rounds[idx];
  const maxClues = round ? Math.min(MAX_CLUES, round.clues.length) : MAX_CLUES;

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode,
    });
  }

  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => {
      const left = budget - (Date.now() - startRef.current);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        doFinish();
      } else {
        setTimeLeft(left);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed]);

  function commit(correct: boolean) {
    setAnswered(true);
    setLastCorrect(correct);
    if (correct) {
      sound.correct();
      const earned = scoreForTrivia(revealed, difficulty, streak);
      scoreRef.current += earned;
      setScore((s) => s + earned);
      correctRef.current += 1;
      setStreak((s) => {
        const ns = s + 1;
        bestRef.current = Math.max(bestRef.current, ns);
        return ns;
      });
    } else {
      sound.wrong();
      setStreak(0);
    }
  }

  function pickOption(id: string) {
    if (answered) return;
    commit(id === round.answer.cca3);
  }

  function submitTyped() {
    if (answered) return;
    const res = matchAnswer(typed, round.accepted);
    if (res.status === "near" && res.suggestion) {
      setHint(t("type.almost", { guess: res.suggestion }));
      return;
    }
    commit(res.status === "correct");
  }

  function next() {
    if (idx + 1 >= total) {
      doFinish();
      return;
    }
    setIdx((i) => i + 1);
    setRevealed(1);
    setAnswered(false);
    setTyped("");
    setHint(null);
  }

  if (!round) return null;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.trivia.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 10000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-5">
        <div className="text-center text-lg font-bold">{t("trivia.prompt")}</div>
        <div className="mt-1 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <span>{t("trivia.clues", { n: Math.min(revealed, maxClues), max: maxClues })}</span>
          {!answered && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {t("trivia.worth", { pts: scoreForTrivia(revealed, difficulty, streak) })}
            </span>
          )}
        </div>

        <div className="mt-4 flex-1 space-y-2">
          {round.clues.slice(0, revealed).map((clue, i) => (
            <motion.div
              key={`${idx}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              {clue}
            </motion.div>
          ))}

          {!answered && revealed < maxClues && (
            <Button variant="outline" className="w-full gap-2" onClick={() => setRevealed((r) => r + 1)}>
              <Plus className="h-4 w-4" />
              {t("trivia.reveal")}
            </Button>
          )}

          {answered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3"
            >
              <FlagImage code={round.answer.flag} alt="" className="aspect-[4/3] w-12 shadow" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold">
                  {lastCorrect ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <X className="h-4 w-4 text-danger" />
                  )}
                  {countryName(round.answer, locale)}
                </div>
                <div className="flex items-start gap-1 text-xs text-muted-foreground">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  {randomFact(round.answer, locale)}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-4">
          {answered ? (
            <Button className="w-full gap-1.5" onClick={next}>
              {idx + 1 >= total ? t("common.continue") : t("common.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : mode === "choice" ? (
            <div className="grid grid-cols-2 gap-2.5">
              {round.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => pickOption(o.id)}
                  className="flex min-h-12 items-center justify-center rounded-xl border-2 border-border bg-card px-3 py-2.5 text-center text-sm font-semibold transition-all hover:border-primary/50 hover:bg-muted/50 active:scale-[0.98]"
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitTyped()}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  placeholder={t("type.placeholder")}
                  className="h-12 flex-1 rounded-xl border-2 border-border bg-card px-4 text-base outline-none focus:border-primary"
                />
                <Button size="lg" className="px-4" onClick={submitTyped} aria-label={t("type.submit")}>
                  <CornerDownLeft className="h-5 w-5" />
                </Button>
              </div>
              {hint && <p className="mt-2 text-center text-sm font-medium text-warning">{hint}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
