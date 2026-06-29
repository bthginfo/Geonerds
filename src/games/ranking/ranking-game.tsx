"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { ArrowRight, Check, GripVertical } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { poolForDifficulty, countryName } from "@/data/countries";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { BASE_POINTS, DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { sample, shuffle, pickOne, formatNumber, cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

type Metric = "population" | "area" | "gdp" | "density" | "neighbors";
const PER_ROUND_BUDGET_MS = 16000;

function mval(c: Country, m: Metric): number {
  if (m === "population") return c.population;
  if (m === "area") return c.area;
  if (m === "gdp") return c.gdp ?? 0;
  if (m === "neighbors") return c.borders.length;
  return c.area > 0 ? c.population / c.area : 0;
}

function fmt(v: number, m: Metric, locale: string): string {
  const loc = locale === "de" ? "de-DE" : "en-US";
  if (m === "gdp")
    return new Intl.NumberFormat(loc, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (m === "area") return `${formatNumber(v, locale)} km²`;
  if (m === "density") return `${formatNumber(v, locale)}/km²`;
  return formatNumber(v, locale);
}

interface RankRound {
  metric: Metric;
  items: Country[];
  sorted: Country[]; // highest → lowest
}

export function RankingGame({ difficulty, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const n = difficulty === "easy" ? 3 : difficulty === "hard" ? 5 : 4;

  const rounds = useMemo<RankRound[]>(() => {
    const base = poolForDifficulty(difficulty);
    const count = roundCount === 0 ? 25 : roundCount;
    const out: RankRound[] = [];
    for (let i = 0; i < count; i++) {
      const metric = pickOne<Metric>(["population", "area", "gdp", "density", "neighbors"]);
      const pool = base.filter((c) => (metric === "gdp" ? (c.gdp ?? 0) > 0 : mval(c, metric) > 0));
      const picked: Country[] = [];
      const seen = new Set<number>();
      for (const c of sample(pool, pool.length)) {
        const v = Math.round(mval(c, metric));
        if (!seen.has(v)) {
          seen.add(v);
          picked.push(c);
        }
        if (picked.length === n) break;
      }
      if (picked.length < n) continue;
      const sorted = [...picked].sort((a, b) => mval(b, metric) - mval(a, metric));
      out.push({ metric, items: shuffle(picked), sorted });
    }
    return out;
  }, [difficulty, roundCount, n]);

  const total = rounds.length;
  const budget = total * PER_ROUND_BUDGET_MS;

  const [idx, setIdx] = useState(0);
  const [arrangement, setArrangement] = useState<Country[]>(() => rounds[0]?.items ?? []);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(budget);

  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const bestRef = useRef(0);
  const finishedRef = useRef(false);

  const round = rounds[idx];

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: answeredRef.current > 0 ? answeredRef.current : total,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode: "rank",
    });
  }

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

  if (!round) return null;

  function submit() {
    if (answered) return;
    setAnswered(true);
    answeredRef.current += 1;
    let correctSpots = 0;
    arrangement.forEach((c, i) => {
      if (c.cca3 === round.sorted[i].cca3) correctSpots++;
    });
    const perfect = correctSpots === round.items.length;
    const earned = Math.round(
      (correctSpots / round.items.length) * BASE_POINTS * DIFFICULTY_MULTIPLIER[difficulty]
    );
    scoreRef.current += earned;
    setScore((s) => s + earned);
    if (perfect) {
      sound.correct();
      correctRef.current += 1;
      const ns = streak + 1;
      bestRef.current = Math.max(bestRef.current, ns);
      setStreak(ns);
    } else {
      sound.wrong();
      setStreak(0);
    }
  }

  function next() {
    if (idx + 1 >= total) {
      doFinish();
      return;
    }
    const ni = idx + 1;
    setIdx(ni);
    setArrangement(rounds[ni].items);
    setAnswered(false);
  }

  const correctSpots = arrangement.filter((c, i) => c.cca3 === round.sorted[i].cca3).length;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.ranking.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 10000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
        <div className="text-center">
          <div className="text-lg font-bold">{t("ranking.prompt")}</div>
          <div className="text-sm text-muted-foreground">{t("ranking.by", { metric: t(`hl.metric.${round.metric}`) })}</div>
        </div>

        <Reorder.Group axis="y" values={arrangement} onReorder={setArrangement} className="mt-5 space-y-2.5">
          {arrangement.map((c, i) => {
            const correctRank = round.sorted.findIndex((s) => s.cca3 === c.cca3);
            const isRight = answered && i === correctRank;
            return (
              <Reorder.Item
                key={c.cca3}
                value={c}
                dragListener={!answered}
                className={cn(
                  "flex select-none items-center gap-3 rounded-xl border-2 bg-card px-3 py-3",
                  !answered && "cursor-grab border-border active:cursor-grabbing",
                  answered && isRight && "border-success bg-success/15",
                  answered && !isRight && "border-danger bg-danger/15"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    answered ? (isRight ? "bg-success text-white" : "bg-danger text-white") : "bg-primary text-primary-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <FlagImage code={c.flag} alt="" className="aspect-[4/3] w-9 shrink-0" />
                <span className="flex-1 font-semibold">{countryName(c, locale)}</span>
                {answered ? (
                  <span className="text-sm tabular-nums text-muted-foreground">{fmt(mval(c, round.metric), round.metric, locale)}</span>
                ) : (
                  <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        <div className="mt-auto pt-6">
          {!answered ? (
            <Button className="w-full gap-2" onClick={submit}>
              <Check className="h-5 w-5" />
              {t("ranking.submit")}
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {t("ranking.correctSpots", { n: correctSpots, total: round.items.length })}
              </span>
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={next} className="gap-1.5">
                    {idx + 1 >= total ? t("common.continue") : t("common.next")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
