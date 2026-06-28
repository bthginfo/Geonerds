"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, ArrowRight, CornerDownLeft } from "lucide-react";
import type { AnswerMode, Difficulty, GameId } from "@/lib/types";
import type { PlayResult } from "@/components/game/game-shell";
import { useT } from "@/i18n/I18nProvider";
import { GameTopBar, ScorePill, StreakPill, RoundPill, ProgressBar } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { scoreForAnswer } from "@/lib/scoring";
import { matchAnswer } from "@/lib/fuzzy";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const TIME_LIMIT_MS = 10000;

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizRound {
  key: string;
  prompt: React.ReactNode;
  options: QuizOption[];
  correctId: string;
  accepted: string[];
  answerLabel: string;
}

export function QuizGame({
  gameId,
  rounds,
  mode,
  difficulty,
  onFinish,
  onExit,
  typePlaceholderKey = "type.placeholder",
}: {
  gameId: GameId;
  rounds: QuizRound[];
  mode: AnswerMode;
  difficulty: Difficulty;
  onFinish: (r: PlayResult) => void;
  onExit: () => void;
  typePlaceholderKey?: string;
}) {
  const { t } = useT();
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [gain, setGain] = useState<number | null>(null);

  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());

  const round = rounds[idx];
  const total = rounds.length;

  const inputRef = useRef<HTMLInputElement>(null);

  function commit(correct: boolean) {
    const timeMs = Date.now() - qStartRef.current;
    const earned = scoreForAnswer({ correct, difficulty, streak, timeMs, timeLimitMs: TIME_LIMIT_MS });
    setAnswered(true);
    setLastCorrect(correct);
    if (correct) {
      sound.correct();
      setScore((s) => s + earned);
      setGain(earned);
      setCorrectCount((c) => c + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
    } else {
      sound.wrong();
      setStreak(0);
    }
  }

  function next() {
    if (idx + 1 >= total) {
      onFinish({
        score,
        correct: correctCount,
        total,
        bestStreak,
        durationMs: Date.now() - startRef.current,
        mode,
      });
      return;
    }
    setIdx((i) => i + 1);
    setAnswered(false);
    setSelectedId(null);
    setTyped("");
    setHint(null);
    setGain(null);
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
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <RoundPill current={idx + 1} total={total} />
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
              {round.prompt}
              <AnimatePresence>
                {gain != null && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.8 }}
                    animate={{ opacity: 1, y: -28, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute right-2 top-2 rounded-full bg-success px-2.5 py-1 text-sm font-bold text-white"
                  >
                    +{gain}
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
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {lastCorrect ? (
                        <span className="flex items-center gap-1 text-success">
                          <Check className="h-5 w-5" /> {t("common.correct")}
                        </span>
                      ) : (
                        <span className="flex flex-col text-danger">
                          <span className="flex items-center gap-1">
                            <X className="h-5 w-5" /> {t("common.wrong")}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("common.theAnswerWas", { answer: round.answerLabel })}
                          </span>
                        </span>
                      )}
                    </div>
                    <Button onClick={next} className="gap-1.5">
                      {idx + 1 >= total ? t("common.continue") : t("common.next")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
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

