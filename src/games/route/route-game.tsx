"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CornerDownLeft, Lightbulb } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { WorldMap } from "@/components/map/world-map";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, RoundPill } from "@/components/game/hud";
import { Compass } from "@/components/map/compass";
import { Button } from "@/components/ui/button";
import { COUNTRIES, poolForDifficulty, countryName, getCountryByCcn3 } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { pickRoutePair, ccn3Neighbors, distancesFrom } from "./graph";
import { matchAnswer } from "@/lib/fuzzy";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { sample, shuffle, cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const NO_FLAG = () => undefined;
const STEP_POINTS = 60;
const WRONG_PENALTY = 15;

interface RouteRound {
  a: Country;
  b: Country;
  optimal: number;
  dist: Map<string, number>;
}

export function RouteGame({ difficulty, mode, roundCount, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const rounds = useMemo<RouteRound[]>(() => {
    const pool = poolForDifficulty(difficulty);
    const [min, max] = difficulty === "easy" ? [2, 3] : difficulty === "hard" ? [3, 6] : [2, 4];
    const count = roundCount === 0 ? 10 : roundCount;
    const out: RouteRound[] = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 8) {
      const pair = pickRoutePair(pool, min, max);
      if (pair && !out.some((p) => p.a.cca3 === pair.a.cca3 && p.b.cca3 === pair.b.cca3)) {
        out.push({ ...pair, dist: distancesFrom(String(pair.b.ccn3)) });
      }
    }
    return out;
  }, [difficulty, roundCount]);

  const total = rounds.length;
  const [idx, setIdx] = useState(0);
  const [path, setPath] = useState<string[]>(() => (rounds[0] ? [String(rounds[0].a.ccn3)] : []));
  const [done, setDone] = useState(false);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const attemptsRef = useRef(0);
  const bestRef = useRef(0);
  const finishedRef = useRef(false);

  const round = rounds[idx];
  const bId = round ? String(round.b.ccn3) : "";
  const current = path[path.length - 1];
  const curDist = round ? round.dist.get(current) ?? 0 : 0;

  // Progressing neighbours (one step closer to the destination).
  const nextSteps = useMemo(() => {
    if (!round) return [] as string[];
    return [...ccn3Neighbors(current)].filter((n) => !path.includes(n) && (round.dist.get(n) ?? 99) === curDist - 1);
  }, [round, current, path, curDist]);

  const options = useMemo(() => {
    if (mode !== "choice" || done || !round) return [] as string[];
    const correct = nextSteps.slice(0, 2);
    const pool = COUNTRIES.filter(
      (c) => c.ccn3 && String(c.ccn3) !== current && !correct.includes(String(c.ccn3)) && !path.includes(String(c.ccn3))
    ).map((c) => String(c.ccn3));
    const distractors = sample(pool, Math.max(0, 5 - correct.length));
    return shuffle([...correct, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, done, idx, current]);

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: Math.max(attemptsRef.current, correctRef.current),
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode,
    });
  }

  function advance(ccn3: string) {
    sound.correct();
    attemptsRef.current += 1;
    correctRef.current += 1;
    const earned = Math.round(STEP_POINTS * DIFFICULTY_MULTIPLIER[difficulty]);
    scoreRef.current += earned;
    setScore((s) => s + earned);
    const ns = streak + 1;
    bestRef.current = Math.max(bestRef.current, ns);
    setStreak(ns);
    const np = [...path, ccn3];
    setPath(np);
    if (ccn3 === bId) setDone(true);
  }

  function wrong() {
    sound.wrong();
    attemptsRef.current += 1;
    setStreak(0);
    scoreRef.current = Math.max(0, scoreRef.current - WRONG_PENALTY);
    setScore((s) => Math.max(0, s - WRONG_PENALTY));
  }

  function pickStep(ccn3: string) {
    if (done) return;
    if (nextSteps.includes(ccn3)) advance(ccn3);
    else {
      wrong();
      setFlash(ccn3);
      setTimeout(() => setFlash((f) => (f === ccn3 ? null : f)), 400);
    }
  }

  function submitTyped() {
    if (done) return;
    const hit = nextSteps.find((n) => {
      const c = getCountryByCcn3(n);
      return c && matchAnswer(input, countryAccepted(c)).status === "correct";
    });
    setInput("");
    if (hit) advance(hit);
    else {
      wrong();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }

  function hint() {
    if (done || nextSteps.length === 0) return;
    // Reveal a correct next step without points (so you never get stuck).
    sound.tick();
    setStreak(0);
    const np = [...path, nextSteps[0]];
    setPath(np);
    if (nextSteps[0] === bId) setDone(true);
  }

  function next() {
    if (idx + 1 >= total) {
      doFinish();
      return;
    }
    const ni = idx + 1;
    setIdx(ni);
    setPath([String(rounds[ni].a.ccn3)]);
    setDone(false);
    setInput("");
  }

  function getFill(ccn3: string): string | undefined {
    if (ccn3 === String(round.a.ccn3)) return "fill-blue-500/85";
    if (ccn3 === bId) return done ? "fill-green-500/80" : "fill-amber-500/85";
    if (ccn3 === current) return "fill-emerald-600/90";
    if (path.includes(ccn3)) return "fill-emerald-500/60";
    return "fill-muted-foreground/20";
  }

  if (!round) return null;
  const visibleSet = new Set([...path, bId]);
  const currentCountry = getCountryByCcn3(current)!;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.route.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <RoundPill current={idx + 1} total={total} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2.5 text-sm">
        <FlagImage code={round.a.flag} alt="" className="aspect-[4/3] w-7 shrink-0" />
        <span className="truncate font-bold">{countryName(round.a, locale)}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <FlagImage code={round.b.flag} alt="" className="aspect-[4/3] w-7 shrink-0" />
        <span className="truncate font-bold">{countryName(round.b, locale)}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t("route.steps", { n: path.length - 1 })}</span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-sky-50 dark:bg-slate-900/40">
        <WorldMap
          onPick={() => {}}
          found={new Set()}
          flashCcn3={flash}
          flashOk={false}
          flagByCcn3={NO_FLAG}
          getFill={getFill}
          visibleSet={visibleSet}
        />
        <Compass />
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-3">
        {done ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-success">
              <Check className="h-5 w-5" />
              {t("route.reached")}
            </span>
            <span className="text-sm text-muted-foreground">{t("route.optimal", { n: round.optimal })}</span>
            <Button className="ml-auto gap-1.5" onClick={next}>
              {idx + 1 >= total ? t("common.continue") : t("common.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2 text-sm">
              <FlagImage code={currentCountry.flag} alt="" className="aspect-[4/3] w-6 shrink-0" />
              <span className="text-muted-foreground">
                {t("route.from", { from: countryName(currentCountry, locale), to: countryName(round.b, locale) })}
              </span>
            </div>
            {mode === "choice" ? (
              <div className="grid grid-cols-2 gap-2">
                {options.map((ccn3) => {
                  const c = getCountryByCcn3(ccn3)!;
                  const isFlash = flash === ccn3;
                  return (
                    <button
                      key={ccn3}
                      onClick={() => pickStep(ccn3)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all active:scale-[0.98]",
                        isFlash ? "animate-shake border-danger bg-danger/15" : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <FlagImage code={c.flag} alt="" className="aspect-[4/3] w-6 shrink-0" rounded={false} />
                      <span className="truncate">{countryName(c, locale)}</span>
                    </button>
                  );
                })}
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
            <button onClick={hint} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              {t("route.hint")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
