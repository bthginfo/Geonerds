"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, X, CornerDownLeft, Mountain, Flame } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { PinMap } from "@/components/map/pin-map";
import { Compass } from "@/components/map/compass";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill, LivesPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { PEAKS, PEAK_MAX_TIER, peakName, peakAccepted, type Peak } from "./peaks";
import { matchAnswer } from "@/lib/fuzzy";
import { scoreForAnswer } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { sample, shuffle, cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const TIME_LIMIT_MS = 12000;
const MAX_LIVES = 3;

export function MountainsGame({ difficulty, mode, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const peaks = useMemo<Peak[]>(() => {
    const pool = PEAKS.filter((p) => p.tier <= PEAK_MAX_TIER[difficulty]);
    const count = roundCount === 0 ? pool.length : roundCount;
    return sample(pool, Math.min(count, pool.length));
  }, [difficulty, roundCount]);

  const total = peaks.length;
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MS);

  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const gameOverRef = useRef(false);
  const finishedRef = useRef(false);

  const peak = peaks[idx];

  const options = useMemo(() => {
    if (mode !== "choice" || !peak) return [] as Peak[];
    const distractors = sample(PEAKS.filter((p) => p.en !== peak.en), 3);
    return shuffle([peak, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, mode]);

  // Per-question countdown (timed mode); running out costs a life.
  useEffect(() => {
    if (!timed || answered || gameOverRef.current) return;
    qStartRef.current = Date.now();
    setTimeLeft(TIME_LIMIT_MS);
    const id = setInterval(() => {
      const left = TIME_LIMIT_MS - (Date.now() - qStartRef.current);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        commit(false);
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, idx, answered]);

  if (!peak) return null;
  const peakLngLat = [peak.lng, peak.lat] as [number, number];

  function loseLife() {
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    if (livesRef.current <= 0) gameOverRef.current = true;
  }

  function commit(correct: boolean) {
    if (answered) return;
    const timeMs = Date.now() - qStartRef.current;
    const earned = scoreForAnswer({ correct, difficulty, timed, timeMs, timeLimitMs: TIME_LIMIT_MS });
    setAnswered(true);
    setLastCorrect(correct);
    scoreRef.current = Math.max(0, scoreRef.current + earned);
    setScore((s) => Math.max(0, s + earned));
    if (correct) {
      sound.correct();
      correctRef.current += 1;
      const ns = streak + 1;
      bestRef.current = Math.max(bestRef.current, ns);
      setStreak(ns);
    } else {
      sound.wrong();
      setStreak(0);
      loseLife();
    }
  }

  function pick(p: Peak) {
    if (answered) return;
    setSelected(p.en);
    commit(p.en === peak.en);
  }
  function submitTyped() {
    if (answered) return;
    const ok = matchAnswer(input, peakAccepted(peak)).status === "correct";
    if (!ok && matchAnswer(input, peakAccepted(peak)).status === "near") {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    commit(ok);
  }

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

  function next() {
    if (gameOverRef.current || idx + 1 >= total) {
      doFinish();
      return;
    }
    setIdx((i) => i + 1);
    setAnswered(false);
    setSelected(null);
    setInput("");
    setTimeLeft(TIME_LIMIT_MS);
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.mountains.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <LivesPill lives={lives} max={MAX_LIVES} />
        <ScorePill value={score} />
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 4000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-700/15 text-amber-700">
          {peak.kind === "volcano" ? <Flame className="h-4 w-4" /> : <Mountain className="h-4 w-4" />}
        </span>
        <div className="text-sm font-semibold">{t("mountains.whichPeak")}</div>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {peak.kind === "volcano" ? t("mountains.type.volcano") : t("mountains.type.mountain")}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-sky-50 dark:bg-slate-900/40">
        <PinMap onPin={() => {}} target={peakLngLat} locked resetSignal={0} />
        <Compass />
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-3">
        {answered ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
            <div className="flex flex-col text-sm font-semibold">
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
                    {gameOverRef.current ? t("common.gameOver") : t("common.theAnswerWas", { answer: peakName(peak, locale) })}
                  </span>
                </span>
              )}
            </div>
            <Button onClick={next} className="gap-1.5">
              {gameOverRef.current || idx + 1 >= total ? t("common.continue") : t("common.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : mode === "choice" ? (
          <div className="grid grid-cols-2 gap-2">
            {options.map((p) => (
              <button
                key={p.en}
                onClick={() => pick(p)}
                className={cn(
                  "rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
                  selected === p.en ? "border-primary" : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {peakName(p, locale)}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTyped()}
              autoFocus
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              placeholder={t("type.placeholder")}
              className={cn(
                "h-12 flex-1 rounded-xl border-2 bg-card px-4 text-base outline-none focus:border-primary",
                shake ? "animate-shake border-danger" : "border-border"
              )}
            />
            <Button size="lg" className="px-4" onClick={submitTyped} aria-label={t("type.submit")}>
              <CornerDownLeft className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
