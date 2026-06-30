"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CornerDownLeft, Eye, HelpCircle } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { poolForDifficulty, getCountryByCca3, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { generateThemes } from "./themes";
import { matchAnswer } from "@/lib/fuzzy";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { sample, shuffle, cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const STEP_POINTS = 40;
const WRONG_PENALTY = 20;
const PER_THEME_MS = 25000;

export function NameAllGame({ difficulty, mode, roundCount, timed, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const clickMode = (mode ?? "choice") === "choice";

  const themes = useMemo(() => {
    const count = roundCount === 0 ? 8 : roundCount;
    return generateThemes(difficulty, locale, count, clickMode ? "choice" : "type");
  }, [difficulty, roundCount, locale, clickMode]);

  const total = themes.length;
  const budget = total * PER_THEME_MS;
  const [timeLeft, setTimeLeft] = useState(budget);
  const [idx, setIdx] = useState(0);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const totalTargetsRef = useRef(themes.reduce((s, th) => s + th.targets.length, 0));
  const bestRef = useRef(0);
  const finishedRef = useRef(false);
  const hitsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => {
      const left = budget - (Date.now() - startRef.current);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        doFinish();
      } else setTimeLeft(left);
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed]);

  const theme = themes[idx];
  const targetSet = useMemo(() => new Set(theme?.targets ?? []), [theme]);

  // Click-mode chips: targets mixed with plausible distractors.
  const chips = useMemo(() => {
    if (!clickMode || !theme) return [] as string[];
    const pool = poolForDifficulty(difficulty).map((c) => c.cca3);
    const distractors = sample(
      pool.filter((c) => !targetSet.has(c)),
      Math.min(10, Math.max(6, theme.targets.length))
    );
    return shuffle([...theme.targets, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickMode, idx, difficulty]);

  if (!theme) return null;
  const remaining = theme.targets.length - found.size;

  function award() {
    const earned = Math.round(STEP_POINTS * DIFFICULTY_MULTIPLIER[difficulty]);
    scoreRef.current += earned;
    setScore((s) => s + earned);
    correctRef.current += 1;
    const ns = streak + 1;
    bestRef.current = Math.max(bestRef.current, ns);
    setStreak(ns);
  }
  function penalize() {
    setStreak(0);
    scoreRef.current = Math.max(0, scoreRef.current - WRONG_PENALTY);
    setScore((s) => Math.max(0, s - WRONG_PENALTY));
  }

  function addFound(cca3: string) {
    sound.correct();
    award();
    hitsRef.current.push(cca3);
    setFound((f) => new Set(f).add(cca3));
  }

  function pickChip(cca3: string) {
    if (revealed || found.has(cca3)) return;
    if (targetSet.has(cca3)) {
      addFound(cca3);
    } else {
      sound.wrong();
      penalize();
      setFlash(cca3);
      setTimeout(() => setFlash((x) => (x === cca3 ? null : x)), 400);
    }
  }

  function submitTyped() {
    if (revealed) return;
    const hit = theme.targets.find((code) => {
      if (found.has(code)) return false;
      const c = getCountryByCca3(code);
      return c && matchAnswer(input, countryAccepted(c)).status === "correct";
    });
    setInput("");
    if (hit) addFound(hit);
    else {
      sound.wrong();
      penalize();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: totalTargetsRef.current,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode: clickMode ? "choice" : "type",
      countryHits: hitsRef.current,
    });
  }

  function next() {
    if (idx + 1 >= total) {
      doFinish();
      return;
    }
    setIdx((i) => i + 1);
    setFound(new Set());
    setRevealed(false);
    setInput("");
  }

  const complete = found.size === theme.targets.length;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.nameall.name")} onExit={onExit}>
        {!practice && <StreakPill value={streak} />}
        {!practice && <ScorePill value={score} />}
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 10000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
        <div className="text-center">
          <div className="text-lg font-bold leading-snug">{theme.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {t("nameall.progress", { found: found.size, total: theme.targets.length })}
          </div>
        </div>

        {/* Found / target slots */}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {theme.targets.map((code) => {
            const c = getCountryByCca3(code)!;
            const isFound = found.has(code);
            const show = isFound || revealed;
            return (
              <span
                key={code}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                  isFound
                    ? "border-success/40 bg-success/10 text-foreground"
                    : revealed
                    ? "border-danger/30 bg-danger/5 text-muted-foreground"
                    : "border-dashed border-border bg-muted/40 text-transparent"
                )}
              >
                {show ? (
                  <>
                    <FlagImage code={c.flag} alt="" className="aspect-[4/3] w-4" rounded={false} />
                    {countryName(c, locale)}
                  </>
                ) : (
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </span>
            );
          })}
        </div>

        <div className="mt-5">
          {clickMode ? (
            <div className="flex flex-wrap justify-center gap-2">
              {chips.map((code) => {
                const c = getCountryByCca3(code)!;
                const isFound = found.has(code);
                const isFlash = flash === code;
                return (
                  <button
                    key={code}
                    onClick={() => pickChip(code)}
                    disabled={isFound || revealed}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all active:scale-95",
                      isFound
                        ? "border-success bg-success/15 text-success opacity-60"
                        : isFlash
                        ? "animate-shake border-danger bg-danger/15"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <FlagImage code={c.flag} alt="" className="aspect-[4/3] w-5" rounded={false} />
                    {countryName(c, locale)}
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
                disabled={revealed}
                autoFocus
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                placeholder={t("type.placeholder")}
                className={cn(
                  "h-12 flex-1 rounded-xl border-2 bg-card px-4 text-base outline-none focus:border-primary disabled:opacity-60",
                  shake ? "animate-shake border-danger" : "border-border"
                )}
              />
              <Button size="lg" className="px-4" onClick={submitTyped} aria-label={t("type.submit")}>
                <CornerDownLeft className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-auto flex gap-2 pt-6">
          {!complete && !revealed && (
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setRevealed(true)}>
              <Eye className="h-4 w-4" />
              {t("nameall.reveal")}
            </Button>
          )}
          <motion.div className="flex-1" initial={false} animate={{ opacity: complete || revealed ? 1 : 0.7 }}>
            <Button className="w-full gap-2" onClick={next}>
              {idx + 1 >= total ? t("common.continue") : t("common.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
        {remaining > 0 && !revealed && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("nameall.remaining", { n: remaining })}
          </p>
        )}
      </div>
    </div>
  );
}
