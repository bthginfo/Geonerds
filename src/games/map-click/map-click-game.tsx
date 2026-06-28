"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { WorldMap } from "@/components/map/world-map";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, RoundPill } from "@/components/game/hud";
import { COUNTRIES, poolForDifficulty, countryName } from "@/data/countries";
import { pickQuestions, ROUNDS_PER_GAME } from "@/games/round-utils";
import { featuresByCcn3 } from "@/lib/geo";
import { scoreForAnswer } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

const flagByCcn3Map = new Map(COUNTRIES.filter((c) => c.ccn3).map((c) => [String(c.ccn3), c.flag]));

export function MapClickGame({ difficulty, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [ready, setReady] = useState(false);
  const [targets, setTargets] = useState<Country[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<{ ccn3: string; ok: boolean } | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());
  const wrongRef = useRef(false);
  const lockRef = useRef(false);

  useEffect(() => {
    featuresByCcn3("50m").then((feats) => {
      const pool = poolForDifficulty(difficulty, { requireGeometry: true }).filter(
        (c) => c.ccn3 && feats.has(String(c.ccn3))
      );
      setTargets(pickQuestions(pool, ROUNDS_PER_GAME));
      setReady(true);
    });
  }, [difficulty]);

  const target = targets[idx];

  function handlePick(ccn3: string) {
    if (lockRef.current || !target) return;
    if (ccn3 === String(target.ccn3)) {
      lockRef.current = true;
      sound.correct();
      const timeMs = Date.now() - qStartRef.current;
      const earned = scoreForAnswer({ correct: true, difficulty, streak, timeMs, timeLimitMs: 12000 });
      const firstTry = !wrongRef.current;
      setScore((s) => s + earned);
      setFound((f) => new Set(f).add(ccn3));
      setFlash({ ccn3, ok: true });
      if (firstTry) setCorrect((c) => c + 1);
      const ns = streak + 1;
      setStreak(ns);
      setBestStreak((b) => Math.max(b, ns));

      setTimeout(() => {
        setFlash(null);
        if (idx + 1 >= targets.length) {
          onFinish({
            score: score + earned,
            correct: correct + (firstTry ? 1 : 0),
            total: targets.length,
            bestStreak: Math.max(bestStreak, ns),
            durationMs: Date.now() - startRef.current,
            mode: "map",
          });
          return;
        }
        setIdx((i) => i + 1);
        wrongRef.current = false;
        qStartRef.current = Date.now();
        lockRef.current = false;
      }, 650);
    } else {
      sound.wrong();
      wrongRef.current = true;
      setStreak(0);
      setFlash({ ccn3, ok: false });
      setTimeout(() => setFlash((cur) => (cur?.ccn3 === ccn3 ? null : cur)), 450);
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
        <RoundPill current={found.size} total={targets.length} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <FlagImage code={target.flag} alt="" hideText className="aspect-[4/3] w-12 shadow" />
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("mapclick.found", { count: found.size, total: targets.length })}
          </div>
          <div className="truncate text-xl font-bold">
            {t("mapclick.prompt", { country: countryName(target, locale) })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0"
          aria-label={t("mapclick.reset")}
          onClick={() => setResetSignal((s) => s + 1)}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-sky-50 dark:bg-slate-900/40">
        <WorldMap
          onPick={handlePick}
          found={found}
          flashCcn3={flash?.ccn3 ?? null}
          flashOk={flash?.ok}
          flagByCcn3={(ccn3) => flagByCcn3Map.get(ccn3)}
          resetSignal={resetSignal}
        />
      </div>
    </div>
  );
}
