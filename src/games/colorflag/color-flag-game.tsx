"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill, RoundPill, LivesPill, TimerPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import colorFlagsData from "@/data/color-flags.json";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { sample, shuffle, cn } from "@/lib/utils";
import { getCountryByCca2 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import type { Difficulty, Locale } from "@/lib/types";

interface ColorFlag {
  code: string;
  en: string;
  de: string;
  colors: string[];
  template: string;
}

const COLOR_FLAGS = colorFlagsData as ColorFlag[];

// Each not-yet-coloured area gets its OWN grey shade from this ramp, so adjacent
// areas (e.g. the three bands of a tricolour) never blend into one grey blob.
// The area you are currently colouring is shown in a pulsing slate (--flag-hl).
const GREY_RAMP = ["#cbd5e1", "#9aa7bb", "#e7ecf2", "#b4bdcb", "#8a98ad", "#d2d9e2", "#7e8ca1"];
const GREY_CURRENT = "var(--flag-hl)";
const MAX_LIVES = 3;
const WRONG_PENALTY = 25;

// Canonical flag colours, used only to build plausible swatch distractors.
const PALETTE = [
  "#d52b1e", // red
  "#0038a8", // blue
  "#4189dd", // light blue
  "#ffffff", // white
  "#009543", // green
  "#fcd116", // yellow
  "#000000", // black
  "#ff7f00", // orange
  "#6d3b07", // brown
  "#7b1fa2", // purple
  "#00a0a0", // teal
  "#e91e63", // pink
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
const MAX_DIST = Math.sqrt(3 * 255 * 255);

/** Build 4 swatch options: the real colour + 3 visually distinct distractors. */
function swatchOptions(answer: string): string[] {
  const distinct = PALETTE.filter((c) => colorDistance(c, answer) > 70);
  let distractors = sample(distinct, 3);
  if (distractors.length < 3) {
    const pad = PALETTE.filter((c) => c !== answer && !distractors.includes(c));
    distractors = [...distractors, ...sample(pad, 3 - distractors.length)];
  }
  return shuffle([answer, ...distractors]);
}

function flagName(f: ColorFlag, locale: Locale): string {
  return locale === "de" ? f.de : f.en;
}

/** Filter the pool by difficulty using how many colour groups a flag has. */
function poolFor(difficulty: Difficulty): ColorFlag[] {
  const max = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 7;
  const min = difficulty === "hard" ? 4 : 2;
  return COLOR_FLAGS.filter((f) => f.colors.length >= min && f.colors.length <= max);
}

const PER_FLAG_MS = 18000;

export function ColorFlagGame({ difficulty, variant, roundCount, timed, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const pro = variant === "pro";

  const flags = useMemo(() => {
    const pool = poolFor(difficulty);
    const count = roundCount === 0 ? pool.length : roundCount;
    return sample(pool, Math.min(count, pool.length));
  }, [roundCount, difficulty]);

  const total = flags.length;
  const budget = total * PER_FLAG_MS;
  const [timeLeft, setTimeLeft] = useState(budget);
  const [idx, setIdx] = useState(0);
  const [groupIdx, setGroupIdx] = useState(0);
  // Committed colour per group (real hex once answered, else null).
  const [fills, setFills] = useState<(string | null)[]>([]);
  const [answered, setAnswered] = useState(false);
  const [lastPct, setLastPct] = useState<number | null>(null);
  const [pickHex, setPickHex] = useState("#888888");
  const [flashWrong, setFlashWrong] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);

  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const totalRef = useRef(0);
  const bestRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const gameOverRef = useRef(false);
  const finishedRef = useRef(false);
  const hitsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => {
      const left = budget - (Date.now() - startRef.current);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        gameOverRef.current = true;
        doFinish();
      } else setTimeLeft(left);
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed]);

  const flag = flags[idx];
  const groups = flag ? flag.colors.length : 0;
  const target = flag ? flag.colors[groupIdx] : "#000000";

  const options = useMemo(() => {
    if (pro || !flag) return [] as string[];
    return swatchOptions(flag.colors[groupIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, groupIdx, pro]);

  // CSS custom properties --c0..--cN drive the inline SVG's fills.
  const styleVars = useMemo(() => {
    const s: Record<string, string> = {};
    for (let g = 0; g < groups; g++) {
      const committed = fills[g] ?? null;
      if (committed) s[`--c${g}`] = committed;
      else if (g === groupIdx && !answered) s[`--c${g}`] = GREY_CURRENT;
      else s[`--c${g}`] = GREY_RAMP[g % GREY_RAMP.length];
    }
    return s as CSSProperties;
  }, [groups, fills, groupIdx, answered]);

  if (!flag) return null;

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: totalRef.current,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode: pro ? "pro" : "swatch",
      countryHits: hitsRef.current,
    });
  }

  function setFill(i: number, hex: string) {
    setFills((f) => {
      const next = [...f];
      next[i] = hex;
      return next;
    });
  }

  function nextFlag() {
    // The flag just finished — credit its country to the collection.
    const finished = getCountryByCca2(flag.code);
    if (finished) hitsRef.current.push(finished.cca3);
    if (gameOverRef.current || idx + 1 >= total) {
      doFinish();
      return;
    }
    setIdx((i) => i + 1);
    setGroupIdx(0);
    setFills([]);
    setAnswered(false);
    setLastPct(null);
    setPickHex("#888888");
  }

  function advanceGroup() {
    if (groupIdx + 1 >= groups) {
      nextFlag();
      return;
    }
    setGroupIdx((r) => r + 1);
    setAnswered(false);
    setLastPct(null);
    setPickHex("#888888");
  }

  function pickSwatch(hex: string) {
    if (answered) return;
    totalRef.current += 1;
    const ok = hex === target;
    setFill(groupIdx, target);
    setAnswered(true);
    if (ok) {
      sound.correct();
      const earned = Math.round(100 * DIFFICULTY_MULTIPLIER[difficulty]);
      scoreRef.current += earned;
      setScore((s) => s + earned);
      correctRef.current += 1;
      const ns = streak + 1;
      bestRef.current = Math.max(bestRef.current, ns);
      setStreak(ns);
    } else {
      sound.wrong();
      setStreak(0);
      setFlashWrong(true);
      setTimeout(() => setFlashWrong(false), 400);
      if (!practice) {
        scoreRef.current = Math.max(0, scoreRef.current - WRONG_PENALTY);
        setScore((s) => Math.max(0, s - WRONG_PENALTY));
        livesRef.current = Math.max(0, livesRef.current - 1);
        setLives(livesRef.current);
        if (livesRef.current <= 0) gameOverRef.current = true;
      }
    }
    setTimeout(() => {
      if (gameOverRef.current) doFinish();
      else advanceGroup();
    }, 700);
  }

  function confirmPro() {
    if (answered) return;
    totalRef.current += 1;
    const dist = colorDistance(pickHex, target);
    const closeness = Math.max(0, 1 - dist / MAX_DIST);
    const pct = Math.round(closeness * 100);
    const earned = Math.round(120 * closeness * DIFFICULTY_MULTIPLIER[difficulty]);
    scoreRef.current += earned;
    setScore((s) => s + earned);
    if (pct >= 80) {
      sound.correct();
      correctRef.current += 1;
      const ns = streak + 1;
      bestRef.current = Math.max(bestRef.current, ns);
      setStreak(ns);
    } else {
      sound.tick();
      setStreak(0);
    }
    setFill(groupIdx, target);
    setLastPct(pct);
    setAnswered(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.colorflag.name")} onExit={onExit}>
        {!practice && <StreakPill value={streak} />}
        {!pro && !practice && <LivesPill lives={lives} max={MAX_LIVES} />}
        {!practice && <ScorePill value={score} />}
        {timed && !practice ? <TimerPill ms={timeLeft} danger={timeLeft < 12000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-5">
        <div className="text-xl font-bold">{flagName(flag, locale)}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {pro ? t("colorflag.proPrompt") : t("colorflag.swatchPrompt")}
        </div>

        <div
          className={cn(
            "flag-canvas mt-4 w-full max-w-xs overflow-hidden rounded-lg border-2 border-border shadow [&_svg]:h-auto [&_svg]:w-full",
            flashWrong && "animate-shake"
          )}
          style={styleVars}
          dangerouslySetInnerHTML={{ __html: flag.template }}
        />

        <div className="mt-2 text-xs text-muted-foreground">
          {t("colorflag.region", { n: groupIdx + 1, total: groups })}
        </div>

        <div className="mt-5 w-full">
          {pro ? (
            <div className="flex flex-col items-center gap-3">
              {!answered ? (
                <>
                  <input
                    type="color"
                    value={pickHex}
                    onChange={(e) => setPickHex(e.target.value)}
                    className="h-16 w-28 cursor-pointer rounded-lg border-2 border-border bg-card"
                    aria-label={t("colorflag.proPrompt")}
                  />
                  <Button className="w-full" onClick={confirmPro}>
                    {t("colorflag.confirm")}
                  </Button>
                </>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full flex-col items-center gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="h-6 w-6 rounded border" style={{ background: pickHex }} />
                      {t("colorflag.you")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-6 w-6 rounded border" style={{ background: target }} />
                      {t("colorflag.target")}
                    </span>
                  </div>
                  <div className="text-lg font-bold">{t("colorflag.match", { pct: lastPct ?? 0 })}</div>
                  <Button className="w-full gap-1.5" onClick={advanceGroup}>
                    {groupIdx + 1 >= groups && idx + 1 >= total ? t("common.continue") : t("common.next")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {options.map((hex, i) => (
                <button
                  key={`${hex}-${i}`}
                  onClick={() => pickSwatch(hex)}
                  disabled={answered}
                  className={cn(
                    "flex items-center justify-center rounded-xl border-2 border-border bg-card p-2 transition-all active:scale-[0.98] hover:border-primary/50 disabled:opacity-60"
                  )}
                  aria-label={hex}
                >
                  <span
                    className="h-10 w-full rounded-md border border-black/15"
                    style={{ background: hex }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
