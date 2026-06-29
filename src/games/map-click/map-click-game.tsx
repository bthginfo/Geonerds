"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, SkipForward } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { WorldMap, type MapDot } from "@/components/map/world-map";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill } from "@/components/game/hud";
import { Compass } from "@/components/map/compass";
import { COUNTRIES, poolForDifficulty, countryName } from "@/data/countries";
import { pickQuestions } from "@/games/round-utils";
import { featuresByCcn3 } from "@/lib/geo";
import { scoreForAnswer } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

const DOT_THRESHOLD_KM2 = 25_000;
const MAX_WRONG = 3;
const WRONG_PENALTY = 25;
const TIME_PER_TARGET_MS = 12_000;

const flagByCcn3Map = new Map(COUNTRIES.filter((c) => c.ccn3).map((c) => [String(c.ccn3), c.flag]));

// Tiny states rendered as clickable dots so they're findable.
const DOTS: MapDot[] = COUNTRIES.filter(
  (c) => c.ccn3 && c.latlng && c.area > 0 && c.area < DOT_THRESHOLD_KM2
).map((c) => ({ ccn3: String(c.ccn3), lat: c.latlng![0], lng: c.latlng![1], flag: c.flag }));
const DOT_SET = new Set(DOTS.map((d) => d.ccn3));

export function MapClickGame({ difficulty, roundCount, timed, variant, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [ready, setReady] = useState(false);
  const [targets, setTargets] = useState<Country[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<{ ccn3: string; ok: boolean } | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());
  const wrongRef = useRef(false);
  const lockRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const bestRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    featuresByCcn3("50m").then((feats) => {
      const base = !variant || variant === "world" ? poolForDifficulty(difficulty) : COUNTRIES.filter((c) => c.region === variant);
      const pool = base.filter(
        (c) => c.ccn3 && (feats.has(String(c.ccn3)) || DOT_SET.has(String(c.ccn3)))
      );
      const count = roundCount === 0 ? pool.length : roundCount;
      const picked = pickQuestions(pool, count);
      setTargets(picked);
      setTimeLeft(picked.length * TIME_PER_TARGET_MS);
      setReady(true);
    });
  }, [difficulty, roundCount, variant]);

  const target = targets[idx];

  // Optional overall countdown.
  useEffect(() => {
    if (!timed || !ready) return;
    const budget = targets.length * TIME_PER_TARGET_MS;
    const id = setInterval(() => {
      const left = budget - (Date.now() - startRef.current);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        finishGame();
      } else {
        setTimeLeft(left);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, ready]);

  function finishGame() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: answeredRef.current > 0 ? answeredRef.current : targets.length,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode: "map",
    });
  }

  function advance() {
    if (idx + 1 >= targets.length) {
      finishGame();
      return;
    }
    setIdx((i) => i + 1);
    setWrongCount(0);
    wrongRef.current = false;
    qStartRef.current = Date.now();
    lockRef.current = false;
  }

  function reveal(ccn3: string, ok: boolean, delay: number) {
    answeredRef.current += 1;
    setFlash({ ccn3, ok });
    setFound((f) => new Set(f).add(ccn3));
    setTimeout(() => {
      setFlash(null);
      advance();
    }, delay);
  }

  function skip() {
    if (lockRef.current || !target) return;
    lockRef.current = true;
    sound.wrong();
    setStreak(0);
    reveal(String(target.ccn3), false, 750);
  }

  function handlePick(ccn3: string) {
    if (lockRef.current || !target) return;
    if (ccn3 === String(target.ccn3)) {
      lockRef.current = true;
      sound.correct();
      const timeMs = Date.now() - qStartRef.current;
      const earned = scoreForAnswer({ correct: true, difficulty, timed, timeMs, timeLimitMs: TIME_PER_TARGET_MS });
      scoreRef.current += earned;
      setScore((s) => s + earned);
      correctRef.current += 1;
      const ns = streak + 1;
      bestRef.current = Math.max(bestRef.current, ns);
      setStreak(ns);
      reveal(ccn3, true, 650);
    } else {
      sound.wrong();
      setStreak(0);
      wrongRef.current = true;
      scoreRef.current = Math.max(0, scoreRef.current - WRONG_PENALTY);
      setScore((s) => Math.max(0, s - WRONG_PENALTY));
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      setFlash({ ccn3, ok: false });
      setTimeout(() => setFlash((cur) => (cur?.ccn3 === ccn3 ? null : cur)), 450);
      if (nextWrong >= MAX_WRONG) {
        lockRef.current = true;
        setTimeout(() => reveal(String(target.ccn3), false, 750), 250);
      }
    }
  }

  if (!ready || !target) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.map-click.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 10000} /> : <RoundPill current={idx + 1} total={targets.length} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <FlagImage code={target.flag} alt="" hideText className="aspect-[4/3] w-12 shadow" />
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("mapclick.found", { count: found.size, total: targets.length })} ·{" "}
            {t("mapclick.triesLeft", { n: MAX_WRONG - wrongCount })}
          </div>
          <div className="text-lg font-bold leading-snug">
            {t("mapclick.prompt", { country: countryName(target, locale) })}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={t("mapclick.skip")} onClick={skip}>
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("mapclick.reset")}
            onClick={() => setResetSignal((s) => s + 1)}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-sky-50 dark:bg-slate-900/40">
        <WorldMap
          onPick={handlePick}
          found={found}
          flashCcn3={flash?.ccn3 ?? null}
          flashOk={flash?.ok}
          flagByCcn3={(ccn3) => flagByCcn3Map.get(ccn3)}
          dots={DOTS}
          resetSignal={resetSignal}
        />
        <Compass />
      </div>
    </div>
  );
}
