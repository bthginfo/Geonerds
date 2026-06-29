"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill, LivesPill } from "@/components/game/hud";
import { generateQuestion, type GnQuestion } from "./questions";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

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

  const startRef = useRef(Date.now());
  const bestRef = useRef(0);
  const lockRef = useRef(false);

  function pick(idx: number) {
    if (lockRef.current || answered) return;
    lockRef.current = true;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === q.correctIndex;
    let livesLeft = lives;
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
      livesLeft = lives - 1;
      setLives(livesLeft);
    }

    setTimeout(() => {
      if (livesLeft <= 0) {
        onFinish({
          score: score + (isCorrect ? q.points : 0),
          correct: correct + (isCorrect ? 1 : 0),
          total: round + 1,
          bestStreak: bestRef.current,
          durationMs: Date.now() - startRef.current,
          mode: "survival",
        });
        return;
      }
      const nr = round + 1;
      setRound(nr);
      setQ(generateQuestion(nr, locale));
      setAnswered(false);
      setSelected(null);
      lockRef.current = false;
    }, 1300);
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
                return (
                  <button
                    key={i}
                    disabled={answered}
                    onClick={() => pick(i)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98]",
                      !answered && "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                      answered && isCorrect && "border-success bg-success/15 text-success",
                      answered && isSelected && !isCorrect && "border-danger bg-danger/15 text-danger",
                      answered && !isCorrect && !isSelected && "border-border bg-card opacity-50"
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{o}</span>
                    {answered && isCorrect && <Check className="h-5 w-5 text-success" />}
                    {answered && isSelected && !isCorrect && <X className="h-5 w-5 text-danger" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
