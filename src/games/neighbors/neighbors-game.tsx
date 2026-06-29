"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, CornerDownLeft, Plus, Lightbulb, Globe2, Compass, Languages as LangIcon, Coins, Waves, Users, Maximize2 } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { FlagImage } from "@/components/flag-image";
import { getCountryByCca3, poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { pickQuestions } from "@/games/round-utils";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { scoreForTrivia } from "@/lib/scoring";
import { simplifyCurrency } from "@/lib/currency";
import { randomFact } from "@/lib/facts";
import { matchAnswer } from "@/lib/fuzzy";
import { sound } from "@/lib/sound";
import { sample, shuffle, formatNumber } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const PER_ROUND_BUDGET_MS = 15000;

interface Clue {
  icon: typeof Globe2;
  label: string;
  node: React.ReactNode;
}
interface Round {
  answer: Country;
  clues: Clue[];
  options: { id: string; label: string }[];
  accepted: string[];
}

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

  const rounds = useMemo<Round[]>(() => {
    const pool = poolForDifficulty(difficulty);
    const candidates = pool.filter((c) => c.region && (c.languages.length > 0 || c.currencies.length > 0));
    const count = roundCount === 0 ? candidates.length : roundCount;

    return pickQuestions(candidates, count).map((answer) => {
      const nbs = neighborsOf(answer);
      // Ordered from vague → revealing, so each extra clue helps more.
      const clues: Clue[] = [];
      clues.push({ icon: Globe2, label: t("neighbors.clue.region"), node: answer.region });
      clues.push({
        icon: Waves,
        label: t("neighbors.clue.coast"),
        node: answer.landlocked ? t("neighbors.clue.coastNo") : t("neighbors.clue.coastYes"),
      });
      if (answer.subregion) clues.push({ icon: Compass, label: t("neighbors.clue.subregion"), node: answer.subregion });
      if (answer.population > 0)
        clues.push({ icon: Users, label: t("neighbors.clue.population"), node: t("neighbors.clue.people", { n: roundPeople(answer.population) }) });
      if (answer.area > 0)
        clues.push({ icon: Maximize2, label: t("neighbors.clue.area"), node: t("neighbors.clue.km2", { n: formatNumber(Math.round(answer.area), locale) }) });
      if (answer.languages.length > 0)
        clues.push({ icon: LangIcon, label: t("neighbors.clue.language"), node: answer.languages.slice(0, 2).join(", ") });
      if (answer.currencies.length > 0)
        clues.push({ icon: Coins, label: t("neighbors.clue.currency"), node: simplifyCurrency(answer.currencies[0]) });
      if (nbs.length > 0)
        clues.push({
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

      const distractorPool =
        difficulty === "hard"
          ? pool.filter((c) => c.cca3 !== answer.cca3 && c.region === answer.region)
          : pool.filter((c) => c.cca3 !== answer.cca3);
      const distractors = sample(distractorPool.length >= 3 ? distractorPool : pool.filter((c) => c.cca3 !== answer.cca3), 3);
      const options = shuffle([answer, ...distractors]).map((c) => ({ id: c.cca3, label: countryName(c, locale) }));

      return { answer, clues, options, accepted: countryAccepted(answer) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const maxClues = round ? round.clues.length : 0;

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

  function commit(correct: boolean) {
    setAnswered(true);
    setLastCorrect(correct);
    if (correct) {
      sound.correct();
      const earned = scoreForTrivia(revealed, difficulty);
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

  // Timer
  useTimer(timed, budget, startRef, setTimeLeft, doFinish);

  if (!round) return null;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.neighbors.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 10000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-5">
        <div className="text-center text-lg font-bold">{t("neighbors.promptClues")}</div>
        <div className="mt-1 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <span>{t("trivia.clues", { n: Math.min(revealed, maxClues), max: maxClues })}</span>
          {!answered && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {t("trivia.worth", { pts: scoreForTrivia(revealed, difficulty) })}
            </span>
          )}
        </div>

        <div className="mt-4 flex-1 space-y-2">
          {round.clues.slice(0, revealed).map((clue, i) => {
            const Icon = clue.icon;
            return (
              <motion.div
                key={`${idx}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{clue.label}</div>
                  <div className="text-sm font-medium">{clue.node}</div>
                </div>
              </motion.div>
            );
          })}

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
                  {lastCorrect ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />}
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

function useTimer(
  timed: boolean,
  budget: number,
  startRef: React.MutableRefObject<number>,
  setTimeLeft: (n: number) => void,
  onTimeout: () => void
) {
  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => {
      const left = budget - (Date.now() - startRef.current);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        onTimeout();
      } else setTimeLeft(left);
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed]);
}
