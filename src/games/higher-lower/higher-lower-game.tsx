"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ChevronDown, Check, X } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { COUNTRIES, countryName } from "@/data/countries";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, LivesPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { scoreForAnswer } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";
import { pickOne, formatNumber, cn } from "@/lib/utils";

type Metric = "population" | "area" | "density" | "gdp" | "neighbors";
const METRICS: Metric[] = ["population", "area", "density", "gdp", "neighbors"];
const MAX_LIVES = 3;

function metricValue(c: Country, m: Metric): number {
  switch (m) {
    case "population":
      return c.population;
    case "area":
      return c.area;
    case "density":
      return c.area > 0 ? c.population / c.area : 0;
    case "gdp":
      return c.gdp ?? 0;
    case "neighbors":
      return c.borders.length;
  }
}

function metricPool(m: Metric): Country[] {
  return COUNTRIES.filter((c) => {
    if (m === "gdp") return (c.gdp ?? 0) > 0;
    if (m === "density") return c.area > 0 && c.population > 0;
    if (m === "neighbors") return c.borders.length > 0;
    return metricValue(c, m) > 0;
  });
}

function formatMetric(value: number, m: Metric, locale: string): string {
  const loc = locale === "de" ? "de-DE" : "en-US";
  if (m === "gdp") {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (m === "area") return `${formatNumber(value, locale)} km²`;
  if (m === "density") return `${formatNumber(value, locale)}/km²`;
  return formatNumber(value, locale);
}

// Neighbours have small integer values, so cap how often it's chosen to avoid ties.

interface Pair {
  a: Country;
  b: Country;
  metric: Metric;
}

function nextPair(prev?: Country): Pair {
  const metric = pickOne<Metric>(METRICS);
  const pool = metricPool(metric);
  const a = prev && pool.includes(prev) ? prev : pickOne(pool);
  let b = pickOne(pool);
  let guard = 0;
  while ((b.cca3 === a.cca3 || metricValue(b, metric) === metricValue(a, metric)) && guard++ < 50) {
    b = pickOne(pool);
  }
  return { a, b, metric };
}

export function HigherLowerGame({ onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [pair, setPair] = useState<Pair>(() => nextPair());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const startRef = useRef(Date.now());

  const aVal = metricValue(pair.a, pair.metric);
  const bVal = metricValue(pair.b, pair.metric);

  function guess(higher: boolean) {
    if (revealed) return;
    const isHigher = bVal > aVal;
    const isCorrect = higher === isHigher;
    setRevealed(true);
    setLastCorrect(isCorrect);
    setTotal((x) => x + 1);

    if (isCorrect) {
      sound.correct();
      const earned = scoreForAnswer({ correct: true, difficulty: "medium" });
      setScore((s) => s + earned);
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
    } else {
      sound.wrong();
      setStreak(0);
      setLives((l) => l - 1);
    }

    setTimeout(() => {
      const livesLeft = lives - (isCorrect ? 0 : 1);
      if (livesLeft <= 0) {
        onFinish({
          score: score + (isCorrect ? scoreForAnswer({ correct: true, difficulty: "medium" }) : 0),
          correct: correct + (isCorrect ? 1 : 0),
          total: total + 1,
          bestStreak: Math.max(bestStreak, isCorrect ? streak + 1 : bestStreak),
          durationMs: Date.now() - startRef.current,
          mode: "endless",
        });
        return;
      }
      setPair(nextPair(pair.b));
      setRevealed(false);
    }, 1200);
  }

  const metricLabel = t(`hl.metric.${pair.metric}`);

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.higher-lower.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <LivesPill lives={lives} max={MAX_LIVES} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
        <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
          {t("hl.compareQuestion", { country: countryName(pair.b, locale), metric: metricLabel })}
        </p>
        <div className="grid flex-1 grid-rows-2 gap-3">
          {/* Country A — value shown */}
          <CountryPanel country={pair.a} valueText={formatMetric(aVal, pair.metric, locale)} locale={locale} />

          {/* Country B — guess */}
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card p-4">
            <FlagImage code={pair.b.flag} alt="" className="aspect-[4/3] w-20 shadow" />
            <div className="mt-2 text-lg font-bold">{countryName(pair.b, locale)}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{metricLabel}</div>

            <AnimatePresence mode="wait">
              {revealed ? (
                <motion.div
                  key="val"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "mt-1 flex items-center gap-1.5 text-xl font-extrabold tabular-nums",
                    lastCorrect ? "text-success" : "text-danger"
                  )}
                >
                  {lastCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  {formatMetric(bVal, pair.metric, locale)}
                </motion.div>
              ) : (
                <motion.div key="btns" className="mt-3 flex gap-2" exit={{ opacity: 0 }}>
                  <Button size="lg" variant="success" className="gap-1" onClick={() => guess(true)}>
                    <ChevronUp className="h-5 w-5" />
                    {t("hl.higher")}
                  </Button>
                  <Button size="lg" variant="danger" className="gap-1" onClick={() => guess(false)}>
                    <ChevronDown className="h-5 w-5" />
                    {t("hl.lower")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountryPanel({
  country,
  valueText,
  locale,
}: {
  country: Country;
  valueText: string;
  locale: "en" | "de";
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-4">
      <FlagImage code={country.flag} alt="" className="aspect-[4/3] w-20 shadow" />
      <div className="mt-2 text-lg font-bold">{countryName(country, locale)}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-primary">{valueText}</div>
    </div>
  );
}
