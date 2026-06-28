"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Undo2, Check } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { WorldMap } from "@/components/map/world-map";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, RoundPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { poolForDifficulty, countryName } from "@/data/countries";
import { pickRoutePair, ccn3Neighbors, type RoutePair } from "./graph";
import { BASE_POINTS, DIFFICULTY_MULTIPLIER, streakMultiplier } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";

const NO_FLAG = () => undefined;

export function RouteGame({ difficulty, roundCount, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const rounds = useMemo<RoutePair[]>(() => {
    const pool = poolForDifficulty(difficulty);
    const [min, max] = difficulty === "easy" ? [2, 3] : difficulty === "hard" ? [3, 6] : [2, 4];
    const count = roundCount === 0 ? 10 : roundCount;
    const out: RoutePair[] = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 8) {
      const pair = pickRoutePair(pool, min, max);
      if (pair && !out.some((p) => p.a.cca3 === pair.a.cca3 && p.b.cca3 === pair.b.cca3)) out.push(pair);
    }
    return out;
  }, [difficulty, roundCount]);

  const total = rounds.length;
  const [idx, setIdx] = useState(0);
  const [path, setPath] = useState<string[]>(() => (rounds[0] ? [String(rounds[0].a.ccn3)] : []));
  const [reached, setReached] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  const finishedRef = useRef(false);

  const round = rounds[idx];
  const aId = round ? String(round.a.ccn3) : "";
  const bId = round ? String(round.b.ccn3) : "";
  const current = path[path.length - 1];

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode: "route",
    });
  }

  function handlePick(ccn3: string) {
    if (reached || !round) return;
    if (path.includes(ccn3)) return;
    if (!ccn3Neighbors(current).has(ccn3)) {
      sound.wrong();
      setFlash(ccn3);
      setTimeout(() => setFlash((f) => (f === ccn3 ? null : f)), 400);
      return;
    }
    const newPath = [...path, ccn3];
    setPath(newPath);
    if (ccn3 === bId) {
      sound.correct();
      setReached(true);
      const steps = newPath.length - 1;
      const earned = Math.round(
        Math.max(20, BASE_POINTS - (steps - round.optimal) * 25) *
          DIFFICULTY_MULTIPLIER[difficulty] *
          streakMultiplier(streak)
      );
      scoreRef.current += earned;
      setScore((s) => s + earned);
      correctRef.current += 1;
      const ns = steps === round.optimal ? streak + 1 : 0;
      bestRef.current = Math.max(bestRef.current, ns);
      setStreak(ns);
    } else {
      sound.tick();
    }
  }

  function undo() {
    if (reached || path.length <= 1) return;
    setPath((p) => p.slice(0, -1));
  }

  function next() {
    if (idx + 1 >= total) {
      doFinish();
      return;
    }
    const ni = idx + 1;
    setIdx(ni);
    setPath([String(rounds[ni].a.ccn3)]);
    setReached(false);
    setFlash(null);
  }

  function getFill(ccn3: string): string | undefined {
    if (ccn3 === aId) return "fill-blue-500/80";
    if (ccn3 === bId) return reached ? "fill-green-500/70" : "fill-amber-500/80";
    if (ccn3 === current) return "fill-emerald-600/85";
    if (path.includes(ccn3)) return "fill-emerald-500/55";
    return undefined;
  }

  if (!round) return null;
  const steps = path.length - 1;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.route.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <RoundPill current={idx + 1} total={total} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
        <FlagImage code={round.a.flag} alt="" className="aspect-[4/3] w-8 shrink-0" />
        <span className="truncate text-sm font-bold">{countryName(round.a, locale)}</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <FlagImage code={round.b.flag} alt="" className="aspect-[4/3] w-8 shrink-0" />
        <span className="truncate text-sm font-bold">{countryName(round.b, locale)}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t("route.steps", { n: steps })}</span>
        <Button variant="ghost" size="icon" aria-label={t("route.undo")} disabled={path.length <= 1 || reached} onClick={undo}>
          <Undo2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-sky-50 dark:bg-slate-900/40">
        <WorldMap
          onPick={handlePick}
          found={new Set()}
          flashCcn3={flash}
          flashOk={false}
          flagByCcn3={NO_FLAG}
          getFill={getFill}
        />
      </div>

      {reached && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3"
        >
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
      )}
    </div>
  );
}
