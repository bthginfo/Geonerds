"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Scissors, SkipForward, ArrowRight, Lightbulb } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill, LivesPill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { generateQuestion, type GnQuestion } from "./questions";
import { getCountryByCca3, countryName } from "@/data/countries";
import { randomFact } from "@/lib/facts";
import { sound } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { cn, sample } from "@/lib/utils";

const MAX_LIVES = 3;

export function GeoNerdGame({ onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [round, setRound] = useState(0);
  const [q, setQ] = useState<GnQuestion>(() => generateQuestion(0, locale));
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const [usedFifty, setUsedFifty] = useState(false);
  const [usedSkip, setUsedSkip] = useState(false);
  const [fact, setFact] = useState<string | null>(null);

  const startRef = useRef(Date.now());
  const bestRef = useRef(0);
  const lockRef = useRef(false);

  function goNext(nr: number) {
    setRound(nr);
    setQ(generateQuestion(nr, locale));
    setAnswered(false);
    setSelected(null);
    setRemoved([]);
    setFact(null);
    lockRef.current = false;
  }

  function useFifty() {
    if (usedFifty || answered) return;
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex);
    setRemoved(sample(wrong, Math.max(0, wrong.length - 1))); // keep one wrong + the correct
    setUsedFifty(true);
    sound.tick?.();
  }

  function useSkip() {
    if (usedSkip || answered || lockRef.current) return;
    setUsedSkip(true);
    sound.tick?.();
    goNext(round + 1);
  }

  function pick(idx: number) {
    if (lockRef.current || answered) return;
    lockRef.current = true;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === q.correctIndex;
    if (isCorrect) {
      sound.correct();
      setScore((s) => s + q.points);
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const ns = s + 1;
        bestRef.current = Math.max(bestRef.current, ns);
        return ns;
      });
    } else {
      sound.wrong();
      setStreak(0);
      setLives((l) => l - 1);
    }
    // Show a fun fact about the country in question (if we have one).
    const fc = q.factCca3 ? getCountryByCca3(q.factCca3) : null;
    setFact(fc ? randomFact(fc, locale) : null);
  }

  const gameOver = answered && lives <= 0;
  const factCountry = answered && q.factCca3 ? getCountryByCca3(q.factCca3) : null;

  function proceed() {
    if (gameOver) {
      onFinish({
        score,
        correct,
        total: round + 1,
        bestStreak: bestRef.current,
        durationMs: Date.now() - startRef.current,
        mode: "survival",
      });
      return;
    }
    goNext(round + 1);
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.millionaire.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <LivesPill lives={lives} max={MAX_LIVES} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-5">
        <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("gn.question", { n: round + 1 })} · {q.points} {t("common.points")}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22 }}
            className="flex flex-1 flex-col"
          >
            <div className="flex flex-1 items-center justify-center py-4">
              <h2 className="text-balance text-center text-2xl font-bold">{q.text}</h2>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {q.options.map((o, i) => {
                const isCorrect = i === q.correctIndex;
                const isSelected = i === selected;
                const hidden = !answered && removed.includes(i);
                return (
                  <button
                    key={i}
                    disabled={answered || hidden}
                    onClick={() => pick(i)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98]",
                      hidden && "pointer-events-none opacity-30",
                      !answered && !hidden && "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                      answered && isCorrect && "border-success bg-success/15 text-success",
                      answered && isSelected && !isCorrect && "border-danger bg-danger/15 text-danger",
                      answered && !isCorrect && !isSelected && "border-border bg-card opacity-50",
                      !answered && hidden && "border-border bg-card"
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{hidden ? "" : o}</span>
                    {answered && isCorrect && <Check className="h-5 w-5 text-success" />}
                    {answered && isSelected && !isCorrect && <X className="h-5 w-5 text-danger" />}
                  </button>
                );
              })}
            </div>

            {/* Lifelines (before answering) */}
            {!answered && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={useFifty}
                  disabled={usedFifty}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                    usedFifty
                      ? "border-border bg-muted/40 text-muted-foreground opacity-50"
                      : "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
                  )}
                >
                  <Scissors className="h-4 w-4" />
                  {t("gn.fifty")}
                </button>
                <button
                  onClick={useSkip}
                  disabled={usedSkip}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                    usedSkip
                      ? "border-border bg-muted/40 text-muted-foreground opacity-50"
                      : "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
                  )}
                >
                  <SkipForward className="h-4 w-4" />
                  {t("gn.skip")}
                </button>
              </div>
            )}

            {/* Fun fact + continue (after answering) */}
            {answered && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col gap-3">
                {factCountry && fact && (
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left">
                    <FlagImage code={factCountry.flag} alt="" className="aspect-[4/3] w-10 shrink-0 shadow" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{countryName(factCountry, locale)}</div>
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        {fact}
                      </div>
                    </div>
                  </div>
                )}
                <Button className="w-full gap-1.5" onClick={proceed}>
                  {gameOver ? t("common.continue") : t("common.next")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
