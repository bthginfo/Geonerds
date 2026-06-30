"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { geoContains } from "d3-geo";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { PinMap } from "@/components/map/pin-map";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { GameTopBar, ScorePill, StreakPill, RoundPill, TimerPill } from "@/components/game/hud";
import { Compass } from "@/components/map/compass";
import { Button } from "@/components/ui/button";
import { poolForDifficulty, countryName } from "@/data/countries";
import { PLACES } from "./places";
import { BASE_POINTS, DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { haversineKm, formatNumber, sample, shuffle } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const PER_ROUND_BUDGET_MS = 15000;
const MAX_DIST = 5000; // km at which points reach zero
const GOOD_DIST = 800; // km that counts toward a streak

interface Capital {
  code: string;
  en: string;
  lat: number;
  lng: number;
}

interface PinTarget {
  label: string;
  lng: number;
  lat: number;
  /** For country targets — clicking anywhere inside this country counts as 0 km. */
  ccn3?: string | null;
}

export function PinGame({ difficulty, roundCount, timed, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);
  const [capitals, setCapitals] = useState<Capital[] | null>(null);

  useEffect(() => {
    featuresByCcn3("50m").then(setFeatures);
    fetch("/geo/capitals.json")
      .then((r) => r.json())
      .then(setCapitals)
      .catch(() => setCapitals([]));
  }, []);

  const targets = useMemo<PinTarget[]>(() => {
    if (!features || !capitals) return [];
    const pool = poolForDifficulty(difficulty);
    const poolCca3 = new Set(pool.map((c) => c.cca3));

    const countryPool: PinTarget[] = pool
      .filter((c): c is Country & { latlng: [number, number] } => !!c.latlng && !!c.ccn3 && features.has(String(c.ccn3)))
      .map((c) => ({ label: countryName(c, locale), lng: c.latlng[1], lat: c.latlng[0], ccn3: String(c.ccn3) }));
    const capitalPool: PinTarget[] = capitals
      .filter((cap) => poolCca3.has(cap.code))
      .map((cap) => ({ label: cap.en, lng: cap.lng, lat: cap.lat }));
    const placePool: PinTarget[] = PLACES.map((p) => ({ label: locale === "de" ? p.de : p.en, lng: p.lng, lat: p.lat }));

    const fullCount = countryPool.length + capitalPool.length + placePool.length;
    const count = roundCount === 0 ? fullCount : roundCount;
    // Blend ~40% countries, ~30% capitals, ~30% cities/landmarks.
    const capCount = Math.min(capitalPool.length, Math.round(count * 0.3));
    const placeCount = Math.min(placePool.length, Math.round(count * 0.3));
    const caps = sample(capitalPool, capCount);
    const places = sample(placePool, placeCount);
    const countries = sample(countryPool, Math.max(0, count - caps.length - places.length));
    return shuffle([...countries, ...caps, ...places]);
  }, [difficulty, roundCount, locale, features, capitals]);

  const total = targets.length;
  const budget = total * PER_ROUND_BUDGET_MS;

  const [idx, setIdx] = useState(0);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [distKm, setDistKm] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(budget);

  const startRef = useRef(Date.now());
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const answeredRef = useRef(0);
  const bestRef = useRef(0);
  const finishedRef = useRef(false);

  const target = targets[idx];
  const targetLngLat = target ? ([target.lng, target.lat] as [number, number]) : null;

  function doFinish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: answeredRef.current > 0 ? answeredRef.current : total,
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode: "pin",
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

  if (!features || !capitals) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }
  if (!target || !targetLngLat) return null;

  function confirm() {
    if (revealed || !pin || !targetLngLat) return;
    let dist = haversineKm(pin, targetLngLat);
    // Country targets: a pin anywhere on the country's landmass is a perfect hit.
    if (target.ccn3 && features) {
      const feat = features.get(target.ccn3);
      if (feat && geoContains(feat as unknown as GeoJSON.Feature, pin)) dist = 0;
    }
    answeredRef.current += 1;
    setDistKm(dist);
    setRevealed(true);
    const earned = Math.round(
      Math.max(0, 1 - dist / MAX_DIST) * BASE_POINTS * DIFFICULTY_MULTIPLIER[difficulty]
    );
    scoreRef.current += earned;
    setScore((s) => s + earned);
    if (dist <= GOOD_DIST) {
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
    setIdx((i) => i + 1);
    setPin(null);
    setRevealed(false);
    setDistKm(0);
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.pin.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        {timed ? <TimerPill ms={timeLeft} danger={timeLeft < 10000} /> : <RoundPill current={idx + 1} total={total} />}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <Crosshair className="h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold leading-snug">{t("pin.prompt", { place: target.label })}</div>
          <div className="text-xs text-muted-foreground">
            {revealed ? t("pin.away", { km: formatNumber(distKm, locale) }) : t("pin.tapToPlace")}
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label={t("mapclick.reset")} onClick={() => setResetSignal((s) => s + 1)}>
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-sky-50 dark:bg-slate-900/40">
        <PinMap
          onPin={(lng, lat) => setPin([lng, lat])}
          userPin={pin}
          target={revealed ? targetLngLat : null}
          locked={revealed}
          resetSignal={resetSignal}
          focus={revealed ? targetLngLat : null}
          focusZoom={3}
        />
        <Compass />
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-3">
        {revealed ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button className="w-full gap-1.5" onClick={next}>
              {idx + 1 >= total ? t("common.continue") : t("common.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <Button className="w-full" disabled={!pin} onClick={confirm}>
            {t("pin.confirm")}
          </Button>
        )}
      </div>
    </div>
  );
}
