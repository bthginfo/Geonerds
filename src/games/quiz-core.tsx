"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, ArrowRight, CornerDownLeft, Lightbulb } from "lucide-react";
import type { AnswerMode, Country, Difficulty, GameId } from "@/lib/types";
import type { PlayResult } from "@/components/game/game-shell";
import { useT } from "@/i18n/I18nProvider";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill, LivesPill, ProgressBar } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { scoreForAnswer } from "@/lib/scoring";
import { matchAnswer } from "@/lib/fuzzy";
import { randomFact } from "@/lib/facts";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const TIME_LIMIT_MS = 10000;
const MAX_LIVES = 3;

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizRound {
  key: string;
  prompt: React.ReactNode;
  /** Optional prompt shown once answered (e.g. the full flag with text restored). */
  revealPrompt?: React.ReactNode;
  options: QuizOption[];
  correctId: string;
  accepted: string[];
  answerLabel: string;
  /** Country to surface a learn-as-you-play fact about on a correct answer. */
  factCountry?: Country;
}

export function QuizGame({
  gameId,
  rounds,
  mode,
  difficulty,
  timed = false,
  practice = false,
  onFinish,
  onExit,
  typePlaceholderKey = "type.placeholder",
}: {
  gameId: GameId;
  rounds: QuizRound[];
  mode: AnswerMode;
  difficulty: Difficulty;
  timed?: boolean;
  practice?: boolean;
  onFinish: (r: PlayResult) => void;
  onExit: () => void;
  typePlaceholderKey?: string;
}) {
  const { t, locale } = useT();
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [gain, setGain] = useState<number | null>(null);
  const [fact, setFact] = useState<string | null>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timedOut, setTimedOut] = useState(false);

  const total = rounds.length;
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MS);

  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const gameOverRef = useRef(false);
  const finishedRef = useRef(false);
  const marksRef = useRef<boolean[]>([]);
  const hitsRef = useRef<string[]>([]);

  const round = rounds[idx];
  const inputRef = useRef<HTMLInputElement>(null);

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // Denominator = questions actually answered (a game over via lives ends the
    // run early, so reporting the full planned count would be misleading).
    const answered = marksRef.current.length;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: answered > 0 ? answered : total,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode,
      marks: marksRef.current,
      countryHits: hitsRef.current,
    });
  }

  // Per-question countdown (timed mode only). Running out of time costs a life.
  useEffect(() => {
    if (!timed || answered || gameOverRef.current) return;
    qStartRef.current = Date.now();
    setTimeLeft(TIME_LIMIT_MS);
    const id = setInterval(() => {
      const left = TIME_LIMIT_MS - (Date.now() - qStartRef.current);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        commit(false, true);
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, idx, answered]);

  function loseLife() {
    if (practice) return; // practice: never run out of lives
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    if (livesRef.current <= 0) gameOverRef.current = true;
  }

  function commit(correct: boolean, didTimeOut = false) {
    if (answered) return;
    const timeMs = Date.now() - qStartRef.current;
    const earned = scoreForAnswer({ correct, difficulty, timed, timeMs, timeLimitMs: TIME_LIMIT_MS });
    setAnswered(true);
    setLastCorrect(correct);
    setTimedOut(didTimeOut);
    marksRef.current.push(correct);
    if (correct) {
      // Record the country for the collection (factCountry, or correctId when it's a cca3).
      const cca3 = round.factCountry?.cca3 ?? (/^[A-Z]{3}$/.test(round.correctId) ? round.correctId : undefined);
      if (cca3) hitsRef.current.push(cca3);
    }
    scoreRef.current = Math.max(0, scoreRef.current + earned);
    setScore((s) => Math.max(0, s + earned));
    setGain(earned);
    if (correct) {
      sound.correct();
      correctRef.current += 1;
      setStreak((s) => {
        const ns = s + 1;
        bestRef.current = Math.max(bestRef.current, ns);
        return ns;
      });
      if (round.factCountry) setFact(randomFact(round.factCountry, locale));
    } else {
      sound.wrong();
      setStreak(0);
      loseLife();
    }
  }

  function next() {
    if (gameOverRef.current || idx + 1 >= total) {
      doFinish();
      return;
    }
    setIdx((i) => i + 1);
    setAnswered(false);
    setSelectedId(null);
    setTyped("");
    setHint(null);
    setGain(null);
    setFact(null);
    setTimedOut(false);
    qStartRef.current = Date.now();
  }

  function pickOption(id: string) {
    if (answered) return;
    setSelectedId(id);
    commit(id === round.correctId);
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

  // progress fraction 0..1
  const progress = (idx + (answered ? 1 : 0)) / total;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t(`games.${gameId}.name`)} onExit={onExit}>
        {!practice && <StreakPill value={streak} />}
        {!practice && <LivesPill lives={lives} max={MAX_LIVES} />}
        {!practice && <ScorePill value={score} />}
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 4000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>
      <div className="px-3 pt-2">
        <div className="mx-auto max-w-3xl">
          <ProgressBar value={progress} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={round.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22 }}
            className="flex flex-1 flex-col"
          >
            <div className="relative flex flex-1 items-center justify-center py-4">
              {answered && round.revealPrompt ? round.revealPrompt : round.prompt}
              <AnimatePresence>
                {gain != null && gain !== 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.8 }}
                    animate={{ opacity: 1, y: -28, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "pointer-events-none absolute right-2 top-2 rounded-full px-2.5 py-1 text-sm font-bold text-white",
                      gain > 0 ? "bg-success" : "bg-danger"
                    )}
                  >
                    {gain > 0 ? `+${gain}` : gain}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {mode === "choice" ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {round.options.map((o) => {
                  const isCorrect = o.id === round.correctId;
                  const isSelected = o.id === selectedId;
                  return (
                    <button
                      key={o.id}
                      disabled={answered}
                      onClick={() => pickOption(o.id)}
                      className={cn(
                        "flex min-h-12 items-center justify-center rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all active:scale-[0.98]",
                        !answered && "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                        answered && isCorrect && "border-success bg-success/15 text-success",
                        answered && isSelected && !isCorrect && "border-danger bg-danger/15 text-danger",
                        answered && !isCorrect && !isSelected && "border-border bg-card opacity-50"
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (answered ? next() : submitTyped())}
                    disabled={answered}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    placeholder={t(typePlaceholderKey)}
                    className="h-12 flex-1 rounded-xl border-2 border-border bg-card px-4 text-base outline-none focus:border-primary disabled:opacity-60"
                  />
                  {!answered && (
                    <Button size="lg" className="px-4" onClick={submitTyped} aria-label={t("type.submit")}>
                      <CornerDownLeft className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                {hint && !answered && (
                  <p className="mt-2 text-center text-sm font-medium text-warning">{hint}</p>
                )}
              </div>
            )}

            <div className="mt-4 min-h-14">
              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {lastCorrect ? (
                          <span className="flex items-center gap-1 text-success">
                            <Check className="h-5 w-5" /> {t("common.correct")}
                          </span>
                        ) : (
                          <span className="flex flex-col text-danger">
                            <span className="flex items-center gap-1">
                              <X className="h-5 w-5" /> {timedOut ? t("common.timeUp") : t("common.wrong")}
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {gameOverRef.current
                                ? t("common.gameOver")
                                : t("common.theAnswerWas", { answer: round.answerLabel })}
                            </span>
                          </span>
                        )}
                      </div>
                      <Button onClick={next} className="gap-1.5">
                        {gameOverRef.current || idx + 1 >= total ? t("common.continue") : t("common.next")}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {lastCorrect && fact && (
                      <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 p-2.5 text-xs">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>
                          <span className="font-semibold">{t("fact.learned")} </span>
                          {fact}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

