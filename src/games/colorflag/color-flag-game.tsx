"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill, RoundPill, LivesPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import {
  COLOR_FLAGS,
  COLOR_KEYS,
  PALETTE,
  regionsFor,
  flagName,
  FLAG_VIEWBOX,
  type ColorKey,
} from "./flags";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { sample, shuffle, cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const GREY = "#cbd5e1";
const MAX_LIVES = 3;
const WRONG_PENALTY = 25;

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

export function ColorFlagGame({ difficulty, variant, roundCount, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const pro = variant === "pro";

  const flags = useMemo(() => {
    const count = roundCount === 0 ? COLOR_FLAGS.length : roundCount;
    return sample(COLOR_FLAGS, Math.min(count, COLOR_FLAGS.length));
  }, [roundCount]);

  const total = flags.length;
  const [idx, setIdx] = useState(0);
  const [regionIdx, setRegionIdx] = useState(0);
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

  const flag = flags[idx];
  const regions = useMemo(() => (flag ? regionsFor(flag.layout) : []), [flag]);
  const region = regions[regionIdx];

  const options = useMemo(() => {
    if (pro || !region) return [] as ColorKey[];
    const others = COLOR_KEYS.filter((k) => k !== region.color);
    return shuffle([region.color, ...sample(others, 3)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, regionIdx, pro]);

  if (!flag || !region) return null;

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
    if (gameOverRef.current || idx + 1 >= total) {
      doFinish();
      return;
    }
    setIdx((i) => i + 1);
    setRegionIdx(0);
    setFills([]);
    setAnswered(false);
    setLastPct(null);
    setPickHex("#888888");
  }

  function advanceRegion() {
    if (regionIdx + 1 >= regions.length) {
      nextFlag();
      return;
    }
    setRegionIdx((r) => r + 1);
    setAnswered(false);
    setLastPct(null);
    setPickHex("#888888");
  }

  function pickSwatch(key: ColorKey) {
    if (answered) return;
    totalRef.current += 1;
    const ok = key === region.color;
    setFill(regionIdx, PALETTE[region.color]);
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
      scoreRef.current = Math.max(0, scoreRef.current - WRONG_PENALTY);
      setScore((s) => Math.max(0, s - WRONG_PENALTY));
      livesRef.current = Math.max(0, livesRef.current - 1);
      setLives(livesRef.current);
      if (livesRef.current <= 0) gameOverRef.current = true;
    }
    setTimeout(() => {
      if (gameOverRef.current) doFinish();
      else advanceRegion();
    }, 750);
  }

  function confirmPro() {
    if (answered) return;
    totalRef.current += 1;
    const target = PALETTE[region.color];
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
    setFill(regionIdx, target);
    setLastPct(pct);
    setAnswered(true);
  }

  const vb = FLAG_VIEWBOX;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.colorflag.name")} onExit={onExit}>
        <StreakPill value={streak} />
        {!pro && <LivesPill lives={lives} max={MAX_LIVES} />}
        <ScorePill value={score} />
        <RoundPill current={idx + 1} total={total} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-5">
        <div className="text-xl font-bold">{flagName(flag, locale)}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {pro ? t("colorflag.proPrompt") : t("colorflag.swatchPrompt")}
        </div>

        <div
          className="mt-4 w-full max-w-xs overflow-hidden rounded-lg border-2 border-border shadow"
          style={{ aspectRatio: `${vb.W} / ${vb.H}` }}
        >
          <svg viewBox={`0 0 ${vb.W} ${vb.H}`} className="h-full w-full">
            {regions.map((reg, ri) =>
              reg.shapes.map((sh, j) => {
                const filled = fills[ri] ?? null;
                const isCurrent = ri === regionIdx && !answered;
                const common = {
                  fill: filled ?? GREY,
                  stroke: isCurrent ? "#111827" : "rgba(0,0,0,0.12)",
                  strokeWidth: isCurrent ? 1 : 0.3,
                  className: isCurrent ? "animate-pulse" : "",
                };
                return sh.t === "rect" ? (
                  <rect key={`${ri}-${j}`} x={sh.x} y={sh.y} width={sh.w} height={sh.h} {...common} />
                ) : (
                  <path key={`${ri}-${j}`} d={sh.d} {...common} />
                );
              })
            )}
          </svg>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {t("colorflag.region", { n: regionIdx + 1, total: regions.length })}
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
                      <span className="h-6 w-6 rounded border" style={{ background: PALETTE[region.color] }} />
                      {t("colorflag.target")}
                    </span>
                  </div>
                  <div className="text-lg font-bold">{t("colorflag.match", { pct: lastPct ?? 0 })}</div>
                  <Button className="w-full gap-1.5" onClick={advanceRegion}>
                    {regionIdx + 1 >= regions.length && idx + 1 >= total ? t("common.continue") : t("common.next")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {options.map((key) => (
                <button
                  key={key}
                  onClick={() => pickSwatch(key)}
                  disabled={answered}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98] hover:border-primary/50 disabled:opacity-60",
                    answered && flashWrong && "animate-shake"
                  )}
                >
                  <span className="h-7 w-7 rounded-md border border-black/15" style={{ background: PALETTE[key] }} />
                  <span className="capitalize">{t(`colorflag.color.${key}`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
