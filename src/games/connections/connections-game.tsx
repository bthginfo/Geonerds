"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Coins, Languages, Loader2, Map, Network, RefreshCw, Shield } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, LivesPill, ProgressBar, ScorePill, StreakPill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { COUNTRIES, countryName } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { sound } from "@/lib/sound";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { buildConnectionPuzzle, type ConnectionRelation } from "./generator";

const RELATION_ICON = {
  border: Map,
  language: Languages,
  currency: Coins,
  subregion: Network,
} satisfies Record<ConnectionRelation, typeof Map>;

export function ConnectionsGame({ difficulty, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [generation, setGeneration] = useState(0);
  const puzzle = useMemo(() => {
    void generation; // explicit regeneration token for a fresh random chain
    return buildConnectionPuzzle(COUNTRIES, difficulty);
  }, [difficulty, generation]);
  const [stepIndex, setStepIndex] = useState(0);
  const [chain, setChain] = useState(() => (puzzle ? [puzzle.start] : []));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (puzzle) setChain([puzzle.start]);
  }, [puzzle]);

  function regenerate() {
    setGeneration((value) => value + 1);
    setStepIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setEnergy(3);
    setWrong(new Set());
    setFeedback(null);
    setLocked(false);
    startRef.current = Date.now();
  }

  if (!puzzle) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="max-w-sm text-sm text-muted-foreground">{t("connections.generationError")}</p>
        <Button variant="outline" className="gap-2" onClick={regenerate}>
          <RefreshCw className="h-4 w-4" /> {t("connections.newChain")}
        </Button>
      </div>
    );
  }

  const step = puzzle.steps[stepIndex];
  const RelationIcon = RELATION_ICON[step.relation];

  function finish(nextScore: number, completed: number, hits = chain.slice(1).map((country) => country.cca3), runBest = bestStreak) {
    onFinish({
      score: nextScore,
      correct: completed,
      total: puzzle!.steps.length,
      bestStreak: runBest,
      durationMs: Date.now() - startRef.current,
      mode: "connections",
      countryHits: hits,
    });
  }

  function choose(candidateCode: string) {
    if (locked || wrong.has(candidateCode)) return;
    const candidate = step.candidates.find((country) => country.cca3 === candidateCode);
    if (!candidate) return;

    if (candidate.cca3 !== step.answer.cca3) {
      sound.wrong();
      haptic.error();
      setWrong((current) => new Set(current).add(candidate.cca3));
      setFeedback(t("connections.wrong", { country: countryName(candidate, locale) }));
      setStreak(0);
      if (!practice) {
        const nextEnergy = energy - 1;
        setEnergy(nextEnergy);
        if (nextEnergy <= 0) {
          setLocked(true);
          window.setTimeout(() => finish(score, stepIndex), 700);
        }
      }
      return;
    }

    setLocked(true);
    sound.correct();
    haptic.success();
    const nextStreak = streak + 1;
    const nextBest = Math.max(bestStreak, nextStreak);
    const earned = practice ? 0 : 120 + nextStreak * 20 + (difficulty === "hard" ? 60 : difficulty === "medium" ? 30 : 0);
    const nextScore = score + earned;
    const nextChain = [...chain, candidate];
    setChain(nextChain);
    setScore(nextScore);
    setStreak(nextStreak);
    setBestStreak(nextBest);
    setFeedback(t(`connections.correct.${step.relation}`, { value: step.evidence }));

    window.setTimeout(() => {
      if (stepIndex + 1 >= puzzle!.steps.length) {
        finish(nextScore, puzzle!.steps.length, nextChain.slice(1).map((country) => country.cca3), nextBest);
        return;
      }
      setStepIndex((index) => index + 1);
      setWrong(new Set());
      setFeedback(null);
      setLocked(false);
    }, 850);
  }

  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t("games.connections.name")} onExit={onExit} compactMobileTitle>
        {!practice && <LivesPill lives={energy} max={3} />}
        <StreakPill value={streak} />
        <ScorePill value={score} />
      </GameTopBar>
      <ProgressBar value={stepIndex / puzzle.steps.length} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5 sm:py-7">
        <div className="mb-5 overflow-x-auto pb-2" aria-label={t("connections.chainLabel")}>
          <div className="flex min-w-max items-center gap-2 px-1">
            {chain.map((country, index) => (
              <motion.div
                key={country.cca3}
                initial={index ? { opacity: 0, scale: 0.5, x: -24 } : false}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className="relative flex items-center"
              >
                {index > 0 && <span className="mr-2 h-0.5 w-6 bg-gradient-to-r from-primary via-primary to-accent shadow-[0_0_8px_rgba(59,130,246,.45)] lg:w-10" />}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/30 bg-card shadow-[0_6px_18px_rgba(15,23,42,.12)] lg:h-16 lg:w-16">
                    <FlagImage code={country.flag} alt="" hideText className="aspect-[4/3] w-9 shadow-sm lg:w-11" />
                  </div>
                  <span className="hidden max-w-24 truncate text-[11px] font-bold text-muted-foreground lg:block">
                    {countryName(country, locale)}
                  </span>
                </div>
              </motion.div>
            ))}
            <div className="ml-1 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
              <Network className="h-5 w-5 animate-pulse text-primary/70" />
            </div>
          </div>
        </div>

        <motion.section
          key={stepIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-5 shadow-xl shadow-primary/5"
        >
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full border border-primary/10 shadow-[0_0_0_24px_rgba(59,130,246,.03),0_0_0_48px_rgba(16,185,129,.03)]" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <RelationIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("connections.step", { current: stepIndex + 1, total: puzzle.steps.length })}
              </p>
              <h1 className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">
                {t(`connections.relation.${step.relation}`)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("connections.from", { country: countryName(step.anchor, locale) })}
              </p>
            </div>
          </div>
        </motion.section>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {step.candidates.map((candidate, index) => {
            const isWrong = wrong.has(candidate.cca3);
            const isCorrect = locked && candidate.cca3 === step.answer.cca3;
            return (
              <motion.button
                key={`${stepIndex}-${candidate.cca3}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isWrong ? 0.46 : 1, y: 0 }}
                transition={{ delay: index * 0.045 }}
                whileTap={{ scale: 0.98 }}
                disabled={locked || isWrong}
                onClick={() => choose(candidate.cca3)}
                className={cn(
                  "flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCorrect ? "border-success bg-success/10" : isWrong ? "animate-shake border-danger/50" : "border-border hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <FlagImage code={candidate.flag} alt="" hideText className="aspect-[4/3] w-11 shrink-0 shadow" />
                <span className="font-bold">{countryName(candidate, locale)}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 min-h-12" aria-live="polite">
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div
                key={feedback}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold",
                  locked ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"
                )}
              >
                <Shield className="h-4 w-4 shrink-0" /> {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
